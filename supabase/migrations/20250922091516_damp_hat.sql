/*
  # Video Generation System Schema

  1. New Tables
    - `video_packages`
      - `id` (uuid, primary key)
      - `name` (text)
      - `name_mm` (text, Myanmar name)
      - `generations` (integer)
      - `price_mmk` (integer)
      - `description` (text)
      - `description_mm` (text, Myanmar description)
      - `is_active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `video_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `current_usage` (integer)
      - `monthly_limit` (integer)
      - `reset_date` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `video_generation_tasks`
      - `id` (text, primary key - from Wavespeed API)
      - `user_id` (uuid, foreign key to users)
      - `status` (text)
      - `audio_url` (text)
      - `image_url` (text)
      - `prompt` (text, optional)
      - `resolution` (text)
      - `track_id` (text, optional)
      - `track_title` (text, optional)
      - `outputs` (text array)
      - `has_nsfw_contents` (boolean array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Users can only access their own data
*/

-- Create video_packages table
CREATE TABLE IF NOT EXISTS video_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_mm text NOT NULL,
  generations integer NOT NULL,
  price_mmk integer NOT NULL,
  description text,
  description_mm text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create video_subscriptions table
CREATE TABLE IF NOT EXISTS video_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_usage integer DEFAULT 0,
  monthly_limit integer DEFAULT 0,
  reset_date timestamptz DEFAULT (date_trunc('month', now()) + '1 mon'::interval),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create video_generation_tasks table
CREATE TABLE IF NOT EXISTS video_generation_tasks (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('created', 'processing', 'completed', 'failed')),
  audio_url text NOT NULL,
  image_url text NOT NULL,
  prompt text DEFAULT '',
  resolution text DEFAULT '480p' CHECK (resolution IN ('480p', '720p')),
  track_id text,
  track_title text,
  outputs text[] DEFAULT '{}',
  has_nsfw_contents boolean[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE video_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generation_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for video_packages
CREATE POLICY "Anyone can view active video packages"
  ON video_packages
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage video packages"
  ON video_packages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for video_subscriptions
CREATE POLICY "Users can read their own video subscription"
  ON video_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own video subscription"
  ON video_subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own video subscription"
  ON video_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policies for video_generation_tasks
CREATE POLICY "Users can view their own video tasks"
  ON video_generation_tasks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own video tasks"
  ON video_generation_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own video tasks"
  ON video_generation_tasks
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own video tasks"
  ON video_generation_tasks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_subscriptions_user_id ON video_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generation_tasks_user_id ON video_generation_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generation_tasks_status ON video_generation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_video_generation_tasks_created_at ON video_generation_tasks(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_packages_updated_at') THEN
        CREATE TRIGGER update_video_packages_updated_at
            BEFORE UPDATE ON video_packages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_subscriptions_updated_at') THEN
        CREATE TRIGGER update_video_subscriptions_updated_at
            BEFORE UPDATE ON video_subscriptions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_video_generation_tasks_updated_at') THEN
        CREATE TRIGGER update_video_generation_tasks_updated_at
            BEFORE UPDATE ON video_generation_tasks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert default video package
INSERT INTO video_packages (name, name_mm, generations, price_mmk, description, description_mm, is_active)
VALUES (
  'Video Generation Pack',
  'ဗီဒီယိုထုတ်လုပ်မှုပက်ကေ့ဂျ်',
  5,
  30000,
  'Create singing videos from your AI music tracks with custom avatars',
  'သင့် AI ဂီတသီချင်းများမှ စိတ်ကြိုက်အာဗတာများဖြင့် သီဆိုသောဗီဒီယိုများဖန်တီးပါ',
  true
) ON CONFLICT DO NOTHING;