import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  /** Actual role from DB */
  actualRole: AppRole | null;
  /** Effective role used for UI permission gating (developer may simulate other roles) */
  effectiveRole: AppRole | null;
  /** Set the simulated role. Only takes effect when actual role is developer. Pass null to reset. */
  viewAsRole: AppRole | null;
  setViewAsRole: (role: AppRole | null) => void;
  isAdmin: boolean;
  isBookkeeper: boolean;
  isDeveloper: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const VIEW_AS_STORAGE_KEY = "mer:viewAsRole";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("name, email, role")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data ? (data as Profile) : null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setViewAsRole(null);
  };

  const actualRole = profile?.role ?? null;
  // Only developers can simulate other roles
  const effectiveRole: AppRole | null =
    actualRole === "developer" && viewAsRole ? viewAsRole : actualRole;

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading,
    actualRole,
    effectiveRole,
    viewAsRole: actualRole === "developer" ? viewAsRole : null,
    setViewAsRole,
    // Developer has full admin access in addition to its own role
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
