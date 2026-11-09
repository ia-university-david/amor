import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { ChoiceList, EmptyState, Modal, Notice, PageHeader, formatDate } from '../../components/ui';
import { CONTACT_MODALITIES, RULE_PRESETS, type LimitRule, type LimitsState } from '../../content/limits';
import { RULE_CATALOG, RULE_GROUPS, groupFullySelected, setGroup, type RuleGroupId } from '../../lib/rules';
import { newId } from '../../lib/data';
import { EMPTY_COUNTER, daysSince, describeCounter, startCounter, stopCounter, type NoContactCounter } from '../../lib/noContact';
import { useModuleProgress } from '../../lib/progress';
import { useDoc } from '../../lib/useCollection';

export default function Limites() {
  const { value: state, save } = useDoc<LimitsState>('limits', 'state', { modality: null, rules: [] });
  const { value: counter, save: saveCounter } = useDoc<NoContactCounter>('limits', 'counter', EMPTY_COUNTER);
  const { markDone } = useModuleProgress();
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [picker, setPicker] = useState<'tarjetas' | 'lista'>('lista');
  const [cardAt, setCardAt] = useState(0);
  const [editing, setEditing] = useState<LimitRule | null>(null);
  const [custom, setCustom] = useState('');

  const persist = async (next: LimitsState) => {
    await save(next);
    if (next.rules.length) await markDone('mis-limites');
  };

  const addRule = (text: string) => {
    if (state.rules.some((r) => r.text === text)) return;
    void persist({ ...state, rules: [...state.rules, { id: newId(), text, active: true, createdAt: new Date().toISOString() }] });
  };
  const updateRule = (rule: LimitRule) => persist({ ...state, rules: state.rules.map((r) => (r.id === rule.id ? rule : r)) });
  const removeRule = (id: string) => persist({ ...state, rules: state.rules.filter((r) => r.id !== id) });

  const days = daysSince(counter.startedAt);
  const unused = RULE_PRESETS.filter((p) => !state.rules.some((r) => r.text === p));

  return (
    <div className="stack" style={{ ['--gap' as string]: '2rem' }}>
      <PageHeader
        eyebrow="Pilar 3"
        title="La distancia que elijo"
        subtitle="Tú decides qué contacto quieres sostener. El contacto cero es una opción. Hablar por hijos, trámites o seguridad no es un retroceso."
      />

      <section aria-labelledby="mod-t">
        <h2 id="mod-t">¿Qué modalidad de contacto quieres para ahora?</h2>
        <ChoiceList
          label="Modalidad de contacto"
          options={CONTACT_MODALITIES}
          value={state.modality ?? undefined}
          onChange={(v) => persist({ ...state, modality: v as LimitsState['modality'] })}
          min={280}
        />
        {state.modality === 'proteccion' && (
          <div style={{ marginTop: '1rem' }} className="stack">
            <Notice tone="warn" icon="shield">
              Si sientes que estás en peligro, llama al número de emergencias de tu país. Un profesional puede ayudarte a adaptar este plan. La app no bloquea a nadie ni te impide escribir.
            </Notice>
            <Link to="/app/camino/ejercicio/proteccion" className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>
              Abrir el plan de protección
            </Link>
          </div>
        )}
        {state.modality === 'necesarios' && (
          <p className="small muted" style={{ marginTop: '0.75rem' }}>
            El contacto por crianza, asuntos legales, económicos o de seguridad nunca se considera un retroceso.
          </p>
        )}
      </section>

      <RulePicker
        mode={picker}
        onMode={setPicker}
        cardAt={cardAt}
        onCardAt={setCardAt}
        owned={state.rules.map((r) => r.text)}
        onKeep={(text) => addRule(text)}
        onDrop={(text) => {
          const found = state.rules.find((r) => r.text === text);
          if (found) void removeRule(found.id);
        }}
      />

      <section aria-labelledby="rules-t">
        <div className="row between">
          <h2 id="rules-t" style={{ margin: 0 }}>
            Mis reglas
          </h2>
          <div className="row" role="group" aria-label="Vista">
            <button type="button" className="icon-btn" aria-label="Vista de tarjetas" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
              <Icon name="grid" />
            </button>
            <button type="button" className="icon-btn" aria-label="Vista de lista" aria-pressed={view === 'list'} onClick={() => setView('list')}>
              <Icon name="list" />
            </button>
          </div>
        </div>
        {state.rules.length === 0 ? (
          <EmptyState icon="shield" title="Aún no tienes reglas">
            <p className="small">Elige una de las sugerencias o escribe la tuya. Empieza por una sola.</p>
          </EmptyState>
        ) : view === 'cards' ? (
          <div className="grid" style={{ marginTop: '1rem', ['--min' as string]: '240px' }}>
            {state.rules.map((r) => (
              <RuleCard key={r.id} rule={r} onEdit={() => setEditing(r)} onToggle={() => updateRule({ ...r, active: !r.active })} />
            ))}
          </div>
        ) : (
          <table className="simple" style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Regla</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.text}
                    {r.why && <div className="muted small">Porque: {r.why}</div>}
                  </td>
                  <td>{r.active ? <span className="badge ok">Activa</span> : <span className="badge">En pausa</span>}</td>
                  <td>
                    <div className="row" style={{ gap: '0.25rem', flexWrap: 'nowrap' }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateRule({ ...r, active: !r.active })}>
                        {r.active ? 'Suspender' : 'Activar'}
                      </button>
                      <button type="button" className="icon-btn" aria-label={`Editar: ${r.text}`} onClick={() => setEditing(r)}>
                        <Icon name="edit" size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {unused.length > 0 && (
          <>
            <h3 style={{ marginTop: '1.5rem' }}>Sugerencias</h3>
            <div className="row" style={{ gap: '0.4rem' }}>
              {unused.map((p) => (
                <button key={p} type="button" className="chip" onClick={() => addRule(p)}>
                  <Icon name="plus" size={14} /> {p}
                </button>
              ))}
            </div>
          </>
        )}
        <form
          className="row"
          style={{ marginTop: '1rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            if (custom.trim()) addRule(custom.trim());
            setCustom('');
          }}
        >
          <label htmlFor="custom-rule" className="sr-only">
            Escribe tu propia regla
          </label>
          <input id="custom-rule" type="text" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Escribe tu propia regla…" style={{ flex: 1, minWidth: 220 }} />
          <button type="submit" className="btn btn-outline" disabled={!custom.trim()}>
            Añadir
          </button>
        </form>
      </section>

      <section className="card" aria-labelledby="counter-t">
        <h2 id="counter-t" style={{ fontSize: '1.3rem' }}>
          Contador opcional
        </h2>
        <p className="small muted">
          Cuenta los días desde el último contacto que tú definiste como incompatible con tus límites. Es solo una medida entre muchas: no
          mide tu valor ni tu progreso, y el contacto necesario nunca lo reinicia.
        </p>
        {counter.enabled && counter.startedAt ? (
          <>
            <div className="stat">{days}</div>
            <p>{describeCounter(days)}</p>
            <p className="small muted">Desde el {formatDate(counter.startedAt, { dateStyle: 'long' })}.</p>
            <p className="small muted">
              Si ocurrió un contacto que no querías, puedes registrarlo en «Hoy fue difícil». Allí decidirás si quieres reiniciar el
              contador; nunca se reinicia solo.
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => saveCounter(stopCounter(counter))}>
              Ocultar el contador
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-outline" onClick={() => saveCounter(startCounter(counter))}>
            Empezar a contar desde hoy
          </button>
        )}
      </section>

      {editing && (
        <Modal title="Editar regla" onClose={() => setEditing(null)}>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await updateRule(editing);
              setEditing(null);
            }}
          >
            <div className="field">
              <label htmlFor="rule-text">Regla</label>
              <input id="rule-text" type="text" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="rule-why">
                ¿Por qué la elegiste? <span className="hint">(aparecerá en «Mis motivos»)</span>
              </label>
              <textarea id="rule-why" value={editing.why ?? ''} onChange={(e) => setEditing({ ...editing, why: e.target.value })} style={{ minHeight: 80 }} />
            </div>
            <label className="check">
              <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Activa
            </label>
            <div className="row between">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={async () => {
                  await removeRule(editing.id);
                  setEditing(null);
                }}
              >
                <Icon name="trash" size={18} /> Eliminar
              </button>
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function RulePicker({
  mode,
  onMode,
  cardAt,
  onCardAt,
  owned,
  onKeep,
  onDrop,
}: {
  mode: 'tarjetas' | 'lista';
  onMode: (m: 'tarjetas' | 'lista') => void;
  cardAt: number;
  onCardAt: (n: number) => void;
  owned: string[];
  onKeep: (text: string) => void;
  onDrop: (text: string) => void;
}) {
  const selected = RULE_CATALOG.filter((r) => owned.includes(r.text)).map((r) => r.id);
  const deck = RULE_CATALOG.filter((r) => !owned.includes(r.text));
  const card = deck[Math.min(cardAt, Math.max(0, deck.length - 1))];

  const flip = (id: string) => {
    const rule = RULE_CATALOG.find((r) => r.id === id);
    if (!rule) return;
    if (selected.includes(id)) onDrop(rule.text);
    else onKeep(rule.text);
  };

  return (
    <section aria-labelledby="elegir-reglas">
      <div className="row between">
        <div>
          <h2 id="elegir-reglas" style={{ marginBottom: 0 }}>
            Elige tus reglas
          </h2>
          <p className="small muted" style={{ margin: '0.25rem 0 0' }}>
            Quédate con las que de verdad te cuidan. Puedes soltarlas cuando quieras.
          </p>
        </div>
        <div className="segmented" role="group" aria-label="Cómo elegir">
          <button type="button" className={mode === 'tarjetas' ? 'on' : ''} aria-pressed={mode === 'tarjetas'} onClick={() => onMode('tarjetas')}>
            Tarjetas
          </button>
          <button type="button" className={mode === 'lista' ? 'on' : ''} aria-pressed={mode === 'lista'} onClick={() => onMode('lista')}>
            Lista
          </button>
        </div>
      </div>

      {mode === 'tarjetas' ? (
        card ? (
          <div className="rule-card-pick">
            <p className="small muted">{card.lead}</p>
            <h3>{card.text}</h3>
            <div className="row between">
              <button type="button" className="btn btn-ghost" onClick={() => onCardAt(cardAt + 1 >= deck.length ? 0 : cardAt + 1)}>
                Ahora no
              </button>
              <button type="button" className="btn btn-primary" onClick={() => onKeep(card.text)}>
                Me la quedo
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">Ya revisaste las sugerencias. Puedes escribir la tuya más abajo.</p>
        )
      ) : (
        <div className="stack" style={{ marginTop: '1rem' }}>
          {RULE_GROUPS.map((g) => (
            <fieldset key={g.id} className="card" style={{ border: '1px solid var(--border)' }}>
              <legend className="small" style={{ padding: '0 0.4rem' }}>
                {g.label}
              </legend>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const group = g.id as RuleGroupId;
                  if (groupFullySelected(selected, group)) {
                    for (const rule of RULE_CATALOG.filter((r) => r.group === group)) onDrop(rule.text);
                    return;
                  }
                  for (const id of setGroup(selected, group, true)) {
                    if (!selected.includes(id)) flip(id);
                  }
                }}
              >
                {groupFullySelected(selected, g.id) ? 'Quitar este grupo' : 'Quedarme con este grupo'}
              </button>
              {RULE_CATALOG.filter((r) => r.group === g.id).map((r) => (
                <label key={r.id} className="check">
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => flip(r.id)} />
                  <span>{r.text}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
    </section>
  );
}

function RuleCard({ rule, onEdit, onToggle }: { rule: LimitRule; onEdit: () => void; onToggle: () => void }) {
  return (
    <div className={`card ${rule.active ? 'tint-lavanda' : ''}`} style={{ opacity: rule.active ? 1 : 0.75 }}>
      <div className="row between">
        {rule.active ? <span className="badge ok">Activa</span> : <span className="badge">En pausa</span>}
        <button type="button" className="icon-btn" aria-label={`Editar: ${rule.text}`} onClick={onEdit}>
          <Icon name="edit" size={18} />
        </button>
      </div>
      <h3 style={{ marginTop: '0.5rem' }}>{rule.text}</h3>
      {rule.why && <p className="small muted">Porque: {rule.why}</p>}
      <button type="button" className="btn btn-ghost btn-sm" onClick={onToggle}>
        {rule.active ? 'Suspender' : 'Activar'}
      </button>
    </div>
  );
}
