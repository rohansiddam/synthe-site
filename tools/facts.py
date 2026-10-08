#!/usr/bin/env python3
"""Keep every number on synthe.live in one place: facts.json.

Pages never hard-code a fact. They wrap it in an element with a data-fact attribute,
for example <span data-fact="tests_passed">57</span>, and this tool keeps the text
inside in step with facts.json.

  python3 tools/facts.py refresh --synthe PATH   re-measure a checkout of the public checker
  python3 tools/facts.py apply                   write facts.json into every page
  python3 tools/facts.py check                   exit 1 if any page disagrees with facts.json

refresh only touches the facts it can measure (commit, version, tests, attacks, date).
The real-runner results and the clone timing are recorded by hand; their sources are
listed under "_manual" in facts.json.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
FACTS = SITE / "facts.json"
FACT_EL = re.compile(r'<(?P<tag>[a-z][a-z0-9]*)(?P<attrs>[^>]*?\bdata-fact="(?P<key>[a-z0-9_]+)"[^>]*)>(?P<text>[^<]*)</(?P=tag)>')


def load() -> dict:
    return json.loads(FACTS.read_text(encoding="utf-8"))


def fmt(key: str, value) -> str:
    """How a fact reads on the page."""
    if key.endswith("_on") or key.endswith("_date"):
        d = dt.date.fromisoformat(str(value))
        return f"{d:%B} {d.day}, {d.year}"
    if isinstance(value, float):
        return f"{value:g}"
    return str(value)


def pages() -> list[Path]:
    return sorted(SITE.glob("*.html"))


def mismatches(facts: dict) -> list[str]:
    problems = []
    for page in pages():
        for m in FACT_EL.finditer(page.read_text(encoding="utf-8")):
            key = m["key"]
            if key not in facts:
                problems.append(f"{page.name}: unknown fact '{key}'")
            elif m["text"] != fmt(key, facts[key]):
                problems.append(f"{page.name}: {key} reads '{m['text']}', facts.json says '{fmt(key, facts[key])}'")
    return problems


def apply(facts: dict) -> int:
    changed = 0
    for page in pages():
        html = page.read_text(encoding="utf-8")

        def repl(m):
            key = m["key"]
            if key not in facts:
                raise SystemExit(f"{page.name}: unknown fact '{key}'")
            return f'<{m["tag"]}{m["attrs"]}>{fmt(key, facts[key])}</{m["tag"]}>'

        new = FACT_EL.sub(repl, html)
        if new != html:
            page.write_text(new, encoding="utf-8")
            changed += 1
            print(f"updated {page.name}")
    return changed


def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)


def refresh(facts: dict, synthe: Path) -> dict:
    synthe = synthe.resolve()
    commit = run(["git", "rev-parse", "--short=7", "HEAD"], synthe).stdout.strip()
    if not commit:
        raise SystemExit(f"{synthe} is not a git checkout of the checker")

    first = (synthe / "SPEC.md").read_text(encoding="utf-8").splitlines()[0]
    version = re.search(r"v(\d+\.\d+)", first)
    if not version:
        raise SystemExit(f"could not read the version from SPEC.md: {first!r}")

    tests = run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider"], synthe)
    summary = tests.stdout.strip().splitlines()[-1] if tests.stdout.strip() else ""
    passed = re.search(r"(\d+) passed", summary)
    # "38 xfailed" (expected failures, documented limits) isn't a failure; "2 failed" or an error is.
    if tests.returncode != 0 or not passed or re.search(r"\b\d+ (failed|errors?)\b", summary):
        raise SystemExit(f"the checker's tests did not pass cleanly: {summary or tests.stderr[-400:]}")

    packets = synthe / "examples" / "v03" / "packets"
    verdicts = {}
    for packet in sorted(packets.glob("*.json")):
        out = run([sys.executable, "src/handoff_check.py", str(packet),
                   "--registry", "examples/v03/registry.json",
                   "--workspace", "examples/v03/workspace", "--dry-run"], synthe)
        verdicts[packet.stem] = json.loads(out.stdout)["decision"]
    attacks = {k: v for k, v in verdicts.items() if k.startswith("attack-")}
    if not attacks:
        raise SystemExit("no attack packets found")
    accepted_attacks = [k for k, v in attacks.items() if v != "REJECT"]
    if accepted_attacks:
        raise SystemExit(f"attacks that were NOT rejected: {accepted_attacks}. Fix the checker or the site copy before refreshing.")
    if verdicts.get("valid-signed") != "ACCEPT":
        raise SystemExit("valid-signed.json was not accepted")

    facts.update({
        "checker_commit": commit,
        "checker_version": version.group(1),
        "facts_checked_on": dt.datetime.now(dt.timezone.utc).date().isoformat(),
        "tests_passed": int(passed.group(1)),
        "attacks_shipped": len(attacks),
        "attacks_rejected": len(attacks) - len(accepted_attacks),
    })
    FACTS.write_text(json.dumps(facts, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"facts.json: checker {commit} v{version.group(1)}, {passed.group(1)} tests passed, "
          f"{len(attacks)} attacks all rejected")
    return facts


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("refresh", help="re-measure a checkout of the public checker")
    r.add_argument("--synthe", type=Path, required=True, help="path to a checkout of rohansiddam/Synthe")
    sub.add_parser("apply", help="write facts.json into every page")
    sub.add_parser("check", help="exit 1 if any page disagrees with facts.json")
    args = ap.parse_args()

    facts = load()
    if args.cmd == "refresh":
        refresh(facts, args.synthe)
    elif args.cmd == "apply":
        print(f"{apply(facts)} page(s) updated")
    else:
        problems = mismatches(facts)
        for p in problems:
            print(p)
        if problems:
            return 1
        print("every data-fact matches facts.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
