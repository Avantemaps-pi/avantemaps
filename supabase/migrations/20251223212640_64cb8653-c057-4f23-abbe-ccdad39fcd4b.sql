-- Drop the broken sync_coordinates_to_geo trigger that references non-existent geo_location column
DROP TRIGGER IF EXISTS sync_coordinates_trigger ON businesses;
DROP FUNCTION IF EXISTS sync_coordinates_to_geo();