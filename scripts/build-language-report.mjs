import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, PageNumber, Header, Footer } from 'docx';
import { writeFileSync } from 'fs';

const OUTPUT = '/sessions/pensive-ecstatic-clarke/mnt/whale/Whale_Class_April_Language_Summary.docx';

const children = [
  {
    name: 'Amy',
    summary: `Amy had her first real month working independently with the phonics materials. I've been presenting the Sandpaper Letters consistently, and by mid-month she was selecting them without prompting — that shift from teacher-directed to self-initiated is what I was watching for. I introduced Object to Letter Sound Matching in the second half of the month; she's matching well for the vowels but is still building confidence with the less familiar consonants. I added Bingo Phonics Review as an auditory supplement and introduced Metal Insets, though she's not yet working with those independently. What I've noticed is that her phonemic awareness is actually ahead of her formal letter knowledge — she can isolate beginning sounds in most CVC words during I Spy games. My main concern is that she tends to rush through the Sandpaper Letters without pausing to say the sound, so I'm redirecting her to slow down and connect the tracing to the phoneme. My plan for May is to consolidate the vowels and the consonants b, m, s, t, p, n before introducing anything new, work toward Object Box 1 once her initial sounds are reliable, and make Metal Insets a twice-weekly expectation.`,
  },
  {
    name: 'Austin',
    summary: `Austin is well past the Pink Series and Moveable Alphabet — his April focus has been at the writing end of the continuum. I've been observing him in Sand Tray Writing, Chalkboard Writing, and Paper Work, and the quality of his chalkboard letter formation has genuinely improved this month; his letterforms are more consistent in size and spacing than they were in March. I introduced Digraph Practice and made a start with the Green Series — these are early exposures and he's beginning to hear the phonogram patterns, but he's not yet encoding them reliably. One thing that's stood out to me this month: when Austin works with the Moveable Alphabet he often chooses his own words rather than working from a given list. That kind of self-directed encoding tells me the phonics knowledge is genuinely his rather than procedural. I do need to watch his paper work — he occasionally reverts to capitals mid-word, and this is the stage where that habit sets if I don't redirect it consistently. Going forward I want to introduce Green Series Object Box work systematically, consolidate the digraphs through Moveable Alphabet encoding, and get him onto lined paper for Chalkboard Writing.`,
  },
  {
    name: 'Eric',
    summary: `Eric's central language work in April has been the Moveable Alphabet. He's mastered the Sandpaper Letters and the full chalkboard progression, so I've been moving him into CVC word building, and he's making solid progress. I also introduced CVC Rhyming Word Sort this month, which is working well — he has good rhyme awareness. Name Writing is consolidating. What I've noticed about Eric's encoding is that it's very deliberate — he selects letters slowly and with obvious thought. He's processing the sound-to-symbol correspondence rather than pattern-matching from memory, which is exactly what I want to see at this stage. My main watch point is accuracy under pressure — he occasionally places vowels incorrectly when he's working quickly, so I'm keeping Moveable Alphabet sessions short and focused rather than letting them run long. My next steps for Eric are Pink Series Sentence Strips once his CVC word building is consistently accurate, and then beginning to build toward Blue Series Object Box 1, alongside daily Name Writing.`,
  },
  {
    name: 'Hayden',
    summary: `I have to be honest — Hayden's language work was very poorly documented in April. His seven photos this month were all from other curriculum areas: Table Scrubbing, Maths Paperwork, Hammering Push Pins, Constructive Triangles, Toothpick Transfer. Not one language work was captured. I cannot give an accurate language picture for Hayden this month because I don't have the observational record to support it. What I can say is that I need to be much more intentional about photographing and recording his language work in May so we have something concrete to work from. I will carry out a direct one-to-one observation with Hayden at the start of May to establish exactly where he is in the language sequence and update his records accordingly. His May report will reflect that.`,
  },
  {
    name: 'Henry',
    summary: `Henry is in the early stages of phonics and April was a month of steady groundwork. I've been working with him consistently on the Sandpaper Letters — he's making progress but the letter-to-sound connection is not yet automatic across the board. I introduced Sand Tray Writing alongside to reinforce motor memory, and added Bingo Phonics Review because he engages well with its game format. I also introduced Sound Games and Popsicle Letter Sorting toward the end of the month. The thing I want to flag is that Henry knows his letter names reliably but the sounds are still developing — I need to strengthen sound-first knowledge before I introduce any word-building work. He needs to hear the sound before he sees the letter, not the other way around. I'm also watching a tendency to avoid the Sandpaper Letters in favour of other materials — I'm keeping presentations short and warm to build familiarity rather than letting avoidance become a habit. My plan is daily Sandpaper Letter practice on vowels and the key consonants m, s, t, p, n, b, with I Spy games throughout the day as reinforcement.`,
  },
  {
    name: 'Jimmy',
    summary: `Jimmy had a really strong April in language. He's well past Pink and Blue Series, and his Moveable Alphabet work is established, so I've been working with him at the phonogram level — Green Series, Bingo Phonics Review, Primary Phonics Reader, and Phonogram Introduction were his core works this month. I also introduced Root Words and Word Origins and made a start with Green Command Cards, which is where grammar-adjacent thinking begins. I introduced a decodable CVC/short vowel reader and he engaged with it seriously. What I've observed is that Jimmy is encoding phonograms in the Moveable Alphabet with real confidence — he's not sounding out laboriously, he's treating the patterns as whole units, which is exactly where Green Series is supposed to take you. One area I'm watching: Puzzle Words are presented but not yet consolidating. Those irregular words need brief, regular revisiting alongside the phonogram work or they'll continue to be a gap as his reading becomes more fluent. Going forward I want to deepen his Green Series work through systematic Object Box practice and continue the Primary Phonics Reader, with an eye toward beginning the grammar introduction when phonogram consolidation is solid.`,
  },
  {
    name: 'Joey',
    summary: `The most notable thing about Joey's April wasn't a specific material — it was a shift in attitude. He's mastered Sandpaper Letters and the Pink Series, so I moved his focus this month to written output: Sand Tray Writing, Chalkboard Writing, Name Writing, and Rhyming Activities. I also introduced the Moveable Alphabet and Metal Insets. What I've started seeing is Joey initiating his own Chalkboard Writing sessions — choosing to sit down and write without being directed toward it. For a child who hasn't always found language work easy, that change in ownership matters. My main concern right now is letterform formation — specifically the letters e and a, which he's forming from the wrong starting point. This is the moment to address that before the habit becomes automatic, so I'm doing periodic close observation of his Chalkboard Writing specifically for formation. Next steps are consolidating CVC word building through the Moveable Alphabet and introducing Pink Series Sentence Strips once his word building is accurate.`,
  },
  {
    name: 'Kayla',
    summary: `Kayla has been working steadily on the foundational language materials through April. The Sandpaper Letters are her anchor — she returns to them with genuine interest and her vowel knowledge is developing well. I introduced Object Boxes for initial sound matching, which she's working through with teacher support, and added Sandpaper Letter Rubbings as a fine motor complement. I also presented Labelling the Environment and Phonogram Introduction — I want to flag these are preview exposures at this stage, not works she's actively doing independently. What I find encouraging about Kayla is her relationship with the Sandpaper Letters — she lingers on the texture rather than rushing through the tracing, which tells me she's genuinely absorbing the kinaesthetic component the material is designed to give her. My main watch point is a tendency to want to move on to new letters before the ones already introduced are solid. I'm holding the line on that — confident unprompted recall before the next letter, every time. For May I want to ensure all vowels are secure before extending to new consonants and move Object Box 1 toward independence.`,
  },
  {
    name: 'Kevin',
    summary: `Kevin is at the top of the primary language sequence. He's working through the final works in the parts-of-speech series — this month I had him on Introduction to the Preposition and Conjunction, both currently practicing. He's now been formally introduced to all nine parts of speech. What strikes me about Kevin's engagement with the grammar work is that it's genuinely intellectual — he asks questions about why words function as they do rather than simply completing the material and moving on. That's the disposition the grammar sequence is designed to cultivate and it's good to see it. My concern going forward is keeping him sufficiently challenged — with so much mastered, there's a real risk of the language work beginning to feel like finished territory, and I don't want him losing curiosity. I'm planning to introduce the Interjection to complete the parts-of-speech sequence, then begin Sentence Analysis formally, and I want to introduce some kind of structured expository or persuasive writing as a creative challenge alongside the grammar work.`,
  },
  {
    name: 'Leo',
    summary: `April was a milestone month for Leo — I introduced Silent Reading for the first time, which is a significant moment in the primary reading journey. His active language works have been Command Cards (Action Reading) and Interpretive Reading, both developing well. What I've been observing in his Interpretive Reading is that he's making inferences rather than simply decoding — he's reading for meaning now, not phonics. That shift is what I was waiting for. One thing I need to address is Paper Work — it's listed as practicing but his engagement with it has been inconsistent this month. Writing needs to keep pace with reading or we'll end up with encoding skills lagging behind decoding fluency, and I don't want that imbalance. My plan for May is to build Silent Reading stamina gradually through short self-selected sessions, continue Interpretive Reading for comprehension depth, and introduce Introduction to the Noun as the first step in the grammar sequence.`,
  },
  {
    name: 'Lucky',
    summary: `Lucky has been working at the grammar command level through April. Her most active works were the Logical Adjective Game and Detective Adjective Game — sophisticated materials that require both grammatical understanding and real analytical thinking under time pressure. I introduced the Logical Adverb Game toward the end of the month as her next challenge. What I've been struck by this month is the independence with which she approaches the grammar materials — she sets up, works, and clears away without any teacher involvement. That's both a reflection of how deeply she understands the work and of the quality of her Montessori work habits generally. I'm keeping Bingo Phonics Review and Primary Phonics Reader in the mix as regular reading fluency maintenance — I don't want her encoding skills to slide while the analytical grammar work advances. Going forward I want to continue the adjective and adverb games toward command, progress further in Sentence Analysis, and I'm thinking about introducing some form of early research or independent writing as a meaningful creative extension.`,
  },
  {
    name: 'MaoMao',
    summary: `I have to be transparent — MaoMao had very limited documented language work in April. Only three photos for the whole month, and neither gives me a clear language picture. The system records show Moveable Alphabet and Command Cards as practicing, and Command Cards (Action Reading) and Handwriting on Paper as presented — but with that little documentation I can't speak to those with confidence. My main action point for May is deliberate, consistent documentation of MaoMao's language work during the work cycle. I need a clearer picture of where she actually is before I can plan the next steps well. I'll carry out a direct observation at the start of May to confirm her Sandpaper Letter knowledge and establish Object to Picture Matching and Sound Games as reliable reference points.`,
  },
  {
    name: 'MingXi',
    summary: `MingXi had a strong April at the phonogram consolidation level. She's well through the reading sequence — Blue Series mastered, all command card work done — so I've been working with her on phonogram depth: Secret Messages, Phonogram Box, and Object to Letter Sound Matching were her most active works, and I introduced Digraph Practice this month. What I've noticed is that Secret Messages genuinely engage her — she approaches them with visible anticipation and care, which tells me the phonogram work feels meaningful rather than mechanical. She's doing real encoding work. I want to flag one thing: Object to Letter Sound Matching is listed as practicing despite her advanced reading level, and I want to confirm whether that's intentional consolidation revisiting — which would be appropriate — or whether there's a specific encoding gap I need to address directly. My plan for May is to consolidate Phonogram Box work systematically across all major phonograms, continue Secret Messages, introduce Story Sequencing Cards, and begin the grammar introduction with Introduction to the Noun.`,
  },
  {
    name: 'Molly',
    summary: `Molly's April in language was built around the pre-reading and vocabulary foundation. I've had her working on Metal Insets, Farm Matching, and Classified Cards — building hand strength and vocabulary at the same time. Toward the end of the month I introduced Pink Series (CVC Words), which is a genuinely exciting next step for her. Introduction to the Noun also appeared in her records as presented — I want to flag this is almost certainly a preview exposure and not an active independent work at this stage. What I find encouraging is her engagement with Classified Cards — she makes careful distinctions between images and asks questions about the items pictured. That vocabulary curiosity and listening attention is going to serve her well as reading begins. My main concern is Metal Insets — her engagement with them has been inconsistent this month, and at her stage that material is one of the most important investments I can make for her writing readiness. I need it to become a regular, expected part of her week. My plan is to establish Metal Insets as a minimum twice-weekly practice, formally begin Pink Series Object Box 1 with a full teacher presentation, and hold Introduction to the Noun as a future work until reading is underway.`,
  },
  {
    name: 'Rachel',
    summary: `Rachel had a steady April working across the writing and reading continuum. She has a strong foundation in place — Moveable Alphabet, Handwriting, Dictation, Copywork, Punctuation are all established — and this month I've had her on Bingo Phonics Review, Paper Work, CVC Word-Picture Matching, and Pink Series reading. I introduced Blue Series Blends toward the end of the month. Her written output has real quality — consistent letter sizing, care in Paper Work — and that reflects the Handwriting and Copywork foundation she's built; these are habits that have genuinely become her own. One thing I'm watching: Pink Series is still listed as practicing despite Moveable Alphabet being mastered, which tells me her encoding may be running slightly ahead of her decoding at this stage. I need to make sure the Pink Series Object Boxes and reading works are getting regular attention alongside the writing practice, not just the writing end of the continuum. My plan is to move her firmly into Blue Series Blends through both Object Boxes and Moveable Alphabet encoding, with Bingo Phonics Review focused specifically on blend patterns.`,
  },
  {
    name: 'Ryan',
    summary: `Ryan's language picture in April is genuinely hard to read, and I want to be upfront about that. His photos show engagement across a very wide developmental spread — Chalkboard Writing, Grammar Boxes, Alphabet Letter Sequencing, Story Sequencing Cards, and Silent Reading all appear this month, while Sandpaper Letters is also listed as actively practicing. Grammar Boxes and Silent Reading are advanced works; Sandpaper Letters is foundational. I suspect the progress records may be reflecting a longer enrolment period rather than his current working level, but I can't say that with confidence from the documentation alone. My action point for May is a direct one-to-one observation with Ryan to establish exactly where he is right now. Once I have that, I can plan accurately. If Grammar Boxes are confirmed as his genuine current working level, I'll focus on systematic consolidation of each box and maintain Chalkboard Writing as a daily practice.`,
  },
  {
    name: 'Segina',
    summary: `Segina had a consistent April across the early literacy works. I've had her on Name Writing, Metal Insets, Bingo Phonics Review, Farm Animal Matching, and Classified Cards — a solid early foundation — and I introduced Sound Games and My Dictionary toward the end of the month. The thing I want to highlight is her Name Writing — it has genuinely progressed this month. Her letter sizing is more controlled and she's completing her name without prompting. For a child at this stage, that kind of independence milestone matters and it reflects real ownership developing. My main concern is Metal Insets. They need to be more regular — Segina's grip and fine motor control would benefit significantly from consistent work with that material throughout the week, and at her stage it's one of the most important things I can invest time in for her writing readiness. For May I want to consolidate Name Writing toward confident independent production, establish Metal Insets as a twice-weekly minimum, formally introduce Object to Letter Sound Matching, and reinforce initial sound awareness through daily I Spy before we begin the Sandpaper Letters.`,
  },
  {
    name: 'Stella',
    summary: `Stella has completed the full primary Montessori language sequence. Her records show mastery across the entire progression — from Sandpaper Letters through the complete reading sequence, all grammar works through Sentence Analysis, and the full writing continuum including Verb Tense Work, Spelling Rules, Compound Words, Prefixes and Suffixes, Synonyms and Antonyms, Root Words and Word Origins. This month I've had her on Storytelling and Sequencing, Paper Work, and Poems and Songs — enrichment and oral language work rather than new curriculum. What I want to flag to you is that Stella's language development is genuinely exceptional, and I don't think the primary curriculum can serve her well for much longer. She's moved through the sequence with real understanding, not rote completion, and her oral expression reflects the depth of her reading and writing foundation. I think we need a conversation about what her language education looks like next — advanced independent writing with a real audience or purpose, structured reading comprehension beyond the primary materials, possibly early research skills. The next stage will need to be individually designed for her, and I'd welcome your guidance on how to approach that with the family.`,
  },
  {
    name: 'Yo-yo',
    summary: `Yo-yo had an active April in language. With Sandpaper Letters and Sand Tray Writing now mastered, I've been moving her forward — I introduced Chalkboard Writing, Object Boxes, and Phonetic Object Box for the first time this month, alongside Name Writing Practice Cards. Bingo Phonics Review has been her current phonics anchor. What I want to flag is that her Sandpaper Letter mastery is genuinely solid — she knows the sounds reliably and her tracing is confident and deliberate. That foundation is in place and she's ready to apply it into Object Box work. The thing I'm watching carefully is Chalkboard Writing, which is very new — this is the stage where formation habits become entrenched, and I want to catch any grip or starting-point issues early before they become automatic. I'll be doing close observation of her Chalkboard Writing over the next few weeks. My plan for May is to consolidate initial sound knowledge through Object Box 1 and establish Chalkboard Writing as a regular practice.`,
  },
  {
    name: 'YueZe',
    summary: `YueZe had a solid April at the advanced reading level. She's mastered through Green Series, Reading Analysis, and Reading Classification, and this month I've had her on Command Cards (Action Reading) and Interpretive Reading — both developing well. I introduced Silent Reading this month, and several CVC review works also appear in her records as presented. What I've been observing in her Interpretive Reading is genuine comprehension — she's processing meaning rather than decoding word by word, and that shift is visible in how she approaches the material. She's reading now, not decoding. One thing I want to check: the CVC review works I've recorded as presented appear to be well below her working level, and I want to confirm whether those were intentional consolidation exercises or data entries that don't accurately reflect where she is. My plan for May is to build her Silent Reading stamina through short self-selected sessions, deepen Interpretive Reading fluency, and introduce Introduction to the Noun as the first step in the grammar sequence.`,
  },
];

