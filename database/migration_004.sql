-- ============================================================
-- Migration 004 : Générer des ancêtres TBD pour tester le layout pédigree
-- - Youm : gen 3 binaire + gens 4 à 10 linéaires (1 seul parent par personne)
-- - Gueye : gens 2 à 4 binaires
-- ============================================================
-- Le script supprime d'abord les TBD déjà présents puis les recrée,
-- donc on peut le ré-exécuter sans risque de doublons.
-- ============================================================

-- ─── Nettoyage des TBD existants
DELETE FROM persons WHERE first_name = 'TBD' AND last_name IN ('Youm', 'Gueye');

-- ─── YOUM : gen 3 binaire (8 nouveaux) puis gens 4 à 10 linéaires (8 chaque)
DO $$
DECLARE
  current_gen UUID[];
  next_gen UUID[];
  parent_id UUID;
  father_id UUID;
  mother_id UUID;
  gen INTEGER;
BEGIN
  -- Gen de départ : les "test" Youm existants (= gen 2 par rapport à Malick)
  SELECT ARRAY_AGG(id) INTO current_gen
  FROM persons
  WHERE first_name = 'test' AND last_name = 'Youm';

  IF current_gen IS NULL OR ARRAY_LENGTH(current_gen, 1) = 0 THEN
    RAISE NOTICE 'Aucun "test" Youm trouvé. Ajoute les grands-parents de Malick d''abord.';
    RETURN;
  END IF;

  -- Gen 3 : binaire (chaque test Youm reçoit un père + une mère)
  next_gen := ARRAY[]::UUID[];
  FOREACH parent_id IN ARRAY current_gen LOOP
    INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('TBD', 'Youm', 'homme', false) RETURNING id INTO father_id;

    INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('TBD', 'Youm', 'femme', false) RETURNING id INTO mother_id;

    INSERT INTO relationships (person1_id, person2_id, type) VALUES
      (father_id, parent_id, 'parent-enfant'),
      (mother_id, parent_id, 'parent-enfant'),
      (father_id, mother_id, 'mariage');

    next_gen := next_gen || father_id || mother_id;
  END LOOP;
  current_gen := next_gen;
  RAISE NOTICE 'Youm gen 3 (binaire) : % personnes', ARRAY_LENGTH(current_gen, 1);

  -- Gens 4 à 10 : linéaire (1 seul parent — toujours le père — par personne)
  FOR gen IN 4..10 LOOP
    next_gen := ARRAY[]::UUID[];
    FOREACH parent_id IN ARRAY current_gen LOOP
      INSERT INTO persons (first_name, last_name, gender, is_living)
      VALUES ('TBD', 'Youm', 'homme', false) RETURNING id INTO father_id;

      INSERT INTO relationships (person1_id, person2_id, type) VALUES
        (father_id, parent_id, 'parent-enfant');

      next_gen := next_gen || father_id;
    END LOOP;
    current_gen := next_gen;
    RAISE NOTICE 'Youm gen % (linéaire) : % personnes', gen, ARRAY_LENGTH(current_gen, 1);
  END LOOP;
END $$;

-- ─── GUEYE : gens 2 à 4 binaires au-dessus d'Awa et Ibou Gueye
DO $$
DECLARE
  current_gen UUID[];
  next_gen UUID[];
  parent_id UUID;
  father_id UUID;
  mother_id UUID;
  gen INTEGER;
BEGIN
  SELECT ARRAY_AGG(id) INTO current_gen
  FROM persons
  WHERE last_name = 'Gueye'
    AND first_name IN ('Awa', 'Ibou');

  IF current_gen IS NULL OR ARRAY_LENGTH(current_gen, 1) = 0 THEN
    RAISE NOTICE 'Aucun Awa/Ibou Gueye trouvé. Ajoute-les comme parents de Fatou d''abord.';
    RETURN;
  END IF;

  FOR gen IN 2..4 LOOP
    next_gen := ARRAY[]::UUID[];
    FOREACH parent_id IN ARRAY current_gen LOOP
      INSERT INTO persons (first_name, last_name, gender, is_living)
      VALUES ('TBD', 'Gueye', 'homme', false) RETURNING id INTO father_id;

      INSERT INTO persons (first_name, last_name, gender, is_living)
      VALUES ('TBD', 'Gueye', 'femme', false) RETURNING id INTO mother_id;

      INSERT INTO relationships (person1_id, person2_id, type) VALUES
        (father_id, parent_id, 'parent-enfant'),
        (mother_id, parent_id, 'parent-enfant'),
        (father_id, mother_id, 'mariage');

      next_gen := next_gen || father_id || mother_id;
    END LOOP;
    current_gen := next_gen;
    RAISE NOTICE 'Gueye gen % (binaire) : % personnes', gen, ARRAY_LENGTH(current_gen, 1);
  END LOOP;
END $$;
