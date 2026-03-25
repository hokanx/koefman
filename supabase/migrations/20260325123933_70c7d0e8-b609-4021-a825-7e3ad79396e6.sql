
-- Add validity_days and public_token to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS validity_days integer DEFAULT 14;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT (gen_random_uuid())::text;

-- Create offer_acceptances table
CREATE TABLE public.offer_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  accepted_by_name text NOT NULL,
  signature_text text,
  ip_address text,
  accepted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for offer_acceptances
ALTER TABLE public.offer_acceptances ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view acceptances for their own offers
CREATE POLICY "Users can view own offer acceptances" ON public.offer_acceptances
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.offers WHERE offers.id = offer_acceptances.offer_id AND offers.user_id = auth.uid()));

-- Anyone (anon) can insert an acceptance (public offer acceptance)
CREATE POLICY "Anyone can insert offer acceptance" ON public.offer_acceptances
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Allow anon to read offers by public_token (for the public view page)
CREATE POLICY "Anyone can view offers by public token" ON public.offers
FOR SELECT TO anon
USING (public_token IS NOT NULL);

-- Allow anon to read offer_items for public offers
CREATE POLICY "Anyone can view offer items for public offers" ON public.offer_items
FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.offers WHERE offers.id = offer_items.offer_id AND offers.public_token IS NOT NULL));

-- Allow anon to read business_settings for public offers
CREATE POLICY "Anyone can view business settings for public offers" ON public.business_settings
FOR SELECT TO anon
USING (true);

-- Allow anon to read customers for public offers  
CREATE POLICY "Anyone can view customers for public offers" ON public.customers
FOR SELECT TO anon
USING (true);

-- Allow anon to update offer status (for acceptance)
CREATE POLICY "Anyone can update offer status via token" ON public.offers
FOR UPDATE TO anon
USING (public_token IS NOT NULL)
WITH CHECK (public_token IS NOT NULL);
