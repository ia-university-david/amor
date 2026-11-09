import type Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { BillingService } from '../../server/services/billing';
import { makeTestApp, registered } from './helpers';

const SECRET = 'whsec_test_secret';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_dummy', STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_PRICE_MONTHLY: 'price_123' };

async function setup() {
  const t = await makeTestApp(ENV);
  expect(t.deps.billing).toBeInstanceOf(BillingService);
  const stripe: Stripe = t.deps.billing!.stripe;
  return { t, stripe };
}

function subscriptionEvent(id: string, userId: string, status: string) {
  return {
    id,
    object: 'event',
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_1', object: 'subscription', customer: 'cus_1', status, metadata: { userId }, items: { data: [{ current_period_end: 1893456000 }] } } },
  };
}

describe('webhook de Stripe', () => {
  it('rechaza firmas inválidas o ausentes', async () => {
    const { t } = await setup();
    const payload = JSON.stringify(subscriptionEvent('evt_1', 'x', 'active'));
    const noSig = await t.app.request('/api/billing/webhook', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } });
    expect(noSig.status).toBe(400);
    const bad = await t.app.request('/api/billing/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': 't=1,v1=abc' } });
    expect(bad.status).toBe(400);
  });

  it('acepta eventos firmados, activa premium y es idempotente', async () => {
    const { t, stripe } = await setup();
    const { id, c } = await registered(t);
    const payload = JSON.stringify(subscriptionEvent('evt_2', id, 'active'));
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    const res = await t.app.request('/api/billing/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } });
    expect(res.status).toBe(200);
    expect((await res.json()).result).toBe('processed');
    const s = await c.json<{ user: { plan: string; subscriptionStatus: string } }>('/api/auth/session');
    expect(s.body.user).toMatchObject({ plan: 'premium', subscriptionStatus: 'active' });
    const again = await t.app.request('/api/billing/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } });
    expect((await again.json()).result).toBe('duplicate');

    const cancel = JSON.stringify(subscriptionEvent('evt_3', id, 'canceled'));
    await t.app.request('/api/billing/webhook', { method: 'POST', body: cancel, headers: { 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload: cancel, secret: SECRET }) } });
    const s2 = await c.json<{ user: { plan: string } }>('/api/auth/session');
    expect(s2.body.user.plan).toBe('free');
  });

  it('sin Stripe configurado responde «próximamente»', async () => {
    const t = await makeTestApp();
    const status = await t.client().json<{ enabled: boolean }>('/api/billing/status');
    expect(status.body.enabled).toBe(false);
    const { c } = await registered(t);
    expect((await c.json('/api/billing/checkout', { json: { price: 'monthly' } })).status).toBe(503);
  });
});
