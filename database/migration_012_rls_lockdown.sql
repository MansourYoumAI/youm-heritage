-- Migration 012 : Verrouillage RLS
--
-- Objectif : la clé Supabase anon (exposée côté client) peut UNIQUEMENT lire
-- les tables publiques. Toutes les écritures doivent passer par les API routes
-- côté serveur (qui utilisent SERVICE_ROLE_KEY et vérifient le cookie admin).
--
-- Après cette migration, toute tentative d'INSERT/UPDATE/DELETE avec la clé
-- anon est refusée par Postgres. La clé service_role (serveur uniquement)
-- continue de bypasser RLS normalement.
--
-- Prérequis : les API routes mutatrices doivent déjà appeler requireAdmin()
-- (vérifié avant d'exécuter cette migration).

-- ─── Tables concernées
--
-- Lecture publique : persons, relationships, titles, dynasties, media, souvenirs,
--                    audio_memories, kingdom_pages, edit_history
-- Pas d'écriture anonyme sur AUCUNE table.

-- Helper : (ré)initialise les policies pour une table en mode "read-only anon"
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'persons',
    'relationships',
    'titles',
    'dynasties',
    'media',
    'souvenirs',
    'audio_memories',
    'kingdom_pages',
    'edit_history'
  ];
  tbl_exists boolean;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Skip si la table n'existe pas dans ce projet (robuste aux schémas partiels)
    SELECT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) INTO tbl_exists;
    IF NOT tbl_exists THEN
      RAISE NOTICE 'Table % absente, skip.', tbl;
      CONTINUE;
    END IF;

    -- Active RLS (idempotent)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    -- Supprime les anciennes policies permissives s'il y en a
    EXECUTE format('DROP POLICY IF EXISTS "Public read %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public insert %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public update %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Public delete %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Anon can read %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow all %1$s" ON public.%1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.%I', tbl);

    -- Autorise UNIQUEMENT la lecture (SELECT) pour anon
    EXECUTE format(
      'CREATE POLICY "Public read %1$s" ON public.%1$I FOR SELECT TO anon, authenticated USING (true)',
      tbl
    );
  END LOOP;
END$$;

-- ─── Storage : bucket profile-photos
-- Lecture publique (déjà en place), aucune écriture via la clé anon.
-- Les uploads passent par l'API route /api/media (côté serveur).
--
-- Note : les buckets storage sont gérés via l'interface Supabase. Vérifier
-- dans Dashboard → Storage → profile-photos :
--   - Public bucket : ON (pour que les URLs des photos s'affichent)
--   - Policies : SELECT autorisé pour anon, INSERT/UPDATE/DELETE refusés
--
-- Si une policy write existe déjà pour anon, la supprimer manuellement.
