#!/usr/bin/env python3
"""
Add missing Language works to complete the Montessori 3-6 curriculum.
Also fix category oddities:
  - Move "Secret Messages" from orphan "Total Reading" category into Reading
  - Move "Definition Stages" from Reading into Word Study

New works added:
  Oral Language: Syllable Work
  Reading: Phonogram Box, Story Sequencing Cards, Digraph Practice
  Grammar: Function of Words, Sentence Building, Sentence Diagramming, Verb Tense Work
  Word Study: Root Words and Word Origins, Poetry Analysis

Total new: 10 works
"""
import json, os, copy

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEM_FILE = os.path.join(BASE, 'lib/montree/stem/language.json')
GUIDE_FILE = os.path.join(BASE, 'lib/curriculum/comprehensive-guides/language-guides.json')

# Load files
with open(STEM_FILE) as f:
    stem = json.load(f)
with open(GUIDE_FILE) as f:
    guides = json.load(f)

def find_cat(name):
    for cat in stem['categories']:
        if cat['name'] == name:
            return cat
    return None

def max_seq(cat):
    return max(w['sequence'] for w in cat['works']) if cat['works'] else 0

def add_stem(cat_name, work):
    cat = find_cat(cat_name)
    if not cat:
        raise ValueError(f'Category {cat_name} not found')
    # Check for duplicate
    for w in cat['works']:
        if w['id'] == work['id']:
            print(f'  SKIP (exists): {work["id"]}')
            return
    cat['works'].append(work)
    print(f'  + stem: {work["id"]} -> {cat_name} seq={work["sequence"]}')

def add_guide(guide):
    for g in guides['works']:
        if g['work_id'] == guide['work_id']:
            print(f'  SKIP guide (exists): {guide["work_id"]}')
            return
    guides['works'].append(guide)
    print(f'  + guide: {guide["work_id"]}')

def mk(id, name, desc, age, prereqs, seq, materials, direct, indirect, control, cn, levels):
    return {
        'id': id, 'name': name, 'description': desc,
        'ageRange': age, 'prerequisites': prereqs, 'sequence': seq,
        'materials': materials, 'directAims': direct, 'indirectAims': indirect,
        'controlOfError': control, 'chineseName': cn, 'levels': levels
    }

def mkguide(wid, name, cat, qg, steps, parent, why):
    return {
        'work_id': wid, 'name': name, 'category': cat,
        'quick_guide': qg, 'presentation_steps': steps,
        'parent_description': parent, 'why_it_matters': why
    }

L = lambda lvl, name, desc, vids: {'level': lvl, 'name': name, 'description': desc, 'videoSearchTerms': vids}


# ============================================================
# STEP 1: FIX CATEGORY ODDITIES
# ============================================================

print("=== FIXING CATEGORY ODDITIES ===")

# 1a. Move "Secret Messages" from "Total Reading" into Reading category
reading_cat = find_cat('Reading')
total_reading_cat = find_cat('Total Reading')
if total_reading_cat:
    for w in total_reading_cat['works']:
        # Give it seq 15 (after existing max of 14)
        w['sequence'] = max_seq(reading_cat) + 1
        reading_cat['works'].append(w)
        print(f'  Moved {w["id"]} from Total Reading -> Reading seq={w["sequence"]}')
    stem['categories'].remove(total_reading_cat)
    print('  Removed empty "Total Reading" category')

# 1b. Move "Definition Stages" from Reading to Word Study
word_study_cat = find_cat('Word Study')
for w in reading_cat['works'][:]:
    if w['id'] == 'la_definition_stages':
        reading_cat['works'].remove(w)
        w['sequence'] = max_seq(word_study_cat) + 1
        word_study_cat['works'].append(w)
        print(f'  Moved la_definition_stages from Reading -> Word Study seq={w["sequence"]}')
        # Also update guide category
        for g in guides['works']:
            if g['work_id'] == 'la_definition_stages':
                g['category'] = 'Word Study'
                print(f'  Updated guide category for la_definition_stages')
        break

# ============================================================
# STEP 2: ADD NEW STEMS
# ============================================================

print("\n=== ADDING NEW STEMS ===")

