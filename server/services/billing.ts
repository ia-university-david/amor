import Stripe from 'stripe';
import type { Config } from '../config';
import type { DB } from '../db';
import type { Logger } from '../logger';
import { isPremiumStatus } from '../../shared/plans';
import { now } from '../util';
import type { UserRow } from '../context';

export type PriceKey = 'monthly' | 'yearly';

export class BillingService {
  readonly stripe: Stripe;

  constructor(private readonly config: Config, private readonly db: DB, private readonly log: Logger, stripe?: Stripe) {
    this.stripe = stripe ?? new Stripe(config.STRIPE_SECRET_KEY!);
  }

  priceId(key: PriceKey): string | undefined {
    return key === 'monthly' ? this.config.STRIPE_PRICE_MONTHLY : this.config.STRIPE_PRICE_YEARLY;
  }

  availablePrices(): PriceKey[] {
    return (['monthly', 'yearly'] as const).filter((k) => this.priceId(k));
  }

  private async customerFor(user: UserRow): Promise<string> {
    if (user.stripe_customer_id) return user.stripe_customer_id;
    const customer = await this.stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
    await this.db.updateTable('users').set({ stripe_customer_id: customer.id, updated_at: now() }).where('id', '=', user.id).execute();
    return customer.id;
  }

  async checkout(user: UserRow, key: PriceKey): Promise<string> {
    const price = this.priceId(key);
    if (!price) throw new Error('Precio no configurado');
    const origin = new URL(this.config.APP_URL).origin;
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: await this.customerFor(user),
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/app/planes?estado=ok`,
      cancel_url: `${origin}/app/planes?estado=cancelado`,
      subscription_data: { metadata: { userId: user.id } },
      locale: 'es',
    });
    return session.url!;
  }

  async portal(user: UserRow): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: await this.customerFor(user),
      return_url: `${new URL(this.config.APP_URL).origin}/app/planes`,
    });
    return session.url;
  }

  /** Verifies the Stripe signature over the raw body; throws when invalid. */
  async verifyWebhook(rawBody: string, signature: string | undefined): Promise<Stripe.Event> {
    if (!signature) throw new Error('Falta la firma');
    return this.stripe.webhooks.constructEventAsync(rawBody, signature, this.config.STRIPE_WEBHOOK_SECRET!);
  }

  async handleEvent(event: Stripe.Event): Promise<'processed' | 'duplicate' | 'ignored'> {
    const seen = await this.db.selectFrom('stripe_events').select('id').where('id', '=', event.id).executeTakeFirst();
    if (seen) return 'duplicate';
    let handled = false;
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.client_reference_id && s.customer) {
          await this.db
            .updateTable('users')
            .set({ stripe_customer_id: String(s.customer), updated_at: now() })
            .where('id', '=', s.client_reference_id)
            .execute();
        }
        if (s.subscription) {
          const sub = typeof s.subscription === 'string' ? await this.stripe.subscriptions.retrieve(s.subscription) : s.subscription;
          await this.applySubscription(sub);
        }
        handled = true;
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.applySubscription(event.data.object as Stripe.Subscription);
        handled = true;
        break;
    }
    await this.db.insertInto('stripe_events').values({ id: event.id, type: event.type, received_at: now() }).execute();
    this.log.info('billing.webhook', { type: event.type, handled });
    return handled ? 'processed' : 'ignored';
  }

  private async applySubscription(sub: Stripe.Subscription) {
    const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const status = sub.status;
    const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
    const periodEnd = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
    const userId = sub.metadata?.userId;
    let q = this.db.updateTable('users').set({
      plan: isPremiumStatus(status) ? 'premium' : 'free',
      subscription_status: status,
      subscription_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      stripe_customer_id: customer,
      updated_at: now(),
    });
    q = userId ? q.where('id', '=', userId) : q.where('stripe_customer_id', '=', customer);
    await q.execute();
  }

  async cancelAll(user: UserRow): Promise<void> {
    if (!user.stripe_customer_id) return;
    const subs = await this.stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'active' });
    for (const s of subs.data) await this.stripe.subscriptions.cancel(s.id);
  }
}
