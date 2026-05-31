import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './hooks/useSecureAuth.jsx';

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./pages/LandingPage.jsx'));
const SecureLoginPage = lazy(() => import('./pages/SecureLoginPage.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));

// Loading component
const LoadingFallback = () => (
  <div className="auth-loading">
    <div className="auth-loading-orb" />
    Memuat...
  </div>
);

export default function App() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState('landing');

  useEffect(() => {
    if (!loading) {
      setRoute(user ? 'dashboard' : 'landing');
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      {route === 'login' && <SecureLoginPage onBack={() => setRoute('landing')} />}
      {route === 'dashboard' && <Dashboard onLogout={() => setRoute('landing')} />}
      {route === 'landing' && <LandingPage onLogin={() => setRoute('login')} />}
    </Suspense>
  );
}
