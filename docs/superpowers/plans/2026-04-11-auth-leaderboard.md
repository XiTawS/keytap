# Auth Google OAuth + Leaderboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth login via Supabase and a global WPM leaderboard accessible from a modal in the main page header.

**Architecture:** `@supabase/ssr` `createBrowserClient` handles auth with cookie-based sessions. A `leaderboard` Supabase table stores one record per user (best WPM only). `AuthContext` wraps the app in `layout.tsx`. Auto-submission fires after every test when the user is logged in. `proxy.ts` (Next.js 16 session refresh middleware) keeps cookies fresh.

**Tech Stack:** `@supabase/ssr`, Supabase Auth (Google OAuth), Next.js 16.2.1 App Router, React 19, TypeScript, Tailwind CSS 4, Vitest + jsdom

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `.env.local` | Create | Supabase URL + anon key |
| `next.config.ts` | Modify | Allow `lh3.googleusercontent.com` for `next/image` |
| `src/lib/supabase.ts` | Modify | Read credentials from env vars |
| `src/lib/supabase-browser.ts` | Create | `createBrowserClient` singleton factory |
| `supabase/migrations/006_leaderboard.sql` | Create | Table + RLS policies |
| `src/lib/leaderboard.ts` | Create | `fetchLeaderboard()`, `upsertScore()` |
| `src/lib/leaderboard.test.ts` | Create | Unit tests for leaderboard functions |
| `src/app/auth/callback/route.ts` | Create | Exchange OAuth code → session cookie |
| `proxy.ts` | Create | Session refresh (Next.js 16 middleware) |
| `src/contexts/auth-context.tsx` | Create | `AuthProvider`, `useAuth()` |
| `src/components/auth-button.tsx` | Create | Google login/logout button |
| `src/components/leaderboard-modal.tsx` | Create | Leaderboard modal overlay |
| `src/app/layout.tsx` | Modify | Wrap children with `AuthProvider` |
| `src/app/page.tsx` | Modify | Header buttons + auto-submit score |

---

## Task 1: Setup — install package, env vars, next.config.ts

**Files:**
- Create: `.env.local`
- Modify: `next.config.ts`
- Modify: `src/lib/supabase.ts`

- [ ] **Step 1: Install @supabase/ssr**

```bash
npm install @supabase/ssr
```

Expected output: `added 1 package` (or similar — no errors).

- [ ] **Step 2: Create .env.local**

Create `.env.local` at project root. Get the values from the Supabase dashboard → Project Settings → API.

```
NEXT_PUBLIC_SUPABASE_URL=https://rguzkjesipcopdhwuadv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndXpramVzaXBjb3BkaHd1YWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTUxODgsImV4cCI6MjA4OTc3MTE4OH0.049KXiibJ-J6ojBnCbJR01HSJlreFEiOjGf48XOSs_E
```

- [ ] **Step 3: Update src/lib/supabase.ts to read from env**

Replace the hardcoded strings with env vars:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 4: Update next.config.ts to allow Google avatar images**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 5: Verify dev server still starts**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000`, no TypeScript or module errors in the console.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.local next.config.ts src/lib/supabase.ts
git commit -m "feat: install @supabase/ssr, move credentials to env vars"
```

> Note: `.env.local` is gitignored by default. Confirm with `git status` before committing — it should NOT appear in the staged files. If it does, add `.env.local` to `.gitignore` first.

---

## Task 2: Create supabase-browser.ts

**Files:**
- Create: `src/lib/supabase-browser.ts`

- [ ] **Step 1: Create the browser client factory**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

This factory returns a new client on each call — callers that need a stable reference should store the result (e.g., in a `useMemo` or module-level variable inside a context).

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase-browser.ts
git commit -m "feat: add supabase browser client factory"
```

---

## Task 3: Supabase migration — leaderboard table

**Files:**
- Create: `supabase/migrations/006_leaderboard.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Leaderboard: one record per user, stores personal best WPM

