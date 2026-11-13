import { Mark } from "./Mark";

/* STUB — Lane home-design placeholder for the AsciiMark lane's component.
   The real AsciiMark renders the Synthe mark as a living glyph field
   (luminance-to-text, crawling cells) in a contained foreground emblem.
   This stub renders the plain vector mark at the same box so the hero
   and Docs header compositions can be built and verified now. The
   parent replaces this file with the real component at integration;
   the public interface (a className for sizing) is the contract. */
export function AsciiMark({ className = "" }: { className?: string }) {
  return (
    <span className={`ascii-mark ${className}`} data-stub="ascii-mark" aria-hidden="true">
      <Mark className="ascii-mark-glyph" />
    </span>
  );
}
