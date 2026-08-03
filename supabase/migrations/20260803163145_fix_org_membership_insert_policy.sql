-- Fix: "Users can create own membership" only checked user_id = auth.uid(),
-- never that the caller actually owns the target organization. Any
-- authenticated user who learned another organization's UUID could insert
-- a membership row for it and gain full access to that org's documents and
-- expenses via the "Members can ..." policies that key off this table.
--
-- The app's self-onboarding flow (WorkspaceContext.tsx, Onboarding.tsx)
-- always creates the organization first (owner_user_id = auth.uid()) and
-- only then inserts the membership row for that same org, so requiring
-- ownership here does not break the legitimate flow.

DROP POLICY IF EXISTS "Users can create own membership" ON public.organization_memberships;

CREATE POLICY "Users can create own membership"
ON public.organization_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE organizations.id = organization_memberships.organization_id
      AND organizations.owner_user_id = auth.uid()
  )
);
