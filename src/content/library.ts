export type EvidenceLevel =
  | 'estudio-pequeno'
  | 'estudio-observacional'
  | 'ensayo-aleatorizado'
  | 'revision'
  | 'guia-institucional'
  | 'divulgacion';

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  'estudio-pequeno': 'Estudio pequeño (exploratorio)',
  'estudio-observacional': 'Estudio observacional',
  'ensayo-aleatorizado': 'Ensayo aleatorizado',
  revision: 'Revisión de estudios',
  'guia-institucional': 'Guía institucional',
  divulgacion: 'Divulgación',
};

export interface LibraryEntry {
  id: string;
  title: string;
  authors: string;
  source: string;
  year: string;
  url: string;
  evidenceLevel: EvidenceLevel;
  summary: string;
  limitations: string;
  reviewedAt: string | null;
}

/**
 * Titles, authors and years were verified against PubMed / Europe PMC / WHO
 * on 2026-11-09. Summaries are our own plain-language paraphrases and still
 * require professional editorial review (reviewedAt = null).
 */
export const DEFAULT_LIBRARY: LibraryEntry[] = [
  {
    id: 'fisher-2010',
    title: 'Reward, addiction, and emotion regulation systems associated with rejection in love',
    authors: 'Helen E. Fisher, Lucy L. Brown, Arthur Aron, Greg Strong, Debra Mashek',
    source: 'Journal of Neurophysiology',
    year: '2010',
    url: 'https://pubmed.ncbi.nlm.nih.gov/20445032/',
    evidenceLevel: 'estudio-pequeno',
    summary:
      'Estudio con resonancia magnética funcional en 15 personas (10 mujeres y 5 hombres) que habían sido rechazadas recientemente y seguían intensamente enamoradas. Al ver una foto de la expareja se activaron regiones asociadas con recompensa, motivación, deseo intenso (craving) y regulación emocional.',
    limitations:
      'Muestra muy pequeña y sin seguimiento en el tiempo. Mide activación cerebral asociada, no causas. Que se activen áreas también implicadas en adicciones no significa que una ruptura sea literalmente una adicción.',
    reviewedAt: null,
  },
  {
    id: 'sbarra-2012',
    title: 'When leaving your ex, love yourself: observational ratings of self-compassion predict the course of emotional recovery following marital separation',
    authors: 'David A. Sbarra, Hillary L. Smith, Matthias R. Mehl',
    source: 'Psychological Science',
    year: '2012',
    url: 'https://pubmed.ncbi.nlm.nih.gov/22282874/',
    evidenceLevel: 'estudio-observacional',
    summary:
      '109 adultos en proceso de divorcio grabaron 4 minutos hablando de su separación. Quienes mostraron más autocompasión (amabilidad consigo, sentido de humanidad compartida y ecuanimidad) reportaron menos intrusión emocional relacionada con el divorcio, y la asociación se mantuvo hasta 9 meses después.',
    limitations:
      'Es una asociación, no prueba que la autocompasión cause la mejoría. Los propios autores indican que los resultados deben replicarse.',
    reviewedAt: null,
  },
  {
    id: 'mason-2012',
    title: 'Facing a breakup: Electromyographic responses moderate self-concept recovery following a romantic separation',
    authors: 'Mason AE, Law RW, Bryan AE, Portley RM, Sbarra DA',
    source: 'Personal Relationships',
    year: '2012',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4495909/',
    evidenceLevel: 'estudio-observacional',
    summary:
      'Siguió durante 8 semanas a personas que habían vivido una ruptura reciente. Una menor recuperación del autoconcepto (“¿quién soy sin mi pareja?”) precedió a un menor bienestar y se asoció con seguir amando a la expareja.',
    limitations:
      'Seguimiento corto (8 semanas). Los datos son correlacionales: no permiten concluir causa y efecto.',
    reviewedAt: null,
  },
  {
    id: 'sbarra-2013',
    title: 'Expressive Writing Can Impede Emotional Recovery Following Marital Separation',
    authors: 'Sbarra DA, Boals A, Mason AE, Larson GM, Mehl MR',
    source: 'Clinical Psychological Science',
    year: '2013',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4297672/',
    evidenceLevel: 'ensayo-aleatorizado',
    summary:
      '90 adultos recientemente separados fueron asignados al azar a escritura expresiva tradicional, una variante narrativa o escritura control. Quienes estaban muy enfocados en buscar un significado a la separación evolucionaron peor con la escritura expresiva que con la escritura control.',
    limitations:
      'Muestra moderada y un tipo concreto de escritura. Sugiere que escribir no ayuda a todas las personas por igual, sobre todo si se convierte en dar vueltas a lo mismo; no significa que escribir sea perjudicial en general.',
    reviewedAt: null,
  },
  {
    id: 'oms-paps-2011',
    title: 'Psychological first aid: guide for field workers',
    authors: 'Organización Mundial de la Salud, War Trauma Foundation, World Vision International',
    source: 'Organización Mundial de la Salud',
    year: '2011',
    url: 'https://www.who.int/publications-detail-redirect/9789241548205',
    evidenceLevel: 'guia-institucional',
    summary:
      'Guía sobre primeros auxilios psicológicos: ayuda humana, de apoyo y práctica para personas que atraviesan situaciones de crisis graves, respetando su dignidad, cultura y capacidades.',
    limitations:
      'Está pensada para personas que ayudan en crisis graves, no específicamente para rupturas amorosas. La usamos como referencia de principios de apoyo (escuchar, no presionar, conectar con ayuda).',
    reviewedAt: null,
  },
];
