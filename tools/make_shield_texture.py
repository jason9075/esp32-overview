#!/usr/bin/env python3
"""
Perspective-correct the RF shield from a top-down photo of the real board into a
flat texture used by tools/generate_board_model.py.

Usage: python3 tools/make_shield_texture.py <top_photo.jpg>
Writes tools/textures/shield_top.jpg (texture u = board +Z, v = board -X).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

OUT = Path(__file__).resolve().parent / "textures" / "shield_top.jpg"
# Shield corners in the original 3472x4624 photo (TL, TR, BR, BL), slightly inset past the bevel
CORNERS = [(774, 694), (2086, 643), (2116, 2036), (808, 2084)]
W, H = 790, 855  # 15.8 mm (Z) x 17.1 mm (X) at 50 px/mm


def perspective_coeffs(dst, src):
    rows, rhs = [], []
    for (x, y), (u, v) in zip(dst, src):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); rhs.append(u)
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y]); rhs.append(v)
    return np.linalg.solve(np.array(rows, float), np.array(rhs, float)).tolist()


def main():
    im = ImageOps.exif_transpose(Image.open(sys.argv[1])).convert("RGB")
    dst = [(0, 0), (W, 0), (W, H), (0, H)]
    tex = im.transform((W, H), Image.Transform.PERSPECTIVE, perspective_coeffs(dst, CORNERS), Image.Resampling.BICUBIC)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tex = ImageOps.autocontrast(tex, cutoff=0.5)
    tex.save(OUT, quality=88)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
