export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  grow,
  fixed,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  grow?: boolean;
  fixed?: boolean;
}) {
  const fill = Boolean(grow || (options.length === 2 && !fixed));
  return (
    <div className={`seg ${fill ? "seg-grow" : ""} ${fixed ? "seg-fixed" : ""}`}>
      {options.map((o) => {
        const selected = o.value === value && !disabled;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`seg-btn ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
