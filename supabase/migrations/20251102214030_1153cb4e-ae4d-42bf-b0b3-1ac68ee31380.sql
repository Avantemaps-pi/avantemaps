-- Add images column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS images text[];