# --- Oral Language: Syllable Work (seq 9) ---
add_stem('Oral Language Development', mk(
    'la_syllable_work', 'Syllable Work',
    'Clapping, counting, and breaking words into syllables for phonological awareness',
    'primary_year1', ['la_sound_games'], 9,
    ['Word cards', 'Clapping sticks', 'Syllable sorting mats', 'Objects of varying syllable length'],
    ['Syllable segmentation', 'Syllable counting', 'Syllable blending'],
    ['Phonological awareness', 'Reading preparation', 'Spelling readiness'],
    'Incorrect number of syllables identified',
    '蒙特梭利音节练习',
    [
        L(1, 'Clapping Syllables', 'Clap out syllables in familiar words', ['montessori syllable clapping']),
        L(2, 'Sorting by Syllable Count', 'Sort objects by 1, 2, 3+ syllables', ['montessori syllable sorting']),
        L(3, 'Syllable Blending', 'Hear separated syllables and blend into word', ['montessori syllable blending']),
        L(4, 'Syllable Deletion', 'Remove a syllable — what word is left?', ['phonological awareness syllable deletion']),
    ]
))

# --- Reading: Phonogram Box (seq after Secret Messages) ---
r_next = max_seq(reading_cat) + 1
add_stem('Reading', mk(
    'la_phonogram_box', 'Phonogram Box',
    'Systematic isolation and practice of phonogram sounds using object and picture sorting',
    'primary_year2', ['la_phonogram_intro'], r_next,
    ['Phonogram box with compartments', 'Small objects for each phonogram', 'Phonogram cards', 'Picture cards'],
    ['Phonogram recognition', 'Sound-symbol correspondence', 'Phonogram reading fluency'],
    ['Spelling', 'Advanced reading'],
    'Object does not match the phonogram sound',
    '蒙特梭利语音盒',
    [
        L(1, 'Single Phonogram Sorting', 'Sort objects by one phonogram at a time', ['montessori phonogram box']),
        L(2, 'Multiple Phonogram Sorting', 'Sort across 3-4 phonograms simultaneously', ['montessori phonogram sorting']),
        L(3, 'Phonogram Reading Cards', 'Read words featuring target phonograms', ['montessori phonogram reading cards']),
        L(4, 'Phonogram Dictation', 'Write words with phonograms from dictation', ['montessori phonogram dictation']),
    ]
))


# --- Reading: Digraph Practice ---
r_next = max_seq(reading_cat) + 1
add_stem('Reading', mk(
    'la_digraph_practice', 'Digraph Practice',
    'Focused practice on consonant digraphs (sh, ch, th, wh, ck, ng) as distinct reading units',
    'primary_year1', ['la_blue_series'], r_next,
    ['Digraph cards', 'Picture cards for each digraph', 'Digraph booklets', 'Small objects'],
    ['Digraph recognition', 'Digraph-sound association', 'Reading words with digraphs'],
    ['Fluent reading', 'Spelling with digraphs'],
    'Word does not contain the target digraph',
    '蒙特梭利双字母组合练习',
    [
        L(1, 'Introduce sh and ch', 'Learn the sounds sh and ch with objects', ['montessori digraph sh ch']),
        L(2, 'Introduce th and wh', 'Learn the sounds th and wh', ['montessori digraph th wh']),
        L(3, 'Introduce ck and ng', 'Learn the sounds ck and ng', ['montessori digraph ck ng']),
        L(4, 'Digraph Reading Lists', 'Read word lists with mixed digraphs', ['montessori digraph reading']),
        L(5, 'Digraph Sentences', 'Read sentences rich in digraphs', ['montessori digraph sentences reading']),
    ]
))

# --- Reading: Story Sequencing Cards ---
r_next = max_seq(reading_cat) + 1
add_stem('Reading', mk(
    'la_story_sequencing_cards', 'Story Sequencing Cards',
    'Ordering picture and text cards to retell a story in the correct sequence',
    'primary_year2', ['la_reading_analysis'], r_next,
    ['Sequencing card sets (3-6 cards per story)', 'Story text strips', 'Control cards'],
    ['Reading comprehension', 'Logical sequencing', 'Story structure understanding'],
    ['Critical thinking', 'Narrative skills', 'Written composition'],
    'Control card shows correct sequence',
    '蒙特梭利故事排序卡',
    [
        L(1, 'Three-Card Sequences', 'Order 3 picture cards into beginning-middle-end', ['montessori story sequencing cards']),
        L(2, 'Four to Six Card Sequences', 'Order longer picture sequences', ['montessori sequencing cards reading']),
        L(3, 'Text Strip Sequencing', 'Order sentence strips to rebuild a story', ['montessori sentence sequencing reading']),
    ]
))

