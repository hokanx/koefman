
-- Add structured address fields to business_settings (replace single address)
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS street text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS house_number text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS country text DEFAULT 'Deutschland';

-- Add default text fields to business_settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS default_offer_intro_text text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS default_offer_footer_text text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS default_invoice_intro_text text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS default_invoice_footer_text text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS default_closing_text text DEFAULT '';

-- Add bank details to business_settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS account_holder text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS bank_name text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS iban text DEFAULT '';
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS bic text DEFAULT '';

-- Add structured address fields to customers (replace single address)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS street text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS house_number text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city text DEFAULT '';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS country text DEFAULT '';

-- Add document text fields to offers
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS intro_text text DEFAULT '';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '';
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS closing_text text DEFAULT '';

-- Add document text fields to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS intro_text text DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS closing_text text DEFAULT '';
