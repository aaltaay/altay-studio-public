-- blocks/seo/schema.sql
-- SEO Settings Schema
-- Stores dynamic SEO metadata that can be updated via the Admin panel without redeploying.

CREATE TABLE IF NOT EXISTS seo_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_route TEXT NOT NULL UNIQUE, -- e.g., '/' or '/contact'
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  keywords TEXT[],
  og_image_url TEXT,
  structured_data JSONB, -- JSON-LD object for LocalBusiness, Restaurant, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE seo_settings ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) to read SEO settings for rendering
CREATE POLICY "Public can read SEO settings" 
  ON seo_settings FOR SELECT 
  TO anon
  USING (true);

-- Only authenticated users (admins) can update SEO settings
CREATE POLICY "Admins can select SEO settings" 
  ON seo_settings FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can insert SEO settings" 
  ON seo_settings FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Admins can update SEO settings" 
  ON seo_settings FOR UPDATE 
  TO authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete SEO settings" 
  ON seo_settings FOR DELETE 
  TO authenticated 
  USING (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_seo_settings_modtime
BEFORE UPDATE ON seo_settings
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
