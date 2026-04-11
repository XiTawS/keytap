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
