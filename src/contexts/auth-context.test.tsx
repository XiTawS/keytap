import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth-context";
import type { User } from "@supabase/supabase-js";

const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
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

  it("calls signInWithPassword and returns null on success", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    let authUtils: { signIn: (e: string, p: string) => Promise<string | null> } | null = null;

    function Capture() {
      const { signIn } = useAuth();
      authUtils = { signIn };
      return null;
    }

    await act(async () => {
      render(<AuthProvider><Capture /></AuthProvider>);
    });

    let result: string | null = "not-called";
    await act(async () => {
      result = await authUtils!.signIn("alice@example.com", "secret");
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "alice@example.com",
      password: "secret",
    });
    expect(result).toBeNull();
  });

  it("returns error message from signIn on failure", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    let authUtils: { signIn: (e: string, p: string) => Promise<string | null> } | null = null;

    function Capture() {
      const { signIn } = useAuth();
      authUtils = { signIn };
      return null;
    }

    await act(async () => {
      render(<AuthProvider><Capture /></AuthProvider>);
    });

    let result: string | null = null;
    await act(async () => {
      result = await authUtils!.signIn("alice@example.com", "wrong");
    });

    expect(result).toBe("Invalid credentials");
  });

  it("calls supabase.auth.signOut on signOut", async () => {
    mockSignOut.mockResolvedValue({});
    let authUtils: { signOut: () => Promise<void> } | null = null;

    function Capture() {
      const { signOut } = useAuth();
      authUtils = { signOut };
      return null;
    }

    await act(async () => {
      render(<AuthProvider><Capture /></AuthProvider>);
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
