import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Seo } from '../../components/Seo';
import { Notice, formatDate } from '../../components/ui';
import { api } from '../../lib/api';
import { STATIC, toPlan, useContent } from '../../lib/content';
import { useApp } from '../../state/AppContext';
import { ALWAYS_FREE, isPremiumStatus, type PlanConfig } from '../../../shared/plans';

interface BillingStatus {
  enabled: boolean;
  prices: ('monthly' | 'yearly')[];
  plan: 'free' | 'premium';
  subscriptionStatus: string | null;
  periodEnd: string | null;
}

const PRICE_LABEL = { monthly: 'Pagar mensual', yearly: 'Pagar anual' };

export function Planes({ inApp = false }: { inApp?: boolean }) {
  const { session, refreshSession } = useApp();
  const { items: plans } = useContent<PlanConfig, PlanConfig>('plan', toPlan, STATIC.plans);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [params] = useSearchParams();
  const result = params.get('estado');
  const signedIn = session?.mode === 'remote';

  useEffect(() => {
    void api<BillingStatus>('/billing/status').then((r) => setStatus(r.ok ? r.data : { enabled: false, prices: [], plan: 'free', subscriptionStatus: null, periodEnd: null }));
    if (result === 'ok') void refreshSession();
  }, [result, refreshSession]);

  const premium = status ? status.plan === 'premium' || isPremiumStatus(status.subscriptionStatus) : false;

  const go = async (path: '/billing/checkout' | '/billing/portal', price?: 'monthly' | 'yearly') => {
    setBusy(price ?? 'portal');
    setError(null);
    const r = await api<{ url: string }>(path, { json: price ? { price } : {} });
    setBusy(null);
    if (r.ok && r.data?.url) window.location.assign(r.data.url);
    else setError(r.error ?? 'No se pudo abrir el pago.');
  };

  return (
    <div className={inApp ? 'stack' : 'container section stack'} style={{ ['--gap' as string]: '1.5rem' }}>
      <Seo
        title="Planes"
        description="Las herramientas de seguridad y la pausa son gratuitas siempre. Conoce lo que incluye cada plan de Amor Tóxico."
        path="/planes"
        noindex={inApp}
      />
      <header className="section-head" style={{ marginBottom: 0 }}>
        <span className="eyebrow">Planes</span>
        <h1>Acompañamiento a tu medida</h1>
        <p className="muted">Lo esencial para tu seguridad y para los momentos difíciles es gratis, siempre, con o sin cuenta.</p>
      </header>

      {result === 'ok' && <Notice icon="check">Gracias. Tu suscripción se está activando; puede tardar unos segundos en reflejarse.</Notice>}
      {result === 'cancelado' && <Notice icon="info">No se realizó ningún cobro.</Notice>}
      {status && !status.enabled && (
        <Notice icon="clock">
          <strong>Planes próximamente.</strong> Por ahora todas las funciones disponibles son gratuitas mientras preparamos el plan premium.
        </Notice>
      )}
      {error && <Notice tone="warn">{error}</Notice>}

      <div className="grid" style={{ ['--min' as string]: '260px' }}>
        {plans.map((p) => {
          const current = signedIn && ((p.id === 'premium' && premium) || (p.id === 'free' && !premium));
          return (
            <article key={p.id} className={`card stack${p.highlighted ? ' tint-lilac' : ''}`} style={{ ['--gap' as string]: '0.75rem' }}>
              <div className="row between">
                <h2 style={{ margin: 0, fontSize: '1.35rem' }}>{p.name}</h2>
                {current && <span className="badge">Tu plan</span>}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {p.tagline}
              </p>
              <p className="stat" style={{ margin: 0, fontSize: '1.5rem' }}>
                {p.priceLabel}
              </p>
              <ul className="stack small" style={{ ['--gap' as string]: '0.35rem', paddingLeft: '1.1rem', margin: 0 }}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {p.id === 'premium' &&
                (premium && signedIn ? (
                  <div className="stack" style={{ ['--gap' as string]: '0.4rem' }}>
                    {status?.periodEnd && <p className="small muted">Renovación o fin del periodo: {formatDate(status.periodEnd, { dateStyle: 'long' })}</p>}
                    <button type="button" className="btn btn-outline" disabled={busy !== null || !status?.enabled} onClick={() => go('/billing/portal')}>
                      <Icon name="card" size={18} /> Gestionar suscripción
                    </button>
                  </div>
                ) : !status?.enabled ? (
                  <button type="button" className="btn btn-outline" disabled>
                    Próximamente
                  </button>
                ) : !signedIn ? (
                  <Link to="/entrar?modo=registro&volver=/app/planes" className="btn btn-primary">
                    Crear cuenta para suscribirme
                  </Link>
                ) : (
                  <div className="row">
                    {status.prices
                      .filter((k) => p.priceKeys.length === 0 || p.priceKeys.includes(k))
                      .map((k) => (
                        <button key={k} type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => go('/billing/checkout', k)}>
                          <Icon name="card" size={18} /> {busy === k ? 'Abriendo…' : PRICE_LABEL[k]}
                        </button>
                      ))}
                  </div>
                ))}
            </article>
          );
        })}
      </div>

      <section className="card stack" aria-labelledby="free-h">
        <h2 id="free-h" style={{ fontSize: '1.15rem', margin: 0 }}>
          Siempre gratis
        </h2>
        <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
          {ALWAYS_FREE.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="small muted" style={{ margin: 0 }}>
          Los pagos se procesan con Stripe. No guardamos los datos de tu tarjeta. Puedes cancelar cuando quieras desde «Gestionar suscripción».
        </p>
      </section>
    </div>
  );
}

export function PlanesApp() {
  return <Planes inApp />;
}
