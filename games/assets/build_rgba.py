#!/usr/bin/env python3
"""Chroma-key dark grey background -> transparent. Output character-sprites-rgba.png"""
from PIL import Image
import numpy as np
import os

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "character-sprites.png")
out = os.path.join(here, "character-sprites-rgba.png")

im = Image.open(src).convert("RGB")
a = np.array(im)
h, w, _ = a.shape
# RGBA
outp = np.zeros((h, w, 4), dtype=np.uint8)
outp[:, :, :3] = a

r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
# background: very dark, or low sum
s = r.astype(np.int32) + g.astype(np.int32) + b.astype(np.int32)
dark = (r < 52) & (g < 52) & (b < 58)
dark2 = s < 95
# don't eat dark clothing: prefer consistent bg (usually blue-grey)
bg = dark & dark2
outp[:, :, 3] = np.where(bg, 0, 255)
# soften edges: optional erode
img = Image.fromarray(outp, "RGBA")
img.save(out, optimize=True)
print("Wrote", out, w, h)
