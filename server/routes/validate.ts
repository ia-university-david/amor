import { zValidator } from '@hono/zod-validator';
import type { ZodType } from 'zod';

/** JSON body validator with a calm Spanish error and field paths (no values echoed back). */
export function body<T extends ZodType>(schema: T) {
  return zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((i) => i.path.join('.')))];
      return c.json({ error: 'Revisa los datos del formulario.', fields }, 400);
    }
  });
}

export function query<T extends ZodType>(schema: T) {
  return zValidator('query', schema, (result, c) => {
    if (!result.success) return c.json({ error: 'Parámetros no válidos.' }, 400);
  });
}
