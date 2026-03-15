import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const USER_STORAGE_KEY = "authUser";
const TOKEN_STORAGE_KEY = "token";

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const decodeTokenPayload = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload || null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) {
      return;
    }

    const storedUser = getStoredUser();
    if (storedUser) {
      setUser(storedUser);
      setToken(storedToken);
      return;
    }

    const payload = decodeTokenPayload(storedToken);
    if (payload) {
      const fallbackUser = {
        id: payload.id,
        role: payload.role,
        name: payload.name || "Student",
      };
      setUser(fallbackUser);
      setToken(storedToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fallbackUser));
    }
  }, []);

  const login = (userData, authToken) => {
    setUser(userData || null);
    setToken(authToken || null);

    if (userData) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    }

    if (authToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      if (!prev) {
        return prev;
      }

      const nextUser = { ...prev, ...updates };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const value = useMemo(
    () => ({
      user,
      token,
      isLoggedIn: Boolean(token),
      login,
      logout,
      updateUser,
    }),
    [user, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
};

export { AuthContext };
