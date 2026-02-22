import { useEffect, useState } from 'react';
import type { User } from '../types/entities';
import { authService } from '../services';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        const me = await authService.me();
        if (active) {
          setUser(me);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, []);

  return { user, loading, isAdmin: user?.role === 'admin' };
}