CREATE TABLE leaderboard (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url   text,
  best_wpm     integer NOT NULL,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Anyone can read the leaderboard (no login required)
CREATE POLICY "public read"
  ON leaderboard FOR SELECT
  USING (true);

-- Only the owner can insert their own score
CREATE POLICY "owner insert"
  ON leaderboard FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their own score
CREATE POLICY "owner update"
  ON leaderboard FOR UPDATE
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Apply the migration in the Supabase dashboard**

Go to Supabase dashboard → SQL Editor → paste the file content → Run.

Verify: Table Editor should show a new `leaderboard` table with 6 columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/006_leaderboard.sql
git commit -m "feat: add leaderboard table migration with RLS"
```

---

## Task 4: leaderboard.ts — TDD

**Files:**
- Create: `src/lib/leaderboard.ts`
- Create: `src/lib/leaderboard.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/leaderboard.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// We import the functions under test — they don't exist yet, so tests will fail
import { fetchLeaderboard, upsertScore, type LeaderboardEntry } from "./leaderboard";

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    id: "entry-1",
    user_id: "user-1",
    display_name: "Alice",
    avatar_url: "https://lh3.googleusercontent.com/alice.jpg",
    best_wpm: 120,
    updated_at: "2026-04-11T00:00:00.000Z",
    ...overrides,
  };
}

function makeChain(resolvedValue: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = ["select", "order", "limit", "upsert", "eq", "maybeSingle"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  // The terminal call resolves
  chain["limit"] = vi.fn().mockResolvedValue(resolvedValue);
  chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
  chain["upsert"] = vi.fn().mockResolvedValue({ error: null });
  chain["select"] = vi.fn().mockReturnValue(chain);
  chain["order"] = vi.fn().mockReturnValue(chain);
  chain["eq"] = vi.fn().mockReturnValue(chain);
  return chain;
}

describe("fetchLeaderboard", () => {
  it("queries leaderboard ordered by best_wpm desc, limit 50", async () => {
    const entries = [makeEntry(), makeEntry({ user_id: "user-2", best_wpm: 90 })];
    const chain = makeChain({ data: entries, error: null });
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    const result = await fetchLeaderboard(client);

    expect(client.from).toHaveBeenCalledWith("leaderboard");
    expect(chain.select).toHaveBeenCalledWith("*");
    expect(chain.order).toHaveBeenCalledWith("best_wpm", { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(result).toEqual(entries);
  });

  it("throws when supabase returns an error", async () => {
    const chain = makeChain({ data: null, error: new Error("DB error") });
    const client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;

    await expect(fetchLeaderboard(client)).rejects.toThrow("DB error");
  });
});

describe("upsertScore", () => {
  let client: SupabaseClient;
  let chain: ReturnType<typeof makeChain>;

  beforeEach(() => {
    chain = makeChain({ data: null, error: null });
    client = { from: vi.fn().mockReturnValue(chain) } as unknown as SupabaseClient;
  });

  it("does nothing when new wpm is not better than existing best", async () => {
    // Existing record: best_wpm = 130
    chain["maybeSingle"] = vi.fn().mockResolvedValue({
      data: { best_wpm: 130 },
      error: null,
    });

    await upsertScore("user-1", "Alice", null, 120, client);

    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it("upserts when wpm is better than existing best", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({
      data: { best_wpm: 100 },
      error: null,
    });

    await upsertScore("user-1", "Alice", "https://avatar.url", 120, client);

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", best_wpm: 120 }),
      { onConflict: "user_id" }
    );
  });

  it("upserts when user has no existing score", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });

    await upsertScore("user-1", "Alice", null, 85, client);

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", best_wpm: 85 }),
      { onConflict: "user_id" }
    );
  });

  it("throws when upsert returns an error", async () => {
    chain["maybeSingle"] = vi.fn().mockResolvedValue({ data: null, error: null });
    chain["upsert"] = vi.fn().mockResolvedValue({ error: new Error("Write failed") });

    await expect(upsertScore("user-1", "Alice", null, 85, client)).rejects.toThrow("Write failed");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/leaderboard.test.ts
```

Expected: `Cannot find module './leaderboard'` or similar import error. Tests must fail at this point.

- [ ] **Step 3: Create src/lib/leaderboard.ts**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./supabase-browser";

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  best_wpm: number;
  updated_at: string;
}

export async function fetchLeaderboard(
  client?: SupabaseClient
): Promise<LeaderboardEntry[]> {
  const supabase = client ?? createClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("best_wpm", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as LeaderboardEntry[];
}

export async function upsertScore(
  userId: string,
  displayName: string,
  avatarUrl: string | null,
  wpm: number,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? createClient();

  // Check current personal best — only write if this is a new record
  const { data: existing } = await supabase
    .from("leaderboard")
    .select("best_wpm")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing && wpm <= existing.best_wpm) return;

  const { error } = await supabase.from("leaderboard").upsert(
    {
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      best_wpm: wpm,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/leaderboard.test.ts
```

Expected: all 6 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/leaderboard.ts src/lib/leaderboard.test.ts
git commit -m "feat: add leaderboard lib with fetchLeaderboard and upsertScore"
```

---

## Task 5: Auth callback route

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create the OAuth code exchange handler**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(origin);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: add OAuth callback route for Supabase session exchange"
```

---

## Task 6: proxy.ts — session refresh middleware

**Files:**
- Create: `proxy.ts` (project root, same level as `package.json`)

> **Note:** Next.js 16 uses `proxy.ts` instead of `middleware.ts`. If for any reason your setup requires `middleware.ts`, rename accordingly — the code is identical.

- [ ] **Step 1: Create proxy.ts**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the session without blocking the request
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 2: Verify dev server restarts without errors**

```bash
npm run dev
```

Expected: no errors about middleware/proxy configuration in the console.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat: add proxy.ts for Supabase session refresh"
```

---

## Task 7: auth-context.tsx — TDD

**Files:**
- Create: `src/contexts/auth-context.tsx`

> The auth context depends on the Supabase browser client. We test the context behaviour by mocking `@/lib/supabase-browser`.

- [ ] **Step 1: Write failing tests**

Create `src/contexts/auth-context.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";
import type { User } from "@supabase/supabase-js";

// Mock the browser client factory
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  }),
}));

