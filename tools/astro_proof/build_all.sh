#!/bin/sh
# Build the three proof variants. Run from the repo root: sh tools/astro_proof/build_all.sh
set -e
cd "$(dirname "$0")/../../astro"
export ASTRO_TELEMETRY_DISABLED=1
[ -d node_modules ] || npm ci
SITE_PROOF_MODE=parity    SITE_PROOF_OUT=./dist-parity npx astro build
SITE_PROOF_MODE=processed SITE_PROOF_OUT=./dist        npx astro build
SITE_PROOF_MODE=processed SITE_PROOF_CSP=1 SITE_PROOF_OUT=./dist-csp npx astro build
