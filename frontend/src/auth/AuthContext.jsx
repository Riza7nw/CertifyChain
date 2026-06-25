// src/auth/AuthContext.jsx
// State auth multi-tenant. Access token disimpan di MEMORY (bukan localStorage)
// -> lebih aman dari XSS. Saat reload, sesi dipulihkan via refresh-token cookie
// httpOnly (POST /v1/auth/refresh). apiFetch otomatis refresh saat 401.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// fetch dasar (selalu kirim cookie). Mengembalikan { res, body }.
async function raw(path, options = {}) {
  const isFD = options.body instanceof FormData;
  const res = await fetch(BASE + path, {
    credentials: "include",
    ...options,
    headers: { ...(isFD ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* tanpa body JSON */
  }
  return { res, body };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [loading, setLoading] = useState(true); // bootstrapping sesi
  const tokenRef = useRef(null); // access token (memory)

  const applySession = useCallback((token, userData) => {
    tokenRef.current = token;
    setUser(userData);
    const orgs = userData?.memberships || [];
    setCurrentOrgId((prev) => (prev && orgs.some((m) => m.orgId === prev) ? prev : orgs[0]?.orgId ?? null));
  }, []);

  const fetchMe = useCallback(async (token) => {
    const { res, body } = await raw("/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? body.data : null;
  }, []);

  const refresh = useCallback(async () => {
    const { res, body } = await raw("/v1/auth/refresh", { method: "POST", body: "{}" });
    return res.ok && body?.data?.accessToken ? body.data.accessToken : null;
  }, []);

  // Bootstrap saat mount: coba pulihkan sesi dari cookie refresh.
  useEffect(() => {
    (async () => {
      const t = await refresh();
      if (t) {
        const me = await fetchMe(t);
        if (me) applySession(t, me);
      }
      setLoading(false);
    })();
  }, [refresh, fetchMe, applySession]);

  const login = useCallback(
    async (email, password) => {
      const { res, body } = await raw("/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      if (!res.ok) throw new Error(body?.error?.message || "Login gagal.");
      const me = await fetchMe(body.data.accessToken);
      applySession(body.data.accessToken, me);
    },
    [fetchMe, applySession]
  );

  const register = useCallback(
    async (payload) => {
      const { res, body } = await raw("/v1/auth/register", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(body?.error?.message || "Registrasi gagal.");
      const me = await fetchMe(body.data.accessToken);
      applySession(body.data.accessToken, me);
    },
    [fetchMe, applySession]
  );

  const logout = useCallback(async () => {
    try {
      await raw("/v1/auth/logout", { method: "POST", body: "{}" });
    } catch {
      /* abaikan */
    }
    tokenRef.current = null;
    setUser(null);
    setCurrentOrgId(null);
  }, []);

  // Fetch terautentikasi: lampirkan Bearer, auto-refresh sekali saat 401,
  // normalisasi error backend { success:false, error:{message} }.
  const apiFetch = useCallback(
    async (path, options = {}) => {
      const isFD = options.body instanceof FormData;
      const call = (token) =>
        fetch(BASE + path, {
          credentials: "include",
          ...options,
          headers: {
            ...(isFD ? {} : { "Content-Type": "application/json" }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
          },
        });

      let res;
      try {
        res = await call(tokenRef.current);
      } catch {
        throw new Error("Tidak dapat terhubung ke server backend.");
      }

      if (res.status === 401) {
        const nt = await refresh();
        if (nt) {
          tokenRef.current = nt;
          try {
            res = await call(nt);
          } catch {
            throw new Error("Tidak dapat terhubung ke server backend.");
          }
        }
      }

      let body = null;
      try {
        body = await res.json();
      } catch {
        /* ignore */
      }

      if (res.status === 401) {
        tokenRef.current = null;
        setUser(null);
        const e = new Error(body?.error?.message || "Sesi berakhir. Silakan login lagi.");
        e.status = 401;
        throw e;
      }
      if (!res.ok || (body && body.success === false)) {
        const e = new Error(body?.error?.message || `Permintaan gagal (HTTP ${res.status}).`);
        e.status = res.status;
        e.code = body?.error?.code;
        throw e;
      }
      return body?.data;
    },
    [refresh]
  );

  // Unduh file terlindungi (mis. sertifikat 7c). Sama seperti apiFetch (auth +
  // auto-refresh sekali saat 401), tapi mengembalikan Blob (bukan JSON).
  const apiBlob = useCallback(
    async (path) => {
      const call = (token) =>
        fetch(BASE + path, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      let res;
      try {
        res = await call(tokenRef.current);
      } catch {
        throw new Error("Tidak dapat terhubung ke server backend.");
      }
      if (res.status === 401) {
        const nt = await refresh();
        if (nt) {
          tokenRef.current = nt;
          try {
            res = await call(nt);
          } catch {
            throw new Error("Tidak dapat terhubung ke server backend.");
          }
        }
      }
      if (!res.ok) {
        let body = null;
        try {
          body = await res.json();
        } catch {
          /* bukan JSON */
        }
        const e = new Error(body?.error?.message || `Unduhan gagal (HTTP ${res.status}).`);
        e.status = res.status;
        e.code = body?.error?.code;
        throw e;
      }
      return res.blob();
    },
    [refresh]
  );

  const memberships = user?.memberships || [];
  const value = {
    loading,
    user,
    isAuthenticated: !!user,
    isPlatformAdmin: !!user?.isPlatformAdmin,
    emailVerified: !!user?.emailVerified,
    memberships,
    currentOrgId,
    setCurrentOrgId,
    currentOrg: memberships.find((m) => m.orgId === currentOrgId) || null,
    login,
    register,
    logout,
    apiFetch,
    apiBlob,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
