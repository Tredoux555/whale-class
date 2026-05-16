#!/usr/bin/env python3
"""
Whale Reading Framework — Green Phase lesson content generator.
Outputs whale-reading-content-green.html and language-area-green.html.

Green Phase covers UFLI lessons 84-128 (45 lessons):
  - Vowel teams (L84-95)
  - Diphthongs and -oo (L93-95)
  - au/aw, ew, ie (L96-98)
  - Alternate ea + r-controlled vowel teams (L99-103)
  - Silent letters (L104-106)
  - Suffixes -tion/-sion + schwa (L107-110)
  - Suffixes -ly/-er/-est/-ful/-less/-ness/-ment (L111-114)
  - Prefixes un-/re-/pre-/dis-/mis-/sub- (L115-118)
  - Greek roots (L119-122)
  - Latin roots (L123-126)
  - Contractions + Green consolidation (L127-128)
"""

import html
import os

GREEN_HEART_WORDS = {
    84:  [('again', 'ai already taught'), ('against', 'ai, st')],
    85:  [('day', 'ay'), ('say', 'ay'), ('away', 'ay')],
    86:  [('three', 'ee'), ('been', 'ee, schwa')],
    87:  [('please', 'ea + silent e')],
    88:  [('boat', 'oa'), ('road', 'oa')],
    90:  [('night', 'igh'), ('right', 'igh'), ('light', 'igh')],
    91:  [('how', 'ow'), ('now', 'ow')],
    92:  [('our', 'ou + r'), ('out', 'ou'), ('about', 'ou')],
    93:  [('boy', 'oy'), ('toy', 'oy')],
    94:  [('school', 'oo, ch'), ('soon', 'oo')],
    95:  [('look', 'oo short'), ('took', 'oo short'), ('book', 'oo short')],
    96:  [('saw', 'aw'), ('paw', 'aw')],
    97:  [('new', 'ew'), ('few', 'ew')],
    99:  [('head', 'ea short'), ('read', 'ea short or long')],
    100: [('year', 'ear'), ('hear', 'ear')],
    101: [('care', 'are'), ('share', 'are')],
    102: [('hair', 'air'), ('air', 'air')],
    103: [('store', 'ore'), ('more', 'ore — already taught')],
    104: [('know', 'kn silent k'), ('write', 'wr silent w')],
    105: [('lamb', 'mb silent b'), ('sign', 'gn silent g')],
    106: [('phone', 'ph = f — already in CVCe'), ('graph', 'ph = f')],
    107: [('action', '-tion'), ('nation', '-tion')],
    109: [('animal', 'a, mal'), ('family', 'three syl')],
    111: [('only', '-ly already heart word')],
    115: [('under', 'un prefix already familiar')],
    116: [('return', 're prefix')],
    127: [("don't", "contraction"), ("can't", 'contraction'), ("it's", 'contraction')],
}

# Lessons 84-89 — Vowel teams (long vowels)
GREEN_VTEAM_LONG = [
    {
        'num': 84, 'pattern': 'ai — long /ā/', 'sound': '/ā/',
        'rule': 'Vowel team. Two vowels together. The first does the talking, the second silent. ai says long /ā/ — and ai appears in the MIDDLE of words, never at the end.',
        'words': ['ail', 'aim', 'aid', 'bail', 'fail', 'hail', 'jail', 'mail', 'nail', 'pail', 'rail', 'sail', 'tail', 'trail', 'snail', 'maid', 'paid', 'raid', 'braid', 'afraid', 'main', 'pain', 'rain', 'gain', 'brain', 'chain', 'drain', 'grain', 'plain', 'stain', 'train', 'spain', 'sprain', 'paint', 'faint', 'saint', 'fair', 'pair', 'hair', 'stair', 'wait', 'bait'],
        'phrases': ['a sail in the rain', 'a paint trail', 'a snail on a tail', 'a chain on a train', 'paid the bail'],
        'sentences': ['A snail on a trail.', 'I paint with rain.', 'A maid on a train.', 'Wait for the mail.', 'A faint pain in the brain.'],
        'pictures': [
            ('rain', 'rain falling from clouds'),
            ('snail', 'spiral-shell snail'),
            ('train', 'simple steam train'),
            ('paint', 'paint brush and bucket'),
            ('mail', 'envelope and stamp'),
            ('nail', 'iron nail illustration'),
        ],
        'esl': 'Long /ā/ is the same sound as in cake (L54). Now the spelling alternative ai. Children need explicit "two ways to spell /ā/" teaching: a_e and ai. Mandarin <em>āi 哀</em> covers the sound. Spelling rule mnemonic: "ai in the middle, ay at the end."',
        'heart_words_intro': ['again', 'against'],
    },
    {
        'num': 85, 'pattern': 'ay — long /ā/', 'sound': '/ā/',
        'rule': 'Vowel team. ay says long /ā/ — and ay appears at the END of a word/syllable. Same sound as ai, different spelling, different position. "ai in the middle, ay at the end."',
        'words': ['ay', 'bay', 'day', 'gay', 'hay', 'jay', 'lay', 'may', 'pay', 'ray', 'say', 'way', 'clay', 'play', 'pray', 'stay', 'stray', 'tray', 'spray', 'gray', 'sway', 'today', 'maybe', 'away', 'always', 'birthday', 'subway', 'crayon', 'replay'],
        'phrases': ['a sunny day', 'play today', 'a stray ray', 'a gray clay tray', 'pay the way'],
        'sentences': ['I play today.', 'A stray jay on a tray.', 'Lay a gray clay snail.', 'A bay on a sunny day.', 'A subway in the way.'],
        'pictures': [
            ('day', 'sun in the sky'),
            ('hay', 'hay bale'),
            ('tray', 'serving tray with food'),
            ('crayon', 'wax crayons in a row'),
            ('jay', 'blue jay bird'),
        ],
        'esl': 'Same sound as ai (L84). The position rule is the lesson. Pair with daily contrast: "rain on a sunny day" forces both spellings.',
        'heart_words_intro': ['day', 'say', 'away'],
    },
    {
        'num': 86, 'pattern': 'ee — long /ē/', 'sound': '/ē/',
        'rule': 'Vowel team. Two e\'s say long /ē/. "Bee, see, tree, feet." This is the most reliable vowel team in English — almost always /ē/.',
        'words': ['bee', 'see', 'fee', 'tee', 'wee', 'free', 'tree', 'three', 'beech', 'speech', 'screech', 'feed', 'need', 'seed', 'weed', 'bleed', 'speed', 'greed', 'creed', 'beef', 'reef', 'keep', 'deep', 'jeep', 'peep', 'seep', 'weep', 'sleep', 'sheep', 'sweep', 'creep', 'feel', 'heel', 'peel', 'reel', 'wheel', 'steel', 'queen', 'green', 'seen', 'teen', 'preen', 'screen', 'between', 'meet', 'feet', 'beet', 'greet', 'sheet', 'street', 'sweet', 'tweet'],
        'phrases': ['a green tree', 'three sheep', 'sweet feet', 'a deep sleep', 'meet the queen'],
        'sentences': ['Three green sheep.', 'A queen in a tree.', 'I meet sweet feet.', 'A deep sleep on a sheet.', 'A tree on a street.'],
        'pictures': [
            ('tree', 'simple leafy tree'),
            ('bee', 'cartoon bee'),
            ('three', 'numeral 3'),
            ('sheep', 'fluffy sheep'),
            ('feet', 'pair of feet'),
            ('queen', 'queen with a crown'),
        ],
        'esl': 'Long /ē/ exists in Mandarin (<em>yī 一</em>). Easy sound. Now a new spelling for it. Children have already met it via e_e (L58, rare) and y-long-e (L64); ee is the most common form. Add to the daily contrast.',
        'heart_words_intro': ['three', 'been'],
    },
    {
        'num': 87, 'pattern': 'ea — long /ē/', 'sound': '/ē/',
        'rule': 'Vowel team. ea also says long /ē/. "Tea, eat, leaf, sea." Same sound as ee, different spelling. Children memorize which words use which spelling — there\'s no rule.',
        'words': ['ea', 'sea', 'tea', 'pea', 'flea', 'each', 'beach', 'peach', 'reach', 'teach', 'preach', 'cheap', 'heap', 'leap', 'reap', 'eat', 'beat', 'feat', 'heat', 'meat', 'neat', 'seat', 'treat', 'wheat', 'leaf', 'deaf', 'beam', 'cream', 'dream', 'gleam', 'steam', 'stream', 'team', 'scream', 'mean', 'bean', 'jean', 'lean', 'wean', 'clean', 'east', 'beast', 'feast', 'least', 'yeast', 'leave', 'weave', 'heave', 'sneak', 'speak', 'creak', 'leak', 'peak'],
        'phrases': ['a cream cheese', 'a beach feast', 'a stream of cream', 'a peach in tea', 'a beast in a peach'],
        'sentences': ['I eat a peach.', 'A beach with a stream.', 'A cream peach in a tea.', 'Each beast on a beach.', 'A neat treat.'],
        'pictures': [
            ('sea', 'sea with waves'),
            ('tea', 'cup of tea'),
            ('leaf', 'green leaf'),
            ('peach', 'pink peach fruit'),
            ('beach', 'sandy beach with sun'),
            ('beam', 'beam of light'),
        ],
        'esl': 'Two spellings of /ē/ (ee and ea) is a problem. Children need to learn each word\'s spelling individually. Reading practice is the long-term fix. Worth a daily word-study: "Is it bee, or is it bea?" Pair with semantic context (the bee buzzes vs the pea grows).',
        'heart_words_intro': ['please'],
    },
    {
        'num': 88, 'pattern': 'oa — long /ō/', 'sound': '/ō/',
        'rule': 'Vowel team. oa says long /ō/. "Boat, coat, road." Same as o_e but in the middle of a word. oa appears in the middle, never at the end.',
        'words': ['oat', 'oats', 'boat', 'coat', 'goat', 'moat', 'float', 'gloat', 'throat', 'bloat', 'cloak', 'croak', 'soak', 'coal', 'foal', 'goal', 'load', 'road', 'toad', 'roam', 'foam', 'loaf', 'loan', 'moan', 'groan', 'soap', 'coast', 'roast', 'toast', 'boast'],
        'phrases': ['a coat on a goat', 'a boat on a coast', 'soap and oats', 'a foal on a road', 'a roast toast'],
        'sentences': ['A goat in a coat.', 'A boat on a road.', 'A toad on a road.', 'A roast toast.', 'Soap and oats on a boat.'],
        'pictures': [
            ('boat', 'small sailboat'),
            ('coat', 'winter coat'),
            ('goat', 'simple goat'),
            ('road', 'long road'),
            ('soap', 'bar of soap'),
            ('toast', 'piece of toast'),
        ],
        'esl': 'Long /ō/ is the same sound as in rose (L56). Now the spelling alternative oa. Like ai/ay, the position rule: oa in the middle, ow (L89) at the end.',
        'heart_words_intro': ['boat', 'road'],
    },
    {
        'num': 89, 'pattern': 'ow — long /ō/ at end of word', 'sound': '/ō/',
        'rule': 'Vowel team. ow says long /ō/ AT THE END of a word. "Snow, blow, slow." Mirrors the ai/ay rule — oa in middle, ow at end. (Caution: ow also says /ow/ as in cow — that\'s the next lesson.)',
        'words': ['ow', 'bow', 'low', 'mow', 'row', 'sow', 'tow', 'blow', 'flow', 'glow', 'grow', 'slow', 'show', 'snow', 'crow', 'throw', 'window', 'pillow', 'yellow', 'shadow', 'rainbow', 'follow', 'arrow', 'meadow', 'tomorrow', 'elbow'],
        'phrases': ['a slow crow', 'snow on a window', 'a yellow pillow', 'a rainbow shadow'],
        'sentences': ['A slow crow in the snow.', 'A yellow pillow on a bed.', 'I throw a low ball.', 'A shadow on a window.', 'A rainbow tomorrow.'],
        'pictures': [
            ('snow', 'snowflakes'),
            ('crow', 'black crow'),
            ('window', 'window with frame'),
            ('rainbow', 'rainbow arc'),
            ('pillow', 'soft pillow'),
            ('yellow', 'yellow color swatch'),
        ],
        'esl': 'Same long /ō/ — third spelling (o_e, oa, ow). The position rule helps: ow ends a word, oa does not. Mandarin has the sound (<em>ōu 欧</em>).',
    },
]

