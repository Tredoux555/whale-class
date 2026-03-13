#!/usr/bin/env python3
"""
Phonics Photo Bank Bulk Downloader
===================================
Downloads free CC0 images from Pixabay for all phonics noun words.
Images are named by word (e.g., "cat.jpg") so the Montree photo bank
auto-matches them when uploaded via /montree/library/photo-bank.

Setup:
  1. Sign up free at https://pixabay.com/accounts/register/
  2. Get your API key at https://pixabay.com/api/docs/
  3. Run: python3 scripts/download-phonics-images.py YOUR_API_KEY

Output:
  - Creates phonics-images/ folder with subfolders per phase
  - Creates phonics-images.zip ready for bulk upload
"""

import os
import sys
import json
import time
import zipfile
import urllib.request
import urllib.parse
import urllib.error

# ============================================================
# PHONICS NOUN WORDS BY PHASE (only nouns — can be pictured)
# Extracted from lib/montree/phonics/phonics-data.ts
# ============================================================

PHONICS_NOUNS = {
    "pink1": [
        "cat", "mat", "can", "men", "net", "pin", "map", "hut", "lip",
        "jug", "bog", "fig", "bed", "fog", "top", "van", "web", "yam", "zip"
    ],
    "pink2_short_a": [
        "bat", "hat", "rat", "pan", "fan", "bag", "tag", "rag", "cab",
        "dad", "ham", "jam", "ram", "cap", "gap", "lap", "nap", "tap", "tax", "wax"
    ],
    "pink2_short_e": [
        "hen", "pen", "ten", "den", "leg", "peg", "keg", "jet", "pet",
        "vet", "gem"
    ],
    "pink2_short_i": [
        "pig", "wig", "jig", "bin", "fin", "tin", "kid", "lid", "bit",
        "kit", "dip", "hip", "tip", "six", "mix"
    ],
    "pink2_short_o": [
        "dog", "log", "hog", "jog", "cog", "fox", "box", "pot", "dot",
        "cot", "mop", "hop", "pop", "nod", "rod", "pod", "cod", "rob", "job", "mob"
    ],
    "pink2_short_u": [
        "cup", "bug", "rug", "sun", "bus", "nut", "mug", "pug", "tug",
        "bun", "fun", "gun", "nun", "bud", "mud", "cub", "tub", "sub", "gum"
    ],
    "blue1_blends": [
        "blob", "brim", "clam", "clip", "crab", "crib", "crop", "drum",
        "flag", "frog", "glen", "glob", "grid", "grin", "grip", "plug",
        "plum", "pram", "prop", "scab", "slab", "sled", "slug", "snag",
        "snap", "spot", "stem", "step", "stop", "stud", "stub", "swan",
        "trap", "tram", "trot", "trim"
    ],
    "blue2_final_blends": [
        "band", "pond", "sand", "wand", "bank", "bunk", "link", "mink",
        "pink", "rink", "tank", "dent", "hint", "lint", "mint", "vent",
        "bump", "camp", "dump", "hump", "jump", "lamp", "lump", "pump",
        "ramp", "raft", "loft", "nest", "vest", "fist", "dust", "mask",
        "disk", "dusk", "husk", "tusk", "belt", "bolt", "jolt", "malt",
        "king", "ring", "wing", "gong", "lung", "fang", "gang"
    ],
    "blue3_doubles_ck": [
        "bell", "bill", "bull", "doll", "gull", "hall", "hill", "hull",
        "mill", "wall", "well", "bass", "boss", "moss", "buff", "cuff",
        "puff", "jazz", "buzz", "fizz", "fuzz", "back", "deck", "dock",
        "duck", "kick", "lock", "neck", "pack", "rack", "rock", "sack",
        "sock", "tack", "tick", "wick"
    ],
    "green1_digraphs": [
        "ship", "shop", "shed", "shin", "shot", "fish", "dish", "bath",
        "moth", "path", "chip", "chop", "chin", "chat", "inch", "whip"
    ],
    "green2_vowel_teams": [
        "cake", "gate", "lake", "tape", "wave", "kite", "line", "pine",
        "bone", "cone", "rope", "rose", "cube", "mule", "tube", "rain",
        "tail", "mail", "nail", "pail", "sail", "bee", "seed", "tree",
        "leaf", "meal", "seal", "boat", "coat", "goat", "road", "soap",
        "toad", "oak", "bow", "snow", "moon", "food", "pool", "roof",
        "tool", "zoo", "book", "cook", "foot", "hook", "wood", "wool",
        "cloud", "house", "mouse", "cow", "owl", "crown", "gown", "town",
        "boil", "coin", "foil", "oil", "soil", "boy", "toy", "clue",
        "glue", "claw", "jaw", "paw", "straw", "lawn", "fawn"
    ],
    "green3_advanced": [
        "car", "bar", "jar", "star", "arm", "barn", "cart", "card",
        "farm", "harp", "park", "yard", "shark", "corn", "cork", "fork",
        "horn", "port", "storm", "fern", "bird", "dirt", "girl", "fur",
        "surf", "purse", "nurse", "light", "night", "knight", "knob",
        "knot", "knee", "knife", "wren", "wrist", "face", "ice", "lace",
        "mice", "rice", "cage", "gem", "giant", "giraffe", "page", "stage"
    ],
}

