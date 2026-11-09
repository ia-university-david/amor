import type { MoodEntry } from './progress';
import { todayKey } from './progress';
import type { PauseEvent, UrgeEvent } from './events';

/**
 * Pure helpers for "Mis pequeños avances". They describe what the person
 * recorded, never why it happened: no causal claims and no scores.
 */

const DAY_MS = 86_400_000;

export function daysAgo(n: number, now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - n);
}

/** Monday of the week containing `d`, as YYYY-MM-DD in local time. */
export function weekKey(d = new Date()): string {
  const day = (d.getDay() + 6) % 7;
  return todayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - day));
}

export function moodSeries(moods: MoodEntry[], days: number, now = new Date()): { date: string; emotion: string | null }[] {
  const byDate = new Map(moods.map((m) => [m.date, m.emotion]));
  const out: { date: string; emotion: string | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = todayKey(daysAgo(i, now));
    out.push({ date: key, emotion: byDate.get(key) ?? null });
  }
  return out;
}

export function emotionCounts(moods: MoodEntry[], days: number, now = new Date()): { emotion: string; count: number }[] {
  const since = todayKey(daysAgo(days - 1, now));
  const counts = new Map<string, number>();
  for (const m of moods) if (m.date >= since && m.emotion) counts.set(m.emotion, (counts.get(m.emotion) ?? 0) + 1);
  return [...counts.entries()].map(([emotion, count]) => ({ emotion, count })).sort((a, b) => b.count - a.count || a.emotion.localeCompare(b.emotion));
}

export interface IntensityPoint {
  at: string;
  initial: number;
  final: number;
}

export function intensityPoints(events: UrgeEvent[], days: number, now = new Date()): IntensityPoint[] {
  const since = daysAgo(days - 1, now).getTime();
  return events
    .filter((e): e is PauseEvent => e.kind === 'pausa' && typeof e.finalIntensity === 'number' && new Date(e.at).getTime() >= since)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => ({ at: e.at, initial: e.initialIntensity, final: e.finalIntensity! }));
}

/** Longest run of consecutive days with a mood check-in, ending today or yesterday. */
export function checkInStreak(moods: MoodEntry[], now = new Date()): number {
  const dates = new Set(moods.map((m) => m.date));
  let start = 0;
  if (!dates.has(todayKey(now))) start = 1;
  let n = 0;
  while (dates.has(todayKey(daysAgo(start + n, now)))) n++;
  return n;
}

export interface SmallWin {
  id: string;
  text: string;
}

export function smallWins(input: { events: UrgeEvent[]; moods: MoodEntry[]; completedActivities: number; noContactDays?: number | null; now?: Date }): SmallWin[] {
  const now = input.now ?? new Date();
  const wins: SmallWin[] = [];
  const pauses = input.events.filter((e): e is PauseEvent => e.kind === 'pausa');
  if (pauses.length) wins.push({ id: 'pausas', text: pauses.length === 1 ? 'Te diste una pausa antes de actuar por impulso.' : `Te diste ${pauses.length} pausas antes de actuar por impulso.` });
  const eased = pauses.filter((p) => typeof p.finalIntensity === 'number' && p.finalIntensity < p.initialIntensity).length;
  if (eased) wins.push({ id: 'intensidad', text: eased === 1 ? 'En una de tus pausas anotaste que la intensidad bajó al terminar.' : `En ${eased} de tus pausas anotaste que la intensidad bajó al terminar.` });
  const noContact = pauses.filter((p) => p.contactHappened === false).length;
  if (noContact) wins.push({ id: 'sin-contacto', text: noContact === 1 ? 'Una vez sentiste las ganas de escribir y elegiste esperar.' : `${noContact} veces sentiste las ganas de escribir y elegiste esperar.` });
  const difficult = input.events.filter((e) => e.kind === 'dificil').length;
  if (difficult) wins.push({ id: 'dificil', text: 'Registraste un día difícil con honestidad, sin borrar lo que ya habías avanzado.' });
  if (input.completedActivities) wins.push({ id: 'camino', text: input.completedActivities === 1 ? 'Completaste una actividad de Mi Camino.' : `Completaste ${input.completedActivities} actividades de Mi Camino.` });
  const streak = checkInStreak(input.moods, now);
  if (streak >= 2) wins.push({ id: 'racha', text: `Llevas ${streak} días seguidos anotando cómo te sientes.` });
  else if (input.moods.length) wins.push({ id: 'animo', text: input.moods.length === 1 ? 'Anotaste cómo te sentías un día.' : `Anotaste cómo te sentías ${input.moods.length} días.` });
  if (input.noContactDays && input.noContactDays > 0) wins.push({ id: 'contador', text: input.noContactDays === 1 ? 'Llevas 1 día cuidando el límite que elegiste.' : `Llevas ${input.noContactDays} días cuidando el límite que elegiste.` });
  return wins;
}

export interface WeeklyReflection {
  week: string;
  wentWell: string;
  hard: string;
  nextStep: string;
  at: string;
}

export function weekSummary(events: UrgeEvent[], moods: MoodEntry[], week: string): { pauses: number; difficult: number; checkIns: number; topEmotion: string | null } {
  const start = new Date(`${week}T00:00:00`);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  const inWeek = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t < end.getTime();
  };
  const endKey = todayKey(new Date(end.getTime() - 1));
  const weekMoods = moods.filter((m) => m.date >= week && m.date <= endKey);
  const counts = new Map<string, number>();
  for (const m of weekMoods) counts.set(m.emotion, (counts.get(m.emotion) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    pauses: events.filter((e) => e.kind === 'pausa' && inWeek(e.at)).length,
    difficult: events.filter((e) => e.kind === 'dificil' && inWeek(e.at)).length,
    checkIns: weekMoods.length,
    topEmotion: top ? top[0] : null,
  };
}
