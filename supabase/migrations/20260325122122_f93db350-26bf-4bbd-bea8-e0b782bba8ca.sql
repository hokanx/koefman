ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS owner_name text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS default_offer_title text DEFAULT '';