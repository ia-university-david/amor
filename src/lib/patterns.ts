import { STRATEGIES, TRIGGERS } from '../content/pause';
import type { UrgeEvent } from './events';

export interface PatternInsight {
  id: 'noche' | 'fin-de-semana' | 'desencadenante' | 'estrategia-util' | 'necesario';
  message: string;
  suggestion?: { label: string; to: string };
}

export const MIN_EVENTS_FOR_PATTERNS = 3;

function isNight(date: Date): boolean {
  const h = date.getHours();
  return h >= 21 || h < 5;
}

function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6 || (d === 5 && date.getHours() >= 18);
}

/**
 * Observational patterns over the person's own records. Wording describes
 * co-occurrence ("en varios de tus registros…") and never claims causes.
 * Necessary contact (children, legal, work) is excluded from urge patterns.
 */
export function detectPatterns(events: UrgeEvent[]): PatternInsight[] {
  const urges = events.filter((e) => !(e.kind === 'dificil' && e.type === 'necesario'));
  if (urges.length < MIN_EVENTS_FOR_PATTERNS) return [];
  const insights: PatternInsight[] = [];
  const dates = urges.map((e) => new Date(e.at));

  const night = dates.filter(isNight).length;
  if (night >= MIN_EVENTS_FOR_PATTERNS && night / urges.length >= 0.5) {
    insights.push({
      id: 'noche',
      message:
        'En varios de tus registros, las ganas de escribir aparecen durante la noche. ¿Te gustaría preparar una rutina breve para ese momento?',
      suggestion: { label: 'Preparar mi rutina de noche', to: '/app/espacio?seccion=recordatorios' },
    });
  }

  const weekend = dates.filter(isWeekend).length;
  if (weekend >= MIN_EVENTS_FOR_PATTERNS && weekend / urges.length >= 0.6) {
    insights.push({
      id: 'fin-de-semana',
      message:
        'Muchos de tus registros coinciden con el fin de semana. Quizás valga la pena planear algo pequeño para esos días.',
      suggestion: { label: 'Planear un momento para mí', to: '/app/camino/ejercicio/soledad' },
    });
  }

  const triggerCounts = new Map<string, number>();
  for (const e of urges) if (e.trigger && e.trigger !== 'otro') triggerCounts.set(e.trigger, (triggerCounts.get(e.trigger) ?? 0) + 1);
  const top = [...triggerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= MIN_EVENTS_FOR_PATTERNS && top[1] / urges.length >= 0.4) {
    const label = TRIGGERS.find((t) => t.id === top[0])?.label.toLowerCase() ?? top[0];
    insights.push({
      id: 'desencadenante',
      message: `En ${top[1]} de tus registros aparece el mismo momento: ${label}. Reconocerlo puede ayudarte a anticiparte con más calma.`,
    });
  }

  const byStrategy = new Map<string, number[]>();
  for (const e of urges) {
    if (e.kind === 'pausa' && e.strategy && e.finalIntensity !== undefined) {
      const diffs = byStrategy.get(e.strategy) ?? [];
      diffs.push(e.initialIntensity - e.finalIntensity);
      byStrategy.set(e.strategy, diffs);
    }
  }
  let best: { id: string; avg: number; n: number } | null = null;
  for (const [id, diffs] of byStrategy) {
    if (diffs.length < 2) continue;
    const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    if (avg >= 2 && (!best || avg > best.avg)) best = { id, avg, n: diffs.length };
  }
  if (best) {
    const label = STRATEGIES.find((s) => s.id === best!.id)?.label ?? best.id;
    insights.push({
      id: 'estrategia-util',
      message: `Las ${best.n} veces que usaste «${label}», la intensidad que anotaste después fue menor (en promedio, ${Math.round(best.avg)} puntos). Puede ser un buen recurso para tener cerca.`,
    });
  }

  return insights;
}
