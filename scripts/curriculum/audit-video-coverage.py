#!/usr/bin/env python3
"""
LYRIC <-> IMAGE COVERAGE AUDIT for the 58-week English curriculum.

Reads:
  - spec/week-NN.json (songs[].role/title/lyrics)
  - Week NN/images/*.png (basenames, excluding *-coloring.*)

Produces:
  - VIDEO_COVERAGE_AUDIT_JUL14.md (human readable)
  - video-coverage-audit-jul14.json (machine data)
"""
import json, re, os, glob, sys
from collections import defaultdict, Counter

SPEC_DIR = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/lib/montree/english-curriculum/spec"
IMAGES_ROOT = "/Users/tredouxwillemse/Desktop/English Curriculum 2026"
OUT_MD = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/curriculum/VIDEO_COVERAGE_AUDIT_JUL14.md"
OUT_JSON = "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree/docs/curriculum/video-coverage-audit-jul14.json"

# ---- tokenizer rules ----
CONNECTIVES = {
    "a","an","and","as","be","by","do","he","i","if","is","it","its","my","no",
    "of","or","so","the","to","we","you","who","am","me","us","ha","oh","la","eh","mm","hm"
}
MEANING_WHITELIST = {"in","on","up","at","ox","ax","go","what"}

PREPOSITIONS = {
    "in","on","up","under","over","between","beside","off","out","down","behind"
}

WORD_RE = re.compile(r"[a-z0-9]+")

def normalize_token(tok: str) -> str:
    """Collapse simple plural variants (token vs token+'s'/'es') to a canonical singular-ish form."""
    if len(tok) > 3 and tok.endswith("es"):
        return tok[:-2]
    if len(tok) > 2 and tok.endswith("s") and not tok.endswith("ss"):
        return tok[:-1]
    return tok

def tokenize(text: str, drop_stopwords=True):
    """Lowercase alphanumeric split, min length 2, connective stopwords dropped
    (unless in the meaning whitelist), pure digits dropped, singular/plural
    variants normalized to the same canonical form."""
    raw = WORD_RE.findall(text.lower())
    out = []
    for tok in raw:
        if len(tok) < 2:
            continue
        if tok.isdigit():
            continue
        if drop_stopwords and tok in CONNECTIVES and tok not in MEANING_WHITELIST:
            continue
        out.append(normalize_token(tok))
    return out

def tokenize_line_raw_and_norm(line: str):
    """Return (raw_kept_tokens_in_order, set_of_normalized_tokens)."""
    toks = tokenize(line)
    norm_set = set(toks)
    return toks, norm_set

SECTION_MARKER_RE = re.compile(r"^\s*\[[^\]]*\]\s*$")

def split_lyric_lines(lyrics: str):
    """Split lyrics into sung lines, dropping pure section markers like [Hook 1 - kids chant].
    Parentheticals are kept as words (not stripped)."""
    lines = []
    for raw_line in lyrics.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if SECTION_MARKER_RE.match(line):
            continue
        # Strip an inline leading [marker] prefix if present but keep the rest of the line
        line_wo_bracket = re.sub(r"^\[[^\]]*\]\s*", "", line)
        if not line_wo_bracket.strip():
            continue
        lines.append(line_wo_bracket)
    return lines

# ---- image tokenization ----
LEADING_INDEX_RE = re.compile(r"^\d+-")

def image_basename_tokens(filename: str):
    """Strip extension + leading NN- numeric index, tokenize the remainder in filename order."""
    base = os.path.splitext(filename)[0]
    base = LEADING_INDEX_RE.sub("", base)
    # filenames use '-' or '_' as separators
    base_spaced = base.replace("-", " ").replace("_", " ")
    toks = tokenize(base_spaced)
    return toks

def is_coloring_image(filename: str):
    stem = os.path.splitext(filename)[0]
    return stem.endswith("-coloring") or "-coloring" in stem