function TestConsumer() {
  const { user } = useAuth();
  return <div data-testid="user">{user ? user.email : "no-user"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("provides null user when not authenticated", async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId("user").textContent).toBe("no-user");
  });

  it("provides user when authenticated", async () => {
    const fakeUser = { id: "u1", email: "alice@example.com" } as User;
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );
    });

    expect(screen.getByTestId("user").textContent).toBe("alice@example.com");
  });
});

describe("useAuth outside provider", () => {
  it("throws when used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within AuthProvider"
    );
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/contexts/auth-context.test.tsx
```

Expected: `Cannot find module './auth-context'`.

- [ ] **Step 3: Create src/contexts/auth-context.tsx**

```typescript
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

interface AuthContextValue {
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/contexts/auth-context.test.tsx
```

Expected: 3 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/contexts/auth-context.tsx src/contexts/auth-context.test.tsx
git commit -m "feat: add AuthContext with Google OAuth and useAuth hook"
```

---

## Task 8: auth-button.tsx

**Files:**
- Create: `src/components/auth-button.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";

export function AuthButton() {
  const { user, signInWithGoogle, signOut } = useAuth();

  if (user) {
    const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
    const fullName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "User";
    const firstName = fullName.split(" ")[0];

    return (
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={firstName}
            width={22}
            height={22}
            className="rounded-full"
          />
        ) : (
          <div className="w-[22px] h-[22px] rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-300">
            {firstName[0].toUpperCase()}
          </div>
        )}
        <span className="text-xs font-mono text-zinc-400">{firstName}</span>
        <button
          onClick={signOut}
          className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      <GoogleIcon />
      sign in
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/auth-button.tsx
git commit -m "feat: add AuthButton component with Google login/logout"
```

---

## Task 9: leaderboard-modal.tsx

**Files:**
- Create: `src/components/leaderboard-modal.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchLeaderboard()
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs font-mono font-semibold text-zinc-400 tracking-widest uppercase">
            Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="text-[10px] font-mono text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            esc
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-9 bg-zinc-900 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-zinc-600 text-xs font-mono text-center py-10">
            No scores yet. Be the first!
          </p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {entries.map((entry, i) => {
              const isCurrentUser = user?.id === entry.user_id;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                    isCurrentUser
                      ? "bg-[var(--theme-accent)]/10 border border-[var(--theme-accent)]/20"
                      : "hover:bg-zinc-900/60"
                  }`}
                >
                  <span className="w-4 text-right text-zinc-600 shrink-0">
                    {i + 1}
                  </span>
                  {entry.avatar_url ? (
                    <Image
                      src={entry.avatar_url}
                      alt={entry.display_name}
                      width={20}
                      height={20}
                      className="rounded-full shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-800 shrink-0" />
                  )}
                  <span
                    className={`flex-1 truncate ${
                      isCurrentUser
                        ? "text-[var(--theme-accent)]"
                        : "text-zinc-400"
                    }`}
                  >
                    {entry.display_name}
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      isCurrentUser
                        ? "text-[var(--theme-accent)]"
                        : "text-zinc-200"
                    }`}
                  >
                    {entry.best_wpm}
                    <span className="text-zinc-600 font-normal ml-1 text-[10px]">
                      wpm
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer hint */}
        {!user && (
          <p className="mt-4 text-[10px] font-mono text-zinc-700 text-center">
            Sign in to submit your score
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/leaderboard-modal.tsx
git commit -m "feat: add LeaderboardModal component"
```

---

## Task 10: Update layout.tsx — add AuthProvider

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Wrap children with AuthProvider**

In `src/app/layout.tsx`, add the import and wrap `{children}` with `<AuthProvider>`:

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/settings-context";
import { AuthProvider } from "@/contexts/auth-context";

// ... (font declarations and metadata stay unchanged)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-dvh overflow-hidden antialiased`}
      suppressHydrationWarning
    >
      <body className="h-dvh overflow-hidden flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-[var(--theme-accent)]/20 transition-colors duration-200">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({ /* unchanged */ }) }}
        />
        <SettingsProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <a
            href="https://x.com/_XiTawS"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-3 right-4 text-xs text-zinc-500 hover:text-zinc-300 transition-colors z-50 font-mono"
          >
            Made by @XiTawS
          </a>
        </SettingsProvider>
      </body>
    </html>
  );
}
```

> Keep all existing imports, font declarations, and metadata unchanged. Only add the `AuthProvider` import and wrapper.

- [ ] **Step 2: Verify the app still loads**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. The app should load normally with no console errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wrap app with AuthProvider"
```

