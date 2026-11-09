import type { AfterFeelingId, DifficultTypeId, NowNeedId } from '../content/pause';

export interface DifficultInput {
  type: DifficultTypeId;
  seeking?: string;
  after?: AfterFeelingId;
  needNow?: NowNeedId;
}

/**
 * Short, non-punitive response adapted to what happened. Pure function so the
 * tone rules can be reviewed and tested in isolation.
 */
export function difficultDayResponse(input: DifficultInput): string {
  if (input.type === 'necesario') {
    return 'Fue un contacto necesario, y atenderlo también es cuidarte. No cuenta como un paso atrás. Si te removió emociones, podemos ver qué necesitas ahora.';
  }

  const seeking = input.seeking?.trim();
  const opening = seeking
    ? `Entiendo que buscabas ${lowerFirst(stripPeriod(seeking))}.`
    : 'Entiendo que en ese momento algo dentro de ti buscaba alivio.';

  const afterText: Partial<Record<AfterFeelingId, string>> = {
    alivio: 'Sentiste alivio, y eso también es información valiosa: habla de lo que necesitabas.',
    peor: 'Quizás la conversación no te dio lo que necesitabas.',
    confusion: 'Es comprensible que te hayas quedado con más preguntas.',
    culpa: 'La culpa puede aparecer, pero no hace falta castigarte.',
    igual: 'A veces lo que esperamos que cambie algo no cambia mucho.',
    mezcla: 'Sentir muchas cosas a la vez es normal después de algo así.',
  };

  const middle = input.after ? afterText[input.after] ?? '' : '';
  const closing =
    'Podemos revisar qué buscabas en ese momento, sin juzgarte, y preparar una alternativa para la próxima vez. Un momento difícil no borra lo que has aprendido.';

  return [opening, middle, closing].filter(Boolean).join(' ');
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function stripPeriod(s: string): string {
  return s.replace(/[.!]+$/, '');
}
