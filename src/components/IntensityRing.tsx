import { intensityWord } from '../lib/checkin';

export function IntensityRing({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const label = intensityWord(value);
  const r = 86;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(10, value)) / 10) * c;
  return (
    <div className="iring-wrap">
      <svg viewBox="0 0 220 220" className="iring" aria-hidden>
        <circle cx="110" cy="110" r={r} className="iring-track" />
        <circle cx="110" cy="110" r={r} className="iring-value" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <div className="iring-center">
        <strong>
          {value}
          <span>/10</span>
        </strong>
        <em>{label}</em>
      </div>
      <label className="sr-only" htmlFor="iring">
        Intensidad, de 0 a 10
      </label>
      <input id="iring" type="range" min={0} max={10} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
