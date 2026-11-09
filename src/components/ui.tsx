import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

export function PageHeader({ title, subtitle, back, eyebrow }: { title: string; subtitle?: ReactNode; back?: string | true; eyebrow?: string }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back &&
        (back === true ? (
          <button type="button" className="back" onClick={() => navigate(-1)}>
            <Icon name="back" size={18} /> Volver
          </button>
        ) : (
          <Link to={back} className="back">
            <Icon name="back" size={18} /> Volver
          </Link>
        ))}
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </header>
  );
}

interface ChoiceOption {
  id: string;
  label: string;
  description?: string;
}

export function ChoiceList({
  options,
  value,
  onChange,
  min,
  label,
}: {
  options: readonly ChoiceOption[];
  value: string | undefined;
  onChange: (id: string) => void;
  min?: number;
  label: string;
}) {
  return (
    <div className="choices" role="radiogroup" aria-label={label} style={min ? ({ '--min': `${min}px` } as React.CSSProperties) : undefined}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          className="choice"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
        >
          <span>
            {o.label}
            {o.description && <span className="muted small" style={{ display: 'block', fontWeight: 400 }}>{o.description}</span>}
          </span>
          <span className="tick">{value === o.id && <Icon name="check" size={14} />}</span>
        </button>
      ))}
    </div>
  );
}

export function MultiChoice({
  options,
  values,
  onChange,
  label,
  min,
}: {
  options: readonly ChoiceOption[];
  values: string[];
  onChange: (ids: string[]) => void;
  label: string;
  min?: number;
}) {
  const toggle = (id: string) => onChange(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  return (
    <div className="choices" role="group" aria-label={label} style={min ? ({ '--min': `${min}px` } as React.CSSProperties) : undefined}>
      {options.map((o) => (
        <button key={o.id} type="button" className="choice" aria-pressed={values.includes(o.id)} onClick={() => toggle(o.id)}>
          <span>{o.label}</span>
          <span className="tick">{values.includes(o.id) && <Icon name="check" size={14} />}</span>
        </button>
      ))}
    </div>
  );
}

export function IntensitySlider({
  value,
  onChange,
  label,
  min = 0,
  max = 10,
  minLabel = 'Nada',
  maxLabel = 'Muchísimo',
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
  min?: number;
  max?: number;
  minLabel?: string;
  maxLabel?: string;
}) {
  const id = useId();
  return (
    <div className="intensity">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <output htmlFor={id} aria-live="polite">
        {value}
      </output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${value} de ${max}`}
      />
      <div className="scale-labels" aria-hidden="true">
        <span>
          {min} · {minLabel}
        </span>
        <span>
          {max} · {maxLabel}
        </span>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="card-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Notice({ children, tone = 'info', icon = 'info' }: { children: ReactNode; tone?: 'info' | 'warn'; icon?: IconName }) {
  return (
    <div className={`notice ${tone === 'warn' ? 'warn' : ''}`} role={tone === 'warn' ? 'note' : undefined}>
      <Icon name={icon} size={20} />
      <div>{children}</div>
    </div>
  );
}

export function Modal({ title, onClose, children, labelledBy }: { title: string; onClose: () => void; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? titleId} tabIndex={-1} ref={ref}>
        <div className="row between" style={{ marginBottom: '0.75rem', flexWrap: 'nowrap' }}>
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.3rem' }}>
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string {
  try {
    return new Intl.DateTimeFormat('es', opts).format(new Date(iso));
  } catch {
    return iso;
  }
}
