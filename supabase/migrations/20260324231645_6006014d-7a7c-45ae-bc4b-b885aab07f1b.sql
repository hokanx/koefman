
-- Add intake_token to business_settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS intake_token text UNIQUE DEFAULT gen_random_uuid()::text;

-- Create intake_submissions table
CREATE TABLE public.intake_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_or_name text NOT NULL DEFAULT '',
  contact_person text,
  phone text,
  email text,
  street text,
  house_number text,
  postal_code text,
  city text,
  country text,
  notes text,
  business_category text DEFAULT 'general',
  service_type text,
  vehicle_plate text,
  vehicle_brand text,
  vehicle_model text,
  repair_notes text,
  property_size text,
  cleaning_frequency text,
  service_location text,
  service_notes text,
  status text NOT NULL DEFAULT 'new',
  converted_customer_id uuid REFERENCES public.customers(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_submissions ENABLE ROW LEVEL SECURITY;

-- Public can insert (anyone with the link can submit)
CREATE POLICY "Anyone can insert intake submissions"
  ON public.intake_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only the owner can view their submissions
CREATE POLICY "Owners can view own submissions"
  ON public.intake_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

-- Only the owner can update their submissions
CREATE POLICY "Owners can update own submissions"
  ON public.intake_submissions FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Only the owner can delete their submissions
CREATE POLICY "Owners can delete own submissions"
  ON public.intake_submissions FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);
