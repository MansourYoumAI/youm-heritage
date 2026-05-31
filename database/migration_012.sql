-- ============================================================
-- Migration 012 : Champ "source" sur les souvenirs
--
-- Permet de référencer d'où vient l'information : témoin, livre,
-- archive, lien web, tradition orale, etc.
-- ============================================================

ALTER TABLE souvenirs
  ADD COLUMN IF NOT EXISTS source TEXT;

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'Migration 012 OK : colonne source ajoutée à souvenirs.';
END $$;
