-- Create public bucket for news article images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-images',
  'news-images',
  true,
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