# ---- matching ----
def phrase_match(image_tokens_norm_seq, line_tokens_norm_seq):
    """True if the image's full ordered token sequence appears as a contiguous
    subsequence within the line's token sequence (order-preserving substring match)."""
    if not image_tokens_norm_seq:
        return False
    n, m = len(line_tokens_norm_seq), len(image_tokens_norm_seq)
    if m > n:
        return False
    for i in range(n - m + 1):
        if line_tokens_norm_seq[i:i+m] == image_tokens_norm_seq:
            return True
    return False

def weak_match(image_tokens_norm_set, line_tokens_norm_set):
    return len(image_tokens_norm_set & line_tokens_norm_set) >= 1

def has_preposition_and_noun(line_tokens_norm):
    has_prep = any(t in PREPOSITIONS for t in line_tokens_norm)
    # "noun" heuristic: any token that isn't a preposition and isn't a pure
    # function/connective word (already filtered) and length >= 3
    has_noun_ish = any(t not in PREPOSITIONS and len(t) >= 3 for t in line_tokens_norm)
    return has_prep and has_noun_ish

def week_dir_for(n: int):
    return os.path.join(IMAGES_ROOT, f"Week {n:02d}")

def load_week_images(n: int):
    """Return list of dicts: {filename, tokens(list,norm order preserved), norm_set}
    Excludes *-coloring.* files."""
    img_dir = os.path.join(week_dir_for(n), "images")
    result = []
    if not os.path.isdir(img_dir):
        return result
    for fn in sorted(os.listdir(img_dir)):
        if not re.search(r"\.(png|jpg|jpeg|webp|gif)$", fn, re.I):
            continue
        if is_coloring_image(fn):
            continue
        toks = image_basename_tokens(fn)
        result.append({
            "filename": fn,
            "tokens": toks,
            "norm_set": set(toks),
        })
    return result

def load_week_images_all(n: int):
    """All image files (incl coloring) for 'unused images' completeness -- but per spec,
    coloring images are excluded from video consideration entirely, so we track them
    separately as 'printable-only, excluded by design'."""
    img_dir = os.path.join(week_dir_for(n), "images")
    all_files = []
    coloring_files = []
    if not os.path.isdir(img_dir):
        return all_files, coloring_files
    for fn in sorted(os.listdir(img_dir)):
        if not re.search(r"\.(png|jpg|jpeg|webp|gif)$", fn, re.I):
            continue
        if is_coloring_image(fn):
            coloring_files.append(fn)
        else:
            all_files.append(fn)
    return all_files, coloring_files

