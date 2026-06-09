import { createContext, useContext, useState, ReactNode } from "react";
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

const DEMO_PROFILE: Profile = {
  name: "Jerick P. Salinas",
  email: "jerick@greenfieldbk.com",
  role: "admin",
};

const DEMO_USER = { id: "demo", email: "jerick@greenfieldbk.com" } as unknown as User;
const DEMO_SESSION = { user: DEMO_USER } as unknown as Session;


export function AuthProvider({ children }: { children: ReactNode }) {
  const [viewAsRole, setViewAsRole] = useState<AppRole | null>(null);

  const value: AuthContextValue = {
    user: DEMO_USER,
    session: DEMO_SESSION,
    profile: DEMO_PROFILE,
    loading: false,
    actualRole: "admin",
    effectiveRole: "admin",
    viewAsRole,
    setViewAsRole,
    isAdmin: true,
    isBookkeeper: false,
    isDeveloper: false,
    signOut: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