# --- Grammar: Function of Words (seq 19, after existing max 18) ---
g_next = max_seq(find_cat('Grammar')) + 1
add_stem('Grammar', mk(
    'la_function_of_words', 'Function of Words',
    'Introductory lesson showing that words have different jobs in a sentence using grammar symbols',
    'primary_year1', ['la_noun_intro'], g_next,
    ['Grammar symbol cards (large triangle, small triangle, circle, etc.)', 'Prepared sentence strips', 'Grammar symbol stamps'],
    ['Understanding that words serve different functions', 'Introduction to grammar symbols', 'Sentence awareness'],
    ['Abstract thinking', 'Preparation for detailed grammar study'],
    'Symbols placed incorrectly above words',
    '蒙特梭利词语功能',
    [
        L(1, 'Noun and Verb Discovery', 'Show that sentences need naming words and action words', ['montessori function of words']),
        L(2, 'Adding Descriptors', 'Show how adjectives change the noun', ['montessori grammar symbols introduction']),
        L(3, 'Expanding Sentences', 'Add articles, prepositions to build longer sentences', ['montessori grammar symbols sentence building']),
    ]
))


# --- Grammar: Sentence Building ---
g_next = max_seq(find_cat('Grammar')) + 1
add_stem('Grammar', mk(
    'la_sentence_building', 'Sentence Building',
    'Structured progression from single words to complete sentences using word cards',
    'primary_year2', ['la_function_of_words'], g_next,
    ['Word cards (colour-coded by part of speech)', 'Sentence strips', 'Punctuation cards'],
    ['Sentence construction', 'Word order awareness', 'Punctuation in context'],
    ['Written composition', 'Grammar internalisation'],
    'Sentence does not make sense when read aloud',
    '蒙特梭利造句练习',
    [
        L(1, 'Two-Word Sentences', 'Build subject + verb sentences', ['montessori sentence building']),
        L(2, 'Adding Adjectives', 'Expand with describing words', ['montessori sentence building adjectives']),
        L(3, 'Adding Prepositions', 'Include location and direction', ['montessori sentence building prepositions']),
        L(4, 'Complete Sentences', 'Build full sentences with capitals and periods', ['montessori sentence building complete']),
        L(5, 'Sentence Transformation', 'Change statements to questions and commands', ['montessori sentence types']),
    ]
))

# --- Grammar: Sentence Diagramming ---
g_next = max_seq(find_cat('Grammar')) + 1
add_stem('Grammar', mk(
    'la_sentence_diagramming', 'Sentence Diagramming',
    'Visual representation of sentence structure showing relationships between parts of speech',
    'primary_year3', ['la_sentence_analysis', 'la_sentence_building'], g_next,
    ['Sentence strips', 'Diagramming arrows/lines', 'Grammar symbols', 'Large working mat'],
    ['Visual analysis of sentence structure', 'Understanding grammatical relationships', 'Subject-predicate identification'],
    ['Advanced composition', 'Logical thinking', 'Abstract grammar understanding'],
    'Diagram does not match sentence structure',
    '蒙特梭利句子图解',
    [
        L(1, 'Subject and Predicate', 'Divide sentence into who/what and what happened', ['montessori sentence diagramming subject predicate']),
        L(2, 'Direct Object', 'Identify what receives the action', ['montessori sentence diagramming object']),
        L(3, 'Modifiers', 'Show how adjectives and adverbs connect', ['montessori sentence diagramming modifiers']),
        L(4, 'Compound Sentences', 'Diagram sentences joined by conjunctions', ['montessori compound sentence diagram']),
    ]
))

# --- Grammar: Verb Tense Work ---
g_next = max_seq(find_cat('Grammar')) + 1
add_stem('Grammar', mk(
    'la_verb_tense', 'Verb Tense Work',
    'Exploring past, present, and future verb tenses through conjugation cards and sentence transformation',
    'primary_year2', ['la_verb_intro'], g_next,
    ['Verb tense cards (colour-coded: red for present, blue for past, green for future)',
     'Conjugation charts', 'Sentence transformation strips', 'Verb tense timeline'],
    ['Tense recognition', 'Verb conjugation', 'Temporal language use'],
    ['Written expression', 'Reading comprehension', 'Historical narrative understanding'],
    'Verb form does not match the tense indicated',
    '蒙特梭利动词时态',
    [
        L(1, 'Present Tense', 'Identify and use present tense verbs', ['montessori verb tense present']),
        L(2, 'Past Tense', 'Change present to past tense', ['montessori verb tense past']),
        L(3, 'Future Tense', 'Express future actions', ['montessori verb tense future']),
        L(4, 'Tense Sorting', 'Sort sentences by tense', ['montessori verb tense sorting']),
        L(5, 'Conjugation Charts', 'Complete conjugation charts for common verbs', ['montessori verb conjugation chart']),
    ]
))


