import { Seo } from '../../components/Seo';
import { Link } from 'react-router-dom';
import { Notice } from '../../components/ui';
import { GUIDE_72, GUIDE_72_NOTICE } from '../../content/guide72';

export function Guide72() {
  return (
    <div className="container narrow section">
      <Seo title="Guía de las primeras 72 horas" description="Qué hacer en las primeras 72 horas después de una ruptura dolorosa: pasos pequeños para cuidarte, sin presión y a tu ritmo." path="/guia-72-horas" />
      <span className="eyebrow">Guía práctica</span>
      <h1>Las primeras 72 horas</h1>
      <p className="muted" style={{ fontSize: '1.1rem' }}>
        Hoy no necesitas resolver toda tu vida. Solo encontrar un próximo paso.
      </p>
      <Notice icon="info">{GUIDE_72_NOTICE}</Notice>
      <div className="stack" style={{ marginTop: '2rem', ['--gap' as string]: '1.5rem' }}>
        {GUIDE_72.map((block) => (
          <section key={block.range} className="card">
            <span className="badge">{block.range}</span>
            <h2 style={{ marginTop: '0.75rem' }}>{block.title}</h2>
            <p className="muted">{block.intro}</p>
            <ol className="steps-list">
              {block.steps.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <p className="muted" style={{ margin: 0 }}>
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <div className="card tint-lavanda" style={{ marginTop: '2rem' }}>
        <h3>¿Quieres hacerlo acompañado?</h3>
        <p>La app te ofrece la pausa, la respiración guiada y un espacio privado para escribir, incluso sin conexión.</p>
        <Link to="/bienvenida" className="btn btn-primary">
          Comenzar mi proceso
        </Link>
      </div>
      <p className="small muted" style={{ marginTop: '1.5rem' }}>
        Si estás en peligro o piensas en hacerte daño, llama al número de emergencias de tu país.
      </p>
    </div>
  );
}
