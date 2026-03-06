const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, WidthType, ShadingType, BorderStyle, HeadingLevel, PageBreak, PageNumber, Footer } = require('docx');
const fs = require('fs');

// Colors
const MONTESSORI_GREEN = "2E7D32";
const LIGHT_GREEN = "E8F5E9";
const TEXT_DARK = "1B1B1B";
const TEXT_LIGHT = "555555";

// Helper to create a border
const border = { style: BorderStyle.SINGLE, size: 6, color: "E0E0E0" };
const borders = { top: border, bottom: border, left: border, right: border };

// Create sections with proper styling
const createHeading1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, bold: true, color: MONTESSORI_GREEN, size: 32 })],
  spacing: { before: 240, after: 120 },
  outlineLevel: 0
});

const createHeading2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, bold: true, color: MONTESSORI_GREEN, size: 28 })],
  spacing: { before: 180, after: 100 },
  outlineLevel: 1
});

const createBodyText = (text, bold = false) => new Paragraph({
  children: [new TextRun({ text, bold, size: 22, color: TEXT_DARK })],
  spacing: { after: 120, line: 360 }
});

const createBodySmall = (text, bold = false) => new Paragraph({
  children: [new TextRun({ text, bold, size: 20, color: TEXT_DARK })],
  spacing: { after: 80, line: 320 }
});

// Create bullet points
const createBullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  children: [new TextRun({ text, size: 22, color: TEXT_DARK })],
  spacing: { after: 80, line: 320 }
});

