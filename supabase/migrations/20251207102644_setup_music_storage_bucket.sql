/*
  # Set Up Music Storage Bucket

  1. Create music-uploads storage bucket
  2. Enable public access for music files
  3. Set up storage policies for user uploads

  Note: Storage bucket operations are typically done through the Supabase dashboard.
  This migration creates the necessary database records for storage configuration.
*/

-- Insert storage bucket configuration
INSERT INTO storage.buckets (id, name, owner, public, created_at, updated_at)
VALUES ('music-uploads', 'music-uploads', NULL, true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload to their own folder
CREATE POLICY "Authenticated users can upload to their user folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'music-uploads' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create policy to allow authenticated users to read files
CREATE POLICY "Authenticated users can read all music files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'music-uploads');

-- Create policy to allow users to delete their own files
CREATE POLICY "Users can delete their own music files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'music-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );