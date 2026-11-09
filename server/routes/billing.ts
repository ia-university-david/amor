import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Deps } from '../context';
import { requireUser } from '../middleware/session';
import { rateLimit } from '../middleware/rateLimit';
import { body } from './validate';

export function billingRoutes(deps: Deps) {
  const r = new Hono<AppEnv>();
  const { billing, config, limiter, log } = deps;

  r.get('/status', (c) => {
    const user = c.get('user');
    return c.json({
      enabled: Boolean(billing),
      prices: billing?.availablePrices() ?? [],
      plan: user?.plan ?? 'free',
      subscriptionStatus: user?.subscription_status ?? null,
      periodEnd: user?.subscription_period_end ?? null,
    });
  });

  // Stripe calls this with a signed raw body; it is exempt from the Origin check.
  r.post('/webhook', async (c) => {
    if (!billing) return c.json({ error: 'Pagos no configurados.' }, 503);
    const raw = await c.req.text();
    let event;
    try {
      event = await billing.verifyWebhook(raw, c.req.header('stripe-signature'));
    } catch (err) {
      log.warn('billing.webhook.invalid', { error: (err as Error).message.slice(0, 80) });
      return c.json({ error: 'Firma inválida.' }, 400);
    }
    const result = await billing.handleEvent(event);
    return c.json({ received: true, result });
  });

  r.use('/checkout', requireUser);
  r.use('/portal', requireUser);
  r.use('*', rateLimit(limiter, { name: 'billing', limit: 20, windowMs: 15 * 60_000, trustProxy: config.TRUST_PROXY, by: 'user' }));

  r.post('/checkout', body(z.object({ price: z.enum(['monthly', 'yearly']) })), async (c) => {
    if (!billing) return c.json({ error: 'Los planes estarán disponibles próximamente.' }, 503);
    const price = c.req.valid('json').price;
    if (!billing.priceId(price)) return c.json({ error: 'Ese precio no está disponible.' }, 400);
    try {
      return c.json({ url: await billing.checkout(c.get('user')!, price) });
    } catch (err) {
      log.error('billing.checkout', { error: (err as Error).message.slice(0, 120) });
      return c.json({ error: 'No pudimos abrir el pago. Inténtalo más tarde.' }, 502);
    }
  });

  r.post('/portal', async (c) => {
    if (!billing) return c.json({ error: 'Los planes estarán disponibles próximamente.' }, 503);
    try {
      return c.json({ url: await billing.portal(c.get('user')!) });
    } catch (err) {
      log.error('billing.portal', { error: (err as Error).message.slice(0, 120) });
      return c.json({ error: 'No pudimos abrir la gestión de tu suscripción.' }, 502);
    }
  });

  return r;
}
