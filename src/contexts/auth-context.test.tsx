import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
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

  afterEach(() => {
    cleanup();
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

  it("calls signInWithOAuth with google provider", async () => {
    let authUtils: { signInWithGoogle: () => Promise<void> } | null = null;

    function Capture() {
      const { signInWithGoogle } = useAuth();
      authUtils = { signInWithGoogle };
      return null;
    }

    await act(async () => {
      render(
        <AuthProvider>
          <Capture />
        </AuthProvider>
      );
    });

    await act(async () => {
      await authUtils!.signInWithGoogle();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });

  it("calls supabase.auth.signOut on signOut", async () => {
    let authUtils: { signOut: () => Promise<void> } | null = null;

    function Capture() {
      const { signOut } = useAuth();
      authUtils = { signOut };
      return null;
    }

    await act(async () => {
      render(
        <AuthProvider>
          <Capture />
        </AuthProvider>
      );
    });

    await act(async () => {
      await authUtils!.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });
});

describe("useAuth outside provider", () => {
  afterEach(() => {
    cleanup();
  });

  it("throws when used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAuth must be used within AuthProvider"
    );
    spy.mockRestore();
  });
});
