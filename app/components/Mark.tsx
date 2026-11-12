/* The official two hooked strokes (path data as in tools/apply_chrome.py).
   Half A is the agent's (ink, --agent); half B is yours (brick, --gold-mark).
   Do not redraw. Used by the wordmark, the nav CTA, copy buttons and footer. */

export const HALF_A =
  "M 137.089 36.089 L 121.248 56.837 65.850 129.267 74.001 201.107 C 75.025 210.118 69.339 218.084 60.498 219.675 51.929 221.178 43.437 215.697 41.616 206.835 L 32.573 126.506 C 32.187 123.074 32.649 118.958 34.819 116.127 L 84.936 50.749 115.553 10.674 C 118.873 6.328 123.405 3.381 129.084 3.381 L 199.032 3.381 C 205.962 3.382 211.797 8.026 213.985 14.448 215.933 20.150 214.783 26.111 211.010 30.731 L 94.495 182.341 89.217 135.584 146.096 61.503 165.499 36.165 Z";

export const HALF_B =
  "M 137.911 253.913 L 153.752 233.165 209.151 160.735 200.999 88.895 C 199.976 79.884 205.661 71.918 214.503 70.327 223.072 68.824 231.564 74.305 233.384 83.167 L 242.427 163.496 C 242.814 166.928 242.352 171.044 240.182 173.875 L 190.065 239.253 159.448 279.328 C 156.127 283.674 151.595 286.621 145.916 286.621 L 75.968 286.621 C 69.039 286.620 63.204 281.976 61.016 275.554 59.067 269.852 60.218 263.891 63.991 259.271 L 180.506 107.661 185.784 154.418 128.905 228.499 109.501 253.837 Z";

type MarkProps = {
  className?: string;
  /** "tight" is the 275x290 lockup viewBox; "open" is the spread viewBox the
      CTA and copy-button marks use. */
  view?: "tight" | "open";
  /** State classes from the mark system: open, refused, stale. */
  state?: string;
};

export function Mark({ className = "", view = "tight", state = "" }: MarkProps) {
  const classes = ["mark", state, className].filter(Boolean).join(" ");
  return (
    <svg
      className={classes}
      viewBox={view === "open" ? "-40 -40 355 370" : "0 0 275 290"}
      aria-hidden="true"
    >
      <path className="half a" d={HALF_A} />
      <path className="half b" d={HALF_B} />
    </svg>
  );
}

/** The hover arrow used by .arrow-link: a chevron that grows a shaft. */
export function HoverArrow() {
  return (
    <svg className="hover-arrow arr" viewBox="0 0 10 10" aria-hidden="true">
      <path className="shaft" d="M.5 5h7" />
      <path className="tip" d="M3.5 1.5 7 5 3.5 8.5" />
    </svg>
  );
}

/** The corner arrow on the how-it-works cards. */
export function GoArrow() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 12 12 4M5 4h7v7" />
    </svg>
  );
}

/** The check tick in the how-it-works checks list. */
export function Tick() {
  return (
    <span className="tick" aria-hidden="true">
      <svg viewBox="0 0 12 12">
        <path d="M2.5 6.2 5 8.5 9.5 3.5" />
      </svg>
    </span>
  );
}
