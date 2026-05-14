-- Helper: check if a user has an active paid subscription (for business reply gating)
CREATE OR REPLACE FUNCTION public.has_active_paid_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND plan IN ('small-business', 'organization', 'small_business')
      AND (end_date IS NULL OR end_date > now())
  );
$$;

-- Helper: check if a user owns a given business
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND owner_id = _user_id
  );
$$;

-- Conversations table
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id integer NOT NULL,
  customer_id uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  customer_unread integer NOT NULL DEFAULT 0,
  business_unread integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, customer_id)
);

CREATE INDEX idx_conversations_business ON public.conversations(business_id, last_message_at DESC);
CREATE INDEX idx_conversations_customer ON public.conversations(customer_id, last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer or business owner can view conversation"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR public.is_business_owner((SELECT auth.uid()), business_id)
  );

CREATE POLICY "Customer can create conversation"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (customer_id = (SELECT auth.uid()));

CREATE POLICY "Customer or business owner can update conversation"
  ON public.conversations FOR UPDATE TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    OR public.is_business_owner((SELECT auth.uid()), business_id)
  );

-- Messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'business')),
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.customer_id = (SELECT auth.uid())
          OR public.is_business_owner((SELECT auth.uid()), c.business_id)
        )
    )
  );

-- Customers can always send. Business owners can only send if they have an active paid subscription.
CREATE POLICY "Participants can send messages with gating"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          (sender_role = 'customer' AND c.customer_id = (SELECT auth.uid()))
          OR (
            sender_role = 'business'
            AND public.is_business_owner((SELECT auth.uid()), c.business_id)
            AND public.has_active_paid_subscription((SELECT auth.uid()))
          )
        )
    )
  );

CREATE POLICY "Participants can mark messages read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (
          c.customer_id = (SELECT auth.uid())
          OR public.is_business_owner((SELECT auth.uid()), c.business_id)
        )
    )
  );

-- Trigger: bump conversation summary on new message
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.body, 200),
        customer_unread = CASE WHEN NEW.sender_role = 'business' THEN customer_unread + 1 ELSE customer_unread END,
        business_unread = CASE WHEN NEW.sender_role = 'customer' THEN business_unread + 1 ELSE business_unread END
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bump_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- Realtime
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;