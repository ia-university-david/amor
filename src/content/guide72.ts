export const GUIDE_72_NOTICE =
  'Guía provisional escrita por el equipo de producto mientras llega el contenido aprobado por Laura Rojas. No es un protocolo clínico.';

export interface GuideBlock {
  range: string;
  title: string;
  intro: string;
  steps: { title: string; text: string }[];
}

export const GUIDE_72: GuideBlock[] = [
  {
    range: 'Primeras 24 horas',
    title: 'Cuidar lo básico',
    intro: 'Las primeras horas suelen ser las más confusas. No tienes que entenderlo todo todavía.',
    steps: [
      { title: 'Atiende tu cuerpo', text: 'Bebe agua, come algo sencillo y, si puedes, descansa aunque no duermas. Lo básico sostiene lo demás.' },
      { title: 'Elige a una persona', text: 'Avisa a alguien de confianza de que estás pasando un momento difícil. No necesitas contar los detalles.' },
      { title: 'Pospón decisiones grandes', text: 'Si sientes la urgencia de escribir, llamar o decidir algo importante, date un plazo: “lo pensaré mañana”.' },
      { title: 'Prepara tu pausa', text: 'Ten a mano una herramienta para cuando aparezca el impulso: un temporizador, una respiración cómoda o escribir sin enviar.' },
    ],
  },
  {
    range: 'De 24 a 48 horas',
    title: 'Poner un poco de orden',
    intro: 'Cuando el primer impacto baja un poco, ayuda crear algo de estructura.',
    steps: [
      { title: 'Decide qué contacto quieres', text: 'Contacto cero voluntario, contacto mínimo o solo asuntos necesarios. Elige lo que puedas sostener, no lo que “deberías”.' },
      { title: 'Ajusta tus redes', text: 'Silenciar o archivar no es infantil: es cuidarte de recordatorios constantes mientras te recuperas.' },
      { title: 'Escribe sin enviar', text: 'Si hay algo que necesitas decir, escríbelo en un espacio privado. Puedes decidir más adelante si tiene sentido enviarlo.' },
      { title: 'Una rutina pequeña', text: 'Una hora para dormir, un paseo, una comida a una hora fija. Algo que dependa solo de ti.' },
    ],
  },
  {
    range: 'De 48 a 72 horas',
    title: 'Mirar hacia los próximos días',
    intro: 'No se trata de estar bien en tres días, sino de tener un plan para los que vienen.',
    steps: [
      { title: 'Identifica tus momentos difíciles', text: 'Noches, fines de semana, ciertas canciones o lugares. Saberlo te permite prepararte.' },
      { title: 'Escribe un motivo para ti', text: 'Una frase que quieras leer cuando el impulso sea fuerte: por qué elegiste este camino.' },
      { title: 'Retoma un vínculo', text: 'Escribe a alguien con quien hayas perdido contacto, solo para saludar.' },
      { title: 'Busca apoyo si lo necesitas', text: 'Si el malestar es muy intenso, no mejora o sientes que no puedes con él, consulta a un profesional de la salud mental.' },
    ],
  },
];
