#!/usr/bin/env python3
"""
Whale Reading Framework — Blue Phase lesson content generator.
Outputs whale-reading-content-blue.html (Whale-branded) and
language-area-blue.html (neutral).
"""

import html
import re
import os

# Heart words introduced in Blue Phase (lessons 54-83)
BLUE_HEART_WORDS = {
    54:  [('once', 'o, c=s, silent e'), ('upon', 'no breaks — function word')],
    55:  [('only', 'o, y'), ('always', 'al, ay')],
    56:  [('again', 'ai, g'), ('also', 'al')],
    57:  [('use', 'silent e — VCe pattern')],
    58:  [('these', 'e_e'), ('here', 'er-e')],
    60:  [('large', 'ar, soft g'), ('change', 'ch, soft g')],
    62:  [('edge', 'soft g (-dge)'), ('judge', 'soft g (-dge)')],
    63:  [('by', 'y=long i'), ('my', 'y=long i'), ('try', 'y=long i')],
    64:  [('very', 'y=long e'), ('every', 'y=long e')],
    65:  [('does', 'oe'), ('goes', 'oe')],
    67:  [('walked', 'al, ed=t'), ('played', 'ay, ed=d')],
    71:  [('are', 'r-controlled, silent e'), ('father', 'a, th')],
    72:  [('more', 'or, silent e'), ('before', 'or, silent e')],
    73:  [('her', 'er'), ('person', 'er')],
    74:  [('first', 'ir'), ('girl', 'ir')],
    75:  [('turn', 'ur'), ('hurt', 'ur')],
    76:  [('he', 'open syl — already known'), ('she', 'open syl — already known')],
    77:  [('open', 'o-pen — open-closed')],
    78:  [('find', '-ind long i'), ('kind', '-ind long i'), ('mind', '-ind long i'), ('old', '-old long o'), ('cold', '-old long o')],
    79:  [('little', '-le syl'), ('people', '-le syl, eo')],
    81:  [('was', 'w-influenced /ŭ/'), ('want', 'w-influenced /ŏ/'), ('water', 'w-influenced')],
    82:  [('all', '-all'), ('call', '-all'), ('walk', '-alk'), ('talk', '-alk')],
}

PHASE4_VCE = [
    {
        'num': 54, 'pattern': 'a_e — Magic-e (long /ā/)', 'sound': '/ā/',
        'rule': 'A silent e at the end of a word reaches back and makes the vowel say its name. "Mad" + e = "made." The e is silent. Demonstrate with a slider card: "mad" → slide in the magic e → "made."',
        'words': ['ate', 'cake', 'date', 'gate', 'late', 'mate', 'rate', 'cape', 'tape', 'made', 'fade', 'wade', 'name', 'came', 'game', 'lame', 'same', 'tame', 'safe', 'lake', 'make', 'bake', 'fake', 'rake', 'sake', 'take', 'wake', 'snake', 'plane', 'cane', 'lane', 'pane', 'vase', 'maze', 'haze', 'daze', 'craze', 'shape', 'shake', 'shave', 'flake', 'brake', 'stake', 'wave', 'save', 'gave', 'pave', 'cave', 'shade', 'trade'],
        'phrases': ['a late cake', 'a safe game', 'a tame snake', 'a fast lane', 'made a shape'],
        'sentences': ['I made a cake.', 'A snake on a lake.', 'I take the same game.', 'A plane in a maze.', 'A fake shape on a vase.'],
        'pictures': [
            ('cake', 'birthday cake illustration'),
            ('snake', 'curly snake — review from L5'),
            ('plane', 'simple paper plane or airplane'),
            ('face', 'round smiling face'),
            ('lake', 'small lake with reeds'),
            ('gate', 'wooden garden gate'),
        ],
        'esl': 'Long /ā/ exists in Mandarin (e.g. <em>āi 哀</em>) so the sound itself is reachable. The challenge is the SPELLING — silent e is alien to a syllabic writing system. Use the slider card daily. Children often write "cak" without the e for the first few weeks; correct gently, no penalty.',
        'heart_words_intro': ['once', 'upon'],
    },
    {
        'num': 55, 'pattern': 'i_e — Magic-e (long /ī/)', 'sound': '/ī/',
        'rule': 'Same Magic-e idea, this time with i. "Bit" + e = "bite."',
        'words': ['bite', 'site', 'kite', 'mite', 'white', 'time', 'lime', 'mime', 'dime', 'slime', 'prime', 'fine', 'line', 'mine', 'nine', 'pine', 'shine', 'spine', 'twine', 'whine', 'ride', 'side', 'tide', 'hide', 'wide', 'slide', 'bride', 'pride', 'like', 'bike', 'hike', 'pike', 'spike', 'strike', 'life', 'wife', 'mile', 'pile', 'tile', 'while', 'smile', 'shine', 'dive', 'five', 'hive', 'live', 'drive', 'shrine'],
        'phrases': ['a fine bike', 'a white kite', 'a long line', 'on time', 'five at a time'],
        'sentences': ['I ride a bike.', 'A white kite in the sky.', 'A fine line of bike.', 'I like to hike.', 'A line of five.'],
        'pictures': [
            ('bike', 'simple bicycle'),
            ('kite', 'diamond-shaped kite'),
            ('time', 'clock dial'),
            ('slide', 'playground slide'),
            ('five', 'hand showing five fingers'),
            ('drive', 'car on a road'),
        ],
        'esl': 'Long /ī/ (the diphthong /aɪ/) does not exist as a single phoneme in Mandarin but the diphthong /ai/ does (<em>ài 爱</em>). Most learners produce it acceptably. Spelling is again the hurdle. Daily slider drill: bit→bite, kit→kite, hid→hide.',
        'heart_words_intro': ['only', 'always'],
    },
    {
        'num': 56, 'pattern': 'o_e — Magic-e (long /ō/)', 'sound': '/ō/',
        'rule': 'Magic-e with o.',
        'words': ['bone', 'cone', 'lone', 'tone', 'zone', 'phone', 'stone', 'shone', 'rode', 'mode', 'code', 'note', 'rope', 'mope', 'hope', 'slope', 'home', 'dome', 'rose', 'nose', 'pose', 'hose', 'chose', 'close', 'those', 'doze', 'froze', 'joke', 'poke', 'woke', 'broke', 'choke', 'smoke', 'spoke', 'stove', 'drove', 'wrote', 'role', 'hole', 'mole', 'pole', 'stole', 'whole', 'globe', 'robe', 'probe'],
        'phrases': ['a stone bone', 'home alone', 'a long rope', 'a red rose', 'broke a stove'],
        'sentences': ['A bone for a dog.', 'A rose in a vase.', 'I broke the stove.', 'A note on a phone.', 'A long rope by a slope.'],
        'pictures': [
            ('rose', 'single red rose'),
            ('bone', 'dog bone'),
            ('phone', 'simple mobile phone'),
            ('rope', 'coiled rope'),
            ('nose', 'simple face showing the nose'),
            ('cone', 'ice cream cone'),
        ],
        'esl': 'Long /ō/ exists in Mandarin (<em>ōu 欧</em>). Acceptable. Spelling again is the work.',
        'heart_words_intro': ['again', 'also'],
    },
    {
        'num': 57, 'pattern': 'u_e — Magic-e (long /ū/ and /yū/)', 'sound': '/ū/ or /yū/',
        'rule': 'Magic-e with u. Two sound variants: pure /ū/ (rule, tune) and /yū/ (cute, cube). English does not consistently distinguish — both spellings look identical. Children pick up the variant by the surrounding consonants.',
        'words': ['cute', 'mute', 'flute', 'dune', 'tune', 'June', 'prune', 'cube', 'tube', 'rude', 'dude', 'crude', 'plume', 'flume', 'fume', 'fuse', 'use', 'muse', 'rule', 'mule', 'lute', 'duke', 'puke', 'nude', 'jute'],
        'phrases': ['a cute mule', 'in June', 'a cube on a flute', 'a flute tune', 'a tube of paste'],
        'sentences': ['A cute mule.', 'A flute and a tune.', 'I use a tube.', 'I use a cube.', 'A prune in June.'],
        'pictures': [
            ('cube', '3D cube illustration'),
            ('flute', 'silver flute'),
            ('cute', 'cute baby animal'),
            ('mule', 'simple mule cartoon'),
            ('tube', 'tube of toothpaste'),
        ],
        'esl': '/yū/ in "cute" — the /j/ glide before /ū/ — is tricky. Mandarin has <em>yū 迂</em> as the closest sound. Most learners over-aspirate. Mirror work: lips rounded for /ū/, slight tongue-front for /j/ first.',
        'heart_words_intro': ['use'],
    },
    {
        'num': 58, 'pattern': 'e_e — Magic-e (long /ē/)', 'sound': '/ē/',
        'rule': 'Magic-e with e. RARE pattern in English — only a handful of words. We teach it because it completes the VCe pattern symmetrically and because "these" and "here" are high-frequency.',
        'words': ['these', 'theme', 'eve', 'extreme', 'athlete'],
        'phrases': ['these things', 'an extreme theme'],
        'sentences': ['These are mine.', 'An extreme theme.', 'On Eve\'s side.'],
        'pictures': [
            ('these', 'finger pointing at multiple objects'),
            ('theme', 'a labelled board with a topic on it'),
            ('athlete', 'a child running'),
        ],
        'esl': 'Long /ē/ is the easy vowel — Mandarin <em>yī 一</em>. The spelling pattern is the lesson, not the sound.',
        'heart_words_intro': ['these', 'here'],
    },
]

