
-- Add public_token to contracts for public contract viewing/signing
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS public_token text DEFAULT (gen_random_uuid())::text;

-- Create contract_acceptances table
CREATE TABLE IF NOT EXISTS public.contract_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  accepted_by_name text NOT NULL,
  signature_image text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_acceptances ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can insert acceptance for contracts with public_token and status draft/gesendet
CREATE POLICY "Anyone can insert contract acceptance"
ON public.contract_acceptances
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_acceptances.contract_id
    AND contracts.public_token IS NOT NULL
    AND contracts.status IN ('active', 'gesendet')
  )
);

-- RLS: Authenticated users can view their own contract acceptances
CREATE POLICY "Users can view own contract acceptances"
ON public.contract_acceptances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_acceptances.contract_id
    AND contracts.user_id = auth.uid()
  )
);

-- RLS: Allow anon to view contracts by public_token
CREATE POLICY "Anyone can view contracts by public token"
ON public.contracts
FOR SELECT
TO anon
USING (public_token IS NOT NULL);

-- RLS: Allow anon to update contract status via public token
CREATE POLICY "Anyone can update contract status via token"
ON public.contracts
FOR UPDATE
TO anon
USING (public_token IS NOT NULL AND status IN ('active', 'gesendet'))
WITH CHECK (public_token IS NOT NULL AND status IN ('unterzeichnet', 'abgelehnt'));

-- Allow anon to view contract_items for public contracts
CREATE POLICY "Anyone can view contract items for public contracts"
ON public.contract_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.id = contract_items.contract_id
    AND contracts.public_token IS NOT NULL
  )
);

-- Allow anon to view business_settings for public contracts
CREATE POLICY "Anon can view business settings for public contracts"
ON public.business_settings
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.user_id = business_settings.user_id
    AND contracts.public_token IS NOT NULL
  )
);

-- Allow anon to view customers for public contracts
CREATE POLICY "Anon can view customers for public contracts"
ON public.customers
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.contracts
    WHERE contracts.customer_id = customers.id
    AND contracts.public_token IS NOT NULL
  )
);
