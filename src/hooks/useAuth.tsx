/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "bookkeeper" | "developer";
export interface Profile {
  name: string;
  email: string;
  role: AppRole;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  actualRole: AppRole | null;
  effectiveRole: AppRole | null;
  viewAsRole: AppRole | null;
  setViewAsRole: (role: AppRole | null) => void;
  isAdmin: boolean;
  isBookkeeper: boolean;
  isDeveloper: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * DEMO AUTH
 * ---------
 * No real backend auth in this demo. A visitor "signs in" with the published
 * demo credentials (see LoginPage); that sets a localStorage flag which this
 * provider watches to grant a fully-populated demo admin session. This keeps
 * a realistic login experience while never touching a production Supabase.
 */
export const DEMO_LOGIN_KEY = "mer-demo-logged-in";
export const DEMO_AUTH_EVENT = "mer-demo-auth-changed";

const DEMO_PROFILE: Profile = {
  name: "Jordan Ellis",
  email: "demo@merdashboard.app",
  role: "admin",
};
const DEMO_USER = { id: "demo-user", email: DEMO_PROFILE.email } as unknown as User;
const DEMO_SESSION = { user: DEMO_USER } as unknown as Session;

const VIEW_AS_STORAGE_KEY = "mer:viewAsRole";

function readLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_LOGIN_KEY) === "true";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState<boolean>(readLoggedIn);
  const [viewAsRole, setViewAsRoleState] = useState<AppRole | null>(() => {
    if (typeof window === "undefined") return null;
    const v = window.localStorage.getItem(VIEW_AS_STORAGE_KEY);
    return v === "admin" || v === "bookkeeper" || v === "developer" ? v : null;
  });

  const setViewAsRole = (role: AppRole | null) => {
    setViewAsRoleState(role);
    if (typeof window !== "undefined") {
      if (role) window.localStorage.setItem(VIEW_AS_STORAGE_KEY, role);
      else window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
    }
  };

  useEffect(() => {
    const sync = () => setLoggedIn(readLoggedIn());
    window.addEventListener(DEMO_AUTH_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DEMO_AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const signOut = async () => {
    try {
      window.localStorage.removeItem(DEMO_LOGIN_KEY);
    } catch {
      /* ignore */
    }
    setLoggedIn(false);
    setViewAsRole(null);
    window.dispatchEvent(new Event(DEMO_AUTH_EVENT));
  };

  const profile = loggedIn ? DEMO_PROFILE : null;
  const actualRole = profile?.role ?? null;
  const effectiveRole: AppRole | null =
    actualRole === "developer" && viewAsRole ? viewAsRole : actualRole;

  const value: AuthContextValue = {
    user: loggedIn ? DEMO_USER : null,
    session: loggedIn ? DEMO_SESSION : null,
    profile,
    loading: false,
    actualRole,
    effectiveRole,
    viewAsRole: actualRole === "developer" ? viewAsRole : null,
    setViewAsRole,
    isAdmin: effectiveRole === "admin" || effectiveRole === "developer",
    isBookkeeper: effectiveRole === "bookkeeper",
    isDeveloper: effectiveRole === "developer",
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
