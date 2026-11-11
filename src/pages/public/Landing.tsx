import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../../components/Icon';
import { LeadForm } from '../../components/LeadForm';
import { BLOG_POSTS } from '../../content/blog';
import { BRAND, GALLERY, REELS } from '../../content/brand';
import { BRAIN_TOPICS } from '../../content/brain';
import { AUTHOR, BOOK, LINKS } from '../../content/links';
import { CENTRAL_PRINCIPLE } from '../../content/messages';
import { PILLARS } from '../../content/program';
import { useApp } from '../../state/AppContext';
import { BOOK_LD, ORGANIZATION_LD, Seo, WEBSITE_LD, faqLd } from '../../components/Seo';
import { ALWAYS_FREE } from '../../../shared/plans';

const HOW: { title: string; text: string }[] = [
  { title: 'Cuéntanos un poco de ti', text: 'Unas preguntas breves, una por pantalla. Puedes saltarte las que prefieras. Nunca te pediremos relatar lo que te dolió.' },
  { title: 'Recibe un plan inicial', text: 'Un primer objetivo realista, dos herramientas para empezar y una actividad de menos de cinco minutos.' },
  { title: 'Avanza a tu ritmo', text: 'Un programa en cinco pilares, herramientas para los momentos difíciles y un espacio privado para escribir.' },
];

const FOR_WHO = [
  'Acabas de terminar una relación y todo se siente muy cerca.',
  'Terminaste hace tiempo, pero sigue afectándote.',
  'Sigues en una relación que te hace daño y buscas claridad.',
  'Necesitas mantener contacto por hijos, trabajo o asuntos legales.',
  'Sientes que te perdiste a ti en el camino.',
];

const TOOLS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'pause', title: 'Necesito una pausa', text: 'Para cuando aparecen las ganas de escribir, llamar o revisar sus redes. No te bloquea: te devuelve la posibilidad de elegir.' },
  { icon: 'wind', title: 'Respiración y anclaje', text: 'Respiración cómoda guiada, o un ejercicio con los cinco sentidos si respirar te incomoda.' },
  { icon: 'pen', title: 'Escribir sin enviar', text: 'Di lo que necesitas decir en un espacio cifrado que nadie más leerá.' },
  { icon: 'cloud', title: 'Hoy fue difícil', text: 'Si pasó algo que no esperabas, entenderlo sin juzgarte. Un momento difícil no borra lo que has aprendido.' },
];

const FAQ: { q: string; a: string }[] = [
  { q: '¿Esto es terapia?', a: 'No. Es una herramienta de acompañamiento y educación emocional. No hace diagnósticos ni reemplaza a un profesional de la salud mental. Si lo necesitas, te animamos a buscar ese apoyo.' },
  { q: '¿En cuántos días voy a superar mi ruptura?', a: 'No existe un calendario universal, y no vamos a prometerte uno. Cada proceso es distinto y no es una línea recta.' },
  { q: '¿Quién lee lo que escribo?', a: 'Nadie más que tú. Tu diario, tus cartas sin enviar, tus reflexiones y tus conversaciones se guardan cifrados en tu dispositivo y nunca se sincronizan. Si creas una cuenta, solo se sincronizan tu progreso y tus ajustes, y solo si lo permites. También puedes guardar una copia cifrada que solo se abre con tu frase.' },
  { q: '¿Necesito crear una cuenta?', a: 'No. Puedes usar la app como invitado y todo se queda en tu dispositivo. Una cuenta te permite sincronizar tu progreso entre dispositivos, participar en la comunidad anónima y conversar con el asistente de IA.' },
  { q: '¿El asistente es Laura Rojas?', a: 'No. El asistente es una inteligencia artificial de acompañamiento, claramente identificada como tal. No es Laura ni un terapeuta.' },
  { q: '¿Tengo que dejar de hablar con mi expareja?', a: 'No necesariamente. Tú decides qué tipo de contacto quieres sostener. Si tienen hijos, trabajo o asuntos legales en común, el contacto necesario nunca se considera un retroceso.' },
  { q: '¿Funciona sin conexión?', a: 'Sí. Puedes instalarla en tu teléfono y usar la pausa, tus herramientas y el contenido educativo sin internet.' },
];

