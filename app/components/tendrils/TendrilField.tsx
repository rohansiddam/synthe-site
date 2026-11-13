"use client";

/* STUB — Lane home-design placeholder for the tendril engine lane's
   page overlay. The real TendrilField is a fixed, pointer-events-none
   layer that measures the page's [data-port] anchors and the gutter
   channels, and runs the autonomous glyph tendrils between them. This
   stub renders an empty fixed layer so the site can mount the
   component and build green now. The parent replaces this file with
   the real engine at integration; the mount contract (no props,
   mounted once in the shared layout, app/layout.tsx, so the canvas
   persists across Home/Docs client navigation) is what this stub
   guarantees. */
export function TendrilField() {
  return <div className="tendril-field" data-stub="tendril-field" aria-hidden="true" />;
}