PHASE4_SOFT_TRIGRAPH = [
    {
        'num': 59, 'pattern': 'Soft c — /s/ before e, i, y', 'sound': '/s/',
        'rule': 'When c is followed by e, i, or y, it usually says /s/ — not /k/. "Cell, cinema, cycle." Otherwise c says /k/ — "cat, cup, cot."',
        'words': ['cell', 'cent', 'cement', 'face', 'race', 'pace', 'lace', 'place', 'space', 'trace', 'grace', 'ice', 'nice', 'mice', 'rice', 'slice', 'price', 'twice', 'fence', 'pence', 'since', 'prince', 'dance', 'chance', 'glance', 'prance', 'stance', 'spice'],
        'phrases': ['a nice price', 'twice a day', 'a slice of ice', 'a face in space', 'a fence and a prince'],
        'sentences': ['A mouse on ice.', 'A nice slice of cake.', 'I dance in a place.', 'A fence by a face.', 'A prince in a place.'],
        'esl': 'Mandarin has /s/ and /ts/ (<em>cì 次</em>) — both close to English soft c. Easy sound. The lesson is the spelling rule: c before e/i/y = /s/. Children may overgeneralize and write "cake" as "kake"; that\'s correctable.',
    },
    {
        'num': 60, 'pattern': 'Soft g — /j/ before e, i, y', 'sound': '/j/',
        'rule': 'Same pattern as soft c. When g is followed by e, i, or y, it usually says /j/. "Gem, giant, gym." Otherwise g says /g/ — "go, gum, gap." There are exceptions (get, give, girl) but the rule holds about 80% of the time.',
        'words': ['gem', 'gel', 'gent', 'gist', 'gym', 'age', 'cage', 'page', 'rage', 'sage', 'stage', 'wage', 'huge', 'change', 'strange', 'range', 'engage', 'hinge', 'binge', 'cringe', 'singe'],
        'phrases': ['a huge gem', 'a wide page', 'a gym stage', 'a change of stage'],
        'sentences': ['A gem on a page.', 'A huge stage in a gym.', 'A strange change.', 'A wage of an age.'],
        'esl': 'Mandarin has nothing exactly like /j/ but the affricate /tɕ/ (<em>jī 鸡</em>) is similar enough. Acceptable. Spelling rule mirrors soft c.',
        'heart_words_intro': ['large', 'change'],
    },
    {
        'num': 61, 'pattern': '-tch trigraph — /ch/ after short vowel', 'sound': '/ch/',
        'rule': 'After a SHORT vowel, the /ch/ sound is usually spelled -tch, not -ch. "Catch, fetch, ditch, notch." Exceptions: much, rich, such (one-syl, no tch).',
        'words': ['catch', 'match', 'patch', 'hatch', 'latch', 'batch', 'fetch', 'sketch', 'stretch', 'ditch', 'pitch', 'witch', 'switch', 'stitch', 'hitch', 'itch', 'notch', 'botch', 'clutch', 'hutch'],
        'phrases': ['a quick catch', 'a witch with a hat', 'a pitch on a switch', 'fetch the ball'],
        'sentences': ['I catch a ball.', 'A witch on a hill.', 'Fetch the dog.', 'A patch on a pant.', 'A pitch in a ditch.'],
        'esl': 'No new sound. The spelling rule -tch after short vowel is the lesson. Connect to soft c (L59) and soft g (L60) as a family: English has spelling rules that signal whether a sound is hard or soft.',
    },
    {
        'num': 62, 'pattern': '-dge trigraph — /j/ after short vowel', 'sound': '/j/',
        'rule': 'After a SHORT vowel, the /j/ sound is usually spelled -dge, not -ge. "Badge, edge, ridge, dodge, fudge." This rule pairs with -tch from L61 — both happen after short vowels.',
        'words': ['badge', 'cadge', 'edge', 'wedge', 'ledge', 'sledge', 'pledge', 'ridge', 'bridge', 'fridge', 'midge', 'dodge', 'lodge', 'hodge', 'fudge', 'judge', 'grudge', 'nudge', 'sludge', 'budge'],
        'phrases': ['a wet bridge', 'a small wedge', 'a long ridge', 'a judge in court'],
        'sentences': ['A bridge on a ridge.', 'A judge in a robe.', 'A wedge of cheese.', 'A fridge in a lodge.', 'A pledge from a judge.'],
        'esl': 'The /j/ sound is hard — see L60 ESL note. The spelling rule -dge after short vowel is parallel to -tch. Pattern recognition is the win here.',
        'heart_words_intro': ['edge', 'judge'],
    },
]

PHASE4_Y = [
    {
        'num': 63, 'pattern': 'Y as long /ī/ — end of one-syllable words', 'sound': '/ī/',
        'rule': 'Y at the end of a ONE-syllable word usually says long /ī/. "My, by, fly, try, why." Notice y here is the vowel — it took over the job from a normal vowel because every syllable needs one.',
        'words': ['by', 'my', 'cry', 'dry', 'fry', 'pry', 'sky', 'sly', 'spy', 'try', 'why', 'shy', 'ply', 'sty', 'wry', 'fly'],
        'phrases': ['my sky', 'why try', 'a shy spy', 'dry fly', 'fry by sky'],
        'sentences': ['Why cry?', 'My fly in the sky.', 'A shy spy.', 'I try to fly.', 'Dry by the sky.'],
        'esl': 'Long /ī/ is /aɪ/. See L55 ESL note — diphthong /ai/ exists in Mandarin so the sound is reachable. The new lesson is the y-as-vowel concept. Children sometimes call y a "sneaky vowel" — that mental model works.',
        'heart_words_intro': ['by', 'my', 'try'],
    },
    {
        'num': 64, 'pattern': 'Y as long /ē/ — end of multi-syllable words', 'sound': '/ē/',
        'rule': 'Y at the end of a MULTI-syllable word usually says long /ē/. "Happy, baby, candy, lucky, funny, sunny." The number of syllables decides the sound.',
        'words': ['happy', 'baby', 'candy', 'lucky', 'funny', 'sunny', 'penny', 'pretty', 'kitty', 'puppy', 'silly', 'fluffy', 'fuzzy', 'jolly', 'lazy', 'crazy', 'tiny', 'rainy', 'snowy', 'sandy', 'windy', 'easy', 'busy'],
        'phrases': ['a happy puppy', 'a tiny kitty', 'a sunny day', 'a funny baby', 'a lucky penny'],
        'sentences': ['A happy baby.', 'A funny puppy on a sunny day.', 'A pretty penny.', 'A tiny kitty.', 'A rainy windy day.'],
        'esl': 'Long /ē/ is easy in Mandarin (<em>yī 一</em>). The rule "one-syl y = /ī/, multi-syl y = /ē/" is the takeaway. Daily contrast drill: my/many · cry/lucky · fly/silly.',
        'heart_words_intro': ['very', 'every'],
    },
]

