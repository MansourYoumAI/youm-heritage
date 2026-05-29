-- ============================================================
-- YOUM HERITAGE — Schéma de base de données Supabase
-- Exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Extension pour les UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- DYNASTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS dynasties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kingdom TEXT NOT NULL,
  description TEXT,
  period TEXT,
  color TEXT DEFAULT 'gold',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PERSONNES
-- ============================================================
CREATE TABLE IF NOT EXISTS persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  maiden_name TEXT,
  gender TEXT CHECK (gender IN ('homme', 'femme', 'inconnu')) DEFAULT 'inconnu',
  birth_date TEXT,
  death_date TEXT,
  birth_place TEXT,
  death_place TEXT,
  biography TEXT,
  historical_notes TEXT,
  profile_picture_url TEXT,
  is_royal BOOLEAN DEFAULT false,
  dynasty_id UUID REFERENCES dynasties(id) ON DELETE SET NULL,
  is_living BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TITRES / FONCTIONS ROYALES
-- ============================================================
CREATE TABLE IF NOT EXISTS titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  dynasty_id UUID REFERENCES dynasties(id) ON DELETE SET NULL,
  period TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RELATIONS FAMILIALES
-- person1_id → parent / person2_id → enfant  (pour type='parent-enfant')
-- person1_id ↔ person2_id                     (pour type='mariage' / 'union')
-- ============================================================
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person1_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  person2_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('parent-enfant', 'mariage', 'union', 'fratrie')),
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_relation CHECK (person1_id != person2_id)
);

-- ============================================================
-- MÉDIAS (PHOTOS / DOCUMENTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  type TEXT CHECK (type IN ('photo', 'document')) DEFAULT 'photo',
  caption TEXT,
  year TEXT,
  is_profile_picture BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MÉMOIRES AUDIO
-- ============================================================
CREATE TABLE IF NOT EXISTS audio_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  about_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
  recorded_by TEXT,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  storage_path TEXT,
  duration_seconds INTEGER,
  language TEXT DEFAULT 'fr',
  transcript TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SOURCES HISTORIQUES
-- ============================================================
CREATE TABLE IF NOT EXISTS historical_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
  dynasty_id UUID REFERENCES dynasties(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('oral', 'document', 'livre', 'archive', 'autre')) DEFAULT 'oral',
  description TEXT,
  url TEXT,
  year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- HISTORIQUE DES MODIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT CHECK (action IN ('create', 'update', 'delete')) NOT NULL,
  changes JSONB,
  edited_by TEXT DEFAULT 'famille',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_persons_dynasty ON persons(dynasty_id);
CREATE INDEX IF NOT EXISTS idx_persons_is_royal ON persons(is_royal);
CREATE INDEX IF NOT EXISTS idx_relationships_person1 ON relationships(person1_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person2 ON relationships(person2_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(type);
CREATE INDEX IF NOT EXISTS idx_media_person ON media(person_id);
CREATE INDEX IF NOT EXISTS idx_audio_person ON audio_memories(about_person_id);
CREATE INDEX IF NOT EXISTS idx_titles_person ON titles(person_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER dynasties_updated_at
  BEFORE UPDATE ON dynasties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- BUCKETS SUPABASE STORAGE
-- (exécuter séparément dans Storage > Buckets > New bucket)
-- Créer les buckets suivants (public) :
--   - profile-photos
--   - gallery
--   - audio
-- ============================================================

-- ============================================================
-- POLITIQUES RLS (Row Level Security)
-- Pour une app familiale simple : lecture publique, écriture authentifiée
-- Désactivé par défaut — l'accès est géré par le mot de passe de l'application
-- ============================================================
ALTER TABLE persons DISABLE ROW LEVEL SECURITY;
ALTER TABLE dynasties DISABLE ROW LEVEL SECURITY;
ALTER TABLE relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE media DISABLE ROW LEVEL SECURITY;
ALTER TABLE audio_memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE titles DISABLE ROW LEVEL SECURITY;
ALTER TABLE historical_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE edit_history DISABLE ROW LEVEL SECURITY;
