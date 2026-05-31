import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useSecureAuth.jsx';
import LandingPage from './pages/LandingPage.jsx';
import SecureLoginPage from './pages/SecureLoginPage.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState('landing');

  useEffect(() => {
    if (!loading) {
      setRoute(user ? 'dashboard' : 'landing');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-orb" />
        Memuat...
      </div>
    );
  }

  if (route === 'login') return <SecureLoginPage onBack={() => setRoute('landing')} />;
  if (route === 'dashboard') return <Dashboard onLogout={() => setRoute('landing')} />;
  return <LandingPage onLogin={() => setRoute('login')} />;
}
