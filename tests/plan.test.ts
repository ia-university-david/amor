import { describe, expect, it } from 'vitest';
import { generatePlan } from '../src/lib/plan';

describe('generatePlan', () => {
  it('prioriza la pausa cuando la dificultad es no escribirle', () => {
    const plan = generatePlan({ situation: 'reciente', difficulty: 'no-escribirle', need: 'impulsos' });
    expect(plan.tools).toEqual(['pausa', 'limites']);
    expect(plan.firstGoal).toContain('no es olvidarlo todo');
    expect(plan.firstActivity.minutes).toBeLessThan(5);
    expect(plan.firstActivity.to).toBe('/app/pausa');
    expect(plan.focusPillars[0]).toBe(3);
  });

  it('no pide decidir hoy a quien sigue en la relación', () => {
    const plan = generatePlan({ situation: 'sigo-relacion', need: 'decision' });
    expect(plan.firstGoal).toContain('no es decidir hoy');
    expect(plan.situationSummary).toContain('Sigues en una relación');
    expect(plan.focusPillars.slice(0, 2)).toEqual([1, 4]);
  });

  it('marca contacto necesario y propone límites realistas', () => {
    const plan = generatePlan({ situation: 'separados-contacto', contact: ['a-veces', 'hijos'], need: 'limites' });
    expect(plan.necessaryContact).toBe(true);
    expect(plan.situationSummary).toContain('límites realistas');
    expect(plan.tools).toContain('limites');
  });

  it('activa recursos de seguridad solo si se menciona violencia o amenazas', () => {
    expect(generatePlan({ circumstances: ['violencia'] }).showSafety).toBe(true);
    expect(generatePlan({ circumstances: ['mentiras', 'conflictos'] }).showSafety).toBe(false);
  });

  it('funciona con respuestas vacías (preguntas omitidas)', () => {
    const plan = generatePlan({});
    expect(plan.tools).toHaveLength(2);
    expect(new Set(plan.tools).size).toBe(2);
    expect(plan.immediateNeed).toContain('sin prisa');
    expect(plan.focusPillars).toEqual([1, 2, 3, 4, 5]);
  });

  it('siempre devuelve dos herramientas distintas y una actividad menor a 5 minutos', () => {
    const needs = ['tranquilidad', 'impulsos', 'comprender', 'limites', 'identidad', 'autoestima', 'decision', 'disfrutar'] as const;
    const diffs = ['no-escribirle', 'dormir', 'solo', 'celos', 'hijos', 'otra'] as const;
    for (const need of needs) {
      for (const difficulty of diffs) {
        const plan = generatePlan({ need, difficulty });
        expect(plan.tools[0]).not.toBe(plan.tools[1]);
        expect(plan.firstActivity.minutes).toBeLessThan(5);
      }
    }
  });

  it('es determinista', () => {
    const answers = { situation: 'hace-mucho', need: 'autoestima', difficulty: 'culparme' } as const;
    expect(generatePlan(answers)).toEqual(generatePlan(answers));
  });
});
