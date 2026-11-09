import { Link } from 'react-router-dom';
import { Seo } from '../../components/Seo';
import { EmergencyNumbers } from '../../components/Safety';
import { LINKS } from '../../content/links';

export function Normas() {
  return (
    <div className="container narrow section prose">
      <Seo
        title="Normas de la comunidad"
        description="Cómo cuidamos el espacio anónimo de la comunidad de Amor Tóxico: respeto, privacidad, moderación y seguridad."
        path="/comunidad/normas"
      />
      <span className="eyebrow">Comunidad</span>
      <h1>Normas de la comunidad</h1>
      <p className="muted">
        La comunidad es un espacio entre pares para compartir lo que vives después de una relación que te hizo daño. Estas normas existen para que
        todas las personas puedan sentirse seguras.
      </p>

      <h2>1. Habla de ti, no por otras personas</h2>
      <p>
        Comparte tu experiencia y lo que te ha servido. Evita diagnosticar o etiquetar a nadie (ni a ti, ni a quien escribe, ni a tu expareja).
        No sabemos lo que ocurrió en la vida de otra persona.
      </p>

      <h2>2. Cuida la privacidad</h2>
      <ul>
        <li>Participas con un seudónimo. No compartas tu nombre completo, teléfono, correo, dirección ni redes sociales.</li>
        <li>No publiques datos, fotos ni capturas de otras personas, incluida tu expareja.</li>
        <li>Lo que se comparte aquí, se queda aquí: no lo copies fuera de la comunidad.</li>
      </ul>

      <h2>3. Respeto siempre</h2>
      <p>
        No se permiten insultos, burlas, acoso, lenguaje de odio, contenido sexual ni presiones para que alguien tome una decisión. Puedes no estar
        de acuerdo con cariño.
      </p>

      <h2>4. Sin publicidad ni consejos profesionales</h2>
      <p>
        No se permite promocionar servicios, productos ni enlaces externos. La comunidad no sustituye la ayuda de profesionales de la salud mental;
        si alguien lo necesita, anímale a buscar ese apoyo.
      </p>

      <h2>5. Si alguien está en riesgo</h2>
      <p>
        Si un mensaje sugiere que alguien puede hacerse daño o está en peligro, repórtalo con «Creo que esta persona está en riesgo». El equipo de
        moderación lo revisa con prioridad. La comunidad no puede atender emergencias:
      </p>
      <EmergencyNumbers />

      <h2>Cómo moderamos</h2>
      <ul>
        <li>Revisamos automáticamente cada mensaje. Si detectamos posibles datos personales, enlaces, agresiones o señales de riesgo, el mensaje queda en revisión antes de publicarse.</li>
        <li>Cuando varias personas reportan un mensaje, se oculta mientras el equipo lo revisa.</li>
        <li>El equipo puede ocultar o retirar mensajes y pausar temporalmente la participación de una cuenta que no respete las normas.</li>
        <li>Puedes eliminar tus propios mensajes cuando quieras. Si eliminas tu cuenta, tus mensajes quedan anónimos como «Cuenta eliminada».</li>
      </ul>

      <h2>Grupo de WhatsApp</h2>
      <p>
        También existe un <a href={LINKS.community} target="_blank" rel="noopener noreferrer">grupo de la comunidad en WhatsApp</a>. Allí aplican
        estas mismas normas, pero ten en cuenta que tu número de teléfono es visible para el resto del grupo.
      </p>

      <p>
        <Link to="/app/comunidad" className="btn btn-primary">
          Ir a la comunidad
        </Link>
      </p>
    </div>
  );
}