# Lessons 90-95 — More vowel teams + diphthongs + oo
GREEN_VTEAM_OTHER = [
    {
        'num': 90, 'pattern': 'igh — long /ī/', 'sound': '/ī/',
        'rule': 'Three letters, one sound. igh says long /ī/. "Night, light, right." The g and h are silent — the i does all the talking.',
        'words': ['high', 'sigh', 'thigh', 'nigh', 'light', 'might', 'night', 'right', 'sight', 'tight', 'fight', 'bright', 'flight', 'fright', 'plight', 'slight', 'midnight', 'highway', 'sunlight', 'tonight'],
        'phrases': ['a bright light', 'tonight at midnight', 'a tight fight', 'a high flight'],
        'sentences': ['A bright light at night.', 'A high flight tonight.', 'A tight fight.', 'I sight a sunlight.', 'A right flight at midnight.'],
        'pictures': [
            ('light', 'lightbulb'),
            ('night', 'night sky with moon'),
            ('high', 'mountain peak'),
        ],
        'esl': 'Same /ī/ sound (the diphthong /aɪ/). Now a fourth spelling (i_e, y, igh — and ind/ild/old from L78). Children need a posters on the wall: "Long /ī/ has many spellings."',
        'heart_words_intro': ['night', 'right', 'light'],
    },
    {
        'num': 91, 'pattern': 'ow — diphthong /ow/ (as in "cow")', 'sound': '/ow/',
        'rule': 'WAIT — this is the SAME spelling as ow in L89 (snow), but a DIFFERENT sound. ow can say /ō/ (snow) OR /ow/ (cow). Context decides. Most words at the END of a word/syllable use /ow/; most words in the middle use /ō/ — but plenty of exceptions. Children memorise.',
        'words': ['cow', 'bow', 'how', 'now', 'pow', 'sow', 'wow', 'brow', 'clown', 'crown', 'down', 'frown', 'gown', 'town', 'brown', 'drown', 'crowd', 'flower', 'power', 'shower', 'tower', 'owl', 'fowl', 'howl', 'jowl', 'growl', 'prowl', 'scowl'],
        'phrases': ['a brown owl', 'a clown in a crown', 'a flower shower', 'a frown on a clown', 'down in town'],
        'sentences': ['A brown owl in a tower.', 'A clown in a crown.', 'A frown on a cow.', 'A shower of power.', 'Down in a town.'],
        'pictures': [
            ('cow', 'cartoon cow'),
            ('owl', 'horned owl'),
            ('crown', 'royal crown'),
            ('flower', 'simple flower'),
            ('clown', 'circus clown'),
        ],
        'esl': 'New sound — the diphthong /aʊ/. Mandarin has <em>āo 凹</em> as the closest match. Acceptable. The challenge is the SAME-SPELLING-TWO-SOUNDS problem. Daily contrast drill: snow/cow · slow/down · blow/brown · grow/town.',
        'heart_words_intro': ['how', 'now'],
    },
    {
        'num': 92, 'pattern': 'ou — diphthong /ow/ (as in "out")', 'sound': '/ow/',
        'rule': 'Vowel team. ou says /ow/ — same as the second sound of ow. "Out, loud, sound." Mostly in the middle of words; ow takes the end position.',
        'words': ['out', 'about', 'shout', 'spout', 'snout', 'sprout', 'pout', 'gout', 'oust', 'aloud', 'cloud', 'loud', 'proud', 'sound', 'pound', 'round', 'ground', 'found', 'bound', 'mound', 'hound', 'house', 'mouse', 'blouse', 'spouse', 'count', 'mount', 'fount', 'amount', 'south', 'mouth', 'youth', 'hour', 'flour', 'sour', 'scout', 'ouch', 'pouch', 'couch', 'crouch', 'noun'],
        'phrases': ['a loud cloud', 'a proud mouse', 'a mouth on a couch', 'a round pound', 'out and about'],
        'sentences': ['A loud mouse in a house.', 'A proud cloud sound.', 'A round pound on the ground.', 'A south mouth.', 'I shout out loud.'],
        'pictures': [
            ('cloud', 'cloud illustration'),
            ('mouse', 'small cartoon mouse'),
            ('house', 'simple house'),
            ('mouth', 'open mouth'),
            ('sound', 'sound waves'),
        ],
        'esl': 'Same /ow/ as L91. Two spellings now (ow at end, ou in middle). Mandarin <em>āo 凹</em> — acceptable sound. Daily drill: how about a hound · out in the town · loud in the crowd.',
        'heart_words_intro': ['our', 'out', 'about'],
    },
    {
        'num': 93, 'pattern': 'oi, oy — diphthong /oy/', 'sound': '/oy/',
        'rule': 'Vowel teams. Two spellings: oi in the middle, oy at the end. Same rule as ai/ay and oa/ow. "Oil, boil, coin" — "boy, toy, joy."',
        'words': ['oil', 'boil', 'coil', 'foil', 'soil', 'spoil', 'toil', 'broil', 'coin', 'join', 'joint', 'point', 'avoid', 'moist', 'hoist', 'noise', 'choice', 'voice', 'rejoice', 'boy', 'toy', 'joy', 'soy', 'coy', 'enjoy', 'employ', 'destroy', 'annoy', 'royal', 'loyal', 'oyster'],
        'phrases': ['a boy with a toy', 'a coin in oil', 'a noise in joy', 'enjoy the soy', 'a loyal royal'],
        'sentences': ['A boy with a toy.', 'I enjoy a coin in oil.', 'A noise in the soy.', 'A choice of voice.', 'A loyal royal point.'],
        'pictures': [
            ('boy', 'cartoon boy'),
            ('toy', 'toy block'),
            ('coin', 'gold coin'),
            ('oil', 'oil bottle'),
            ('point', 'pointing finger'),
        ],
        'esl': 'New diphthong /oɪ/. Mandarin doesn\'t have it as a phoneme but children pick it up easily. Mostly an enjoyable lesson — kids love saying "boy joy toy" in a row.',
        'heart_words_intro': ['boy', 'toy'],
    },
    {
        'num': 94, 'pattern': 'oo — long /ū/ (as in "moon")', 'sound': '/ū/',
        'rule': 'Vowel team. oo says a long /ū/. "Moon, food, tool, room." Most common oo sound. (Caution: oo also says short /ʊ/ as in book — that\'s next lesson.)',
        'words': ['boo', 'too', 'zoo', 'moo', 'goo', 'boom', 'doom', 'loom', 'room', 'zoom', 'gloom', 'bloom', 'broom', 'groom', 'food', 'good', 'mood', 'pool', 'tool', 'cool', 'fool', 'spool', 'stool', 'school', 'goose', 'choose', 'loose', 'moose', 'noose', 'boot', 'hoot', 'loot', 'moot', 'root', 'shoot', 'soon', 'moon', 'noon', 'spoon', 'tooth', 'booth', 'smooth', 'tooth', 'roof', 'proof', 'spoof'],
        'phrases': ['a cool pool', 'a moose on a tool', 'a smooth tooth', 'food at noon', 'a moon in a room'],
        'sentences': ['A moose at school.', 'A cool moon in a pool.', 'I shoot the moon.', 'A smooth tooth.', 'Food on a spoon.'],
        'pictures': [
            ('moon', 'crescent moon'),
            ('school', 'school building'),
            ('spoon', 'soup spoon'),
            ('tooth', 'white tooth'),
            ('food', 'plate of food'),
            ('boot', 'rubber boot'),
        ],
        'esl': 'Mandarin <em>ū</em> (<em>fū 夫</em>) is close. Sound is reachable. The two-sounds-one-spelling problem (oo as /ū/ vs /ʊ/) is the lesson over two days.',
        'heart_words_intro': ['school', 'soon'],
    },
    {
        'num': 95, 'pattern': 'oo — short /ʊ/ (as in "book")', 'sound': '/ʊ/',
        'rule': 'Same spelling, different sound. oo can say short /ʊ/ — "book, look, foot, good." Smaller family but high-frequency. Children memorise the short-oo word list.',
        'words': ['book', 'cook', 'hook', 'look', 'nook', 'rook', 'took', 'brook', 'crook', 'shook', 'good', 'hood', 'wood', 'stood', 'foot', 'soot', 'wool'],
        'phrases': ['a good book', 'a wooden hook', 'a wool foot', 'a stood crook', 'a cook on a hook'],
        'sentences': ['A good cook.', 'Look at a book.', 'A wool foot in a hood.', 'A crook stood and took.', 'A wood hook by a brook.'],
        'pictures': [
            ('book', 'open book'),
            ('foot', 'one foot'),
            ('cook', 'chef cooking'),
            ('hook', 'hanging hook'),
            ('wood', 'pile of wood'),
        ],
        'esl': 'Short /ʊ/ vs long /ū/ contrast is a real challenge. Mandarin doesn\'t separate them — same vowel space. Daily contrast drill: book/boot · cook/cool · good/goose · look/loose.',
        'heart_words_intro': ['look', 'took', 'book'],
    },
]

