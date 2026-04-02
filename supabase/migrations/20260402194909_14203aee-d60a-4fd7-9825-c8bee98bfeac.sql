
-- Anon can view invoices by public token (mirrors existing offer/contract pattern)
CREATE POLICY "Anon can view invoices by public token"
ON public.invoices
FOR SELECT
TO anon
USING (public_token IS NOT NULL);

-- Anon can view invoice items for public invoices
CREATE POLICY "Anon can view invoice items for public invoices"
ON public.invoice_items
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM invoices
  WHERE invoices.id = invoice_items.invoice_id
    AND invoices.public_token IS NOT NULL
));

-- Anon can view business settings for public invoices
CREATE POLICY "Anon can view business settings for public invoices"
ON public.business_settings
FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM invoices
  WHERE invoices.user_id = business_settings.user_id
    AND invoices.public_token IS NOT NULL
));
