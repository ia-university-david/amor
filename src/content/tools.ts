import type { IconName } from '../components/Icon';

export type ToolId =
  | 'pausa'
  | 'respiracion'
  | 'escribir-sin-enviar'
  | 'motivos'
  | 'limites'
  | 'cerebro'
  | 'diario'
  | 'creencias'
  | 'soledad'
  | 'apego'
  | 'hoy-dificil'
  | 'conectar';

export interface ToolInfo {
  id: ToolId;
  title: string;
  description: string;
  to: string;
  icon: IconName;
}

export const TOOLS: Record<ToolId, ToolInfo> = {
  pausa: {
    id: 'pausa',
    title: 'Necesito una pausa',
    description: 'Un recorrido breve para cuando aparece el impulso de escribir, llamar o revisar.',
    to: '/app/pausa',
    icon: 'pause',
  },
  respiracion: {
    id: 'respiracion',
    title: 'Respiración y anclaje',
    description: 'Respiración cómoda guiada o, si lo prefieres, un ejercicio de los cinco sentidos.',
    to: '/app/pausa?herramienta=respiracion',
    icon: 'wind',
  },
  'escribir-sin-enviar': {
    id: 'escribir-sin-enviar',
    title: 'Escribir sin enviar',
    description: 'Di lo que necesitas decir en un espacio privado y cifrado. Nadie más lo leerá.',
    to: '/app/espacio?seccion=sin-enviar',
    icon: 'pen',
  },
  motivos: {
    id: 'motivos',
    title: 'Mis motivos',
    description: 'Tus límites y los recordatorios que escribiste para ti, a mano cuando los necesites.',
    to: '/app/pausa?herramienta=motivos',
    icon: 'shield',
  },
  limites: {
    id: 'limites',
    title: 'Contacto y límites',
    description: 'Define qué tipo de contacto quieres sostener y qué reglas te cuidan.',
    to: '/app/limites',
    icon: 'shield',
  },
  cerebro: {
    id: 'cerebro',
    title: 'Tu cerebro después de una ruptura',
    description: 'Explicaciones sencillas sobre por qué todo esto se siente tan intenso.',
    to: '/app/cerebro',
    icon: 'brain',
  },
  diario: {
    id: 'diario',
    title: 'Mi diario',
    description: 'Un lugar privado para escribir cómo llegas cada día.',
    to: '/app/espacio?seccion=diario',
    icon: 'book',
  },
  creencias: {
    id: 'creencias',
    title: 'Revisar un pensamiento',
    description: 'Mira un pensamiento que pesa, la evidencia a favor y en contra, y una versión más equilibrada.',
    to: '/app/camino/ejercicio/creencias',
    icon: 'sparkle',
  },
  soledad: {
    id: 'soledad',
    title: 'Estar a solas sin sentirte abandonado',
    description: 'Pasos pequeños y progresivos para reconstruir tu relación con el tiempo propio.',
    to: '/app/camino/ejercicio/soledad',
    icon: 'leaf',
  },
  apego: {
    id: 'apego',
    title: 'Reflexionar sobre el apego',
    description: 'Preguntas para distinguir lo que extrañas de lo que necesitas.',
    to: '/app/camino/ejercicio/apego',
    icon: 'heart',
  },
  'hoy-dificil': {
    id: 'hoy-dificil',
    title: 'Hoy fue difícil',
    description: 'Si pasó algo que no esperabas, podemos entenderlo sin juzgarte.',
    to: '/app/dificil',
    icon: 'cloud',
  },
  conectar: {
    id: 'conectar',
    title: 'Conectar con alguien',
    description: 'Tus contactos de confianza, a un toque.',
    to: '/app/pausa?herramienta=conectar',
    icon: 'users',
  },
};