# --- Word Study: Root Words and Word Origins ---
ws_next = max_seq(find_cat('Word Study')) + 1
add_stem('Word Study', mk(
    'la_root_words', 'Root Words and Word Origins',
    'Exploring root words, word families, and how words are built from common roots',
    'primary_year3', ['la_word_families', 'la_prefixes_suffixes'], ws_next,
    ['Root word cards', 'Word family trees (poster/mat)', 'Etymology cards', 'Word building strips'],
    ['Root word identification', 'Understanding word derivation', 'Vocabulary expansion through roots'],
    ['Spelling', 'Reading comprehension', 'Foreign language readiness'],
    'Derived word does not share the root',
    '蒙特梭利词根学习',
    [
        L(1, 'Common Roots', 'Identify root in word families (e.g., play → player, playful, replay)', ['montessori root words']),
        L(2, 'Latin and Greek Roots', 'Explore common Latin/Greek roots (aqua, terra, port)', ['montessori word origins latin greek']),
        L(3, 'Word Building from Roots', 'Build new words from root + prefix + suffix', ['montessori word building roots']),
        L(4, 'Word Origin Stories', 'Discover where interesting words come from', ['montessori etymology word origins']),
    ]
))

# --- Word Study: Poetry Analysis ---
ws_next = max_seq(find_cat('Word Study')) + 1
add_stem('Word Study', mk(
    'la_poetry_analysis', 'Poetry Analysis',
    'Analysing poems for rhyme, rhythm, imagery, and meaning',
    'primary_year3', ['la_reading_analysis'], ws_next,
    ['Poetry cards', 'Coloured pencils for marking rhyme and rhythm', 'Poetry anthology', 'Analysis worksheets'],
    ['Rhyme scheme identification', 'Rhythm and metre awareness', 'Figurative language recognition'],
    ['Literary appreciation', 'Creative writing', 'Cultural knowledge'],
    'Analysis does not match the poem structure',
    '蒙特梭利诗歌分析',
    [
        L(1, 'Rhyme Identification', 'Mark rhyming words with coloured pencils', ['montessori poetry rhyme analysis']),
        L(2, 'Rhythm and Beat', 'Clap or march the rhythm of a poem', ['montessori poetry rhythm']),
        L(3, 'Imagery and Meaning', 'Discuss what the poet is describing', ['montessori poetry comprehension']),
        L(4, 'Comparing Poems', 'Compare two poems on the same theme', ['montessori poetry comparison']),
    ]
))


# ============================================================
# STEP 3: ADD NEW GUIDES
# ============================================================

print("\n=== ADDING NEW GUIDES ===")

# --- Syllable Work ---
add_guide(mkguide('la_syllable_work', 'Syllable Work', 'Oral Language Development',
    '• Gather familiar objects or picture cards with 1, 2, and 3+ syllable names\n• Begin with clapping: say the word slowly while clapping each syllable\n• Use sorting mats labelled 1, 2, 3+ for objects\n• Progress from clapping to tapping, stomping, or using rhythm sticks\n• Once confident, introduce syllable blending and deletion games',
    [
        'Invite the child: "Let\'s listen to the parts inside words."',
        'Choose a familiar word (e.g., "cat"). Say it while clapping once. "Cat — one clap, one part."',
        'Choose a two-syllable word (e.g., "apple"). Clap twice: "ap-ple — two claps, two parts."',
        'Choose a three-syllable word (e.g., "banana"). Clap three times: "ba-na-na — three parts."',
        'Invite the child to try with their own name.',
        'Introduce sorting mats: place objects under 1, 2, or 3+ columns.',
        'Let the child sort independently, clapping each word to check.',
        'For blending: say "rab...bit" slowly. Ask "What word is that?"',
        'For deletion: "Say butterfly. Now say it without butter." (fly)',
    ],
    'This activity trains your child\'s ear to hear the natural rhythm inside words. When children clap out syllables, they\'re breaking words into manageable chunks — a crucial skill for both reading and spelling later on. You can practise anywhere: clap the syllables in food names at the grocery store, or tap out the beats in family members\' names at dinner.',
    'Syllable awareness is one of the earliest phonological skills to develop and forms the bridge between oral language and reading. Children who can segment words into syllables find it much easier to decode longer words when they begin reading, and to spell them when writing. This work also builds the rhythmic awareness that supports poetry and music appreciation.'
))

