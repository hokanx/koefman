
-- 1. Create organizations table (no member-dependent policy yet)
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  slug text UNIQUE,
  status text NOT NULL DEFAULT 'active',
  owner_user_id uuid,
  is_internal boolean NOT NULL DEFAULT false,
  created_by_admin_id uuid,
  notes text
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create organization_memberships table
CREATE TABLE public.organization_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'owner',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all memberships" ON public.organization_memberships
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own memberships" ON public.organization_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. Now add member view policy on organizations (memberships table exists now)
CREATE POLICY "Members can view own organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE organization_memberships.organization_id = organizations.id
    AND organization_memberships.user_id = auth.uid()
  ));

-- 4. Updated_at trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
