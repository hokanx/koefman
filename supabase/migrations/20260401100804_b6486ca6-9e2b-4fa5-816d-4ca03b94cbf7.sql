
-- Allow users to create their own organization (one per user)
CREATE POLICY "Users can create own organization"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());

-- Allow users to update their own organization
CREATE POLICY "Users can update own organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid());

-- Allow users to create their own membership
CREATE POLICY "Users can create own membership"
ON public.organization_memberships
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