# --- Phonogram Box ---
add_guide(mkguide('la_phonogram_box', 'Phonogram Box', 'Reading',
    '• Use a compartmentalised box with phonogram labels (ai, ee, oa, sh, etc.)\n• Place small objects or pictures in the correct compartment by sound\n• Start with 3-4 phonograms the child already knows from the Green Series\n• Gradually add new phonograms as mastery develops\n• Follow with phonogram reading cards and dictation',
    [
        'Place the phonogram box on the mat. Show 3-4 phonogram labels.',
        'Review each phonogram sound: "This says /ai/ as in rain."',
        'Present a small object (e.g., a toy train). "Train — I hear /ai/. It goes here."',
        'Place the object in the "ai" compartment.',
        'Offer the child another object. Let them identify the phonogram and sort.',
        'Continue with 8-10 objects across the selected phonograms.',
        'When confident, add phonogram reading cards: child reads words and sorts.',
        'For dictation: say a word, child identifies the phonogram and writes it.',
    ],
    'The Phonogram Box gives your child hands-on practice with the tricky letter combinations in English — like "sh," "ai," or "oo." By sorting real objects by their sounds, your child builds a strong connection between what they hear and what they see on the page. This makes reading and spelling multi-syllable words much more manageable.',
    'English has over 70 phonograms (letter combinations that make a single sound), and mastering them is essential for fluent reading. The Phonogram Box provides systematic, self-correcting practice that turns abstract sound patterns into concrete, sortable categories. Children who work extensively with phonograms transition from decoding to fluent reading more quickly.'
))

# --- Digraph Practice ---
add_guide(mkguide('la_digraph_practice', 'Digraph Practice', 'Reading',
    '• Introduce one digraph at a time (sh, ch, th, wh, ck, ng)\n• Use objects and pictures: "ship starts with sh"\n• Create digraph booklets — child reads and illustrates words\n• Progress from initial position to final position (fish, much, math)\n• Use digraph-rich sentences for fluency practice',
    [
        'Present two letters side by side: "s" and "h." "When these two letters sit together, they make one sound: /sh/."',
        'Show objects: ship, shell, shoe. "Hear /sh/ at the start?"',
        'Lay out picture cards. Child sorts: "Does this word have /sh/?"',
        'Introduce the digraph in final position: fish, dish, push.',
        'Child reads a word list of sh-words.',
        'Repeat the process for ch, th, wh, ck, ng on subsequent days.',
        'When multiple digraphs are known, do mixed sorting activities.',
        'Child reads digraph-rich sentences for fluency practice.',
    ],
    'Digraphs are pairs of letters that team up to make one sound — like "sh" in "shoe" or "ch" in "chair." Your child learns that sometimes two letters work together instead of each making its own sound. This is a key step between simple phonetic reading and being able to tackle more complex words confidently.',
    'Digraphs represent one of the first "exceptions" children encounter after learning basic phonics. Understanding that two letters can represent a single sound is a conceptual leap that opens the door to reading hundreds of common English words. Systematic digraph practice prevents the confusion that arises when children try to sound out each letter individually.'
))


# --- Story Sequencing Cards ---
add_guide(mkguide('la_story_sequencing_cards', 'Story Sequencing Cards', 'Reading',
    '• Prepare sets of 3-6 picture cards that tell a simple story\n• Mix the cards and invite the child to put them in order\n• Begin with 3-card sets (beginning, middle, end)\n• Progress to longer sequences and then text-strip sequencing\n• Control card allows self-correction',
    [
        'Place a mixed set of 3 picture cards on the mat.',
        '"These pictures tell a story, but they\'re all mixed up. Can you put them in order?"',
        'Let the child arrange them. Ask: "Can you tell me the story?"',
        'Show the control card. Child self-corrects if needed.',
        'Progress to 4-card, then 5-6 card sequences.',
        'Introduce text strips: child reads sentences and orders them.',
        'For advanced work: child writes their own story, cuts it into strips, and gives to a friend to sequence.',
    ],
    'Story sequencing cards help your child understand that stories have a beginning, middle, and end — and that events happen in a logical order. This builds reading comprehension skills because your child must understand what\'s happening in each picture and figure out the cause-and-effect chain. It\'s also wonderful preparation for their own writing.',
    'Sequencing is a fundamental cognitive skill that underpins reading comprehension, mathematical reasoning, and scientific thinking. Children who can sequence events accurately demonstrate stronger recall, better prediction skills, and more coherent narrative writing. This work bridges the gap between reading individual sentences and understanding connected text.'
))

