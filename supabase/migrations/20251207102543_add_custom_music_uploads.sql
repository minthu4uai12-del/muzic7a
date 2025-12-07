/*
  # Add Custom Music Upload Support

  1. New Table: custom_music_uploads
     - Stores user-uploaded music tracks for video generation
     - Tracks upload metadata and file storage URLs

  2. Security
     - Enable RLS on custom_music_uploads
     - Users can only upload and view their own tracks
*/

CREATE TABLE IF NOT EXISTS custom_music_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  audio_url text NOT NULL,
  duration integer NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE custom_music_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can upload their own music"
  ON custom_music_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own uploads"
  ON custom_music_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
  ON custom_music_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);