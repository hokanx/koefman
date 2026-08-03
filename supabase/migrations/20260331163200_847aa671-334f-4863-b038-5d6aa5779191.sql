
-- Fix admin account: set active status and restore admin role
UPDATE public.profiles 
SET account_status = 'active' 
WHERE id = '48f68162-9000-4a49-a29b-6c8576fe42f2';

INSERT INTO public.user_roles (user_id, role)
SELECT '48f68162-9000-4a49-a29b-6c8576fe42f2', 'admin'
WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = '48f68162-9000-4a49-a29b-6c8576fe42f2')
ON CONFLICT DO NOTHING;