# --- Function of Words ---
add_guide(mkguide('la_function_of_words', 'Function of Words', 'Grammar',
    '• This is the essential first grammar lesson — before studying individual parts of speech in depth\n• Use a simple sentence: "The big dog runs fast"\n• Show how removing different words changes or breaks the sentence\n• Introduce grammar symbols: large red circle (verb), black triangle (noun), etc.\n• Children discover that each word has a job to do',
    [
        'Write a sentence on a strip: "The big dog runs fast."',
        'Read it together. "Every word in this sentence has a job."',
        'Cover "dog." Read: "The big __ runs fast." "Something is missing — we need a naming word!"',
        'Cover "runs." Read: "The big dog __ fast." "Now we don\'t know what happens!"',
        'Cover "big." Read: "The dog runs fast." "It still works, but we lost the description."',
        'Introduce the grammar symbols: "Naming words get a black triangle. Action words get a red circle."',
        'Place symbols above each word in the sentence.',
        'Give the child a new sentence strip to label with symbols independently.',
        'Over time, introduce all the grammar symbols through this discovery approach.',
    ],
    'Before your child studies nouns, verbs, and adjectives individually, this lesson shows them the big picture: every word in a sentence has a job. By removing words and seeing what breaks, your child discovers for themselves why we need different types of words. The colourful grammar symbols (triangles, circles) make this abstract concept visual and concrete.',
    'Function of Words is the foundational grammar lesson in Montessori — it provides the conceptual framework that makes all subsequent grammar study meaningful. Rather than memorising definitions, children discover through experimentation that language has structure. This inquiry-based approach leads to deeper understanding and genuine interest in grammar, rather than the resistance many children develop toward rote grammar instruction.'
))

# --- Sentence Building ---
add_guide(mkguide('la_sentence_building', 'Sentence Building', 'Grammar',
    '• Use colour-coded word cards matching grammar symbol colours\n• Begin with two-card sentences: noun + verb ("Dogs run")\n• Expand by adding articles, adjectives, adverbs, prepositions\n• Include punctuation cards (period, question mark, exclamation mark)\n• Progress to transforming sentence types (statement → question → command)',
    [
        'Lay out a noun card and a verb card: "Dogs" + "run." Read together.',
        'Add an article: "The" + "dogs" + "run." "Does that sound more complete?"',
        'Add an adjective: "The" + "big" + "dogs" + "run." "Now we can picture them!"',
        'Add an adverb: "The" + "big" + "dogs" + "run" + "quickly."',
        'Add a prepositional phrase: + "in" + "the" + "park."',
        'Show punctuation card: place a period at the end.',
        'Read the complete sentence together.',
        'Now transform: "Do the big dogs run quickly in the park?" — change to question mark.',
        'Child builds their own sentences from a selection of word cards.',
    ],
    'Sentence Building takes the grammar symbols your child already knows and puts them to work. Starting with just two words and growing into full sentences, your child physically constructs language — choosing each word, placing it in order, and seeing how the sentence expands. It\'s like building with blocks, but with words.',
    'This work bridges the gap between grammar knowledge and written expression. Children who physically construct sentences develop an intuitive feel for word order, sentence rhythm, and the interplay between parts of speech. It directly prepares them for independent writing by making sentence structure tangible before they must produce it entirely from memory.'
))


