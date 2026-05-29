-- ============================================================
-- Migration 002 : Storage RLS + date des souvenirs
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- ─── 1. Création des buckets s'ils n'existent pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('souvenirs', 'souvenirs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─── 2. Politiques d'accès public aux buckets famille
-- (lecture, écriture, mise à jour, suppression pour tous)
DROP POLICY IF EXISTS "Youm uploads"  ON storage.objects;
DROP POLICY IF EXISTS "Youm reads"    ON storage.objects;
DROP POLICY IF EXISTS "Youm updates"  ON storage.objects;
DROP POLICY IF EXISTS "Youm deletes"  ON storage.objects;

CREATE POLICY "Youm uploads"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id IN ('souvenirs', 'profile-photos', 'gallery', 'audio'));

CREATE POLICY "Youm reads"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('souvenirs', 'profile-photos', 'gallery', 'audio'));

CREATE POLICY "Youm updates"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id IN ('souvenirs', 'profile-photos', 'gallery', 'audio'));

CREATE POLICY "Youm deletes"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id IN ('souvenirs', 'profile-photos', 'gallery', 'audio'));

-- ─── 3. Date du souvenir (même approximative : "1970", "vers 1950", "années 60")
ALTER TABLE souvenirs ADD COLUMN IF NOT EXISTS souvenir_date TEXT;
