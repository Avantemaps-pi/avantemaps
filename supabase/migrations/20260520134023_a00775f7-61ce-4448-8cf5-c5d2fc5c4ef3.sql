-- Partial unique index ensures a given fee row can only be attached to one message,
-- and a given message can only have one fee row attached.
CREATE UNIQUE INDEX IF NOT EXISTS message_fees_message_id_uidx
  ON public.message_fees (message_id)
  WHERE message_id IS NOT NULL;

-- Idempotent attach helper. Returns the message_fees.id linked to _message_id.
-- - If a fee is already linked to that message (by this sender), returns it unchanged.
-- - Otherwise, atomically claims the oldest paid+unattached fee for this
--   sender/conversation in the last 60s and links it. Concurrency-safe via
--   FOR UPDATE SKIP LOCKED plus the partial UNIQUE index above.
-- - Returns NULL if no eligible fee row exists.
CREATE OR REPLACE FUNCTION public.attach_message_fee(
  _conversation_id uuid,
  _message_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _fee_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Caller must be the author of the message.
  IF NOT EXISTS (
    SELECT 1 FROM public.messages
    WHERE id = _message_id
      AND conversation_id = _conversation_id
      AND sender_id = _uid
  ) THEN
    RAISE EXCEPTION 'message not found or not owned by caller';
  END IF;

  -- Idempotency: already attached → return the existing row.
  SELECT id INTO _fee_id
  FROM public.message_fees
  WHERE message_id = _message_id AND sender_id = _uid
  LIMIT 1;
  IF FOUND THEN
    RETURN _fee_id;
  END IF;

  -- Claim the oldest unattached paid fee for this sender/conversation.
  UPDATE public.message_fees mf
  SET message_id = _message_id
  WHERE mf.id = (
    SELECT id FROM public.message_fees
    WHERE conversation_id = _conversation_id
      AND sender_id = _uid
      AND status = 'paid'
      AND message_id IS NULL
      AND created_at > now() - interval '60 seconds'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING mf.id INTO _fee_id;

  RETURN _fee_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.attach_message_fee(uuid, uuid) TO authenticated;