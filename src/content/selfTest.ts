export type TestAnswer = 'si' | 'a-veces' | 'no';

export const TEST_ANSWER_OPTIONS: { id: TestAnswer; label: string }[] = [
  { id: 'si', label: 'Sí' },
  { id: 'a-veces', label: 'A veces' },
  { id: 'no', label: 'No' },
];

export const TEST_QUESTIONS: string[] = [
  '¿Tu pareja te hace sentir culpable por poner límites?',
  '¿Dudas de tus recuerdos o emociones con frecuencia?',
  '¿Sientes miedo o ansiedad cuando piensas en terminar la relación?',
  '¿Tu pareja te critica constantemente o minimiza tus logros?',
  '¿Has dejado de ver amigos o familiares por tu pareja?',
  '¿Sientes que caminas sobre cáscaras de huevo para no molestar a tu pareja?',
  '¿Tu pareja te hace sentir que nadie más te querría?',
];
