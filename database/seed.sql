-- ============================================================
-- YOUM HERITAGE — Données initiales (seed)
-- Famille Youm — Racines sénégalaises, branches françaises
-- ============================================================

-- Dynasties
INSERT INTO dynasties (id, name, kingdom, description, period, color) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Damel du Cayor', 'Royaume de Cayor', 'Le Cayor fut l''un des royaumes les plus puissants de l''Afrique de l''Ouest, couvrant une grande partie du Sénégal actuel. Les Damel (rois) du Cayor ont résisté à la colonisation française jusqu''à la fin du XIXe siècle.', 'XIVe – XIXe siècle', 'gold'),
  ('a2000000-0000-0000-0000-000000000002', 'Teigne du Baol', 'Royaume de Baol', 'Le Baol fut un royaume wolof situé au centre du Sénégal actuel, gouverné par les Teigne (rois). Il entretint des liens étroits avec le Cayor et le Djolof.', 'XVe – XIXe siècle', 'gold');

-- Personnes — Ancêtres royaux (données à compléter selon l'histoire orale)
INSERT INTO persons (id, first_name, last_name, gender, birth_date, death_date, birth_place, biography, historical_notes, is_royal, dynasty_id, is_living, display_order) VALUES
  (
    'b1000000-0000-0000-0000-000000000001',
    'Lat Dior',
    'Diop',
    'homme',
    'vers 1842',
    '1886',
    'Cayor, Sénégal',
    'Lat Dior Ngoné Latyr Diop fut le dernier grand Damel (roi) du Cayor. Héros national sénégalais, il s''opposa avec courage à la domination française et à la construction du chemin de fer Dakar-Saint-Louis. Il mourut au combat le 27 octobre 1886 à Dekhle.',
    'Lat Dior est une figure centrale de la résistance africaine à la colonisation. Son nom est porté par de nombreuses institutions au Sénégal, dont le stade national de Dakar.',
    true,
    'a1000000-0000-0000-0000-000000000001',
    false,
    1
  ),
  (
    'b2000000-0000-0000-0000-000000000002',
    'Kocc',
    'Barma Fall',
    'homme',
    'vers 1586',
    'vers 1655',
    'Cayor, Sénégal',
    'Kocc Barma Fall est considéré comme le plus grand philosophe wolof. Ses proverbes et maximes continuent d''irriguer la culture sénégalaise. Certains récits le situent dans la lignée des Cayor.',
    'À compléter selon les récits de la famille — lien à confirmer par la tradition orale.',
    true,
    'a1000000-0000-0000-0000-000000000001',
    false,
    2
  );

-- Personnes — Génération des parents
INSERT INTO persons (id, first_name, last_name, maiden_name, gender, birth_place, biography, is_royal, is_living, display_order) VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'Malick',
    'Youm',
    NULL,
    'homme',
    'Sénégal',
    'Père de la famille Youm. Pilier de la famille, il incarne les valeurs de dignité et de transmission qui ont guidé ses enfants.',
    false,
    true,
    10
  ),
  (
    'c2000000-0000-0000-0000-000000000002',
    'Fatou Binetou',
    'Youm',
    'Gueye',
    'femme',
    'Sénégal',
    'Mère de la famille Youm, née Gueye. Gardienne de la mémoire familiale et des traditions sénégalaises, elle est le cœur de la famille.',
    false,
    true,
    11
  );

-- Personnes — Génération des enfants
INSERT INTO persons (id, first_name, last_name, gender, birth_place, biography, is_royal, is_living, display_order) VALUES
  (
    'd1000000-0000-0000-0000-000000000001',
    'Babacar',
    'Youm',
    'homme',
    'Sénégal',
    'Fils aîné de Malick et Fatou Binetou Youm.',
    false,
    true,
    20
  ),
  (
    'd2000000-0000-0000-0000-000000000002',
    'Mansour',
    'Youm',
    'homme',
    'France',
    'Né en France, Mansour Youm porte en lui deux cultures : la rigueur et la modernité françaises, et la profondeur de l''héritage sénégalais. Fondateur de cette archive familiale.',
    false,
    true,
    21
  ),
  (
    'd3000000-0000-0000-0000-000000000003',
    'Moussa',
    'Youm',
    'homme',
    'France',
    'Né en France, Moussa Youm est le frère cadet de Mansour. Il grandit entre deux cultures, portant fièrement l''héritage familial.',
    false,
    true,
    22
  );

-- Titres
INSERT INTO titles (person_id, title, dynasty_id, period) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Damel du Cayor', 'a1000000-0000-0000-0000-000000000001', '1862 – 1886');

-- Relations — Mariage Malick + Fatou Binetou
INSERT INTO relationships (person1_id, person2_id, type) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000002', 'mariage');

-- Relations — Enfants de Malick
INSERT INTO relationships (person1_id, person2_id, type) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'parent-enfant'),
  ('c1000000-0000-0000-0000-000000000001', 'd2000000-0000-0000-0000-000000000002', 'parent-enfant'),
  ('c1000000-0000-0000-0000-000000000001', 'd3000000-0000-0000-0000-000000000003', 'parent-enfant');

-- Relations — Enfants de Fatou Binetou
INSERT INTO relationships (person1_id, person2_id, type) VALUES
  ('c2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'parent-enfant'),
  ('c2000000-0000-0000-0000-000000000002', 'd2000000-0000-0000-0000-000000000002', 'parent-enfant'),
  ('c2000000-0000-0000-0000-000000000002', 'd3000000-0000-0000-0000-000000000003', 'parent-enfant');
