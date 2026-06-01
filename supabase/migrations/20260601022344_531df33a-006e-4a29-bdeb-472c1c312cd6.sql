-- Create a function that enforces business limits at the database level
CREATE OR REPLACE FUNCTION enforce_business_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  user_subscription TEXT;
  business_limit INTEGER;
BEGIN
  SELECT subscription INTO user_subscription
  FROM users
  WHERE id = NEW.owner_id;

  IF user_subscription IS NULL THEN
    user_subscription := 'individual';
  END IF;

  CASE user_subscription
    WHEN 'individual' THEN business_limit := 1;
    WHEN 'small-business' THEN business_limit := 3;
    WHEN 'organization' THEN business_limit := 5;
    ELSE business_limit := 1;
  END CASE;

  SELECT COUNT(*) INTO current_count
  FROM businesses
  WHERE owner_id = NEW.owner_id;

  IF current_count >= business_limit THEN
    RAISE EXCEPTION 'Business limit reached. Your % plan allows up to % business(es).', 
      user_subscription, business_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_business_limit_before_insert ON businesses;

CREATE TRIGGER check_business_limit_before_insert
  BEFORE INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION enforce_business_limit();