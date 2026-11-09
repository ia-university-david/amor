export interface KindWeekInput {
  pauses: number;
  difficult: number;
  necessary: number;
  checkIns: number;
  exercises: number;
  topEmotion: string | null;
}

/**
 * A weekly note in the second person. It never uses "recaída" and it
 * separates necessary contact from moments the person found hard.
 */
export function kindWeek(input: KindWeekInput): string {
  const bits: string[] = [];
  if (input.checkIns === 0 && input.pauses === 0 && input.exercises === 0 && input.difficult === 0 && input.necessary === 0) {
    return 'Esta semana no anotaste mucho, y está bien. Volver cuando puedas ya es una forma de cuidarte. No hay una cuenta que se haya puesto en cero.';
  }
  if (input.checkIns) bits.push(input.checkIns === 1 ? 'te detuviste una vez a mirar cómo estabas' : `te detuviste ${input.checkIns} veces a mirar cómo estabas`);
  if (input.pauses) bits.push(input.pauses === 1 ? 'usaste la pausa' : `usaste la pausa ${input.pauses} veces`);
  if (input.exercises) bits.push(input.exercises === 1 ? 'completaste un ejercicio' : `completaste ${input.exercises} ejercicios`);
  if (input.difficult) {
    bits.push(input.difficult === 1 ? 'tuviste un momento difícil y lo contaste' : `contaste ${input.difficult} momentos difíciles`);
  }
  if (input.necessary) {
    bits.push(
      input.necessary === 1
        ? 'hubo un contacto necesario (hijos, trámite o seguridad) y eso no cuenta en contra'
        : `hubo ${input.necessary} contactos necesarios, y ninguno cuenta en contra`,
    );
  }
  const emotion = input.topEmotion ? ` La emoción que más nombraste fue ${input.topEmotion.toLowerCase()}.` : '';
  const head = bits.length ? `Esta semana ${bits.join(', ')}.` : 'Esta semana estuviste por aquí.';
  return `${head}${emotion} Lo que ya aprendiste sigue en su sitio, aunque algún día haya pesado más.`;
}