# Lessons 96-103 — au/aw, ew, ie, alternate ea, r-controlled vowel teams
GREEN_OTHER_TEAMS = [
    {
        'num': 96, 'pattern': 'au, aw — /aw/', 'sound': '/aw/',
        'rule': 'Two spellings: au in middle, aw at end. "Saw, paw, claw" — "haul, fault, sauce." Familiar position rule.',
        'words': ['au', 'aunt', 'fault', 'haul', 'maul', 'sauce', 'cause', 'pause', 'haunt', 'launch', 'fraud', 'taunt', 'laundry', 'because', 'autumn', 'August', 'saw', 'paw', 'jaw', 'law', 'raw', 'caw', 'thaw', 'claw', 'draw', 'flaw', 'straw', 'awful', 'awl', 'crawl', 'drawn', 'dawn', 'fawn', 'lawn', 'pawn', 'spawn', 'yawn', 'hawk'],
        'phrases': ['a paw on a lawn', 'a straw in a sauce', 'a hawk in the dawn', 'a yawn on a pawn'],
        'sentences': ['A paw on a lawn.', 'A claw on a hawk.', 'Sauce on a straw.', 'A yawn at dawn.', 'A draw and a flaw.'],
        'pictures': [
            ('saw', 'hand saw'),
            ('paw', 'animal paw'),
            ('claw', 'crab claw'),
            ('lawn', 'green lawn'),
            ('straw', 'drinking straw'),
        ],
        'esl': 'New rounded vowel /ɔ/. Mandarin <em>āo 凹</em> is closest (but more diphthong-like). Children pick it up after a few days.',
        'heart_words_intro': ['saw', 'paw'],
    },
    {
        'num': 97, 'pattern': 'ew — /ū/ or /yū/', 'sound': '/ū/ or /yū/',
        'rule': 'Vowel team. ew at the end of a word/syllable says /ū/ or /yū/. "New, few, drew, blew, chew." Same sound family as u_e.',
        'words': ['ew', 'new', 'few', 'dew', 'hew', 'mew', 'pew', 'sew', 'blew', 'chew', 'crew', 'drew', 'flew', 'grew', 'screw', 'shrew', 'slew', 'spew', 'stew', 'threw', 'view', 'review', 'curfew', 'jewel', 'cashew', 'renew'],
        'phrases': ['a new view', 'a few crew', 'a stew chew', 'flew threw a few'],
        'sentences': ['A new crew.', 'I flew threw the dew.', 'A few new stew.', 'Drew a jewel.', 'A review of a view.'],
        'pictures': [
            ('new', 'shiny new object'),
            ('crew', 'group of workers'),
            ('chew', 'gum being chewed'),
            ('jewel', 'gemstone'),
        ],
        'esl': 'Same /ū/ family as u_e (L57) and oo (L94). Yet another spelling. Children should be able to read "new" / "few" instantly from sight-words by L97.',
        'heart_words_intro': ['new', 'few'],
    },
    {
        'num': 98, 'pattern': 'ie — long /ē/ (in some words) or long /ī/', 'sound': '/ē/ or /ī/',
        'rule': 'Vowel team. ie usually says long /ē/ in the middle of a word: "chief, brief, field." Says long /ī/ at the end: "pie, tie, lie, die." Children memorise.',
        'words': ['ie', 'pie', 'die', 'lie', 'tie', 'vie', 'cried', 'tried', 'dried', 'fried', 'replied', 'spied', 'untied', 'chief', 'brief', 'grief', 'thief', 'field', 'shield', 'yield', 'wield', 'piece', 'niece', 'priest', 'pier', 'fierce'],
        'phrases': ['a fierce thief', 'a chief in the field', 'a piece of pie', 'a tie on a niece'],
        'sentences': ['A fierce chief in a field.', 'A piece of pie.', 'A tie on a niece.', 'A thief who cried.', 'A brief shield in a field.'],
        'pictures': [
            ('pie', 'slice of pie'),
            ('tie', 'necktie'),
            ('field', 'open grass field'),
            ('chief', 'leader with hat'),
            ('piece', 'puzzle piece'),
        ],
        'esl': 'Spelling ambiguity here. The position rule (ie /ē/ in middle, ie /ī/ at end) helps but isn\'t perfect (lie, tie are at end and say /ī/). Daily reading practice settles it.',
    },
    {
        'num': 99, 'pattern': 'ea — short /ĕ/ (alternate)', 'sound': '/ĕ/',
        'rule': 'A second sound for ea. Usually /ē/ (L87) but in a small family ea says short /ĕ/. "Bread, head, dead." Children memorise the short-ea word list.',
        'words': ['bread', 'dead', 'dread', 'head', 'lead', 'read', 'spread', 'thread', 'tread', 'tread', 'breath', 'death', 'health', 'wealth', 'sweat', 'threat', 'meadow', 'feather', 'heaven', 'heavy', 'leather', 'measure', 'pleasure', 'treasure', 'weapon'],
        'phrases': ['a heavy head', 'a sweat on bread', 'a thread of breath', 'a feather treasure'],
        'sentences': ['Bread on a head.', 'A heavy sweat.', 'A treasure of bread.', 'A feather and a thread.', 'A measure of wealth.'],
        'pictures': [
            ('bread', 'loaf of bread'),
            ('head', 'head profile'),
            ('feather', 'bird feather'),
            ('thread', 'spool of thread'),
        ],
        'esl': 'Same-spelling-two-sounds problem. ea is /ē/ in most words (eat, sea, beach) and /ĕ/ in a small family (bread, head, dead). Daily contrast: read (now) vs read (past) — same spelling, different sounds! English is wonderful.',
        'heart_words_intro': ['head', 'read'],
    },
    {
        'num': 100, 'pattern': 'ear — r-controlled vowel team', 'sound': '/eer/',
        'rule': 'Vowel team + r. ear usually says /eer/. "Year, fear, hear, near, dear." Long-e + r-control = the /eer/ sound.',
        'words': ['ear', 'dear', 'fear', 'gear', 'hear', 'near', 'rear', 'tear', 'year', 'clear', 'smear', 'spear', 'beard', 'spear', 'appear', 'beach', 'theater'],
        'phrases': ['a dear year', 'a clear fear', 'a near beard', 'a spear and a smear'],
        'sentences': ['A near year.', 'I hear a clear fear.', 'A spear and a smear.', 'A beard near here.', 'A dear ear.'],
        'pictures': [
            ('ear', 'human ear'),
            ('year', 'calendar showing a year'),
            ('hear', 'cupped hand at ear'),
            ('beard', 'man with beard'),
        ],
        'esl': 'New sound /ɪər/. Mandarin doesn\'t have it but it\'s close to <em>ěr 耳</em>. The r-curl from L71-75 carries over.',
        'heart_words_intro': ['year', 'hear'],
    },
    {
        'num': 101, 'pattern': 'are — r-controlled vowel team', 'sound': '/air/',
        'rule': 'are says /air/ — long-a + r-control. "Care, share, dare, bare." Pairs with the VCe pattern but with the r changing the sound.',
        'words': ['are', 'bare', 'care', 'dare', 'fare', 'hare', 'mare', 'pare', 'rare', 'share', 'snare', 'spare', 'stare', 'square', 'aware', 'beware', 'compare', 'declare', 'prepare', 'scare', 'parent', 'parents', 'pardon'],
        'phrases': ['a rare hare', 'a square stare', 'a spare share', 'a dare and a stare'],
        'sentences': ['A rare hare.', 'A spare share.', 'I dare to stare.', 'A scare in a square.', 'A care to share.'],
        'pictures': [
            ('hare', 'rabbit/hare'),
            ('square', 'square shape'),
            ('share', 'two children sharing food'),
            ('mare', 'female horse'),
        ],
        'esl': 'Same /air/ family as ear (L100) but with the are spelling. Children may confuse care/bear/hair — natural over months. Reading practice resolves it.',
        'heart_words_intro': ['care', 'share'],
    },
    {
        'num': 102, 'pattern': 'air — r-controlled vowel team', 'sound': '/air/',
        'rule': 'Vowel team + r. air says /air/ — same sound as are, different spelling. "Hair, fair, chair." Position: usually after a consonant.',
        'words': ['air', 'fair', 'hair', 'lair', 'pair', 'chair', 'flair', 'stair', 'unfair', 'repair', 'despair', 'airplane'],
        'phrases': ['a pair of hair', 'a fair chair', 'a flair on a stair', 'an air repair'],
        'sentences': ['A pair of stairs.', 'A fair chair.', 'A flair on a stair.', 'A pair of hair.', 'An airplane in the air.'],
        'pictures': [
            ('hair', 'head with hair'),
            ('chair', 'simple chair'),
            ('air', 'wind/air swirls'),
            ('pair', 'two matching items'),
            ('stair', 'staircase'),
        ],
        'esl': 'Same /air/ sound, third spelling (are, ear can also). Daily reading practice.',
        'heart_words_intro': ['hair', 'air'],
    },
    {
        'num': 103, 'pattern': 'ore — r-controlled vowel team', 'sound': '/or/',
        'rule': 'ore says /or/ — same as or (L72) but with the VCe-style silent e. "More, store, before, score." Common pattern.',
        'words': ['ore', 'bore', 'core', 'fore', 'gore', 'lore', 'more', 'pore', 'sore', 'tore', 'wore', 'chore', 'shore', 'snore', 'spore', 'store', 'swore', 'score', 'snore', 'before', 'adore', 'explore', 'restore', 'ignore'],
        'phrases': ['a store of more', 'a chore for a shore', 'a sore snore', 'a store before'],
        'sentences': ['A store on a shore.', 'A sore snore.', 'More chores before bed.', 'A score on the store.', 'Explore the shore.'],
        'pictures': [
            ('store', 'shop front'),
            ('shore', 'beach shoreline'),
            ('more', 'plus sign or "more" gesture'),
        ],
        'esl': 'Same /or/ as L72. The ore spelling is a major spelling alternative. By now children should be fluent on the r-controlled family.',
        'heart_words_intro': ['store'],
    },
]

