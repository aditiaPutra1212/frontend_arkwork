'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Role = 'admin' | 'user';

export type UserLite = {
  id: string;
  email: string;
  name?: string | null;
  photoUrl?: string | null;
  cvUrl?: string | null;
  role?: Role;
};

export type SignupCompanyPayload = {
  companyName: string;
  email: string;
  password: string;
  website?: string;
};

export type AuthCtx = {
  user: UserLite | null;
  loading: boolean;

  signin: (identifier: string, password: string) => Promise<UserLite>;
  signup: (name: string, email: string, password: string) => Promise<UserLite>;
  signout: () => Promise<void>;

  signupCompany?: (payload: SignupCompanyPayload) => Promise<void>;
  social?: (provider: 'google', intent?: 'signin' | 'signup') => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserLite | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    (async () => {
      try {
        const me: UserLite = await api('/auth/me', { timeoutMs: 12000 });
        setUser(me);
      } catch {
        try {
          // fallback admin
          const adm = await api('/admin/me', { timeoutMs: 12000 });
          const mapped: UserLite = {
            id: adm?.id || `admin:${adm?.username || 'unknown'}`,
            email: adm?.email || `${adm?.username || 'admin'}@local`,
            name: adm?.username || 'Admin',
            role: 'admin',
          };
          setUser(mapped);
        } catch {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // email -> /auth/signin, selain itu -> /admin/signin
  const signin: AuthCtx['signin'] = async (identifier, password) => {
    if (identifier.includes('@')) {
      const u: UserLite = await api('/auth/signin', { json: { email: identifier, password } });
      setUser(u);
      return u;
    } else {
      const a = await api('/admin/signin', { json: { username: identifier, password } });
      const mapped: UserLite = {
        id: a?.id || `admin:${a?.username || identifier}`,
        email: a?.email || `${a?.username || identifier}@local`,
        name: a?.username || 'Admin',
        role: 'admin',
      };
      setUser(mapped);
      return mapped;
    }
  };

  const signup: AuthCtx['signup'] = async (name, email, password) => {
    const u: UserLite = await api('/auth/signup', { json: { name, email, password } });
    setUser(u);
    return u;
  };

  const signupCompany: AuthCtx['signupCompany'] = async (payload) => {
    await api('/companies/signup', { json: payload });
  };

  const signout = async () => {
    try { await api('/auth/signout', { method: 'POST', expectJson: false }); } catch {}
    try { await api('/admin/signout', { method: 'POST', expectJson: false }); } catch {}
    setUser(null);
  };

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      signin,
      signup,
      signout,
      signupCompany,
    }),
    [user, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