# Better search terms for words that are ambiguous or abstract
SEARCH_OVERRIDES = {
    "mat": "floor mat",
    "can": "tin can",
    "net": "fishing net",
    "pin": "sewing pin",
    "map": "world map",
    "bog": "peat bog swamp",
    "fig": "fig fruit",
    "web": "spider web",
    "yam": "yam vegetable",
    "zip": "zipper",
    "den": "animal den",
    "peg": "clothes peg",
    "keg": "beer keg barrel",
    "jet": "jet airplane",
    "gem": "gemstone jewel",
    "jig": "jigsaw puzzle",
    "bin": "trash bin",
    "fin": "fish fin",
    "lid": "pot lid",
    "bit": "drill bit",
    "kit": "first aid kit",
    "dip": "dip sauce bowl",
    "tip": "pen tip",
    "six": "number six",
    "mix": "mixing bowl",
    "cog": "gear cog",
    "dot": "polka dot",
    "cot": "baby cot",
    "hop": "rabbit hop",
    "pop": "popcorn",
    "nod": "person nodding",
    "rod": "fishing rod",
    "pod": "pea pod",
    "cod": "codfish",
    "rob": "robber",
    "job": "job work",
    "mob": "crowd mob",
    "bun": "bread bun",
    "fun": "children fun playing",
    "gun": "water gun toy",
    "bud": "flower bud",
    "mud": "mud puddle",
    "cub": "bear cub",
    "sub": "submarine",
    "gum": "bubblegum",
    "blob": "paint blob",
    "brim": "hat brim",
    "clip": "paper clip",
    "glen": "mountain glen valley",
    "glob": "glob slime",
    "grip": "hand grip",
    "slug": "garden slug snail",
    "snag": "fabric snag",
    "snap": "finger snap",
    "spot": "dalmatian spot",
    "stem": "flower stem",
    "step": "stair step",
    "stud": "metal stud",
    "stub": "pencil stub",
    "trim": "hair trim scissors",
    "trot": "horse trot",
    "wand": "magic wand",
    "bunk": "bunk bed",
    "link": "chain link",
    "mink": "mink animal",
    "rink": "ice skating rink",
    "dent": "car dent",
    "hint": "hint lightbulb idea",
    "lint": "lint roller",
    "mint": "mint herb leaf",
    "vent": "air vent",
    "loft": "loft bedroom",
    "fist": "clenched fist",
    "husk": "corn husk",
    "tusk": "elephant tusk",
    "jolt": "electric jolt",
    "malt": "malt drink",
    "gong": "brass gong",
    "fang": "vampire fang",
    "bass": "bass fish",
    "boss": "boss office",
    "buff": "buff strong arm",
    "jazz": "jazz music saxophone",
    "buzz": "bee buzz",
    "fizz": "soda fizz bubbles",
    "fuzz": "peach fuzz",
    "tick": "clock tick",
    "wick": "candle wick",
    "shin": "leg shin",
    "shot": "camera shot photo",
    "chat": "people chatting",
    "inch": "ruler inch",
    "whip": "whip cream",
    "tape": "adhesive tape",
    "wave": "ocean wave",
    "line": "straight line",
    "bone": "dog bone",
    "cone": "ice cream cone",
    "mule": "donkey mule",
    "tube": "test tube",
    "tail": "cat tail",
    "mail": "mailbox letter",
    "nail": "iron nail",
    "pail": "sand pail bucket",
    "sail": "sailboat",
    "seed": "plant seed",
    "leaf": "green leaf",
    "meal": "dinner meal plate",
    "seal": "seal animal",
    "road": "road highway",
    "soap": "bar soap",
    "toad": "toad frog",
    "oak": "oak tree",
    "bow": "ribbon bow",
    "boil": "boiling water pot",
    "coin": "gold coin",
    "foil": "aluminum foil",
    "oil": "olive oil bottle",
    "soil": "garden soil dirt",
    "clue": "detective clue magnifying glass",
    "glue": "glue bottle",
    "claw": "cat claw",
    "jaw": "human jaw face",
    "paw": "dog paw print",
    "straw": "drinking straw",
    "lawn": "green lawn grass",
    "fawn": "baby deer fawn",
    "port": "harbor port",
    "fern": "fern plant",
    "dirt": "dirt soil",
    "surf": "surfing wave",
    "purse": "handbag purse",
    "light": "light bulb",
    "night": "night sky moon",
    "knight": "medieval knight armor",
    "knob": "door knob",
    "knot": "rope knot",
    "knee": "human knee",
    "knife": "kitchen knife",
    "wren": "wren bird",
    "wrist": "human wrist watch",
    "face": "human face smile",
    "ice": "ice cube",
    "lace": "lace fabric",
    "mice": "mice mouse animal",
    "rice": "bowl rice",
    "cage": "bird cage",
    "stage": "theater stage",
    "page": "book page",
    "giant": "giant tall person",
    "giraffe": "giraffe animal",
    "crown": "golden crown",
    "gown": "evening gown dress",
    "cloud": "white cloud sky",
    "house": "house building",
    "mouse": "computer mouse",
    "wood": "wood plank",
    "wool": "wool yarn ball",
    "foot": "human foot",
    "hook": "fishing hook",
    "cook": "chef cook",
    "book": "open book",
    "roof": "house roof",
    "food": "food plate",
    "pool": "swimming pool",
    "tool": "tool wrench",
    "zoo": "zoo animals",
    "moon": "full moon",
    "snow": "snow winter",
    "barn": "red barn farm",
    "cart": "shopping cart",
    "card": "greeting card",
    "harp": "harp instrument",
    "shark": "shark ocean",
    "corn": "corn cob",
    "cork": "wine cork",
    "fork": "dinner fork",
    "horn": "trumpet horn",
    "storm": "thunder storm",
    "nurse": "nurse medical",
    "bath": "bathtub bath",
    "moth": "moth insect",
    "path": "walking path trail",
}


