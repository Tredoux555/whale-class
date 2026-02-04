#!/usr/bin/env python3
"""
Generate 3-part card illustrations for CVC words (A series)
Clean, simple illustrations suitable for Montessori materials
"""

from PIL import Image, ImageDraw
from pathlib import Path
import math

OUTPUT_DIR = Path('/sessions/lucid-magical-bohr/mnt/whale/public/3-part-cards/a-series')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 400  # Image size
BG_COLOR = (255, 252, 248)  # Warm white background

def draw_cat(draw, size):
    """Draw a cute orange cat"""
    cx, cy = size // 2, size // 2

    # Body
    draw.ellipse([cx-70, cy+20, cx+70, cy+120], fill=(255, 158, 94))

    # Head
    draw.ellipse([cx-60, cy-80, cx+60, cy+40], fill=(255, 158, 94))

    # Ears
    draw.polygon([(cx-50, cy-60), (cx-55, cy-110), (cx-20, cy-50)], fill=(255, 158, 94))
    draw.polygon([(cx+50, cy-60), (cx+55, cy-110), (cx+20, cy-50)], fill=(255, 158, 94))
    draw.polygon([(cx-45, cy-55), (cx-48, cy-95), (cx-25, cy-50)], fill=(255, 184, 160))
    draw.polygon([(cx+45, cy-55), (cx+48, cy-95), (cx+25, cy-50)], fill=(255, 184, 160))

    # Face - lighter muzzle
    draw.ellipse([cx-40, cy-30, cx+40, cy+30], fill=(255, 202, 168))

    # Eyes
    draw.ellipse([cx-35, cy-45, cx-10, cy-15], fill='white')
    draw.ellipse([cx+10, cy-45, cx+35, cy-15], fill='white')
    draw.ellipse([cx-28, cy-38, cx-15, cy-22], fill=(58, 95, 58))
    draw.ellipse([cx+15, cy-38, cx+28, cy-22], fill=(58, 95, 58))

    # Nose
    draw.ellipse([cx-8, cy-5, cx+8, cy+8], fill=(255, 123, 123))

    # Whiskers
    for dy in [-8, 0, 8]:
        draw.line([(cx-60, cy+dy), (cx-35, cy+dy-3)], fill=(139, 111, 92), width=2)
        draw.line([(cx+60, cy+dy), (cx+35, cy+dy-3)], fill=(139, 111, 92), width=2)

    # Tail
    draw.arc([cx+40, cy+30, cx+120, cy+110], 180, 90, fill=(255, 158, 94), width=18)

def draw_bat(draw, size):
    """Draw a cute bat"""
    cx, cy = size // 2, size // 2

    # Wings
    draw.polygon([(cx-120, cy-20), (cx-30, cy-30), (cx-40, cy+40), (cx-100, cy+60), (cx-130, cy+20)], fill=(80, 70, 90))
    draw.polygon([(cx+120, cy-20), (cx+30, cy-30), (cx+40, cy+40), (cx+100, cy+60), (cx+130, cy+20)], fill=(80, 70, 90))

    # Body
    draw.ellipse([cx-35, cy-20, cx+35, cy+80], fill=(60, 50, 70))

    # Head
    draw.ellipse([cx-40, cy-70, cx+40, cy+10], fill=(60, 50, 70))

    # Ears
    draw.polygon([(cx-35, cy-55), (cx-45, cy-100), (cx-15, cy-50)], fill=(60, 50, 70))
    draw.polygon([(cx+35, cy-55), (cx+45, cy-100), (cx+15, cy-50)], fill=(60, 50, 70))

    # Eyes
    draw.ellipse([cx-25, cy-45, cx-8, cy-25], fill='white')
    draw.ellipse([cx+8, cy-45, cx+25, cy-25], fill='white')
    draw.ellipse([cx-20, cy-40, cx-12, cy-30], fill='black')
    draw.ellipse([cx+12, cy-40, cx+20, cy-30], fill='black')

    # Nose
    draw.ellipse([cx-6, cy-18, cx+6, cy-8], fill=(255, 150, 150))

def draw_hat(draw, size):
    """Draw a top hat"""
    cx, cy = size // 2, size // 2

    # Brim
    draw.ellipse([cx-90, cy+30, cx+90, cy+80], fill=(40, 40, 45))

    # Crown
    draw.rectangle([cx-55, cy-80, cx+55, cy+50], fill=(50, 50, 55))
    draw.ellipse([cx-55, cy-100, cx+55, cy-60], fill=(50, 50, 55))
    draw.ellipse([cx-55, cy+30, cx+55, cy+70], fill=(50, 50, 55))

    # Band
    draw.rectangle([cx-56, cy+5, cx+56, cy+30], fill=(180, 50, 50))

