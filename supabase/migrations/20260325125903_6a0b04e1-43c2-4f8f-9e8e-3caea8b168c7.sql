
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

-- Update the anon UPDATE policy to also allow setting status to 'rejected'
DROP POLICY IF EXISTS "Anyone can update offer status via token" ON public.offers;

CREATE POLICY "Anyone can update offer status via token"
ON public.offers
FOR UPDATE
TO anon
USING (
  public_token IS NOT NULL
  AND status IN ('sent', 'draft')
)
WITH CHECK (
  public_token IS NOT NULL
  AND status IN ('accepted', 'rejected')
);