PHASE4_INFLECTIONS = [
    {
        'num': 65, 'pattern': 'Plurals — adding -s and -es', 'sound': '/s/ or /z/ or /iz/',
        'rule': 'Most plurals add -s. After s, sh, ch, x, or z, add -es. "Cats, dogs, foxes, dishes, churches, buzzes."',
        'words': ['cats', 'dogs', 'pigs', 'cubs', 'rats', 'mats', 'caps', 'pans', 'pins', 'beds', 'hats', 'mugs', 'tubs', 'jobs', 'foxes', 'boxes', 'taxes', 'dishes', 'fishes', 'wishes', 'rushes', 'bushes', 'inches', 'kisses', 'misses', 'classes', 'masses', 'buzzes'],
        'phrases': ['cats and dogs', 'six foxes', 'two dishes', 'a class of kids'],
        'sentences': ['Two cats.', 'Six foxes in a box.', 'Three dishes on a desk.', 'A pen and four pins.', 'Six bushes in a yard.'],
        'esl': 'Mandarin does NOT mark plural on nouns. The concept "add -s for more than one" is genuinely new and takes time. Don\'t shortcut it. The /s/ vs /z/ pronunciation distinction is below conscious awareness — children pick it up by imitation. The -es addition (boxes, dishes) needs explicit rule teaching.',
        'heart_words_intro': ['does', 'goes'],
    },
    {
        'num': 66, 'pattern': '-ing — no doubling yet', 'sound': '',
        'rule': 'Add -ing to a verb to show action happening. For now, just add -ing — no doubling. "Catching, jumping, asking, helping." Doubling rule comes in L70.',
        'words': ['catching', 'fetching', 'hatching', 'matching', 'patching', 'asking', 'jumping', 'helping', 'thumping', 'pumping', 'singing', 'ringing', 'kissing', 'fishing', 'pushing', 'rushing', 'wishing', 'munching', 'lunching', 'punching'],
        'phrases': ['catching a ball', 'jumping high', 'singing a song', 'kissing a cat'],
        'sentences': ['I am jumping.', 'A dog catching a ball.', 'Singing a song.', 'Fishing in a lake.', 'Pushing a cart.'],
        'esl': '<strong>Major Mandarin L1 concept.</strong> Mandarin uses 在 (zài) or 正在 to mark continuous aspect — completely different from English -ing. Many learners say "I jump" when they mean "I am jumping." Daily oral drill: "What am I doing right now? I am _____ing." Mirror your own actions.',
    },
    {
        'num': 67, 'pattern': '-ed (3 sounds: /t/, /d/, /əd/)', 'sound': '',
        'rule': 'Add -ed to a verb to show past action. Three sound variants:\n• /t/ after voiceless sounds — jumped, asked, kissed\n• /d/ after voiced sounds — played, climbed, hugged\n• /əd/ after t or d — wanted, ended, landed\nChildren do not need to memorise this; they pick it up. But you should know.',
        'words': ['jumped', 'asked', 'kissed', 'fished', 'wished', 'pushed', 'rushed', 'matched', 'pitched', 'thanked', 'played', 'rolled', 'pulled', 'filled', 'killed', 'rained', 'wanted', 'landed', 'ended', 'mended', 'lasted', 'rested', 'tested', 'twisted'],
        'phrases': ['jumped and played', 'rested and ended', 'matched and rolled', 'kissed and hugged'],
        'sentences': ['I jumped on a bed.', 'A dog played in the grass.', 'I wanted a snack.', 'A bus landed at a stop.', 'I asked for a cup.'],
        'esl': '<strong>The single hardest English grammar concept for Mandarin L1.</strong> Mandarin has NO past-tense morphology — past is signaled by time words (昨天, 上周) or particles (了). Adding -ed to mark past requires constant scaffolding. Daily oral drill: "Yesterday I _____ed." Pair with a visual time line poster (yesterday | today | tomorrow).',
        'heart_words_intro': ['walked', 'played'],
    },
]

PHASE4_MULTISYL = [
    {
        'num': 68, 'pattern': 'Closed-syllable compound words', 'sound': '',
        'rule': 'A compound word is two short words joined into one. Each piece keeps its short-vowel sound. "Catnap" = cat + nap. "Sunset" = sun + set.',
        'words': ['catnap', 'sunset', 'sunhat', 'sunlit', 'bedbug', 'bedrock', 'hilltop', 'lapdog', 'laptop', 'pigpen', 'sandbag', 'sandpit', 'mishap', 'cobweb', 'jetlag', 'pickup', 'kidnap'],
        'phrases': ['a sunset hilltop', 'a sandbag pigpen', 'a quick catnap', 'a small laptop'],
        'sentences': ['A sunset on a hilltop.', 'A catnap on a laptop.', 'A pigpen with a sandbag.', 'A cobweb on a desk.', 'A quick pickup.'],
        'esl': 'Compounds are easy conceptually — Mandarin builds words the same way (火车 = fire + car = train). Children grasp this fast. The pleasure of "I can read TWO words at once" builds confidence.',
    },
    {
        'num': 69, 'pattern': 'Closed-syllable two-syllable words (split between two consonants)', 'sound': '',
        'rule': 'Two-syllable words with a short vowel in each syllable. Where there are TWO consonants between the vowels, split between them: "rab-bit, sud-den, hap-pen, kit-ten."',
        'words': ['rabbit', 'sudden', 'happen', 'kitten', 'mitten', 'button', 'cotton', 'pumpkin', 'napkin', 'picnic', 'public', 'mascot', 'cactus', 'subject', 'submit', 'admit', 'invent', 'until', 'unless', 'unwell'],
        'phrases': ['a small rabbit', 'a sudden happen', 'a red mitten', 'a soft kitten', 'a public picnic'],
        'sentences': ['A rabbit in a pumpkin.', 'A kitten with a mitten.', 'A public picnic on a hill.', 'A sudden gust of wind.', 'A button on a shirt.'],
        'esl': 'Mandarin is mono-syllabic at the character level but polysyllabic at the word level (rabbit = 兔子 tù-zi, two syllables). The CONCEPT is fine. The CHALLENGE is the syllable break — children often try to read it as one giant word. Teach the split: find the two consonants in the middle, draw a line between them.',
    },
    {
        'num': 70, 'pattern': 'Doubling rule with -ing and -ed', 'sound': '',
        'rule': 'When you add -ing or -ed to a short verb that ends in ONE vowel + ONE consonant, DOUBLE the consonant. "Run + ing = running." "Hop + ed = hopped." The doubling protects the short vowel.',
        'words': ['running', 'hopping', 'stopping', 'dropping', 'shopping', 'chatting', 'clapping', 'humming', 'skipping', 'tapping', 'tipping', 'sitting', 'getting', 'cutting', 'hopped', 'stopped', 'dropped', 'shopped', 'chatted', 'clapped', 'tapped', 'tipped', 'patted', 'rubbed', 'hugged', 'grabbed', 'planned', 'scanned'],
        'phrases': ['running and jumping', 'shopping and chatting', 'hopping and skipping', 'tapped and stopped'],
        'sentences': ['I am running.', 'A bus stopping at a stop.', 'A frog hopping on a log.', 'I shopped for a snack.', 'A kid clapped and smiled.'],
        'esl': 'The doubling rule is reliable — taught once, applied consistently. The Mandarin learner will struggle most with KNOWING when to apply it; the trick is the "one vowel + one consonant" check. Make it a checklist.',
    },
]

