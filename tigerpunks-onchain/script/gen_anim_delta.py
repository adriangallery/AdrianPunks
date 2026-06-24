#!/usr/bin/env python3
"""GIF -> compact on-chain animated SVG via PER-PIXEL animation.
Static pixels (constant across all frames) are drawn ONCE (run-merged).
Only pixels that change get a 1x1 rect with an <animate> cycling its fill.
Hugely smaller than N full frames when most of the art is static.
Usage: python3 gen_anim_delta.py <in.gif> <out.svg> [grid]"""
import sys
from PIL import Image, ImageSequence
import numpy as np

inp, outp = sys.argv[1], sys.argv[2]
G = int(sys.argv[3]) if len(sys.argv) > 3 else 24
frames = [f.convert("RGBA").resize((G, G), Image.NEAREST) for f in ImageSequence.Iterator(Image.open(inp))]
N = len(frames)

def q(c): return ((int(c[0]) // 8) * 8, (int(c[1]) // 8) * 8, (int(c[2]) // 8) * 8)
arrs = [np.asarray(f).reshape(G, G, 4) for f in frames]

# per-pixel color sequence (opaque GIF frames assumed)
seq = {}   # (x,y) -> tuple of N rgb
for y in range(G):
    for x in range(G):
        seq[(x, y)] = tuple(q(arrs[t][y, x]) for t in range(N))

dyn = {p: s for p, s in seq.items() if len(set(s)) > 1}     # changing pixels
static = {p: s[0] for p, s in seq.items() if len(set(s)) == 1}

keyTimes = ";".join(f"{i/N:.4f}" for i in range(N + 1))
dur = f"{max(N * 0.12, 1.0):.2f}s"
parts = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {G} {G}' shape-rendering='crispEdges'>"]

# static layer, run-merged per row (skip positions that are dynamic)
for y in range(G):
    x = 0
    while x < G:
        if (x, y) in dyn:
            x += 1; continue
        c = static[(x, y)]; run = 1
        while x + run < G and (x + run, y) not in dyn and static[(x + run, y)] == c:
            run += 1
        parts.append(f"<rect x='{x}' y='{y}' width='{run}' height='1' fill='rgb({c[0]},{c[1]},{c[2]})'/>")
        x += run

# dynamic pixels: one animated rect each
for (x, y), s in dyn.items():
    vals = ";".join(f"rgb({c[0]},{c[1]},{c[2]})" for c in s) + f";rgb({s[0][0]},{s[0][1]},{s[0][2]})"
    parts.append(
        f"<rect x='{x}' y='{y}' width='1' height='1' fill='rgb({s[0][0]},{s[0][1]},{s[0][2]})'>"
        f"<animate attributeName='fill' dur='{dur}' repeatCount='indefinite' calcMode='discrete' "
        f"keyTimes='{keyTimes}' values='{vals}'/></rect>")
parts.append("</svg>")
svg = "".join(parts)
open(outp, "w").write(svg)
print(f"{inp.split('/')[-1]} -> frames={N} static={len(static)} dynamic={len(dyn)} bytes={len(svg)} ({len(svg)/1024:.1f}KB)")