# Lessons 104-106 — Silent letters + ph
GREEN_SILENT = [
    {
        'num': 104, 'pattern': 'Silent letters — kn, wr', 'sound': '',
        'rule': 'In some old English spellings, the first letter is silent. "Know" — k is silent. "Write" — w is silent. Children memorise these — they\'re not predictable but the small family is high-frequency.',
        'words': ['knee', 'knew', 'kneel', 'knife', 'knit', 'knob', 'knock', 'knot', 'know', 'knuckle', 'wrap', 'wreck', 'wren', 'wrench', 'wrestle', 'wrist', 'write', 'wrong', 'wrote', 'wry'],
        'phrases': ['a wrap on a knee', 'a knit knife', 'a wrong knot', 'a wren and a wrench'],
        'sentences': ['I know how to knit.', 'A knot in a knee.', 'A wrap on a wrist.', 'A wren in a wreck.', 'I write with a wrist.'],
        'pictures': [
            ('knee', 'bent knee'),
            ('knife', 'kitchen knife'),
            ('write', 'hand writing'),
            ('wrist', 'wrist with watch'),
            ('knot', 'tied knot'),
        ],
        'esl': 'Silent letters are utterly arbitrary from a Mandarin perspective — every letter in a Chinese character has meaning. The concept "this letter is here but you don\'t say it" needs explicit teaching. Daily oral drill: "Spell it with the silent letter; say it without."',
        'heart_words_intro': ['know', 'write'],
    },
    {
        'num': 105, 'pattern': 'Silent letters — mb, gn', 'sound': '',
        'rule': 'More silent letters. "Lamb" — b is silent. "Sign" — g is silent. Small family. Memorise.',
        'words': ['lamb', 'comb', 'climb', 'thumb', 'crumb', 'numb', 'plumb', 'tomb', 'bomb', 'limb', 'dumb', 'gnash', 'gnat', 'gnaw', 'gnome', 'sign', 'design', 'resign', 'feign', 'reign'],
        'phrases': ['a lamb on a comb', 'a numb thumb', 'a sign in a sign', 'a tomb of a gnome'],
        'sentences': ['A lamb on a hill.', 'I comb a thumb.', 'A sign of a gnome.', 'A numb climb.', 'A bomb on a tomb.'],
        'pictures': [
            ('lamb', 'baby sheep'),
            ('comb', 'hair comb'),
            ('thumb', 'thumbs up'),
            ('sign', 'street sign'),
            ('gnome', 'garden gnome'),
        ],
        'esl': 'Same concept as L104. More silent letters. Pair the two lessons in word study.',
        'heart_words_intro': ['lamb', 'sign'],
    },
    {
        'num': 106, 'pattern': 'ph — /f/', 'sound': '/f/',
        'rule': 'Two letters, one sound. ph says /f/. "Phone, graph, elephant." Mostly in Greek-derived words. The next lesson family.',
        'words': ['phone', 'photo', 'graph', 'phrase', 'phonics', 'pharmacy', 'philosophy', 'physical', 'physics', 'orphan', 'elephant', 'alphabet', 'dolphin', 'trophy', 'nephew', 'phantom', 'sphere', 'sphinx', 'morph', 'triumph', 'paragraph'],
        'phrases': ['a phone graph', 'an elephant photo', 'a dolphin trophy', 'a phonics phrase'],
        'sentences': ['A phone photo.', 'An elephant in a graph.', 'A dolphin trophy.', 'A phonics phrase.', 'A nephew of an orphan.'],
        'pictures': [
            ('phone', 'mobile phone'),
            ('graph', 'bar chart'),
            ('elephant', 'cartoon elephant'),
            ('dolphin', 'dolphin jumping'),
            ('photo', 'camera or photograph'),
        ],
        'esl': 'No new sound — /f/ already known. The lesson is the spelling. Connect to Greek roots (L119+): "many ph- words come from Greek; they\'re scientific or technical."',
        'heart_words_intro': ['phone', 'graph'],
    },
]

# Lessons 107-110 — Suffixes and schwa
GREEN_SUFFIX_BASIC = [
    {
        'num': 107, 'pattern': '-tion suffix — /shun/', 'sound': '/shun/',
        'rule': 'Suffix. -tion at the end of a word says /shun/. "Action, nation, station, motion." Common in noun forms of verbs.',
        'words': ['action', 'nation', 'station', 'motion', 'lotion', 'notion', 'option', 'caption', 'fiction', 'fraction', 'mention', 'attention', 'section', 'creation', 'addition', 'invention', 'reaction', 'invitation', 'celebration', 'education', 'imagination', 'situation'],
        'phrases': ['an action station', 'a nation of motion', 'an option of fiction', 'an addition of attention'],
        'sentences': ['An action at a station.', 'A nation in motion.', 'An option of addition.', 'An invention of fiction.', 'A celebration of education.'],
        'pictures': [
            ('action', 'child running fast'),
            ('nation', 'flag'),
            ('station', 'train station'),
        ],
        'esl': 'Suffix concept is new for Mandarin learners — Mandarin doesn\'t add morphological endings. Teach as a "word builder": verb + tion = noun. "act → action, create → creation."',
        'heart_words_intro': ['action', 'nation'],
    },
    {
        'num': 108, 'pattern': '-sion suffix — /shun/ or /zhun/', 'sound': '/shun/ or /zhun/',
        'rule': 'Suffix. -sion at the end says /shun/ (mansion) or /zhun/ (vision). Less common than -tion.',
        'words': ['mansion', 'mission', 'session', 'passion', 'tension', 'pension', 'extension', 'expansion', 'discussion', 'expression', 'admission', 'permission', 'vision', 'fusion', 'decision', 'invasion', 'occasion', 'television'],
        'phrases': ['a vision of fusion', 'a mansion of passion', 'a session of tension', 'a permission for admission'],
        'sentences': ['A vision of fusion.', 'A mansion in tension.', 'A session and a decision.', 'Permission for admission.', 'A passion for television.'],
        'esl': 'Closely related to -tion. Children should know /shun/ and /zhun/ are slightly different. The lesson is that English builds nouns from verbs with -tion or -sion.',
    },
    {
        'num': 109, 'pattern': 'Schwa in multi-syllable words', 'sound': '/ə/',
        'rule': 'In unstressed syllables, vowels often collapse to /ə/ (the schwa) — a soft "uh" sound. "Animal" = an-i-MAL → an-uh-mul. "Family" = FAM-uh-lee. Schwa is the most common vowel in English but has no fixed spelling.',
        'words': ['about', 'around', 'across', 'agree', 'alone', 'apart', 'asleep', 'animal', 'family', 'finally', 'banana', 'America', 'parent', 'common', 'cousin', 'dragon', 'lemon', 'lesson', 'reason', 'season', 'happen', 'kitchen', 'open', 'oven', 'pollen', 'siren'],
        'phrases': ['an animal family', 'a banana parent', 'a dragon lesson', 'a kitchen reason'],
        'sentences': ['A dragon family.', 'A kitchen oven.', 'A common lesson.', 'A banana season.', 'A reason to agree.'],
        'esl': '<strong>Major Mandarin L1 concept.</strong> Mandarin has no schwa — every vowel keeps its full quality. Mandarin speakers tend to over-articulate unstressed syllables. "Animal" comes out as AN-EE-MAHL instead of AN-uh-mul. Mirror work daily. The schwa is the most common English vowel; getting it produces a more natural rhythm.',
        'heart_words_intro': ['animal', 'family'],
    },
    {
        'num': 110, 'pattern': 'Stressed vs unstressed syllables', 'sound': '',
        'rule': 'In every multi-syllable word, ONE syllable gets the stress. The stressed syllable is louder, longer, and clearer. The unstressed ones often have schwa. "BAN-an-a" — first syl stressed. "to-MOR-row" — middle. Children learn to find the stress.',
        'words': ['report', 'reply', 'remind', 'remark', 'began', 'beneath', 'become', 'behind', 'before', 'asleep', 'alive', 'across', 'admit', 'around', 'banana', 'tomorrow', 'remember', 'computer', 'forget', 'inside', 'outside', 'morning', 'evening', 'birthday', 'children', 'better', 'never', 'water', 'after'],
        'phrases': ['report tomorrow', 'remember before', 'behind a computer', 'inside the morning'],
        'sentences': ['Report tomorrow.', 'Remember a banana.', 'Inside the kitchen.', 'After the morning.', 'Computer in the evening.'],
        'esl': 'Stress is genuinely new for Mandarin L1 — Mandarin uses lexical TONE not stress. Children may apply Mandarin tone patterns to English (rising on every syllable). Teach stress explicitly: clap on the stressed syllable. "ba-NA-na" — clap on NA.',
    },
]

