import { useReducedMotion } from "framer-motion";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "react-feather";

type Variant = "primary" | "outlined";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  icon?: boolean;
  static?: boolean;
}

export function Button({
  variant = "primary",
  children,
  icon,
  static: isStatic,
  className = "",
  type = "button",
  ...rest
}: Props) {
  const reduce = useReducedMotion();
  const tap = !isStatic && !reduce;
  return (
    <button
      type={type}
      className={`btn ${variant === "primary" ? "btn-primary" : "btn-outlined"} ${icon ? "has-icon" : ""} ${tap ? "" : "is-static"} ${className}`.trim()}
      {...rest}
    >
      {children}
      {icon ? <ArrowRight size={20} strokeWidth={2} aria-hidden /> : null}
    </button>
  );
}

export function CtaButton({
  children,
  onClick,
  disabled,
  static: isStatic,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  static?: boolean;
}) {
  const reduce = useReducedMotion();
  const tap = !isStatic && !reduce;
  return (
    <button
      type="button"
      className={`btn btn-cta has-icon ${tap ? "" : "is-static"}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      <ArrowRight size={20} strokeWidth={2} aria-hidden />
    </button>
  );
}
