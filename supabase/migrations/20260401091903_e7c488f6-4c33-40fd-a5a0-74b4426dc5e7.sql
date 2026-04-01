CREATE POLICY "Anon can insert customers for public offers"
ON public.customers
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM offers
    WHERE offers.user_id = customers.user_id
      AND offers.public_token IS NOT NULL
  )
);

CREATE POLICY "Anon can update customers for public offers"
ON public.customers
FOR UPDATE
TO anon
USING (
  EXISTS (
    SELECT 1 FROM offers
    WHERE offers.customer_id = customers.id
      AND offers.public_token IS NOT NULL
  )
);