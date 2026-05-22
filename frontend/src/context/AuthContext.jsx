import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on page reload
    const stored = localStorage.getItem("medscreen_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem("medscreen_user"); }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("medscreen_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("medscreen_user");
  };

  const isAuthenticated = !!user;
  const role            = user?.role || null;
  const token           = user?.access_token || null;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, role, token, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