PHASE4_R_CONTROLLED = [
    {
        'num': 71, 'pattern': 'ar — /ar/', 'sound': '/ar/',
        'rule': 'When a is followed by r, the r changes the vowel sound. Together they say /ar/ — "car, star, farm." The r is "bossy" — it controls the vowel.',
        'words': ['car', 'far', 'bar', 'jar', 'tar', 'star', 'scar', 'arm', 'farm', 'harm', 'barn', 'darn', 'yarn', 'art', 'cart', 'dart', 'mart', 'part', 'smart', 'start', 'chart', 'sharp', 'harp', 'card', 'hard', 'yard', 'park', 'dark', 'mark', 'shark', 'spark', 'march'],
        'phrases': ['a smart shark', 'a dark park', 'a far star', 'a small card', 'a sharp dart'],
        'sentences': ['A dark park.', 'A star in the dark.', 'A shark in the sea.', 'A smart card.', 'A sharp dart on a chart.'],
        'esl': '<strong>Mandarin L1 critical.</strong> Mandarin /r/ (儿 ér) is retroflex and very different from English /r/. The r-controlled vowels are uniquely English. The MOUTH POSITION is the lesson: lips slightly rounded, tongue tip curled back (not touching anywhere). Daily mirror work. Compare ar/are/ate to show the r-influence.',
        'heart_words_intro': ['are', 'father'],
    },
    {
        'num': 72, 'pattern': 'or — /or/', 'sound': '/or/',
        'rule': 'O + r = /or/. "For, corn, sport, horse." Same idea as ar.',
        'words': ['for', 'or', 'nor', 'cord', 'lord', 'sword', 'short', 'sort', 'sport', 'snort', 'fort', 'born', 'corn', 'horn', 'morn', 'torn', 'worn', 'thorn', 'storm', 'fork', 'pork', 'cork', 'stork', 'horse', 'force', 'porch', 'torch', 'north', 'forth'],
        'phrases': ['a short fork', 'a horse on a porch', 'corn on a cob', 'a horn and a torch'],
        'sentences': ['A horse on a farm.', 'A short fork.', 'A torch in a storm.', 'Corn for a horse.', 'A horn in the north.'],
        'esl': 'Same r-control challenge as L71. The /or/ sound is rounded and slightly back. Mirror work daily.',
        'heart_words_intro': ['more', 'before'],
    },
    {
        'num': 73, 'pattern': 'er — /er/', 'sound': '/er/',
        'rule': 'E + r = /er/. "Her, fern, after." This is the most common r-controlled vowel in English — it appears in thousands of words, often as an unstressed ending (-er: faster, bigger).',
        'words': ['her', 'fern', 'germ', 'jerk', 'perk', 'term', 'verb', 'over', 'after', 'water', 'wonder', 'never', 'sister', 'brother', 'mother', 'father', 'hammer', 'farmer', 'singer', 'winner', 'helper', 'jumper', 'faster', 'bigger', 'smaller', 'longer', 'shorter', 'better'],
        'phrases': ['her sister', 'after dinner', 'a better farmer', 'a faster hammer'],
        'sentences': ['Her brother is a farmer.', 'A bigger hammer is better.', 'After dinner, sing a song.', 'A faster singer.', 'A helper after class.'],
        'esl': 'Same r-control. The /er/ ending in unstressed syllables is the schwa-like /ɚ/ — very common in English, almost unique to it. Daily mirror.',
        'heart_words_intro': ['her', 'person'],
    },
    {
        'num': 74, 'pattern': 'ir — /er/', 'sound': '/er/',
        'rule': 'I + r = /er/. SAME SOUND as er. "Bird, girl, first." Three different spellings for one sound (er, ir, ur). Children learn each individually.',
        'words': ['bird', 'gird', 'third', 'firm', 'girl', 'twirl', 'swirl', 'whirl', 'first', 'thirst', 'birch', 'chirp', 'shirt', 'skirt', 'birthday', 'circus', 'dirty', 'thirty'],
        'phrases': ['a third bird', 'a dirty skirt', 'a thirty-first', 'a chirp at a circus'],
        'sentences': ['A bird in a tree.', 'A girl in a skirt.', 'A circus on the third.', 'A dirty shirt.', 'My first birthday.'],
        'esl': 'Same /er/ sound as L73. Children sometimes confuse spelling (write "berd" for "bird"). That\'s normal early. Word study and reading will sort it.',
        'heart_words_intro': ['first', 'girl'],
    },
    {
        'num': 75, 'pattern': 'ur — /er/', 'sound': '/er/',
        'rule': 'U + r = /er/. SAME SOUND again. "Turn, fur, burn." Three spellings (er, ir, ur), one sound. This lesson closes the r-controlled vowels.',
        'words': ['fur', 'turn', 'burn', 'urn', 'churn', 'spurn', 'curl', 'hurl', 'churl', 'curd', 'turf', 'surf', 'curb', 'blurb', 'curse', 'nurse', 'purse', 'church', 'lurch', 'hurt', 'spurt'],
        'phrases': ['a fur curl', 'a quick turn', 'a nurse with a purse', 'a church on a hill'],
        'sentences': ['A nurse with a purse.', 'I turn and burn.', 'A church on a hill.', 'A fur on a curb.', 'A quick spurt.'],
        'esl': 'Closes the r-controlled set. Common spelling error: writing "tern" for "turn." Word study and reading practice fix this over months.',
        'heart_words_intro': ['turn', 'hurt'],
    },
]

