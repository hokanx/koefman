
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add account status and subscription fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN account_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN plan_name text NOT NULL DEFAULT 'free',
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'trial',
  ADD COLUMN trial_end timestamp with time zone,
  ADD COLUMN subscription_start timestamp with time zone,
  ADD COLUMN subscription_end timestamp with time zone;

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all business_settings
CREATE POLICY "Admins can view all business settings" ON public.business_settings
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all customers (for counts)
CREATE POLICY "Admins can view all customers" ON public.customers
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all offers (for counts)
CREATE POLICY "Admins can view all offers" ON public.offers
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all invoices (for counts)
CREATE POLICY "Admins can view all invoices" ON public.invoices
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
