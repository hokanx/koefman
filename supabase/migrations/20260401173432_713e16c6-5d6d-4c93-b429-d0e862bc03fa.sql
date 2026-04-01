ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS public_token text UNIQUE;

-- Allow anonymous access to view invoices by public token (read-only)
CREATE POLICY "Anyone can view invoices by public_token"
ON public.invoices
FOR SELECT
USING (public_token IS NOT NULL AND public_token = current_setting('request.jwt.claims', true)::json->>'public_token');
