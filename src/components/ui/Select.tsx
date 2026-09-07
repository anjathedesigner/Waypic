import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown } from "react-feather";
import { AnimatePresence, motion } from "framer-motion";

const MENU_MAX = 224;

export function Select<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  previewFonts,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  "aria-label": string;
  previewFonts?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const label = options.find((o) => o.value === value)?.label ?? value;
  const listId = useId();

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const gap = 8;
    const below = window.innerHeight - rect.bottom - gap;
    const above = rect.top - gap;
    const need = Math.min(MENU_MAX, options.length * 40 + 10);
    setUp(below < need && above > below);
  }, [open, options.length]);

  return (
    <div ref={ref} className="select">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="select-trigger"
      >
        <span>{label}</span>
        <ChevronDown size={24} color="var(--foregroundlight)" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: up ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: up ? 4 : -4 }}
            transition={{ duration: 0.14 }}
            className={`select-menu ${up ? "is-up" : ""}`}
          >
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className="select-option"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                >
                  <span style={previewFonts ? { fontFamily: `"${o.value}"` } : undefined}>{o.label}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
