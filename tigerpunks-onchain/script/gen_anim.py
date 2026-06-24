#!/usr/bin/env python3
"""GIF -> on-chain animated SVG (SMIL discrete-opacity frames, rect-per-run, 24x24).
Usage: python3 gen_anim.py <input.gif> <output.svg> [grid]
SVG uses single quotes so it embeds inside a JSON double-quoted string (no base64)."""
import sys
from PIL import Image, ImageSequence
import numpy as np

inp, outp = sys.argv[1], sys.argv[2]
G = int(sys.argv[3]) if len(sys.argv) > 3 else 24

frames = [f.convert("RGBA").resize((G, G), Image.NEAREST) for f in ImageSequence.Iterator(Image.open(inp))]
N = len(frames)

def q(c):  # light quantize to merge near-identical colors (kills GIF dithering noise)
    return ((c[0] // 8) * 8, (c[1] // 8) * 8, (c[2] // 8) * 8, c[3])

def rects(fr):
    a = np.asarray(fr).reshape(G, G, 4); out = []
    for y in range(G):
        x = 0
        while x < G:
            px = tuple(int(v) for v in a[y, x])
            if px[3] < 128:
                x += 1; continue
            c = q(px); run = 1
            while x + run < G:
                nx = tuple(int(v) for v in a[y, x + run])
                if nx[3] >= 128 and q(nx) == c: run += 1
                else: break
            out.append((x, y, run, c)); x += run
    return out

keyTimes = ";".join(f"{i/N:.4f}" for i in range(N + 1))
dur = f"{max(N * 0.12, 1.0):.2f}s"
parts = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {G} {G}' shape-rendering='crispEdges'>"]
for i, fr in enumerate(frames):
    vals = ";".join("1" if (k % N) == i else "0" for k in range(N + 1))
    g = [f"<g opacity='0'><animate attributeName='opacity' dur='{dur}' repeatCount='indefinite' calcMode='discrete' keyTimes='{keyTimes}' values='{vals}'/>"]
    for x, y, w, c in rects(fr):
        g.append(f"<rect x='{x}' y='{y}' width='{w}' height='1' fill='rgb({c[0]},{c[1]},{c[2]})'/>")
    g.append("</g>"); parts.append("".join(g))
parts.append("</svg>")
svg = "".join(parts)
open(outp, "w").write(svg)
print(f"{inp} -> {outp}  frames={N}  bytes={len(svg)} ({len(svg)/1024:.1f} KB)")
