
CREATE TABLE public.qr_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id TEXT NOT NULL DEFAULT 'direct',
  converted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.qr_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert qr sessions" ON public.qr_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update qr sessions" ON public.qr_sessions FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Admins can view all qr sessions" ON public.qr_sessions FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
