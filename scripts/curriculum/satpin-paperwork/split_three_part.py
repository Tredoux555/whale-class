#!/usr/bin/env python3
"""
split_three_part.py — split a 3-page three_part_cards.pdf (control, pictures,
labels — in that page order, which is what make-material.mjs's three_part_cards
builder emits) into three standalone one-page PDFs for printing:

  <outdir>/three-part-cards-control.pdf
  <outdir>/three-part-cards-pictures.pdf
  <outdir>/three-part-cards-labels.pdf

Promoted from materials-out/_scratch_split_three_part.py (the satpin s,a,t,p,i,n
throwaway), generalised to take any input PDF and output directory instead of
hardcoded letters/paths.

Usage:
  python3 split_three_part.py --in path/to/three_part_cards.pdf --outdir path/to/outdir
"""
import argparse
import os
import sys

from pypdf import PdfReader, PdfWriter

NAMES = [
    'three-part-cards-control.pdf',
    'three-part-cards-pictures.pdf',
    'three-part-cards-labels.pdf',
]


def split(in_pdf, outdir):
    reader = PdfReader(in_pdf)
    n = len(reader.pages)
    if n != 3:
        print(f'✗ {in_pdf}: UNEXPECTED page count {n} (expected 3) -- NOT SPLIT, needs manual review')
        return False
    os.makedirs(outdir, exist_ok=True)
    for i, name in enumerate(NAMES):
        w = PdfWriter()
        w.add_page(reader.pages[i])
        out_path = os.path.join(outdir, name)
        with open(out_path, 'wb') as f:
            w.write(f)
        sz = os.path.getsize(out_path)
        print(f'  ✓ {out_path}  (1 page, {sz} bytes)')
    return True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--in', dest='in_pdf', required=True, help='path to the 3-page three_part_cards.pdf')
    ap.add_argument('--outdir', dest='outdir', required=True, help='directory to write the three split PDFs into')
    args = ap.parse_args()

    if not os.path.isfile(args.in_pdf):
        print(f'✗ no such file: {args.in_pdf}', file=sys.stderr)
        sys.exit(2)

    ok = split(args.in_pdf, args.outdir)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
