# Clinic ERP

Application de gestion de clinique : réception et dossiers patients, consultations, pharmacie, bloc opératoire, caisse et administration, avec un accès par rôle.

**Stack :** React 19, Vite, Tailwind CSS, Supabase (auth et base de données), déploiement sur Vercel.

## Démarrer en local

1. Copier `.env.example` en `.env` et renseigner l'URL et la clé `anon` du projet Supabase.
2. `npm install`
3. `npm run dev`

## Base de données

Exécuter une fois [supabase/securite.sql](supabase/securite.sql) dans le SQL Editor de Supabase. Il active les règles RLS par rôle, génère le code patient unique et crée la fonction `stats_admin()` du tableau de bord.

## Rôles

| Rôle | Espace |
|---|---|
| `admin` | `/admin` (accès à tout) |
| `reception` | `/reception` |
| `medecin` | `/consultation` |
| `pharmacien` | `/pharmacie` |
| `chirurgien` | `/bloc` |
| `caisse` | `/caisse` |

## Déploiement

Vercel, avec les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les paramètres du projet. Le fichier `vercel.json` renvoie toutes les adresses vers l'application pour éviter les 404 au rechargement.
