import { useState, useEffect } from 'react';
import { auth } from '@mindstudio-ai/interface';

type AppUser = {
  id: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  apiKey: string | null;
  createdAt: string;
};

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}
