// lib/montree/dark-phonics/audio-bank.ts
// GENERATED manifest of the curated Laura audio bank (the APPROVED audition
// clips from curriculum/assets/audio/laura-master, plus 22 one-off recipe-D
// fills, all in public/audio/laura/). These are the ONLY voices young
// learners hear for words — ElevenLabs is never called live for short clips
// (it glitches on them; classroom-fatal). To replace a dud clip: drop a new
// mp3 over the file in public/audio/laura/words/ — no code change needed.

export const LAURA_WORDS: ReadonlySet<string> = new Set(['a', 'add', 'alligator', 'ambulance', 'an', 'ant', 'anteater', 'apple', 'arrow', 'at', 'ate', 'ax', 'bag', 'ball', 'bat', 'bed', 'big', 'bin', 'book', 'box', 'bud', 'bug', 'bus', 'cake', 'can', 'cap', 'car', 'cat', 'chair', 'cheese', 'cherry', 'chicken', 'chin', 'chip', 'clock', 'cot', 'cow', 'croc', 'cup', 'dig', 'dinosaur', 'dish', 'dog', 'doll', 'door', 'drum', 'duck', 'egg', 'elbow', 'elephant', 'elf', 'end', 'envelope', 'fan', 'fin', 'fish', 'foot', 'fork', 'fox', 'frog', 'gift', 'girl', 'goat', 'grape', 'green', 'gum', 'hand', 'hat', 'heart', 'hen', 'hit', 'hop', 'horse', 'hot', 'house', 'hug', 'hut', 'igloo', 'ill', 'in', 'ink', 'insect', 'is', 'it', 'itch', 'jam', 'jar', 'jeans', 'jet', 'jug', 'juice', 'jump', 'kit', 'lamp', 'leaf', 'leg', 'lemon', 'lid', 'lip', 'log', 'map', 'mat', 'milk', 'mix', 'moon', 'mop', 'mouse', 'mud', 'mug', 'my', 'nap', 'naps', 'nest', 'net', 'nine', 'nip', 'nose', 'nurse', 'nut', 'octopus', 'off', 'olive', 'on', 'orange', 'ostrich', 'ox', 'pad', 'pan', 'pat', 'pear', 'peg', 'pelican', 'pen', 'penguin', 'pig', 'pin', 'pink', 'pit', 'pot', 'potato', 'pup', 'quilt', 'rabbit', 'rain', 'rat', 'red', 'ring', 'rug', 'run', 'sad', 'sap', 'sat', 'seal', 'sheep', 'shell', 'ship', 'shirt', 'shoe', 'shop', 'sick', 'sip', 'sit', 'six', 'snake', 'snap', 'soap', 'sock', 'spat', 'spit', 'spoon', 'squid', 'star', 'stuck', 'sun', 'tap', 'taxi', 'tent', 'the', 'thick', 'thin', 'think', 'three', 'throw', 'thumb', 'tiger', 'tin', 'tomato', 'toothbrush', 'top', 'toy', 'tree', 'turtle', 'two', 'umbrella', 'umpire', 'uncle', 'under', 'up', 'us', 'van', 'vase', 'vest', 'vet', 'vine', 'violin', 'watch', 'water', 'wax', 'web', 'wet', 'wig', 'wing', 'wolf', 'worm', 'yak', 'yam', 'yarn', 'yell', 'yellow', 'yo-yo', 'zebra', 'zero', 'zigzag', 'zip', 'zone', 'zoo']);

export const LAURA_FEEDBACK: ReadonlySet<string> = new Set(['correct', 'good-job', 'listen', 'oops', 'try-again', 'yes']);

export function lauraWordUrl(word: string): string | null {
  const key = word === 'I' ? 'i' : word.toLowerCase();
  return LAURA_WORDS.has(key) ? `/audio/laura/words/${key}.mp3` : null;
}

export function lauraFeedbackUrl(name: string): string | null {
  return LAURA_FEEDBACK.has(name) ? `/audio/laura/feedback/${name}.mp3` : null;
}
