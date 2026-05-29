-- ============================================================
-- Migration 009 : Pages royaumes éditables + souvenirs de royaume
--
-- 1. Table `kingdoms` : tout le contenu des pages /cayor /baol
--    /fouta-toro est désormais persisté en base et éditable depuis
--    l'interface (protégé par mot de passe côté API).
--
-- 2. Souvenirs liés à un royaume : on ajoute une colonne
--    `kingdom_slug` à `souvenirs` et on rend `person_id` nullable
--    pour qu'un souvenir puisse être attaché à un royaume au lieu
--    d'une personne.
-- ============================================================

-- ─── 1. Table kingdoms ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS kingdoms (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  period TEXT NOT NULL,
  location TEXT NOT NULL,
  emblem TEXT NOT NULL DEFAULT '👑',
  tldr TEXT NOT NULL,
  key_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  map_image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kingdoms ENABLE ROW LEVEL SECURITY;

-- Lecture publique (la session est gérée par middleware Next)
DROP POLICY IF EXISTS "kingdoms_read_all" ON kingdoms;
CREATE POLICY "kingdoms_read_all" ON kingdoms
  FOR SELECT USING (true);

-- ─── 2. Souvenirs de royaume ─────────────────────────────────
ALTER TABLE souvenirs
  ADD COLUMN IF NOT EXISTS kingdom_slug TEXT REFERENCES kingdoms(slug) ON DELETE CASCADE;

ALTER TABLE souvenirs
  ALTER COLUMN person_id DROP NOT NULL;

-- Un souvenir est rattaché soit à une personne soit à un royaume,
-- mais au moins l'un des deux doit être renseigné.
ALTER TABLE souvenirs DROP CONSTRAINT IF EXISTS souvenirs_target_required;
ALTER TABLE souvenirs ADD CONSTRAINT souvenirs_target_required
  CHECK (person_id IS NOT NULL OR kingdom_slug IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_souvenirs_kingdom ON souvenirs(kingdom_slug);

-- ─── 3. Seed initial des 3 royaumes ──────────────────────────
INSERT INTO kingdoms (slug, name, period, location, emblem, tldr, key_facts, details)
VALUES
(
  'cayor',
  'Royaume du Cayor',
  '1549 – 1886',
  'Côte ouest du Sénégal, entre Saint-Louis et le Cap-Vert',
  '👑',
  'Royaume wolof côtier né en 1549 de la sécession d''une province de l''empire du Djolof. Dirigé par le Damel, élu, il prospère pendant trois siècles sur la traite atlantique avant de tomber face à la France en 1886 à la mort de Lat-Dior Diop.',
  '[
    {"label": "Fondation", "value": "1549 — bataille de Danki"},
    {"label": "Titre du souverain", "value": "Damel"},
    {"label": "Capitales", "value": "Mboul puis Maka"},
    {"label": "Fin", "value": "1886 — bataille de Dékheulé"}
  ]'::jsonb,
  '[
    {"title": "La sécession du Djolof (1549)", "body": "Vers 1549, Amary Ngoné Sobel Fall, jeune prince du Cayor, défait son suzerain le Bourba Djolof Lélé Foulli Fak à la bataille de Danki. Le Cayor cesse alors de payer tribut à l''empire et devient indépendant. Amary Ngoné devient le premier Damel-Teigne, régnant à la fois sur le Cayor et sur le Baol."},
    {"title": "Le Damel et son conseil", "body": "Le souverain porte le titre de Damel. Il est élu à vie par six grands dignitaires (le Diawdine Bour, le Diawdine Mbeul, le Botal, le Badé, le Diaraf et le Sergne Fakh-Tall) parmi les princes des matriclans royaux Guelwar, Sogno, Wagadou et Dorobé. La succession est strictement matrilinéaire : on hérite du sang de sa mère."},
    {"title": "Territoire et économie", "body": "Le Cayor s''étend sur environ 700 km le long de l''Atlantique, de Saint-Louis jusqu''au Cap-Vert. Il vit de l''agriculture (mil, sorgho puis arachide au XIXe), de la pêche et surtout de la traite atlantique à partir du XVIIe siècle (esclaves, gomme arabique, or, cuir) avec les comptoirs européens de Saint-Louis et de Gorée."},
    {"title": "Résistance à la colonisation", "body": "Au XIXe siècle, le Cayor résiste durablement à l''expansion française. Le Damel Lat-Dior Diop, converti à l''islam, mène la résistance et s''oppose notamment au projet de chemin de fer Dakar–Saint-Louis. Il meurt au combat le 26 octobre 1886 à Dékheulé, marquant la fin du royaume."}
  ]'::jsonb
),
(
  'baol',
  'Royaume du Baol',
  'XIVᵉ siècle – 1895',
  'Centre-ouest du Sénégal, autour de Diourbel et Mbacké',
  '🏛️',
  'Royaume wolof-sérère du centre du Sénégal, frère jumeau du Cayor avec lequel il fut souvent uni sous un même Damel-Teigne. Gouverné par le Teigne, il est annexé par la France en 1895 après la défaite et la mort du dernier Teigne Tanor Gogne Dieng.',
  '[
    {"label": "Origine", "value": "Province du Djolof — XIVᵉ s."},
    {"label": "Titre du souverain", "value": "Teigne"},
    {"label": "Capitales", "value": "Lambaye, Diakhao"},
    {"label": "Fin", "value": "1895 — protectorat français"}
  ]'::jsonb,
  '[
    {"title": "Naissance d''une province autonome", "body": "Le Baol émerge à la fin du XIVe siècle comme province du vaste empire du Djolof. Peuplé de Wolofs au nord et de Sérères au sud, il acquiert progressivement son autonomie, puis son indépendance complète après la bataille de Danki (1549) qui voit le Cayor et le Baol se séparer du Djolof."},
    {"title": "Le Teigne et l''union Cayor-Baol", "body": "Le souverain porte le titre de Teigne. Comme au Cayor, la succession est matrilinéaire et l''élection se fait au sein des matriclans nobles. À plusieurs reprises, un seul homme cumule les deux trônes : c''est le Damel-Teigne, fonction inaugurée par Amary Ngoné Sobel Fall au XVIe siècle."},
    {"title": "Cœur agricole et islam", "body": "Le Baol est une terre de plateaux fertiles, cœur agricole du Sénégal (mil, sorgho, puis arachide). C''est aussi le berceau du mouridisme : le cheikh Ahmadou Bamba y fonde la confrérie en 1883 et la ville sainte de Touba en 1887, en pleine décomposition du royaume."},
    {"title": "La chute de 1895", "body": "Le 18 mai 1895, le dernier Teigne Tanor Gogne Dieng affronte les troupes françaises à la bataille de Gouye Maral. Il est tué et le royaume est annexé au protectorat français. Le Baol disparaît politiquement mais reste un référent identitaire fort, notamment via le mouridisme."}
  ]'::jsonb
),
(
  'fouta-toro',
  'Almamat du Fouta-Toro',
  '1776 – 1881',
  'Vallée du fleuve Sénégal, du nord du Sénégal au sud de la Mauritanie',
  '🕌',
  'État théocratique musulman fondé en 1776 par la révolution toorobé de Souleymane Bal, qui renverse la dynastie peule Deniyanké. Gouverné par l''Almami élu selon la charia, il s''étend le long du fleuve Sénégal et est annexé par la France en 1881.',
  '[
    {"label": "Fondation", "value": "1776 — Révolution toorobé"},
    {"label": "Titre du souverain", "value": "Almami"},
    {"label": "Capitales", "value": "Thilogne, puis Horndoldé"},
    {"label": "Fin", "value": "1881 — annexion française"}
  ]'::jsonb,
  '[
    {"title": "La révolution toorobé (1776)", "body": "En 1776, le marabout Souleymane Bal mène une révolution islamique contre la dynastie peule Deniyanké au pouvoir depuis 1526. Les Toorobé (lettrés musulmans halpulaar) instaurent un État théocratique régi par la charia. À la mort de Souleymane Bal en 1776, son disciple Abdoul Kader Kane devient le premier Almami élu."},
    {"title": "L''Almami et le Conseil des Anciens", "body": "Le souverain porte le titre d''Almami (de l''arabe Al-Imām, le guide). Il n''est pas héréditaire mais élu à vie par le Conseil des Anciens parmi les grandes familles toorobé. Le pouvoir est strictement encadré : l''Almami peut être déposé s''il s''écarte de la loi islamique."},
    {"title": "Territoire et peuples", "body": "Le Fouta-Toro s''étire sur plus de 400 km le long du fleuve Sénégal, des cataractes de Bakel à l''embouchure près de Saint-Louis. Il regroupe principalement des Halpulaar (Toucouleurs sédentaires et Peuls éleveurs), et joue un rôle central dans l''islamisation de l''Afrique de l''Ouest."},
    {"title": "El Hadj Oumar Tall et la fin", "body": "Le Fouta-Toro est le berceau d''El Hadj Oumar Tall, qui mène à partir de 1852 un grand djihad et fonde l''empire Toucouleur qui s''étend jusqu''au Niger. Affaibli par les guerres et la pression française, le royaume est annexé en 1881 par le gouverneur Louis Brière de l''Isle."}
  ]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- ─── 4. Bucket de stockage pour les cartes des royaumes ──────
-- (les souvenirs réutilisent le bucket existant 'souvenirs')
INSERT INTO storage.buckets (id, name, public)
VALUES ('kingdom-maps', 'kingdom-maps', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "kingdom_maps_read" ON storage.objects;
CREATE POLICY "kingdom_maps_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'kingdom-maps');

DROP POLICY IF EXISTS "kingdom_maps_write" ON storage.objects;
CREATE POLICY "kingdom_maps_write" ON storage.objects
  FOR ALL USING (bucket_id = 'kingdom-maps') WITH CHECK (bucket_id = 'kingdom-maps');

DO $$
BEGIN
  RAISE NOTICE 'Migration 009 OK : table kingdoms créée et seedée, souvenirs.kingdom_slug ajouté.';
END $$;
