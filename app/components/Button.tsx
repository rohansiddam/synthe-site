"use client";

import { motion } from "framer-motion";

type ButtonProps = {
  variant?: "primary" | "secondary";
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
};

/** Notched-corner button matching the live site's .btn2. */
export function Button({
  variant = "secondary",
  href,
  onClick,
  children,
  className = "",
  type = "button",
}: ButtonProps) {
  const base =
    "inline-flex items-center gap-2 font-sans font-semibold text-base leading-none px-4 py-3 border cursor-pointer no-underline select-none";
  const styles =
    variant === "primary"
      ? "bg-ink text-bg border-ink"
      : "bg-transparent text-ink border-line2 hover:border-muted";
  const notch = {
    clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 19px, 100% 100%, 0 100%)",
  } as const;

  const inner = (
    <motion.span
      className={`${base} ${styles} ${className}`}
      style={notch}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.span>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} style={{ textDecoration: "none" }}>
        {inner}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className="bg-transparent border-0 p-0">
      {inner}
    </button>
  );
}
