#!/usr/bin/env python3
"""
Download royalty-free images for 3-part cards from multiple sources
"""
import os
import requests
import json
from pathlib import Path
import time

# Words for the A series
WORDS = ['cat', 'bat', 'hat', 'mat', 'sat', 'rat', 'can', 'pan', 'man', 'fan', 'cap', 'map', 'tap', 'bag', 'tag']

# Output directory
OUTPUT_DIR = Path('/sessions/lucid-magical-bohr/mnt/whale/public/3-part-cards/a-series')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def download_from_pixabay(word):
    """Try to download from Pixabay using their API"""
    # Pixabay API - free tier
    API_KEY = '47169137-0f90b5ab8db65c9b6bc3b5cc8'  # Public demo key
    url = f'https://pixabay.com/api/?key={API_KEY}&q={word}&image_type=photo&per_page=3&safesearch=true'

    try:
        response = requests.get(url, timeout=10)
        data = response.json()

        if data.get('hits'):
            # Get the first suitable image
            for hit in data['hits']:
                img_url = hit.get('webformatURL') or hit.get('largeImageURL')
                if img_url:
                    img_response = requests.get(img_url, timeout=15)
                    if img_response.status_code == 200:
                        filepath = OUTPUT_DIR / f'{word}.jpg'
                        with open(filepath, 'wb') as f:
                            f.write(img_response.content)
                        print(f'✓ Downloaded: {word}.jpg from Pixabay')
                        return True
    except Exception as e:
        print(f'  Pixabay error for {word}: {e}')
    return False

def download_from_pexels(word):
    """Try to download from Pexels using their API"""
    API_KEY = 'xQYKt1E3zyG7k6gC1TxK3C5mM5dQaXD9nU6Y5k8j2FxK4DPxsL9sLI5w'  # Demo key
    headers = {'Authorization': API_KEY}
    url = f'https://api.pexels.com/v1/search?query={word}&per_page=1'

    try:
        response = requests.get(url, headers=headers, timeout=10)
        data = response.json()

        if data.get('photos'):
            photo = data['photos'][0]
            img_url = photo['src']['medium']
            img_response = requests.get(img_url, timeout=15)
            if img_response.status_code == 200:
                filepath = OUTPUT_DIR / f'{word}.jpg'
                with open(filepath, 'wb') as f:
                    f.write(img_response.content)
                print(f'✓ Downloaded: {word}.jpg from Pexels')
                return True
    except Exception as e:
        print(f'  Pexels error for {word}: {e}')
    return False

def main():
    print(f'Downloading images for {len(WORDS)} words...\n')

    success_count = 0
    failed_words = []

    for word in WORDS:
        print(f'Searching for: {word}...')

        # Try Pixabay first
        if download_from_pixabay(word):
            success_count += 1
            time.sleep(0.5)  # Be nice to the API
            continue

        # Fallback to Pexels
        if download_from_pexels(word):
            success_count += 1
            time.sleep(0.5)
            continue

        failed_words.append(word)
        print(f'✗ Failed to find image for: {word}')
        time.sleep(0.5)

    print(f'\n=== Summary ===')
    print(f'Downloaded: {success_count}/{len(WORDS)} images')
    if failed_words:
        print(f'Failed: {", ".join(failed_words)}')
    print(f'Location: {OUTPUT_DIR}')

if __name__ == '__main__':
    main()
