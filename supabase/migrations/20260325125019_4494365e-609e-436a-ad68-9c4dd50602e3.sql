
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS small_business_regulation boolean NOT NULL DEFAULT false;

ALTER TABLE public.offer_acceptances ADD COLUMN IF NOT EXISTS signature_image text;
