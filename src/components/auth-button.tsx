"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

type FormMode = "signin" | "signup";

export function AuthButton() {
  const { user, signIn, signUp, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openModal() {
    setError(null);
    setEmail("");
    setPassword("");
    setMode("signin");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === "signin" ? signIn : signUp;
    const err = await fn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setOpen(false);
    }
  }

  if (user) {
    const initial = (user.email ?? "?")[0].toUpperCase();
    const displayName = user.email?.split("@")[0] ?? "user";

    return (
      <div className="flex items-center gap-2">
        <div className="w-[22px] h-[22px] rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-300">
          {initial}
        </div>
        <span className="text-xs font-mono text-zinc-400">{displayName}</span>
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
    <>
      <button
        onClick={openModal}
        className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        sign in
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={modalRef}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-80 flex flex-col gap-4"
          >
            <div className="flex gap-4 text-xs font-mono">
              <button
                onClick={() => { setMode("signin"); setError(null); }}
                className={mode === "signin" ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-400 transition-colors"}
              >
                sign in
              </button>
              <button
                onClick={() => { setMode("signup"); setError(null); }}
                className={mode === "signup" ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-400 transition-colors"}
              >
                sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
              />

              {error && (
                <p className="text-xs font-mono text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-100 text-xs font-mono rounded px-3 py-2 transition-colors"
              >
                {loading ? "..." : mode === "signin" ? "sign in" : "sign up"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
