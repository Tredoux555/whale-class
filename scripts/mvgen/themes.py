"""Theme configuration for mvgen.

Every visual parameter lives in this one dict so phase-2 polish is a config
change, not a code change. Colours are plain "#RRGGBB"; the ASS layer converts
them to libass's &HAABBGGRR format.

Two themes ship in phase 1:
  - "montree" : the brand "dark forest" look (deep green + gold, Lora italic).
  - "kids"    : the curriculum house style (bright, #2D5A27 frame, Andika).
"""

# Target render canvas. v1 is landscape 1920x1080 (see README / spec note).
VIDEO_W = 1920
VIDEO_H = 1080
FPS = 30

THEMES = {
    "montree": {
        # --- backdrop ---
        # Shown only where an image cannot cover the frame (images are
        # cover-cropped, so this is a safety colour, not usually visible).
        "bg": "#0a1a0f",
        # Decorative border frame drawn around the video. 0 thickness = none.
        "frame_color": "#E8C96A",
        "frame_thickness": 0,
        # --- subtitle typography ---
        "font": "Lora",
        # Filled in at runtime by mvgen._resolve_font_file from the bundled
        # scripts/mvgen/fonts/ dir (Lora-Italic.ttf). None here -> if resolution
        # fails, libass falls back to system fontconfig lookup by name.
        "font_file": None,
        "italic": True,
        "bold": False,
        "fontsize": 76,
        # PrimaryColour   = the "already sung" / highlighted colour (gold).
        # SecondaryColour = the "not yet sung" base colour (cream).
        # As karaoke time passes each word sweeps from secondary -> primary.
        "primary": "#E8C96A",    # gold highlight
        "secondary": "#E8F0EA",  # cream base
        "outline_color": "#06140C",
        "outline": 3.2,
        "shadow": 1.6,
        # Vertical margin from bottom (ASS units at PlayRes).
        "margin_v": 90,
    },
    "kids": {
        "bg": "#FFFFFF",
        "frame_color": "#2D5A27",
        "frame_thickness": 26,
        "font": "Andika",
        # Filled in at runtime by mvgen._resolve_font_file: bundled
        # scripts/mvgen/fonts/Andika-Bold.ttf, else an Andika ttf found near the
        # --images/--audio assets, else system fontconfig by name.
        "font_file": None,
        "italic": False,
        "bold": True,
        "fontsize": 88,
        "primary": "#FFD23F",    # sunny yellow highlight
        "secondary": "#FFFFFF",  # white base
        "outline_color": "#2D5A27",
        "outline": 5.0,
        "shadow": 2.0,
        "margin_v": 110,
    },
}

DEFAULT_THEME = "kids"


def get_theme(name):
    if name not in THEMES:
        raise ValueError(
            "unknown theme %r (choose from %s)" % (name, ", ".join(THEMES))
        )
    # Return a shallow copy so callers can inject runtime values (font_file).
    return dict(THEMES[name])
