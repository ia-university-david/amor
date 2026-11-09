import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isValidEmail } from '../lib/auth/AuthAdapter';
import { submitLead, type LeadResult } from '../lib/leads';
import { Icon } from './Icon';

export function LeadForm({ kind, cta, withMessage = false }: { kind: 'ebook' | 'contacto'; cta: string; withMessage?: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [website, setWebsite] = useState('');
  const [result, setResult] = useState<LeadResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Escribe tu nombre.');
    if (!isValidEmail(email)) return setError('Revisa tu correo electrónico.');
    if (withMessage && message.trim().length < 5) return setError('Escribe tu mensaje.');
    if (!consent) return setError('Necesitamos tu permiso para contactarte.');
    setError('');
    setStatus('sending');
    try {
      const r = await submitLead({ kind, name: name.trim(), email: email.trim(), message: withMessage ? message.trim() : undefined, consent, website });
      if (!r.ok) {
        setStatus('idle');
        return setError(r.error ?? 'Revisa los datos del formulario.');
      }
      setResult(r);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="notice" role="status">
        <Icon name="check" size={20} />
        <div>
          <strong>Gracias, {name.split(' ')[0]}.</strong>{' '}
          {result?.delivered === 'local'
            ? 'No pudimos conectar con el servidor; guardamos tu solicitud en este dispositivo y la enviaremos en cuanto haya conexión.'
            : kind === 'ebook'
              ? result?.status === 'confirmed'
                ? 'Te volvimos a enviar el eBook a tu correo.'
                : 'Te enviamos un correo para confirmar tu dirección. Al confirmarla, te llegará el eBook. Revisa también la carpeta de spam.'
              : 'Recibimos tu mensaje. Te responderemos lo antes posible.'}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="stack" style={{ ['--gap' as string]: '0.25rem' }}>
      <div className="split">
        <div className="field">
          <label htmlFor={`${kind}-name`}>Nombre</label>
          <input id={`${kind}-name`} type="text" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={`${kind}-email`}>Correo electrónico</label>
          <input id={`${kind}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
      </div>
      {withMessage && (
        <div className="field">
          <label htmlFor={`${kind}-msg`}>Mensaje</label>
          <textarea id={`${kind}-msg`} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      )}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label htmlFor={`${kind}-website`}>No completes este campo</label>
        <input id={`${kind}-website`} type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="check small" style={{ marginBottom: '0.75rem' }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Acepto que usen mis datos para responderme. Puedo pedir su eliminación cuando quiera. <Link to="/privacidad">Privacidad</Link>
        </span>
      </label>
      {error && (
        <p role="alert" className="small" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      {status === 'error' && <p role="alert">No pudimos enviar el formulario. Inténtalo de nuevo.</p>}
      <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : cta}
      </button>
    </form>
  );
}
