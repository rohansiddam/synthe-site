"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Crisp 45-degree chamfer: the signature notched corner. */
const NOTCH = "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)";

type ButtonProps = {
  variant?: "primary" | "secondary";
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  /** Optional leading mark, e.g. the Logo at small size. */
  icon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
};

export function Button({
  variant = "secondary",
  href,
  onClick,
  children,
  icon,
  className = "",
  type = "button",
}: ButtonProps) {
  const reduce = useReducedMotion();

  const base =
    "inline-flex items-center justify-center gap-2.5 font-sans font-semibold " +
    "text-[15px] tracking-[-0.01em] leading-none px-6 py-[15px] " +
    "no-underline select-none cursor-pointer " +
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-human";
  const styles =
    variant === "primary"
      ? "bg-ink text-bg border border-ink"
      : "bg-transparent text-ink border border-line hover:bg-human-bg/50 transition-colors duration-150";

  const motionProps = reduce
    ? {}
    : {
        whileHover:
          variant === "primary"
            ? { scale: 1.03, y: -2, filter: "brightness(1.06)" }
            : { scale: 1.03, y: -2 },
        whileTap: { scale: 0.97 },
        transition: { type: "spring" as const, stiffness: 400, damping: 28 },
      };

  const label = (
    <>
      {icon && (
        <span
          aria-hidden="true"
          className={
            "inline-flex shrink-0 items-center" +
            (variant === "primary" ? " btn-icon-contrast" : "")
          }
        >
          {icon}
        </span>
      )}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <motion.a
        href={href}
        onClick={onClick}
        className={`${base} ${styles} ${className}`}
        style={{ clipPath: NOTCH }}
        {...motionProps}
      >
        {label}
      </motion.a>
    );
  }
  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`${base} ${styles} ${className}`}
      style={{ clipPath: NOTCH }}
      {...motionProps}
    >
      {label}
    </motion.button>
  );
}
