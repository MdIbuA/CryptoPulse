import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(null);

  // Fetch Google Client ID on mount
  useEffect(() => {
    const fetchGoogleClientId = async () => {
      try {
        const { data } = await api.get("/auth/google-client-id");
        setGoogleClientId(data.client_id);
      } catch (e) {
        // Google OAuth not configured
        console.log("Google OAuth not configured");
      }
    };
    fetchGoogleClientId();
  }, []);

  useEffect(() => {
    if (!token) return;
    const payload = parseJwt(token);
    if (payload?.exp) {
      const expiresMs = payload.exp * 1000;
      if (Date.now() > expiresMs) {
        handleLogout();
      } else {
        const timeout = setTimeout(handleLogout, expiresMs - Date.now());
        return () => clearTimeout(timeout);
      }
    }
  }, [token]);

  const saveAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) localStorage.setItem("token", nextToken);
    if (nextUser) localStorage.setItem("user", JSON.stringify(nextUser));
  };

  // Wrapper to update user and sync to localStorage
  const updateUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${data.access_token}` } });
      saveAuth(data.access_token, me.data);
      return me.data;
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (credential) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/google", { credential });
      const me = await api.get("/auth/me", { headers: { Authorization: `Bearer ${data.access_token}` } });
      saveAuth(data.access_token, me.data);
      return me.data;
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (username, email, password) => {
    setLoading(true);
    try {
      await api.post("/auth/signup", { username, email, password });
      return await handleLogin(email, password);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post(
        "/auth/logout",
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );
    } catch (e) {
      // ignore
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token),
      googleClientId,
      login: handleLogin,
      googleLogin: handleGoogleLogin,
      signup: handleSignup,
      logout: handleLogout,
      setUser: updateUser,
    }),
    [token, user, loading, googleClientId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
