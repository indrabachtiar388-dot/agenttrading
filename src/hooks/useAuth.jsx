import { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('sia_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    // Mock login — accepts any non-empty email/password
    if (!email || !password) return false;
    const u = {
      id: 'user_' + Math.random().toString(36).slice(2, 8),
      email,
      name: email.split('@')[0],
      wallet: null,
      balanceSol: 0,
      depositAddress: 'SoL' + Array.from({ length: 40 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'[Math.floor(Math.random() * 33)]).join('')
    };
    setUser(u);
    localStorage.setItem('sia_user', JSON.stringify(u));
    return true;
  };

  const connectWallet = () => {
    const wallet = 'SoL' + Array.from({ length: 40 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789'[Math.floor(Math.random() * 33)]).join('');
    const u = {
      ...(user || {}),
      id: user?.id || 'user_' + Math.random().toString(36).slice(2, 8),
      wallet,
      name: user?.name || 'Trader',
      email: user?.email || null,
      balanceSol: user?.balanceSol ?? 0,
      depositAddress: wallet
    };
    setUser(u);
    localStorage.setItem('sia_user', JSON.stringify(u));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sia_user');
  };

  const updateBalance = (deltaSol) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, balanceSol: Math.max(0, (prev.balanceSol || 0) + deltaSol) };
      localStorage.setItem('sia_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, connectWallet, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
}
