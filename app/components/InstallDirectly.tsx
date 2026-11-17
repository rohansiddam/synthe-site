"use client";

import { useEffect, useRef, useState } from "react";
import "./InstallDirectly.css";

const PROMPT_TEXT =
  "Set up Synthe in this repo. Run npx synthe@latest guide and follow it.";

type Agent = {
  name: string;
  glyph: React.ReactNode;
};

function SparkGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3 L13.8 10.2 L21 12 L13.8 13.8 L12 21 L10.2 13.8 L3 12 L10.2 10.2 Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

function TerminalGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 5 L11 12 L4 19" />
      <path d="M12.5 19 L20 19" />
    </svg>
  );
}

function CursorGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 3 L19 11.5 L12.2 13 L9.2 20 Z" />
    </svg>
  );
}

function WaveGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12 Q6.5 5 11 12 T20 12" />
      <path d="M2 18 Q6.5 12.5 11 18 T20 18" opacity="0.55" />
    </svg>
  );
}

const AGENTS: Agent[] = [
  { name: "Claude Code", glyph: <SparkGlyph /> },
  { name: "Codex", glyph: <TerminalGlyph /> },
  { name: "Cursor", glyph: <CursorGlyph /> },
  { name: "Windsurf", glyph: <WaveGlyph /> },
];

type InstallDirectlyProps = {
  tone?: "dark" | "light";
  className?: string;
};

export function InstallDirectly({ tone = "dark", className }: InstallDirectlyProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  const show = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setActive(null);
  };

  const onCopy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(PROMPT_TEXT);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      try {
        const area = document.createElement("textarea");
        area.value = PROMPT_TEXT;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      } catch {
        ok = false;
      }
    }
    if (!ok) return;
    window.clearTimeout(copyTimer.current);
    setCopied(true);
    copyTimer.current = window.setTimeout(() => {
      setCopied(false);
      close();
    }, 1600);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      window.clearTimeout(copyTimer.current);
      setCopied(false);
      close();
    }
  };

  return (
    <div
      className={className ? `${"ia-strip"} ${className}` : "ia-strip"}
      data-tone={tone}
      onPointerLeave={close}
      onKeyDown={onKeyDown}
    >
      <span className={"ia-label"}>Install directly with</span>
      <div className={"ia-chips"}>
        {AGENTS.map((agent, index) => (
          <button
            key={agent.name}
            type="button"
            className={"ia-chip"}
            data-active={active === index && open ? "true" : undefined}
            aria-haspopup="true"
            aria-expanded={open && active === index}
            aria-controls="install-directly-popover"
            onPointerEnter={() => show(index)}
            onMouseEnter={() => show(index)}
            onFocus={() => show(index)}
            onClick={() => show(index)}
          >
            <span className={"ia-glyph"}>{agent.glyph}</span>
            <span>{agent.name}</span>
          </button>
        ))}
      </div>
      {open ? (
        <div className={"ia-popover"} id="install-directly-popover" role="region" aria-label="Prompt for your coding agent">
          <p className={"ia-popoverLabel"}>For your coding agent</p>
          <p className={"ia-prompt"}>{PROMPT_TEXT}</p>
          <button
            type="button"
            className={"ia-copyButton"}
            data-copied={copied ? "true" : undefined}
            onClick={onCopy}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default InstallDirectly;
