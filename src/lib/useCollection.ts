import { useCallback, useEffect, useState } from 'react';
import { data, newId, type Collection, type StoredItem } from './data';

export function useCollection<T>(collection: Collection) {
  const [items, setItems] = useState<StoredItem<T>[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setItems(await data().list<T>(collection));
    } finally {
      setLoading(false);
    }
  }, [collection]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(
    async (value: T, id: string = newId()) => {
      await data().put(collection, id, value);
      await reload();
      return id;
    },
    [collection, reload],
  );

  const update = useCallback(
    async (id: string, value: T) => {
      await data().put(collection, id, value);
      await reload();
    },
    [collection, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await data().remove(collection, id);
      await reload();
    },
    [collection, reload],
  );

  return { items, loading, add, update, remove, reload };
}

export function useDoc<T>(collection: Collection, id: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    data()
      .get<T>(collection, id)
      .then((v) => {
        if (alive && v !== undefined) setValue(v);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, id]);

  const save = useCallback(
    async (next: T) => {
      setValue(next);
      await data().put(collection, id, next);
    },
    [collection, id],
  );

  return { value, save, loading };
}
