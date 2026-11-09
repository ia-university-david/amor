import { Link } from 'react-router-dom';
import { EMERGENCY_NUMBERS } from '../content/links';
import { useCollection } from '../lib/useCollection';
import { Icon } from './Icon';
import { Modal } from './ui';
import type { TrustedContact } from './TrustedContacts';
import { contactLinks } from './TrustedContacts';

export function EmergencyNumbers() {
  return (
    <div className="stack" style={{ ['--gap' as string]: '0.75rem' }}>
      <p>
        Si estás en peligro o piensas en hacerte daño, <strong>llama ahora al número de emergencias de tu país</strong>. Algunos de ellos:
      </p>
      <ul className="list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {EMERGENCY_NUMBERS.map((e) => (
          <li key={e.country}>
            <a className="btn btn-outline btn-block" href={`tel:${e.number}`}>
              <Icon name="phone" size={18} /> {e.number} · {e.country}
            </a>
          </li>
        ))}
      </ul>
      <p className="small muted">Si no estás en estos países, marca el número de emergencias local. Si puedes, ve a un lugar seguro y busca a alguien cerca.</p>
    </div>
  );
}

export function TrustedQuickList() {
  const { items } = useCollection<TrustedContact>('contacts');
  if (!items.length) {
    return (
      <p className="small">
        Aún no tienes contactos de confianza guardados. <Link to="/app/perfil#contactos">Añadir uno</Link>.
      </p>
    );
  }
  return (
    <ul className="list">
      {items.map(({ id, value }) => (
        <li key={id} className="row between card" style={{ padding: '0.75rem 1rem' }}>
          <strong>{value.name}</strong>
          <span className="row">
            {contactLinks(value).map((l) => (
              <a key={l.href} className="btn btn-sm btn-outline" href={l.href} target={l.external ? '_blank' : undefined} rel="noreferrer">
                {l.label}
              </a>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CrisisScreen({ onClose, context = 'asistente' }: { onClose: () => void; context?: 'asistente' | 'comunidad' }) {
  return (
    <Modal title="Tu seguridad es lo primero" onClose={onClose}>
      <div className="stack">
        <p>
          Lo que escribiste es importante. No estás solo ni sola en esto, y mereces ayuda ahora mismo de una persona.
          {context === 'asistente'
            ? 'Este asistente es una inteligencia artificial y no puede atender una emergencia.'
            : 'La comunidad es un espacio entre pares y no puede atender una emergencia; tu mensaje lo revisará primero el equipo de moderación.'}
        </p>
        <EmergencyNumbers />
        <h3>Personas de confianza</h3>
        <p className="small muted">Llamar o escribir a alguien cercano puede ayudarte a no atravesar esto en soledad.</p>
        <TrustedQuickList />
        <button type="button" className="btn btn-outline btn-block" onClick={onClose}>
          {context === 'asistente' ? 'Volver a la conversación' : 'Volver a la comunidad'}
        </button>
      </div>
    </Modal>
  );
}

export function GentleSafetyCard() {
  return (
    <div className="card tint-coral stack">
      <h3>Tu seguridad importa</h3>
      <p>
        Mencionaste violencia o amenazas. No necesitas contar nada más aquí. Si en algún momento te sientes en peligro, llama al
        número de emergencias de tu país (por ejemplo, 123 en Colombia, 911 en México y Estados Unidos, 112 en España y la Unión Europea).
      </p>
      <p className="small">
        Puede ayudarte guardar un contacto de confianza y pensar en un lugar seguro al que ir. Un profesional o una organización de apoyo
        de tu país puede acompañarte a preparar un plan de protección.
      </p>
    </div>
  );
}
