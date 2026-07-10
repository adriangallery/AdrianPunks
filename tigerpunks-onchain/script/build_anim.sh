#!/usr/bin/env bash
# Regenerate the 11 animated 1/1 SVGs (tokenIds 1-11) from the CORRECT source art.
#
# ⚠️ SOURCE OF TRUTH = the ORIGINAL AdrianPunks collection:
#        ../market/adrianpunksimages/<ogId>.gif
#    NOT ../market/omega/ or ../market/alpha/ — those are *PocketAdrians* and were
#    used by mistake in the first pass (see DRYRUN_BASE_2026-07-09.md, risk R6).
#
# Output SVGs land in out/anim/{final,all}/ which are gitignored (regenerable
# build artifacts). DeployFull.s.sol reads out/anim/final/<ogId>.svg at deploy;
# test/Special.t.sol reads out/anim/all/807.svg. Run this before any deploy so the
# on-chain art is the OG, not PocketAdrians.
#
# Usage: bash script/build_anim.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="../market/adrianpunksimages"     # OG collection (correct)
OG_IDS=(1 13 69 221 369 420 555 690 777 807 911)

mkdir -p out/anim/final out/anim/all
for id in "${OG_IDS[@]}"; do
  gif="$SRC/$id.gif"
  if [ ! -f "$gif" ]; then
    echo "ERROR: missing OG source $gif" >&2
    exit 1
  fi
  python3 script/gen_anim_delta.py "$gif" "out/anim/final/$id.svg"
  cp "out/anim/final/$id.svg" "out/anim/all/$id.svg"
done
echo "Regenerated ${#OG_IDS[@]} animated 1/1 SVGs from OG art ($SRC) into out/anim/final and out/anim/all."
