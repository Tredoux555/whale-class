#!/bin/bash
# One-shot: push the Montree Phonics commit (fc65cae7) to origin/main.
# Cleans any stale git locks left by the Cowork bridge first.
cd "/Users/tredouxwillemse/Desktop/Master Brain/ACTIVE/montree" || exit 1
rm -f .git/index.lock .git/HEAD.lock
find .git/objects -name "tmp_obj_*" -delete 2>/dev/null
git push origin main
echo
echo "Pushed. Railway will redeploy montree.xyz automatically."
read -p "Press enter to close..."
