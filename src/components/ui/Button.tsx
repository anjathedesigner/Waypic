import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "react-feather";

type Variant = "primary" | "outlined";

interface Props extends ComponentProps<typeof motion.button> {
  variant?: Variant;
  children: ReactNode;
  icon?: boolean;
}

export function Button({ variant = "primary", children, icon, className = "", ...rest }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={`btn ${variant === "primary" ? "btn-primary" : "btn-outlined"} ${className}`}
      whileHover={reduce ? undefined : { scale: 1.02 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.14 }}
      {...rest}
    >
      {children}
      {icon ? <ArrowRight size={24} strokeWidth={2} /> : null}
    </motion.button>
  );
}

export function CtaButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="button"
      className="btn btn-cta"
      initial={false}
      whileHover={reduce ? undefined : { scale: 1.05 }}
      whileTap={reduce ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.14 }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      <ArrowRight size={24} />
    </motion.button>
  );
}