PHASE4_FINAL = [
    {
        'num': 76, 'pattern': 'Open syllables — one-syllable', 'sound': '',
        'rule': 'A syllable that ENDS in a vowel says the long sound of that vowel. "He, she, hi, no, go, so, be, me, we." Compare to closed syllables (cat, bed) where the syllable ends in a consonant and the vowel is short.',
        'words': ['he', 'she', 'me', 'we', 'be', 'hi', 'no', 'so', 'go', 'fly', 'cry', 'try', 'why', 'sky', 'shy'],
        'phrases': ['he and she', 'go and try', 'we be free', 'no sky'],
        'sentences': ['He and she go to the park.', 'We try.', 'Be brave.', 'So far.', 'No sky in the dark.'],
        'esl': 'The open-syllable concept is a powerful unlock — it explains why "go" doesn\'t need a magic e. Children sometimes write "goe" for "go"; teach them: "the syllable ends in the vowel, so it\'s long. No e needed."',
        'heart_words_intro': ['he', 'she'],
    },
    {
        'num': 77, 'pattern': 'Open-closed two-syllable words', 'sound': '',
        'rule': 'A two-syllable word where the first syllable is OPEN (vowel says long) and the second is closed. "Mu-sic, pi-lot, ro-bot, ti-ger, mo-ment." Split between the vowel and the next consonant.',
        'words': ['music', 'pilot', 'robot', 'tiger', 'moment', 'vacant', 'basic', 'final', 'silent', 'fever', 'minor', 'major', 'spider', 'beside', 'baby', 'lady', 'lazy', 'tidy'],
        'phrases': ['a basic robot', 'a music pilot', 'a lazy tiger', 'a final moment'],
        'sentences': ['A pilot on a plane.', 'A lazy tiger on a rug.', 'A spider in a basic web.', 'A music moment.', 'A baby with a lady.'],
        'esl': 'Open-closed combos are the trickiest decoding pattern in Blue Phase. Children naturally try short vowel first (mus-ic) — wrong. Teach the rule: try long vowel first when one consonant follows. If that doesn\'t make a word, try short. It takes practice.',
        'heart_words_intro': ['open'],
    },
    {
        'num': 78, 'pattern': '-ind, -ild, -old, -olt, -ost — long vowel before two consonants', 'sound': '',
        'rule': 'A small irregular family. The vowel is LONG even though it\'s followed by two consonants. "Find, kind, mind, mild, child, wild, old, gold, cold, bolt, colt, most, post, ghost." Children memorise the pattern family.',
        'words': ['find', 'kind', 'mind', 'blind', 'grind', 'rind', 'wind', 'mild', 'child', 'wild', 'old', 'cold', 'bold', 'gold', 'fold', 'hold', 'mold', 'sold', 'told', 'bolt', 'colt', 'jolt', 'most', 'post', 'ghost', 'host'],
        'phrases': ['a kind child', 'a cold gold ghost', 'a wild colt', 'mind the post'],
        'sentences': ['A kind child.', 'A cold gold ring.', 'A wild colt.', 'A ghost in the post.', 'Find the gold.'],
        'esl': 'Pattern family. The trick is to teach them as a group ("the -old family, the -ind family") rather than as exceptions to the closed-syllable rule.',
        'heart_words_intro': ['find', 'kind', 'mind', 'old', 'cold'],
    },
    {
        'num': 79, 'pattern': 'Consonant-le (-le) syllables', 'sound': '/əl/',
        'rule': 'A two-letter syllable ending in -le. The consonant before the -le is part of the -le syllable: "ta-ble, lit-tle, pur-ple, mid-dle, gig-gle." Pronounce as /əl/ — a soft "ul" sound.',
        'words': ['table', 'cable', 'fable', 'maple', 'apple', 'little', 'middle', 'puddle', 'cuddle', 'huddle', 'wiggle', 'giggle', 'jiggle', 'simple', 'sample', 'pimple', 'rattle', 'cattle', 'bottle', 'kettle', 'settle', 'subtle', 'turtle', 'purple', 'humble', 'tumble', 'fumble', 'gentle', 'candle'],
        'phrases': ['a little apple', 'a simple table', 'a purple turtle', 'a giggle and a wiggle'],
        'sentences': ['A little apple on a table.', 'A purple turtle.', 'A bottle on a kettle.', 'A simple sample.', 'A gentle giggle.'],
        'esl': 'The /əl/ sound is the schwa + /l/ — soft, unstressed. Mandarin doesn\'t have schwa. Children may over-pronounce the e ("ay-pul" for apple). Daily oral drill — soft, soft, soft.',
        'heart_words_intro': ['little', 'people'],
    },
    {
        'num': 80, 'pattern': 'Blue Phase review + extension', 'sound': '',
        'rule': 'A consolidation lesson. Pull words from L54-L79 across all the patterns introduced. Mix VCe + r-controlled + 2-syl + -le. No new patterns. Build fluency.',
        'words': ['cake', 'kite', 'rose', 'mule', 'face', 'ice', 'judge', 'catch', 'sky', 'happy', 'jumped', 'running', 'rabbit', 'music', 'hilltop', 'mind', 'old', 'turn', 'first', 'water', 'corn', 'star', 'little', 'apple', 'turtle'],
        'phrases': ['a kind rabbit on a hilltop', 'a happy turtle in water', 'a wild star in the sky', 'a little music on a table', 'a smart child running fast'],
        'sentences': ['A kind rabbit on a hilltop.', 'A happy turtle in water.', 'A wild star in the dark sky.', 'A little music on a table.', 'A smart child running fast.'],
        'esl': 'Review lessons are when L1 transfer errors surface most clearly. Listen for: short-vowel substitutions (cat→cot), final-consonant drops (running→runni), missing past-tense -ed. Note them; address one at a time over the next weeks.',
    },
    {
        'num': 81, 'pattern': 'w-influenced vowels', 'sound': '',
        'rule': 'After w, the letter a often says /ŏ/ (not /ă/). "Was, want, watch, wash, swap." After w, the letter or often says /er/ (not /or/). "Word, world, worth, work." Smaller family but high-frequency.',
        'words': ['was', 'want', 'wand', 'wash', 'watch', 'swap', 'swat', 'swamp', 'wallet', 'word', 'world', 'worth', 'work', 'worm', 'worse', 'worst'],
        'phrases': ['I want to wash', 'a swamp wand', 'a worth wallet', 'work in the world'],
        'sentences': ['I want to watch.', 'A wand in a swamp.', 'I wash a wallet.', 'A worm in the world.', 'A worth work.'],
        'esl': 'A spelling exception family. Mandarin /w/ exists (<em>wǒ 我</em>) and the sound is fine; the lesson is that w changes the vowel after it. Memorise the small family.',
        'heart_words_intro': ['was', 'want', 'water'],
    },
    {
        'num': 82, 'pattern': '-all, -alk, -alt', 'sound': '/ăll/',
        'rule': 'When -all or -alk or -alt appears at the end of a syllable, the a says /ŏ/ (or /aw/) — not /ă/. "All, call, ball, walk, talk, halt, salt." Small family but high-frequency.',
        'words': ['all', 'ball', 'call', 'fall', 'hall', 'mall', 'tall', 'wall', 'small', 'install', 'walk', 'talk', 'chalk', 'stalk', 'halt', 'salt', 'malt'],
        'phrases': ['a tall hall', 'a small ball', 'a talk and a walk', 'salt on a wall'],
        'sentences': ['A tall ball.', 'A walk in the mall.', 'A small chalk on a wall.', 'A tall talk.', 'A halt and a salt.'],
        'esl': 'Small spelling-exception family. Practice as a unit. The /ŏ/-not-/ă/ rule is reliable.',
        'heart_words_intro': ['all', 'call', 'walk', 'talk'],
    },
    {
        'num': 83, 'pattern': 'Blue Phase consolidation — sentences and decoding fluency', 'sound': '',
        'rule': '<strong>End of Blue Phase.</strong> Today is pure consolidation. Pull words from L54-82 across all patterns. Build decodable sentences and short paragraphs. Goal: child reads with rhythm, not letter-by-letter.',
        'words': ['cake', 'time', 'home', 'cube', 'gem', 'page', 'catch', 'edge', 'why', 'baby', 'cats', 'jumping', 'rabbit', 'music', 'cold', 'turn', 'sister', 'farm', 'horse', 'circus', 'little', 'table', 'was', 'walk', 'find', 'apple'],
        'phrases': ['a little baby rabbit', 'a happy sister with cake', 'a cold horse in a farm', 'a music page on a table', 'find the apple'],
        'sentences': ['A little baby rabbit had a cake at home.', 'A happy sister was jumping in the music.', 'A cold horse on a farm was running fast.', 'A page on a table — find the apple.', 'A turtle in a circus took a walk in the mall.'],
        'esl': '<strong>This is end-of-Blue territory.</strong> Children who can read these sentences with rhythm and meaning are ready for Green Phase (vowel teams, diphthongs, suffixes, prefixes, Greek/Latin roots). Children who can\'t — that\'s fine; spend another month on Blue review. No rush.',
    },
]

BLUE_PATTERNS = {
    54: ['a_e'], 55: ['i_e'], 56: ['o_e'], 57: ['u_e'], 58: ['e_e'],
    59: ['soft_c'], 60: ['soft_g'], 61: ['tch'], 62: ['dge'],
    63: ['y_long_i'], 64: ['y_long_e'],
    65: ['plural_s', 'plural_es'], 66: ['ing_no_double'], 67: ['ed_no_double'],
    68: ['compound'], 69: ['two_syl_closed'], 70: ['doubling_suffix'],
    71: ['ar'], 72: ['or'], 73: ['er'], 74: ['ir'], 75: ['ur'],
    76: ['open_syl_1syl'], 77: ['open_closed_2syl'],
    78: ['ind_ild_old'], 79: ['consonant_le'], 80: [],
    81: ['w_influenced'], 82: ['all_alk_alt'], 83: [],
}