# --- Sentence Diagramming ---
add_guide(mkguide('la_sentence_diagramming', 'Sentence Diagramming', 'Grammar',
    '• Use large working mat with sentence strips and moveable arrows/lines\n• Begin with simple subject-predicate division\n• Show the subject (who/what) on the left, predicate (what happened) on the right\n• Gradually add direct objects, then modifiers\n• Grammar symbols reinforce the visual analysis',
    [
        'Write a simple sentence: "Birds fly." Place on the mat.',
        'Draw a vertical line between subject and predicate. "Who? Birds. What do they do? Fly."',
        'Try: "The little birds fly south." Draw the dividing line.',
        'Show how "little" connects to "birds" with a slanted line below.',
        'Show how "south" connects to "fly" with a slanted line below.',
        'Introduce direct objects: "The cat chased the mouse." Draw horizontal line for "mouse."',
        'Let the child diagram a sentence independently.',
        'For compound sentences: show how a conjunction bridges two diagrams.',
    ],
    'Sentence diagramming is like making a map of a sentence. Your child draws lines and branches to show which words belong together and how they relate. It makes the invisible structure of language visible — and children often find it surprisingly satisfying, like solving a puzzle. This visual approach helps them write more clearly because they can "see" how sentences are built.',
    'Diagramming develops analytical thinking and metalinguistic awareness — the ability to think about language itself. Children who can diagram sentences demonstrate stronger reading comprehension (because they can parse complex sentences) and more varied writing (because they understand how to construct different sentence types intentionally). It is a classic Montessori grammar material that bridges concrete manipulation and abstract thinking.'
))

# --- Verb Tense Work ---
add_guide(mkguide('la_verb_tense', 'Verb Tense Work', 'Grammar',
    '• Introduce with a timeline visual: past (behind us), present (now), future (ahead)\n• Use colour-coded cards: red = present, blue = past, green = future\n• Begin with regular verbs: walk → walked → will walk\n• Sort sentences by tense\n• Progress to conjugation charts for common verbs',
    [
        'Show a simple timeline on the mat: PAST — NOW — FUTURE.',
        'Place a verb card: "walk." "This is happening now — present tense."',
        'Change to "walked." "This already happened — past tense." Place under PAST.',
        'Change to "will walk." "This hasn\'t happened yet — future." Place under FUTURE.',
        'Give the child verb cards to sort: run/ran/will run, jump/jumped/will jump.',
        'Introduce sentence strips: "I play." "I played." "I will play." Child sorts by tense.',
        'Show a conjugation chart: I walk, you walk, he walks. Note the changes.',
        'Child fills in blank conjugation charts for new verbs.',
        'Introduce irregular verbs: go/went/will go, eat/ate/will eat.',
    ],
    'Verb tenses tell us when things happen — past, present, or future. Your child learns to hear and see the difference between "I walk" (now), "I walked" (before), and "I will walk" (later). Using colour-coded cards and a timeline makes this abstract concept concrete. This is directly useful in everyday conversation and is essential for reading comprehension.',
    'Understanding verb tense is fundamental to both reading comprehension and written expression. Children who grasp tense can follow narratives across time, understand cause-and-effect in stories, and write with temporal clarity. The Montessori approach — using physical cards, colour coding, and conjugation charts — makes an abstract grammatical concept tangible and self-correcting, following the pattern established by Montessori\'s original verb conjugation materials described in The Montessori Elementary Material.'
))

# --- Root Words and Word Origins ---
add_guide(mkguide('la_root_words', 'Root Words and Word Origins', 'Word Study',
    '• Begin with familiar word families: play → player, playful, replay, playground\n• Show the root word and how prefixes/suffixes grow from it\n• Use word family tree posters where the root is the trunk\n• Introduce common Latin and Greek roots: aqua (water), terra (earth), port (carry)\n• Children discover that knowing one root unlocks many words',
    [
        'Write "play" on a card. "This is our root word — the basic word everything grows from."',
        'Add prefix/suffix cards: "re-" + "play" = replay. "play" + "-er" = player.',
        'Build a word tree: root at the trunk, derived words on branches.',
        'Introduce a Latin root: "aqua means water." Show: aquarium, aquatic, aqueduct.',
        'Child draws word trees for new roots.',
        'Introduce Greek roots: "tele means far." Show: telephone, telescope, television.',
        'Give the child an unfamiliar word with a known root. Can they guess the meaning?',
        'Children create a personal "Root Word Dictionary" in their journals.',
    ],
    'Root words are like secret codes that unlock the meaning of thousands of words. When your child learns that "aqua" means water, suddenly aquarium, aquatic, and aqueduct all make sense. This work transforms vocabulary building from memorisation into detective work — your child can figure out new words by recognising familiar roots inside them.',
    'Knowledge of root words is one of the strongest predictors of vocabulary size and reading comprehension. Research shows that a relatively small number of Latin and Greek roots generate thousands of English words. Children who learn to identify roots develop morphological awareness — the ability to see the internal structure of words — which accelerates both vocabulary acquisition and spelling ability throughout their education.'
))


