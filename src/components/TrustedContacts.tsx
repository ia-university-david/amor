import { useState } from 'react';
import { useCollection } from '../lib/useCollection';
import { Icon } from './Icon';
import { EmptyState } from './ui';

export interface TrustedContact {
  name: string;
  phone: string;
  whatsapp: boolean;
}

export function contactLinks(c: TrustedContact): { label: string; href: string; external?: boolean }[] {
  const digits = c.phone.replace(/[^\d+]/g, '');
  if (!digits) return [];
  const links: { label: string; href: string; external?: boolean }[] = [
    { label: 'Llamar', href: `tel:${digits}` },
    { label: 'SMS', href: `sms:${digits}` },
  ];
  if (c.whatsapp) links.push({ label: 'WhatsApp', href: `https://wa.me/${digits.replace(/^\+/, '')}`, external: true });
  return links;
}

export function TrustedContactsManager() {
  const { items, add, remove } = useCollection<TrustedContact>('contacts');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    await add({ name: name.trim(), phone: phone.trim(), whatsapp });
    setName('');
    setPhone('');
  };

  return (
    <div className="stack">
      <p className="muted small">
        Personas a las que autorizas que aparezcan en la pausa y en la pantalla de seguridad. Solo se guardan cifradas en este dispositivo;
        la app nunca les escribe por ti.
      </p>
      {items.length === 0 ? (
        <EmptyState icon="users" title="Sin contactos todavía">
          <p className="small">Piensa en alguien a quien te sentirías bien llamando en un momento difícil.</p>
        </EmptyState>
      ) : (
        <ul className="list">
          {items.map(({ id, value }) => (
            <li key={id} className="card row between" style={{ padding: '0.75rem 1rem' }}>
              <span>
                <strong>{value.name}</strong>
                <span className="muted small" style={{ display: 'block' }}>
                  {value.phone}
                  {value.whatsapp ? ' · WhatsApp' : ''}
                </span>
              </span>
              <button type="button" className="icon-btn" aria-label={`Eliminar a ${value.name}`} onClick={() => remove(id)}>
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="card stack">
        <div className="split">
          <div>
            <label htmlFor="tc-name">Nombre</label>
            <input id="tc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="tc-phone">Teléfono (con prefijo de país)</label>
            <input id="tc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+57 300 000 0000" autoComplete="off" />
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} /> Tiene WhatsApp
        </label>
        <button type="submit" className="btn btn-primary" disabled={!name.trim() || !phone.trim()}>
          <Icon name="plus" size={18} /> Añadir contacto
        </button>
      </form>
    </div>
  );
}
