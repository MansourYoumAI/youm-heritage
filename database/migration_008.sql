-- ============================================================
-- Migration 008 : Titre royal affiché sur la carte
--
-- Ajoute une colonne `royal_title` (court) directement sur persons.
-- C'est ce qui apparait sous le prénom dans le composant PersonNode
-- quand `is_royal = true` (Damel du Cayor, Teigne du Baol, etc.).
--
-- On garde aussi la table `titles` (plus riche) pour le futur, mais pour
-- l'affichage rapide dans l'arbre on utilise ce champ simple.
-- ============================================================

ALTER TABLE persons
  ADD COLUMN IF NOT EXISTS royal_title TEXT;

-- ─── Lignée Cayor / Baol / Djolof (migration_007) ─────────────
UPDATE persons SET royal_title = 'Lamane du Dialaw'
  WHERE first_name = 'Lamane Ndiogen Mor' AND last_name = 'Fall';

UPDATE persons SET royal_title = 'Damel du Cayor'
  WHERE first_name = 'Damel Dethié Fou Ndiogou' AND last_name = 'Fall';

UPDATE persons SET royal_title = 'Teigne du Baol'
  WHERE first_name = 'Teigne Niokhor' AND last_name = 'Ndiaye';

UPDATE persons SET royal_title = 'Linguère du Baol'
  WHERE first_name = 'Linguère Sobel' AND last_name = 'Diouf';

UPDATE persons SET royal_title = 'Princesse Sebère'
  WHERE first_name = 'Ngoné Sobel' AND last_name = 'Ndiaye';

UPDATE persons SET royal_title = 'Damel-Teigne du Cayor-Baol'
  WHERE first_name = 'Damel-Teigne Amary Ngoné Sobel' AND last_name = 'Fall';

UPDATE persons SET royal_title = 'Chef Almoravide'
  WHERE first_name = 'Abou Bakr Ben Omar' AND last_name = 'Abou Dardai';

UPDATE persons SET royal_title = 'Princesse Apoulhar'
  WHERE first_name = 'Fatoumata' AND last_name = 'Fall';

UPDATE persons SET royal_title = 'Bourba Djolof'
  WHERE first_name = 'Ndiadiane' AND last_name = 'Ndiaye';

-- ─── Lignée WANE (Fouta-Toro) ─────────────────────────────────
UPDATE persons SET royal_title = 'Almany du Fouta-Toro'
  WHERE first_name = 'Almany Diamadou Birame' AND last_name = 'Wane';

UPDATE persons SET royal_title = 'Lamane de Ntalou'
  WHERE first_name = 'Ngagne' AND last_name = 'Diouf';

DO $$
BEGIN
  RAISE NOTICE 'Colonne royal_title ajoutée et 11 titres royaux peuplés.';
END $$;
