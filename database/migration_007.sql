-- ============================================================
-- Migration 007 (v3 - finale) : Ancêtres royaux de Babacar Youm
--
-- Lecture complète du tableau "Ascendance en ligne directe"
-- avec les nouvelles photos plus détaillées.
--
-- Deux points de connexion entre les lignées royales et la lignée moderne :
--   1. Yacoumba Ndègue DIOP → Fanta CISS (déjà dans migration_006)
--      → connecte la lignée Cayor/Baol/Djolof à la branche Lena DIOP
--   2. Ngagne Diouf → Koumbeth Ndaw Conagna (déjà dans migration_006)
--      → connecte la lignée WANE à la branche Daouine BOYE
--
-- Notes sur les noms :
--   - "Ndène DIOP" que j'avais lu était en fait du texte BARRÉ par l'auteur,
--     donc cette personne n'existe pas. C'est Yacoumba Ndègue DIOP.
--   - "Ngapathe NDIAYE & Boury Songhone" sont frère et sœur, et leur
--     mariage consanguin a produit Yacoumba Ndègue DIOP (pratique royale).
-- ============================================================

-- Nettoyage des données précédentes (v1 et v2 de migration_007)
DELETE FROM persons WHERE first_name IN (
  'Lamane Ndiogen Mor', 'Ngoné', 'Teigne Niokhor', 'Linguère Sobel',
  'Damel Dethié Fou Ndiogou', 'Ngoné Sobel', 'Damel-Teigne Amary Ngoné Sobel',
  'Abou Bakr Ben Omar', 'Fatoumata', 'Ndiadiane',
  'Thiakouly', 'Songhone', 'Ngapathe', 'Boury',
  'Ndène', 'Yacoumba Ndène', 'Yacoumba Ndègue', 'Ngagne',
  'Almany Diamadon Birame', 'Almany Diamadou Birame', 'Penda', 'Bineta'
) AND last_name IN (
  'Fall', 'Ndiaye', 'Diouf', 'Abou Dardai',
  'Ndiadiane', 'Diop', 'Songhone', 'Wane',
  'Nrengue de Ndakha Ndoye'
);

DO $$
DECLARE
  -- Lignée Cayor (Damels)
  lamane_id UUID; ngone_ndiaye_id UUID;
  teigne_niokhor_id UUID; linguere_sobel_id UUID;
  damel_dethie_id UUID; ngone_sobel_id UUID;
  damel_amary_id UUID;
  -- Lignée Djolof
  abou_bakr_id UUID; fatoumata_id UUID; ndiadiane_id UUID;
  -- Convergence
  thiakouly_id UUID; songhone_id UUID;
  ngapathe_id UUID; boury_id UUID;
  yacoumba_id UUID;
  -- Lignée WANE
  almany_id UUID; penda_id UUID; bineta_id UUID;
  ngagne_diouf_id UUID;
  -- Ancêtres existants (de migration_006)
  fanta_id UUID;
  koumbeth_id UUID;