def lesson_through(n):
    pats = set()
    for L, ps in BLUE_PATTERNS.items():
        if L <= n:
            pats.update(ps)
    return pats


def word_uses_unintroduced_pattern(word, lesson_num, allowed):
    w = word.lower().replace("'", "")
    if lesson_num in (80, 83):
        return None
    if re.search(r'a[^aeiouy]e$', w) and 'a_e' not in allowed:
        return 'a_e (VCe)'
    if re.search(r'i[^aeiouy]e$', w) and 'i_e' not in allowed:
        return 'i_e (VCe)'
    if re.search(r'o[^aeiouy]e$', w) and 'o_e' not in allowed:
        return 'o_e (VCe)'
    if re.search(r'u[^aeiouy]e$', w) and 'u_e' not in allowed:
        return 'u_e (VCe)'
    if re.search(r'e[^aeiouy]e$', w) and 'e_e' not in allowed:
        return 'e_e (VCe)'
    if re.search(r'c[eiy]', w) and 'soft_c' not in allowed:
        return 'soft c'
    if re.search(r'g[eiy]', w) and 'soft_g' not in allowed:
        return 'soft g'
    if 'tch' in w and 'tch' not in allowed:
        return '-tch trigraph'
    if 'dge' in w and 'dge' not in allowed:
        return '-dge trigraph'
    if w.endswith('y') and not any(v in w[:-1] for v in 'aeiou'):
        if 'y_long_i' not in allowed:
            return 'y as long-i'
    if w.endswith('y') and any(v in w[:-1] for v in 'aeiou') and len(w) > 2:
        if 'y_long_e' not in allowed and 'y_long_i' not in allowed:
            return 'y as long-e'
    if w.endswith('ing') and 'ing_no_double' not in allowed and 'doubling_suffix' not in allowed:
        if w not in ('king', 'ring', 'sing', 'wing', 'thing', 'sting', 'bring', 'fling', 'sling', 'spring', 'string', 'swing', 'cling'):
            return '-ing inflection'
    if w.endswith('ed') and 'ed_no_double' not in allowed and 'doubling_suffix' not in allowed:
        if len(w) > 3 and w[-3] not in 'aeiou' and w not in ('shed', 'sled', 'bled', 'fled', 'fed', 'wed', 'led', 'bed', 'red'):
            return '-ed inflection'
    if 'ar' in w and 'ar' not in allowed and not any(p in w for p in ['ear', 'oar']):
        return 'ar r-controlled'
    if re.search(r'or(?!e$)', w) and 'or' not in allowed:
        return 'or r-controlled'
    if 'er' in w and 'er' not in allowed:
        return 'er r-controlled'
    if 'ir' in w and 'ir' not in allowed:
        return 'ir r-controlled'
    if 'ur' in w and 'ur' not in allowed:
        return 'ur r-controlled'
    if w.endswith('le') and len(w) > 3 and w[-3] not in 'aeiouy':
        if 'consonant_le' not in allowed:
            return 'consonant-le'
    for end in ['ind', 'ild', 'old', 'olt', 'ost']:
        if w.endswith(end) and 'ind_ild_old' not in allowed:
            if w not in ('list', 'mist', 'fist', 'wist', 'cost', 'frost', 'lost'):
                return f'-{end}'
    for end in ['all', 'alk', 'alt']:
        if w.endswith(end) and 'all_alk_alt' not in allowed:
            return f'-{end}'
    return None


def audit_phase(phase):
    issues = []
    for L in phase:
        allowed = lesson_through(L['num'])
        bad_in_lesson = []
        for word in L.get('words', []):
            if '/' in word or ' ' in word:
                continue
            bad = word_uses_unintroduced_pattern(word, L['num'], allowed)
            if bad:
                bad_in_lesson.append((word, bad))
        if bad_in_lesson:
            issues.append((L['num'], L.get('pattern', ''), bad_in_lesson))
    return issues


CSS = """
@page { size: A4; margin: 1.8cm; }
body { font-family: 'Inter', -apple-system, Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; max-width: 820px; margin: 40px auto; padding: 0 24px; background: #fafaf7; }
h1 { font-family: 'Lora', Georgia, serif; font-size: 28pt; color: #0a1a0f; margin: 0 0 6px; }
h2 { font-family: 'Lora', Georgia, serif; font-size: 18pt; color: #1e4a8a; margin: 36px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #d4d4cc; }
h3 { font-family: 'Lora', Georgia, serif; font-size: 14pt; color: #0a1a0f; margin: 24px 0 6px; }
h4 { font-size: 11pt; font-weight: 700; color: #1e4a8a; margin: 12px 0 4px; }
.sub { color: #888; font-style: italic; font-size: 10pt; margin: 0 0 28px; }
p { margin: 8px 0; }
ul, ol { margin: 6px 0 12px 0; padding-left: 22px; }
li { margin-bottom: 2px; }
.lesson { background: #fff; border: 1px solid #e0e0d8; border-radius: 6px; padding: 14px 18px; margin: 18px 0; }
.lesson h3 { margin-top: 0; }
.articulation { background: #eef4fb; border-left: 3px solid #1e4a8a; padding: 8px 12px; margin: 8px 0 12px 0; font-size: 10pt; color: #1a2e4a; }
.wordlist { font-family: 'SF Mono', Menlo, monospace; font-size: 10pt; background: #fafaf2; border: 1px solid #e8e3cc; padding: 8px 12px; border-radius: 3px; line-height: 1.8; }
.pics { background: #fff8ec; border: 1px solid #e8d6a0; padding: 8px 12px; border-radius: 3px; font-size: 10pt; margin: 8px 0; }
.pics b { color: #8a6a20; }
.esl { background: #f4ecf8; border-left: 3px solid #8a5ab0; padding: 8px 12px; margin: 12px 0; font-size: 10pt; color: #4a2a6a; }
.esl b { color: #4a2a6a; }
.heart { background: #fff0f0; border: 1px solid #f0c8c8; padding: 8px 12px; border-radius: 3px; font-size: 10pt; color: #882828; margin: 8px 0; }
.heart b { color: #882828; }
.sentence { font-style: italic; color: #1a2e4a; }
table { border-collapse: collapse; margin: 12px 0; width: 100%; font-size: 10pt; }
td, th { border: 1px solid #d4d4cc; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #e8eef8; color: #0a1a0f; font-weight: 700; }
.toc { background: #fff; border: 1px solid #e0e0d8; border-radius: 6px; padding: 14px 20px; margin: 16px 0; }
.toc ul { columns: 2; -webkit-columns: 2; -moz-columns: 2; column-gap: 24px; }
hr { border: none; border-top: 1px solid #d4d4cc; margin: 32px 0; }
@media print { body { background: #fff; margin: 0; padding: 0; max-width: none; } .lesson { break-inside: avoid; } }
"""


def render_lesson(lesson):
    n = lesson['num']
    title = f"Lesson {n} — <strong>{lesson['pattern']}</strong>"
    out = [f"<div class='lesson'>\n<h3>{title}</h3>"]
    if lesson.get('sound'):
        out.append(f"<p style='font-style:italic;color:#666;font-size:10pt;'>{lesson['sound']}</p>")
    out.append(f"<div class='articulation'><b>The rule</b> &middot; {lesson['rule']}</div>")
    out.append("<h4>Words</h4>")
    out.append(f"<div class='wordlist'>{' &middot; '.join(lesson['words'])}</div>")
    if lesson.get('phrases'):
        out.append("<h4>Phrase cards</h4>")
        out.append(f"<div class='wordlist'>{' &middot; '.join(lesson['phrases'])}</div>")
    if lesson.get('sentences'):
        out.append("<h4>Sentence cards</h4>")
        items = ''.join(f"<li class='sentence'>{s}</li>" for s in lesson['sentences'])
        out.append(f"<ul>{items}</ul>")
    if lesson.get('pictures'):
        out.append("<div class='pics'><b>Pictures to source</b><br>")
        out.append('<br>'.join(f"<b>{w}</b> &middot; {h}" for w, h in lesson['pictures']))
        out.append("</div>")
    if lesson.get('heart_words_intro'):
        out.append(f"<div class='heart'><b>New heart words this lesson</b><br>{', '.join('<em>' + h + '</em>' for h in lesson['heart_words_intro'])}</div>")
    if lesson.get('esl'):
        out.append(f"<div class='esl'><b>Mandarin L1 note</b> &middot; {lesson['esl']}</div>")
    out.append("</div>")
    return '\n'.join(out)


