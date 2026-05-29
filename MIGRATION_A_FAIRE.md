# À faire dans Supabase pour cette mise à jour

## 1. Exécuter la migration SQL

Dans Supabase → **SQL Editor** → **New query** :

Copier-coller le contenu de [`database/migration_001.sql`](database/migration_001.sql) → **Run**

Cela ajoute :
- Le champ `whatsapp_number` aux personnes
- Le champ `birth_place_other` aux personnes
- La nouvelle table `souvenirs`

## 2. Créer un nouveau bucket Storage

Dans Supabase → **Storage** → **New bucket** :

- Nom : `souvenirs`
- **Public** : oui

## 3. Relancer le serveur de dev

```powershell
npm run dev
```

## Récapitulatif des changements

| Avant | Maintenant |
|-------|------------|
| Page d'accueil = présentation | Page d'accueil = arbre directement |
| 8 vues dans la nav | Une seule vue (l'arbre) |
| Admin avec 4 onglets | Une seule page d'ajout / une seule page de modification |
| Nœud d'arbre : rond + nom tronqué | Nœud carré arrondi + prénom et nom visibles |
| Pas de WhatsApp | Champ WhatsApp pour les vivants |
| Pas de souvenirs | Section Souvenirs sur chaque profil (texte + image + audio) |
| Lieux libres | Liste : 8 villes Sénégal + Thionville + Paris + Autre |
| Couronne via toggle dynastie | Question discrète "afficher couronne ?" |
| Header chargé | Header minimal (logo + bouton Ajouter) |
