import { Seo } from '../../components/Seo';
import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="container narrow section prose">
      <Seo
        title="Privacidad"
        description="Cómo cuida Amor Tóxico tu privacidad: qué se guarda en tu dispositivo, qué se sincroniza con tu cuenta y qué nunca sale de él."
        path="/privacidad"
      />
      <span className="eyebrow">Privacidad</span>
      <h1>Cómo cuidamos tu privacidad</h1>
      <p className="muted">Este texto es informativo y deberá revisarse legalmente antes del lanzamiento.</p>

      <h2>Lo que nunca sale de tu dispositivo</h2>
      <p>
        Tu diario, tus notas, tus cartas sin enviar, tus reflexiones semanales, los aprendizajes que anotas en la pausa, tus contactos de confianza y
        tus conversaciones con el asistente se guardan <strong>solo en tu dispositivo</strong>, dentro del navegador, <strong>cifrados con AES-GCM</strong>.
        La clave se genera en tu dispositivo y no se puede exportar. Estos textos no se sincronizan con ninguna cuenta.
      </p>
      <p>
        Los datos sensibles nunca se guardan en la caché de la aplicación. Solo se almacenan en caché el diseño de la app y el contenido educativo
        público.
      </p>

      <h2>Si usas la app sin cuenta</h2>
      <p>Todo se queda en tu dispositivo. No enviamos nada a nuestros servidores salvo los formularios que tú envías.</p>

      <h2>Si creas una cuenta</h2>
      <ul>
        <li>Guardamos tu correo, una versión protegida de tu contraseña (nunca la contraseña en sí) y la confirmación de que eres mayor de edad.</li>
        <li>
          <strong>Sincronización (opcional):</strong> si la activas, se guardan cifrados en nuestro servidor tu perfil básico (nombre, país e idioma),
          tus ajustes, tu progreso en Mi Camino, tus límites, tu contador de contacto, tus estados de ánimo (solo la emoción) y los datos básicos de
          tus pausas (fecha, intensidad, estrategia). Nunca tus textos libres. Al desactivarla, borramos esa copia.
        </li>
        <li>
          <strong>Copia cifrada de extremo a extremo (opcional):</strong> se cifra en tu dispositivo con una frase que solo tú conoces. Nosotros
          guardamos un archivo que no podemos leer ni recuperar.
        </li>
      </ul>

      <h2>Asistente de inteligencia artificial</h2>
      <p>
        El asistente es una IA de acompañamiento, no una persona ni un terapeuta, y no es Laura Rojas. Sin cuenta, o sin el permiso de análisis de
        texto, responde un asistente guiado que funciona en tu dispositivo. Con cuenta y ese permiso, tus últimos mensajes se envían a un proveedor
        de IA a través de nuestro servidor para generar la respuesta; no guardamos el contenido de las conversaciones en el servidor.
      </p>
      <ul>
        <li>
          <strong>Memoria personalizada:</strong> guardar tus conversaciones y los resúmenes que elijas, cifrados en tu dispositivo. Puedes verlos y
          borrarlos en Perfil.
        </li>
        <li>
          <strong>Análisis de texto sensible:</strong> permitir que el asistente interprete lo que escribes con libertad.
        </li>
      </ul>
      <p>
        Por tu seguridad, los mensajes se revisan para detectar palabras asociadas a riesgo (por ejemplo, hacerse daño o violencia) y mostrarte los
        números de emergencia. Esta revisión ocurre en tu dispositivo y, si usas la IA, también en el servidor antes de llamar al proveedor.
      </p>

      <h2>Comunidad</h2>
      <p>
        Participas con un seudónimo; nadie ve tu nombre ni tu correo. Los mensajes se revisan automáticamente y el equipo de moderación puede leerlos
        para cuidar el espacio. Puedes borrar tus mensajes; si eliminas tu cuenta, quedan anónimos.
      </p>

      <h2>Pagos</h2>
      <p>Los pagos los procesa Stripe. No vemos ni guardamos los datos de tu tarjeta; solo el estado de tu suscripción.</p>

      <h2>Formularios</h2>
      <p>
        Si nos dejas tu nombre y correo para recibir el eBook o para contactarnos, los usamos solo para eso. El eBook se envía solo después de que
        confirmes tu correo.
      </p>

      <h2>Notificaciones</h2>
      <p>
        Solo te enviaremos recordatorios si los activas expresamente, con las horas y las horas de silencio que elijas. Los avisos nunca incluyen lo
        que escribes.
      </p>

      <h2>Métricas</h2>
      <p>El equipo solo ve cifras agregadas y anónimas (por ejemplo, cuántas cuentas hay), nunca lo que escribe una persona concreta.</p>

      <h2>Tus derechos</h2>
      <p>
        Desde <Link to="/app/perfil">Perfil</Link> puedes exportar los datos de tu dispositivo y los de tu cuenta en formato JSON, borrar todo lo
        guardado en tu dispositivo y eliminar tu cuenta. El borrado es inmediato e irreversible.
      </p>

      <h2>Contacto</h2>
      <p>
        Para cualquier consulta sobre privacidad, escríbenos desde la página de <Link to="/contacto">contacto</Link>.
      </p>
    </div>
  );
}
