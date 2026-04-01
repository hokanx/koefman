
-- Add discount columns to offers
ALTER TABLE public.offers
  ADD COLUMN discount_type text DEFAULT NULL,
  ADD COLUMN discount_value numeric DEFAULT 0,
  ADD COLUMN discount_scope text DEFAULT 'both',
  ADD COLUMN discount_duration_months integer DEFAULT NULL;

-- Add discount columns to contracts
ALTER TABLE public.contracts
  ADD COLUMN discount_type text DEFAULT NULL,
  ADD COLUMN discount_value numeric DEFAULT 0,
  ADD COLUMN discount_scope text DEFAULT 'both',
  ADD COLUMN discount_duration_months integer DEFAULT NULL;
