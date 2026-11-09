import { describe, expect, it } from 'vitest';
import { scoreTest } from '../src/lib/testScoring';
import type { TestAnswer } from '../src/content/selfTest';

const all = (a: TestAnswer) => Array<TestAnswer>(7).fill(a);

describe('scoreTest', () => {
  it('devuelve null si faltan respuestas', () => {
    expect(scoreTest([])).toBeNull();
    expect(scoreTest(['si', 'no', undefined, 'no', 'no', 'no', 'no'])).toBeNull();
  });

  it('calcula bandas de orientación', () => {
    expect(scoreTest(all('no'))!.band).toBe('pocas-senales');
    expect(scoreTest(all('no'))!.score).toBe(0);
    expect(scoreTest(all('a-veces'))!.band).toBe('algunas-senales');
    expect(scoreTest(all('a-veces'))!.score).toBe(7);
    expect(scoreTest(all('si'))!.band).toBe('varias-senales');
    expect(scoreTest(all('si'))!.score).toBe(14);
  });

  it('respeta los límites entre bandas', () => {
    expect(scoreTest(['si', 'a-veces', 'no', 'no', 'no', 'no', 'no'])!.band).toBe('pocas-senales'); // 3
    expect(scoreTest(['si', 'si', 'no', 'no', 'no', 'no', 'no'])!.band).toBe('algunas-senales'); // 4
    expect(scoreTest(['si', 'si', 'si', 'si', 'no', 'no', 'no'])!.band).toBe('algunas-senales'); // 8
    expect(scoreTest(['si', 'si', 'si', 'si', 'a-veces', 'no', 'no'])!.band).toBe('varias-senales'); // 9
  });

  it('nunca usa lenguaje diagnóstico', () => {
    for (const a of ['si', 'a-veces', 'no'] as TestAnswer[]) {
      const r = scoreTest(all(a))!;
      const text = `${r.title} ${r.message}`.toLowerCase();
      expect(text).not.toMatch(/diagn[oó]stico de|tienes un amor t[oó]xico|eres v[ií]ctima|abusador|narcisista/);
      expect(r.disclaimer).toContain('No es un diagnóstico');
    }
  });
});
