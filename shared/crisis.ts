export type CrisisCategory = 'suicidio' | 'autolesion' | 'violencia' | 'peligro';

export interface CrisisResult {
  detected: boolean;
  categories: CrisisCategory[];
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Conservative keyword patterns (applied to accent-free lowercase text).
 * The cost of a false positive is a calm safety screen the person can close;
 * the cost of a false negative is much higher, so patterns lean inclusive
 * while avoiding common idioms like "me muero de ganas".
 */
const PATTERNS: Record<CrisisCategory, RegExp[]> = {
  suicidio: [
    /\bsuicid/,
    /\bquitarme la vida\b/,
    /\bacabar con mi vida\b/,
    /\b(quiero|quisiera|deseo|prefiero) (morir|morirme|estar muert[oa])\b/,
    /\bno quiero (vivir|seguir viviendo|seguir aqui|despertar)\b/,
    /\b(voy a|quiero|pienso|podria) matarme\b/,
    /\bmejor (estaria|estar) muert[oa]\b/,
    /\bacabar con todo\b/,
    /\bno vale la pena (vivir|seguir)\b/,
    /\bdesaparecer para siempre\b/,
    /\bdejar de existir\b/,
  ],
  autolesion: [
    /\bautolesion/,
    /\b(hacerme|hacer me) dano\b/,
    /\bme (corte|corto|cortare|quiero cortar)\b/,
    /\bcortarme\b/,
    /\blastimarme\b/,
    /\bme estoy lastimando\b/,
    /\bme quiero lastimar\b/,
  ],
  violencia: [
    /\bme (pega|pego|golpea|golpeo|empuja|empujo|ahorca|ahorco|estrangula)\b/,
    /\bme (amenaza|amenazo|amenazaron) /,
    /\bme (amenaza|amenazo)$/,
    /\bme (quiere|va a|amenazo con) matar/,
    /\bme (violo|forzo|obligo a tener)\b/,
    /\babuso sexual\b/,
    /\b(voy a|quiero) (matarlo|matarla|hacerle dano)\b/,
    /\bme va a hacer dano\b/,
    /\bmiedo de que me (haga dano|lastime|mate)\b/,
    /\bme (encerro|encierra)\b/,
  ],
  peligro: [
    /\bestoy en peligro\b/,
    /\bno estoy a salvo\b/,
    /\bme (esta|anda) (siguiendo|persiguiendo)\b/,
    /\btiene un (arma|cuchillo|pistola)\b/,
    /\bvino a (mi casa|buscarme) y no se va\b/,
  ],
};

export function detectCrisis(text: string): CrisisResult {
  const normalized = normalizeText(text);
  if (!normalized) return { detected: false, categories: [] };
  const categories = (Object.keys(PATTERNS) as CrisisCategory[]).filter((cat) =>
    PATTERNS[cat].some((re) => re.test(normalized)),
  );
  return { detected: categories.length > 0, categories };
}
