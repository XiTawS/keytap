# KeyTap

KeyTap est un test de vitesse de frappe pour ordinateur, construit avec Next.js. Il mesure la vitesse (WPM), la précision et les erreurs, puis conserve l’historique local et, pour les utilisateurs connectés, les meilleurs scores dans Supabase.

L’application propose :

- des tests chronométrés de 15, 30, 60 ou 120 secondes ;
- un mode infini ;
- des mots en anglais et en français ;
- un clavier visuel et des statistiques en temps réel ;
- une connexion Google ;
- un leaderboard par mode et durée ;
- un mode Duel 1 contre 1 en temps réel ;
- un mode Battle Royale multijoueur.

L’interface nécessite un ordinateur équipé d’un clavier physique.

## Stack

- Next.js 16 avec App Router
- React 19 et TypeScript
- Tailwind CSS 4
- Supabase pour l’authentification, la persistance et le temps réel
- Vitest et Testing Library pour les tests

## Prérequis

- Node.js 20 ou supérieur
- npm
- un projet Supabase pour l’authentification et les fonctionnalités multijoueur

## Installation

```bash
git clone https://github.com/XiTawS/keytap.git
cd keytap
npm install
```

Créez ensuite un fichier `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

Ces variables sont nécessaires au client Supabase côté navigateur, au callback d’authentification et au rafraîchissement de session.

## Base de données et authentification

Les migrations SQL se trouvent dans [`supabase/migrations`](./supabase/migrations) :

- `004_duel_schema.sql` : tables et temps réel du mode Duel ;
- `005_battle_royale.sql` : tables et temps réel du mode Battle Royale ;
- `006_leaderboard.sql` : scores personnels et règles d’accès ;
- `007_leaderboard_modes.sql` : scores distincts par mode et durée.

Appliquez ces migrations à votre projet Supabase dans l’ordre, via le SQL Editor ou la Supabase CLI.

Pour activer la connexion Google :

1. activez le provider Google dans Supabase Auth ;
2. configurez les identifiants OAuth Google ;
3. ajoutez `http://localhost:3000/auth/callback` aux URLs de redirection autorisées ;
4. ajoutez l’URL de callback de votre déploiement en production.

Les données d’authentification et les clés ne doivent pas être commités. Le fichier `.env.local` est ignoré par Git.

## Développement

Lancer le serveur local :

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Commandes disponibles :

```bash
npm run dev       # serveur de développement
npm run lint      # vérification ESLint
npm run build     # build de production
npm run start     # serveur de production après build
npx vitest run    # exécution des tests
```

## Routes principales

| Route | Fonction |
| --- | --- |
| `/` | Test solo, réglages, historique et leaderboard |
| `/duel` | Création ou participation à un duel 1v1 |
| `/battle` | Partie Battle Royale multijoueur |
| `/auth/callback` | Callback OAuth Supabase |

## Structure du projet

```text
src/
├── app/          # routes et layouts Next.js
├── components/   # composants d’interface
├── contexts/     # authentification et préférences
├── data/         # listes de mots anglais/français
├── hooks/        # logique du test de frappe
└── lib/          # Supabase, leaderboard, historique et modes multijoueur
supabase/
└── migrations/   # schéma et politiques Supabase
public/           # ressources statiques
```

## Déploiement

Le projet peut être déployé sur Vercel ou toute plateforme compatible avec Next.js. Configurez les deux variables Supabase dans l’environnement de déploiement, appliquez les migrations et ajoutez l’URL de callback OAuth correspondante dans Supabase.

Avant une mise en production :

```bash
npm run lint
npx vitest run
npm run build
```

## Licence

Aucune licence open source n’est actuellement déclarée dans le dépôt.
