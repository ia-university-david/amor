import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ChoiceList, EmptyState, IntensitySlider, MultiChoice, Progress, formatDate } from '../../components/ui';
import { QUOTE_NOTICE } from '../../content/quotes';
import { EXERCISES, MODULES, type ExerciseStep } from '../../content/program';
import { useModuleProgress } from '../../lib/progress';
import { useCollection } from '../../lib/useCollection';

type Answers = Record<string, string | number | string[] | Record<string, number>>;

interface ExerciseRecord {
  exerciseId: string;
  answers: Answers;
  completedAt: string;
}

function StepView({ step, value, onChange }: { step: ExerciseStep; value: Answers[string] | undefined; onChange: (v: Answers[string]) => void }) {
  switch (step.type) {
    case 'info':
      return (
        <div className="card tint-niebla">
          {step.title && <h3>{step.title}</h3>}
          <p style={{ margin: 0 }}>{step.text}</p>
        </div>
      );
    case 'text':
      return (
        <div className="field">
          <label htmlFor={step.id} style={{ fontSize: '1.15rem' }}>
            {step.prompt}
          </label>
          {step.help && <p className="small muted">{step.help}</p>}
          <textarea id={step.id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'choice': {
      const v = (value as string) ?? '';
      const isOther = v !== '' && !step.options.includes(v);
      return (
        <div>
          <h3>{step.prompt}</h3>
          <ChoiceList
            label={step.prompt}
            options={[...step.options.map((o) => ({ id: o, label: o })), ...(step.allowOther ? [{ id: '__otro', label: 'Otro pensamiento' }] : [])]}
            value={isOther ? '__otro' : v}
            onChange={(id) => onChange(id === '__otro' ? ' ' : id)}
            min={280}
          />
          {(isOther || v === ' ') && (
            <div className="field" style={{ marginTop: '1rem' }}>
              <label htmlFor={`${step.id}-otro`}>Escríbelo con tus palabras</label>
              <input id={`${step.id}-otro`} type="text" value={v.trim()} onChange={(e) => onChange(e.target.value || ' ')} />
            </div>
          )}
        </div>
      );
    }
    case 'multi':
      return (
        <div>
          <h3>{step.prompt}</h3>
          <MultiChoice label={step.prompt} options={step.options.map((o) => ({ id: o, label: o }))} values={(value as string[]) ?? []} onChange={onChange} min={280} />
        </div>
      );
    case 'scale':
      return (
        <div>
          <h3>{step.prompt}</h3>
          <IntensitySlider label={step.prompt} value={(value as number) ?? Math.round((step.min + step.max) / 2)} onChange={onChange} min={step.min} max={step.max} minLabel={step.minLabel} maxLabel={step.maxLabel} />
        </div>
      );
    case 'rate-list': {
      const v = (value as Record<string, number>) ?? {};
      return (
        <div>
          <h3>{step.prompt}</h3>
          <div className="stack">
            {step.items.map((item) => (
              <div key={item.id} className="card" style={{ padding: '1rem' }}>
                <strong id={`rl-${item.id}`}>{item.label}</strong>
                <p className="small muted" style={{ margin: '0 0 0.5rem' }}>
                  {item.help}
                </p>
                <div className="row" role="radiogroup" aria-labelledby={`rl-${item.id}`} style={{ gap: '0.4rem' }}>
                  {step.levels.map((lvl, i) => (
                    <button key={lvl} type="button" role="radio" aria-checked={v[item.id] === i} className="chip" aria-pressed={v[item.id] === i} onClick={() => onChange({ ...v, [item.id]: i })}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }
}

export default function ExercisePage() {
  const { id = '' } = useParams();
  const exercise = EXERCISES[id];
  const module = MODULES.find((m) => m.exerciseId === id);
  const { markDone } = useModuleProgress();
  const history = useCollection<ExerciseRecord>('exercises');
  const [index, setIndex] = useState(-1);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);

  if (!exercise) {
    return (
      <EmptyState icon="path" title="No encontramos este ejercicio">
        <Link to="/app/camino" className="btn btn-outline">
          Volver a Mi Camino
        </Link>
      </EmptyState>
    );
  }

  const past = history.items.filter((h) => h.value.exerciseId === id);
  const step = exercise.steps[index];

  const finish = async () => {
    await history.add({ exerciseId: id, answers, completedAt: new Date().toISOString() });
    if (module) await markDone(module.id);
    setFinished(true);
  };

  if (finished) {
    return (
      <div className="flow fade-in" style={{ textAlign: 'center' }}>
        <span className="card-icon">
          <Icon name="check" />
        </span>
        <h1>Gracias por dedicarte este tiempo</h1>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem' }}>{exercise.closing}</p>
        <p className="small muted">Tus respuestas se guardaron cifradas en este dispositivo.</p>
        <div className="flow-actions" style={{ justifyContent: 'center' }}>
          <Link to="/app/camino" className="btn btn-primary">
            Volver a Mi Camino
          </Link>
          <Link to="/app" className="btn btn-outline">
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (index === -1) {
    return (
      <div className="flow">
        <Link to="/app/camino" className="muted" style={{ textDecoration: 'none' }}>
          <Icon name="back" size={16} /> Mi Camino
        </Link>
        <span className="eyebrow" style={{ marginTop: '1rem' }}>
          Ejercicio · {module?.minutes ?? 10} min
        </span>
        <h1>{exercise.title}</h1>
        {exercise.review === 'pendiente' && <p className="badge warn">Pendiente de revisión profesional y de la aprobación de Laura</p>}
        <p style={{ fontSize: '1.1rem' }}>{exercise.intro}</p>
        {exercise.quote && (
          <figure className="quote-card">
            <blockquote>«{exercise.quote.text}»</blockquote>
            <figcaption>
              Laura Rojas, <em>Amor tóxico</em>, p. {exercise.quote.page}. {QUOTE_NOTICE}
            </figcaption>
          </figure>
        )}
        {module?.mediaSlot && (
          <div className="card tint-lavanda">
            <strong>Espacio para la voz de Laura</strong>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Aquí irá un audio o un video corto cuando ella lo grabe. Mientras tanto, el ejercicio escrito ya se puede hacer. Pausa, el plan de protección y los números de emergencia siguen siendo gratis.
            </p>
          </div>
        )}
        <p className="small muted">Puedes dejar en blanco cualquier pregunta. No hay respuestas correctas.</p>
        <button type="button" className="btn btn-primary" onClick={() => setIndex(0)}>
          Empezar
        </button>
        {past.length > 0 && (
          <details style={{ marginTop: '2rem' }}>
            <summary>Tus respuestas anteriores ({past.length})</summary>
            <ul className="list" style={{ marginTop: '1rem' }}>
              {past.map((p) => (
                <li key={p.id} className="card small">
                  <strong>{formatDate(p.value.completedAt)}</strong>
                  {exercise.steps
                    .filter((s): s is Extract<ExerciseStep, { id: string }> => 'id' in s)
                    .map((s) => {
                      const a = p.value.answers[s.id];
                      if (a === undefined || a === '' || (Array.isArray(a) && !a.length)) return null;
                      const text = typeof a === 'object' && !Array.isArray(a) ? `${Object.keys(a).length} respuestas` : Array.isArray(a) ? a.join(', ') : String(a);
                      return (
                        <p key={s.id} style={{ margin: '0.4rem 0 0' }}>
                          <span className="muted">{s.prompt}</span>
                          <br />
                          {text}
                        </p>
                      );
                    })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    );
  }

  const isLast = index === exercise.steps.length - 1;
  return (
    <div className="flow">
      <div className="flow-top">
        <button type="button" className="icon-btn" aria-label="Paso anterior" onClick={() => setIndex(index - 1)}>
          <Icon name="back" />
        </button>
        <Progress value={(index + 1) / exercise.steps.length} label="Progreso del ejercicio" />
        <span className="small muted">
          {index + 1}/{exercise.steps.length}
        </span>
      </div>
      <div key={index} className="fade-in">
        <StepView step={step} value={'id' in step ? answers[step.id] : undefined} onChange={(v) => 'id' in step && setAnswers({ ...answers, [step.id]: v })} />
      </div>
      <div className="flow-actions">
        <button type="button" className="btn btn-primary" onClick={() => (isLast ? finish() : setIndex(index + 1))}>
          {isLast ? 'Terminar' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
