#!/usr/bin/env python3
"""
Whiten cream/paper-texture backgrounds baked into pen-and-ink PNGs to pure white.

Method: sample paper colour from a border ring, compute per-pixel distance
from that colour, push pixels within tolerance T fully to white and blend
pixels between T and 2T linearly toward white, leaving darker ink/shadow
pixels untouched.

Usage:
    python3 whiten_sequences.py IN.png OUT.png [--T 28]
"""
import sys
import argparse
import numpy as np
from PIL import Image


def whiten(in_path, out_path, T=28.0):
    img = Image.open(in_path).convert("RGBA")
    arr = np.array(img).astype(np.float64)
    rgb = arr[..., :3]
    alpha = arr[..., 3]

    h, w = rgb.shape[:2]
    border = max(2, int(round(0.03 * min(h, w))))

    ring_pixels = np.concatenate([
        rgb[:border, :, :].reshape(-1, 3),
        rgb[-border:, :, :].reshape(-1, 3),
        rgb[:, :border, :].reshape(-1, 3),
        rgb[:, -border:, :].reshape(-1, 3),
    ], axis=0)
    paper_colour = np.median(ring_pixels, axis=0)

    dist = np.sqrt(np.sum((rgb - paper_colour) ** 2, axis=-1))

    white = np.array([255.0, 255.0, 255.0])
    out_rgb = rgb.copy()

    # Fully white within T
    full_mask = dist <= T
    out_rgb[full_mask] = white

    # Linear blend between T and 2T
    blend_mask = (dist > T) & (dist <= 2 * T)
    if np.any(blend_mask):
        frac = (2 * T - dist[blend_mask]) / T  # 1 at dist=T, 0 at dist=2T
        frac = frac[..., None]
        out_rgb[blend_mask] = rgb[blend_mask] * (1 - frac) + white * frac

    out_arr = np.concatenate([out_rgb, alpha[..., None]], axis=-1)
    out_arr = np.clip(out_arr, 0, 255).astype(np.uint8)
    out_img = Image.fromarray(out_arr, mode="RGBA")
    out_img.save(out_path)
    return paper_colour, dist


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("infile")
    ap.add_argument("outfile")
    ap.add_argument("--T", type=float, default=28.0)
    args = ap.parse_args()
    paper_colour, dist = whiten(args.infile, args.outfile, args.T)
    print(f"{args.infile}: paper_colour(median border)={paper_colour} T={args.T}")


if __name__ == "__main__":
    main()
