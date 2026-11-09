import { useState } from 'react';
import { Link } from 'react-router-dom';
import { isValidEmail } from '../lib/auth/AuthAdapter';
import { submitLead } from '../lib/leads';
import { Icon } from './Icon';

export function LeadForm({ kind, cta, withMessage = false }: { kind: 'ebook' | 'contacto'; cta: string; withMessage?: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Escribe tu nombre.');
    if (!isValidEmail(email)) return setError('Revisa tu correo electrónico.');
    if (!consent) return setError('Necesitamos tu permiso para contactarte.');
    setError('');
    setStatus('sending');
    try {
      await submitLead({ kind, name: name.trim(), email: email.trim(), message: withMessage ? message.trim() : undefined, consent });
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
          {kind === 'ebook'
            ? 'Recibimos tu solicitud. Te enviaremos el eBook en cuanto el envío por correo esté activo.'
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
