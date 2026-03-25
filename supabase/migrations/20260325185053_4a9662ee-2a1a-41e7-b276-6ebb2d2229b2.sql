
CREATE TABLE public.document_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.document_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own document emails"
  ON public.document_emails FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own document emails"
  ON public.document_emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