def draw_mat(draw, size):
    """Draw a welcome mat"""
    cx, cy = size // 2, size // 2

    # Mat base
    draw.rounded_rectangle([cx-120, cy-50, cx+120, cy+70], radius=15, fill=(139, 90, 43))

    # Border pattern
    draw.rounded_rectangle([cx-110, cy-40, cx+110, cy+60], radius=10, fill=(160, 110, 60))
    draw.rounded_rectangle([cx-100, cy-30, cx+100, cy+50], radius=8, fill=(139, 90, 43))

    # Texture lines
    for i in range(-80, 81, 20):
        draw.line([(cx+i, cy-25), (cx+i, cy+45)], fill=(120, 75, 35), width=2)

def draw_sat(draw, size):
    """Draw someone sitting (child on chair)"""
    cx, cy = size // 2, size // 2

    # Chair
    draw.rectangle([cx-50, cy+20, cx+50, cy+90], fill=(139, 90, 43))
    draw.rectangle([cx-55, cy-60, cx-40, cy+90], fill=(139, 90, 43))
    draw.rectangle([cx+40, cy+70, cx+55, cy+120], fill=(100, 65, 30))
    draw.rectangle([cx-55, cy+70, cx-40, cy+120], fill=(100, 65, 30))

    # Person - body
    draw.ellipse([cx-30, cy-10, cx+30, cy+50], fill=(100, 149, 237))

    # Head
    draw.ellipse([cx-25, cy-70, cx+25, cy-15], fill=(255, 213, 170))

    # Hair
    draw.ellipse([cx-25, cy-75, cx+25, cy-40], fill=(101, 67, 33))

    # Eyes
    draw.ellipse([cx-15, cy-50, cx-5, cy-38], fill='white')
    draw.ellipse([cx+5, cy-50, cx+15, cy-38], fill='white')
    draw.ellipse([cx-12, cy-47, cx-8, cy-41], fill='black')
    draw.ellipse([cx+8, cy-47, cx+12, cy-41], fill='black')

    # Smile
    draw.arc([cx-10, cy-35, cx+10, cy-25], 0, 180, fill=(200, 100, 100), width=2)

    # Legs
    draw.rectangle([cx-20, cy+45, cx-5, cy+100], fill=(70, 70, 120))
    draw.rectangle([cx+5, cy+45, cx+20, cy+100], fill=(70, 70, 120))

def draw_rat(draw, size):
    """Draw a cute rat"""
    cx, cy = size // 2, size // 2

    # Body
    draw.ellipse([cx-60, cy-20, cx+70, cy+60], fill=(169, 169, 169))

    # Head
    draw.ellipse([cx-80, cy-50, cx, cy+30], fill=(169, 169, 169))

    # Snout
    draw.ellipse([cx-110, cy-20, cx-60, cy+20], fill=(190, 190, 190))

    # Ears
    draw.ellipse([cx-50, cy-70, cx-20, cy-35], fill=(255, 180, 180))
    draw.ellipse([cx-20, cy-75, cx+10, cy-40], fill=(255, 180, 180))

    # Eye
    draw.ellipse([cx-55, cy-30, cx-40, cy-12], fill='black')
    draw.ellipse([cx-52, cy-27, cx-47, cy-20], fill='white')

    # Nose
    draw.ellipse([cx-115, cy-8, cx-100, cy+8], fill=(255, 150, 150))

    # Whiskers
    for dy in [-10, 0, 10]:
        draw.line([(cx-115, cy+dy), (cx-140, cy+dy-5)], fill=(100, 100, 100), width=1)

    # Tail
    draw.arc([cx+30, cy, cx+150, cy+100], 250, 60, fill=(200, 180, 180), width=8)

def draw_can(draw, size):
    """Draw a tin can"""
    cx, cy = size // 2, size // 2

    # Can body
    draw.rectangle([cx-50, cy-60, cx+50, cy+70], fill=(192, 192, 192))

    # Top ellipse
    draw.ellipse([cx-50, cy-75, cx+50, cy-45], fill=(220, 220, 220))

    # Bottom ellipse
    draw.ellipse([cx-50, cy+55, cx+50, cy+85], fill=(160, 160, 160))

    # Label
    draw.rectangle([cx-48, cy-30, cx+48, cy+40], fill=(220, 50, 50))

    # Ridges
    for y in [-55, -40, 50, 65]:
        draw.line([(cx-50, cy+y), (cx+50, cy+y)], fill=(170, 170, 170), width=2)

def draw_pan(draw, size):
    """Draw a frying pan"""
    cx, cy = size // 2, size // 2

    # Handle
    draw.rounded_rectangle([cx+50, cy-15, cx+150, cy+15], radius=8, fill=(80, 60, 40))

    # Pan body
    draw.ellipse([cx-80, cy-70, cx+80, cy+70], fill=(70, 70, 75))

    # Inner circle
    draw.ellipse([cx-65, cy-55, cx+65, cy+55], fill=(50, 50, 55))

    # Shine
    draw.arc([cx-50, cy-40, cx+30, cy+20], 200, 320, fill=(100, 100, 105), width=3)

