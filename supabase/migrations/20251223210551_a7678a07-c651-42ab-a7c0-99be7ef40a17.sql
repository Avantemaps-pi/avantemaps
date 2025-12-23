-- Fix the search vector trigger to use correct column names
CREATE OR REPLACE FUNCTION businesses_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.business_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.business_description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.street_address, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;