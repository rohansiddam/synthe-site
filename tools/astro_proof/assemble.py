#!/usr/bin/env python3
"""Stage a full copy of the site with the Astro-built pages laid over it, so the unchanged
tools/check_site.py (which reads the folder it lives in) can check the built output.

  python3 tools/astro_proof/assemble.py astro/dist STAGE_DIR

Copies the repo root (minus .git, astro/ and node_modules) into STAGE_DIR as real files (no symlinks:
the tools resolve SITE from their own path), then copies the built pages, _astro/ and hashed assets
over it. The fact fixture is a test page and stays out.
"""
import shutil
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parents[2]
SKIP = {".git", "astro", "node_modules", ".DS_Store"}


def main(dist: str, out: str) -> int:
    dist_p, out_p = Path(dist).resolve(), Path(out).resolve()
    if out_p.exists():
        shutil.rmtree(out_p)
    shutil.copytree(SITE, out_p, ignore=lambda d, names: [n for n in names if n in SKIP], symlinks=False)
    for f in dist_p.rglob("*"):
        if f.is_file() and f.name != "fact-fixture.html":
            dest = out_p / f.relative_to(dist_p)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(f, dest)
    built = sorted(p.name for p in dist_p.glob("*.html") if p.name != "fact-fixture.html")
    print(f"staged {out_p} with built pages: {', '.join(built)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:3]))