def draw_man(draw, size):
    """Draw a man"""
    cx, cy = size // 2, size // 2

    # Body/shirt
    draw.polygon([(cx-40, cy-20), (cx+40, cy-20), (cx+50, cy+60), (cx-50, cy+60)], fill=(65, 105, 225))

    # Head
    draw.ellipse([cx-30, cy-90, cx+30, cy-25], fill=(255, 213, 170))

    # Hair
    draw.ellipse([cx-30, cy-95, cx+30, cy-55], fill=(60, 40, 30))

    # Eyes
    draw.ellipse([cx-18, cy-65, cx-6, cy-50], fill='white')
    draw.ellipse([cx+6, cy-65, cx+18, cy-50], fill='white')
    draw.ellipse([cx-14, cy-61, cx-9, cy-54], fill='black')
    draw.ellipse([cx+9, cy-61, cx+14, cy-54], fill='black')

    # Smile
    draw.arc([cx-12, cy-45, cx+12, cy-32], 0, 180, fill=(180, 100, 100), width=2)

    # Legs
    draw.rectangle([cx-30, cy+55, cx-8, cy+120], fill=(50, 50, 80))
    draw.rectangle([cx+8, cy+55, cx+30, cy+120], fill=(50, 50, 80))

    # Shoes
    draw.ellipse([cx-35, cy+110, cx-5, cy+130], fill=(40, 30, 30))
    draw.ellipse([cx+5, cy+110, cx+35, cy+130], fill=(40, 30, 30))

def draw_fan(draw, size):
    """Draw an electric fan"""
    cx, cy = size // 2, size // 2

    # Base/stand
    draw.polygon([(cx-50, cy+100), (cx+50, cy+100), (cx+20, cy+40), (cx-20, cy+40)], fill=(100, 100, 105))
    draw.rectangle([cx-8, cy-20, cx+8, cy+45], fill=(80, 80, 85))

    # Fan cage (back)
    draw.ellipse([cx-70, cy-100, cx+70, cy+40], outline=(150, 150, 155), width=4)

    # Blades
    for angle in [0, 72, 144, 216, 288]:
        rad = math.radians(angle)
        x1, y1 = cx + 15 * math.cos(rad), cy - 30 + 15 * math.sin(rad)
        x2, y2 = cx + 55 * math.cos(rad), cy - 30 + 55 * math.sin(rad)
        draw.polygon([
            (x1 - 8 * math.sin(rad), y1 + 8 * math.cos(rad)),
            (x1 + 8 * math.sin(rad), y1 - 8 * math.cos(rad)),
            (x2 + 15 * math.sin(rad), y2 - 15 * math.cos(rad)),
            (x2 - 15 * math.sin(rad), y2 + 15 * math.cos(rad)),
        ], fill=(200, 200, 210))

    # Center hub
    draw.ellipse([cx-15, cy-45, cx+15, cy-15], fill=(80, 80, 85))

def draw_cap(draw, size):
    """Draw a baseball cap"""
    cx, cy = size // 2, size // 2

    # Brim
    draw.ellipse([cx-80, cy+10, cx+50, cy+60], fill=(30, 60, 150))

    # Cap dome
    draw.ellipse([cx-60, cy-60, cx+60, cy+30], fill=(50, 90, 200))

    # Button on top
    draw.ellipse([cx-8, cy-55, cx+8, cy-40], fill=(50, 90, 200))

    # Seam lines
    draw.line([(cx, cy-52), (cx, cy+10)], fill=(30, 60, 150), width=2)
    draw.arc([cx-50, cy-50, cx+50, cy+10], 210, 330, fill=(30, 60, 150), width=2)

def draw_map(draw, size):
    """Draw a treasure/folded map"""
    cx, cy = size // 2, size // 2

    # Map paper
    draw.rectangle([cx-90, cy-70, cx+90, cy+70], fill=(255, 245, 220))

    # Fold lines
    draw.line([(cx-30, cy-70), (cx-30, cy+70)], fill=(220, 210, 180), width=2)
    draw.line([(cx+30, cy-70), (cx+30, cy+70)], fill=(220, 210, 180), width=2)

    # Map details - land mass
    draw.polygon([(cx-60, cy-30), (cx-20, cy-50), (cx+40, cy-20), (cx+60, cy+10),
                  (cx+30, cy+40), (cx-30, cy+50), (cx-70, cy+20)], fill=(144, 238, 144))

    # Water indication
    draw.arc([cx-80, cy+30, cx-40, cy+60], 0, 180, fill=(100, 149, 237), width=2)
    draw.arc([cx+40, cy-50, cx+80, cy-20], 0, 180, fill=(100, 149, 237), width=2)

    # X marks the spot
    draw.line([(cx+10, cy-10), (cx+30, cy+10)], fill=(200, 50, 50), width=4)
    draw.line([(cx+30, cy-10), (cx+10, cy+10)], fill=(200, 50, 50), width=4)

    # Compass rose hint
    draw.ellipse([cx-80, cy-60, cx-55, cy-35], outline=(100, 80, 60), width=2)

