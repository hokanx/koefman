
-- Documents table for file uploads
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  category TEXT NOT NULL DEFAULT 'sonstiges',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all documents" ON public.documents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert documents for users" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete any documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update any documents" ON public.documents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add client_status to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS client_status TEXT NOT NULL DEFAULT 'aktiv';

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false) ON CONFLICT DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'client-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can manage all documents" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'));