---

## Task 11: Update page.tsx — header + auto-submit

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports at the top of src/app/page.tsx**

Add these three lines to the existing import block:

```typescript
import { useAuth } from "@/contexts/auth-context";
import { AuthButton } from "@/components/auth-button";
import { LeaderboardModal } from "@/components/leaderboard-modal";
import { upsertScore } from "@/lib/leaderboard";
```

- [ ] **Step 2: Add state and auth hook inside the Home component**

After the existing `const { settings } = useSettings();` line, add:

```typescript
const { user } = useAuth();
const [leaderboardOpen, setLeaderboardOpen] = useState(false);
```

- [ ] **Step 3: Extend the save-results useEffect to auto-submit score**

Replace the existing `useEffect` that calls `saveResult` with this extended version:

```typescript
useEffect(() => {
  if (typing.isFinished && !resultsSavedRef.current) {
    resultsSavedRef.current = true;
    const r = typing.getResults();
    saveResult({
      wpm: r.wpm,
      rawWpm: r.rawWpm,
      accuracy: r.accuracy,
      correctChars: r.correctChars,
      incorrectChars: r.incorrectChars,
      extraChars: r.extraChars,
      missedChars: r.missedChars,
      totalTime: r.totalTime,
      mode,
      timeLimit,
      language,
      date: new Date().toISOString(),
      correctWords: r.correctWords,
      totalWords: r.totalWords,
    });

    if (user) {
      const displayName =
        (user.user_metadata?.full_name as string | undefined) ??
        user.email ??
        "Anonymous";
      const avatarUrl =
        (user.user_metadata?.avatar_url as string | undefined) ?? null;
      upsertScore(user.id, displayName, avatarUrl, r.wpm).catch(() => {
        // Score submission failed silently — does not interrupt the UX
      });
    }
  }
}, [typing.isFinished]);
```

