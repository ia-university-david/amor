export interface ProductMessage {
  id: string;
  text: string;
}

export const CENTRAL_PRINCIPLE = 'Amar a alguien no debería significar abandonarte a ti mismo.';

export const DEFAULT_MESSAGES: ProductMessage[] = [
  { id: 'escuchado', text: 'Lo que sientes merece ser escuchado.' },
  { id: 'extranar', text: 'Extrañar a alguien no significa que debas regresar.' },
  { id: 'impulso', text: 'Puedes sentir el impulso sin actuar inmediatamente.' },
  { id: 'momento-dificil', text: 'Un momento difícil no borra lo que has aprendido.' },
  { id: 'olvidar', text: 'No estás obligado a olvidar para seguir adelante.' },
  { id: 'valor', text: 'Tu valor no depende de que alguien decida quedarse.' },
  { id: 'historia', text: 'Tu historia no termina con esta relación.' },
  { id: 'proximo-paso', text: 'Hoy no necesitas resolver toda tu vida. Solo encontrar un próximo paso.' },
];

export function messageOfTheDay(messages: ProductMessage[], date = new Date()): ProductMessage | undefined {
  if (!messages.length) return undefined;
  const dayIndex = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000);
  return messages[dayIndex % messages.length];
}
