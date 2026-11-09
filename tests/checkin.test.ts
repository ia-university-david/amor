import { describe, expect, it } from 'vitest';
import { canSaveCheckIn, compassionateClose, EMPTY_CHECKIN, intensityWord, settleMoment } from '../src/lib/checkin';
import { EMPTY_COUNTER, daysSince, startCounter } from '../src/lib/noContact';

const now = new Date('2026-11-09T15:00:00');

describe('check-in', () => {
  it('nombra la intensidad sin dramatizar', () => {
    expect(intensityWord(1)).toBe('Suave');
    expect(intensityWord(5)).toBe('Fuerte');
    expect(intensityWord(9)).toBe('Muy fuerte');
  });

  it('pide emoción y tipo de momento antes de guardar', () => {
    expect(canSaveCheckIn(EMPTY_CHECKIN)).toBe(false);
    expect(canSaveCheckIn({ ...EMPTY_CHECKIN, kind: 'sostuve', emotion: 'calma' })).toBe(true);
  });

  it('cierra con cuidado y nunca llama retroceso al contacto necesario', () => {
    expect(compassionateClose({ kind: 'necesario', emotion: 'ansiedad', intensity: 6 }).title).toMatch(/no es un retroceso/i);
    expect(compassionateClose({ kind: 'dificil', emotion: 'tristeza', intensity: 8 }).body).not.toMatch(/recaí|recaída/i);
    expect(compassionateClose({ kind: 'sostuve', emotion: 'ansiedad', intensity: 8 }).title).toBe('Estás aquí.');
  });

  it('reiniciar el contador no borra los ejercicios ya completados', () => {
    const progress = { 'escuchar-me': '2026-01-02T00:00:00.000Z', gustos: '2026-03-01T00:00:00.000Z' };
    const counter = startCounter({ ...EMPTY_COUNTER }, new Date('2026-10-01T10:00:00'));
    const out = settleMoment({
      progress,
      counter,
      kind: 'dificil',
      confirmReset: true,
      now,
      note: 'escribí',
    });
    expect(out.resetApplied).toBe(true);
    expect(out.progress).toBe(progress);
    expect(out.progress['escuchar-me']).toBe('2026-01-02T00:00:00.000Z');
    expect(out.progress.gustos).toBe('2026-03-01T00:00:00.000Z');
    expect(daysSince(out.counter.startedAt, now)).toBe(0);
    expect(out.counter.resets).toHaveLength(1);
  });

  it('sin confirmación el contador sigue y el progreso también', () => {
    const progress = { piano: '2026-02-02T00:00:00.000Z' };
    const counter = startCounter(EMPTY_COUNTER, new Date('2026-11-01T10:00:00'));
    const out = settleMoment({ progress, counter, kind: 'dificil', confirmReset: false, now });
    expect(out.resetApplied).toBe(false);
    expect(out.counter).toBe(counter);
    expect(out.progress).toEqual({ piano: '2026-02-02T00:00:00.000Z' });
    expect(daysSince(out.counter.startedAt, now)).toBe(8);
  });

  it('el contacto necesario no reinicia el contador aunque se confirme por error', () => {
    const progress = { proteccion: '2026-04-04T00:00:00.000Z' };
    const counter = startCounter(EMPTY_COUNTER, new Date('2026-11-01T10:00:00'));
    const out = settleMoment({ progress, counter, kind: 'necesario', confirmReset: true, now });
    expect(out.resetApplied).toBe(false);
    expect(out.counter.startedAt).toBe(counter.startedAt);
    expect(out.progress.proteccion).toBe(progress.proteccion);
  });
});
