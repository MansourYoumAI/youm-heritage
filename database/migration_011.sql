-- ============================================================
-- Migration 011
--
-- 1. Nouveau type de relation : 'cousin' (pour les liens horizontaux
--    qui ne sont ni mariage ni parent-enfant)
-- 2. Ajout de Lat Dior Ngoné Latyr Diop, dernier Damel du Cayor
-- 3. Relation cousin : Lat Dior <-> Thieyacine Dior Gallo Gana
-- 4. Souvenirs historiques attestés (sans inventer)
-- ============================================================

-- ─── 1. Étendre la contrainte CHECK pour autoriser 'cousin'
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'relationships'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE relationships DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;

ALTER TABLE relationships ADD CONSTRAINT relationships_type_check
  CHECK (type IN ('parent-enfant', 'mariage', 'union', 'fratrie', 'cousin'));

-- ─── 2-4. Lat Dior + cousin + souvenirs
DO $$
DECLARE
  lat_dior_id UUID;
  thieyacine_id UUID;
BEGIN
  -- Cherche Thieyacine pour le lien cousin
  SELECT id INTO thieyacine_id FROM persons
    WHERE first_name = 'Thieyacine Dior Gallo Gana'
    LIMIT 1;

  -- Crée Lat Dior s'il n'existe pas déjà
  SELECT id INTO lat_dior_id FROM persons
    WHERE first_name = 'Lat Dior Ngoné Latyr' AND last_name = 'Diop'
    LIMIT 1;

  IF lat_dior_id IS NULL THEN
    INSERT INTO persons (
      first_name, last_name, gender, is_royal, royal_title,
      birth_date, death_date, birth_place, biography, historical_notes
    ) VALUES (
      'Lat Dior Ngoné Latyr', 'Diop', 'homme', true, 'Damel du Cayor',
      'vers 1842', '26 octobre 1886',
      'Keur Amadou Yalla, Cayor',
      'Lat Dior Ngoné Latyr Diop est le dernier Damel du Cayor, mort au combat face à la colonisation française. Cousin de Thieyacine Dior Gallo Gana, qui était l''héritier légitime du trône, Lat Dior accède finalement au pouvoir au terme de conflits de succession dynastique. Son nom reste indissociable de la résistance sénégalaise au colonialisme.',
      'Damel du Cayor de 1862 à 1864 (premier règne), puis de 1871 à 1882. Tué le 26 octobre 1886 à la bataille de Dékheulé contre les troupes françaises commandées par le colonel Henri Dodds. Sa résistance et sa fin tragique en font une figure majeure du panthéon historique sénégalais.'
    )
    RETURNING id INTO lat_dior_id;
  END IF;

  -- Crée la relation cousin
  IF thieyacine_id IS NOT NULL AND lat_dior_id IS NOT NULL THEN
    INSERT INTO relationships (person1_id, person2_id, type)
    SELECT lat_dior_id, thieyacine_id, 'cousin'
    WHERE NOT EXISTS (
      SELECT 1 FROM relationships
      WHERE type = 'cousin'
        AND ((person1_id = lat_dior_id AND person2_id = thieyacine_id)
          OR (person1_id = thieyacine_id AND person2_id = lat_dior_id))
    );
  END IF;

  -- Ajoute les souvenirs historiques (uniquement si Lat Dior n'en a pas déjà)
  IF lat_dior_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM souvenirs WHERE person_id = lat_dior_id
  ) THEN
    INSERT INTO souvenirs (person_id, title, detail, souvenir_date)
    VALUES
      (lat_dior_id,
       'Refus historique du chemin de fer',
       'En 1879, le Damel Lat Dior refuse formellement l''autorisation à la France de construire le chemin de fer Dakar Saint-Louis qui devait traverser le Cayor. Il déclare dans une lettre adressée au gouverneur Brière de l''Isle que tant qu''il vivra, il s''opposera de toutes ses forces à la construction de cette voie ferrée, considérant qu''elle est l''instrument de la colonisation de son royaume.',
       '1879'),
      (lat_dior_id,
       'Conversion à l''islam',
       'Vaincu par les Français à la bataille de Loro en 1864, Lat Dior trouve refuge auprès de Ma Ba Diakhou Bâ, marabout et chef religieux du Rip. C''est sous son influence qu''il se convertit à l''islam, marquant un tournant dans l''histoire religieuse du Cayor et faisant du royaume un État musulman.',
       '1864'),
      (lat_dior_id,
       'La légende du cheval Malaw',
       'La tradition orale célèbre Malaw, son cheval, comme l''un des plus rapides du Cayor. Les griots chantent encore son histoire et celle de son cavalier. Lat Dior et Malaw forment un duo légendaire dans la mémoire collective sénégalaise, symbole du courage et de la résistance.',
       'Tradition orale'),
      (lat_dior_id,
       'Fin héroïque à Dékheulé',
       'Le 26 octobre 1886, encerclé par les troupes françaises et avec sa cavalerie en infériorité numérique, Lat Dior tombe au combat à Dékheulé. C''est la fin du royaume du Cayor, annexé à la colonie du Sénégal. Selon la tradition, il choisit de mourir l''arme à la main plutôt que de se soumettre.',
       '26 octobre 1886');
  END IF;

  RAISE NOTICE 'Migration 011 OK : type cousin ajouté, Lat Dior intégré avec 4 souvenirs.';
END $$;
