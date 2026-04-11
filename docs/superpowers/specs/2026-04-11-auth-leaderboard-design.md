# Auth Google OAuth + Leaderboard — Design Spec

**Date** : 2026-04-11  
**Projet** : KeyTap  
**Branche** : dev  

---

## Résumé

Ajouter une authentification Google OAuth via Supabase et un leaderboard global accessible depuis la page principale. Les utilisateurs connectés voient leur meilleur WPM soumis automatiquement au classement après chaque test.

---

## Périmètre

- Auth Google OAuth uniquement (pas d'email/password)
- Leaderboard global (toutes configurations confondues)
- Lecture publique sans login
- Accès via bouton dans le header → modal overlay
- Soumission automatique du meilleur WPM si connecté

Hors périmètre : leaderboard par mode/durée, auth email/password, profil utilisateur dédié.

---

## Architecture

### Approche retenue

`@supabase/ssr` avec `createBrowserClient` pour la gestion des sessions en cookies. Remplace le client anon existant pour les opérations auth. Le client Realtime existant (`src/lib/supabase.ts`) reste pour les features battle/duel.

### Nouveaux fichiers

```
src/
├── lib/
│   ├── supabase-browser.ts       # createBrowserClient singleton
│   └── leaderboard.ts            # fetchLeaderboard(), upsertScore()
├── contexts/
│   └── auth-context.tsx          # AuthProvider + useAuth() hook
├── components/
│   ├── auth-button.tsx           # Bouton Login/Avatar + Logout
│   └── leaderboard-modal.tsx     # Modal + tableau classement
├── app/
│   └── auth/
│       └── callback/
│           └── route.ts          # Échange code OAuth → session cookie
supabase/
└── migrations/
    └── 006_leaderboard.sql       # Table leaderboard + RLS
middleware.ts                     # Refresh automatique de la session
```

---

## Base de données

### Table `leaderboard`

```sql
CREATE TABLE leaderboard (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url   text,
  best_wpm     integer NOT NULL,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read"
  ON leaderboard FOR SELECT USING (true);

CREATE POLICY "owner insert"
  ON leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner update"
  ON leaderboard FOR UPDATE
  USING (auth.uid() = user_id);
```

### Clés étrangères

`user_id` référence `auth.users(id)` avec `ON DELETE CASCADE` — si un user supprime son compte, son score est retiré du classement.

---

## Auth

### Flux OAuth

1. Clic sur "Sign in with Google"
2. `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })`
3. Google redirige vers `/auth/callback?code=...`
4. La route API échange le code contre une session et redirige vers `/`
5. Le middleware rafraîchit le cookie à chaque requête
6. `AuthContext` écoute `onAuthStateChange` et expose `user`

### Route callback

`src/app/auth/callback/route.ts` — appelle `supabase.auth.exchangeCodeForSession(code)` puis redirige vers `/`.

### Middleware

`middleware.ts` — utilise `createServerClient` depuis `@supabase/ssr` pour lire et réécrire les cookies de session à chaque requête. Ne bloque aucune route (pas de protection, tout est public).

---

## Leaderboard

### `src/lib/leaderboard.ts`

```typescript
// Retourne les 50 meilleurs scores triés par best_wpm DESC
fetchLeaderboard(): Promise<LeaderboardEntry[]>

// Insert ou update le score si wpm > best_wpm existant
upsertScore(userId: string, displayName: string, avatarUrl: string, wpm: number): Promise<void>
```

`upsertScore` utilise `INSERT ... ON CONFLICT (user_id) DO UPDATE SET best_wpm = EXCLUDED.best_wpm WHERE leaderboard.best_wpm < EXCLUDED.best_wpm` pour n'écrire que si c'est un nouveau record.

### Types

```typescript
interface LeaderboardEntry {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  best_wpm: number
  updated_at: string
}
```

---

## Composants UI

### `auth-button.tsx`

- Déconnecté : bouton discret "Sign in with Google" (icône Google + texte)
- Connecté : avatar circulaire (img depuis `user.user_metadata.avatar_url`) + prénom + bouton logout discret
- Utilise `useAuth()` du contexte

### `leaderboard-modal.tsx`

- Toujours accessible (lecture publique)
- Overlay fond `bg-black/50`, carte centrée style zinc cohérent avec l'app
- Tableau : `#` · Avatar · Nom · WPM
- Top 50, trié `best_wpm DESC`
- La ligne de l'utilisateur connecté est mise en évidence avec `var(--theme-accent)`
- Fermable par `Escape` ou clic backdrop
- État de chargement (skeleton) et état vide ("Aucun score pour l'instant")

### Header (`src/app/page.tsx`)

Le header existant (logo + "KeyTap") est modifié :

```
[Logo] KeyTap                    [🏆 Leaderboard] [Auth Button]
```

---

## Auto-submit

Dans `src/app/page.tsx`, l'`useEffect` existant qui appelle `saveResult()` est étendu :

```typescript
if (typing.isFinished && !resultsSavedRef.current) {
  resultsSavedRef.current = true;
  const r = typing.getResults();
  saveResult({ ... });                    // localStorage existant — inchangé

  if (user) {                             // nouveau
    await upsertScore(
      user.id,
      user.user_metadata.full_name ?? user.email ?? 'Anonymous',
      user.user_metadata.avatar_url ?? null,
      r.wpm
    );
  }
}
```

`upsertScore` n'écrit en base que si `wpm > best_wpm` (géré côté SQL par le `WHERE` dans l'upsert).

---

## Sécurité

- La clé anon Supabase est publique par design — les RLS protègent les données
- Un utilisateur ne peut modifier que son propre score (policy `owner update` via `auth.uid()`)
- Les variables `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` doivent être dans `.env.local` (les valeurs hardcodées actuelles dans `supabase.ts` sont à migrer)

---

## Plan d'installation

1. `npm install @supabase/ssr`
2. Créer `.env.local` avec les clés Supabase
3. Ajouter la migration `006_leaderboard.sql`
4. Configurer Google OAuth dans le dashboard Supabase (Authorized redirect URI : `https://keytap.app/auth/callback`)
5. Créer `middleware.ts`
6. Créer `supabase-browser.ts`
7. Créer `auth-context.tsx` + wrapper dans `layout.tsx`
8. Créer `auth-button.tsx` et `leaderboard-modal.tsx`
9. Créer `src/app/auth/callback/route.ts`
10. Créer `src/lib/leaderboard.ts`
11. Modifier le header et l'`useEffect` dans `page.tsx`
