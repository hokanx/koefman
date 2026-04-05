UPDATE public.organizations SET tax_mode = 'small_business' WHERE tax_mode = 'kleinunternehmer';
ALTER TABLE public.organizations ALTER COLUMN tax_mode SET DEFAULT 'standard';