def download_images(api_key, output_dir="phonics-images", phases=None):
    """Download images from Pixabay for all phonics noun words."""

    os.makedirs(output_dir, exist_ok=True)

    stats = {"downloaded": 0, "skipped": 0, "failed": 0, "total": 0}
    failed_words = []

    for phase, words in PHONICS_NOUNS.items():
        if phases and phase not in phases:
            continue

        phase_dir = os.path.join(output_dir, phase)
        os.makedirs(phase_dir, exist_ok=True)

        print(f"\n{'='*60}")
        print(f"Phase: {phase} ({len(words)} words)")
        print(f"{'='*60}")

        for word in words:
            stats["total"] += 1

            # Check if already downloaded
            existing = [f for f in os.listdir(phase_dir) if f.startswith(word + ".")]
            if existing:
                print(f"  ✓ {word} — already exists, skipping")
                stats["skipped"] += 1
                continue

            # Search Pixabay
            search_term = SEARCH_OVERRIDES.get(word, word)
            params = urllib.parse.urlencode({
                "key": api_key,
                "q": search_term,
                "image_type": "photo",
                "per_page": 3,
                "safesearch": "true",
                "min_width": 400,
                "min_height": 400,
            })

            url = f"https://pixabay.com/api/?{params}"

            try:
                req = urllib.request.Request(url, headers={"User-Agent": "MontreePhonics/1.0"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = json.loads(resp.read().decode())

                if not data.get("hits"):
                    print(f"  ✗ {word} — no results for '{search_term}'")
                    stats["failed"] += 1
                    failed_words.append(word)
                    continue

                # Download the first (most relevant) result — webformat (640px)
                hit = data["hits"][0]
                img_url = hit.get("webformatURL", "")
                if not img_url:
                    print(f"  ✗ {word} — no image URL")
                    stats["failed"] += 1
                    failed_words.append(word)
                    continue

                ext = "jpg"  # Pixabay webformat is always JPEG
                filepath = os.path.join(phase_dir, f"{word}.{ext}")

                img_req = urllib.request.Request(img_url, headers={"User-Agent": "MontreePhonics/1.0"})
                with urllib.request.urlopen(img_req, timeout=30) as img_resp:
                    with open(filepath, "wb") as f:
                        f.write(img_resp.read())

                size_kb = os.path.getsize(filepath) / 1024
                print(f"  ✓ {word} — {size_kb:.0f}KB ({hit['imageWidth']}x{hit['imageHeight']})")
                stats["downloaded"] += 1

                # Rate limit: Pixabay allows 100 req/min, be conservative
                time.sleep(0.7)

            except urllib.error.HTTPError as e:
                if e.code == 429:
                    print(f"  ⚠ Rate limited — waiting 30s...")
                    time.sleep(30)
                    # Retry once
                    try:
                        req2 = urllib.request.Request(url, headers={"User-Agent": "MontreePhonics/1.0"})
                        with urllib.request.urlopen(req2, timeout=15) as resp2:
                            data2 = json.loads(resp2.read().decode())
                        if data2.get("hits"):
                            hit2 = data2["hits"][0]
                            img_url2 = hit2.get("webformatURL", "")
                            filepath2 = os.path.join(phase_dir, f"{word}.jpg")
                            img_req2 = urllib.request.Request(img_url2, headers={"User-Agent": "MontreePhonics/1.0"})
                            with urllib.request.urlopen(img_req2, timeout=30) as img_resp2:
                                with open(filepath2, "wb") as f2:
                                    f2.write(img_resp2.read())
                            print(f"  ✓ {word} — retry succeeded")
                            stats["downloaded"] += 1
                            continue
                    except Exception:
                        pass
                print(f"  ✗ {word} — HTTP {e.code}")
                stats["failed"] += 1
                failed_words.append(word)
            except Exception as e:
                print(f"  ✗ {word} — {str(e)[:60]}")
                stats["failed"] += 1
                failed_words.append(word)

    # Create zip
    zip_path = f"{output_dir}.zip"
    print(f"\n{'='*60}")
    print(f"Creating zip: {zip_path}")
    print(f"{'='*60}")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(output_dir):
            for file in sorted(files):
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, output_dir)
                zf.write(filepath, arcname)

    zip_size_mb = os.path.getsize(zip_path) / (1024 * 1024)

    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY")
    print(f"{'='*60}")
    print(f"  Downloaded: {stats['downloaded']}")
    print(f"  Skipped:    {stats['skipped']} (already existed)")
    print(f"  Failed:     {stats['failed']}")
    print(f"  Total:      {stats['total']}")
    print(f"  Zip size:   {zip_size_mb:.1f} MB")
    print(f"  Zip path:   {os.path.abspath(zip_path)}")

    if failed_words:
        print(f"\n  Failed words ({len(failed_words)}):")
        for w in failed_words:
            print(f"    - {w}")

    print(f"\n  Next steps:")
    print(f"  1. Review images in {output_dir}/ — delete any bad matches")
    print(f"  2. Go to /montree/library/photo-bank")
    print(f"  3. Drag-drop the images (or folders) to upload")
    print(f"  4. Images auto-match by filename (cat.jpg → 'cat')")

    return stats


def main():
    if len(sys.argv) < 2:
        print("Phonics Photo Bank Bulk Downloader")
        print("=" * 40)
        print()
        print("Usage: python3 scripts/download-phonics-images.py YOUR_PIXABAY_API_KEY [phase]")
        print()
        print("Get your free API key at: https://pixabay.com/api/docs/")
        print("  (Just sign up for a free account)")
        print()
        print("Examples:")
        print("  python3 scripts/download-phonics-images.py abc123def456")
        print("  python3 scripts/download-phonics-images.py abc123def456 pink1")
        print("  python3 scripts/download-phonics-images.py abc123def456 pink2_short_a")
        print()
        print("Available phases:")
        for phase, words in PHONICS_NOUNS.items():
            print(f"  {phase:25s} ({len(words)} nouns)")
        total = sum(len(w) for w in PHONICS_NOUNS.values())
        print(f"  {'TOTAL':25s} ({total} nouns)")
        print()
        print("All images are CC0 (free for any use) from Pixabay.")
        print("Images are named by word (cat.jpg, dog.jpg) for auto-matching")
        print("in the Montree photo bank at /montree/library/photo-bank.")
        sys.exit(1)

    api_key = sys.argv[1]
    phases = None
    if len(sys.argv) > 2:
        phases = sys.argv[2:]

    # Verify API key with a test request
    test_url = f"https://pixabay.com/api/?key={api_key}&q=test&per_page=3"
    try:
        req = urllib.request.Request(test_url, headers={"User-Agent": "MontreePhonics/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            test_data = json.loads(resp.read().decode())
            if "hits" not in test_data:
                print("ERROR: Invalid API response. Check your API key.")
                sys.exit(1)
        print(f"✓ API key verified ({test_data.get('totalHits', 0)} test results)")
    except urllib.error.HTTPError as e:
        if e.code == 401:
            print("ERROR: Invalid API key. Get yours at https://pixabay.com/api/docs/")
        else:
            print(f"ERROR: HTTP {e.code} — check your internet connection")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

    download_images(api_key, phases=phases)


if __name__ == "__main__":
    main()
