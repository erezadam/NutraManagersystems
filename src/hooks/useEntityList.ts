import { useCallback, useEffect, useMemo, useState } from 'react';

interface EntityWithId {
  id: string;
}

interface Service<T extends EntityWithId> {
  list: (sort?: string) => Promise<T[]>;
}

export function useEntityList<T extends EntityWithId>(service: Service<T>, sort?: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await service.list(sort);
      setItems(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [service, sort]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return useMemo(
    () => ({
      items,
      setItems,
      loading,
      error,
      reload
    }),
    [items, loading, error, reload]
  );
}
