import { Seo } from '../../components/Seo';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChoiceList, Progress } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { TEST_ANSWER_OPTIONS, TEST_QUESTIONS, type TestAnswer } from '../../content/selfTest';
import { TEST_DISCLAIMER, scoreTest } from '../../lib/testScoring';

export function TestPage() {
  const [answers, setAnswers] = useState<(TestAnswer | undefined)[]>(Array(TEST_QUESTIONS.length).fill(undefined));
  const [index, setIndex] = useState(-1);
  const result = index >= TEST_QUESTIONS.length ? scoreTest(answers) : null;

  const answer = (a: string) => {
    const next = [...answers];
    next[index] = a as TestAnswer;
    setAnswers(next);
    setTimeout(() => setIndex((i) => i + 1), 180);
  };

  if (index === -1) {
    return (
      <div className="container narrow section flow">
      <Seo title="¿Tienes un amor tóxico? Test de orientación" description="Siete preguntas para reflexionar sobre cómo te sientes en tu relación. No es un diagnóstico; es un punto de partida para entenderte." path="/test" />
        <span className="eyebrow">Test de orientación</span>
        <h1>¿Tienes un amor tóxico?</h1>
        <p className="muted" style={{ fontSize: '1.1rem' }}>
          Siete preguntas sobre cómo te sientes en tu relación. Responde con sinceridad: nadie más verá tus respuestas.
        </p>
        <p className="small muted">{TEST_DISCLAIMER}</p>
        <button type="button" className="btn btn-primary" onClick={() => setIndex(0)}>
          Empezar el test
        </button>
      </div>
    );
  }

  if (result) {
    return (
      <div className="container narrow section flow fade-in">
        <span className="eyebrow">Tu orientación</span>
        <h1>{result.title}</h1>
        <p style={{ fontSize: '1.1rem' }}>{result.message}</p>
        <div className="card stack">
          <h3>Algunas ideas</h3>
          <ul style={{ margin: 0 }}>
            {result.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <p className="small muted" style={{ marginTop: '1rem' }}>
          {result.disclaimer}
        </p>
        <div className="flow-actions">
          <Link to="/bienvenida" className="btn btn-primary">
            Comenzar mi proceso
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setAnswers(Array(TEST_QUESTIONS.length).fill(undefined));
              setIndex(-1);
            }}
          >
            Repetir el test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container narrow section flow">
      <div className="flow-top">
        <button type="button" className="icon-btn" aria-label="Pregunta anterior" onClick={() => setIndex((i) => i - 1)}>
          <Icon name="back" />
        </button>
        <Progress value={(index + 1) / TEST_QUESTIONS.length} label={`Pregunta ${index + 1} de ${TEST_QUESTIONS.length}`} />
        <span className="small muted">
          {index + 1}/{TEST_QUESTIONS.length}
        </span>
      </div>
      <div key={index} className="fade-in">
        <h2>{TEST_QUESTIONS[index]}</h2>
        <ChoiceList label={TEST_QUESTIONS[index]} options={TEST_ANSWER_OPTIONS} value={answers[index]} onChange={answer} min={160} />
      </div>
    </div>
  );
}
