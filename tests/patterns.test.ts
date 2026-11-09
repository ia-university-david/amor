import { describe, expect, it } from 'vitest';
import { detectPatterns } from '../src/lib/patterns';
import type { PauseEvent, DifficultEvent, UrgeEvent } from '../src/lib/events';

function pause(date: Date, extra: Partial<PauseEvent> = {}): PauseEvent {
  return { kind: 'pausa', id: Math.random().toString(), at: date.toISOString(), initialIntensity: 8, ...extra };
}

function difficult(date: Date, extra: Partial<DifficultEvent> = {}): DifficultEvent {
  return { kind: 'dificil', id: Math.random().toString(), at: date.toISOString(), type: 'envie-mensaje', counterReset: false, ...extra };
}

// Local-time dates: 2026-03-02 is a Monday.
const at = (day: number, hour: number) => new Date(2026, 2, day, hour, 15);

describe('detectPatterns', () => {
  it('no devuelve nada con menos de 3 registros', () => {
    expect(detectPatterns([pause(at(2, 23)), pause(at(3, 23))])).toEqual([]);
  });

  it('detecta un patrón nocturno sin afirmar causas', () => {
    const events: UrgeEvent[] = [pause(at(2, 23)), pause(at(3, 1)), difficult(at(4, 22)), pause(at(4, 12))];
    const insights = detectPatterns(events);
    const night = insights.find((i) => i.id === 'noche');
    expect(night).toBeDefined();
    expect(night!.message).toContain('durante la noche');
    expect(night!.message).not.toMatch(/porque|causa/);
  });

  it('no cuenta el contacto necesario como impulso', () => {
    const events: UrgeEvent[] = [
      difficult(at(2, 23), { type: 'necesario' }),
      difficult(at(3, 23), { type: 'necesario' }),
      difficult(at(4, 23), { type: 'necesario' }),
    ];
    expect(detectPatterns(events)).toEqual([]);
  });

  it('detecta un desencadenante frecuente', () => {
    const events: UrgeEvent[] = [
      pause(at(2, 10), { trigger: 'redes' }),
      pause(at(3, 11), { trigger: 'redes' }),
      pause(at(4, 12), { trigger: 'redes' }),
      pause(at(5, 13), { trigger: 'recuerdo' }),
    ];
    const t = detectPatterns(events).find((i) => i.id === 'desencadenante');
    expect(t?.message).toContain('algo que vi en redes');
  });

  it('señala una estrategia asociada a menor intensidad', () => {
    const events: UrgeEvent[] = [
      pause(at(2, 10), { strategy: 'respiracion', initialIntensity: 8, finalIntensity: 4 }),
      pause(at(3, 10), { strategy: 'respiracion', initialIntensity: 7, finalIntensity: 4 }),
      pause(at(4, 10), { strategy: 'escribir', initialIntensity: 6, finalIntensity: 6 }),
    ];
    const s = detectPatterns(events).find((i) => i.id === 'estrategia-util');
    expect(s?.message).toContain('Respiración');
    expect(s?.message).toContain('4 puntos');
  });
});
