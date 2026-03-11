import React, { useEffect, useState } from 'react';
import ForensicsApp from './components/ForensicsApp';
import AuthView from './components/views/AuthView';
import { useAppStore } from './store';
import { Activity } from 'lucide-react';

export default function App() {
  const { user, token, setUser, setToken, logout, theme } = useAppStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsChecking(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        } else {
          logout();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [token, setUser, logout]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-emerald-500">
        <Activity size={48} className="animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return <ForensicsApp />;
}