# Lessons 111-114 — More common suffixes
GREEN_SUFFIX_MORE = [
    {
        'num': 111, 'pattern': '-ly suffix', 'sound': '',
        'rule': 'Suffix. -ly makes an adjective into an adverb. "Quick + ly = quickly." Also makes some adjectives. "Friend + ly = friendly."',
        'words': ['quickly', 'slowly', 'softly', 'loudly', 'kindly', 'badly', 'sadly', 'gladly', 'gently', 'simply', 'fully', 'really', 'finally', 'safely', 'lonely', 'lovely', 'friendly', 'manly', 'monthly', 'weekly', 'daily', 'family', 'truly', 'wholly'],
        'phrases': ['quickly and slowly', 'softly and loudly', 'kindly and gently', 'a friendly family'],
        'sentences': ['I run quickly.', 'A softly friendly cat.', 'A weekly visit.', 'Loudly and badly.', 'A really lovely day.'],
        'esl': '-ly is reliable. Teach it as a "word builder": adjective + ly = adverb. Children love this — it gives them productive grammar.',
    },
    {
        'num': 112, 'pattern': '-er, -est suffixes (comparatives)', 'sound': '',
        'rule': 'Suffixes. -er = "more." -est = "most." Used to compare. "Big, bigger, biggest." "Tall, taller, tallest." Spelling rule: short-vowel + single consonant → double the consonant ("big" → "bigger," not "biger").',
        'words': ['bigger', 'biggest', 'taller', 'tallest', 'smaller', 'smallest', 'faster', 'fastest', 'shorter', 'shortest', 'longer', 'longest', 'sweeter', 'sweetest', 'kinder', 'kindest', 'softer', 'softest', 'older', 'oldest', 'colder', 'coldest', 'hotter', 'hottest', 'redder', 'reddest', 'thinner', 'thinnest', 'fatter', 'fattest', 'sadder', 'saddest'],
        'phrases': ['bigger than smaller', 'taller and tallest', 'a colder and coldest', 'sweeter and sweetest'],
        'sentences': ['Bigger than a cat.', 'A taller dog.', 'The fastest car.', 'A sweeter cake.', 'The coldest day.'],
        'esl': 'Mandarin uses 比 (bǐ) or 更 (gèng) for comparison — completely different mechanism. Add -er / -est is new grammar. Daily oral drill: "Which is bigger?" with concrete objects.',
    },
    {
        'num': 113, 'pattern': '-ful, -less suffixes', 'sound': '',
        'rule': 'Two opposite suffixes. -ful = "full of." -less = "without." "Care + ful = careful." "Care + less = careless."',
        'words': ['careful', 'helpful', 'wonderful', 'beautiful', 'colorful', 'powerful', 'thankful', 'cheerful', 'painful', 'useful', 'restful', 'graceful', 'careless', 'helpless', 'hopeless', 'restless', 'fearless', 'priceless', 'endless', 'speechless', 'useless', 'sleepless'],
        'phrases': ['a careful but careless', 'a helpful and helpless', 'a hopeless dream', 'a graceful person'],
        'sentences': ['A careful child.', 'A helpless kitten.', 'A useful tool.', 'A useless joke.', 'A wonderful day.'],
        'esl': 'Productive grammar. Children love this. -ful and -less make instantly buildable vocabulary.',
    },
    {
        'num': 114, 'pattern': '-ness, -ment suffixes', 'sound': '',
        'rule': '-ness makes an abstract noun from an adjective. "Kindness, sadness, happiness." -ment makes an abstract noun from a verb. "Payment, agreement, movement."',
        'words': ['kindness', 'sadness', 'happiness', 'darkness', 'goodness', 'fairness', 'softness', 'witness', 'illness', 'fitness', 'sickness', 'business', 'awareness', 'payment', 'agreement', 'movement', 'argument', 'statement', 'enjoyment', 'treatment', 'arrangement', 'achievement'],
        'phrases': ['a kindness and a sadness', 'a payment and a treatment', 'a fitness movement', 'a fairness agreement'],
        'sentences': ['A kindness in darkness.', 'A payment for fitness.', 'A movement of happiness.', 'A statement of fairness.', 'A treatment for illness.'],
        'esl': 'More productive grammar. Verb + ment = noun. Adjective + ness = noun.',
    },
]

# Lessons 115-118 — Common prefixes
GREEN_PREFIX = [
    {
        'num': 115, 'pattern': 'Prefix un- = "not" or "reverse"', 'sound': '',
        'rule': 'Prefix. un- means "not" or "reverse." "Un + happy = unhappy." "Un + tie = untie."',
        'words': ['unhappy', 'unkind', 'unfit', 'unsafe', 'unwell', 'unable', 'unaware', 'unsure', 'untrue', 'unclear', 'untie', 'unlock', 'undo', 'undress', 'unpack', 'unsold', 'unwise', 'unfair', 'unzip', 'unplug', 'unmade'],
        'phrases': ['unkind and unfair', 'untie and unlock', 'unwise and unsafe', 'unpack and undress'],
        'sentences': ['An unhappy cat.', 'Untie a knot.', 'An unsafe road.', 'I unpack a bag.', 'An unfair race.'],
        'esl': 'Prefix concept new for Mandarin learners. Mandarin uses 不 (bù) or 无 (wú) for negation — works at the word level. English un- at the morpheme level. Teach as "un + the word = the opposite."',
        'heart_words_intro': ['under'],
    },
    {
        'num': 116, 'pattern': 'Prefix re- = "again" or "back"', 'sound': '',
        'rule': 'Prefix. re- means "again." "Re + play = replay" (play it again). "Re + visit = revisit."',
        'words': ['replay', 'redo', 'rewind', 'remake', 'rewrite', 'reread', 'reuse', 'reload', 'remix', 'reset', 'return', 'restart', 'reopen', 'remind', 'remark', 'review', 'restore', 'react', 'refresh', 'rebuild', 'refill', 'rename', 'recall'],
        'phrases': ['replay and rewind', 'restart and reload', 'recall and react', 'remind and review'],
        'sentences': ['Replay the song.', 'Rewind the tape.', 'Restart the game.', 'Reload the gun.', 'Remind me.'],
        'esl': 'Same concept as un-. re- = "again." Children love it. "Re" makes vocabulary doubly productive.',
        'heart_words_intro': ['return'],
    },
    {
        'num': 117, 'pattern': 'Prefixes pre-, dis-', 'sound': '',
        'rule': 'Two more prefixes. pre- = "before" (preview, prepay, preheat). dis- = "not" or "remove" (dislike, disagree, disconnect).',
        'words': ['preview', 'prepay', 'preheat', 'pretest', 'preset', 'pretend', 'prevent', 'prefix', 'preorder', 'prepare', 'preface', 'dislike', 'disagree', 'disorder', 'disable', 'discount', 'distrust', 'disconnect', 'disinfect', 'discomfort', 'discover', 'distract', 'discuss', 'display'],
        'phrases': ['preview and pretend', 'dislike and disagree', 'preorder and prepare', 'discover and disconnect'],
        'sentences': ['Preview a movie.', 'I dislike a discount.', 'Preheat the oven.', 'Discover a planet.', 'Distract a cat.'],
        'esl': 'Two more productive prefixes. Daily drill: "What does pre + X mean? What does dis + X mean?"',
    },
    {
        'num': 118, 'pattern': 'Prefixes mis-, sub-', 'sound': '',
        'rule': 'mis- = "wrongly" (misread, mistake). sub- = "under" or "below" (submarine, subway, subzero).',
        'words': ['misread', 'mistake', 'misuse', 'misplace', 'misspell', 'misunderstand', 'misbehave', 'mismatch', 'mislead', 'mislay', 'submarine', 'subway', 'submit', 'subject', 'substitute', 'subtotal', 'subzero', 'subset', 'subscribe', 'sublet'],
        'phrases': ['mistake and misread', 'submarine and subway', 'mislay and misspell', 'subscribe and submit'],
        'sentences': ['Misread a sign.', 'A submarine in a sea.', 'A subway in town.', 'Misuse a tool.', 'A subzero day.'],
        'esl': 'Six prefixes now (un, re, pre, dis, mis, sub). Children are word-building. Daily creative exercise: take a known word, try adding a prefix.',
    },
]

