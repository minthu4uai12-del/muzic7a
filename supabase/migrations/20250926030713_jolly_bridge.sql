/*
  # Fix Authentication and User Profile Creation

  1. Triggers
    - Fix handle_new_user trigger for user_profiles
    - Fix handle_new_user_admin trigger for admin assignment
    - Ensure proper user profile creation on signup

  2. Functions
    - Update trigger functions to handle edge cases
    - Add proper error handling

  3. Security
    - Ensure RLS policies allow profile creation
    - Fix any permission issues
*/

-- Drop existing triggers to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;

-- Recreate the handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles
  INSERT INTO public.user_profiles (id, username, display_name, avatar_url, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(EXCLUDED.username, user_profiles.username),
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
    updated_at = now();

  -- Insert into user_subscriptions
  INSERT INTO public.user_subscriptions (user_id, plan_type, monthly_limit, current_usage)
  VALUES (NEW.id, 'free', 1, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert into video_subscriptions
  INSERT INTO public.video_subscriptions (user_id, current_usage, monthly_limit)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the handle_new_user_admin function
CREATE OR REPLACE FUNCTION handle_new_user_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user email is the admin email
  IF NEW.email = 'htetnay4u@gmail.com' THEN
    INSERT INTO public.admin_users (id, role, permissions, is_active)
    VALUES (NEW.id, 'super_admin', ARRAY['manage_payments', 'manage_users', 'manage_content'], true)
    ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      permissions = ARRAY['manage_payments', 'manage_users', 'manage_content'],
      is_active = true,
      updated_at = now();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user_admin: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_admin();

-- Ensure RLS policies allow profile creation
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = id);

-- Allow public access for profile creation during signup
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON user_profiles
  FOR SELECT
  TO public
  USING (true);

-- Ensure user_subscriptions policies allow creation
DROP POLICY IF EXISTS "Users can read their own subscription" ON user_subscriptions;
CREATE POLICY "Users can read their own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription" ON user_subscriptions;
CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Ensure video_subscriptions policies allow creation
DROP POLICY IF EXISTS "Users can read their own video subscription" ON video_subscriptions;
CREATE POLICY "Users can read their own video subscription"
  ON video_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own video subscription" ON video_subscriptions;
CREATE POLICY "Users can insert their own video subscription"
  ON video_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);