export function Landing() {
  const { settings } = useApp();
  const startTo = settings.onboardingComplete ? '/app' : '/bienvenida?paso=bienvenida';
  const [photo, setPhoto] = useState<number | null>(null);
  useEffect(() => {
    if (photo === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhoto(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo]);
  return (
    <>
      <Seo path="/" image={BRAND.og} jsonLd={[ORGANIZATION_LD, WEBSITE_LD, BOOK_LD, faqLd(FAQ)]} />
      <section className="hero">
        <div className="brand-reels" aria-label="Reels de Instagram">
          {REELS.map((reel) => (
            <a key={reel.code} href={`https://www.instagram.com/reel/${reel.code}/`} target="_blank" rel="noreferrer">
              <img src={reel.src} alt="Reel de @lamortoxico" width={148} height={262} />
            </a>
          ))}
        </div>
        <div className="container hero-copy fade-in">
          <img className="brand-wordmark" src={BRAND.wordmark} alt="Amor Tóxico" width={520} height={203} />
          <h1>El amor no debería doler.</h1>
          <p className="lead">Sanar nuestros traumas y construir mejores relaciones es posible. Yo te ayudo.</p>
          <p className="lead">
            Aquí puedes identificar patrones dañinos, soltar el dolor y recuperar tu identidad. Cuando quieras ir más adentro, la plataforma
            te acompaña con el recorrido del libro, la pausa y un espacio privado.
          </p>
          <div className="row" style={{ marginTop: '1.75rem' }}>
            <Link to={startTo} className="btn btn-primary">
              Comenzar mi proceso <Icon name="next" size={18} />
            </Link>
            <a href="#libro" className="btn btn-outline">
              Conocer el libro de Laura Rojas
            </a>
          </div>
          <div className="brand-tiles">
            <a className="brand-tile tile-amazon" href={LINKS.book} target="_blank" rel="noreferrer">
              <Icon name="book" />
              Comprar en Amazon
            </a>
            <Link className="brand-tile tile-test" to="/test">
              <Icon name="heart" />
              ¿Tienes un amor tóxico?
            </Link>
            <a className="brand-tile tile-whatsapp" href={LINKS.community} target="_blank" rel="noreferrer">
              <Icon name="message" />
              Únete a la comunidad
            </a>
            <Link className="brand-tile tile-guide" to="/guia-72-horas">
              <Icon name="book" />
              Guía: 72 horas post-ruptura
            </Link>
            <a className="brand-tile tile-ebook" href="#ebook">
              <Icon name="download" />
              Descarga el eBook gratis
            </a>
          </div>
          <p className="small muted" style={{ marginTop: '1.25rem' }}>
            Acompañamiento y educación. No es terapia ni atención médica automatizada.
          </p>
        </div>
      </section>

      <section className="section" aria-label="Principio">
        <div className="container">
          <p className="principle">“{CENTRAL_PRINCIPLE}”</p>
        </div>
      </section>

      <section className="section alt" id="que-es">
        <div className="container split" style={{ alignItems: 'center', gap: '2rem' }}>
          <div>
            <span className="eyebrow">Qué es</span>
            <h2>Un espacio para atravesar una ruptura o una relación que duele</h2>
            <p>
              Amor Tóxico es una aplicación de acompañamiento inspirada en el libro de {AUTHOR.name}. Te ayuda a entender lo que sientes, a
              crear una pausa entre el impulso y la acción, y a recuperar tus límites, tu autoestima y tu identidad.
            </p>
          </div>
          <div className="card tint-niebla stack">
            <h3>Lo que no es</h3>
            <p style={{ margin: 0 }}>
              No es terapia, no hace diagnósticos y no promete que te recuperarás en un número de días. No etiqueta a nadie. Si estás en
              peligro, llama al número de emergencias de tu país.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="como-funciona">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Cómo funciona</span>
            <h2>Empieza con lo que necesitas hoy</h2>
          </div>
          <ol className="steps-list grid" style={{ ['--min' as string]: '260px' }}>
            {HOW.map((h) => (
              <li key={h.title}>
                <h3>{h.title}</h3>
                <p className="muted">{h.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section alt" id="para-quien">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Para quién</span>
            <h2>Para ti, si…</h2>
          </div>
          <ul className="grid list" style={{ ['--min' as string]: '240px' }}>
            {FOR_WHO.map((f) => (
              <li key={f} className="card row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                <Icon name="check" className="muted" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="cerebro">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Qué pasa en el cerebro</span>
            <h2>Por qué sigues pensando en esa persona</h2>
            <p className="muted">
              Explicaciones sencillas, con ejemplos cotidianos y con las limitaciones de cada estudio a la vista. Sin promesas, sin
              exageraciones.
            </p>
          </div>
          <div className="grid">
            {BRAIN_TOPICS.slice(0, 3).map((t) => (
              <Link key={t.id} to={`/cerebro/${t.id}`} className="card card-link">
                <span className="card-icon">
                  <Icon name="brain" />
                </span>
                <h3>{t.title}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {t.summary}
                </p>
              </Link>
            ))}
          </div>
          <Link to="/cerebro" className="btn btn-outline" style={{ marginTop: '1.5rem' }}>
            Ver los 15 temas
          </Link>
        </div>
      </section>

      <section className="section alt" id="herramientas">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">Herramientas para momentos difíciles</span>
            <h2>Puedes sentir el impulso sin actuar inmediatamente</h2>
          </div>
          <div className="grid">
            {TOOLS.map((t) => (
              <div key={t.title} className="card">
                <span className="card-icon">
                  <Icon name={t.icon} />
                </span>
                <h3>{t.title}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {t.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="programa">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow">El programa</span>
            <h2>Cinco pilares para volver a ti</h2>
          </div>
          <ol className="steps-list">
            {PILLARS.map((p) => (
              <li key={p.id}>
                <h3 style={{ marginBottom: '0.2rem' }}>{p.title}</h3>
                <p className="muted" style={{ margin: 0 }}>
                  {p.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section alt" id="libro">
        <div className="container book-grid">
          <img className="book-photo" src={BRAND.bookScene} alt="Laura Rojas en la FIL Guadalajara, con el libro Amor Tóxico sobre la mesa" />
          <div>
            <span className="eyebrow">El libro</span>
            <h2>
              {BOOK.title}, de {AUTHOR.name}
            </h2>
            <p>{BOOK.description}</p>
            <p className="small muted">Aprenderás:</p>
            <ul>
              {BOOK.learn.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="small muted">
              {AUTHOR.name}: {AUTHOR.bio.charAt(0).toLowerCase() + AUTHOR.bio.slice(1)}
            </p>
            <a className="btn btn-primary" href={LINKS.book} target="_blank" rel="noreferrer">
              Comprar el libro en Amazon <Icon name="external" size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="autora">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
            <h2>Sobre la autora</h2>
            <div className="gold-rule" />
          </div>
          <div className="author-grid">
            <img className="author-portrait" src={BRAND.author} alt="Laura Rojas, autora de Amor Tóxico" />
            <div className="stack">
              <h3>{AUTHOR.name}</h3>
              <p>
                {AUTHOR.name} es escritora y conferencista especializada en relaciones humanas y sanación emocional. Con su libro y su
                presencia en redes ha creado una comunidad donde las personas encuentran comprensión y herramientas para liberarse del dolor
                y reencontrarse consigo mismas.
              </p>
              <p className="pull-quote">“Mi misión es ayudarte a reconocer tu valor y recuperar tu libertad emocional.”</p>
              <div className="row">
                <a className="btn btn-primary" href={LINKS.instagram} target="_blank" rel="noreferrer">
                  <Icon name="instagram" size={18} /> Sígueme en Instagram
                </a>
                <a className="btn btn-outline" href={LINKS.youtube} target="_blank" rel="noreferrer">
                  <Icon name="youtube" size={18} /> Canal de YouTube
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt" id="galeria">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', marginLeft: 'auto', marginRight: 'auto' }}>
            <h2>Galería</h2>
            <p className="muted">Momentos de presentaciones, firmas de libros y eventos de Amor Tóxico.</p>
            <div className="gold-rule" />
          </div>
          <div className="gallery-grid">
            {GALLERY.map((item, index) => (
              <button key={item.src} type="button" onClick={() => setPhoto(index)}>
                <img src={item.src} alt={item.alt} />
              </button>
            ))}
          </div>
        </div>
      </section>
      {photo !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={GALLERY[photo].alt} onClick={() => setPhoto(null)}>
          <button type="button" className="icon-btn lightbox-close" aria-label="Cerrar galería" onClick={() => setPhoto(null)}>
            <Icon name="close" />
          </button>
          <img src={GALLERY[photo].src} alt={GALLERY[photo].alt} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <section className="section" id="test">
        <div className="container split" style={{ gap: '1.25rem' }}>
          <div className="card tint-niebla stack">
            <span className="eyebrow">Test</span>
            <h2>¿Tienes un amor tóxico?</h2>
            <p>Siete preguntas para orientarte y reflexionar. No es un diagnóstico.</p>
            <Link to="/test" className="btn btn-primary">
              Hacer el test
            </Link>
          </div>
          <div className="card tint-verde stack" id="guia">
            <span className="eyebrow">Guía práctica</span>
            <h2>Las primeras 72 horas</h2>
            <p>Qué hacer cuando todo acaba de pasar: cuidar lo básico, poner un poco de orden y mirar los próximos días.</p>
            <Link to="/guia-72-horas" className="btn btn-outline">
              Leer la guía
            </Link>
          </div>
        </div>
      </section>

      <section className="section alt" id="articulos">
        <div className="container">
          <div className="section-head row between">
            <div>
              <span className="eyebrow">Artículos</span>
              <h2>Para leer con calma</h2>
            </div>
            <Link to="/blog">Ver todos</Link>
          </div>
          <div className="grid">
            {BLOG_POSTS.filter((p) => p.body.trim() && p.status !== 'pendiente-migracion')
              .slice(0, 3)
              .map((p) => (
              <Link key={p.slug} to={`/blog/${p.slug}`} className="card card-link">
                <span className="badge">{p.category}</span>
                <h3 style={{ marginTop: '0.75rem' }}>{p.title}</h3>
                {p.readingMinutes && <p className="small muted">{p.readingMinutes} min de lectura</p>}
              </Link>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: '1rem' }}>
            Los artículos de Laura Rojas conservan su dirección. El texto completo se publicará aquí cuando esté autorizado, sin cambiar lo que ya escribió.
          </p>
        </div>
      </section>

      <section className="section" id="comunidad">
        <div className="container split" style={{ gap: '1.25rem' }}>
          <div className="card stack" id="ebook">
            <span className="eyebrow">eBook gratuito</span>
            <h2>Recibe el eBook</h2>
            <p className="muted">Déjanos tu nombre y correo y te lo enviaremos.</p>
            <LeadForm kind="ebook" cta="Quiero el eBook" />
          </div>
          <div className="card tint-lavanda stack">
            <span className="eyebrow">Comunidad</span>
            <h2>No tienes que atravesarlo en soledad</h2>
            <p>Participa en la comunidad anónima y moderada de la app, únete al grupo de WhatsApp o sigue el contenido de Amor Tóxico en redes.</p>
            <div className="row">
              <Link className="btn btn-primary" to="/app/comunidad">
                <Icon name="users" size={18} /> Comunidad anónima
              </Link>
              <a className="btn btn-outline" href={LINKS.community} target="_blank" rel="noreferrer">
                <Icon name="message" size={18} /> Grupo de WhatsApp
              </a>
              <a className="btn btn-outline" href={LINKS.instagram} target="_blank" rel="noreferrer">
                <Icon name="instagram" size={18} /> @lamortoxico
              </a>
              <a className="btn btn-outline" href={LINKS.youtube} target="_blank" rel="noreferrer">
                <Icon name="youtube" size={18} /> YouTube
              </a>
            </div>
            <p className="small muted">
              Los espacios de la comunidad son entre personas y no sustituyen la ayuda profesional. <Link to="/comunidad/normas">Normas de la comunidad</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section alt" id="faq">
        <div className="container narrow">
          <span className="eyebrow">Preguntas frecuentes</span>
          <h2>Lo que suelen preguntarnos</h2>
          {FAQ.map((f) => (
            <details key={f.q} className="faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section" id="planes">
        <div className="container narrow" style={{ textAlign: 'center' }}>
          <span className="eyebrow">Planes</span>
          <h2>Planes y precios</h2>
          <p className="muted">Lo esencial para tu seguridad es gratis, siempre:</p>
          <ul className="small" style={{ textAlign: 'left', display: 'inline-block', margin: '0 auto 1rem' }}>
            {ALWAYS_FREE.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <div>
            <Link to="/planes" className="btn btn-outline">
              Ver los planes
            </Link>
          </div>
        </div>
      </section>

      <section className="section alt" id="contacto">
        <div className="container split" style={{ gap: '1.25rem' }}>
          <div className="stack">
            <span className="eyebrow">Contacto</span>
            <h2>¿Quieres escribirnos?</h2>
            <p className="muted">Para preguntas sobre la app, el libro o colaboraciones.</p>
            <Link to="/contacto" className="btn btn-outline">
              Ir al formulario de contacto
            </Link>
          </div>
          <div className="stack">
            <span className="eyebrow">Privacidad</span>
            <h2>Tus datos son tuyos</h2>
            <p className="muted">
              Lo que escribes se guarda cifrado en tu dispositivo y nunca se sincroniza. Puedes exportarlo o borrarlo todo cuando quieras.
            </p>
            <Link to="/privacidad" className="btn btn-outline">
              Leer cómo cuidamos tu privacidad
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