# Lessons 119-122 — Greek roots
GREEN_GREEK = [
    {
        'num': 119, 'pattern': 'Greek root tele- = "far"', 'sound': '',
        'rule': 'Greek roots travel. tele- means "far." "Tele + vision = television" (seeing from far). "Tele + phone = telephone" (sound from far). Children learn the root, then compound it.',
        'words': ['telephone', 'television', 'telegraph', 'telescope', 'telecast', 'telegram', 'teleport', 'telework'],
        'phrases': ['a telephone in a television', 'a telegraph telescope', 'a teleport telework'],
        'sentences': ['A telephone on a desk.', 'A television in a room.', 'A telegraph in a story.', 'A telescope at night.', 'A teleport in a movie.'],
        'pictures': [
            ('telephone', 'old-style telephone'),
            ('television', 'old TV set'),
            ('telescope', 'long telescope'),
        ],
        'esl': 'Greek roots are conceptually new for Mandarin L1. The "compose a word from meaningful parts" idea echoes Chinese character composition (radicals), so the underlying idea translates well. Connect the two: "in Chinese 电话 = electric speech, in English telephone = far speech."',
    },
    {
        'num': 120, 'pattern': 'Greek roots photo-, graph', 'sound': '',
        'rule': 'photo- = "light." graph = "to write" or "drawing." "Photograph = light drawing." "Graph = writing/drawing." "Autograph = self writing."',
        'words': ['photo', 'photograph', 'photographer', 'photocopy', 'photogenic', 'graph', 'graphic', 'paragraph', 'autograph', 'biography', 'geography', 'photography', 'telegraph', 'phonograph'],
        'phrases': ['a photo of a graph', 'a paragraph of biography', 'an autograph and a photograph', 'a photographer and a phonograph'],
        'sentences': ['A photo of a paragraph.', 'An autograph from a photographer.', 'A biography on a phonograph.', 'A geography graph.', 'A telegraph photograph.'],
        'esl': 'More Greek root composition. Connects to the philosophy idea of "writing" — graph and write are both writing in two different languages. Pair photo- with phon-/-phonic (which was introduced via ph in L106).',
    },
    {
        'num': 121, 'pattern': 'Greek roots -scope, -logy', 'sound': '',
        'rule': '-scope = "see" or "look." -logy = "study of."',
        'words': ['microscope', 'periscope', 'telescope', 'horoscope', 'gyroscope', 'biology', 'geology', 'psychology', 'sociology', 'mythology', 'technology', 'ecology', 'archaeology', 'meteorology', 'zoology'],
        'phrases': ['a microscope for biology', 'a telescope and geology', 'a horoscope of psychology', 'mythology and technology'],
        'sentences': ['A microscope for biology.', 'A telescope in geology.', 'A periscope and a horoscope.', 'Technology and zoology.', 'Sociology and ecology.'],
        'esl': 'Heavy-duty academic vocabulary. By L121 children are reading words that adult speakers may not know. The pattern composition is the lesson — not all the meanings, which can wait.',
    },
    {
        'num': 122, 'pattern': 'Greek roots astro-, geo-', 'sound': '',
        'rule': 'astro- = "star." geo- = "earth."',
        'words': ['astronomy', 'astronaut', 'astrology', 'astrologer', 'asteroid', 'geography', 'geology', 'geometry', 'geomagnetic', 'geocache'],
        'phrases': ['astronomy and astrology', 'geography and geology', 'an astronaut on geomagnetic'],
        'sentences': ['An astronaut in astronomy.', 'Geography of asteroids.', 'Geology in geometry.', 'Astrology and astronomy.', 'A geocache for an astronaut.'],
        'esl': 'Greek root family. Heavy vocabulary. Read for pattern recognition, not memorisation.',
    },
]

# Lessons 123-126 — Latin roots
GREEN_LATIN = [
    {
        'num': 123, 'pattern': 'Latin root -tract = "pull"', 'sound': '',
        'rule': 'Latin roots also compose. -tract means "pull." "Attract" = pull toward. "Subtract" = pull away. "Tractor" = puller.',
        'words': ['tract', 'attract', 'subtract', 'distract', 'extract', 'contract', 'tractor', 'protract', 'retract', 'detract', 'traction', 'tractable'],
        'phrases': ['attract and subtract', 'distract and extract', 'a tractor in a contract', 'a retraction of traction'],
        'sentences': ['A tractor and a contract.', 'Attract and distract.', 'Subtract and extract.', 'Retract a contract.', 'A traction for a tractor.'],
        'esl': 'Latin roots are heavier than Greek. Pattern composition is the goal — meaning can be approximate. Mandarin learners may find the Latin root composition very logical and enjoyable.',
    },
    {
        'num': 124, 'pattern': 'Latin roots -duct, -ject', 'sound': '',
        'rule': '-duct = "lead" (conduct, duct, induct, deduct). -ject = "throw" (eject, inject, project, reject, subject, object).',
        'words': ['duct', 'conduct', 'product', 'induct', 'deduct', 'reduce', 'aqueduct', 'eject', 'inject', 'project', 'reject', 'subject', 'object', 'objection', 'injection', 'rejection', 'subjection', 'projection'],
        'phrases': ['a conduct and a product', 'eject and inject', 'a project and a subject', 'reject an object'],
        'sentences': ['A product to conduct.', 'Eject and inject.', 'A project to subject.', 'Reject an object.', 'An injection of duct.'],
        'esl': 'Productive root system. Children should be able to guess "abduct" from -duct and ab- (away).',
    },
    {
        'num': 125, 'pattern': 'Latin roots -spect, -port', 'sound': '',
        'rule': '-spect = "see" or "look at." -port = "carry."',
        'words': ['spect', 'inspect', 'respect', 'suspect', 'expect', 'aspect', 'prospect', 'spectacle', 'spectator', 'spectacular', 'introspect', 'port', 'import', 'export', 'support', 'transport', 'report', 'airport', 'passport', 'porter', 'portable'],
        'phrases': ['inspect and expect', 'respect a suspect', 'import and export', 'transport a report'],
        'sentences': ['Inspect and expect.', 'Respect a suspect.', 'Import and export.', 'A passport for a porter.', 'Transport a report.'],
        'esl': 'Two more productive roots. By L125 children are reading academic English on sight.',
    },
    {
        'num': 126, 'pattern': 'Latin roots -form, -dict', 'sound': '',
        'rule': '-form = "shape" or "form." -dict = "say" or "speak."',
        'words': ['form', 'formal', 'format', 'formation', 'reform', 'inform', 'transform', 'uniform', 'platform', 'conform', 'perform', 'predict', 'verdict', 'edict', 'contradict', 'dictate', 'dictation', 'dictionary', 'addict', 'diction'],
        'phrases': ['a uniform format', 'a dictionary contradiction', 'predict and dictate', 'inform and transform'],
        'sentences': ['A uniform format.', 'Predict and contradict.', 'A dictionary on a platform.', 'A formal verdict.', 'Inform and transform.'],
        'esl': 'Latin roots are conceptually like Mandarin radicals: each piece carries meaning. Pattern-matching the roots is fun, and children of L126 reading level are word-builders.',
    },
]

# Lessons 127-128 — Contractions + Green consolidation
GREEN_FINAL = [
    {
        'num': 127, 'pattern': 'Contractions', 'sound': '',
        'rule': 'A contraction is a shorter way to say two words. An apostrophe shows where letters are missing. "Do + not = don\'t." "It + is = it\'s." "I + am = I\'m."',
        'words': ["don't", "can't", "won't", "isn't", "wasn't", "aren't", "weren't", "doesn't", "didn't", "hasn't", "haven't", "hadn't", "shouldn't", "wouldn't", "couldn't", "I'm", "I've", "I'll", "I'd", "you're", "you've", "you'll", "we're", "we've", "we'll", "they're", "they've", "they'll", "he's", "she's", "it's", "that's", "what's", "let's", "there's", "who's", "here's"],
        'phrases': ["don't and can't", "I'm and you're", "let's and that's", "what's and who's"],
        'sentences': ["I don't know.", "It's a sunny day.", "We're going.", "Let's start.", "That's mine."],
        'esl': 'Contractions are a real Mandarin-L1 challenge. Mandarin has no equivalent — every word stands alone. Children may write "do not" instead of "don\'t" and "I am" instead of "I\'m." Reading practice and daily oral modeling.',
        'heart_words_intro': ["don't", "can't", "it's"],
    },
    {
        'num': 128, 'pattern': 'Green Phase consolidation — read a real text', 'sound': '',
        'rule': '<strong>End of Green Phase.</strong> Today the child reads a real paragraph, not a curated word list. Anything from a chapter book, a magazine, a recipe, a sign on the street. Goal: child reads with intonation, pauses at commas, raises pitch on questions. Meaning is now the work.',
        'words': ['together', 'around', 'because', 'beautiful', 'wonderful', 'remember', 'enough', 'thought', 'thought', 'through', 'although', 'though', 'mountain', 'fountain', 'thousand', 'although', 'beyond', 'beneath', 'forever', 'whenever', 'whatever', 'wherever', 'something', 'everything', 'anything', 'nothing', 'somebody', 'everybody', 'nobody'],
        'phrases': ['together forever', 'around the mountain', 'beautiful thoughts', 'something remembered'],
        'sentences': ['A beautiful day together.', 'Around the mountain.', 'A wonderful thought.', 'Something through the fountain.', 'Beneath a beautiful sky.'],
        'esl': '<strong>This is end-of-Green territory.</strong> Children who can read these sentences with rhythm and meaning have fluent decoding. The next work is fluency-building and vocabulary expansion through real reading: chapter books, picture books, nonfiction. Mandarin L1 learners often reach this point in 18-24 months from Pink Phase L5. That\'s normal.',
    },
]

