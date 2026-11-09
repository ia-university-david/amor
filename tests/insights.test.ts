import { describe, expect, it } from 'vitest';
import { checkInStreak, emotionCounts, intensityPoints, moodSeries, smallWins, weekKey, weekSummary } from '../src/lib/insights';
import type { UrgeEvent } from '../src/lib/events';

const now = new Date(2026, 10, 12, 10, 0); // miércoles 12 nov 2026
const moods = [
  { date: '2026-11-12', emotion: 'Tristeza' },
  { date: '2026-11-11', emotion: 'Tristeza' },
  { date: '2026-11-10', emotion: 'Esperanza' },
  { date: '2026-10-01', emotion: 'Rabia' },
];
const events: UrgeEvent[] = [
  { kind: 'pausa', id: 'a', at: new Date(2026, 10, 10, 23).toISOString(), initialIntensity: 8, finalIntensity: 4, contactHappened: false },
  { kind: 'pausa', id: 'b', at: new Date(2026, 10, 11, 23).toISOString(), initialIntensity: 6, finalIntensity: 6 },
  { kind: 'dificil', id: 'c', at: new Date(2026, 10, 11, 12).toISOString(), type: 'envie-mensaje', counterReset: false },
];

describe('mis pequeños avances', () => {
  it('la semana empieza en lunes', () => {
    expect(weekKey(now)).toBe('2026-11-09');
    expect(weekKey(new Date(2026, 10, 9))).toBe('2026-11-09');
    expect(weekKey(new Date(2026, 10, 15))).toBe('2026-11-09');
  });

  it('cuenta emociones del periodo sin juzgarlas', () => {
    expect(emotionCounts(moods, 7, now)).toEqual([
      { emotion: 'Tristeza', count: 2 },
      { emotion: 'Esperanza', count: 1 },
    ]);
    expect(emotionCounts(moods, 60, now).map((c) => c.emotion)).toContain('Rabia');
  });

  it('serie diaria con huecos', () => {
    const s = moodSeries(moods, 4, now);
    expect(s.map((d) => d.emotion)).toEqual([null, 'Esperanza', 'Tristeza', 'Tristeza']);
  });

  it('racha de registros', () => {
    expect(checkInStreak(moods, now)).toBe(3);
    expect(checkInStreak(moods, new Date(2026, 10, 13))).toBe(3);
    expect(checkInStreak(moods, new Date(2026, 10, 15))).toBe(0);
  });

  it('intensidad solo de pausas con registro final', () => {
    expect(intensityPoints(events, 30, now)).toHaveLength(2);
  });

  it('logros descriptivos, sin afirmaciones causales', () => {
    const wins = smallWins({ events, moods, completedActivities: 2, noContactDays: 5, now });
    const text = wins.map((w) => w.text).join(' ');
    expect(text).toContain('2 pausas');
    expect(text).toContain('la intensidad bajó');
    expect(text).toContain('elegiste esperar');
    expect(text).toContain('sin borrar lo que ya habías avanzado');
    expect(text).toContain('3 días seguidos');
    expect(text).not.toMatch(/gracias a|porque|causa|curad|superad/i);
  });

  it('un día difícil no borra avances', () => {
    const wins = smallWins({ events, moods, completedActivities: 3, now });
    expect(wins.find((w) => w.id === 'camino')?.text).toContain('3 actividades');
  });

  it('resumen semanal', () => {
    expect(weekSummary(events, moods, '2026-11-09')).toEqual({ pauses: 2, difficult: 1, checkIns: 3, topEmotion: 'Tristeza' });
  });
});
