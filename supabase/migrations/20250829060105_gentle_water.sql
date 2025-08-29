/*
  # Create admin account for htetnay4u@gmail.com

  1. Admin Setup
    - Add htetnay4u@gmail.com as admin user
    - Grant full admin permissions
    - Set as super admin role

  2. Security
    - Admin user can manage all payment orders
    - Full access to admin panel features
*/

-- Insert admin user into admin_users table
-- Note: The user must first sign up normally, then this will grant admin privileges
INSERT INTO admin_users (id, role, permissions, is_active)
SELECT 
  id,
  'super_admin'::text,
  ARRAY['manage_payments', 'manage_users', 'view_analytics', 'system_admin']::text[],
  true
FROM auth.users 
WHERE email = 'htetnay4u@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  permissions = ARRAY['manage_payments', 'manage_users', 'view_analytics', 'system_admin']::text[],
  is_active = true,
  updated_at = now();

-- If the user doesn't exist yet, we'll create a placeholder that will be activated when they sign up
-- This is handled by the trigger function when a new user signs up