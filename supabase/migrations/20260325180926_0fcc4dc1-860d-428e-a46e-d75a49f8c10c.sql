CREATE POLICY "Anon can view business settings by intake token"
ON public.business_settings
FOR SELECT
TO anon
USING (intake_token IS NOT NULL);