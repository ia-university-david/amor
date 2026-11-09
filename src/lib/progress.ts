import { useCallback, useEffect, useState } from 'react';
import { data } from './data';

/** Completed modules: moduleId → ISO date. Never cleared by setbacks. */
export type ModuleProgress = Record<string, string>;

export function useModuleProgress() {
  const [completed, setCompleted] = useState<ModuleProgress>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    data()
      .get<ModuleProgress>('progress', 'modules')
      .then((v) => setCompleted(v ?? {}))
      .finally(() => setLoading(false));
  }, []);

  const markDone = useCallback(async (moduleId: string) => {
    const current = (await data().get<ModuleProgress>('progress', 'modules')) ?? {};
    if (current[moduleId]) return;
    const next = { ...current, [moduleId]: new Date().toISOString() };
    await data().put('progress', 'modules', next);
    setCompleted(next);
  }, []);

  return { completed, markDone, loading };
}

export interface MoodEntry {
  date: string;
  emotion: string;
  note?: string;
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
