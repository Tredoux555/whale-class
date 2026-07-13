"""ASS (Advanced SubStation Alpha) karaoke subtitle generation.

Kept as its own module because build-order step 2 extends the styling here
(per-syllable effects, section-aware colours) without touching the render
engine.

Word timings come straight from the whisper word list in timeline.json. We
group words into readable lines, then emit an ASS \\kf karaoke sweep so each
word lights up from SecondaryColour (base) to PrimaryColour (highlight) exactly
when it is sung.
"""

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def hex_to_ass(hex_color, alpha=0):
    """'#RRGGBB' -> '&HAABBGGRR' (libass byte order, AA=00 fully opaque)."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError("bad hex colour: %r" % hex_color)
    r = int(h[0:2], 16)
    g = int(h[2:4], 16)
    b = int(h[4:6], 16)
    a = max(0, min(255, int(alpha)))
    return "&H%02X%02X%02X%02X" % (a, b, g, r)


# ---------------------------------------------------------------------------
# Time formatting
# ---------------------------------------------------------------------------

def fmt_time(t):
    """seconds -> ASS 'H:MM:SS.cc' (centisecond precision)."""
    if t < 0:
        t = 0.0
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return "%d:%02d:%02d.%02d" % (h, m, s, cs)


def _escape(text):
    """Escape characters special to ASS event text."""
    return (
        text.replace("\\", "\\\\")
        .replace("{", "\\{")
        .replace("}", "\\}")
    )


# ---------------------------------------------------------------------------
# Line grouping
# ---------------------------------------------------------------------------

def group_words(words, max_words=6, max_gap=0.9, max_line_dur=5.0):
    """Split a flat word list into subtitle lines.

    A new line starts when: the gap before a word exceeds ``max_gap``, the
    current line already holds ``max_words`` words, or the line would exceed
    ``max_line_dur`` seconds. Deterministic (no randomness).
    """
    lines = []
    cur = []
    for w in words:
        if not cur:
            cur = [w]
            continue
        gap = w["start"] - cur[-1]["end"]
        line_dur = w["end"] - cur[0]["start"]
        if gap > max_gap or len(cur) >= max_words or line_dur > max_line_dur:
            lines.append(cur)
            cur = [w]
        else:
            cur.append(w)
    if cur:
        lines.append(cur)
    return lines


# ---------------------------------------------------------------------------
# ASS document
# ---------------------------------------------------------------------------

def _style_line(theme):
    primary = hex_to_ass(theme["primary"])
    secondary = hex_to_ass(theme["secondary"])
    outline = hex_to_ass(theme["outline_color"])
    back = hex_to_ass("#000000", alpha=100)
    bold = -1 if theme.get("bold") else 0
    italic = -1 if theme.get("italic") else 0
    # Format order per ASS V4+ spec.
    return (
        "Style: Default,{font},{size},{primary},{secondary},{outline},{back},"
        "{bold},{italic},0,0,100,100,0,0,1,{ow},{shadow},2,60,60,{mv},1".format(
            font=theme["font"],
            size=int(theme["fontsize"]),
            primary=primary,
            secondary=secondary,
            outline=outline,
            back=back,
            bold=bold,
            italic=italic,
            ow=theme["outline"],
            shadow=theme["shadow"],
            mv=int(theme["margin_v"]),
        )
    )


def _dialogue_for_line(line, next_start=None):
    """Build one Dialogue event with \\kf karaoke tags for a group of words.

    ``next_start`` is the start time of the following line (or None for the last
    line); the +0.15s readability pad on this line's end is clamped so it never
    overruns into the next line's start (which would double-stack subtitles)."""
    start = line[0]["start"]
    end = line[-1]["end"]
    cursor = start
    parts = []
    for i, w in enumerate(line):
        # Unsung wait for any gap since the previous word ended.
        gap_cs = int(round((w["start"] - cursor) * 100))
        if gap_cs > 0:
            parts.append("{\\k%d}" % gap_cs)
        dur_cs = max(1, int(round((w["end"] - w["start"]) * 100)))
        space = " " if i > 0 else ""
        parts.append("{\\kf%d}%s%s" % (dur_cs, space, _escape(w["word"].strip())))
        cursor = w["end"]
    text = "".join(parts)
    end_padded = end + 0.15
    if next_start is not None:
        end_padded = min(end_padded, max(end, next_start))
    return "Dialogue: 0,{s},{e},Default,,0,0,0,,{t}".format(
        s=fmt_time(start), e=fmt_time(end_padded), t=text
    )


def build_ass(words, theme, video_w, video_h):
    """Return a complete ASS document string for the given word list."""
    header = [
        "[Script Info]",
        "; Generated by mvgen (deterministic, no AI at render time)",
        "ScriptType: v4.00+",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "YCbCr Matrix: TV.709",
        "PlayResX: %d" % video_w,
        "PlayResY: %d" % video_h,
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding",
        _style_line(theme),
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, "
        "MarginV, Effect, Text",
    ]
    events = []
    grouped = group_words(words)
    for idx, line in enumerate(grouped):
        # Skip empty / whitespace-only lines defensively.
        if not any(w["word"].strip() for w in line):
            continue
        next_start = grouped[idx + 1][0]["start"] if idx + 1 < len(grouped) else None
        events.append(_dialogue_for_line(line, next_start=next_start))
    return "\n".join(header + events) + "\n"
