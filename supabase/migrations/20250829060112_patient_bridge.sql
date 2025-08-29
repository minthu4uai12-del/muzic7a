/*
  # Update admin trigger to auto-assign admin role

  1. Trigger Function
    - Check if new user email is htetnay4u@gmail.com
    - Automatically assign super_admin role
    - Grant all admin permissions

  2. Security
    - Only specific email gets admin access
    - Automatic role assignment on signup
*/

-- Create or replace the function to handle new user admin assignment
CREATE OR REPLACE FUNCTION handle_new_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile first
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  -- Create user subscription
  INSERT INTO public.user_subscriptions (user_id, plan_type, monthly_limit, current_usage)
  VALUES (NEW.id, 'free', 1, 0);

  -- Check if this is the admin email and assign admin role
  IF NEW.email = 'htetnay4u@gmail.com' THEN
    INSERT INTO public.admin_users (id, role, permissions, is_active)
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
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_admin();