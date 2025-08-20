// frontend/src/hooks/useAuth.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * ===== API BASE =====
 * Gunakan NEXT_PUBLIC_API_BASE (contoh: https://backend-arkwork-production.up.railway.app)
 * Fallback ke NEXT_PUBLIC_API_URL jika project lama masih pakai nama itu.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  '';

function buildUrl(path: string) {
  if (!API_BASE) {
    // Biar gampang dilacak kalau env belum di-set
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn(
        '[useAuth] NEXT_PUBLIC_API_BASE tidak ter-set. Set di Vercel > Settings > Environment Variables.'
      );
    }
  }
  return `${API_BASE}${path}`;
}

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

async function api<T = any>(
  path: string,
  init?: RequestInit & { json?: any; ok404?: boolean }
): Promise<T> {
  const res = await fetch(buildUrl(path), {
    method: init?.method || (init?.json ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    credentials: 'include', // penting untuk cookie JWT
    body: init?.json ? JSON.stringify(init.json) : undefined,
  });

  if (init?.ok404 && res.status === 404) {
    // @ts-expect-error permissive untuk kasus khusus
    return null;
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      msg = j?.message || j?.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  if (res.status === 204) {
    // @ts-expect-error: nolak return void
    return null;
  }

  return res.json();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserLite | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session
  useEffect(() => {
    (async () => {
      try {
        const me = await api<UserLite>('/auth/me');
        setUser(me);
      } catch (e: any) {
        // kalau user gagal (401/Invalid), coba admin
        try {
          const adm = await api<any>('/admin/me');
          const mapped: UserLite = {
            id: adm?.id ?? `admin:${adm?.username ?? 'unknown'}`,
            email: adm?.email ?? `${adm?.username ?? 'admin'}@local`,
            name: adm?.username ?? 'Admin',
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

  // Login
  const signin: AuthCtx['signin'] = async (identifier, password) => {
    if (identifier.includes('@')) {
      // user
      const u = await api<UserLite>('/auth/signin', {
        json: { email: identifier, password },
      });
      setUser(u);
      return u;
    } else {
      // admin (username)
      const a = await api<any>('/admin/signin', {
        json: { username: identifier, password },
      });
      const mapped: UserLite = {
        id: a?.id ?? `admin:${a?.username ?? identifier}`,
        email: a?.email ?? `${a?.username ?? identifier}@local`,
        name: a?.username ?? 'Admin',
        role: 'admin',
      };
      setUser(mapped);
      return mapped;
    }
  };

  // Signup user
  const signup: AuthCtx['signup'] = async (name, email, password) => {
    const u = await api<UserLite>('/auth/signup', {
      json: { name, email, password },
    });
    setUser(u);
    return u;
  };

  // Optional: signup perusahaan (ubah path sesuai backend kalau berbeda)
  const signupCompany: AuthCtx['signupCompany'] = async (payload) => {
    await api('/companies/signup', { json: payload });
  };

  // Signout (coba keduanya)
  const signout = async () => {
    try {
      await api('/auth/signout', { method: 'POST' });
    } catch {}
    try {
      await api('/admin/signout', { method: 'POST' });
    } catch {}
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
