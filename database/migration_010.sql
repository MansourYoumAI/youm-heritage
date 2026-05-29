-- ============================================================
-- Migration 010
--
-- 1. Fix RLS Storage : autorise upload / lecture sur TOUS les
--    buckets utilisés par l'app (corrige l'erreur
--    "new row violates row-level security policy").
--
-- 2. Définit explicitement la limite de taille fichier :
--    - 25 Mo pour les photos
--    - 25 Mo pour l'audio (≈ 1 h en webm opus à 64 kbps)
--
-- 3. Suppression des colonnes WhatsApp et is_living côté DB.
-- ============================================================

-- ─── 1. S'assurer que tous les buckets existent et sont publics
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('profile-photos', 'profile-photos', true, 26214400),  -- 25 Mo
  ('souvenirs',      'souvenirs',      true, 26214400),
  ('audio',          'audio',          true, 26214400),
  ('gallery',        'gallery',        true, 26214400),
  ('kingdom-maps',   'kingdom-maps',   true, 26214400)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 26214400;

-- ─── 2. Politiques storage entièrement permissives
-- (l'auth de l'application est gérée par le middleware Next.js,
--  pas par Supabase RLS — on ouvre donc complètement les buckets
--  applicatifs en lecture / écriture).

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'storage' AND tablename = 'objects'
             AND policyname LIKE 'youm_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

-- Anciennes policies à nettoyer (migration_002 et 009)
DROP POLICY IF EXISTS "Youm uploads" ON storage.objects;
DROP POLICY IF EXISTS "Youm reads" ON storage.objects;
DROP POLICY IF EXISTS "Youm updates" ON storage.objects;
DROP POLICY IF EXISTS "Youm deletes" ON storage.objects;
DROP POLICY IF EXISTS "kingdom_maps_read" ON storage.objects;
DROP POLICY IF EXISTS "kingdom_maps_write" ON storage.objects;

CREATE POLICY "youm_storage_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id IN ('profile-photos', 'souvenirs', 'audio', 'gallery', 'kingdom-maps'));

CREATE POLICY "youm_storage_insert"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id IN ('profile-photos', 'souvenirs', 'audio', 'gallery', 'kingdom-maps'));

CREATE POLICY "youm_storage_update"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id IN ('profile-photos', 'souvenirs', 'audio', 'gallery', 'kingdom-maps'))
  WITH CHECK (bucket_id IN ('profile-photos', 'souvenirs', 'audio', 'gallery', 'kingdom-maps'));

CREATE POLICY "youm_storage_delete"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id IN ('profile-photos', 'souvenirs', 'audio', 'gallery', 'kingdom-maps'));

-- ─── 3. Suppression des colonnes WhatsApp et is_living
ALTER TABLE persons DROP COLUMN IF EXISTS whatsapp_number;
ALTER TABLE persons DROP COLUMN IF EXISTS is_living;

DO $$
BEGIN
  RAISE NOTICE 'Migration 010 OK : storage policies refaites, whatsapp_number et is_living supprimés.';
END $$;
