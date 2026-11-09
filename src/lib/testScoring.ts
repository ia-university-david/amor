import { TEST_QUESTIONS, type TestAnswer } from '../content/selfTest';

export type TestBand = 'pocas-senales' | 'algunas-senales' | 'varias-senales';

export interface TestResult {
  score: number;
  maxScore: number;
  band: TestBand;
  title: string;
  message: string;
  suggestions: string[];
  disclaimer: string;
}

const POINTS: Record<TestAnswer, number> = { si: 2, 'a-veces': 1, no: 0 };

export const TEST_DISCLAIMER =
  'Este test es una herramienta de orientación y reflexión. No es un diagnóstico ni reemplaza la valoración de un profesional de la salud mental.';

/**
 * Returns null while the test is incomplete. Bands are orientation only and
 * deliberately avoid labelling the relationship or the other person.
 */
export function scoreTest(answers: (TestAnswer | undefined)[]): TestResult | null {
  if (answers.length !== TEST_QUESTIONS.length || answers.some((a) => a === undefined)) return null;
  const score = (answers as TestAnswer[]).reduce((sum, a) => sum + POINTS[a], 0);
  const maxScore = TEST_QUESTIONS.length * 2;

  if (score <= 3) {
    return {
      score,
      maxScore,
      band: 'pocas-senales',
      title: 'En este momento aparecen pocas señales',
      message:
        'Tus respuestas muestran pocas de las situaciones que suelen generar malestar en una relación. Aun así, si algo te inquieta, lo que sientes merece ser escuchado.',
      suggestions: [
        'Observa cómo te sientes después de pasar tiempo con tu pareja.',
        'Conversa sobre tus límites cuando te sientas con calma.',
      ],
      disclaimer: TEST_DISCLAIMER,
    };
  }
  if (score <= 8) {
    return {
      score,
      maxScore,
      band: 'algunas-senales',
      title: 'Hay algunas señales que vale la pena observar',
      message:
        'Algunas de tus respuestas describen situaciones que pueden ir desgastando tu bienestar. No significa que tu relación tenga una etiqueta concreta; sí es una invitación a mirar con atención cómo te sientes en ella.',
      suggestions: [
        'Anota durante una semana los momentos en que te sientes en calma y los que te generan tensión.',
        'Habla con alguien de confianza sobre lo que estás viviendo.',
        'Explora el programa para comprender lo que sientes, a tu ritmo.',
      ],
      disclaimer: TEST_DISCLAIMER,
    };
  }
  return {
    score,
    maxScore,
    band: 'varias-senales',
    title: 'Varias señales merecen tu atención',
    message:
      'Tus respuestas describen varias situaciones que pueden estar afectando tu bienestar y tu libertad. Mereces sentirte segura o seguro en tus relaciones. Buscar apoyo no es exagerar.',
    suggestions: [
      'Considera hablar con un profesional de la salud mental.',
      'Mantén cerca a personas de confianza.',
      'Si en algún momento sientes que estás en peligro, llama al número de emergencias de tu país.',
    ],
    disclaimer: TEST_DISCLAIMER,
  };
}