// Create the document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22, color: TEXT_DARK }
      }
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: MONTESSORI_GREEN },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: MONTESSORI_GREEN },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: "bullet",
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 }
              }
            }
          }
        ]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: {
          width: 12240,
          height: 15840
        },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Page ",
                size: 20,
                color: TEXT_LIGHT
              }),
              new TextRun({
                children: [PageNumber.CURRENT],
                size: 20,
                color: TEXT_LIGHT
              })
            ]
          })
        ]
      })
    },
    children: [
      // Title Page
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1440, after: 240 },
        children: [new TextRun({
          text: "The AMI English Language Progression",
          bold: true,
          size: 48,
          color: MONTESSORI_GREEN
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({
          text: "From Zero to Independent Reading",
          size: 26,
          color: TEXT_LIGHT,
          italics: true
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 1200 },
        children: [new TextRun({
          text: "A Simple Guide to Understanding How Children Learn to Read in the Montessori Method",
          size: 22,
          color: TEXT_LIGHT
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
        children: [new TextRun({
          text: "For Tredoux",
          size: 22,
          color: MONTESSORI_GREEN,
          italics: true
        })]
      }),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 1: THE BIG IDEA
      createHeading1("The Big Idea: Why Montessori Does Everything Backwards (And It Makes Perfect Sense)"),

      createBodyText("If you've ever watched a child in a Montessori classroom, you've probably noticed something strange: the teacher is teaching them to WRITE before they READ. This seems totally backwards. How can a child write if they can't read?"),

      createBodyText("But here's the thing: it's not backwards at all. It's actually the most logical progression that exists. And once you understand why, everything about the Montessori language approach will make sense."),

      createHeading2("Three Big Insights"),

      createBullet("Writing is EXPRESSION. Reading is INTERPRETATION. Expressing comes before interpreting. A child naturally wants to MAKE something (write) before they want to UNDERSTAND something (read)."),

      createBullet("Sounds matter more than letter names. We teach /mmm/ not \"em.\" Because /mmm/ is what the child hears in words. Letter names are abstract and useless for sounding out words."),

      createBullet("The hand follows the brain. Before a child can write, their hand must be ready. But before their hand can be ready, their brain must understand what letters ARE. So we do: sounds → hand prep → writing → reading. In that order."),

      createBodyText("One more thing that makes Montessori work: every material is self-correcting. A child knows immediately if they did it right. No confusion, no frustration, no waiting for the teacher to check their work."),

      createBodyText("Ready? Let's watch a child named Marina grow from not knowing a single letter to reading her first book."),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 2: THE JOURNEY
      createHeading1("The Journey: Marina From Zero to Reader"),

      createBodyText("Marina is 3 years old. She doesn't know any letters. She can't hold a pencil properly. But she can listen. She can talk. And she's curious about the world. This is where we start.", false),

      // Stage 1
      createHeading2("Stage 1: Listening & Speaking (Ages 2.5–3.5)"),

      createBodyText("What Marina does:", true),
      createBullet("She listens. Really listens. To songs, poems, and conversations."),
      createBullet("She learns new words every day. The teacher names everything precisely."),
      createBullet("She plays with language—songs, nursery rhymes, finger plays."),

      createBodyText("What materials she uses:", true),
      createBullet("Her ears. That's it."),

      createBodyText("Why this step exists:", true),
      createBodyText("A child needs a RICH VOCABULARY before she can learn to read or write. She needs to know what words SOUND like. If you ask Marina to spell 'cat' without knowing the word 'cat' exists, she's lost. Reading and writing are not about inventing language. They're about ENCODING and DECODING language she already knows."),

      createBodyText("The classroom is full of language. The teacher talks. Other children talk. Stories are read aloud. Songs are sung. Marina's ears are drinking it all in."),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When Marina is spontaneously using new words, enjoying rhymes, and noticing sounds in words. When she laughs at silly word combinations. When she asks what things are called. She's ready."),

      // Stage 2
      createHeading2("Stage 2: Sound Games & I Spy (Ages 2.5–3.5, runs parallel with Stage 1)"),

      createBodyText("What Marina does:", true),
      createBullet("She plays 'I Spy' games focused on SOUNDS, not letters."),
      createBullet("Teacher: 'I spy something beginning with /mmm/.'"),
      createBullet("Marina guesses: mirror, muffin, milk."),
      createBullet("No letters shown. Just sounds."),

      createBodyText("She learns to isolate sounds within words:", true),
      createBullet("Initial sounds: /sss/ in 'sun'"),
      createBullet("Ending sounds: /t/ in 'cat'"),
      createBullet("Middle sounds: /a/ in 'cat'"),
      createBullet("How to blend sounds: /c/ + /a/ + /t/ = 'cat'"),
      createBullet("How to segment words: 'cat' = /c/ + /a/ + /t/"),

      createBodyText("What materials she uses:", true),
      createBullet("Her ears. Baskets of small objects (a marble, a fork, a button). Pictures in boxes."),

      createBodyText("Why this step exists:", true),
      createBodyText("Before Marina can read the word 'cat,' her brain needs to HEAR what /c/ + /a/ + /t/ SOUNDS like when you push them together. This is called PHONEMIC AWARENESS. Without it, letters are just random squiggles. With it, letters become a code for sounds she already knows."),

      createBodyText("Marina doesn't need to see the letter 'c' yet. She just needs to know that /c/ is a sound that shows up in certain words."),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When she can play I Spy confidently, find initial sounds easily, and can blend 2-3 sounds together into a word. When she's noticing sounds without prompting. She's ready for the tactile experience."),

      // Stage 3
      createHeading2("Stage 3: Metal Insets (Ages 3+, parallel with sound games)"),

      createBodyText("What Marina does:", true),
      createBullet("She traces geometric shapes inside metal frames using a colored pencil."),
      createBullet("She stays inside the lines. She learns what LIGHTNESS OF TOUCH feels like."),
      createBullet("She draws straight lines, curves, circles, wavy lines."),

      createBodyText("What materials she uses:", true),
      createBullet("Ten metal frames with shapes inside. Colored pencils. Paper. Concentration."),

      createBodyText("Why this step exists:", true),
      createBodyText("You cannot write letters without the hand muscles, finger control, and lightness of touch that metal insets teach. Every stroke in every letter is made of curves and straight lines. Every stroke in a metal inset is practice for the strokes in letters."),

      createBodyText("But here's the SECRET: metal insets are NOT about letter formation. They're about HAND PREPARATION. Marina doesn't know what letters are yet. She's just playing with shapes. But her hand is getting exactly the practice it needs."),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When she can trace all ten frames confidently, stay inside the lines most of the time, and her hand is visibly steadier and lighter. When she's asking for more. She's ready to learn what letters are."),

      // Stage 4
      createHeading2("Stage 4: Sandpaper Letters (Ages 3–3.5)"),

      createBodyText("What Marina does:", true),
      createBullet("She feels a ROUGH sandpaper letter while the teacher says the SOUND."),
      createBullet("Teacher traces the letter with two fingers: 'This is /mmm/.'"),
      createBullet("Marina traces it with two fingers, saying /mmm/ out loud."),
      createBullet("She traces it again. And again. Tactile + auditory + sight all at once."),

      createBodyText("What materials she uses:", true),
      createBullet("Sandpaper letters glued to wooden boards. Grouped in sets of 3–4 contrasting letters (not alphabetical order)."),
      createBullet("Group 1: c, m, a, t (very different shapes and sounds)"),
      createBullet("Group 2: s, r, i, p"),
      createBullet("Group 3: b, f, o, g"),
      createBullet("And so on."),

      createBodyText("Why this step exists:", true),
      createBodyText("Marina is meeting LETTERS for the first time. But not as abstract concepts. She FEELS them (rough), HEARS them (the sound), and SEES them (visually) all at the same time. Three pathways to the brain at once. This is POWERFUL."),

      createBodyText("When her two fingers trace the sandpaper 'm,' the muscle memory of that movement goes into her brain. Later, when she picks up a pencil to WRITE an 'm,' her hand will remember. It will know which way to go, how much pressure to use, when to curve."),

      createBodyText("Notice: we're teaching the SOUND of the letter (/mmm/), not its name ('em'). Because Marina needs to hear the sound when she's trying to decode words later."),

      createBodyText("Notice: the letters aren't in alphabetical order. They're grouped by contrast. If you teach c, m, a, t together, Marina can't confuse c with m. They look totally different. They feel totally different. By the time you introduce letters that look similar (like b and d), Marina is already solid with the others."),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When she can feel a letter, say its sound without the teacher showing her, and when she's asking to learn more. When she's spending time just tracing letters for fun, not because the teacher asked her to. She's ready to BUILD words."),

      // Stage 5
      createHeading2("Stage 5: Moveable Alphabet (Ages 3.5–4) — THE BREAKTHROUGH"),

      createBodyText("What Marina does:", true),
      createBullet("She sees wooden tiles with letters on them."),
      createBullet("Teacher says a word: 'cat.'"),
      createBullet("Marina finds the 'c' tile, the 'a' tile, the 't' tile."),
      createBullet("She arranges them left to right: c-a-t."),
      createBullet("Teacher reads what she built: 'cat.'"),
      createBullet("Marina just READ her own writing. Without ever picking up a pencil."),

      createBodyText("What materials she uses:", true),
      createBullet("The Moveable Alphabet — hundreds of small wooden tiles with letters, organized by sound in a wooden box."),

      createBodyText("Why this step is THE BREAKTHROUGH:", true),
      createBodyText("This is the moment everything changes. Marina has just discovered that letters are a CODE. She can BUILD a word with tiles. The word appears in front of her. She reads it."),

      createBodyText("She's WRITING (encoding). But she's doing it without needing perfect handwriting. Her brain is learning the SEQUENCE of letters in words. Later, her hand will put a pencil to paper and write those sequences. But first, her brain needs to GET IT."),

      createBodyText("The moveable alphabet is genius because:"),
      createBullet("It's FAST. Marina doesn't struggle with pencil control. The letters just slide into place."),
      createBullet("It's OBVIOUS when you make a mistake. The word doesn't sound right. Marina corrects it herself."),
      createBullet("It's DEEP LEARNING. Marina is working with REAL words she already knows how to SAY."),

      createBodyText("From this point on, Marina understands: LETTERS = SOUNDS. SEQUENCES OF LETTERS = WORDS."),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When she can build 5+ CVC words confidently, when she's enjoying it, when she's asking to build more words. When she understands that the tiles REPRESENT sounds. She's ready to READ those same words in print."),

      // Stage 6
      createHeading2("Stage 6: Pink Series — CVC Reading (Ages 4–4.5)"),

      createBodyText("What Marina does:", true),
      createBullet("She looks at a card with a 3-letter word printed on it: 'cat.'"),
      createBullet("She reads it. She already KNOWS this word because she BUILT it with moveable alphabet."),
      createBullet("She matches the card to a picture of a cat."),
      createBullet("She moves to a word list with 10 cat-words: cat, can, car, cap, cam, cad, cot, cub, cut, cap."),
      createBullet("She reads them. All CVC (consonant-vowel-consonant). All phonetic. All decodable."),

      createBodyText("What materials she uses:", true),
      createBullet("Pink Series books. Three components:"),
      createBullet("Object boxes — real small objects (a bat, a mat, a rat, a cat toy)"),
      createBullet("Picture cards — images of those objects"),
      createBullet("Word cards — the printed words"),
      createBullet("Word lists — pages with 10 related words"),
      createBullet("Booklets — simple sentences and short stories using Pink words"),

      createBodyText("Why this step exists:", true),
      createBodyText("Marina has BUILT these words. Now she READS them in print. Reading her own writing. Then reading other people's writing. The progression is gentle and familiar."),

      createBodyText("Pink words are all PHONETIC. Every sound is decodable. 'cat' = /c/ + /a/ + /t/. Marina's brain makes the connection instantly because she's already BUILT this word."),

      createBodyText("The progression goes:"),
      createBullet("Objects (most concrete) → Pictures (more abstract) → Words (most abstract) → Sentences → Stories"),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When she's confidently reading all the Pink Series booklets, when she's not sounding out every letter anymore, when reading feels NORMAL to her. When she starts reading words she HASN'T been taught. That's when you know her brain has cracked the code. She's ready for words that are more complex."),

      // Stage 7
      createHeading2("Stage 7: Blue Series — Blends (Ages 4–5)"),

      createBodyText("What Marina does:", true),
      createBullet("She reads words with consonant BLENDS: frog, stop, hand, jump, trip, skip."),
      createBullet("Two consonants together. But each consonant KEEPS ITS SOUND."),
      createBullet("She reads: /f/ + /r/ + /o/ + /g/ = 'frog.'"),

      createBodyText("What materials she uses:", true),
      createBullet("Blue Series books. Same structure as Pink:"),
      createBullet("Object boxes → Pictures → Word cards → Word lists → Booklets"),

      createBodyText("Why this step exists:", true),
      createBodyText("Marina is ready for more complex phonetic words. But we're not introducing new SOUNDS yet. Just new COMBINATIONS of sounds she already knows. Two consonants that keep their individual sounds."),

      createBodyText("This is still 100% phonetic and decodable. Marina's brain can handle the complexity now because she's mastered simple CVC patterns."),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When Blue Series feels easy. When she's not struggling with the blends. When she's confidently reading Blue booklets. She's ready to learn about NEW sounds."),

      // Stage 8
      createHeading2("Stage 8: Green Series — Phonograms/Digraphs (Ages 4.5–5.5)"),

      createBodyText("What Marina does:", true),
      createBullet("She reads words with DIGRAPHS — letter combinations that make NEW sounds:"),
      createBullet("'sh' makes /sh/ (not /s/ + /h/)"),
      createBullet("'ch' makes /ch/ (not /c/ + /h/)"),
      createBullet("'th' makes /th/ (not /t/ + /h/)"),
      createBullet("'ai' makes /ai/ (not /a/ + /i/)"),
      createBullet("'oa' makes /o/ (not /o/ + /a/)"),

      createBodyText("What materials she uses:", true),
      createBullet("Green Series books. Same structure as Pink and Blue."),

      createBodyText("Why this step exists:", true),
      createBodyText("Marina has mastered SINGLE SOUNDS (Pink) and SOUND COMBINATIONS where each sound stays individual (Blue). Now she's learning about SOUND PUZZLES — two letters that make a COMPLETELY DIFFERENT sound than you'd expect."),

      createBodyText("This is still phonetic (once you know the 'rule' of the digraph). But it requires Marina to understand that some letter pairs are SPECIAL. They're puzzle pieces."),

      createBodyText("How you know she's ready for the next step:", true),
      createBodyText("When Green Series feels natural. When she's automatically recognizing digraphs in words. When she's reading Green booklets fluently. She's ready for exceptions to the rules."),

      // Stage 9
      createHeading2("Stage 9: Puzzle Words / Sight Words (Introduced after Pink confidence)"),

      createBodyText("What Marina does:", true),
      createBullet("She learns words that BREAK THE RULES."),
      createBullet("'the' — she can't decode this. It's a puzzle."),
      createBullet("'said' — she can't decode this. It's a puzzle."),
      createBullet("'was' — she can't decode this. It's a puzzle."),
      createBullet("She memorizes these words because they appear SO OFTEN in books."),

      createBodyText("Why puzzle words come AFTER Pink (not before):", true),
      createBodyText("Marina needs a PHONETIC FOUNDATION first. She needs to understand the basic code. Only then can you introduce exceptions. If you start with puzzle words, she has no foundation. No understanding. Just confusion."),

      createBodyText("In Montessori, we do rules before exceptions. ALWAYS."),

      createBodyText("How you know she's ready:", true),
      createBodyText("When she's fluent with Pink. When she starts encountering puzzle words in books and asks how to read them. That's the signal: introduce them now."),

      // Stage 10
      createHeading2("Stage 10: Handwriting on Paper (Ages 4.5–5)"),

      createBodyText("What Marina does:", true),
      createBullet("She picks up a pencil."),
      createBullet("She writes letters on paper. Not because the teacher forced her, but because she's READY."),
      createBullet("Her hand is steady (metal insets). Her brain knows the letters (sandpaper). She's been 'writing' with tiles (moveable alphabet). Writing with a pencil comes naturally."),

      createBodyText("What materials she uses:", true),
      createBullet("Paper, pencil, lined worksheets."),

      createBodyText("Why this comes LAST, not first:", true),
      createBodyText("The pencil is the HARDEST tool. It requires the steadiest hand, the most muscle control, the most endurance. So we prepare first (metal insets), then teach (sandpaper), then practice without the pencil (moveable alphabet), and ONLY THEN do we ask her to write with a pencil."),

      createBodyText("By the time Marina holds a pencil, she's already comfortable with letters. She's already confident. The pencil is just the final step."),

      createBodyText("How you know she's ready:", true),
      createBodyText("When she's asking to write. When her hand is visibly steady and controlled. When she's EAGER, not reluctant. That's when you introduce pencil writing. Not before."),

      // Stage 11
      createHeading2("Stage 11: Command Cards (Ages 4.5–5)"),

      createBodyText("What Marina does:", true),
      createBullet("She reads a card that says: 'Hop to the door.'"),
      createBullet("She READS the words."),
      createBullet("She UNDERSTANDS the meaning."),
      createBullet("She DOES the action."),

      createBodyText("Why this step exists:", true),
      createBodyText("Marina has been reading LISTS and PICTURES. Now she's reading for MEANING. She's reading for COMPREHENSION. The proof is in the action. If she understood, she can do the command."),

      createBodyText("This is where reading becomes USEFUL instead of just PRACTICE."),

      createBodyText("How you know she's ready:", true),
      createBodyText("When she's fluent with Pink and Blue series. When she's not sounding out every word anymore. She's ready to read for meaning."),

      // Stage 12
      createHeading2("Stage 12: Grammar (Ages 5–6)"),

      createBodyText("What Marina does:", true),
      createBullet("She learns parts of speech using PHYSICAL SYMBOLS:"),
      createBullet("A black triangle = NOUN (a person, place, or thing)"),
      createBullet("A red circle = VERB (an action)"),
      createBullet("A blue ball = ADJECTIVE (a description)"),
      createBullet("She reads sentences and places symbols above each word to show what kind of word it is."),

      createBodyText("Why grammar comes LAST:", true),
      createBodyText("Marina has been reading for months. Her brain KNOWS how words work. Now she's learning to THINK ABOUT how words work. Grammar is the conscious understanding of something she's already doing unconsciously."),

      createBodyText("And notice: it's not abstract. It's PHYSICAL. She can TOUCH the symbols. She can MOVE them around. Grammar is not something that happens in a textbook. It's something she can DO."),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 3: PINK/BLUE/GREEN SYSTEM
      createHeading1("The Pink, Blue, and Green Systems: A Visual Summary"),

      createBodyText("The foundation of reading in Montessori is the THREE SERIES of books. Each series introduces a new layer of complexity. Each series follows the same progression."),

      // Table
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2340, 2340, 2340, 2340],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                shading: { fill: MONTESSORI_GREEN, type: ShadingType.CLEAR },
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Series", bold: true, color: "FFFFFF", size: 22 })] })]
              }),
              new TableCell({
                borders,
                shading: { fill: MONTESSORI_GREEN, type: ShadingType.CLEAR },
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "What It Teaches", bold: true, color: "FFFFFF", size: 22 })] })]
              }),
              new TableCell({
                borders,
                shading: { fill: MONTESSORI_GREEN, type: ShadingType.CLEAR },
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Example Words", bold: true, color: "FFFFFF", size: 22 })] })]
              }),
              new TableCell({
                borders,
                shading: { fill: MONTESSORI_GREEN, type: ShadingType.CLEAR },
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Age", bold: true, color: "FFFFFF", size: 22 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "PINK", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "CVC words (3-letter, phonetic)", size: 20 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "cat, dog, pin, hen, bat", size: 20 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "4–4.5 y", size: 20 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "BLUE", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Blends (consonant clusters)", size: 20 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "frog, stop, hand, jump", size: 20 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "4–5 y", size: 20 })] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                shading: { fill: LIGHT_GREEN, type: ShadingType.CLEAR },
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "GREEN", bold: true, size: 22 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Digraphs (new sounds)", size: 20 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "fish, boat, chair, rain", size: 20 })] })]
              }),
              new TableCell({
                borders,
                width: { size: 2340, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "4.5–5.5 y", size: 20 })] })]
              })
            ]
          })
        ]
      }),

      createBodyText("", false),

      createBodyText("Each series follows the exact same progression:", true),

      createBullet("OBJECTS — Real, touchable things (most concrete)"),
      createBullet("PICTURES — Images of those objects (more abstract)"),
      createBullet("WORD CARDS — Single words written out (even more abstract)"),
      createBullet("PHRASES & SENTENCES — Words combined into meaning (most abstract)"),
      createBullet("BOOKLETS — Stories using the words from the series"),

      createBodyText("This progression from CONCRETE to ABSTRACT is the Montessori way. First, touch something real. Then, see a picture of it. Then, see the WORD that names it. By the time the child reaches the word, they already KNOW what it means."),

      createBodyText("Each series also gets HARDER. But children move at their own pace. Some children race through Pink in a few months. Others take longer. This is NORMAL and FINE. By age 5.5, most children have worked through all three series and are reading simple chapter books independently."),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 4: SANDPAPER LETTER GROUPS
      createHeading1("The Sandpaper Letter Groups: The Precise Order"),

      createBodyText("The order in which letters are introduced matters. They're NOT in alphabetical order. They're grouped by contrast and frequency."),

      createBodyText("Letters that look similar are taught FAR APART. If you teach 'b' and 'd' at the same time, Marina will confuse them for months. But if you teach 'b' with very different-looking letters, she'll remember it immediately."),

      createBodyText("Letters that are common are taught first. Letters that are rare are taught last."),

      createHeading2("Group 1: c, m, a, t"),
      createBodySmall("The first sounds. Very different from each other. All used in common CVC words (cat, mat, can, cat, act)."),

      createHeading2("Group 2: s, r, i, p"),
      createBodySmall("Still very contrasting. The letter 'i' is the second vowel introduced. 's' is a common initial sound. 'r' and 'p' are distinct consonants."),

      createHeading2("Group 3: b, f, o, g"),
      createBodySmall("More consonants, another vowel. 'b' is now introduced far from 'd' (which comes later). 'o' is the third vowel."),

      createHeading2("Group 4: h, j, u, l"),
      createBodySmall("'u' is the fourth vowel. 'h' is common. 'j' and 'l' are distinct."),

      createHeading2("Group 5: d, w, e, n"),
      createBodySmall("'d' is now introduced (far from 'b'). 'e' is the fifth vowel. 'w' and 'n' are common consonants."),

      createHeading2("Group 6: k, q, v, x, y, z"),
      createBodySmall("The least common letters. Introduced after children are solid with all the others. 'y' because it's sometimes a vowel. 'q' because it almost always comes with 'u.' 'x,' 'v,' and 'z' because they're rare and easy to confuse once you know other letters."),

      createBodyText("Why this matters:", true),
      createBodyText("You follow this order RELIGIOUSLY. It's not a suggestion. It's been proven to work. When you introduce letters in contrast, children learn faster and make fewer mistakes."),

      // Page break
      new Paragraph({ children: [new PageBreak()] }),

      // SECTION 5: WHY THIS ORDER WORKS
      createHeading1("Why This Order Works: The Deep Logic"),

      createHeading2("1. Sound Before Symbol"),
      createBodyText("We teach /mmm/ before we teach the letter 'm.' We teach EARS before EYES. Because ears are the sense that matters for reading. Reading is decoding sounds. If you jump straight to the letter, the child doesn't understand why the letter matters."),

      createHeading2("2. Encoding Before Decoding"),
      createBodyText("We teach WRITING before READING. But we start with the moveable alphabet (writing without a pencil) before we ask children to pick up a pencil. Because encoding (putting thoughts into code) is easier than decoding (breaking code into thoughts). A child wants to MAKE before they want to UNDERSTAND."),

      createHeading2("3. Concrete Before Abstract"),
      createBodyText("We start with real OBJECTS (a cat), then PICTURES of objects (a drawing of a cat), then the WORD (the letters c-a-t). Because the concrete is something the child already knows. The abstract (the word) connects to something real."),

      createHeading2("4. Motor Prep Runs in Parallel"),
      createBodyText("While Marina is learning sounds, her hands are getting ready (metal insets). By the time she learns letters, her hand is READY to trace them. By the time she learns to write with a pencil, her hand is STRONG enough. Everything is timed perfectly."),

      createHeading2("5. Phonetic First, Exceptions Second"),
      createBodyText("We teach the RULES before the EXCEPTIONS. Pink series (100% phonetic) before puzzle words. Blue series (still all phonetic blends) before trigraphs that have weird sounds. If you try to teach exceptions first, children have no foundation. With a phonetic foundation, exceptions make sense."),

      createHeading2("6. Self-Correction Built Into Everything"),
      createBodyText("The moveable alphabet tiles make a word that either SOUNDS right or doesn't. The sandpaper letters are rough — you can FEEL if you traced them right. The picture cards either MATCH the word or they don't. Children know immediately if they did it right. No waiting for the teacher. No frustration."),

      createHeading2("7. Nothing Is Wasted"),
      createBodyText("Metal insets are NOT 'finger painting for fine motor skills.' They're TRAINING your hand for the exact strokes you'll use in letters. The sound games are NOT 'fun activities.' They're BUILDING the phonemic awareness you need to decode words. Everything has a purpose. Everything connects."),

      createHeading2("8. Pacing Is Individual"),
      createBodyText("Some children zoom through Pink in two months. Some take six months. Both are NORMAL. We never rush. We never slow down artificially. We follow the CHILD. When Marina is ready to move to Blue, we move. When she needs more time with Pink, she gets it. No timelines. No frustration."),

      // Conclusion
      createBodyText("", false),

      createBodyText("This is the Montessori logic. Simple. Logical. Built on how children's brains actually work. Not how we THINK they should work. Not what's fashionable. What WORKS."),

      createBodyText("And the proof is in the outcome: children who follow this progression rarely struggle with reading. By age 5 or 6, they're reading independently. Not because they were forced. Because they were ready. Because everything was prepared. Because their brain, their hand, and their spirit all lined up at the right moment."),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({
          text: "—",
          size: 24,
          color: MONTESSORI_GREEN
        })]
      }),

      createBodyText("", false),

      createBodyText("That's Marina's journey. From silence to reading. Simple. Logical. Beautiful."),
    ]
  }]
});

// Write the document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/keen-pensive-cerf/mnt/whale/AMI_English_Language_Progression.docx", buffer);
  console.log("Document created successfully!");
  process.exit(0);
});
