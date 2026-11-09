import { describe, expect, it } from 'vitest';
import { generatePlan } from '../src/lib/plan';
import { contactMode, orderedChapters, primaryChapter } from '../src/lib/journey';

describe('recorrido según la situación', () => {
  it('a quien sigue dentro lo lleva primero a ese capítulo, no a la distancia', () => {
    const answers = { situation: 'sigo-relacion' as const, need: 'decision' as const };
    expect(primaryChapter(answers)).toBe('dentro');
    expect(orderedChapters(answers)[0]).toBe('dentro');
    expect(contactMode(answers)).toBe('dentro');
    expect(generatePlan(answers).focusChapters[0]).toBe('dentro');
    expect(generatePlan(answers).contactMode).toBe('dentro');
  });

  it('a quien acaba de terminar lo lleva a la ruptura y luego a los primeros días', () => {
    const order = orderedChapters({ situation: 'reciente' });
    expect(order.slice(0, 3)).toEqual(['recien', 'primeros', 'distancia']);
    expect(generatePlan({ situation: 'reciente' }).focusChapters[0]).toBe('recien');
  });

  it('en las primeras semanas o con contacto intermitente prioriza la distancia elegida', () => {
    expect(primaryChapter({ situation: 'semanas-meses' })).toBe('distancia');
    expect(primaryChapter({ situation: 'separados-contacto' })).toBe('distancia');
  });

  it('cuando ya pasó tiempo, empieza por comprender y la identidad', () => {
    expect(orderedChapters({ situation: 'hace-mucho' }).slice(0, 2)).toEqual(['comprender', 'identidad']);
  });

  it('el contacto por hijos o trámites no se trata como un fallo de no-contacto', () => {
    const answers = { situation: 'separados-contacto' as const, contact: ['hijos' as const, 'legal-economico' as const] };
    expect(contactMode(answers)).toBe('necesario');
    expect(generatePlan(answers).contactMode).toBe('necesario');
    expect(generatePlan(answers).necessaryContact).toBe(true);
    expect(primaryChapter(answers)).toBe('distancia');
  });

  it('si hay violencia dentro de la relación, la seguridad queda justo después de mirar lo que vive', () => {
    const order = orderedChapters({ situation: 'sigo-relacion', circumstances: ['violencia'] });
    expect(order.slice(0, 2)).toEqual(['dentro', 'primeros']);
  });

  it('si hay violencia y la ruptura es reciente, la seguridad pasa delante', () => {
    expect(primaryChapter({ situation: 'reciente', circumstances: ['violencia'] })).toBe('primeros');
  });

  it('incluye los siete capítulos, sin repetir', () => {
    const order = orderedChapters({ situation: 'diferente', need: 'identidad' });
    expect(new Set(order).size).toBe(7);
    expect(order[0]).toBe('identidad');
  });
});
