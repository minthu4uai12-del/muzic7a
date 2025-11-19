/*
  # Fix Database Schema Issues

  1. Add missing `is_active` column to `admin_users`
  2. Create `user_subscriptions` table for music generation limits
  3. Update `video_subscriptions` to match expected schema
*/

-- Add is_active column to admin_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN is_active boolean DEFAULT true;
  END IF;
END $$;

-- Create user_subscriptions table for music generation limits
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text DEFAULT 'free',
  monthly_limit integer DEFAULT 1,
  current_usage integer DEFAULT 0,
  reset_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- Update video_subscriptions to have correct columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_subscriptions' AND column_name = 'current_usage'
  ) THEN
    ALTER TABLE video_subscriptions ADD COLUMN current_usage integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_subscriptions' AND column_name = 'monthly_limit'
  ) THEN
    ALTER TABLE video_subscriptions ADD COLUMN monthly_limit integer DEFAULT 0;
  END IF;
END $$;