def draw_tap(draw, size):
    """Draw a water tap/faucet"""
    cx, cy = size // 2, size // 2

    # Main pipe/spout
    draw.rectangle([cx-15, cy-80, cx+15, cy-20], fill=(192, 192, 192))
    draw.arc([cx-60, cy-50, cx+15, cy+30], 180, 270, fill=(192, 192, 192), width=30)

    # Spout end
    draw.ellipse([cx-75, cy+5, cx-45, cy+35], fill=(180, 180, 185))

    # Handle base
    draw.rectangle([cx-25, cy-90, cx+25, cy-75], fill=(170, 170, 175))

    # Handle
    draw.ellipse([cx-8, cy-120, cx+8, cy-85], fill=(200, 200, 205))
    draw.rectangle([cx-20, cy-105, cx+20, cy-95], fill=(200, 200, 205))

    # Water drops
    draw.ellipse([cx-65, cy+40, cx-55, cy+55], fill=(100, 180, 255))
    draw.ellipse([cx-62, cy+60, cx-54, cy+72], fill=(100, 180, 255))

def draw_bag(draw, size):
    """Draw a paper bag"""
    cx, cy = size // 2, size // 2

    # Bag body
    draw.rectangle([cx-60, cy-50, cx+60, cy+80], fill=(205, 170, 125))

    # Fold at top
    draw.polygon([(cx-60, cy-50), (cx+60, cy-50), (cx+50, cy-70), (cx-50, cy-70)], fill=(185, 150, 105))

    # Side folds
    draw.polygon([(cx-60, cy-50), (cx-60, cy+80), (cx-45, cy+70), (cx-45, cy-40)], fill=(175, 140, 95))
    draw.polygon([(cx+60, cy-50), (cx+60, cy+80), (cx+45, cy+70), (cx+45, cy-40)], fill=(225, 190, 145))

    # Handle holes
    draw.ellipse([cx-35, cy-45, cx-15, cy-30], fill=(195, 160, 115))
    draw.ellipse([cx+15, cy-45, cx+35, cy-30], fill=(195, 160, 115))

def draw_tag(draw, size):
    """Draw a gift tag"""
    cx, cy = size // 2, size // 2

    # Tag body
    draw.polygon([
        (cx-50, cy-60), (cx+50, cy-60), (cx+50, cy+70),
        (cx, cy+90), (cx-50, cy+70)
    ], fill=(255, 220, 100))

    # Hole
    draw.ellipse([cx-12, cy-45, cx+12, cy-20], fill=BG_COLOR)
    draw.ellipse([cx-8, cy-41, cx+8, cy-24], outline=(200, 170, 60), width=2)

    # String
    draw.arc([cx-30, cy-80, cx+30, cy-30], 200, 340, fill=(139, 90, 43), width=3)

    # Lines for text
    draw.line([(cx-30, cy), (cx+30, cy)], fill=(200, 170, 60), width=2)
    draw.line([(cx-25, cy+20), (cx+25, cy+20)], fill=(200, 170, 60), width=2)
    draw.line([(cx-20, cy+40), (cx+20, cy+40)], fill=(200, 170, 60), width=2)

# Main generation
DRAW_FUNCTIONS = {
    'cat': draw_cat,
    'bat': draw_bat,
    'hat': draw_hat,
    'mat': draw_mat,
    'sat': draw_sat,
    'rat': draw_rat,
    'can': draw_can,
    'pan': draw_pan,
    'man': draw_man,
    'fan': draw_fan,
    'cap': draw_cap,
    'map': draw_map,
    'tap': draw_tap,
    'bag': draw_bag,
    'tag': draw_tag,
}

def main():
    print(f"Generating {len(DRAW_FUNCTIONS)} 3-part card images...\n")

    for word, draw_func in DRAW_FUNCTIONS.items():
        # Create image
        img = Image.new('RGB', (SIZE, SIZE), BG_COLOR)
        draw = ImageDraw.Draw(img)

        # Draw the illustration
        draw_func(draw, SIZE)

        # Save
        filepath = OUTPUT_DIR / f'{word}.png'
        img.save(filepath, 'PNG')
        print(f'✓ Generated: {word}.png')

    print(f"\n=== Done! ===")
    print(f"All {len(DRAW_FUNCTIONS)} images saved to: {OUTPUT_DIR}")

if __name__ == '__main__':
    main()
