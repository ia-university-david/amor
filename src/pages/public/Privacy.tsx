import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="container narrow section">
      <span className="eyebrow">Privacidad</span>
      <h1>Cómo cuidamos tu privacidad</h1>
      <p className="muted">Versión de la fase 1. Este texto es informativo y deberá revisarse legalmente antes del lanzamiento.</p>

      <h2>Qué guardamos y dónde</h2>
      <p>
        En esta versión, todo lo que escribes en la aplicación —tu perfil, tus respuestas, tu diario, tus mensajes sin enviar, tus registros
        de la pausa y las conversaciones con el asistente— se guarda <strong>solo en tu dispositivo</strong>, dentro del navegador
        (IndexedDB), <strong>cifrado con AES-GCM</strong>. La clave de cifrado se genera en tu dispositivo y no se puede exportar.
      </p>
      <p>
        Los datos sensibles nunca se guardan en la caché de la aplicación ni se usan para funcionar sin conexión. Solo se almacenan en
        caché el diseño de la app y el contenido educativo público.
      </p>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Para adaptar tu plan inicial y las sugerencias a tu situación.</li>
        <li>Para mostrarte tus propios avances y patrones (por ejemplo, en qué momentos aparecen los impulsos).</li>
        <li>Tu identidad de género nunca se usa para hacer generalizaciones psicológicas.</li>
      </ul>

      <h2>Asistente de inteligencia artificial</h2>
      <p>
        El asistente es una IA de acompañamiento, no una persona ni un terapeuta, y no es Laura Rojas. Tienes dos permisos separados que
        puedes activar o desactivar en cualquier momento desde Perfil:
      </p>
      <ul>
        <li>
          <strong>Memoria personalizada:</strong> guardar tus conversaciones para retomarlas más adelante.
        </li>
        <li>
          <strong>Análisis de texto sensible:</strong> permitir que el asistente interprete lo que escribes con libertad. Sin este permiso,
          el asistente solo responde a los temas que eliges con botones.
        </li>
      </ul>
      <p>
        Por tu seguridad, los mensajes se revisan siempre en tu dispositivo para detectar palabras asociadas a riesgo (por ejemplo, hacerse
        daño o violencia) y mostrarte recursos de emergencia. Esta revisión no envía nada a ningún servidor.
      </p>

      <h2>Formularios</h2>
      <p>
        Si nos dejas tu nombre y correo para recibir el eBook o para contactarnos, los usamos solo para eso. Cuando el envío al servidor no
        está configurado, se guardan cifrados en tu dispositivo.
      </p>

      <h2>Notificaciones</h2>
      <p>Solo te enviaremos recordatorios si los activas expresamente. Puedes desactivarlos cuando quieras.</p>

      <h2>Tus derechos</h2>
      <p>
        Desde <Link to="/app/perfil">Perfil</Link> puedes exportar todos tus datos en formato JSON o borrarlos por completo, incluida la clave
        de cifrado. El borrado es inmediato e irreversible.
      </p>

      <h2>Contacto</h2>
      <p>
        Para cualquier consulta sobre privacidad, escríbenos desde la página de <Link to="/contacto">contacto</Link>.
      </p>
    </div>
  );
}