def load_spec(n: int):
    path = os.path.join(SPEC_DIR, f"week-{n:02d}.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)

def audit_song(week_n, role, title, lyrics, images):
    lines = split_lyric_lines(lyrics)
    line_results = []
    total_sung_lines = 0
    covered_lines = 0
    critical_gaps = []
    image_used_in_song = set()

    for line in lines:
        raw_toks, norm_set = tokenize_line_raw_and_norm(line)
        if not raw_toks:
            continue
        total_sung_lines += 1
        line_norm_seq = raw_toks  # already normalized inside tokenize()

        best_image = None
        best_match_type = "none"

        # try phrase match first (best), across all images
        for img in images:
            if phrase_match(img["tokens"], line_norm_seq):
                best_image = img["filename"]
                best_match_type = "phrase"
                image_used_in_song.add(img["filename"])
                break

        if best_match_type != "phrase":
            # weak match: pick image with the most overlapping tokens
            best_overlap = 0
            for img in images:
                overlap = len(img["norm_set"] & norm_set)
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_image = img["filename"]
            if best_overlap >= 1:
                best_match_type = "weak"
                image_used_in_song.add(best_image)
            else:
                best_match_type = "none"
                best_image = None

        if best_match_type in ("phrase",):
            covered_lines += 1
        elif best_match_type == "weak":
            # weak match counts as partial coverage, not full coverage
            pass

        is_scene_line = has_preposition_and_noun(line_norm_seq)
        if is_scene_line and best_match_type != "phrase":
            critical_gaps.append({
                "week": week_n,
                "role": role,
                "song_title": title,
                "line": line,
                "match_type": best_match_type,
                "nearest_image": best_image,
            })

        line_results.append({
            "line": line,
            "tokens": line_norm_seq,
            "best_image": best_image,
            "match_type": best_match_type,
            "is_scene_line": is_scene_line,
        })

    coverage_pct = (covered_lines / total_sung_lines * 100) if total_sung_lines else None

    return {
        "week": week_n,
        "role": role,
        "title": title,
        "total_sung_lines": total_sung_lines,
        "covered_lines_phrase": covered_lines,
        "coverage_pct": coverage_pct,
        "lines": line_results,
        "critical_gaps": critical_gaps,
        "images_used": sorted(image_used_in_song),
    }

def find_ambiguous_pairs(images):
    """Images whose token sequences are identical, or one is a strict
    prefix/subset of another (collision risk)."""
    pairs = []
    n = len(images)
    for i in range(n):
        for j in range(i+1, n):
            a, b = images[i], images[j]
            ta, tb = a["tokens"], b["tokens"]
            sa, sb = a["norm_set"], b["norm_set"]
            if not ta or not tb:
                continue
            if ta == tb:
                pairs.append({"a": a["filename"], "b": b["filename"], "kind": "identical"})
                continue
            # prefix check
            shorter, longer = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
            if longer[:len(shorter)] == shorter:
                pairs.append({"a": a["filename"], "b": b["filename"], "kind": "prefix"})
                continue
            # strict subset of normalized set (and not disjoint-length-1 trivial single shared token)
            if sa != sb and (sa <= sb or sb <= sa) and min(len(sa), len(sb)) >= 1:
                # only flag if the smaller set has >=1 token and truly subset (already true) and
                # smaller isn't trivially a single very common token
                pairs.append({"a": a["filename"], "b": b["filename"], "kind": "subset"})
    return pairs

def main():
    all_songs_data = []
    week_summaries = []
    all_critical_gaps = []
    all_ambiguous_pairs = []
    unused_images_by_week = {}
    printable_only_by_week = {}

    for n in range(1, 59):
        spec = load_spec(n)
        images = load_week_images(n)
        all_img_files, coloring_files = load_week_images_all(n)
        printable_only_by_week[n] = coloring_files

        if spec is None:
            week_summaries.append({"week": n, "error": "missing spec"})
            continue

        songs = spec.get("songs", [])
        week_song_results = []
        week_image_usage = set()

        for s in songs:
            role = s.get("role", "?")
            title = s.get("title", "")
            lyrics = s.get("lyrics", "")
            res = audit_song(n, role, title, lyrics, images)
            week_song_results.append(res)
            all_songs_data.append(res)
            week_image_usage |= set(res["images_used"])
            all_critical_gaps.extend(res["critical_gaps"])

        # unused images = images never matched (phrase or weak) in ANY song this week
        never_used = [img["filename"] for img in images if img["filename"] not in week_image_usage]
        unused_images_by_week[n] = never_used

        # ambiguous pairs among this week's (non-coloring) images
        amb = find_ambiguous_pairs(images)
        for p in amb:
            p["week"] = n
        all_ambiguous_pairs.extend(amb)

        week_coverage_vals = [r["coverage_pct"] for r in week_song_results if r["coverage_pct"] is not None]
        week_avg_cov = sum(week_coverage_vals)/len(week_coverage_vals) if week_coverage_vals else None
        week_crit_count = sum(len(r["critical_gaps"]) for r in week_song_results)

        week_summaries.append({
            "week": n,
            "songs": [{"role": r["role"], "title": r["title"], "coverage_pct": r["coverage_pct"],
                       "critical_gaps": len(r["critical_gaps"]), "total_lines": r["total_sung_lines"]}
                      for r in week_song_results],
            "avg_coverage_pct": week_avg_cov,
            "critical_gap_count": week_crit_count,
            "unused_image_count": len(never_used),
            "ambiguous_pair_count": len(amb),
        })

    # ---- curriculum totals ----
    all_coverages = [s["coverage_pct"] for s in all_songs_data if s["coverage_pct"] is not None]
    avg_coverage = sum(all_coverages)/len(all_coverages) if all_coverages else 0
    weeks_with_gaps = len({g["week"] for g in all_critical_gaps})
    songs_audited = len(all_songs_data)

    # totally unmatchable images: images that are unused across ALL of their week's songs
    # AND have >=1 token (i.e. not just noise) -- report count
    total_unmatchable_images = sum(len(v) for v in unused_images_by_week.values())

    worst_songs = sorted(
        [s for s in all_songs_data if s["coverage_pct"] is not None],
        key=lambda s: s["coverage_pct"]
    )[:15]

    # ---- write JSON ----
    json_out = {
        "generated": "2026-07-14",
        "curriculum_totals": {
            "songs_audited": songs_audited,
            "avg_coverage_pct": round(avg_coverage, 1),
            "critical_scene_gaps": len(all_critical_gaps),
            "weeks_with_gaps": weeks_with_gaps,
            "ambiguous_pairs": len(all_ambiguous_pairs),
            "totally_unmatchable_images": total_unmatchable_images,
        },
        "week_summaries": week_summaries,
        "songs": all_songs_data,
        "critical_gaps": all_critical_gaps,
        "ambiguous_pairs": all_ambiguous_pairs,
        "unused_images_by_week": unused_images_by_week,
        "printable_only_coloring_by_week": printable_only_by_week,
    }
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w") as f:
        json.dump(json_out, f, indent=2)

    # ---- write MD ----
    lines_md = []
    lines_md.append("# Video Coverage Audit — Jul 14, 2026")
    lines_md.append("")
    lines_md.append("Lyric-line -> image coverage audit across all 58 weeks (114 songs total, W1 is a 1-song exception).")
    lines_md.append("Generated by `scripts/curriculum/audit-video-coverage.py`.")
    lines_md.append("")
    lines_md.append("## Curriculum-wide totals")
    lines_md.append("")
    lines_md.append(f"- Songs audited: **{songs_audited}**")
    lines_md.append(f"- Average line coverage (phrase-matched / total sung lines): **{avg_coverage:.1f}%**")
    lines_md.append(f"- Critical scene-line gaps (preposition+noun line with no phrase-matched image): **{len(all_critical_gaps)}**")
    lines_md.append(f"- Weeks containing at least one critical gap: **{weeks_with_gaps} / 58**")
    lines_md.append(f"- Ambiguous image pairs (identical/prefix/subset token collisions): **{len(all_ambiguous_pairs)}**")
    lines_md.append(f"- Total unused images (never matched to any line in their week, any song): **{total_unmatchable_images}**")
    lines_md.append("")

    lines_md.append("## Per-week table")
    lines_md.append("")
    lines_md.append("| Week | Sound song cov% | Word song cov% | Avg cov% | Critical gaps | Unused imgs | Ambiguous pairs |")
    lines_md.append("|---|---|---|---|---|---|---|")
    for ws in week_summaries:
        if "error" in ws:
            lines_md.append(f"| {ws['week']:02d} | — | — | — | — | — | MISSING SPEC |")
            continue
        by_role = {s["role"]: s for s in ws["songs"]}
        sound_cov = by_role.get("sound", {}).get("coverage_pct")
        word_cov = by_role.get("word", {}).get("coverage_pct")
        sound_str = f"{sound_cov:.0f}%" if sound_cov is not None else "—"
        word_str = f"{word_cov:.0f}%" if word_cov is not None else "—"
        avg_str = f"{ws['avg_coverage_pct']:.0f}%" if ws['avg_coverage_pct'] is not None else "—"
        lines_md.append(
            f"| {ws['week']:02d} | {sound_str} | {word_str} | {avg_str} | {ws['critical_gap_count']} | {ws['unused_image_count']} | {ws['ambiguous_pair_count']} |"
        )
    lines_md.append("")

    lines_md.append("## Critical gaps (scene lines with no phrase-matched image)")
    lines_md.append("")
    lines_md.append(f"Total: {len(all_critical_gaps)}. A scene line = contains a spatial preposition "
                     f"({', '.join(sorted(PREPOSITIONS))}) + at least one noun-ish token, with no full "
                     f"ordered-phrase image match (weak/no match only).")
    lines_md.append("")
    for g in all_critical_gaps:
        lines_md.append(
            f"- **W{g['week']:02d} / {g['role']} / \"{g['song_title']}\"** — "
            f"\"{g['line']}\" — match: {g['match_type']}"
            + (f", nearest image: `{g['nearest_image']}`" if g['nearest_image'] else ", no image shares any token")
        )
    lines_md.append("")

    lines_md.append("## Ambiguous image pairs (collision risk)")
    lines_md.append("")
    lines_md.append(f"Total: {len(all_ambiguous_pairs)}. Same-week images whose token sequences are "
                     f"identical, or one is a strict prefix/subset of the other.")
    lines_md.append("")
    by_week_amb = defaultdict(list)
    for p in all_ambiguous_pairs:
        by_week_amb[p["week"]].append(p)
    for wk in sorted(by_week_amb):
        lines_md.append(f"**Week {wk:02d}:**")
        for p in by_week_amb[wk]:
            lines_md.append(f"  - `{p['a']}` <-> `{p['b']}` ({p['kind']})")
    lines_md.append("")

    lines_md.append("## Unused images per week (compact)")
    lines_md.append("")
    lines_md.append("Images (non-coloring) whose tokens never matched any lyric line, any song, that week. "
                     "May be legitimate printable-only assets (three-part cards, bingo tiles) not intended for video use — "
                     "flagged here for a human sanity pass, not automatically a defect.")
    lines_md.append("")
    for n in range(1, 59):
        unused = unused_images_by_week.get(n, [])
        if unused:
            lines_md.append(f"- **W{n:02d}** ({len(unused)}): {', '.join('`'+u+'`' for u in unused)}")
    lines_md.append("")

    lines_md.append("## Printable-only images excluded by design (coloring pages)")
    lines_md.append("")
    lines_md.append("`*-coloring.*` files are excluded from video-coverage consideration entirely per the matcher spec. "
                     "Listed here only for completeness — not gaps.")
    lines_md.append("")
    total_coloring = sum(len(v) for v in printable_only_by_week.values())
    lines_md.append(f"Total coloring-page files excluded: {total_coloring}")
    lines_md.append("")

    with open(OUT_MD, "w") as f:
        f.write("\n".join(lines_md))

    # ---- console summary for the caller ----
    print("=== CURRICULUM-WIDE STATS ===")
    print(f"Songs audited: {songs_audited}")
    print(f"Average line coverage: {avg_coverage:.1f}%")
    print(f"Critical scene gaps: {len(all_critical_gaps)}")
    print(f"Weeks with gaps: {weeks_with_gaps}/58")
    print(f"Ambiguous pairs: {len(all_ambiguous_pairs)}")
    print(f"Totally unmatchable (unused) images: {total_unmatchable_images}")
    print()
    print("=== 15 WORST SONGS BY COVERAGE ===")
    for s in worst_songs:
        print(f"W{s['week']:02d} {s['role']:5s} \"{s['title']}\" — {s['coverage_pct']:.0f}% ({s['covered_lines_phrase']}/{s['total_sung_lines']} lines) — {len(s['critical_gaps'])} critical gaps")
    print()
    print("=== 20 MOST IMPORTANT CRITICAL GAPS (first 20 by week order) ===")
    for g in all_critical_gaps[:20]:
        print(f"W{g['week']:02d} {g['role']:5s} \"{g['song_title']}\" — \"{g['line']}\" (match={g['match_type']}, nearest={g['nearest_image']})")

if __name__ == "__main__":
    main()