# --- Poetry Analysis ---
add_guide(mkguide('la_poetry_analysis', 'Poetry Analysis', 'Word Study',
    '• Begin with short, rhythmic poems children can feel and hear\n• Mark rhyming words with coloured pencils (same colour = same rhyme)\n• Clap or march the rhythm — feel the beat pattern\n• Discuss imagery: "What picture does the poet paint in your mind?"\n• Compare two poems on the same subject',
    [
        'Read a short poem aloud with expression. Read it again.',
        'Give the child a printed copy and coloured pencils.',
        '"Can you find words that sound the same at the end?" Mark rhyming pairs with matching colours.',
        'Read aloud again while clapping the rhythm. "Do you feel a pattern?"',
        'Ask: "What is the poet talking about? What pictures do you see in your mind?"',
        'Underline any words the child finds especially interesting or beautiful.',
        'On another day, read a different poem on the same subject.',
        '"How are these two poems the same? How are they different?"',
        'Child may illustrate a poem or write their own inspired by the model.',
    ],
    'Poetry analysis teaches your child to listen deeply to language — to hear the music in words, notice patterns, and visualise what a poet describes. Starting with the simple joy of finding rhymes and clapping rhythms, your child develops an ear for language that enriches both their reading and their own writing. It\'s about appreciating that language can be beautiful, not just functional.',
    'Poetry analysis develops literary appreciation and close reading skills that transfer to all forms of text. Children learn to attend to word choice, sound patterns, and figurative language — skills that deepen reading comprehension across all subjects. The Montessori Elementary Material describes children discovering rhythm and rhyme as a natural progression from their phonological awareness work, connecting oral language skills to literary understanding.'
))

# ============================================================
# STEP 4: SAVE FILES
# ============================================================

print("\n=== SAVING FILES ===")

with open(STEM_FILE, 'w') as f:
    json.dump(stem, f, indent=2, ensure_ascii=False)
print(f'Saved stems to {STEM_FILE}')

with open(GUIDE_FILE, 'w') as f:
    json.dump(guides, f, indent=2, ensure_ascii=False)
print(f'Saved guides to {GUIDE_FILE}')

# ============================================================
# STEP 5: VERIFY
# ============================================================

print("\n=== VERIFICATION ===")

# Reload and verify
with open(STEM_FILE) as f:
    s = json.load(f)
with open(GUIDE_FILE) as f:
    g = json.load(f)

stem_count = sum(len(c['works']) for c in s['categories'])
guide_count = len(g['works'])
print(f'Stem works: {stem_count}')
print(f'Guide entries: {guide_count}')

# Check categories
print(f'Categories: {[c["name"] for c in s["categories"]]}')
for c in s['categories']:
    print(f'  {c["name"]}: {len(c["works"])} works')

# Check no duplicate sequences within categories
errors = 0
for c in s['categories']:
    seqs = [w['sequence'] for w in c['works']]
    if len(seqs) != len(set(seqs)):
        print(f'  ERROR: Duplicate sequences in {c["name"]}: {seqs}')
        errors += 1

# Check no duplicate work IDs
all_ids = []
for c in s['categories']:
    for w in c['works']:
        all_ids.append(w['id'])
if len(all_ids) != len(set(all_ids)):
    print(f'ERROR: Duplicate work IDs found')
    errors += 1

# Check all stems have guides (by name)
stem_names = set()
for c in s['categories']:
    for w in c['works']:
        stem_names.add(w['name'].lower().strip())
guide_names = set(gw['name'].lower().strip() for gw in g['works'])
missing_guides = stem_names - guide_names
if missing_guides:
    print(f'WARNING: {len(missing_guides)} stems without matching guide:')
    for m in sorted(missing_guides):
        print(f'  - {m}')
else:
    print(f'All {len(stem_names)} stem names have matching guides ✅')

# Check "Total Reading" is gone
cat_names = [c['name'] for c in s['categories']]
if 'Total Reading' in cat_names:
    print('ERROR: Total Reading category still exists!')
    errors += 1
else:
    print('Total Reading category removed ✅')

# Check Definition Stages is in Word Study
ws = None
for c in s['categories']:
    if c['name'] == 'Word Study':
        ws = c
for w in ws['works']:
    if w['id'] == 'la_definition_stages':
        print('Definition Stages moved to Word Study ✅')
        break
else:
    print('WARNING: Definition Stages not found in Word Study')

if errors == 0:
    print(f'\n✅ ALL CHECKS PASSED — {stem_count} stems, {guide_count} guides')
else:
    print(f'\n❌ {errors} ERRORS FOUND')
