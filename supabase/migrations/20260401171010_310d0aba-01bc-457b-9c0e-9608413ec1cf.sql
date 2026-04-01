
DROP POLICY "Anyone can update contract status via token" ON public.contracts;

CREATE POLICY "Anyone can update contract status via token"
ON public.contracts
FOR UPDATE
TO anon
USING (
  public_token IS NOT NULL
  AND status IN ('active', 'entwurf', 'gesendet')
)
WITH CHECK (
  public_token IS NOT NULL
  AND status IN ('aktiv', 'unterzeichnet', 'abgelehnt')
);
