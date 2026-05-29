-- ============================================================
-- Migration 005 : Garantir l'unicité des relations
-- Empêche d'avoir deux fois la même relation entre deux personnes.
-- ============================================================

-- ─── 1. Supprimer les doublons EXACTS existants (même p1, p2, type)
--    On garde la ligne avec l'id le plus petit, on supprime les autres.
DELETE FROM relationships a
USING relationships b
WHERE a.id > b.id
  AND a.person1_id = b.person1_id
  AND a.person2_id = b.person2_id
  AND a.type       = b.type;

-- ─── 2. Pour les relations symétriques (mariage, union, fratrie),
--    supprimer les doublons inversés (A↔B et B↔A représentent la même union)
DELETE FROM relationships a
USING relationships b
WHERE a.id > b.id
  AND a.type IN ('mariage', 'union', 'fratrie')
  AND a.type = b.type
  AND a.person1_id = b.person2_id
  AND a.person2_id = b.person1_id;

-- ─── 3. Contrainte UNIQUE sur le triplet (p1, p2, type)
ALTER TABLE relationships
  DROP CONSTRAINT IF EXISTS relationships_unique_triple;

ALTER TABLE relationships
  ADD CONSTRAINT relationships_unique_triple
  UNIQUE (person1_id, person2_id, type);