BEGIN
  -- Vérifier que migration_006 a tourné
  SELECT id INTO fanta_id FROM persons
    WHERE first_name = 'Fanta' AND last_name = 'Ciss' LIMIT 1;
  SELECT id INTO koumbeth_id FROM persons
    WHERE first_name = 'Koumbeth Ndaw' AND last_name = 'Conagna' LIMIT 1;

  IF fanta_id IS NULL OR koumbeth_id IS NULL THEN
    RAISE NOTICE 'Migration_006 doit être exécutée d''abord (Fanta CISS ou Koumbeth Conagna introuvable)';
    RETURN;
  END IF;

  -- ─── LIGNÉE CAYOR (Damels) ───────────────────────────────
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Lamane Ndiogen Mor', 'Fall', 'homme', false, true)
    RETURNING id INTO lamane_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Ngoné', 'Ndiaye', 'femme', false, true)
    RETURNING id INTO ngone_ndiaye_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Damel Dethié Fou Ndiogou', 'Fall', 'homme', false, true,
            'Premier Damel du Cayor. Mort en 1593.')
    RETURNING id INTO damel_dethie_id;

  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (lamane_id, ngone_ndiaye_id, 'mariage'),
    (lamane_id, damel_dethie_id, 'parent-enfant'),
    (ngone_ndiaye_id, damel_dethie_id, 'parent-enfant');

  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Teigne Niokhor', 'Ndiaye', 'homme', false, true, 'Teigne du Baol.')
    RETURNING id INTO teigne_niokhor_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Linguère Sobel', 'Diouf', 'femme', false, true)
    RETURNING id INTO linguere_sobel_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Ngoné Sobel', 'Ndiaye', 'femme', false, true, 'Princesse Sebère.')
    RETURNING id INTO ngone_sobel_id;

  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (teigne_niokhor_id, linguere_sobel_id, 'mariage'),
    (teigne_niokhor_id, ngone_sobel_id, 'parent-enfant'),
    (linguere_sobel_id, ngone_sobel_id, 'parent-enfant');

  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Damel-Teigne Amary Ngoné Sobel', 'Fall', 'homme', false, true,
            'Damel du Cayor et Teigne du Baol.')
    RETURNING id INTO damel_amary_id;

  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (damel_dethie_id, ngone_sobel_id, 'mariage'),
    (damel_dethie_id, damel_amary_id, 'parent-enfant'),
    (ngone_sobel_id, damel_amary_id, 'parent-enfant');

  -- ─── LIGNÉE DJOLOF (Ndiadiane NDIAYE) ────────────────────
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Abou Bakr Ben Omar', 'Abou Dardai', 'homme', false, true,
            'Chef de guerre Almoravide.')
    RETURNING id INTO abou_bakr_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Fatoumata', 'Fall', 'femme', false, true, 'Princesse Apoulhar.')
    RETURNING id INTO fatoumata_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Ndiadiane', 'Ndiaye', 'homme', false, true,
            'Roi et fondateur de l''empire du Djolof, vers 1378.')
    RETURNING id INTO ndiadiane_id;

  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (abou_bakr_id, fatoumata_id, 'mariage'),
    (abou_bakr_id, ndiadiane_id, 'parent-enfant'),
    (fatoumata_id, ndiadiane_id, 'parent-enfant');

  -- ─── CONVERGENCE CAYOR + DJOLOF ──────────────────────────
  -- Damel-Teigne Amary → Songhone FALL (filiation directe, mère non précisée sur le tableau)
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Songhone', 'Fall', 'femme', false, true)
    RETURNING id INTO songhone_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (damel_amary_id, songhone_id, 'parent-enfant');

  -- Ndiadiane → Thiakouly Ndiadiane (filiation directe, mère non précisée sur le tableau)
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Thiakouly', 'Ndiadiane', 'homme', false, true)
    RETURNING id INTO thiakouly_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (ndiadiane_id, thiakouly_id, 'parent-enfant');

  -- Songhone FALL + Thiakouly → Ngapathe NDIAYE et Boury Songhone (frère et sœur)
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Ngapathe', 'Ndiaye', 'femme', false, true)
    RETURNING id INTO ngapathe_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Boury', 'Songhone', 'homme', false, true)
    RETURNING id INTO boury_id;

  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (songhone_id, thiakouly_id, 'mariage'),
    (songhone_id, ngapathe_id, 'parent-enfant'),
    (thiakouly_id, ngapathe_id, 'parent-enfant'),
    (songhone_id, boury_id, 'parent-enfant'),
    (thiakouly_id, boury_id, 'parent-enfant');

  -- Ngapathe + Boury (mariage consanguin frère/sœur) → Yacoumba Ndègue DIOP
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Yacoumba Ndègue', 'Diop', 'femme', false, true)
    RETURNING id INTO yacoumba_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (ngapathe_id, boury_id, 'mariage'),
    (ngapathe_id, yacoumba_id, 'parent-enfant'),
    (boury_id, yacoumba_id, 'parent-enfant');

  -- ─── CONNEXION 1 : Yacoumba → Fanta CISS (lignée maternelle Lena DIOP) ───
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (yacoumba_id, fanta_id, 'parent-enfant');

  -- ─── LIGNÉE WANE ─────────────────────────────────────────
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Almany Diamadou Birame', 'Wane', 'homme', false, true,
            'Almany (titre noble).')
    RETURNING id INTO almany_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Penda', 'Nrengue de Ndakha Ndoye', 'femme', false, true)
    RETURNING id INTO penda_id;
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal)
    VALUES ('Bineta', 'Wane', 'femme', false, true)
    RETURNING id INTO bineta_id;

  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (almany_id, penda_id, 'mariage'),
    (almany_id, bineta_id, 'parent-enfant'),
    (penda_id, bineta_id, 'parent-enfant');

  -- Bineta → Ngagne Diouf (Lamane de Ntalou)
  INSERT INTO persons (first_name, last_name, gender, is_living, is_royal, historical_notes)
    VALUES ('Ngagne', 'Diouf', 'homme', false, true, 'Lamane de Ntalou.')
    RETURNING id INTO ngagne_diouf_id;
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (bineta_id, ngagne_diouf_id, 'parent-enfant');

  -- ─── CONNEXION 2 : Ngagne Diouf → Koumbeth Ndaw Conagna (lignée Daouine BOYE) ───
  INSERT INTO relationships (person1_id, person2_id, type) VALUES
    (ngagne_diouf_id, koumbeth_id, 'parent-enfant');

  RAISE NOTICE '19 ancêtres royaux ajoutés (Cayor + Baol + Djolof + Wane). Lignée complète Babacar Youm.';
END $$;
