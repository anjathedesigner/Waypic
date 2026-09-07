export function Slider({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="slider toolbar-row">
      <span>{label}</span>
      <span className="slider-control">
        <span className="slider-track">
          <span className="slider-fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="slider-thumb" style={{ left: `calc(${pct}% - ${pct / 100} * 16px)` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </span>
    </label>
  );
}
