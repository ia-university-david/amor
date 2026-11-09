import { useMemo, useState } from 'react';
import type { MoodEntry } from '../lib/progress';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function monthLabel(year: number, month: number) {
  const raw = new Date(year, month, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function EmotionCalendar({ moods }: { moods: MoodEntry[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [picked, setPicked] = useState<string | null>(null);
  const byDate = useMemo(() => new Map(moods.map((m) => [m.date, m.emotion])), [moods]);

  const first = new Date(cursor.y, cursor.m, 1);
  const startPad = (first.getDay() + 6) % 7;
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const keyOf = (day: number) => `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const emotion = picked ? byDate.get(picked) : undefined;

  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setPicked(null);
  };

  return (
    <div className="card calendar">
      <div className="row between">
        <button type="button" className="icon-btn" aria-label="Mes anterior" onClick={() => shift(-1)}>
          ‹
        </button>
        <strong>{monthLabel(cursor.y, cursor.m)}</strong>
        <button type="button" className="icon-btn" aria-label="Mes siguiente" onClick={() => shift(1)}>
          ›
        </button>
      </div>
      <div className="cal-grid" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className="cal-dow">
            {d}
          </span>
        ))}
      </div>
      <div className="cal-grid" role="grid" aria-label="Días con emoción anotada">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />;
          const key = keyOf(day);
          const has = byDate.has(key);
          return (
            <button key={key} type="button" className={picked === key ? 'on' : ''} aria-pressed={picked === key} aria-label={has ? `${day}, anotaste ${byDate.get(key)}` : `${day}, sin anotación`} onClick={() => setPicked(key)}>
              {day}
              {has && <i />}
            </button>
          );
        })}
      </div>
      <p className="small muted" style={{ textAlign: 'center', marginBottom: 0 }}>
        {picked ? (emotion ? `Ese día anotaste: ${emotion}.` : 'Ese día no hay una emoción guardada.') : 'Elige un día para volver a ver cómo te sentiste.'}
      </p>
    </div>
  );
}
