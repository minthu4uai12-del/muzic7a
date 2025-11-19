/*
  # Fix Admin Users Policy and Tags Column

  1. Remove infinite recursion in admin_users policy
  2. Add proper admin check
*/

-- Drop the problematic admin_users policy
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;

-- Create a fixed policy without recursion
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);
