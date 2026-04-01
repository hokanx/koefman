
-- Add recommended_package to lead_analyses
ALTER TABLE public.lead_analyses ADD COLUMN recommended_package text DEFAULT 'setup_59';

-- Create lead_bookings table
CREATE TABLE public.lead_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  phone text NOT NULL,
  selected_slot text NOT NULL,
  booking_status text NOT NULL DEFAULT 'booked',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public funnel)
CREATE POLICY "Anyone can insert lead bookings"
  ON public.lead_bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins can manage all
CREATE POLICY "Admins can manage lead bookings"
  ON public.lead_bookings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