- [ ] **Step 4: Update the header JSX**

Replace the existing header block (the `<div className="w-full px-6 pt-2 pb-0 shrink-0">` at the top of the returned JSX) with:

```tsx
<div className="w-full px-6 pt-2 pb-0 shrink-0">
  <div className="flex items-center justify-between">
    {/* Logo */}
    <div className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--theme-accent)]">
        <rect x="2" y="6" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
        <rect x="5" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
        <rect x="9" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
        <rect x="13" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
        <rect x="17" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
        <rect x="7" y="13" width="2" height="2" rx="0.5" fill="currentColor"/>
        <rect x="11" y="13" width="2" height="2" rx="0.5" fill="currentColor"/>
        <rect x="15" y="13" width="2" height="2" rx="0.5" fill="currentColor"/>
        <rect x="8" y="17" width="8" height="1.5" rx="0.75" fill="currentColor"/>
      </svg>
      <span className="text-lg font-bold tracking-tight text-zinc-800 dark:text-zinc-200">KeyTap</span>
    </div>

    {/* Right side controls */}
    <div className="flex items-center gap-4">
      <button
        onClick={() => setLeaderboardOpen(true)}
        className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        leaderboard
      </button>
      <AuthButton />
    </div>
  </div>
</div>
```

- [ ] **Step 5: Add the LeaderboardModal just before the closing `</div>` of the root element**

At the very end of the returned JSX, before the final `</div>`:

```tsx
<LeaderboardModal
  isOpen={leaderboardOpen}
  onClose={() => setLeaderboardOpen(false)}
/>
```

- [ ] **Step 6: Run the full test suite**

```bash
npx vitest run
```

Expected: all existing tests + the new leaderboard and auth-context tests pass.

- [ ] **Step 7: Manual smoke test**

Start the dev server and verify:
1. Header shows "leaderboard" button and "sign in" button
2. Clicking "leaderboard" opens the modal
3. Modal closes with Escape or backdrop click
4. Clicking "sign in" redirects to Google OAuth
5. After OAuth, the header shows the user avatar and name
6. Completing a typing test while logged in does not throw a console error

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add leaderboard button, auth button, and auto-submit score to page"
```

---

## Task 12: Configure Google OAuth in Supabase dashboard

This task has no code — it's a one-time configuration in the Supabase dashboard.

- [ ] **Step 1: Enable Google provider**

In Supabase dashboard → Authentication → Providers → Google:
- Toggle **Enable Sign in with Google** ON
- Paste your **Google Client ID** and **Google Client Secret**
  (Create these at [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client IDs)

- [ ] **Step 2: Add authorized redirect URI in Google Cloud Console**

In Google Cloud Console → OAuth client → Authorized redirect URIs, add:

```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

Replace `<your-supabase-project-ref>` with `rguzkjesipcopdhwuadv`.

For local development also add:
```
http://localhost:3000/auth/callback
```

- [ ] **Step 3: Final end-to-end test**

1. `npm run dev`
2. Click "sign in" → redirected to Google → after login, back to `localhost:3000`
3. Header shows avatar and first name
4. Complete a typing test → score auto-submits (check Supabase Table Editor → leaderboard)
5. Open Leaderboard modal → your score appears, highlighted in accent color

---

## Post-implementation checklist

- [ ] `.env.local` is NOT committed to git (`git status` shows it as untracked/gitignored)
- [ ] All `npx vitest run` tests pass
- [ ] `npm run build` completes without TypeScript errors
- [ ] Google OAuth flow works end-to-end in dev
- [ ] Leaderboard is readable without being logged in
- [ ] Score only updates in Supabase when it is a new personal best
