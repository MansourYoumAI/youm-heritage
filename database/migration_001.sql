-- ============================================================
-- Migration 001 : WhatsApp + Souvenirs
-- Exécuter dans Supabase SQL Editor
-- ============================================================

-- Numéro WhatsApp pour les personnes vivantes
ALTER TABLE persons ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Lieu de naissance "autre" (texte libre quand la ville n'est pas dans la liste)
ALTER TABLE persons ADD COLUMN IF NOT EXISTS birth_place_other TEXT;

-- Table des souvenirs (texte + image et/ou audio optionnels)
CREATE TABLE IF NOT EXISTS souvenirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT,
  image_url TEXT,
  image_storage_path TEXT,
  audio_url TEXT,
  audio_storage_path TEXT,
  audio_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_souvenirs_person ON souvenirs(person_id);
ALTER TABLE souvenirs DISABLE ROW LEVEL SECURITY;

-- Bucket souvenirs (à créer manuellement aussi dans Storage > Buckets, public)
-- Nom du bucket : "souvenirs"
