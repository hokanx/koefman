
DROP POLICY "Anyone can insert contract acceptance" ON public.contract_acceptances;

CREATE POLICY "Anyone can insert contract acceptance"
ON public.contract_acceptances
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contracts
    WHERE contracts.id = contract_acceptances.contract_id
    AND contracts.public_token IS NOT NULL
    AND contracts.status IN ('active', 'entwurf', 'gesendet')
  )
);
