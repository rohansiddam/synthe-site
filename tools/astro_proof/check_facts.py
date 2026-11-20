#!/usr/bin/env python3
"""Check the <Fact> fixture with facts.py's own regex and fmt(): every scalar fact must render once,
with exactly the text `facts.py apply` would write.

  python3 tools/astro_proof/check_facts.py astro/dist/fact-fixture.html
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import facts  # noqa: E402


def main(path: str) -> int:
    data = facts.load()
    html = Path(path).read_text(encoding="utf-8")
    found = {}
    bad = []
    for m in facts.FACT_EL.finditer(html):
        found.setdefault(m["key"], []).append(m["text"])
        want = facts.fmt(m["key"], data[m["key"]])
        if m["text"] != want:
            bad.append(f"{m['key']}: rendered {m['text']!r}, facts.py says {want!r}")
    scalars = [k for k, v in data.items() if not k.startswith("_") and not isinstance(v, (dict, list))]
    missing = [k for k in scalars if k not in found]
    # facts.json has no floats today, so cross-check the JS port of Python's :g on edge values
    import json, subprocess
    vals = [0.1, 1.5, 2.25, 3.14159265, 1234567.0, 0.0001, 0.00001234, 100000.0, 999999.5, 12.0, -0.5, 1e21]
    js = subprocess.run(["node", "-e", "import('./src/lib/facts.mjs').then(m => console.log(JSON.stringify("
                         + json.dumps(vals) + ".map(m.pyG))))"], cwd=Path(__file__).resolve().parents[2] / "astro",
                        capture_output=True, text=True, check=True)
    for v, got in zip(vals, json.loads(js.stdout)):
        if got != f"{v:g}":
            bad.append(f"float {v}: JS port gives {got!r}, Python :g gives {format(v, 'g')!r}")
    for line in bad + [f"{k}: not rendered" for k in missing]:
        print("error:", line)
    print(f"{sum(len(v) for v in found.values())} data-fact elements, {len(scalars)} scalar facts: "
          f"{len(bad)} mismatch(es), {len(missing)} missing")
    return 1 if bad or missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
