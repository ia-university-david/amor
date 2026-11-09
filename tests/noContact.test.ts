import { describe, expect, it } from 'vitest';
import {
  EMPTY_COUNTER,
  ResetNotConfirmedError,
  daysSince,
  describeCounter,
  eventAffectsCounter,
  resetCounter,
  startCounter,
} from '../src/lib/noContact';

describe('contador de contacto', () => {
  it('cuenta días calendario locales', () => {
    const start = new Date(2026, 0, 1, 23, 0);
    expect(daysSince(start.toISOString(), new Date(2026, 0, 1, 23, 30))).toBe(0);
    expect(daysSince(start.toISOString(), new Date(2026, 0, 2, 0, 5))).toBe(1);
    expect(daysSince(start.toISOString(), new Date(2026, 0, 31, 12))).toBe(30);
    expect(daysSince(null)).toBe(0);
    expect(daysSince('no-es-fecha')).toBe(0);
  });

  it('nunca devuelve valores negativos', () => {
    expect(daysSince(new Date(2026, 5, 10).toISOString(), new Date(2026, 5, 1))).toBe(0);
  });

  it('exige confirmación explícita para reiniciar', () => {
    const c = startCounter(EMPTY_COUNTER, new Date(2026, 0, 1));
    expect(() => resetCounter(c, { confirmed: false })).toThrow(ResetNotConfirmedError);
    const now = new Date(2026, 0, 10);
    const r = resetCounter(c, { confirmed: true, now, note: 'le escribí' });
    expect(r.startedAt).toBe(now.toISOString());
    expect(r.resets).toHaveLength(1);
    expect(r.enabled).toBe(true);
  });

  it('el contacto necesario no afecta al contador', () => {
    expect(eventAffectsCounter('necesario')).toBe(false);
    expect(eventAffectsCounter('envie-mensaje')).toBe(true);
  });

  it('describe el contador sin promesas', () => {
    expect(describeCounter(0)).toContain('Hoy empiezas');
    expect(describeCounter(1)).toBe('Llevas 1 día respetando el límite que elegiste.');
    expect(describeCounter(12)).not.toMatch(/recaída|fracaso|curad/);
  });
});
