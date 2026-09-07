import { motion, useReducedMotion } from "framer-motion";

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`switch ${checked ? "is-on" : ""}`}
    >
      <motion.span
        className="switch-thumb"
        animate={{ left: checked ? 26 : 2 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}