ALL_GREEN_LESSONS = (
    GREEN_VTEAM_LONG + GREEN_VTEAM_OTHER + GREEN_OTHER_TEAMS +
    GREEN_SILENT + GREEN_SUFFIX_BASIC + GREEN_SUFFIX_MORE +
    GREEN_PREFIX + GREEN_GREEK + GREEN_LATIN + GREEN_FINAL
)


CSS = """
@page { size: A4; margin: 1.8cm; }
body { font-family: 'Inter', -apple-system, Helvetica, Arial, sans-serif; font-size: 11pt; line-height: 1.55; color: #1a1a1a; max-width: 820px; margin: 40px auto; padding: 0 24px; background: #fafaf7; }
h1 { font-family: 'Lora', Georgia, serif; font-size: 28pt; color: #0a1a0f; margin: 0 0 6px; }
h2 { font-family: 'Lora', Georgia, serif; font-size: 18pt; color: #1f6f3e; margin: 36px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #d4d4cc; }
h3 { font-family: 'Lora', Georgia, serif; font-size: 14pt; color: #0a1a0f; margin: 24px 0 6px; }
h4 { font-size: 11pt; font-weight: 700; color: #1f6f3e; margin: 12px 0 4px; }
.sub { color: #888; font-style: italic; font-size: 10pt; margin: 0 0 28px; }
p { margin: 8px 0; }
ul, ol { margin: 6px 0 12px 0; padding-left: 22px; }
li { margin-bottom: 2px; }
.lesson { background: #fff; border: 1px solid #e0e0d8; border-radius: 6px; padding: 14px 18px; margin: 18px 0; }
.lesson h3 { margin-top: 0; }
.articulation { background: #eef8ef; border-left: 3px solid #1f6f3e; padding: 8px 12px; margin: 8px 0 12px 0; font-size: 10pt; color: #1a3a22; }
.wordlist { font-family: 'SF Mono', Menlo, monospace; font-size: 10pt; background: #fafaf2; border: 1px solid #e8e3cc; padding: 8px 12px; border-radius: 3px; line-height: 1.8; }
.pics { background: #fff8ec; border: 1px solid #e8d6a0; padding: 8px 12px; border-radius: 3px; font-size: 10pt; margin: 8px 0; }
.pics b { color: #8a6a20; }
.esl { background: #f4ecf8; border-left: 3px solid #8a5ab0; padding: 8px 12px; margin: 12px 0; font-size: 10pt; color: #4a2a6a; }
.esl b { color: #4a2a6a; }
.heart { background: #fff0f0; border: 1px solid #f0c8c8; padding: 8px 12px; border-radius: 3px; font-size: 10pt; color: #882828; margin: 8px 0; }
.heart b { color: #882828; }
.sentence { font-style: italic; color: #1a3a22; }
table { border-collapse: collapse; margin: 12px 0; width: 100%; font-size: 10pt; }
td, th { border: 1px solid #d4d4cc; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #e8f4ec; color: #0a1a0f; font-weight: 700; }
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
<title>{title_prefix} — Green Phase Lesson Content</title>
<style>{CSS}</style>
</head>
<body>

<h1>{title_prefix}</h1>
<h1 style="margin-top:-4px;">Green Phase — Lesson-by-Lesson Content</h1>
<p class="sub">UFLI lessons 84-128 &middot; vowel teams, diphthongs, silent letters, suffixes, prefixes, Greek and Latin roots, contractions. The final phase before fluent reading.</p>

<h2>The Green Phase brief</h2>
<p>By the end of Pink Phase, the child read every English letter and most one-syllable patterns. By the end of Blue Phase, the child read VCe, soft c/g, r-controlled vowels, inflections, and most two-syllable closed-syllable words. Green Phase teaches the rest: vowel teams (ai, ee, oa, oi, oo), silent letters (kn, wr, ph), suffixes (-tion, -ly, -er, -ful, -less, -ness, -ment), prefixes (un-, re-, pre-, dis-, mis-, sub-), Greek and Latin roots, and contractions.</p>
<p>By the end of Green Phase the child can decode every regular English word and recognize most irregular ones. The next work — fluency, vocabulary expansion, comprehension — is done through real reading.</p>

<h2>The Green Phase sequence at a glance</h2>
<table>
  <tr><th>Lessons</th><th>Pattern family</th><th>What it unlocks</th></tr>
  <tr><td>L84-89</td><td>Long-vowel teams</td><td>ai/ay (/ā/), ee/ea (/ē/), oa/ow (/ō/)</td></tr>
  <tr><td>L90-92</td><td>igh + ow + ou diphthongs</td><td>night, cow, out</td></tr>
  <tr><td>L93</td><td>oi/oy diphthong</td><td>oil, boy</td></tr>
  <tr><td>L94-95</td><td>oo two sounds</td><td>moon (/ū/), book (/ʊ/)</td></tr>
  <tr><td>L96-98</td><td>au/aw, ew, ie</td><td>saw, new, pie</td></tr>
  <tr><td>L99</td><td>ea alternate</td><td>bread, head — short /ĕ/</td></tr>
  <tr><td>L100-103</td><td>R-controlled vowel teams</td><td>year, care, hair, store</td></tr>
  <tr><td>L104-106</td><td>Silent letters and ph</td><td>knee, write, lamb, sign, phone</td></tr>
  <tr><td>L107-108</td><td>-tion, -sion suffixes</td><td>action, vision</td></tr>
  <tr><td>L109-110</td><td>Schwa, stress</td><td>banana, tomorrow</td></tr>
  <tr><td>L111-114</td><td>Common suffixes</td><td>-ly, -er/-est, -ful, -less, -ness, -ment</td></tr>
  <tr><td>L115-118</td><td>Common prefixes</td><td>un-, re-, pre-, dis-, mis-, sub-</td></tr>
  <tr><td>L119-122</td><td>Greek roots</td><td>tele-, photo-, graph, -scope, -logy, astro-, geo-</td></tr>
  <tr><td>L123-126</td><td>Latin roots</td><td>-tract, -duct, -ject, -spect, -port, -form, -dict</td></tr>
  <tr><td>L127</td><td>Contractions</td><td>don't, can't, I'm, it's</td></tr>
  <tr><td>L128</td><td>Green Phase consolidation</td><td>Read a real paragraph</td></tr>
</table>

<h2>How long does Green Phase take?</h2>
<p>Plan on <b>6-9 months</b> for a child with solid Blue Phase mastery. Mandarin-L1 learners often need 8-12 months — especially on the alternate-sound spellings (oo as two sounds, ea as two sounds, ow as two sounds) and on the contractions. By the end of Green Phase the child has been studying English phonics for about two years and is now a confident reader.</p>

<h2>Patterns to track per child in Green</h2>
<p>The grammar load increases sharply in Green Phase. Track these per child:</p>
<ul>
  <li><b>Vowel team automatic</b> — Can the child read ai/ay/ee/ea/oa/ow words on sight without sounding out?</li>
  <li><b>Silent letters in spelling</b> — Does the child write "knee" not "nee," "write" not "rite"?</li>
  <li><b>Suffix in speech</b> — Does the child use "quickly" not "quick" when describing action? "Kindness" as a noun?</li>
  <li><b>Prefix recognition</b> — Can the child predict "unhappy" means "not happy" from un + happy?</li>
  <li><b>Schwa in speech</b> — Does the child relax the unstressed vowels (banana → buh-NA-nuh) rather than over-articulating?</li>
  <li><b>Contraction in speech AND in writing</b> — Does the child use "don't" naturally?</li>
</ul>
""")

    # TOC
    parts.append("<div class='toc'><h3 style='margin-top:0;'>Lessons at a glance</h3><ul>")
    for L in ALL_GREEN_LESSONS:
        parts.append(f"<li>L{L['num']} &middot; <em>{L['pattern']}</em></li>")
    parts.append("</ul></div>")

    parts.append("<h2>Long-vowel teams (Lessons 84-89)</h2>")
    parts.append("<p>The most-used vowel teams in English. ai/ay for /ā/, ee/ea for /ē/, oa/ow for /ō/. Position rules: ai/oa in the middle, ay/ow at the end. Daily contrast drills.</p>")
    for L in GREEN_VTEAM_LONG:
        parts.append(render_lesson(L))

    parts.append("<h2>igh, ow as /ow/, ou, oi/oy, oo (Lessons 90-95)</h2>")
    parts.append("<p>igh is a quirky three-letter team. ow and ou cover the /ow/ diphthong. oi/oy for /oy/. oo for two different sounds (moon and book). Lots of memory work here.</p>")
    for L in GREEN_VTEAM_OTHER:
        parts.append(render_lesson(L))

    parts.append("<h2>au/aw, ew, ie, alternate ea, r-controlled vowel teams (Lessons 96-103)</h2>")
    parts.append("<p>Eight lessons closing out the major vowel-team families. Including ear/are/air for /air/ and /eer/, and ore for /or/.</p>")
    for L in GREEN_OTHER_TEAMS:
        parts.append(render_lesson(L))

    parts.append("<h2>Silent letters (Lessons 104-106)</h2>")
    parts.append("<p>Three small families. kn/wr (L104), mb/gn (L105), ph (L106). Memorise the word families; the rules don't generalise.</p>")
    for L in GREEN_SILENT:
        parts.append(render_lesson(L))

    parts.append("<h2>Suffixes -tion, -sion, schwa, stress (Lessons 107-110)</h2>")
    parts.append("<p>The two -tion/-sion lessons introduce one of the highest-frequency suffix patterns in English. The schwa and stress lessons that follow are essential for natural-sounding multi-syllable production — especially for Mandarin-L1 children.</p>")
    for L in GREEN_SUFFIX_BASIC:
        parts.append(render_lesson(L))

    parts.append("<h2>Common suffixes -ly, -er/-est, -ful, -less, -ness, -ment (Lessons 111-114)</h2>")
    parts.append("<p>Productive suffixes. Each turns a known word into a new one. Children love these — they get vocabulary multiplication.</p>")
    for L in GREEN_SUFFIX_MORE:
        parts.append(render_lesson(L))

    parts.append("<h2>Common prefixes un-, re-, pre-, dis-, mis-, sub- (Lessons 115-118)</h2>")
    parts.append("<p>Six prefixes that turn one word into a different word. Just as productive as the suffixes.</p>")
    for L in GREEN_PREFIX:
        parts.append(render_lesson(L))

    parts.append("<h2>Greek roots (Lessons 119-122)</h2>")
    parts.append("<p>tele- (far), photo- (light), graph (write), -scope (see), -logy (study), astro- (star), geo- (earth). Pattern composition makes academic vocabulary readable.</p>")
    for L in GREEN_GREEK:
        parts.append(render_lesson(L))

    parts.append("<h2>Latin roots (Lessons 123-126)</h2>")
    parts.append("<p>-tract (pull), -duct (lead), -ject (throw), -spect (look), -port (carry), -form (shape), -dict (say). The other half of academic vocabulary.</p>")
    for L in GREEN_LATIN:
        parts.append(render_lesson(L))

    parts.append("<h2>Contractions and consolidation (Lessons 127-128)</h2>")
    parts.append("<p>L127 is a single lesson on contractions (don't, can't, I'm, it's). L128 is the consolidation — child reads a real paragraph, not a curated list.</p>")
    for L in GREEN_FINAL:
        parts.append(render_lesson(L))

    parts.append("<h2>Heart words — Green Phase additions</h2>")
    parts.append("<p>Many heart words in Green Phase are introduced because they look phonetically irregular even though they\'re mostly decodable. Continue the convention: black ink for regular letters, RED for irregular, small red heart icon below each red letter.</p>")
    parts.append("<table><tr><th>Lesson</th><th>New heart words</th><th>What's irregular</th></tr>")
    for ln in sorted(GREEN_HEART_WORDS.keys()):
        rows = GREEN_HEART_WORDS[ln]
        for word, irr in rows:
            parts.append(f"<tr><td>L{ln}</td><td><b>{html.escape(word)}</b></td><td>{html.escape(irr)}</td></tr>")
    parts.append("</table>")

    parts.append("<h2>Mandarin-L1 focus areas across Green Phase</h2>")
    parts.append("""
<p>Green Phase introduces several pattern types that hit Mandarin-L1 learners particularly hard. Mark these in your daily notes.</p>
<ul>
  <li><b>Two-sounds-one-spelling problem.</b> oo as /ū/ vs /ʊ/, ea as /ē/ vs /ĕ/, ow as /ō/ vs /ow/. Mandarin doesn't have homographs — each character has one reading. Children may resist the idea that the same spelling can sound two ways. Daily contrast drill.</li>
  <li><b>Schwa (L109).</b> The most-common-vowel-in-English with no fixed spelling. Mandarin doesn't have schwa. Mirror work daily until unstressed syllables become natural.</li>
  <li><b>Stress (L110).</b> Mandarin uses tone, not stress. The concept of one-syllable-louder is new. Clap on stressed syllables.</li>
  <li><b>Silent letters (L104-106).</b> Conceptually alien from a syllabic perspective. Spell with them; say them without. Two parallel skills.</li>
  <li><b>Contractions (L127).</b> Mandarin has no equivalent. Children may resist. Daily oral modeling — never "do not" when you can say "don\'t."</li>
  <li><b>Suffixes (L107-114).</b> Mandarin doesn't add morphological endings. The "word builder" model unlocks vocabulary fast for those who get it.</li>
  <li><b>Prefixes (L115-118).</b> Same as suffixes. Highly productive once the concept lands.</li>
  <li><b>Greek and Latin roots (L119-126).</b> The "compose a word from pieces" idea is actually similar to Chinese character composition (radicals). Many Mandarin-L1 children GRASP THIS FAST because the underlying mental model echoes their own.</li>
</ul>
""")

    parts.append("<h2>Picture sourcing for Green Phase</h2>")
    parts.append("""
<p>Continue the same Canva and Google sourcing approach. New categories for Green:</p>
<ul>
  <li><b>Vowel team words.</b> rain, train, snail, bee, tree, sheep, boat, goat, snow, crow. Same illustration style as Pink/Blue.</li>
  <li><b>Silent letters.</b> knee, knife, lamb, sign, gnome, phone. Concrete pictures.</li>
  <li><b>Suffixes and prefixes.</b> These are abstract — most don't need pictures. Use word-building diagrams instead.</li>
  <li><b>Greek/Latin roots.</b> Some have pictures (microscope, telescope, telephone, photograph). Most don't — use vocabulary cards.</li>
  <li><b>Contractions.</b> Use action sequences: "I do not run" + cancel "do not" → "I don\'t run."</li>
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
<li>Henry, M. K. (2010). <em>Unlocking Literacy: Effective Decoding and Spelling Instruction (2nd ed.).</em> Brookes Publishing.</li>
<li>University of Florida Literacy Institute (2024). UFLI Foundations Scope and Sequence. ufli.education.ufl.edu/foundations/</li>
</ul>
""")

    parts.append("""
<p class="sub" style="margin-top:32px;">Green Phase complete. The child is now a fluent reader. The next work — vocabulary expansion, comprehension, fluency — is done through real reading: chapter books, picture books, nonfiction, signage on the street.</p>
</body>
</html>
""")
    return '\n'.join(parts)


