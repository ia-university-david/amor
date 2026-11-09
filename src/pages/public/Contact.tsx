import { Icon } from '../../components/Icon';
import { LeadForm } from '../../components/LeadForm';
import { LINKS } from '../../content/links';

export function Contact() {
  return (
    <div className="container narrow section">
      <span className="eyebrow">Contacto</span>
      <h1>Escríbenos</h1>
      <p className="muted">
        Para preguntas sobre la app, el libro o colaboraciones. Este formulario no es un canal de atención en crisis: si estás en peligro,
        llama al número de emergencias de tu país.
      </p>
      <div className="card">
        <LeadForm kind="contacto" cta="Enviar mensaje" withMessage />
      </div>
      <div className="row" style={{ marginTop: '1.5rem' }}>
        <a className="btn btn-outline" href={LINKS.instagram} target="_blank" rel="noreferrer">
          <Icon name="instagram" size={18} /> Instagram
        </a>
        <a className="btn btn-outline" href={LINKS.youtube} target="_blank" rel="noreferrer">
          <Icon name="youtube" size={18} /> YouTube
        </a>
        <a className="btn btn-outline" href={LINKS.community} target="_blank" rel="noreferrer">
          <Icon name="message" size={18} /> Comunidad
        </a>
      </div>
    </div>
  );
}
