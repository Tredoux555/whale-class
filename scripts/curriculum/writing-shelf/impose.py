#!/usr/bin/env python3
"""
Dark Phonics · Writing Shelf · re-imposition helper

The v2 generators for 02, 03, 04, 05 and 06 are lost; the PDFs are the only
artefacts.  So a sheet is re-laid-out by CUTTING PIECES OUT of the pristine
original and placing them on a fresh page: each piece is the whole source page
clipped to one card's box and shifted (and uniformly scaled) so that box lands
on the new card.  Nothing is redrawn, nothing is clipped away by accident, and
anything outside the card boxes — the old running head, the old footer prose,
the old dotted rectangles and ticks — simply does not come along.

Scale is a per-sheet constant, and it is not a taste: it is the largest scale
at which the measured ink inside the source box still stops CONTENT_CLEAR (4 mm)
inside the new card edge.  Each builder shows its working.

Millimetres from the bottom-left, everywhere.
"""

import pikepdf

PT = 72.0 / 25.4


def reimpose_pages(src_path, out_path, page_w, page_h, per_page):
    """As reimpose(), but with a DIFFERENT placement list for each source page.

    The flip-card sheets need this: a picture face and a word face are laid out
    from different boxes, and 02 has pages where two of the four quadrants are
    empty.
    """
    src = pikepdf.open(str(src_path))
    out = pikepdf.new()
    for i, page in enumerate(src.pages):
        new = pikepdf.Page(out.add_blank_page(page_size=(page_w * PT, page_h * PT)))
        fx = new.add_resource(
            out.copy_foreign(pikepdf.Page(page).as_form_xobject()),
            pikepdf.Name.XObject, pikepdf.Name("/Fx"))
        ops = []
        for pl in per_page[i]:
            (sx0, sy0, sx1, sy1), (dx0, dy0, dx1, dy1), s = pl[0], pl[1], pl[2]
            scx, scy = (sx0 + sx1) / 2.0 * PT, (sy0 + sy1) / 2.0 * PT
            tcx, tcy = (dx0 + dx1) / 2.0 * PT, (dy0 + dy1) / 2.0 * PT
            tx, ty = tcx - s * scx, tcy - s * scy
            ops.append("q %.4f %.4f %.4f %.4f re W n %.6f 0 0 %.6f %.4f %.4f cm %s Do Q"
                       % (dx0 * PT, dy0 * PT, (dx1 - dx0) * PT, (dy1 - dy0) * PT,
                          s, s, tx, ty, fx))
        new.contents_add(pikepdf.Stream(out, ("\n".join(ops)).encode()), prepend=False)
    out.save(str(out_path))
    n = len(src.pages)
    src.close()
    return n


def reimpose(src_path, out_path, page_w, page_h, placements):
    """placements: [(src_box, dst_box, scale)] or [(src_box, dst_box, scale, inset)].

    src_box and dst_box are (x0, y0, x1, y1) in mm; the source box centre is
    mapped to the destination box centre and the content is clipped.

    `inset` (mm, in SOURCE units) shrinks the CLIP only, never the placement:
    the old sheets drew their dotted trim rectangle exactly ON the box line I am
    cutting the piece out along, so without an inset that dotted rule rides
    along into the new card and lands ~0.6 mm inside its edge — which is both
    ugly and a second, wrong, cut line.  0.6 mm of inset removes the dots
    (0.265 mm wide, straddling the line) and nothing else: the nearest real ink
    on any of these sheets is 3.5 mm inside its box.
    """
    src = pikepdf.open(str(src_path))
    out = pikepdf.new()
    for page in src.pages:
        new = pikepdf.Page(out.add_blank_page(page_size=(page_w * PT, page_h * PT)))
        fx = new.add_resource(
            out.copy_foreign(pikepdf.Page(page).as_form_xobject()),
            pikepdf.Name.XObject, pikepdf.Name("/Fx"))
        ops = []
        for pl in placements:
            (sx0, sy0, sx1, sy1), (dx0, dy0, dx1, dy1), s = pl[0], pl[1], pl[2]
            inset = pl[3] if len(pl) > 3 else 0.0
            scx, scy = (sx0 + sx1) / 2.0 * PT, (sy0 + sy1) / 2.0 * PT
            tcx, tcy = (dx0 + dx1) / 2.0 * PT, (dy0 + dy1) / 2.0 * PT
            tx, ty = tcx - s * scx, tcy - s * scy
            # clip = the image of the (inset) source box, never wider than the card
            cx0 = max(dx0 * PT, tcx + s * ((sx0 + inset) * PT - scx))
            cy0 = max(dy0 * PT, tcy + s * ((sy0 + inset) * PT - scy))
            cx1 = min(dx1 * PT, tcx + s * ((sx1 - inset) * PT - scx))
            cy1 = min(dy1 * PT, tcy + s * ((sy1 - inset) * PT - scy))
            ops.append("q %.4f %.4f %.4f %.4f re W n %.6f 0 0 %.6f %.4f %.4f cm %s Do Q"
                       % (cx0, cy0, cx1 - cx0, cy1 - cy0, s, s, tx, ty, fx))
        new.contents_add(pikepdf.Stream(out, ("\n".join(ops)).encode()), prepend=False)
    out.save(str(out_path))
    n = len(src.pages)
    src.close()
    return n


def clearance_scale(card_w, card_h, src_w, src_h, ink_margins, clear):
    """Largest uniform scale that keeps the source ink `clear` mm inside the card.

    ink_margins is (left, bottom, right, top): how far the ink sits inside the
    SOURCE box, measured off a raster of the pristine sheet.  The source box is
    centred in the card, so the ink margin on the new card is
        m * s + (card - src * s) / 2
    and this returns the scale at which the tightest of the four equals `clear`.
    """
    best = min(card_w / src_w, card_h / src_h)
    for m, card, src in ((ink_margins[0], card_w, src_w),
                         (ink_margins[2], card_w, src_w),
                         (ink_margins[1], card_h, src_h),
                         (ink_margins[3], card_h, src_h)):
        denom = src / 2.0 - m
        if denom > 1e-9:
            best = min(best, (card / 2.0 - clear) / denom)
    return best
