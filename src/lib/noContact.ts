import type { DifficultTypeId } from '../content/pause';

export interface CounterReset {
  at: string;
  note?: string;
}

/**
 * Optional counter of days since the last contact that the person defined as
 * incompatible with their own limits. It is one measure among others and
 * never erases completed chapters, learnings or progress.
 */
export interface NoContactCounter {
  enabled: boolean;
  startedAt: string | null;
  resets: CounterReset[];
}

export const EMPTY_COUNTER: NoContactCounter = { enabled: false, startedAt: null, resets: [] };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function daysSince(startedAt: string | null, now: Date = new Date()): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.round((startOfLocalDay(now) - startOfLocalDay(start)) / DAY_MS));
}

export function startCounter(counter: NoContactCounter, now: Date = new Date()): NoContactCounter {
  return { ...counter, enabled: true, startedAt: now.toISOString() };
}

export function stopCounter(counter: NoContactCounter): NoContactCounter {
  return { ...counter, enabled: false };
}

/** Necessary contact (children, legal, work, safety) never counts as a setback. */
export function eventAffectsCounter(type: DifficultTypeId): boolean {
  return type !== 'necesario';
}

export class ResetNotConfirmedError extends Error {
  constructor() {
    super('Reiniciar el contador requiere una confirmación explícita.');
  }
}

export function resetCounter(
  counter: NoContactCounter,
  options: { confirmed: boolean; now?: Date; note?: string },
): NoContactCounter {
  if (!options.confirmed) throw new ResetNotConfirmedError();
  const now = options.now ?? new Date();
  return {
    enabled: counter.enabled,
    startedAt: now.toISOString(),
    resets: [...counter.resets, { at: now.toISOString(), note: options.note }],
  };
}

export function describeCounter(days: number): string {
  if (days === 0) return 'Hoy empiezas a contar. Lo importante no es el número, sino lo que vas aprendiendo.';
  if (days === 1) return 'Llevas 1 día respetando el límite que elegiste.';
  return `Llevas ${days} días respetando el límite que elegiste.`;
}