def build_html(title_prefix):
    parts = []
    parts.append(f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title_prefix} — Blue Phase Lesson Content</title>
<style>{CSS}</style>
</head>
<body>

<h1>{title_prefix}</h1>
<h1 style="margin-top:-4px;">Blue Phase — Lesson-by-Lesson Content</h1>
<p class="sub">UFLI lessons 54-83 &middot; VCe, soft c/g, -tch, -dge, y as vowel, inflections, two-syllable words, r-controlled vowels, open syllables, -le syllables, w-influenced vowels, -all family.</p>

<h2>The Blue Phase brief</h2>
<p>Pink Phase taught every English letter and the digraphs and blends that combine them. Blue Phase teaches the next-most-common 30 patterns. By the end of Blue, a child can decode about 70% of all English one-syllable and two-syllable words on sight.</p>
<p><b>Posture stays the same.</b> 8-step daily routine. Encoding before decoding. Sandpaper letters (for VCe slider work), movable alphabet, picture-word matching, decodable booklets, heart words. Mirror work for any sound a Mandarin-L1 child finds hard. Daily articulation drill on r-controlled vowels.</p>

<h2>The Blue Phase sequence at a glance</h2>
<table>
  <tr><th>Lessons</th><th>Pattern family</th><th>What it unlocks</th></tr>
  <tr><td>L54-58</td><td>VCe (Magic-e)</td><td>Long vowels in CVCe words: cake, kite, rose, mule, these</td></tr>
  <tr><td>L59-60</td><td>Soft c, soft g</td><td>face, age, ice, large</td></tr>
  <tr><td>L61-62</td><td>-tch, -dge trigraphs</td><td>catch, edge — companions to soft c/g</td></tr>
  <tr><td>L63-64</td><td>Y as vowel</td><td>my (long-i), happy (long-e)</td></tr>
  <tr><td>L65-67</td><td>Inflections -s/-es, -ing, -ed</td><td>cats, jumping, played — past + plural + present</td></tr>
  <tr><td>L68-70</td><td>Compounds, 2-syl, doubling rule</td><td>sunset, rabbit, running</td></tr>
  <tr><td>L71-75</td><td>R-controlled vowels</td><td>car, for, her, bird, turn</td></tr>
  <tr><td>L76-77</td><td>Open syllables</td><td>he, music, pilot</td></tr>
  <tr><td>L78</td><td>-ind/-ild/-old family</td><td>find, child, gold</td></tr>
  <tr><td>L79</td><td>Consonant-le</td><td>little, apple, turtle</td></tr>
  <tr><td>L80</td><td>Review</td><td>Build fluency across L54-79 patterns</td></tr>
  <tr><td>L81</td><td>W-influenced</td><td>was, want, water, word</td></tr>
  <tr><td>L82</td><td>-all/-alk/-alt</td><td>ball, walk, salt</td></tr>
  <tr><td>L83</td><td>Blue Phase consolidation</td><td>End-of-Blue fluency check</td></tr>
</table>

<h2>How long does Blue Phase take?</h2>
<p>UFLI publishes a 30-lesson Blue sequence intended to run over about 30 school weeks (one new lesson per week, four daily 30-min sessions). For a Montessori classroom with mixed-age children and self-paced practice, plan on <b>4-6 months</b> for a child who has solid Pink Phase mastery. Mandarin-L1 learners often need 5-7 months — especially on r-controlled vowels and on the -ed/-ing inflections, which carry the heaviest L1 transfer load.</p>
<p>The trick: don't wait for whole-class mastery. Some children will sprint through VCe in two weeks. Others will need two months on r-controlled vowels alone. Group flexibility, not lockstep.</p>

<h2>Patterns to track per child</h2>
<p>Blue Phase introduces explicit grammar (plurals, past tense, present continuous) for the first time. Track these per child:</p>
<ul>
  <li><b>VCe automatic</b> — Can the child read cake/kite/rose/mule on sight, no decoding pause?</li>
  <li><b>R-controlled produced</b> — Can the child SAY car/for/her/bird/turn with the r-curl, not the Mandarin retroflex?</li>
  <li><b>-ing in speech</b> — Does the child spontaneously use "I am running" rather than "I run"?</li>
  <li><b>Past tense -ed in speech</b> — Does the child spontaneously use "yesterday I jumped" rather than "yesterday I jump"?</li>
  <li><b>Plurals -s/-es</b> — Does the child add the plural marker in speech as well as in spelling?</li>
</ul>
<p>The first two are decoding markers. The last three are productive grammar markers — they reveal whether the lesson has crossed from reading into speaking. Crossing matters most for Mandarin L1 children; their Mandarin doesn't have any of these morphological signals, so without explicit teaching they simply won't produce them in English.</p>
""")

    parts.append("<div class='toc'><h3 style='margin-top:0;'>Lessons at a glance</h3><ul>")
    all_lessons = PHASE4_VCE + PHASE4_SOFT_TRIGRAPH + PHASE4_Y + PHASE4_INFLECTIONS + PHASE4_MULTISYL + PHASE4_R_CONTROLLED + PHASE4_FINAL
    for L in all_lessons:
        parts.append(f"<li>L{L['num']} &middot; <em>{L['pattern']}</em></li>")
    parts.append("</ul></div>")

    parts.append("<h2>VCe — Magic-e (Lessons 54-58)</h2>")
    parts.append("<p>The single most-leveraging pattern in Blue Phase. Magic-e unlocks several thousand common English words at one stroke. Teach it as a SLIDER: build a CVC word with the movable alphabet, then slide in the silent e card — watch the vowel change.</p>")
    for L in PHASE4_VCE:
        parts.append(render_lesson(L))

    parts.append("<h2>Soft consonants and trigraphs (Lessons 59-62)</h2>")
    parts.append("<p>Soft c and soft g teach the same idea: e, i, and y soften the consonant before them. The -tch and -dge trigraphs are spelling-after-short-vowel rules. Teach as a four-lesson family.</p>")
    for L in PHASE4_SOFT_TRIGRAPH:
        parts.append(render_lesson(L))

    parts.append("<h2>Y as vowel (Lessons 63-64)</h2>")
    parts.append("<p>Two lessons covering y-as-vowel in one- and multi-syllable contexts. The rule: number of syllables decides the sound.</p>")
    for L in PHASE4_Y:
        parts.append(render_lesson(L))

    parts.append("<h2>Inflections — plurals, -ing, -ed (Lessons 65-67)</h2>")
    parts.append("<p>Three lessons that introduce English morphology. For Mandarin-L1 children these are conceptually new — Mandarin doesn't mark plural or tense on nouns/verbs. Spend extra time on production drills (oral practice, not just reading) so children START USING these endings in their own speech.</p>")
    for L in PHASE4_INFLECTIONS:
        parts.append(render_lesson(L))

    parts.append("<h2>Compounds, two-syllable words, and doubling (Lessons 68-70)</h2>")
    parts.append("<p>Three lessons on multi-syllable decoding. Compounds first (two known words glued), then closed-syllable two-syl, then the doubling rule for suffixes.</p>")
    for L in PHASE4_MULTISYL:
        parts.append(render_lesson(L))

    parts.append("<h2>R-controlled vowels (Lessons 71-75)</h2>")
    parts.append("<p>Five lessons covering ar, or, er, ir, ur. Three of them (er, ir, ur) share one sound. Mandarin-L1 critical — the r-curl is a brand-new mouth shape. Mirror work every single day.</p>")
    for L in PHASE4_R_CONTROLLED:
        parts.append(render_lesson(L))

    parts.append("<h2>Open syllables, special patterns, and Blue review (Lessons 76-83)</h2>")
    parts.append("<p>Lessons 76-77 introduce open syllables. L78 is the -ind/-ild/-old family. L79 is consonant-le. L80 is review. L81-82 are the w-influenced and -all families. L83 closes Blue Phase.</p>")
    for L in PHASE4_FINAL:
        parts.append(render_lesson(L))

    parts.append("<h2>Heart words — Blue Phase additions</h2>")
    parts.append("<p>Continue the convention from Pink Phase. Black ink for regular letters, RED ink for irregular ones, small red heart icon below each red letter. Blue Phase adds about 25 new heart words.</p>")
    parts.append("<table><tr><th>Lesson</th><th>New heart words</th><th>What's irregular</th></tr>")
    for ln in sorted(BLUE_HEART_WORDS.keys()):
        rows = BLUE_HEART_WORDS[ln]
        for word, irr in rows:
            parts.append(f"<tr><td>L{ln}</td><td><b>{html.escape(word)}</b></td><td>{html.escape(irr)}</td></tr>")
    parts.append("</table>")

    parts.append("<h2>Mandarin-L1 focus areas across Blue Phase</h2>")
    parts.append("""
