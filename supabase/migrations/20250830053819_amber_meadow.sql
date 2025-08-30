/*
  # Create Admin Account for htetnay4u@gmail.com

  1. Admin Setup
    - Creates automatic admin assignment trigger
    - Assigns super_admin role to htetnay4u@gmail.com
    - Grants full permissions for payment and user management

  2. Security
    - Maintains existing RLS policies
    - Admin privileges only for specified email
    - Automatic role assignment on user creation
*/

-- Function to handle new user admin assignment
CREATE OR REPLACE FUNCTION handle_new_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the admin email
  IF NEW.email = 'htetnay4u@gmail.com' THEN
    -- Insert admin record
    INSERT INTO admin_users (id, role, permissions, is_active)
    VALUES (
      NEW.id,
      'super_admin',
      ARRAY['manage_payments', 'manage_users', 'view_analytics', 'system_admin'],
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      permissions = ARRAY['manage_payments', 'manage_users', 'view_analytics', 'system_admin'],
      is_active = true,
      updated_at = now();
    
    -- Also ensure user profile exists
    INSERT INTO user_profiles (id, username, display_name)
    VALUES (
      NEW.id,
      'admin',
      'System Administrator'
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = 'System Administrator',
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user admin assignment
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_admin();

-- If the admin user already exists, make sure they have admin privileges
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the admin user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'htetnay4u@gmail.com'
  LIMIT 1;
  
  -- If admin user exists, ensure they have admin privileges
  IF admin_user_id IS NOT NULL THEN
    -- Insert or update admin record
    INSERT INTO admin_users (id, role, permissions, is_active)
    VALUES (
      admin_user_id,
      'super_admin',
      ARRAY['manage_payments', 'manage_users', 'view_analytics', 'system_admin'],
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      permissions = ARRAY['manage_payments', 'manage_users', 'view_analytics', 'system_admin'],
      is_active = true,
      updated_at = now();
    
    -- Ensure user profile exists
    INSERT INTO user_profiles (id, username, display_name)
    VALUES (
      admin_user_id,
      'admin',
      'System Administrator'
    )
    ON CONFLICT (id) DO UPDATE SET
      display_name = 'System Administrator',
      updated_at = now();
    
    RAISE NOTICE 'Admin privileges granted to existing user: htetnay4u@gmail.com';
  ELSE
    RAISE NOTICE 'Admin user htetnay4u@gmail.com not found - will be granted admin privileges upon signup';
  END IF;
END $$;