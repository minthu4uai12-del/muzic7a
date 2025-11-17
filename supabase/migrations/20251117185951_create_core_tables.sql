/*
  # Create Core Database Schema for Music Generation App

  1. New Tables
    - `user_profiles`: User information and preferences
    - `saved_tracks`: User's saved music tracks
    - `payment_packages`: Available payment packages
    - `payment_orders`: User payment orders
    - `payment_transactions`: Payment transaction history
    - `admin_users`: Admin user management
    - `video_packages`: Video generation packages
    - `video_subscriptions`: User video subscriptions
    - `video_generation_tasks`: Video generation task tracking

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for admin operations
    - Public data accessible as needed

  3. Functions
    - Add increment_play_count function for tracking plays
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create saved_tracks table
CREATE TABLE IF NOT EXISTS saved_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text,
  duration integer DEFAULT 180,
  audio_url text NOT NULL,
  image_url text DEFAULT 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
  tags text[],
  prompt text,
  task_id text,
  is_public boolean DEFAULT false,
  is_generated boolean DEFAULT false,
  play_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_track UNIQUE(user_id, title, audio_url)
);

ALTER TABLE saved_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tracks"
  ON saved_tracks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public tracks"
  ON saved_tracks FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can insert own tracks"
  ON saved_tracks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracks"
  ON saved_tracks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracks"
  ON saved_tracks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index on user_id for faster queries
CREATE INDEX idx_saved_tracks_user_id ON saved_tracks(user_id);
CREATE INDEX idx_saved_tracks_is_public ON saved_tracks(is_public);

-- Create payment_packages table
CREATE TABLE IF NOT EXISTS payment_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_mmk integer NOT NULL,
  generations integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active packages"
  ON payment_packages FOR SELECT
  USING (is_active = true);

-- Create payment_orders table
CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES payment_packages(id),
  order_reference text UNIQUE NOT NULL,
  amount_mmk integer NOT NULL,
  generations integer NOT NULL,
  payment_proof_url text,
  payment_notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON payment_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON payment_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON payment_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_payment_orders_user_id ON payment_orders(user_id);

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES payment_orders(id),
  amount_mmk integer NOT NULL,
  transaction_type text NOT NULL,
  status text DEFAULT 'pending',
  reference_id text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'moderator',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE id = auth.uid()
    )
  );

-- Create video_packages table
CREATE TABLE IF NOT EXISTS video_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_mmk integer NOT NULL,
  video_generations integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE video_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active video packages"
  ON video_packages FOR SELECT
  USING (is_active = true);

-- Create video_subscriptions table
CREATE TABLE IF NOT EXISTS video_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES video_packages(id),
  status text DEFAULT 'active',
  remaining_generations integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT unique_user_package UNIQUE(user_id, package_id)
);

ALTER TABLE video_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON video_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_video_subscriptions_user_id ON video_subscriptions(user_id);

-- Create video_generation_tasks table
CREATE TABLE IF NOT EXISTS video_generation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES video_subscriptions(id),
  task_id text UNIQUE NOT NULL,
  prompt text NOT NULL,
  status text DEFAULT 'pending',
  video_url text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE video_generation_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON video_generation_tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON video_generation_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_video_generation_tasks_user_id ON video_generation_tasks(user_id);
CREATE INDEX idx_video_generation_tasks_task_id ON video_generation_tasks(task_id);

-- Create function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(track_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE saved_tracks
  SET play_count = play_count + 1,
      updated_at = now()
  WHERE id = track_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
