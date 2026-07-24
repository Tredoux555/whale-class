#!/usr/bin/env python3
"""
Swaps every "Pictures" grid <img> tag (class="plate" div) in the Dark
Phonics media-pack letter pages to reference the new clean Montessori
picture-bank image for that word (Supabase dark-phonics bucket,
picture-bank/{word}.jpg), replacing the old Week0X-sourced (or
base64-embedded) non-compliant image.

Usage: python3 swap-picture-bank-images.py <media-packs-dir>
"""
import re
import sys
import os

LETTER_WORDS = {
    'a': ['abacus', 'alligator', 'ambulance', 'anchor', 'ant', 'apple', 'astronaut', 'ax'],
    'd': ['dinosaur', 'dog', 'doll', 'door', 'drum', 'duck'],
    'g': ['gate', 'gift', 'goat', 'grapes', 'guitar', 'gum'],
    'i': ['igloo', 'iguana', 'inchworm', 'infant', 'injection', 'insect', 'instrument'],
    'm': ['mango', 'map', 'milk', 'moon', 'mop', 'mouse'],
    'n': ['nail', 'napkin', 'needle', 'nest', 'net', 'nose', 'nurse', 'nut'],
    'o': ['octopus', 'olive', 'orange', 'ostrich', 'otter', 'ox'],
    'p': ['paint', 'panda', 'parrot', 'pen', 'penguin', 'pig', 'pizza', 'pumpkin'],
    's': ['sandwich', 'saw', 'seal', 'snake', 'soap', 'sock', 'star', 'sun'],
    't': ['table', 'taxi', 'teddy', 'tiger', 'tomato', 'toothbrush', 'towel', 'turtle'],
}

def new_img_tag(word):
    return (f'<img loading="lazy" style="object-fit:contain;background:#fff" '
            f'src="/api/montree/media/proxy/picture-bank/{word}.jpg?bucket=dark-phonics" '
            f'alt="{word}">')

def process_file(path, words):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    replaced = []
    for word in words:
        # Match an <img ...> tag (no nested '>' inside attribute values expected)
        # immediately followed by alt="word"> and then <span>word</span>
        pattern = re.compile(
            r'<img\b[^>]*?alt="' + re.escape(word) + r'"\s*>(<span>' + re.escape(word) + r'</span>)'
        )
        def _sub(m):
            return new_img_tag(word) + m.group(1)
        content, n = pattern.subn(_sub, content)
        if n > 0:
            replaced.append((word, n))
        else:
            print(f'  ! NOT FOUND: {word}')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    return replaced

def main():
    if len(sys.argv) < 2:
        print('Usage: swap-picture-bank-images.py <media-packs-dir>')
        sys.exit(1)
    media_dir = sys.argv[1]
    for letter, words in LETTER_WORDS.items():
        path = os.path.join(media_dir, f'{letter}.html')
        if not os.path.exists(path):
            print(f'=== {letter}.html: FILE NOT FOUND ===')
            continue
        print(f'=== {letter}.html ===')
        replaced = process_file(path, words)
        print(f'  replaced {len(replaced)}/{len(words)} images')

if __name__ == '__main__':
    main()
