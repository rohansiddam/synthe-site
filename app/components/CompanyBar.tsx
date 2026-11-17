import "./CompanyBar.css";

/* The company marquee bar: a narrow strip that sits directly under
   the hero, naming the tools Synthe works alongside. Pure CSS loop
   (the track is duplicated once and translates -50%), paused on
   hover, static under reduced motion. Server component: no JS. */

type Tier = "anchor" | "tier2" | "tier3";

const ITEMS: { name: string; tier: Tier }[] = [
  { name: "GitHub", tier: "anchor" },
  { name: "Claude Code", tier: "tier2" },
  { name: "Codex", tier: "tier2" },
  { name: "Cursor", tier: "tier3" },
  { name: "Windsurf", tier: "tier3" },
  { name: "GitHub Actions", tier: "tier3" },
  { name: "Claude", tier: "tier3" },
  { name: "npm", tier: "tier3" },
];

export function CompanyBar() {
  return (
    <div
      className={"cb-bar"}
      aria-label="Works alongside the tools your agents already run on"
    >
      <div className={"cb-track"}>
        {[0, 1].map((copy) => (
          <div
            key={copy}
            className={"cb-half"}
            aria-hidden={copy === 1 || undefined}
          >
            {ITEMS.map((item) => (
              <span key={item.name} className={"cb-itemWrap"}>
                <span className={`${"cb-item"} ${("cb-" + item.tier)}`}>
                  {item.name}
                </span>
                <span className={"cb-sep"} aria-hidden="true" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CompanyBar;