<p>Blue Phase introduces three categories of pattern that hit Mandarin-L1 learners particularly hard. Mark these in your daily lesson notes so you can spot the children who need more drill.</p>
<ul>
  <li><b>R-controlled vowels (L71-75).</b> The English /r/-curl is alien to a Mandarin speaker. Daily mirror work. Pair the lesson with the ESL minimal-pair drill on r-vowels: car/care · for/four · her/hair · bird/beard · turn/tern.</li>
  <li><b>Inflectional endings (L65-67, L70).</b> Plurals, -ing, -ed. None of these exist in Mandarin grammar. Children may decode them in print but FAIL TO PRODUCE them in speech. Daily oral drill on "yesterday I ___ed" and "right now I am ___ing."</li>
  <li><b>VCe spelling (L54-58).</b> The "silent e at the end" is alien to a syllabic writing system. Spelling errors (cak for cake, kit for kite) persist for months. Be patient; reading practice fixes this faster than spelling correction.</li>
</ul>
""")

    parts.append("<h2>Picture sourcing for Blue Phase</h2>")
    parts.append("""
<p>Continue the same Canva and Google sourcing approach from Pink Phase. New categories to source for Blue:</p>
<ul>
  <li><b>VCe words.</b> Pictures of: cake, snake, plane, bone, rose, phone, cube, mule, tube. Stick to the same illustration style as Pink.</li>
  <li><b>R-controlled vowels.</b> Pictures of: car, star, farm, corn, horse, fork, bird, girl, shirt, turn, nurse, hurt.</li>
  <li><b>Inflections.</b> Don't source pictures for jumping/jumped — the child knows what jumping looks like. Instead, use ACTION PICTURE SEQUENCES: child standing → child jumping → child landed. This visualises tense.</li>
  <li><b>2-syl words.</b> Pictures of: rabbit, kitten, pumpkin, picnic, sunset, hilltop.</li>
  <li><b>Consonant-le words.</b> Pictures of: little, apple, turtle, table, bottle.</li>
</ul>
""")

    parts.append("<h2>References</h2>")
    parts.append("""
<ul style="font-size:10pt;">
<li>Boyer, N., &amp; Ehri, L. C. (2011). Contribution of phonemic segmentation instruction with letters and articulation pictures to word reading and spelling in beginners. <em>Scientific Studies of Reading, 15</em>(5), 440-470.</li>
<li>Ehri, L. C. (2009). Learning to read words: Theory, findings, and issues. <em>Scientific Studies of Reading, 9</em>(2), 167-188.</li>
<li>Gough, P. B., &amp; Tunmer, W. E. (1986). Decoding, reading, and reading disability. <em>Remedial and Special Education, 7</em>(1), 6-10.</li>
<li>Lane, H. B., et al. (2025). Effect of an Instructional Program in Foundational Reading Skills on Early Literacy Development of Students in Kindergarten and First Grade. <em>Reading Research Quarterly</em>. https://doi.org/10.1002/rrq.607</li>
<li>National Reading Panel (2000). <em>Teaching children to read: An evidence-based assessment of the scientific research literature on reading and its implications for reading instruction.</em></li>
<li>Kou, J.-W., et al. (2024). Neural substrates of L2-L1 transfer effects on phonological awareness in young Chinese-English bilingual children. <em>NeuroImage</em>.</li>
<li>University of Florida Literacy Institute (2024). UFLI Foundations Scope and Sequence. ufli.education.ufl.edu/foundations/</li>
</ul>
""")

    parts.append("""
<p class="sub" style="margin-top:32px;">Blue Phase complete. Green Phase (vowel teams, diphthongs, suffixes/prefixes, Greek/Latin roots — lessons 84-128) is a separate document.</p>
</body>
</html>
""")
    return '\n'.join(parts)


# AUDIT
print("=" * 60)
print("BLUE PHASE AUDIT — pattern integrity check")
print("=" * 60)
all_lessons = PHASE4_VCE + PHASE4_SOFT_TRIGRAPH + PHASE4_Y + PHASE4_INFLECTIONS + PHASE4_MULTISYL + PHASE4_R_CONTROLLED + PHASE4_FINAL
issues = audit_phase(all_lessons)
if issues:
    print(f"FOUND {len(issues)} lessons with violations:")
    for n, pattern, bad in issues:
        print(f"  L{n} ({pattern}):")
        for word, p in bad:
            print(f"    X  '{word}' uses {p}")
else:
    print("OK — all Blue Phase words pass pattern integrity check.")

print()
print(f"Total Blue lessons: {len(all_lessons)}")

# WRITE — try Mac path first; fall back to sandbox /sessions path
candidates = [
    '/Users/tredouxwillemse/Library/Application Support/Claude/local-agent-mode-sessions/adf81e2b-c5ac-4965-8e95-ce79d4a94782/c6dddf58-afde-4a1b-bc1d-2b6e224cd494/local_0f68a974-ec8b-48be-9f2b-3ffbd8c28782/outputs',
    '/sessions/stoic-lucid-franklin/mnt/outputs',
]
out_dir = None
for c in candidates:
    if os.path.isdir(c):
        out_dir = c
        break
if out_dir is None:
    out_dir = candidates[1]
    os.makedirs(out_dir, exist_ok=True)

whale_html = build_html('Whale Reading Framework')
whale_path = os.path.join(out_dir, 'whale-reading-content-blue.html')
with open(whale_path, 'w') as f:
    f.write(whale_html)
print(f"Wrote: {whale_path} ({len(whale_html)/1024:.1f} KB)")

neutral_html = build_html('The Complete Language Area')
neutral_html = neutral_html.replace('Whale Reading Framework — Blue Phase', 'The Complete Language Area — Blue Phase')
neutral_html = neutral_html.replace('Whale Reading Framework', 'The Complete Language Area')
neutral_html = neutral_html.replace('Whale framework', 'this framework')
neutral_path = os.path.join(out_dir, 'language-area-blue.html')
with open(neutral_path, 'w') as f:
    f.write(neutral_html)
print(f"Wrote: {neutral_path} ({len(neutral_html)/1024:.1f} KB)")
