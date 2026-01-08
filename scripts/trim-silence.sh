#!/bin/bash

# Trim silence from audio files
# Uses ffmpeg silenceremove filter

AUDIO_DIR="/Users/tredouxwillemse/Desktop/whale/public/audio-new"

# Create backup folder
BACKUP_DIR="$AUDIO_DIR/backup-originals"
mkdir -p "$BACKUP_DIR/letters"
mkdir -p "$BACKUP_DIR/words/pink"

echo "=== Trimming silence from letter sounds ==="

cd "$AUDIO_DIR/letters"

for file in *.mp3; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # Backup original
        cp "$file" "$BACKUP_DIR/letters/$file"
        
        # Trim silence from start and end
        # start_threshold=-40dB catches quieter sounds
        # stop_threshold=-40dB for end
        ffmpeg -y -i "$file" \
            -af "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,areverse" \
            "trimmed_$file" 2>/dev/null
        
        # Replace original with trimmed
        mv "trimmed_$file" "$file"
    fi
done

echo ""
echo "=== Done! ==="
echo "Originals backed up to: $BACKUP_DIR/letters/"
echo ""
echo "Test a file with: afplay $AUDIO_DIR/letters/b.mp3"
