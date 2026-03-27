
ALTER TABLE public.documents
ADD COLUMN status text NOT NULL DEFAULT 'neu',
ADD COLUMN admin_note text;
