
-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true);

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to update their own logos
CREATE POLICY "Users can update own logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'business-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own logos
CREATE POLICY "Users can delete own logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'business-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to logos (needed for PDF generation)
CREATE POLICY "Public can read logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'business-logos');
