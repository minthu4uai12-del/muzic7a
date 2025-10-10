/*
  # Create video_subscriptions table

  1. New Tables
    - `video_subscriptions`
      - `id` (uuid, primary key) - Unique identifier for the video subscription record
      - `user_id` (uuid, unique, foreign key) - References auth.users
      - `current_usage` (integer) - Current number of video generations used this period
      - `monthly_limit` (integer) - Maximum video generations allowed per month
      - `reset_date` (timestamptz) - Date when the usage counter resets
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record last update timestamp

  2. Security
    - Enable RLS on `video_subscriptions` table
    - Add policy for authenticated users to read their own video subscription data
    - Add policy for authenticated users to update their own video subscription data
    - Add policy for public users to insert their own video subscription data (for signup)

  3. Important Notes
    - This table tracks video generation usage separately from music generation
    - The monthly_limit defaults to 0 for new users (pay-per-use model)
    - Users must purchase video generation credits to increase their limit
*/

-- Create video_subscriptions table
CREATE TABLE IF NOT EXISTS public.video_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_usage integer NOT NULL DEFAULT 0,
  monthly_limit integer NOT NULL DEFAULT 0,
  reset_date timestamptz DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own video subscription
CREATE POLICY "Users can read their own video subscription"
  ON public.video_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own video subscription (for signup triggers)
CREATE POLICY "Users can insert their own video subscription"
  ON public.video_subscriptions
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own video subscription
CREATE POLICY "Users can update their own video subscription"
  ON public.video_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_subscriptions_user_id ON public.video_subscriptions(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_subscriptions_updated_at
  BEFORE UPDATE ON public.video_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_video_subscriptions_updated_at();