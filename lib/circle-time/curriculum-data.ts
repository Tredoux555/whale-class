// lib/circle-time/curriculum-data.ts
// Complete 36-week Circle Time Curriculum - STATIC DATA

export interface CircleTimePlan {
  week: number;
  theme: string;
  icon: string;
  color: string;
  song: {
    title: string;
    actions: string;
  };
  vocabulary: string[];
  books: {
    title: string;
    author: string;
    activities: string[];
  }[];
  mondayPlan: DayPlan;
  tuesdayPlan: DayPlan;
  wednesdayPlan: DayPlan;
  thursdayPlan: DayPlan;
  fridayPlan: DayPlan;
}

export interface DayPlan {
  focus: string;
  warmup: string;
  main: string;
  activities: string;
  closing: string;
  materials: string[];
}

export const CIRCLE_TIME_CURRICULUM: CircleTimePlan[] = [
  // ============ WEEK 1: Welcome Back ============
  {
    week: 1,
    theme: "Welcome Back",
    icon: "🎒",
    color: "#ef4444",
    song: {
      title: "Hello, Hello, Hello and How Are You?",
      actions: "Wave to each child by name, clap on 'how are you'"
    },
    vocabulary: ["school", "teacher", "friend", "classroom", "desk", "chair", "book", "pencil", "crayon", "backpack"],
    books: [
      {
        title: "David Goes to School",
        author: "David Shannon",
        activities: ["Discuss school rules - what should David do?", "Classroom tour - label different areas"]
      },
      {
        title: "The Kissing Hand",
        author: "Audrey Penn",
        activities: ["Kissing hand craft - trace hand, add heart sticker", "Share feelings about coming to school"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Hello song and name game. Wave to each friend!",
      main: "Introduce theme: Welcome Back to School! Teach song 'Hello, Hello, Hello'. Show vocabulary flashcards one by one - repeat each word together.",
      activities: "Flashcard games: 'What's Missing?' and 'Show Me the...' Play vocabulary matching game.",
      closing: "Sing hello song one more time. Preview tomorrow's book!",
      materials: ["Vocabulary flashcards", "Song lyrics"]
    },
    tuesdayPlan: {
      focus: "Book 1: David Goes to School",
      warmup: "Sing 'Hello, Hello, Hello'. Quick flashcard review.",
      main: "Read 'David Goes to School'. Pause to discuss: What is David doing wrong? What SHOULD he do? Connect to our classroom rules.",
      activities: "School rules discussion - create class rules poster together. Classroom tour - walk around and name each area.",
      closing: "Review 2-3 vocabulary words. Sing goodbye song.",
      materials: ["Book: David Goes to School", "Large poster paper", "Markers"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Kissing Hand",
      warmup: "Theme song with actions. Review flashcards.",
      main: "Read 'The Kissing Hand'. Discuss: How did Chester feel? Do you ever miss your family at school? The kiss stays with you all day!",
      activities: "Kissing Hand craft - trace hand on paper, add heart sticker in palm. 'Mommy's love is always with you!'",
      closing: "Share feelings circle - it's okay to feel nervous! Theme song.",
      materials: ["Book: The Kissing Hand", "Paper", "Crayons", "Heart stickers"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Sing theme song from memory. Quick vocabulary game.",
      main: "Review the week: What was our theme? What books did we read? What new words did we learn? What are our classroom rules?",
      activities: "Draw your classroom! Include your teacher, friends, and favorite area. Share drawings with the class.",
      closing: "Celebrate our first week! Sing theme song together.",
      materials: ["Paper", "Crayons", "All flashcards"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song with movements. Letter review.",
      main: "Focus letters: S (school), T (teacher), F (friend). Practice letter sounds. Find these letters in our vocabulary words.",
      activities: "Letter hunt around classroom. Letter sound matching game. Playdough letters.",
      closing: "Week celebration! Favorite song from the week. See you Monday!",
      materials: ["Letter cards", "Playdough", "Letter hunt sheet"]
    }
  },

  // ============ WEEK 2: Classroom Rules ============
  {
    week: 2,
    theme: "Classroom Rules",
    icon: "📋",
    color: "#f97316",
    song: {
      title: "We Are Here Together",
      actions: "Point to each friend, hold hands in circle"
    },
    vocabulary: ["rules", "listen", "quiet", "share", "kind", "safe", "gentle", "help", "wait", "turn"],
    books: [
      {
        title: "No David!",
        author: "David Shannon",
        activities: ["Rule charades - act out following/breaking rules", "Create rule posters with pictures"]
      },
      {
        title: "Hands Are Not for Hitting",
        author: "Martine Agassi",
        activities: ["Trace hands - draw things hands CAN do", "Practice kind words: please, thank you, sorry"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Good morning song. Attention signal practice.",
      main: "Introduce theme: Our Classroom Rules! Teach song. Show vocabulary flashcards - what does each word mean?",
      activities: "Act out each vocabulary word. 'Show me QUIET. Show me KIND.'",
      closing: "Sing theme song. Preview tomorrow's book about David!",
      materials: ["Vocabulary flashcards", "Rule posters"]
    },
    tuesdayPlan: {
      focus: "Book 1: No David!",
      warmup: "Theme song with actions. Flashcard game.",
      main: "Read 'No David!' Pause after each page: What is David doing? Is this following our rules? Thumbs up/down.",
      activities: "Rule charades - teacher acts out following/breaking rules, children guess which rule. Create rule posters.",
      closing: "Review our 4 main rules. Theme song.",
      materials: ["Book: No David!", "Large paper", "Markers"]
    },
    wednesdayPlan: {
      focus: "Book 2: Hands Are Not for Hitting",
      warmup: "Theme song. Quick rule review - hold up fingers for each rule.",
      main: "Read 'Hands Are Not for Hitting'. What CAN hands do? Helping, hugging, waving, creating!",
      activities: "Helping Hands craft - trace hands, draw/write things our hands CAN do. Practice saying please, thank you, sorry, excuse me.",
      closing: "Kind words practice. Theme song.",
      materials: ["Book: Hands Are Not for Hitting", "Paper", "Crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Vocabulary quick recall.",
      main: "Review week: What are our rules? Why do we have rules? How do rules help us? Role play scenarios.",
      activities: "Create class book: 'Our Rules' - each child draws one rule being followed. Bind together.",
      closing: "Read our class book together! Celebrate being rule followers!",
      materials: ["Paper", "Crayons", "Stapler or binding"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds review.",
      main: "Focus letters: R (rules), K (kind), S (safe). Practice sounds. Find in vocabulary words.",
      activities: "Letter bingo. Sound sorting game. Write letters in sand/salt tray.",
      closing: "Week celebration! Great job learning our rules!",
      materials: ["Letter cards", "Bingo cards", "Sand/salt trays"]
    }
  },

  // ============ WEEK 3: My Body ============
  {
    week: 3,
    theme: "My Body",
    icon: "🧍",
    color: "#eab308",
    song: {
      title: "Head, Shoulders, Knees and Toes",
      actions: "Touch each body part as you sing - go faster each time!"
    },
    vocabulary: ["head", "shoulders", "knees", "toes", "eyes", "ears", "mouth", "nose", "hands", "feet"],
    books: [
      {
        title: "From Head to Toe",
        author: "Eric Carle",
        activities: ["Copy animal movements from the book", "Body part freeze dance game"]
      },
      {
        title: "My Body Belongs to Me",
        author: "Jill Starishevsky",
        activities: ["Body tracing on large paper", "Label body parts together"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Wake up our bodies! Wiggle fingers, wiggle toes, shake whole body!",
      main: "Introduce theme: My Amazing Body! Teach 'Head, Shoulders, Knees and Toes'. Show body part flashcards.",
      activities: "Simon Says with body parts. 'Simon says touch your nose!'",
      closing: "Sing body song fast, then slow! Preview tomorrow's book.",
      materials: ["Body part flashcards", "Mirror"]
    },
    tuesdayPlan: {
      focus: "Book 1: From Head to Toe",
      warmup: "Body song. Point to body parts as teacher calls them.",
      main: "Read 'From Head to Toe'. After each page, do the animal movement together! Can you do it?",
      activities: "Animal movement game - move like each animal from the book. Body part freeze dance.",
      closing: "Which animal movement was your favorite? Theme song.",
      materials: ["Book: From Head to Toe", "Open space for movement"]
    },
    wednesdayPlan: {
      focus: "Book 2: My Body Belongs to Me",
      warmup: "Theme song with big movements. Flashcard review.",
      main: "Read 'My Body Belongs to Me'. Important message: Our body is OURS. We decide who can touch us.",
      activities: "Body tracing - children lie on large paper, trace outline, then add eyes, nose, mouth, heart. Label parts.",
      closing: "Our bodies are amazing and special! Theme song.",
      materials: ["Book: My Body Belongs to Me", "Large paper rolls", "Crayons", "Body part labels"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song from memory. Body part quick point.",
      main: "Review: What body parts did we learn? What does each part do? Eyes help me SEE, ears help me HEAR...",
      activities: "Body part collage - cut out body parts from magazines, arrange into a person. Or: Body part stamps/painting.",
      closing: "Share creations. Our bodies are all different and all wonderful!",
      materials: ["Magazines", "Scissors", "Glue", "Paper"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song with body movements for each letter.",
      main: "Focus letters: H (head), E (eyes), N (nose). Practice sounds. Find in body words.",
      activities: "Letter hunt on body tracings. Sound matching. Playdough body parts with letter labels.",
      closing: "Body song celebration! Have a great weekend!",
      materials: ["Letter cards", "Playdough", "Body tracings"]
    }
  },

  // ============ WEEK 4: My 5 Senses ============
  {
    week: 4,
    theme: "My 5 Senses",
    icon: "👁️",
    color: "#22c55e",
    song: {
      title: "I Have Two Eyes to See With",
      actions: "Point to each sense organ as you sing"
    },
    vocabulary: ["see", "hear", "smell", "taste", "touch", "eyes", "ears", "nose", "tongue", "hands"],
    books: [
      {
        title: "My Five Senses",
        author: "Aliki",
        activities: ["Sense stations rotation", "Sense sorting game"]
      },
      {
        title: "The Listening Walk",
        author: "Paul Showers",
        activities: ["Quiet listening walk around school", "Make a 5-senses book"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Use your senses! What do you HEAR right now? What do you SEE?",
      main: "Introduce 5 Senses. Teach sense song. Show flashcards - match sense to body part.",
      activities: "Sense guessing game - close eyes and guess: What sound? What smell?",
      closing: "Review 5 senses on fingers. Theme song.",
      materials: ["Sense flashcards", "Mystery sounds", "Smell jars"]
    },
    tuesdayPlan: {
      focus: "Book 1: My Five Senses",
      warmup: "Sense song. Quick sense matching game.",
      main: "Read 'My Five Senses'. Discuss each sense - what are examples?",
      activities: "Sense stations rotation: 1) Mystery box (touch), 2) Smell jars, 3) Sound shakers, 4) Taste test, 5) I Spy (sight)",
      closing: "Which station was your favorite? Theme song.",
      materials: ["Book: My Five Senses", "Station materials"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Listening Walk",
      warmup: "Theme song. Practice quiet listening - what do you hear?",
      main: "Read 'The Listening Walk'. Let's go on our own listening walk!",
      activities: "Quiet walk around school - what sounds do you hear? Come back and share. Make list of sounds heard.",
      closing: "Our ears are amazing! Theme song.",
      materials: ["Book: The Listening Walk", "Clipboard for sound list"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song with sense actions. Review all 5 senses.",
      main: "Review: Which sense uses eyes? Ears? Nose? Tongue? Hands? Play sense quiz game.",
      activities: "Make a 5-senses book - each page is one sense with drawing of something for that sense.",
      closing: "Share favorite page from sense book. Celebrate our senses!",
      materials: ["Paper", "Stapler", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds practice.",
      main: "Focus letters: S (see, smell), T (taste, touch), H (hear). Find in sense words.",
      activities: "Letter sound bingo. Sensory letter writing - write letters in sand, shaving cream, etc.",
      closing: "Amazing senses week! Theme song. See you Monday!",
      materials: ["Letter cards", "Bingo cards", "Sensory writing materials"]
    }
  },

  // ============ WEEK 5: My Feelings ============
  {
    week: 5,
    theme: "My Feelings",
    icon: "😊",
    color: "#3b82f6",
    song: {
      title: "If You're Happy and You Know It",
      actions: "Add verses: sad (wipe tears), angry (stomp feet), scared (shake), excited (jump)"
    },
    vocabulary: ["happy", "sad", "angry", "scared", "excited", "surprised", "tired", "calm", "worried", "loved"],
    books: [
      {
        title: "The Color Monster",
        author: "Anna Llenas",
        activities: ["Color monsters for each feeling", "Feelings charades game"]
      },
      {
        title: "When I Feel Angry",
        author: "Cornelia Maude Spelman",
        activities: ["Calm down strategies practice", "Feelings faces craft"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "How are you feeling TODAY? Show me with your face!",
      main: "Introduce Feelings theme. Teach song with all emotion verses. Show feeling flashcards - make faces!",
      activities: "Feelings charades - act out feelings, friends guess. Mirror feelings practice.",
      closing: "All feelings are okay! Theme song.",
      materials: ["Feeling flashcards", "Mirrors"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Color Monster",
      warmup: "Feelings song with all verses. Show feelings with your body.",
      main: "Read 'The Color Monster'. Each feeling has a color! What color is happy? Sad? Angry?",
      activities: "Color Monster craft - make monsters for each feeling with matching colors.",
      closing: "It's good to know what we're feeling! Theme song.",
      materials: ["Book: The Color Monster", "Paper", "Crayons/paint"]
    },
    wednesdayPlan: {
      focus: "Book 2: When I Feel Angry",
      warmup: "Theme song. Feelings check-in circle.",
      main: "Read 'When I Feel Angry'. Everyone feels angry sometimes! What helps when we're angry?",
      activities: "Learn calm down strategies: deep breaths, count to 10, squeeze a stress ball, ask for help. Practice each one!",
      closing: "We have tools for big feelings! Theme song.",
      materials: ["Book: When I Feel Angry", "Stress balls", "Breathing poster"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Feelings quick show - 'Show me happy! Show me sad!'",
      main: "Review: Name all the feelings we learned. When might you feel each one? What can you do?",
      activities: "Feelings faces craft - paper plate faces showing different emotions. Or: Feelings book.",
      closing: "Share your feelings face! All feelings are okay!",
      materials: ["Paper plates", "Markers", "Craft sticks"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter review.",
      main: "Focus letters: H (happy), S (sad), A (angry). Practice sounds. Find in feeling words.",
      activities: "Letter matching game. Feeling faces with letter labels. Playdough letters.",
      closing: "Feelings week celebration! Big hug for everyone!",
      materials: ["Letter cards", "Playdough", "Feeling face templates"]
    }
  },

  // ============ WEEK 6: I Am Special ============
  {
    week: 6,
    theme: "I Am Special",
    icon: "⭐",
    color: "#8b5cf6",
    song: {
      title: "I Am Special, I Am Special, Look at Me!",
      actions: "Point to self, spin around, strike a superhero pose"
    },
    vocabulary: ["special", "unique", "different", "same", "favorite", "family", "friends", "love", "kind", "smart"],
    books: [
      {
        title: "I Like Me!",
        author: "Nancy Carlson",
        activities: ["Mirror activity - what do you like about yourself?", "All About Me star craft"]
      },
      {
        title: "The Name Jar",
        author: "Yangsook Choi",
        activities: ["Decorate your name beautifully", "Share name meaning or story"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "You are all SPECIAL! Let's celebrate YOU!",
      main: "Introduce I Am Special theme. Teach song. Show vocabulary - what makes someone special?",
      activities: "Special compliment circle - say something nice about the person next to you.",
      closing: "Everyone is unique and wonderful! Theme song.",
      materials: ["Vocabulary flashcards", "Mirror"]
    },
    tuesdayPlan: {
      focus: "Book 1: I Like Me!",
      warmup: "Theme song. Look in mirrors - smile at yourself!",
      main: "Read 'I Like Me!' What does the pig like about herself? What do YOU like about yourself?",
      activities: "Mirror time - look and share what you like about yourself. All About Me star - draw favorite things.",
      closing: "I like ME and I like YOU! Theme song.",
      materials: ["Book: I Like Me!", "Mirrors", "Star cutouts", "Crayons"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Name Jar",
      warmup: "Theme song with poses. Special share - one thing that makes you YOU.",
      main: "Read 'The Name Jar'. Our names are special! They were chosen just for us.",
      activities: "Name art - decorate your name beautifully with colors, patterns, stickers. Share name stories if known.",
      closing: "Our names are part of what makes us special! Theme song.",
      materials: ["Book: The Name Jar", "Name papers", "Decorating supplies"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Special things quick share.",
      main: "Review: What makes you special? Family, friends, things you like, things you're good at...",
      activities: "All About Me poster - draw yourself, family, favorite things, what you're good at. Display on wall!",
      closing: "We are ALL special in different ways! Gallery walk to see posters.",
      materials: ["Large paper", "Crayons", "Magazines for cutting"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter of YOUR name!",
      main: "Focus: First letter of each child's name. What sound does YOUR name start with?",
      activities: "Name letter activities - find your letter, trace your letter, decorate your letter.",
      closing: "Special week celebration! You are amazing!",
      materials: ["Name cards", "Letter templates", "Decorating supplies"]
    }
  },

  // ============ WEEK 7: Five Food Groups ============
  {
    week: 7,
    theme: "Five Food Groups",
    icon: "🍎",
    color: "#ef4444",
    song: {
      title: "Apples and Bananas",
      actions: "Change vowels for each verse - A-ples and Ba-na-nas, E-ples and Be-ne-nes..."
    },
    vocabulary: ["fruits", "vegetables", "grains", "protein", "dairy", "healthy", "apple", "carrot", "bread", "milk"],
    books: [
      {
        title: "The Very Hungry Caterpillar",
        author: "Eric Carle",
        activities: ["Sequence foods caterpillar ate", "Caterpillar craft from circles"]
      },
      {
        title: "Eating the Alphabet",
        author: "Lois Ehlert",
        activities: ["Build My Plate craft", "Food group sorting game"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Rub your tummy! Are you hungry? Let's learn about healthy foods!",
      main: "Introduce 5 Food Groups. Teach song. Show food flashcards - which group is each?",
      activities: "Food group sorting game - sort food pictures into 5 groups.",
      closing: "Eating from all groups makes us healthy! Theme song.",
      materials: ["Food flashcards", "5 group sorting baskets"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Very Hungry Caterpillar",
      warmup: "Food song. Quick food group review.",
      main: "Read 'The Very Hungry Caterpillar'. What did he eat? Were they healthy? Saturday was yummy but made him sick!",
      activities: "Sequence the foods he ate. Caterpillar craft - circles for each food, turns into butterfly!",
      closing: "Healthy foods make us feel good! Theme song.",
      materials: ["Book: The Very Hungry Caterpillar", "Circle cutouts", "Glue"]
    },
    wednesdayPlan: {
      focus: "Book 2: Eating the Alphabet",
      warmup: "Theme song. Food group quick sort.",
      main: "Read 'Eating the Alphabet'. So many fruits and vegetables! Have you tried any of these?",
      activities: "Build My Plate craft - paper plate divided into sections, glue foods in each section.",
      closing: "A colorful plate is a healthy plate! Theme song.",
      materials: ["Book: Eating the Alphabet", "Paper plates", "Food pictures", "Glue"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Name foods in each group challenge.",
      main: "Review: What are the 5 food groups? Why do we need each one? What's YOUR favorite healthy food?",
      activities: "Healthy meal drawing - draw your favorite healthy meal with foods from different groups.",
      closing: "Let's eat healthy and grow strong! Theme song.",
      materials: ["Paper", "Crayons", "Food group poster"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: A (apple), M (milk), B (bread). Find in food words.",
      activities: "Food letter matching. Beginning sound food sort. Playdough foods.",
      closing: "Healthy eating week done! Eat your fruits and veggies!",
      materials: ["Letter cards", "Playdough", "Food pictures"]
    }
  },

  // ============ WEEK 8: Healthy Habits - Hygiene ============
  {
    week: 8,
    theme: "Healthy Habits",
    icon: "🧼",
    color: "#06b6d4",
    song: {
      title: "Wash, Wash, Wash Your Hands",
      actions: "Pretend washing motions - to tune of Row Your Boat"
    },
    vocabulary: ["wash", "clean", "soap", "water", "germs", "healthy", "tissue", "cover", "sneeze", "cough"],
    books: [
      {
        title: "Germs Are Not for Sharing",
        author: "Elizabeth Verdick",
        activities: ["Glitter germs experiment", "Hand washing steps sequence"]
      },
      {
        title: "I Know How We Fight Germs",
        author: "Kate Rowan",
        activities: ["Healthy habits chart", "Actual hand washing practice"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Show me your hands! Are they clean? Let's learn about germs!",
      main: "Introduce Healthy Habits. Germs are tiny things that can make us sick! Teach washing song. Show flashcards.",
      activities: "When do we wash hands? Before eating, after bathroom, after playing, after sneezing...",
      closing: "Clean hands = healthy bodies! Theme song.",
      materials: ["Vocabulary flashcards", "Germ pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: Germs Are Not for Sharing",
      warmup: "Hand washing song. Show me clean hands!",
      main: "Read 'Germs Are Not for Sharing'. Germs spread when we touch things! How do we stop germs?",
      activities: "GLITTER GERMS experiment - put glitter on hands, touch things, see how 'germs' spread! Wash with soap - germs gone!",
      closing: "Wash hands to stop germs spreading! Theme song.",
      materials: ["Book", "Glitter", "Soap", "Water", "Paper towels"]
    },
    wednesdayPlan: {
      focus: "Book 2: I Know How We Fight Germs",
      warmup: "Theme song. Glitter germ review - did you tell your family?",
      main: "Read 'I Know How We Fight Germs'. Our body fights germs! But we help by washing, covering coughs, using tissues.",
      activities: "Hand washing practice - actually wash hands while singing ABCs! Practice covering coughs with elbow.",
      closing: "We are germ fighters! Theme song.",
      materials: ["Book", "Sink access", "Tissues"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Healthy habits quiz - thumbs up/down.",
      main: "Review: Why wash hands? When? How long? What else fights germs? Cover coughs, use tissues, don't share cups.",
      activities: "Healthy habits poster - draw pictures of ways to stay healthy.",
      closing: "We know how to stay healthy! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: W (wash, water), S (soap, sneeze), C (clean, cough). Practice sounds.",
      activities: "Letter sound matching. Wash letter tiles clean (put 'germs' on, wash off). Write letters in soap foam!",
      closing: "Stay healthy and keep learning! Great week!",
      materials: ["Letter tiles", "Soap foam", "Water table"]
    }
  },

  // ============ WEEK 9: Dental Health ============
  {
    week: 9,
    theme: "Dental Health",
    icon: "🦷",
    color: "#f0fdf4",
    song: {
      title: "Brush, Brush, Brush Your Teeth",
      actions: "Pretend brushing - front, back, sides, tongue! To Row Your Boat tune"
    },
    vocabulary: ["teeth", "brush", "dentist", "toothpaste", "floss", "cavity", "healthy", "smile", "mouth", "tongue"],
    books: [
      {
        title: "Brush Your Teeth, Please",
        author: "Leslie McGuire",
        activities: ["Practice brushing on teeth model", "Brushing steps sequence"]
      },
      {
        title: "The Tooth Book",
        author: "Dr. Seuss",
        activities: ["Happy tooth/sad tooth sorting", "My smile self-portrait"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Big SMILE everyone! Let me see those teeth!",
      main: "Introduce Dental Health. Why are teeth important? Biting, chewing, smiling, talking! Teach song. Show flashcards.",
      activities: "Pretend brushing practice - get your air toothbrush! Brush front, back, sides, tongue!",
      closing: "Brush twice a day! Theme song.",
      materials: ["Vocabulary flashcards", "Teeth model if available"]
    },
    tuesdayPlan: {
      focus: "Book 1: Brush Your Teeth, Please",
      warmup: "Brushing song. Show me your smile!",
      main: "Read 'Brush Your Teeth, Please'. Animals brush too! What are the steps?",
      activities: "Brushing sequence cards - put in order. Practice on teeth model or big brushes.",
      closing: "Don't forget to brush tonight! Theme song.",
      materials: ["Book", "Sequence cards", "Teeth model", "Big toothbrush"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Tooth Book",
      warmup: "Theme song. How many teeth do you have? Let's count!",
      main: "Read 'The Tooth Book'. What are teeth for? What helps teeth? What hurts teeth?",
      activities: "Happy Tooth / Sad Tooth sorting - apple=happy, candy=sad, milk=happy, soda=sad...",
      closing: "Choose foods that make teeth happy! Theme song.",
      materials: ["Book", "Happy/sad tooth posters", "Food pictures"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Dental health quiz.",
      main: "Review: How many times brush? Foods for healthy teeth? What does the dentist do? (Helps keep teeth healthy!)",
      activities: "My Smile self-portrait - draw yourself with a big healthy smile! Add white teeth!",
      closing: "Beautiful smiles everywhere! Theme song.",
      materials: ["Paper", "Crayons", "Mirrors"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter practice.",
      main: "Focus letters: T (teeth, tongue), B (brush), D (dentist). Practice sounds.",
      activities: "Letter matching. Tooth-shaped letter cards. Write letters with white crayon on blue paper (like teeth!).",
      closing: "Keep those teeth healthy! See you Monday!",
      materials: ["Letter cards", "White crayons", "Blue paper"]
    }
  },

  // ============ WEEK 10: My Family ============
  {
    week: 10,
    theme: "My Family",
    icon: "👨‍👩‍👧‍👦",
    color: "#ec4899",
    song: {
      title: "The Finger Family",
      actions: "Hold up each finger for family members - daddy, mommy, brother, sister, baby"
    },
    vocabulary: ["family", "mom", "dad", "sister", "brother", "baby", "grandma", "grandpa", "love", "home"],
    books: [
      {
        title: "The Family Book",
        author: "Todd Parr",
        activities: ["Family portrait drawing", "Share about your family"]
      },
      {
        title: "Llama Llama Misses Mama",
        author: "Anna Dewdney",
        activities: ["Missing someone discussion", "Family photo frame craft"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Who woke you up today? Let's talk about families!",
      main: "Introduce Family theme. Teach finger family song. Show family flashcards - who is in YOUR family?",
      activities: "Family circle share - tell us about your family! Big families, small families, all families are special!",
      closing: "Families love us! Theme song.",
      materials: ["Vocabulary flashcards", "Family photos if available"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Family Book",
      warmup: "Finger family song. Family vocabulary review.",
      main: "Read 'The Family Book'. All families are different! Some big, some small, some have two moms, some live with grandparents...",
      activities: "Family portrait - draw everyone in your family. Include pets too! Share drawings.",
      closing: "All families are special! Theme song.",
      materials: ["Book: The Family Book", "Paper", "Crayons"]
    },
    wednesdayPlan: {
      focus: "Book 2: Llama Llama Misses Mama",
      warmup: "Theme song. Who do you miss when you're at school?",
      main: "Read 'Llama Llama Misses Mama'. It's okay to miss family! What helps Llama feel better?",
      activities: "Missing someone discussion - what helps us when we miss family? Kissing hand, photos, thinking of them, making art for them.",
      closing: "Family love stays with us all day! Theme song.",
      materials: ["Book: Llama Llama Misses Mama"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Family vocabulary quick review.",
      main: "Review: Who is in a family? What do families do together? Eat, play, read, hug, help each other...",
      activities: "Family photo frame craft - decorate frame to put family photo in cubby or take home.",
      closing: "Bring family photo tomorrow if you can! Theme song.",
      materials: ["Cardboard frames", "Decorating supplies"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: F (family), M (mom), D (dad). Practice sounds. Find in family words.",
      activities: "Letter matching game. Family member beginning sounds. Make letter cards for family members.",
      closing: "Hug your family this weekend! Great week!",
      materials: ["Letter cards", "Paper", "Crayons"]
    }
  },

  // ============ WEEK 11: Plant Life Cycle ============
  {
    week: 11,
    theme: "Plant Life Cycle",
    icon: "🌱",
    color: "#22c55e",
    song: {
      title: "I'm a Little Seed",
      actions: "Curl up small (seed), wiggle (rain), reach up (sun), grow tall (plant)!"
    },
    vocabulary: ["seed", "plant", "grow", "water", "sun", "soil", "roots", "stem", "leaves", "flower"],
    books: [
      {
        title: "The Tiny Seed",
        author: "Eric Carle",
        activities: ["Plant a seed in clear cup", "Seed cycle sequence cards"]
      },
      {
        title: "From Seed to Pumpkin",
        author: "Wendy Pfeffer",
        activities: ["Life cycle wheel craft", "Parts of a plant labeling"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Have you ever watched something GROW? Today we learn about plants!",
      main: "Introduce Plant Life Cycle. Teach seed song with movements. Show plant flashcards - parts of a plant.",
      activities: "Act out being a seed - curl up, feel rain, feel sun, GROW! Parts of plant matching.",
      closing: "Plants are amazing! Theme song.",
      materials: ["Vocabulary flashcards", "Real plants to observe"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Tiny Seed",
      warmup: "Seed song. Grow like a plant!",
      main: "Read 'The Tiny Seed'. Follow the tiny seed's journey! What does it need to grow?",
      activities: "Plant a seed! Each child plants bean seed in clear cup to watch it grow. Label with names.",
      closing: "We'll watch our seeds every day! Theme song.",
      materials: ["Book: The Tiny Seed", "Clear cups", "Soil", "Bean seeds", "Water"]
    },
    wednesdayPlan: {
      focus: "Book 2: From Seed to Pumpkin",
      warmup: "Theme song. Check on our seeds! Any changes?",
      main: "Read 'From Seed to Pumpkin'. The whole cycle: seed → sprout → plant → flower → fruit → seeds!",
      activities: "Life cycle wheel craft - make spinning wheel showing seed, sprout, plant, flower.",
      closing: "Plants make more seeds - the cycle continues! Theme song.",
      materials: ["Book: From Seed to Pumpkin", "Paper plates", "Brad fasteners", "Crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Life cycle in order - what comes first? Next?",
      main: "Review: What do plants need? (Water, sun, soil) What are the parts? (Roots, stem, leaves, flower) Check our seeds!",
      activities: "Plant art - paint or draw a plant with all its parts. Label: roots, stem, leaves, flower.",
      closing: "We're plant experts! Theme song.",
      materials: ["Paper", "Paint/crayons", "Part labels"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Growing letter movements.",
      main: "Focus letters: S (seed, stem, sun), P (plant), R (roots). Practice sounds.",
      activities: "Letter sound garden - plant letter seeds, grow letter plants! Letter matching with plant words.",
      closing: "Keep watching those seeds! Have a great weekend!",
      materials: ["Letter cards", "Plant word cards"]
    }
  },

  // ============ WEEK 12: Animal Life Cycle ============
  {
    week: 12,
    theme: "Animal Life Cycle",
    icon: "🐛",
    color: "#f59e0b",
    song: {
      title: "The Butterfly Song",
      actions: "Curl up (caterpillar), wrap up (cocoon), burst out and fly (butterfly)!"
    },
    vocabulary: ["egg", "caterpillar", "cocoon", "butterfly", "tadpole", "frog", "chick", "hen", "baby", "adult"],
    books: [
      {
        title: "The Very Hungry Caterpillar",
        author: "Eric Carle",
        activities: ["Butterfly life cycle accordion", "Act out the life cycle"]
      },
      {
        title: "From Tadpole to Frog",
        author: "Wendy Pfeffer",
        activities: ["Frog cycle wheel", "Compare butterfly and frog cycles"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "What's your favorite animal? Animals grow and change too!",
      main: "Introduce Animal Life Cycles. Teach butterfly song. Show flashcards - stages of butterfly and frog.",
      activities: "Act out butterfly life cycle - be an egg, hatch, eat, cocoon, emerge, fly!",
      closing: "Animals change as they grow! Theme song.",
      materials: ["Vocabulary flashcards", "Life cycle pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Very Hungry Caterpillar",
      warmup: "Butterfly song with movements. What comes first - egg or butterfly?",
      main: "Read 'The Very Hungry Caterpillar'. Focus on the CHANGES - egg, caterpillar, cocoon, butterfly!",
      activities: "Butterfly life cycle accordion - fold paper, draw 4 stages: egg, caterpillar, cocoon, butterfly.",
      closing: "Caterpillars become butterflies! Theme song.",
      materials: ["Book: The Very Hungry Caterpillar", "Paper strips", "Crayons"]
    },
    wednesdayPlan: {
      focus: "Book 2: From Tadpole to Frog",
      warmup: "Theme song. Review butterfly stages.",
      main: "Read 'From Tadpole to Frog'. Another life cycle! Egg → tadpole → tadpole with legs → froglet → frog!",
      activities: "Frog cycle wheel - spinning wheel showing all frog stages.",
      closing: "Two different life cycles! Theme song.",
      materials: ["Book: From Tadpole to Frog", "Paper plates", "Brad fasteners", "Crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Life cycle quiz - show me with your body!",
      main: "Review: How are butterfly and frog cycles SAME? (Start as eggs, change, become adults) DIFFERENT? (Water vs land, number of stages)",
      activities: "Choose your favorite - make butterfly OR frog life cycle art project. Share and compare.",
      closing: "Animals are amazing! Theme song.",
      materials: ["Various craft supplies", "Life cycle examples"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: E (egg), B (butterfly), F (frog). Practice sounds in life cycle words.",
      activities: "Letter hop - hop to letters like a frog! Letter matching. Caterpillar letter line.",
      closing: "Great life cycle learning! See you Monday!",
      materials: ["Letter cards", "Floor letters for hopping"]
    }
  },

  // ============ WEEK 13: Thanksgiving ============
  {
    week: 13,
    theme: "Thanksgiving",
    icon: "🦃",
    color: "#92400e",
    song: {
      title: "Thank You Song",
      actions: "Hands on heart, bow thank you, spread arms wide"
    },
    vocabulary: ["thankful", "grateful", "family", "feast", "turkey", "pumpkin", "corn", "harvest", "share", "love"],
    books: [
      {
        title: "Bear Says Thank You",
        author: "Karma Wilson",
        activities: ["Thankful turkey hand craft", "Gratitude circle sharing"]
      },
      {
        title: "Thanks for Thanksgiving",
        author: "Julie Markes",
        activities: ["Thankful book creation", "Feast planning discussion"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "What does THANKFUL mean? Being happy for what we have!",
      main: "Introduce Thanksgiving. Teach thank you song. Show vocabulary flashcards about gratitude and harvest.",
      activities: "Gratitude circle - each child shares one thing they're thankful for.",
      closing: "Being thankful makes us feel good! Theme song.",
      materials: ["Vocabulary flashcards", "Gratitude jar"]
    },
    tuesdayPlan: {
      focus: "Book 1: Bear Says Thank You",
      warmup: "Thank you song. Practice saying 'thank you' to friends.",
      main: "Read 'Bear Says Thank You'. Bear is thankful for friends and food! What about you?",
      activities: "Thankful turkey craft - trace hand, write thankful things on each feather.",
      closing: "So many things to be thankful for! Theme song.",
      materials: ["Book", "Paper", "Crayons", "Feather shapes"]
    },
    wednesdayPlan: {
      focus: "Book 2: Thanks for Thanksgiving",
      warmup: "Theme song. What are you thankful for today?",
      main: "Read 'Thanks for Thanksgiving'. So many wonderful things! Family, food, nature, friends...",
      activities: "Make thankful book - each page: 'I am thankful for...' with drawing.",
      closing: "Our hearts are full of thanks! Theme song.",
      materials: ["Book", "Paper", "Stapler", "Crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Thankful vocabulary review.",
      main: "Review: What is Thanksgiving about? Being with family, saying thanks, sharing food. What does YOUR family do?",
      activities: "Thanksgiving feast drawing - draw your family at Thanksgiving table with favorite foods.",
      closing: "Happy Thanksgiving to all! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: T (thankful, turkey), F (family, feast), P (pumpkin). Practice sounds.",
      activities: "Turkey letter matching. Thankful word beginning sounds. Letter decorating.",
      closing: "Thankful for learning together! Happy Thanksgiving!",
      materials: ["Letter cards", "Turkey shapes"]
    }
  },

  // ============ WEEK 14: Community Helpers ============
  {
    week: 14,
    theme: "Community Helpers",
    icon: "👨‍⚕️",
    color: "#0ea5e9",
    song: {
      title: "People in Your Neighborhood",
      actions: "Act out each helper as you sing - driving, bandaging, delivering mail..."
    },
    vocabulary: ["doctor", "nurse", "teacher", "police", "firefighter", "mail", "chef", "farmer", "helper", "community"],
    books: [
      {
        title: "Whose Hat Is This?",
        author: "Sharon Katz Cooper",
        activities: ["Match hats to helpers game", "Dress up and act out"]
      },
      {
        title: "Career Day",
        author: "Anne Rockwell",
        activities: ["When I Grow Up drawing", "Match tools to helpers"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Who helps YOU? Doctor when sick? Teacher at school? Let's learn about helpers!",
      main: "Introduce Community Helpers. Teach neighborhood song. Show helper flashcards - what do they do?",
      activities: "Helper actions - act out what each helper does. Guess who!",
      closing: "Helpers make our community great! Theme song.",
      materials: ["Vocabulary flashcards", "Helper pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: Whose Hat Is This?",
      warmup: "Helper song. Act out a helper - friends guess!",
      main: "Read 'Whose Hat Is This?' Each helper has special things they wear! Match hats to helpers.",
      activities: "Hat matching game. Dress up station - try on helper hats/props, act out what they do.",
      closing: "Helpers have special tools! Theme song.",
      materials: ["Book", "Various hats/props", "Matching cards"]
    },
    wednesdayPlan: {
      focus: "Book 2: Career Day",
      warmup: "Theme song. Helper vocabulary review.",
      main: "Read 'Career Day'. The kids share about their parents' jobs! What do YOUR family members do?",
      activities: "When I Grow Up drawing - draw yourself as the helper you want to be! Share with class.",
      closing: "You can be anything! Theme song.",
      materials: ["Book", "Paper", "Crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Name all the helpers we learned!",
      main: "Review: What does each helper do? What tools do they use? How do they help us?",
      activities: "Helper tool matching - stethoscope→doctor, hose→firefighter, mail bag→mail carrier...",
      closing: "Thank you to all helpers! Theme song.",
      materials: ["Tool pictures", "Helper pictures"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: D (doctor), P (police), F (firefighter). Practice sounds.",
      activities: "Helper beginning sounds sort. Letter matching. Helper name writing practice.",
      closing: "Great helper week! See you Monday!",
      materials: ["Letter cards", "Helper word cards"]
    }
  },

  // ============ WEEK 15: Safety Heroes ============
  {
    week: 15,
    theme: "Safety Heroes",
    icon: "🚒",
    color: "#dc2626",
    song: {
      title: "Hurry Hurry Drive the Fire Truck",
      actions: "Drive truck, spray hose, climb ladder, ring bell!"
    },
    vocabulary: ["firefighter", "police", "ambulance", "emergency", "safe", "help", "911", "hero", "rescue", "brave"],
    books: [
      {
        title: "Fire Fighters",
        author: "Norma Simon",
        activities: ["Stop Drop Roll practice", "Fire truck shape craft"]
      },
      {
        title: "Police Officers on Patrol",
        author: "Kersten Hamilton",
        activities: ["911 practice role play", "Safety badge craft"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "What sound does a fire truck make? WEEE-OOO! Let's learn about safety heroes!",
      main: "Introduce Safety Heroes - people who keep us safe! Teach fire truck song. Show flashcards.",
      activities: "Safety hero actions - spray like firefighter, direct like police, bandage like paramedic.",
      closing: "Safety heroes are brave! Theme song.",
      materials: ["Vocabulary flashcards", "Safety hero pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: Fire Fighters",
      warmup: "Fire truck song. What do firefighters wear? Why?",
      main: "Read 'Fire Fighters'. They put out fires AND help in emergencies! Learn Stop, Drop, Roll.",
      activities: "STOP DROP ROLL practice! Fire truck craft - rectangles, circles, triangles to build truck.",
      closing: "We know what to do if there's fire! Theme song.",
      materials: ["Book", "Shape cutouts", "Glue", "Paper"]
    },
    wednesdayPlan: {
      focus: "Book 2: Police Officers on Patrol",
      warmup: "Theme song. Review Stop Drop Roll.",
      main: "Read 'Police Officers on Patrol'. Police keep us safe! They help when we're lost or scared.",
      activities: "911 practice - pretend phone, when do we call? Role play. Make safety badge craft.",
      closing: "911 is for EMERGENCIES only! Theme song.",
      materials: ["Book", "Play phone", "Badge templates", "Foil/decorations"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Safety quiz - what do we do if...?",
      main: "Review: Firefighters (fire, rescue), Police (safety, lost), Paramedics (hurt, sick). When call 911?",
      activities: "Safety heroes poster - draw all the safety heroes helping people.",
      closing: "Safety heroes keep our community safe! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: F (fire, firefighter), P (police), S (safe, stop). Practice sounds.",
      activities: "Safety word sound sort. Fire truck letters. Emergency number 9-1-1 practice.",
      closing: "Stay safe! Have a great weekend!",
      materials: ["Letter cards", "Number cards"]
    }
  },

  // ============ WEEK 16: Christmas ============
  {
    week: 16,
    theme: "Christmas",
    icon: "🎄",
    color: "#16a34a",
    song: {
      title: "Jingle Bells",
      actions: "Ring pretend bells, gallop like horses, spread arms for sleigh ride"
    },
    vocabulary: ["Christmas", "tree", "star", "gift", "give", "family", "snow", "Santa", "reindeer", "joy"],
    books: [
      {
        title: "The Biggest Christmas Tree Ever",
        author: "Steven Kroll",
        activities: ["Ornament craft for class tree", "Count ornaments math game"]
      },
      {
        title: "The Gift of Nothing",
        author: "Patrick McDonnell",
        activities: ["Gift of love discussion", "Handmade card for family"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "It's almost Christmas! What are you excited about?",
      main: "Introduce Christmas theme. Teach Jingle Bells with actions. Show vocabulary flashcards.",
      activities: "Christmas vocabulary games. What do you see at Christmas? Trees, lights, presents, family...",
      closing: "Christmas is about love and giving! Theme song.",
      materials: ["Vocabulary flashcards", "Jingle bells if available"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Biggest Christmas Tree Ever",
      warmup: "Jingle Bells song. Ring those bells!",
      main: "Read 'The Biggest Christmas Tree Ever'. Working together makes the best tree!",
      activities: "Make ornaments for class tree - paper shapes, glitter, string. Count ornaments - math game!",
      closing: "Our tree looks beautiful! Theme song.",
      materials: ["Book", "Paper shapes", "Glitter", "String", "Class tree"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Gift of Nothing",
      warmup: "Theme song. What's the best gift?",
      main: "Read 'The Gift of Nothing'. The best gift is LOVE! Being together, hugs, kindness.",
      activities: "Gift of love discussion - what can we give without buying? Hugs, help, drawings, time. Make cards for family.",
      closing: "Love is the best gift! Theme song.",
      materials: ["Book", "Card paper", "Crayons", "Decorations"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Christmas vocabulary review.",
      main: "Review: What is Christmas about? Family, giving, love, kindness. What does YOUR family do?",
      activities: "Christmas scene drawing - draw your family celebrating Christmas.",
      closing: "Merry Christmas to all! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Holiday letter sounds.",
      main: "Focus letters: C (Christmas), G (gift, give), S (Santa, star). Practice sounds.",
      activities: "Christmas word beginning sounds. Candy cane letter C craft. Gift box letter G.",
      closing: "Happy Holidays! See you next year!",
      materials: ["Letter cards", "Holiday craft supplies"]
    }
  },

  // ============ WEEK 17: Winter ============
  {
    week: 17,
    theme: "Winter",
    icon: "❄️",
    color: "#0284c7",
    song: {
      title: "Snowflake, Snowflake, Little Snowflake",
      actions: "Float like snowflake, spin gently, land softly"
    },
    vocabulary: ["winter", "cold", "snow", "ice", "mittens", "coat", "scarf", "boots", "hibernate", "freeze"],
    books: [
      {
        title: "The Snowy Day",
        author: "Ezra Jack Keats",
        activities: ["Paper snowflake cutting", "Winter dress-up sequence"]
      },
      {
        title: "Animals in Winter",
        author: "Henrietta Bancroft",
        activities: ["Hibernate/migrate sort", "Winter animal craft"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Brrr! Is it cold outside? It's WINTER! Let's learn about this chilly season!",
      main: "Introduce Winter. Teach snowflake song. Show vocabulary flashcards - winter words.",
      activities: "Winter actions - shiver, put on coat, make snowball, ice skate...",
      closing: "Winter can be cold but fun! Theme song.",
      materials: ["Vocabulary flashcards", "Winter clothing items"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Snowy Day",
      warmup: "Snowflake song. Float like snowflakes!",
      main: "Read 'The Snowy Day'. Peter plays in snow! What does he do? Tracks, snowball, angels...",
      activities: "Paper snowflake craft - fold and cut. Each one unique! Winter dress-up - correct order for getting dressed.",
      closing: "Snowflakes are beautiful! Theme song.",
      materials: ["Book: The Snowy Day", "White paper", "Scissors", "Winter clothes"]
    },
    wednesdayPlan: {
      focus: "Book 2: Animals in Winter",
      warmup: "Theme song. What do you do in winter?",
      main: "Read 'Animals in Winter'. Animals do different things! Hibernate (sleep), migrate (move), or stay and adapt.",
      activities: "Animal sorting - hibernate, migrate, or stay? Bears hibernate, birds migrate, rabbits stay and grow thick fur!",
      closing: "Animals are smart about winter! Theme song.",
      materials: ["Book", "Animal cards", "Sorting mat"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Winter vocabulary quiz.",
      main: "Review: What happens in winter? Cold, snow, ice. What do we wear? What do animals do?",
      activities: "Winter scene art - draw or paint a winter scene with snow, animals, people in warm clothes.",
      closing: "Winter wonderland! Theme song.",
      materials: ["Paper", "Paint/crayons", "Cotton balls for snow"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: W (winter), S (snow), C (cold, coat). Practice sounds.",
      activities: "Snowflake letters. Winter word sound sort. Write letters in 'snow' (white salt/flour).",
      closing: "Stay warm! Great winter week!",
      materials: ["Letter cards", "Salt/flour trays"]
    }
  },

  // ============ WEEK 18: Weather ============
  {
    week: 18,
    theme: "Weather",
    icon: "🌤️",
    color: "#fbbf24",
    song: {
      title: "What's the Weather Like Today?",
      actions: "Look out window, show each weather type with body"
    },
    vocabulary: ["sunny", "cloudy", "rainy", "snowy", "windy", "hot", "cold", "weather", "storm", "rainbow"],
    books: [
      {
        title: "Oh Say Can You Say What's the Weather Today?",
        author: "Tish Rabe",
        activities: ["Weather wheel craft", "Weather dance movements"]
      },
      {
        title: "Cloudy With a Chance of Meatballs",
        author: "Judi Barrett",
        activities: ["Silly weather drawing", "Weather dress-up match"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Look outside! What's the weather today? Let's learn about weather!",
      main: "Introduce Weather. Teach weather song. Show flashcards - sunny, cloudy, rainy, snowy, windy.",
      activities: "Weather actions - sunshine stretch, rain fingers, wind sway, snow twirl.",
      closing: "Weather changes every day! Theme song.",
      materials: ["Vocabulary flashcards", "Weather pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: Oh Say Can You Say What's the Weather Today?",
      warmup: "Weather song. What weather is it today?",
      main: "Read 'Oh Say Can You Say What's the Weather Today?' Dr. Seuss characters learn about weather!",
      activities: "Weather wheel craft - make spinner to track daily weather. Practice weather dance for each type.",
      closing: "We're weather watchers! Theme song.",
      materials: ["Book", "Paper plates", "Brad fasteners", "Weather symbols"]
    },
    wednesdayPlan: {
      focus: "Book 2: Cloudy With a Chance of Meatballs",
      warmup: "Theme song. Check weather today.",
      main: "Read 'Cloudy With a Chance of Meatballs'. Silly! What if it rained food? What would YOU want it to rain?",
      activities: "Silly weather drawing - what if it rained cookies? Snowed ice cream? Draw your silly weather!",
      closing: "Weather is usually not food! But fun to imagine! Theme song.",
      materials: ["Book", "Paper", "Crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Name all weather types.",
      main: "Review: Types of weather. How does weather affect us? What we wear, what we do, how we feel.",
      activities: "Weather dress-up match - match clothing to weather. Umbrella for rain, shorts for hot, coat for cold...",
      closing: "We're ready for any weather! Theme song.",
      materials: ["Clothing cards", "Weather cards"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: W (weather, windy), R (rain, rainbow), S (sunny, snow). Practice sounds.",
      activities: "Weather word beginning sounds. Rainbow letter art. Cloud letter shapes.",
      closing: "Whatever the weather, have a great weekend!",
      materials: ["Letter cards", "Cotton balls", "Rainbow colors"]
    }
  },

  // ============ WEEK 19: Beijing ============
  {
    week: 19,
    theme: "Beijing",
    icon: "🏯",
    color: "#ef4444",
    song: {
      title: "Hello in Chinese - 你好歌",
      actions: "Wave hello, bow respectfully, say 你好 (nǐ hǎo)"
    },
    vocabulary: ["Beijing", "China", "Great Wall", "panda", "dumpling", "dragon", "lantern", "temple", "palace", "noodles"],
    books: [
      {
        title: "D is for Dragon Dance",
        author: "Ying Chang Compestine",
        activities: ["Paper plate dragon craft", "Dragon dance parade"]
      },
      {
        title: "The Story of Noodles",
        author: "Ying Chang Compestine",
        activities: ["Build Great Wall with blocks", "Learn Chinese words"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Today we travel to BEIJING! 你好 (nǐ hǎo) means hello in Chinese!",
      main: "Introduce Beijing, China. Teach hello song in Chinese. Show flashcards - Beijing landmarks and culture.",
      activities: "Practice saying 你好 (hello), 谢谢 (thank you). Find China on map/globe!",
      closing: "Beijing is amazing! Theme song.",
      materials: ["Vocabulary flashcards", "World map", "Globe"]
    },
    tuesdayPlan: {
      focus: "Book 1: D is for Dragon Dance",
      warmup: "Chinese hello song. Say 你好 to friends!",
      main: "Read 'D is for Dragon Dance'. Dragons are lucky in China! Dragon dances are at celebrations.",
      activities: "Paper plate dragon craft - plate face with streamers. Dragon dance parade around room!",
      closing: "Dragons bring good luck! Theme song.",
      materials: ["Book", "Paper plates", "Streamers", "Paint"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Story of Noodles",
      warmup: "Theme song. Chinese vocabulary review.",
      main: "Read 'The Story of Noodles'. Chinese food is delicious! Noodles, dumplings, rice...",
      activities: "Build the Great Wall with blocks - work together! Learn more Chinese words.",
      closing: "The Great Wall is HUGE! Theme song.",
      materials: ["Book", "Building blocks", "Great Wall pictures"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Beijing vocabulary review.",
      main: "Review: Where is Beijing? What did we learn about? Great Wall, dragons, pandas, food, Chinese words...",
      activities: "Beijing art - draw something from Beijing (Great Wall, panda, dragon, lantern).",
      closing: "再见 (zài jiàn) means goodbye! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: D (dragon, dumpling), P (panda, palace), G (Great Wall). Practice sounds.",
      activities: "Dragon letter D craft. Panda P. Great Wall G with blocks.",
      closing: "Great Beijing week! 再见!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 20: China ============
  {
    week: 20,
    theme: "China",
    icon: "🐼",
    color: "#000000",
    song: {
      title: "Chinese Counting Song - Yī, Èr, Sān",
      actions: "Hold up fingers as you count: 一 (yī), 二 (èr), 三 (sān), 四 (sì), 五 (wǔ)"
    },
    vocabulary: ["China", "Asia", "panda", "bamboo", "rice", "tea", "silk", "fan", "chopsticks", "zodiac"],
    books: [
      {
        title: "Panda Bear, Panda Bear, What Do You See?",
        author: "Bill Martin Jr.",
        activities: ["Paper plate panda craft", "Panda walk movement"]
      },
      {
        title: "Tikki Tikki Tembo",
        author: "Arlene Mosel",
        activities: ["Long name fun game", "Chinese fan craft"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "More about China! Let's count in Chinese: 一, 二, 三!",
      main: "Learn more about China. Teach counting song. Show flashcards - animals, food, culture of China.",
      activities: "Count to 10 in Chinese! Practice with fingers. China on map - in ASIA, biggest continent!",
      closing: "China is fascinating! Theme song.",
      materials: ["Vocabulary flashcards", "World map"]
    },
    tuesdayPlan: {
      focus: "Book 1: Panda Bear, Panda Bear, What Do You See?",
      warmup: "Chinese counting song. Count to 5 in Chinese!",
      main: "Read 'Panda Bear, Panda Bear'. Pandas are China's special treasure! They eat bamboo.",
      activities: "Paper plate panda craft - black ears, eyes, nose. Panda walk - waddle slowly like pandas!",
      closing: "Pandas are endangered - we must protect them! Theme song.",
      materials: ["Book", "Paper plates", "Black paper", "Glue"]
    },
    wednesdayPlan: {
      focus: "Book 2: Tikki Tikki Tembo",
      warmup: "Theme song. Panda vocabulary review.",
      main: "Read 'Tikki Tikki Tembo'. A Chinese folktale! Can you say the long name? Practice together!",
      activities: "Long name game - try to say it! Chinese fan craft - accordion fold paper, decorate.",
      closing: "Chinese stories are fun! Theme song.",
      materials: ["Book", "Paper", "Crayons", "Craft sticks"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Count in Chinese. Say hello and goodbye.",
      main: "Review: What animals live in China? (panda, dragon) What food? (rice, noodles, dumplings) What continent? (Asia)",
      activities: "China collage - cut/draw things from China and arrange on paper.",
      closing: "China is amazing! Theme song.",
      materials: ["Paper", "Magazines", "Scissors", "Glue"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: P (panda), B (bamboo), R (rice). Practice sounds in China words.",
      activities: "Panda P craft. Bamboo letter sticks. Rice letter R (glue rice to letter).",
      closing: "再见 China! Great week!",
      materials: ["Letter cards", "Green sticks", "Rice", "Glue"]
    }
  },

  // ============ WEEK 21: Chinese New Year ============
  {
    week: 21,
    theme: "Chinese New Year",
    icon: "🧧",
    color: "#dc2626",
    song: {
      title: "Gong Xi Gong Xi 恭喜恭喜",
      actions: "Hands together, bow, shake hands for good luck"
    },
    vocabulary: ["new year", "red", "lucky", "dragon", "lion", "fireworks", "envelope", "lantern", "feast", "family"],
    books: [
      {
        title: "Bringing in the New Year",
        author: "Grace Lin",
        activities: ["Red envelope craft", "Lion dance movement"]
      },
      {
        title: "My First Chinese New Year",
        author: "Karen Katz",
        activities: ["Paper lantern craft", "Zodiac animal discussion"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "恭喜发财 (Gōng xǐ fā cái)! Happy New Year! It's Chinese New Year!",
      main: "Introduce Chinese New Year - biggest celebration in China! Teach celebration song. Show flashcards.",
      activities: "Why RED? Red is lucky! Find red things in classroom. Lucky wishes for new year.",
      closing: "Chinese New Year is exciting! Theme song.",
      materials: ["Vocabulary flashcards", "Red items"]
    },
    tuesdayPlan: {
      focus: "Book 1: Bringing in the New Year",
      warmup: "New Year song. Say 恭喜!",
      main: "Read 'Bringing in the New Year'. Family prepares together! Clean house, cook food, decorate with red.",
      activities: "Red envelope (红包) craft - make red envelopes to give to friends. Lion dance practice - shake head, jump!",
      closing: "Red envelopes bring good luck! Theme song.",
      materials: ["Book", "Red paper", "Gold markers", "Stickers"]
    },
    wednesdayPlan: {
      focus: "Book 2: My First Chinese New Year",
      warmup: "Theme song. Lion dance moves!",
      main: "Read 'My First Chinese New Year'. Learn about traditions! Lanterns, zodiac animals, special foods.",
      activities: "Paper lantern craft - fold, cut, create beautiful lantern. Zodiac animal discussion - what year animal are you?",
      closing: "Lanterns light up the celebration! Theme song.",
      materials: ["Book", "Red/gold paper", "Scissors", "Glue", "Zodiac chart"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Chinese New Year vocabulary review.",
      main: "Review: What happens at Chinese New Year? (Red, family, food, dragon/lion dance, fireworks, envelopes, lanterns)",
      activities: "Chinese New Year celebration drawing - draw the celebration with dragons, lanterns, red envelopes, family.",
      closing: "Happy Chinese New Year! 新年快乐!",
      materials: ["Paper", "Crayons", "Red items"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: R (red), L (lucky, lantern), D (dragon). Practice sounds.",
      activities: "Red R craft. Lucky lantern L. Dragon D dance!",
      closing: "新年快乐! Happy New Year! Great celebration week!",
      materials: ["Letter cards", "Red paper", "Craft supplies"]
    }
  },

  // ============ WEEK 22: Seven Continents ============
  {
    week: 22,
    theme: "Seven Continents",
    icon: "🌍",
    color: "#22c55e",
    song: {
      title: "Seven Continents Song",
      actions: "Point to each continent on map as you sing"
    },
    vocabulary: ["continent", "Asia", "Africa", "Europe", "North America", "South America", "Australia", "Antarctica", "Earth", "map"],
    books: [
      {
        title: "Me on the Map",
        author: "Joan Sweeney",
        activities: ["Zoom out discussion", "Continent puzzle"]
      },
      {
        title: "Mapping Penny's World",
        author: "Loreen Leedy",
        activities: ["Color continent map", "Match animals to continents"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Our Earth is SO BIG! It has 7 giant pieces of land called CONTINENTS!",
      main: "Introduce 7 Continents. Teach continent song. Show each continent on map - name and point!",
      activities: "Practice saying all 7: Asia, Africa, North America, South America, Europe, Australia, Antarctica. Use body movements!",
      closing: "7 continents - one amazing Earth! Theme song.",
      materials: ["World map", "Continent flashcards", "Globe"]
    },
    tuesdayPlan: {
      focus: "Book 1: Me on the Map",
      warmup: "Continent song. Point to each one!",
      main: "Read 'Me on the Map'. Zoom out: Me → Room → House → Street → City → Country → Continent → Earth!",
      activities: "Continent puzzle - put pieces in right places. Where do WE live? Which continent?",
      closing: "We live on a continent on planet Earth! Theme song.",
      materials: ["Book", "World puzzle", "Map"]
    },
    wednesdayPlan: {
      focus: "Book 2: Mapping Penny's World",
      warmup: "Theme song. Name all 7 continents challenge!",
      main: "Read 'Mapping Penny's World'. Maps show us where things are! Each continent has special animals.",
      activities: "Color continent map - each continent different color. Match animals to continents game.",
      closing: "Animals live all around the world! Theme song.",
      materials: ["Book", "World map outline", "Crayons", "Animal cards"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Continent quiz - point to the one I name!",
      main: "Review: Which is biggest? (Asia) Coldest? (Antarctica) Where do penguins live? Kangaroos? Elephants?",
      activities: "My Continent art - draw the continent you want to visit with animals that live there.",
      closing: "Our world is amazing! Theme song.",
      materials: ["Paper", "Crayons", "Animal pictures"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: A (Asia, Africa, Antarctica, Australia!), E (Europe, Earth). Practice sounds.",
      activities: "Continent beginning sounds. Earth letter craft. World map letter matching.",
      closing: "Great continent week! The whole world!",
      materials: ["Letter cards", "World map"]
    }
  },

  // ============ WEEK 23: Five Oceans ============
  {
    week: 23,
    theme: "Five Oceans",
    icon: "🌊",
    color: "#0284c7",
    song: {
      title: "A Sailor Went to Sea",
      actions: "Rock like waves, swim, look through telescope"
    },
    vocabulary: ["ocean", "Pacific", "Atlantic", "Indian", "Arctic", "Southern", "wave", "fish", "whale", "ship"],
    books: [
      {
        title: "Commotion in the Ocean",
        author: "Giles Andreae",
        activities: ["Ocean in a bottle craft", "Ocean animal movements"]
      },
      {
        title: "The Pout-Pout Fish",
        author: "Deborah Diesen",
        activities: ["Ocean scene craft", "Name the oceans game"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Most of Earth is covered in WATER! Let's learn about oceans!",
      main: "Introduce 5 Oceans. Teach sailor song. Show oceans on map - Pacific (biggest!), Atlantic, Indian, Southern, Arctic.",
      activities: "Ocean wave movements. Name the 5 oceans. Which is biggest? Coldest? Where sharks live?",
      closing: "Oceans are amazing! Theme song.",
      materials: ["World map", "Ocean flashcards"]
    },
    tuesdayPlan: {
      focus: "Book 1: Commotion in the Ocean",
      warmup: "Ocean song. Wave like the ocean!",
      main: "Read 'Commotion in the Ocean'. So many ocean animals! Whales, sharks, dolphins, octopus, jellyfish...",
      activities: "Ocean in a bottle - water, blue dye, oil, glitter. Shake and watch waves! Ocean animal movements.",
      closing: "The ocean is full of life! Theme song.",
      materials: ["Book", "Clear bottles", "Water", "Blue dye", "Oil", "Glitter"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Pout-Pout Fish",
      warmup: "Theme song. Name ocean animals!",
      main: "Read 'The Pout-Pout Fish'. Even fish have feelings! But friends help us feel better.",
      activities: "Ocean scene craft - blue paper, fish shapes, seaweed, coral. Name the 5 oceans while crafting.",
      closing: "Beautiful ocean art! Theme song.",
      materials: ["Book", "Blue paper", "Fish shapes", "Glue", "Scissors"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Name all 5 oceans challenge!",
      main: "Review: 5 oceans, ocean animals, why oceans matter (food, air, weather). We must keep oceans clean!",
      activities: "Ocean animal art - draw or paint your favorite ocean animal in the water.",
      closing: "Take care of our oceans! Theme song.",
      materials: ["Paper", "Paint/crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: O (ocean), W (water, whale, wave), F (fish). Practice sounds.",
      activities: "Ocean O craft. Whale W. Fish F. Ocean word sound sort.",
      closing: "Wonderful ocean week! Swim into the weekend!",
      materials: ["Letter cards", "Blue craft supplies"]
    }
  },

  // ============ WEEK 24: Asia ============
  {
    week: 24,
    theme: "Asia",
    icon: "🗻",
    color: "#f59e0b",
    song: {
      title: "Hello Around the World - Asian Languages",
      actions: "Bow hello in different ways for each country"
    },
    vocabulary: ["Asia", "China", "Japan", "India", "tiger", "elephant", "panda", "sushi", "rice", "temple"],
    books: [
      {
        title: "A is for Asia",
        author: "Cynthia Chin-Lee",
        activities: ["Asian animal craft", "Find countries on Asia map"]
      },
      {
        title: "Grandfather's Journey",
        author: "Allen Say",
        activities: ["Japan introduction", "Simple origami"]
      }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Asia is the BIGGEST continent! Let's explore it!",
      main: "Introduce Asia. Teach hello song in different Asian languages. Show flashcards - countries, animals, landmarks.",
      activities: "Find Asia on map. It has China, Japan, India, and many more countries! Say hello in Chinese, Japanese, Hindi.",
      closing: "Asia is diverse and amazing! Theme song.",
      materials: ["Asia map", "Vocabulary flashcards", "Globe"]
    },
    tuesdayPlan: {
      focus: "Book 1: A is for Asia",
      warmup: "Hello song in Asian languages. Find Asia on map!",
      main: "Read 'A is for Asia'. So many countries, cultures, foods, animals! What surprised you?",
      activities: "Asian animal craft - choose: tiger stripes, elephant, panda. Match animals to Asian countries.",
      closing: "Asia has amazing animals! Theme song.",
      materials: ["Book", "Paper", "Paint/crayons"]
    },
    wednesdayPlan: {
      focus: "Book 2: Grandfather's Journey",
      warmup: "Theme song. Asia vocabulary review.",
      main: "Read 'Grandfather's Journey'. This story is about Japan! Beautiful country with mountains, cherry blossoms.",
      activities: "Simple origami attempt - fold paper into dog face or boat. Japanese style! Learn こんにちは (konnichiwa = hello).",
      closing: "Japan is beautiful! Theme song.",
      materials: ["Book", "Origami paper", "Folding instructions"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Name countries in Asia.",
      main: "Review: Asia - biggest continent. Countries: China, Japan, India, Korea, Thailand... Animals, food, cultures are different but all Asian!",
      activities: "Asia postcard - draw something from Asia you'd like to see. Write/dictate a message.",
      closing: "Asia is a wonderful continent! Theme song.",
      materials: ["Cardstock", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: A (Asia), J (Japan), I (India). Practice sounds in Asian words.",
      activities: "Asia A craft. Japan J with cherry blossoms. India I with elephant.",
      closing: "Amazing Asia week! See you Monday!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 25: Japan ============
  {
    week: 25,
    theme: "Japan",
    icon: "🗾",
    color: "#ef4444",
    song: {
      title: "Sakura Sakura (Cherry Blossoms)",
      actions: "Sway like cherry blossom trees, petals falling gently"
    },
    vocabulary: ["Japan", "Tokyo", "sushi", "origami", "kimono", "cherry blossom", "Mount Fuji", "bow", "chopsticks", "train"],
    books: [
      { title: "My First Book of Japanese Words", author: "Michelle Haney Brown", activities: ["Learn Japanese words", "Origami fish craft"] },
      { title: "The Boy Who Drew Cats", author: "Arthur A. Levine", activities: ["Cherry blossom art", "Practice bowing hello"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Today we explore JAPAN! こんにちは (konnichiwa) means hello!",
      main: "Introduce Japan. Teach cherry blossom song. Show flashcards - Mount Fuji, sushi, origami, cherry blossoms.",
      activities: "Practice Japanese: こんにちは (hello), ありがとう (thank you). Bow to say hello! Find Japan on map.",
      closing: "Japan is beautiful! Theme song.",
      materials: ["Vocabulary flashcards", "Asia map", "Japan pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: My First Book of Japanese Words",
      warmup: "Cherry blossom song. Say こんにちは!",
      main: "Read 'My First Book of Japanese Words'. Learn Japanese words for animals, food, family.",
      activities: "Origami fish craft - fold paper into fish shape. Count in Japanese: ichi, ni, san, shi, go!",
      closing: "Japanese is fun! Theme song.",
      materials: ["Book", "Origami paper", "Folding instructions"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Boy Who Drew Cats",
      warmup: "Theme song. Japanese vocabulary review.",
      main: "Read 'The Boy Who Drew Cats'. A Japanese folktale! Art can be powerful!",
      activities: "Cherry blossom art - brown paper tree, pink tissue paper blossoms. Practice bowing to say hello and thank you.",
      closing: "Beautiful Japanese art! Theme song.",
      materials: ["Book", "Brown paper", "Pink tissue paper", "Glue"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Japan quiz - what did we learn?",
      main: "Review: Japan - island country, Mount Fuji (volcano!), cherry blossoms, sushi, origami, bowing to be polite.",
      activities: "Japan scene drawing - draw Mount Fuji with cherry blossoms, or sushi, or Japanese house.",
      closing: "さようなら (sayonara) means goodbye! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: J (Japan), S (sushi, sakura), M (Mount Fuji). Practice sounds.",
      activities: "Japan J craft. Sushi S. Mount Fuji M with snow top.",
      closing: "さようなら Japan! Great week!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 26: The Earth ============
  {
    week: 26,
    theme: "The Earth",
    icon: "🌍",
    color: "#22c55e",
    song: {
      title: "He's Got the Whole World in His Hands",
      actions: "Cup hands around imaginary Earth, rock gently"
    },
    vocabulary: ["Earth", "planet", "land", "water", "mountain", "ocean", "forest", "desert", "nature", "home"],
    books: [
      { title: "The Earth Book", author: "Todd Parr", activities: ["Paint/color Earth", "Earth care discussion"] },
      { title: "What Does It Mean to Be Green?", author: "Rana DiOrio", activities: ["Take care of Earth discussion", "Recycling sort game"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "We live on planet EARTH! It's our home!",
      main: "Introduce Earth. Teach world song. Show flashcards - Earth from space, land, water, mountains, forests.",
      activities: "Earth is blue and green! Blue = water (oceans). Green = land. Most of Earth is water!",
      closing: "Earth is our beautiful home! Theme song.",
      materials: ["Vocabulary flashcards", "Globe", "Earth pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Earth Book",
      warmup: "World song. Hold your Earth!",
      main: "Read 'The Earth Book'. Simple ways to help Earth! Turn off lights, save water, recycle, plant trees.",
      activities: "Paint/color Earth craft - circle paper, blue and green. Discuss: What can WE do to help Earth?",
      closing: "We can all help Earth! Theme song.",
      materials: ["Book", "Circle paper", "Blue/green paint or crayons"]
    },
    wednesdayPlan: {
      focus: "Book 2: What Does It Mean to Be Green?",
      warmup: "Theme song. Earth vocabulary review.",
      main: "Read 'What Does It Mean to Be Green?' Being 'green' means taking care of Earth! Reduce, reuse, recycle!",
      activities: "Recycling sort game - paper, plastic, trash. Practice separating. Discuss: no littering!",
      closing: "Let's be green! Theme song.",
      materials: ["Book", "Items to sort", "Recycling bins"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Earth vocabulary quiz.",
      main: "Review: Earth has land, water, air. We need to take care of it! Turn off lights, recycle, don't litter, plant trees.",
      activities: "Earth Day poster - draw ways to help Earth. Display on wall.",
      closing: "We are Earth helpers! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: E (Earth), G (green), R (recycle). Practice sounds.",
      activities: "Earth E craft (green and blue). Green G. Recycle R with recycling symbol.",
      closing: "Take care of Earth this weekend!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 27: Landforms ============
  {
    week: 27,
    theme: "Landforms",
    icon: "⛰️",
    color: "#78716c",
    song: {
      title: "Going Over the Mountain",
      actions: "Climb up high, slide down, walk through valley"
    },
    vocabulary: ["mountain", "hill", "valley", "island", "lake", "river", "ocean", "desert", "forest", "plain"],
    books: [
      { title: "The Mountain That Loved a Bird", author: "Alice McLerran", activities: ["Playdough landforms", "Landform matching"] },
      { title: "Island: A Story of the Galapagos", author: "Jason Chin", activities: ["Make an island in water tray", "Animal habitats"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Earth has different shapes! Mountains, hills, valleys, islands!",
      main: "Introduce Landforms. Teach mountain song. Show flashcards - different landforms and what they look like.",
      activities: "Landform actions - be tall like a mountain, roll like a hill, flat like a plain, surrounded by water like an island.",
      closing: "Earth has amazing landforms! Theme song.",
      materials: ["Vocabulary flashcards", "Landform pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Mountain That Loved a Bird",
      warmup: "Mountain song. Climb the mountain!",
      main: "Read 'The Mountain That Loved a Bird'. Mountains are big and tall! What lives on mountains?",
      activities: "Playdough landforms - make mountain, hill, lake, island. Label each one.",
      closing: "We made landforms! Theme song.",
      materials: ["Book", "Playdough", "Blue paper for water", "Labels"]
    },
    wednesdayPlan: {
      focus: "Book 2: Island: A Story of the Galapagos",
      warmup: "Theme song. Name the landforms we learned.",
      main: "Read 'Island'. Islands are land surrounded by water! Special animals live on islands.",
      activities: "Make an island - mound of sand/clay in water tray. Add tiny plants and animals.",
      closing: "Islands are special! Theme song.",
      materials: ["Book", "Water tray", "Sand/clay", "Tiny plants/animals"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Landform quiz.",
      main: "Review: Mountain (tall), hill (small mountain), valley (between mountains), island (water all around), lake (water surrounded by land).",
      activities: "Landform scene - draw or paint a scene with different landforms. Label them.",
      closing: "Landforms are all around us! Theme song.",
      materials: ["Paper", "Crayons/paint"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: M (mountain), L (lake), I (island). Practice sounds.",
      activities: "Mountain M craft. Lake L (blue water). Island I.",
      closing: "Landform week complete! Have a great weekend!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 28: Animal Habitats ============
  {
    week: 28,
    theme: "Animal Habitats",
    icon: "🦁",
    color: "#ca8a04",
    song: {
      title: "The Animal Habitat Song",
      actions: "Act out animals from different habitats"
    },
    vocabulary: ["habitat", "forest", "ocean", "desert", "arctic", "jungle", "pond", "home", "live", "survive"],
    books: [
      { title: "A House is a House for Me", author: "Mary Ann Hoberman", activities: ["Match animals to habitats", "Habitat diorama"] },
      { title: "Over in the Ocean", author: "Marianne Berkes", activities: ["Ocean habitat craft", "Habitat movements"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Where do animals live? Their homes are called HABITATS!",
      main: "Introduce Animal Habitats. Teach habitat song. Show flashcards - forest, ocean, desert, arctic, jungle.",
      activities: "Match animals to habitats: polar bear→arctic, fish→ocean, monkey→jungle, camel→desert.",
      closing: "Animals live in the right habitat for them! Theme song.",
      materials: ["Vocabulary flashcards", "Animal and habitat pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: A House is a House for Me",
      warmup: "Habitat song. Name animal habitats!",
      main: "Read 'A House is a House for Me'. Everything has a home! A hive is a house for a bee, a pond is a house for a frog...",
      activities: "Habitat matching game - draw lines from animals to their habitat homes. Discuss why each animal lives there.",
      closing: "Every animal has the perfect home! Theme song.",
      materials: ["Book", "Matching worksheet", "Crayons"]
    },
    wednesdayPlan: {
      focus: "Book 2: Over in the Ocean",
      warmup: "Theme song. Habitat vocabulary review.",
      main: "Read 'Over in the Ocean'. Ocean habitat! Dolphins, octopus, fish, seahorses all live in the ocean.",
      activities: "Ocean habitat craft - blue paper background, add ocean animals, seaweed, coral. Shoebox diorama option.",
      closing: "The ocean is full of life! Theme song.",
      materials: ["Book", "Blue paper", "Animal cutouts", "Shoeboxes optional"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Habitat quiz - where does this animal live?",
      main: "Review all habitats: forest (deer, owl), ocean (whale, fish), desert (camel, snake), arctic (polar bear, penguin), jungle (monkey, parrot).",
      activities: "Choose your favorite habitat - create it! Draw, paint, or build with materials. Add animals that live there.",
      closing: "Amazing habitats! Theme song.",
      materials: ["Paper", "Various craft supplies"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: H (habitat, home), F (forest, fish), O (ocean). Practice sounds.",
      activities: "Habitat H craft. Forest F with trees. Ocean O with waves.",
      closing: "Great habitat week! See you Monday!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 29: Earth Day ============
  {
    week: 29,
    theme: "Earth Day",
    icon: "♻️",
    color: "#16a34a",
    song: {
      title: "Reduce, Reuse, Recycle",
      actions: "Make small (reduce), use again gesture (reuse), turn around (recycle)"
    },
    vocabulary: ["Earth Day", "recycle", "reduce", "reuse", "trash", "clean", "plant", "tree", "water", "protect"],
    books: [
      { title: "The Lorax", author: "Dr. Seuss", activities: ["Plant a seed", "Lorax discussion"] },
      { title: "The Great Trash Bash", author: "Loreen Leedy", activities: ["Trash to treasure craft", "Clean up practice"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Happy Earth Day! Today we celebrate and protect our planet!",
      main: "Introduce Earth Day. Teach 3 R's song. Show flashcards - reduce, reuse, recycle examples.",
      activities: "What do the 3 R's mean? REDUCE (use less), REUSE (use again), RECYCLE (make into new things).",
      closing: "We are Earth protectors! Theme song.",
      materials: ["Vocabulary flashcards", "3 R's pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Lorax",
      warmup: "3 R's song. Show me reduce, reuse, recycle actions!",
      main: "Read 'The Lorax'. The Lorax speaks for the trees! What happened when they cut all the trees? We must protect nature!",
      activities: "Plant a seed - each child plants a seed to help Earth. Discuss: how can we be like the Lorax?",
      closing: "Unless someone cares, nothing will change! Theme song.",
      materials: ["Book", "Seeds", "Cups", "Soil", "Water"]
    },
    wednesdayPlan: {
      focus: "Book 2: The Great Trash Bash",
      warmup: "Theme song. Earth Day vocabulary review.",
      main: "Read 'The Great Trash Bash'. Too much trash! What can we do? Reduce, reuse, recycle!",
      activities: "Trash to Treasure craft - use clean recyclables to make art. Cardboard tube robot? Bottle cap picture?",
      closing: "Trash can become treasure! Theme song.",
      materials: ["Book", "Clean recyclables", "Glue", "Paint"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. 3 R's quiz.",
      main: "Review: Why Earth Day? To remember to take care of our planet! Turn off lights, save water, recycle, plant trees, no littering.",
      activities: "Earth Day pledge - draw and sign promise to help Earth. Make Earth Day poster.",
      closing: "We promise to help Earth! Theme song.",
      materials: ["Paper", "Crayons", "Pledge template"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: R (reduce, reuse, recycle!), E (Earth), P (plant, protect). Practice sounds.",
      activities: "Recycling R craft. Earth E. Plant P with seed.",
      closing: "Happy Earth Day every day! Great week!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 30: Solar System ============
  {
    week: 30,
    theme: "Solar System",
    icon: "☀️",
    color: "#f59e0b",
    song: {
      title: "The Planet Song",
      actions: "Orbit around like planets, spin on axis"
    },
    vocabulary: ["sun", "planet", "Earth", "Mars", "Jupiter", "star", "moon", "orbit", "space", "solar system"],
    books: [
      { title: "There's No Place Like Space", author: "Tish Rabe", activities: ["Solar system mobile", "Planet order game"] },
      { title: "On the Moon", author: "Anna Milbourne", activities: ["Moonwalk movement", "Moon craters experiment"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "We're going to SPACE! 3, 2, 1... BLAST OFF!",
      main: "Introduce Solar System. Teach planet song. Show flashcards - sun, planets, moon, stars.",
      activities: "Solar system = sun + planets that go around it. Earth is a planet! We live here! Name other planets.",
      closing: "Space is amazing! Theme song.",
      materials: ["Vocabulary flashcards", "Solar system poster"]
    },
    tuesdayPlan: {
      focus: "Book 1: There's No Place Like Space",
      warmup: "Planet song. Name the planets!",
      main: "Read 'There's No Place Like Space'. Dr. Seuss characters teach about space! Mercury, Venus, Earth, Mars...",
      activities: "Planet order game - put planets in order from sun. Solar system mobile start - color planets different sizes.",
      closing: "My Very Excellent Mother Just Served Us Nachos! (Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune)",
      materials: ["Book", "Planet cutouts", "String"]
    },
    wednesdayPlan: {
      focus: "Book 2: On the Moon",
      warmup: "Theme song. Planet order review.",
      main: "Read 'On the Moon'. The moon goes around Earth! Astronauts walked on the moon!",
      activities: "Moonwalk movement - walk in slow motion like on the moon (low gravity!). Moon craters - drop balls into flour to make craters.",
      closing: "The moon is Earth's friend! Theme song.",
      materials: ["Book", "Flour in pan", "Balls of different sizes"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Solar system quiz.",
      main: "Review: Sun is a star (hot!), planets orbit around it, Earth is our planet, moon orbits Earth. 8 planets total!",
      activities: "Solar system art - paint or draw the sun and planets in order. Add stars!",
      closing: "We're space experts! Theme song.",
      materials: ["Paper", "Paint/crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: S (sun, star, space, solar system!), M (moon, Mars), P (planet). Practice sounds.",
      activities: "Sun S craft (yellow rays). Moon M. Planet P (make it colorful!).",
      closing: "Blast off into the weekend!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 31: Sun and Moon ============
  {
    week: 31,
    theme: "Sun and Moon",
    icon: "🌙",
    color: "#6366f1",
    song: {
      title: "Mr. Sun, Sun, Mr. Golden Sun",
      actions: "Make big sun with arms, hide behind cloud, peek out"
    },
    vocabulary: ["sun", "moon", "day", "night", "light", "dark", "star", "shine", "sunrise", "sunset"],
    books: [
      { title: "The Sun is My Favorite Star", author: "Frank Asch", activities: ["Sun craft", "Day vs Night sorting"] },
      { title: "Goodnight Moon", author: "Margaret Wise Brown", activities: ["Moon phases with Oreos", "Goodnight routine"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Look at the sky! What do you see in the day? At night?",
      main: "Introduce Sun and Moon. Teach sun song. Show flashcards - sun, moon, day, night, stars.",
      activities: "Sun = day (light, warm). Moon and stars = night (dark, sleep). When do we see each?",
      closing: "Sun and moon take turns! Theme song.",
      materials: ["Vocabulary flashcards", "Sun and moon pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: The Sun is My Favorite Star",
      warmup: "Sun song. Shine like the sun!",
      main: "Read 'The Sun is My Favorite Star'. The sun gives us light and warmth! What can we do because of the sun?",
      activities: "Sun craft - paper plate with yellow/orange streamers for rays. Day vs Night sorting - when do we do these activities?",
      closing: "Thank you, sun! Theme song.",
      materials: ["Book", "Paper plates", "Streamers", "Activity cards"]
    },
    wednesdayPlan: {
      focus: "Book 2: Goodnight Moon",
      warmup: "Theme song. Sun vocabulary review.",
      main: "Read 'Goodnight Moon'. At night, we say goodnight to everything! The moon watches over us while we sleep.",
      activities: "Moon phases with Oreos - scrape filling to show full moon, half moon, crescent moon. Eat when done!",
      closing: "Goodnight, moon! Theme song.",
      materials: ["Book", "Oreo cookies", "Paper", "Napkins"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Sun and moon quiz.",
      main: "Review: Sun = star that gives light/heat, appears in day. Moon = reflects sun's light, appears at night with stars.",
      activities: "Day and Night scene - fold paper in half. One side = sunny day, other side = moon and stars night.",
      closing: "Day and night, always changing! Theme song.",
      materials: ["Paper", "Crayons", "Yellow and dark blue colors"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: S (sun, star, shine), M (moon), N (night). Practice sounds.",
      activities: "Sunny S craft. Moon M. Night N with stars.",
      closing: "Day or night, have a great weekend!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 32: The Planets ============
  {
    week: 32,
    theme: "The Planets",
    icon: "🪐",
    color: "#a855f7",
    song: {
      title: "The Planets Song - Mercury, Venus, Earth, Mars...",
      actions: "Point to each planet, make planet shape with body"
    },
    vocabulary: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "rings", "gas"],
    books: [
      { title: "11 Planets: A New View", author: "David Aguilar", activities: ["Planet sizes comparison", "Saturn rings craft"] },
      { title: "Me and My Place in Space", author: "Joan Sweeney", activities: ["Planet facts discussion", "Design your own planet"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Let's learn about ALL the planets! There are 8!",
      main: "Introduce all 8 planets. Teach planet song in order. Show flashcards - each planet's unique look.",
      activities: "Planet order: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. Practice the order!",
      closing: "8 amazing planets! Theme song.",
      materials: ["Vocabulary flashcards", "Planet pictures in order"]
    },
    tuesdayPlan: {
      focus: "Book 1: 11 Planets: A New View",
      warmup: "Planet song. Say planets in order!",
      main: "Read about planets. Jupiter is BIGGEST! Mercury is smallest. Saturn has beautiful rings!",
      activities: "Planet size comparison - use balls of different sizes. Jupiter = basketball, Earth = marble, Mercury = tiny bead.",
      closing: "Planets are all different sizes! Theme song.",
      materials: ["Book", "Different sized balls"]
    },
    wednesdayPlan: {
      focus: "Book 2: Me and My Place in Space",
      warmup: "Theme song. Planet size review.",
      main: "Read 'Me and My Place in Space'. We live on Earth! It's the 3rd planet from the sun. Perfect for us!",
      activities: "Saturn rings craft - paper plate planet with paper ring around it. Fun planet facts discussion.",
      closing: "Earth is just right for us! Theme song.",
      materials: ["Book", "Paper plates", "Paper strips for rings", "Crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Planet quiz - which planet is biggest? Has rings? Is red?",
      main: "Review: Mercury (small, hot), Venus (hot, cloudy), Earth (us!), Mars (red), Jupiter (biggest), Saturn (rings), Uranus, Neptune (far, cold).",
      activities: "Design your own planet! What color? What name? What lives there? Draw and share.",
      closing: "Amazing planet scientists! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: P (planet), J (Jupiter), S (Saturn). Practice sounds.",
      activities: "Planet P craft. Jupiter J (big and stripy). Saturn S with rings.",
      closing: "Planet week done! Blast off!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 33: Mars ============
  {
    week: 33,
    theme: "Mars",
    icon: "🔴",
    color: "#dc2626",
    song: {
      title: "Zoom, Zoom, Zoom, We're Going to Mars!",
      actions: "Countdown, blast off, fly through space, land on Mars"
    },
    vocabulary: ["Mars", "red planet", "rover", "robot", "crater", "rocks", "dust", "explore", "mission", "space"],
    books: [
      { title: "Mission to Mars", author: "Eve Hartman", activities: ["Build a rover craft", "Mars vs Earth comparison"] },
      { title: "Mousetronaut", author: "Mark Kelly", activities: ["Mars surface sensory", "Space mission dramatic play"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "We're going to the RED PLANET! Mars! 3, 2, 1... BLAST OFF!",
      main: "Introduce Mars. Teach Mars song. Show flashcards - Mars surface, rovers, craters.",
      activities: "Mars is RED! It's called the Red Planet. It has rocks, dust, craters. No water like Earth. Robots called rovers explore it.",
      closing: "Mars is mysterious! Theme song.",
      materials: ["Vocabulary flashcards", "Mars pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: Mission to Mars",
      warmup: "Mars song. Fly to Mars!",
      main: "Read about Mars missions. Rovers are robots that drive on Mars and take pictures! Scientists on Earth control them.",
      activities: "Build a rover craft - use boxes, bottle caps for wheels, straws for antennas. Name your rover!",
      closing: "Our rovers are ready! Theme song.",
      materials: ["Book", "Small boxes", "Bottle caps", "Straws", "Tape"]
    },
    wednesdayPlan: {
      focus: "Book 2: Mousetronaut",
      warmup: "Theme song. Mars vocabulary review.",
      main: "Read 'Mousetronaut'. Even small creatures can be brave space explorers! Being small can be helpful!",
      activities: "Mars surface sensory - red sand/dirt in tray. Drive toy rover on it. Make craters!",
      closing: "We explored Mars! Theme song.",
      materials: ["Book", "Red sand/dirt", "Tray", "Toy rovers or small cars"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Mars quiz.",
      main: "Review: Mars is the 4th planet, it's red, has craters and rocks, no air to breathe, rovers explore it. Maybe humans will go someday!",
      activities: "Mars scene - draw Mars surface (red!) with your rover exploring. Add craters, rocks, maybe aliens?",
      closing: "Mission to Mars complete! Theme song.",
      materials: ["Paper", "Crayons (lots of red!)"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: M (Mars, mission), R (red, rover, rocks), C (crater). Practice sounds.",
      activities: "Mars M craft (red!). Rover R. Crater C (use circle stamps).",
      closing: "Mission accomplished! Great Mars week!",
      materials: ["Letter cards", "Red paint", "Craft supplies"]
    }
  },

  // ============ WEEK 34: Astronauts ============
  {
    week: 34,
    theme: "Astronauts",
    icon: "👨‍🚀",
    color: "#1e40af",
    song: {
      title: "I'm an Astronaut",
      actions: "Put on suit, helmet, float in zero gravity, look at Earth"
    },
    vocabulary: ["astronaut", "spacesuit", "helmet", "rocket", "space station", "float", "gravity", "training", "mission", "explore"],
    books: [
      { title: "I Want to Be an Astronaut", author: "Byron Barton", activities: ["Astronaut helmet craft", "Space walk movement"] },
      { title: "Mae Among the Stars", author: "Roda Ahmed", activities: ["Dream big discussion", "Rocket ship craft"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Who goes to space? ASTRONAUTS! Let's learn about them!",
      main: "Introduce Astronauts. Teach astronaut song. Show flashcards - spacesuit, helmet, rocket, space station.",
      activities: "Astronauts wear special suits to breathe in space! They float because there's no gravity! Pretend to float!",
      closing: "Astronauts are brave explorers! Theme song.",
      materials: ["Vocabulary flashcards", "Astronaut pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: I Want to Be an Astronaut",
      warmup: "Astronaut song. Float in space!",
      main: "Read 'I Want to Be an Astronaut'. Astronauts train hard! They learn about space, exercise, practice in special pools.",
      activities: "Astronaut helmet craft - paper bag or milk jug helmet with visor. Space walk movement - slow motion floating!",
      closing: "We're astronaut trainees! Theme song.",
      materials: ["Book", "Paper bags or milk jugs", "Aluminum foil", "Scissors"]
    },
    wednesdayPlan: {
      focus: "Book 2: Mae Among the Stars",
      warmup: "Theme song. Astronaut vocabulary review.",
      main: "Read 'Mae Among the Stars'. Mae Jemison dreamed of being an astronaut - and she did it! First African American woman in space!",
      activities: "Dream big discussion - what's YOUR dream? You can be anything! Rocket ship craft from cardboard tube.",
      closing: "Dream big and work hard! Theme song.",
      materials: ["Book", "Cardboard tubes", "Paper cones", "Paint"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Astronaut quiz.",
      main: "Review: Astronauts train hard, wear spacesuits, ride rockets, float in space, live on space station, explore space!",
      activities: "Draw yourself as an astronaut! What would you explore? The moon? Mars? A new planet?",
      closing: "Future astronauts in this room! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: A (astronaut), R (rocket), S (space, suit, station). Practice sounds.",
      activities: "Astronaut A craft. Rocket R (with flames!). Space S.",
      closing: "Blast off into the weekend!",
      materials: ["Letter cards", "Craft supplies"]
    }
  },

  // ============ WEEK 35: Stars ============
  {
    week: 35,
    theme: "Stars",
    icon: "⭐",
    color: "#fbbf24",
    song: {
      title: "Twinkle, Twinkle, Little Star",
      actions: "Open and close hands like twinkling, point up to sky"
    },
    vocabulary: ["star", "twinkle", "bright", "night", "sky", "constellation", "wish", "shine", "space", "far"],
    books: [
      { title: "How to Catch a Star", author: "Oliver Jeffers", activities: ["Star wishes craft", "Constellation connect"] },
      { title: "Stars", author: "Mary Lyn Ray", activities: ["Night sky art", "Star gazing discussion"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "Look up at night - what do you see? STARS!",
      main: "Introduce Stars. Teach Twinkle Twinkle with actions. Show flashcards - stars, night sky, constellations.",
      activities: "Stars are very far away suns! They look small because they're so far. They twinkle! Make a wish!",
      closing: "Stars are magical! Theme song.",
      materials: ["Vocabulary flashcards", "Star pictures", "Night sky images"]
    },
    tuesdayPlan: {
      focus: "Book 1: How to Catch a Star",
      warmup: "Twinkle Twinkle. Reach for the stars!",
      main: "Read 'How to Catch a Star'. The boy wants his own star! Have you ever wished on a star?",
      activities: "Star wishes craft - make a star, write/draw your wish on it. Glitter to make it sparkle!",
      closing: "Wish upon a star! Theme song.",
      materials: ["Book", "Star cutouts", "Glitter", "Glue", "Crayons"]
    },
    wednesdayPlan: {
      focus: "Book 2: Stars",
      warmup: "Theme song. Star vocabulary review.",
      main: "Read 'Stars'. Stars are beautiful! People have made pictures with stars called constellations - Big Dipper, Orion...",
      activities: "Constellation connect - put star stickers on black paper, connect with white crayon to make shapes!",
      closing: "We made constellations! Theme song.",
      materials: ["Book", "Black paper", "Star stickers", "White crayons"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Star quiz.",
      main: "Review: Stars are far away suns, they twinkle, appear at night, we make wishes, constellations are star pictures.",
      activities: "Night sky art - black paper with star stamps or stickers, add yellow moon. Make it sparkle!",
      closing: "Beautiful starry nights! Theme song.",
      materials: ["Black paper", "Star stamps/stickers", "Yellow paper moon", "Glitter"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday",
      warmup: "Alphabet song. Letter sounds.",
      main: "Focus letters: S (star, shine, sky), T (twinkle), N (night). Practice sounds.",
      activities: "Star S craft (shiny!). Twinkle T. Night N with stars.",
      closing: "Make a wish! Star week complete!",
      materials: ["Letter cards", "Craft supplies", "Glitter"]
    }
  },

  // ============ WEEK 36: Dinosaurs ============
  {
    week: 36,
    theme: "Dinosaurs",
    icon: "🦕",
    color: "#65a30d",
    song: {
      title: "We Are the Dinosaurs",
      actions: "Stomp, roar, swing tail, nibble leaves"
    },
    vocabulary: ["dinosaur", "fossil", "extinct", "T-Rex", "Triceratops", "bones", "egg", "stomp", "roar", "long ago"],
    books: [
      { title: "Danny and the Dinosaur", author: "Syd Hoff", activities: ["Dinosaur dig sensory", "Dino stomp movement"] },
      { title: "How Do Dinosaurs Say Goodnight?", author: "Jane Yolen", activities: ["Paper plate dinosaur", "Dinosaur facts discussion"] }
    ],
    mondayPlan: {
      focus: "Theme Introduction - Song & Flashcards",
      warmup: "ROAR! Dinosaurs lived long, long ago! Let's learn about them!",
      main: "Introduce Dinosaurs. Teach dinosaur song. Show flashcards - T-Rex, Triceratops, Brachiosaurus, fossils.",
      activities: "Dinosaurs are EXTINCT - not alive anymore. We learn about them from fossils (bones in rocks). STOMP like a dinosaur!",
      closing: "Dinosaurs are fascinating! Theme song.",
      materials: ["Vocabulary flashcards", "Dinosaur pictures", "Fossil pictures"]
    },
    tuesdayPlan: {
      focus: "Book 1: Danny and the Dinosaur",
      warmup: "Dinosaur song. STOMP and ROAR!",
      main: "Read 'Danny and the Dinosaur'. Danny finds a friendly dinosaur at the museum! What would YOU do with a dinosaur friend?",
      activities: "Dinosaur dig sensory - hide dinosaur bones (pasta) in sand. Dig like a paleontologist! Use brushes.",
      closing: "We found dinosaur bones! Theme song.",
      materials: ["Book", "Sand", "Pasta 'bones'", "Brushes", "Magnifying glasses"]
    },
    wednesdayPlan: {
      focus: "Book 2: How Do Dinosaurs Say Goodnight?",
      warmup: "Theme song. Dinosaur vocabulary review.",
      main: "Read 'How Do Dinosaurs Say Goodnight?' Even dinosaurs need to go to bed! Do they stomp and roar? No! They give hugs and go to sleep nicely.",
      activities: "Paper plate dinosaur craft - make dinosaur face with horns or spikes! Name your dinosaur.",
      closing: "Sweet dinosaur dreams! Theme song.",
      materials: ["Book", "Paper plates", "Paint", "Paper spikes/horns"]
    },
    thursdayPlan: {
      focus: "Review & Creative Production",
      warmup: "Theme song. Dinosaur quiz - which dino is biggest? Has three horns? Sharp teeth?",
      main: "Review: Dinosaurs lived long ago, extinct now, we learn from fossils. T-Rex (meat eater), Triceratops (3 horns), Brachiosaurus (long neck).",
      activities: "Dinosaur scene - draw dinosaurs in their world! Add volcanoes, plants, other dinosaurs.",
      closing: "Amazing dinosaur week! Theme song.",
      materials: ["Paper", "Crayons"]
    },
    fridayPlan: {
      focus: "Phonics Fun Friday - END OF YEAR CELEBRATION!",
      warmup: "Alphabet song - we know the whole thing now!",
      main: "Focus letters: D (dinosaur), T (T-Rex), R (roar). Plus celebrate ALL the letters we learned this year!",
      activities: "Dinosaur D craft. T-Rex T. Letter parade - hold up your favorite letter! YEAR IN REVIEW celebration!",
      closing: "AMAZING YEAR! You learned so much! ROAR for yourselves! Have a wonderful summer!",
      materials: ["Letter cards", "Craft supplies", "Celebration items"]
    }
  },
];

// Helper function to get a specific week
export function getCircleTimePlan(week: number): CircleTimePlan | undefined {
  return CIRCLE_TIME_CURRICULUM.find(plan => plan.week === week);
}

// Get all plans
export function getAllCircleTimePlans(): CircleTimePlan[] {
  return CIRCLE_TIME_CURRICULUM;
}
