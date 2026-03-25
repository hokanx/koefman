
-- Tighten the anon insert policy on offer_acceptances to require valid offer_id
DROP POLICY IF EXISTS "Anyone can insert offer acceptance" ON public.offer_acceptances;
CREATE POLICY "Anyone can insert offer acceptance" ON public.offer_acceptances
FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.offers WHERE offers.id = offer_acceptances.offer_id AND offers.public_token IS NOT NULL AND offers.status IN ('sent', 'draft')));

-- Tighten anon update on offers to only allow status change to 'accepted'
DROP POLICY IF EXISTS "Anyone can update offer status via token" ON public.offers;
CREATE POLICY "Anyone can update offer status via token" ON public.offers
FOR UPDATE TO anon
USING (public_token IS NOT NULL AND status IN ('sent', 'draft'))
WITH CHECK (public_token IS NOT NULL AND status = 'accepted');

-- Tighten anon SELECT on business_settings - only via offer relationship
DROP POLICY IF EXISTS "Anyone can view business settings for public offers" ON public.business_settings;
CREATE POLICY "Anon can view business settings for public offers" ON public.business_settings
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.offers WHERE offers.user_id = business_settings.user_id AND offers.public_token IS NOT NULL));

-- Tighten anon SELECT on customers - only via offer relationship
DROP POLICY IF EXISTS "Anyone can view customers for public offers" ON public.customers;
CREATE POLICY "Anon can view customers for public offers" ON public.customers
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.offers WHERE offers.customer_id = customers.id AND offers.public_token IS NOT NULL));
