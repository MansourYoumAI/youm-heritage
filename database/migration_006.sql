-- ============================================================
-- Migration 006 : Ancêtres réels de Babacar Youm
-- Source : tableau familial "Ascendance en ligne directe"
--
-- Cette migration :
--   1. Supprime tous les ancêtres placeholders (TBD Youm/Gueye + test Youm)
--   2. Ajoute les ancêtres directs de Babacar Youm sur 4-5 générations
--      (lignée paternelle Youm + lignée maternelle BOYE)
--
-- Les ancêtres royaux du haut du tableau (Damels du Cayor, Teignes du Baol,
-- Ndiadiane NDIAYE fondateur du Djolof, etc.) ne sont PAS ajoutés ici car
-- leurs connexions exactes avec la lignée BOYE/Youm sont difficiles à lire
-- depuis le scan. Vous pourrez les ajouter manuellement via les boutons +.
-- ============================================================

-- ─── 1. Nettoyage des placeholders
DELETE FROM persons WHERE first_name = 'TBD' AND last_name IN ('Youm', 'Gueye');
DELETE FROM persons WHERE first_name = 'test' AND last_name = 'Youm';

-- ─── 2. Ajout des ancêtres directs de Babacar Youm
DO $$
DECLARE
  babacar_id UUID;
  alestane_id UUID; daouine_id UUID;
  souleymane_id UUID; lena_id UUID;
  abdoulaye_boye_id UUID; ngor_fall_id UUID;
  soujane_id UUID; soumar_id UUID;
  fanta_id UUID;
  ngor_ndaw_boye_id UUID; koumbeth_id UUID;
  waly_id UUID;
BEGIN
  -- Identifier Babacar Youm (le focal du tableau)
  SELECT id INTO babacar_id FROM persons
    WHERE last_name = 'Youm'
    AND lower(first_name) LIKE 'babacar%'
    ORDER BY created_at LIMIT 1;

  IF babacar_id IS NULL THEN
    RAISE NOTICE 'Babacar Youm introuvable, ajout annulé';
    RETURN;
  END IF;

  -- ─── Gen 1 : parents de Babacar
  -- Alestane Youm + Daouine BOYE
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Alestane', 'Youm', 'homme', false) RETURNING id INTO alestane_id;
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Daouine', 'Boye', 'femme', false) RETURNING id INTO daouine_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (alestane_id, babacar_id, 'parent-enfant'),
    (daouine_id, babacar_id, 'parent-enfant'),
    (alestane_id, daouine_id, 'mariage');

  -- ─── Gen 2 (côté Youm) : parents d'Alestane
  -- Souleymane Youm + Lena DIOP
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Souleymane', 'Youm', 'homme', false) RETURNING id INTO souleymane_id;
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Lena', 'Diop', 'femme', false) RETURNING id INTO lena_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (souleymane_id, alestane_id, 'parent-enfant'),
    (lena_id, alestane_id, 'parent-enfant'),
    (souleymane_id, lena_id, 'mariage');

  -- ─── Gen 2 (côté BOYE) : parents de Daouine
  -- Abdoulaye BOYE + Ngor FALL
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Abdoulaye', 'Boye', 'homme', false) RETURNING id INTO abdoulaye_boye_id;
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Ngor', 'Fall', 'femme', false) RETURNING id INTO ngor_fall_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (abdoulaye_boye_id, daouine_id, 'parent-enfant'),
    (ngor_fall_id, daouine_id, 'parent-enfant'),
    (abdoulaye_boye_id, ngor_fall_id, 'mariage');

  -- ─── Gen 3 : parents de Souleymane
  -- Soujane Youm + Soumar BECK
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Soujane', 'Youm', 'homme', false) RETURNING id INTO soujane_id;
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Soumar', 'Beck', 'femme', false) RETURNING id INTO soumar_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (soujane_id, souleymane_id, 'parent-enfant'),
    (soumar_id, souleymane_id, 'parent-enfant'),
    (soujane_id, soumar_id, 'mariage');

  -- ─── Gen 3 : mère de Lena (Fanta CISS, seul parent visible sur le tableau)
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Fanta', 'Ciss', 'femme', false) RETURNING id INTO fanta_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (fanta_id, lena_id, 'parent-enfant');

  -- ─── Gen 3 : parents d'Abdoulaye BOYE
  -- Ngor Ndaw BOYE + Koumbeth Ndaw Conagna
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Ngor Ndaw', 'Boye', 'homme', false) RETURNING id INTO ngor_ndaw_boye_id;
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Koumbeth Ndaw', 'Conagna', 'femme', false) RETURNING id INTO koumbeth_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (ngor_ndaw_boye_id, abdoulaye_boye_id, 'parent-enfant'),
    (koumbeth_id, abdoulaye_boye_id, 'parent-enfant'),
    (ngor_ndaw_boye_id, koumbeth_id, 'mariage');

  -- ─── Gen 4 : père de Soujane (Waly Youm, seul parent visible sur le tableau)
  INSERT INTO persons (first_name, last_name, gender, is_living)
    VALUES ('Waly', 'Youm', 'homme', false) RETURNING id INTO waly_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (waly_id, soujane_id, 'parent-enfant');

  RAISE NOTICE 'Ancêtres directs de Babacar Youm ajoutés avec succès';
END $$;
