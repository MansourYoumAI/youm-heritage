# Famille Youm — Guide d'installation

## Prérequis
- Node.js 18+ installé
- Compte Supabase (gratuit) : https://supabase.com
- Compte Vercel ou Netlify pour le déploiement

---

## Étape 1 — Créer le projet Supabase

1. Aller sur https://supabase.com → **New Project**
2. Nommer le projet : `youm-heritage`
3. Choisir la région : **Europe West** (Frankfurt)
4. Créer un mot de passe fort pour la base de données

---

## Étape 2 — Initialiser la base de données

Dans Supabase → **SQL Editor** → **New query** :

1. Copier-coller le contenu de `database/schema.sql` → **Run**
2. Copier-coller le contenu de `database/seed.sql` → **Run**

---

## Étape 3 — Créer les buckets Storage

Dans Supabase → **Storage** → **New bucket** :

Créer ces 3 buckets (tous **publics**) :
- `profile-photos`
- `gallery`
- `audio`

---

## Étape 4 — Configurer les variables d'environnement

Dans Supabase → **Settings** → **API** :

Copier :
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

Éditer le fichier `.env.local` avec ces valeurs.

---

## Étape 5 — Lancer en développement

```bash
cd youm-heritage
npm install
npm run dev
```

Ouvrir http://localhost:3000
Mot de passe : **njaboot**

---

## Étape 6 — Déployer sur Vercel (recommandé)

```bash
npm install -g vercel
vercel
```

Ou via l'interface Vercel :
1. Importer le projet depuis GitHub
2. Ajouter les variables d'environnement dans **Settings → Environment Variables**
3. Déployer

---

## Déployer sur Netlify

Le fichier `netlify.toml` est déjà configuré.
1. Connecter le dépôt GitHub à Netlify
2. Ajouter les variables d'environnement dans **Site settings → Environment variables**
3. Déployer

---

## Changer le mot de passe

Dans `.env.local` (local) ou dans les variables d'environnement Vercel/Netlify :

```
SITE_PASSWORD=nouveau_mot_de_passe
```

---

## Structure des vues

| URL | Description |
|-----|-------------|
| `/` | Accueil — présentation de la famille |
| `/arbre` | Arbre généalogique interactif |
| `/profils` | Liste de tous les membres |
| `/profil/[id]` | Profil individuel complet |
| `/memoires` | Mémoires orales (enregistrements vocaux) |
| `/dynasties` | Lignées royales (Cayor, Baol) |
| `/galerie` | Galerie photos |
| `/admin` | Ajouter/modifier du contenu |
| `/connexion` | Page de connexion |
