-- ============================================================
-- Migration 003 : Nettoyage des relations orphelines + CASCADE
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- 1. Supprimer toutes les relations dont l'une des personnes n'existe plus
DELETE FROM relationships
WHERE person1_id NOT IN (SELECT id FROM persons)
   OR person2_id NOT IN (SELECT id FROM persons);

-- 2. Pareil pour les souvenirs orphelins
DELETE FROM souvenirs
WHERE person_id NOT IN (SELECT id FROM persons);

-- 3. Pareil pour les médias orphelins
DELETE FROM media
WHERE person_id IS NOT NULL
  AND person_id NOT IN (SELECT id FROM persons);

-- 4. S'assurer que le CASCADE est bien appliqué sur les relations
ALTER TABLE relationships
  DROP CONSTRAINT IF EXISTS relationships_person1_id_fkey;
ALTER TABLE relationships
  ADD CONSTRAINT relationships_person1_id_fkey
  FOREIGN KEY (person1_id) REFERENCES persons(id) ON DELETE CASCADE;

ALTER TABLE relationships
  DROP CONSTRAINT IF EXISTS relationships_person2_id_fkey;
ALTER TABLE relationships
  ADD CONSTRAINT relationships_person2_id_fkey
  FOREIGN KEY (person2_id) REFERENCES persons(id) ON DELETE CASCADE;

-- 5. CASCADE aussi sur les souvenirs et médias
ALTER TABLE souvenirs
  DROP CONSTRAINT IF EXISTS souvenirs_person_id_fkey;
ALTER TABLE souvenirs
  ADD CONSTRAINT souvenirs_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;

ALTER TABLE media
  DROP CONSTRAINT IF EXISTS media_person_id_fkey;
ALTER TABLE media
  ADD CONSTRAINT media_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE;
