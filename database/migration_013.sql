-- ============================================================
-- Migration 013 : Favoris par royaume sur les récits familiaux
--
-- Chaque récit peut être marqué comme "favori" sur une (ou plusieurs)
-- page royaume. Stocké en tableau Postgres de slugs (cayor, baol,
-- fouta-toro). Cliquer sur l'étoile jaune d'une fiche du Cayor ajoute
-- 'cayor' dans le tableau.
--
-- Pas de table de jointure : un simple text[] suffit (3 slugs max
-- pour l'instant) et reste éditable sans contrainte.
-- ============================================================

ALTER TABLE souvenirs
  ADD COLUMN IF NOT EXISTS kingdom_favorites TEXT[] DEFAULT '{}'::TEXT[];

-- Index GIN pour requêtes "récit favori du royaume X" rapides
CREATE INDEX IF NOT EXISTS idx_souvenirs_kingdom_favorites
  ON souvenirs USING GIN (kingdom_favorites);

NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'Migration 013 OK : colonne kingdom_favorites ajoutée.';
END $$;