const GREEN = '2D6A4F';
const GREY = '595959';

const docChildren = [
  new Paragraph({
    spacing: { before: 0, after: 80 },
    children: [new TextRun({ text: 'Whale Class', font: 'Arial', size: 48, bold: true, color: GREEN })],
  }),
  new Paragraph({
    spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: 'April 2026 — Language & English Summary', font: 'Arial', size: 26, color: GREY })],
  }),
  new Paragraph({
    spacing: { before: 0, after: 40 },
    children: [new TextRun({ text: 'Teacher reference · Internal use only', font: 'Arial', size: 20, italics: true, color: 'AAAAAA' })],
  }),
  new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GREEN, space: 1 } },
    spacing: { before: 80, after: 400 },
    children: [],
  }),
];

for (const child of children) {
  docChildren.push(
    new Paragraph({
      spacing: { before: 300, after: 100 },
      children: [new TextRun({ text: child.name, font: 'Arial', size: 30, bold: true, color: GREEN })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 300 },
      children: [new TextRun({ text: child.summary, font: 'Arial', size: 22, color: '222222' })],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E0E0E0', space: 1 } },
      spacing: { before: 0, after: 0 },
      children: [],
    }),
  );
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1152, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'DDDDDD', space: 1 } },
          spacing: { before: 0, after: 120 },
          children: [new TextRun({ text: 'Whale Class  ·  April 2026  ·  Language Summary', font: 'Arial', size: 18, color: 'AAAAAA' })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'DDDDDD', space: 1 } },
          spacing: { before: 120, after: 0 },
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: 'Page ', font: 'Arial', size: 18, color: 'AAAAAA' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: 'AAAAAA' }),
            new TextRun({ text: ' of ', font: 'Arial', size: 18, color: 'AAAAAA' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: 'AAAAAA' }),
          ],
        })],
      }),
    },
    children: docChildren,
  }],
});

Packer.toBuffer(doc).then(buf => {
  writeFileSync(OUTPUT, buf);
  console.log('Done:', OUTPUT);
});