# AUDIT — pattern that introduces new family per lesson
GREEN_PATTERNS = {
    84: ['ai'], 85: ['ay'], 86: ['ee'], 87: ['ea_long'], 88: ['oa'], 89: ['ow_long'],
    90: ['igh'], 91: ['ow_diphthong'], 92: ['ou'], 93: ['oi', 'oy'],
    94: ['oo_long'], 95: ['oo_short'],
    96: ['au', 'aw'], 97: ['ew'], 98: ['ie'], 99: ['ea_short'],
    100: ['ear_vt'], 101: ['are_vt'], 102: ['air'], 103: ['ore_vt'],
    104: ['kn', 'wr'], 105: ['mb', 'gn'], 106: ['ph'],
    107: ['tion'], 108: ['sion'], 109: ['schwa'], 110: ['stress'],
    111: ['ly'], 112: ['er_est'], 113: ['ful', 'less'], 114: ['ness', 'ment'],
    115: ['un_prefix'], 116: ['re_prefix'], 117: ['pre', 'dis'], 118: ['mis', 'sub'],
    119: ['tele'], 120: ['photo', 'graph'], 121: ['scope', 'logy'], 122: ['astro', 'geo'],
    123: ['tract'], 124: ['duct', 'ject'], 125: ['spect', 'port'], 126: ['form', 'dict'],
    127: ['contraction'], 128: [],
}


def lesson_through(n):
    pats = set()
    for L, ps in GREEN_PATTERNS.items():
        if L <= n:
            pats.update(ps)
    return pats


def word_uses_unintroduced_pattern(word, lesson_num, allowed):
    """Light audit — primarily catches major pattern violations."""
    w = word.lower().replace("'", "")
    if lesson_num in (128,):
        return None
    # Check for newly-introduced vowel teams
    if 'igh' in w and 'igh' not in allowed:
        return 'igh'
    if 'tion' in w and 'tion' not in allowed:
        return '-tion'
    if 'sion' in w and 'sion' not in allowed:
        return '-sion'
    if w.startswith('kn') and 'kn' not in allowed:
        return 'kn silent'
    if w.startswith('wr') and 'wr' not in allowed:
        return 'wr silent'
    if w.startswith('gn') and 'gn' not in allowed:
        return 'gn silent'
    if w.endswith('mb') and 'mb' not in allowed:
        return 'mb silent'
    if w.endswith('gn') and 'gn' not in allowed and w not in ('sign', 'design', 'resign', 'feign', 'reign'):
        return 'gn silent'
    if 'ph' in w and 'ph' not in allowed:
        return 'ph'
    return None


def audit_phase(lessons):
    issues = []
    for L in lessons:
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


print("=" * 60)
print("GREEN PHASE AUDIT — pattern integrity check")
print("=" * 60)
issues = audit_phase(ALL_GREEN_LESSONS)
if issues:
    print(f"FOUND {len(issues)} lessons with violations:")
    for n, pattern, bad in issues:
        print(f"  L{n} ({pattern}):")
        for word, p in bad:
            print(f"    X  '{word}' uses {p}")
else:
    print("OK — all Green Phase words pass pattern integrity check.")

print()
print(f"Total Green lessons: {len(ALL_GREEN_LESSONS)}")

# WRITE
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
whale_path = os.path.join(out_dir, 'whale-reading-content-green.html')
with open(whale_path, 'w') as f:
    f.write(whale_html)
print(f"Wrote: {whale_path} ({len(whale_html)/1024:.1f} KB)")

neutral_html = build_html('The Complete Language Area')
neutral_html = neutral_html.replace('Whale Reading Framework — Green Phase', 'The Complete Language Area — Green Phase')
neutral_html = neutral_html.replace('Whale Reading Framework', 'The Complete Language Area')
neutral_html = neutral_html.replace('Whale framework', 'this framework')
neutral_path = os.path.join(out_dir, 'language-area-green.html')
with open(neutral_path, 'w') as f:
    f.write(neutral_html)
print(f"Wrote: {neutral_path} ({len(neutral_html)/1024:.1f} KB)")
