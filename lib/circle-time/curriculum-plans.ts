// lib/circle-time/curriculum-plans.ts

export interface CircleTimePlan {
  week: number;
  dates: string;
  theme: string;
  monthTopic: string;
  openingCircle: {
    greeting: string;
    song: string;
    movement: string;
  };
  mainLesson: {
    topic: string;
    discussion: string[];
    activity: string;
    materials: string[];
  };
  literacy: {
    bigBook: string;
    focusSkill: string;
    vocabulary: string[];
  };
  closingCircle: {
    reflection: string;
    song: string;
    transition: string;
  };
  socialEmotional: string;
  homeConnection: string;
}

export const CIRCLE_TIME_PLANS: CircleTimePlan[] = [
  // ==========================================
  // WEEK 1 - Welcome Back
  // ==========================================
  {
    week: 1,
    dates: "August Week 1",
    theme: "Welcome Back",
    monthTopic: "Back to School",
    openingCircle: {
      greeting: "Good morning friends! Welcome to our classroom! Let's wave hello to everyone in our circle. When I point to you, tell us your name!",
      song: "🎵 Hello, Hello, Hello and How Are You? 🎵 - Sing slowly, wave to each child by name",
      movement: "Stand up tall like a big kid at school! Reach up high, touch your toes, give yourself a big hug - you made it to school!"
    },
    mainLesson: {
      topic: "How to Sit at the Carpet",
      discussion: [
        "Show me how we sit at circle time - crisscross applesauce!",
        "Where do our hands go? In our lap like sleeping butterflies",
        "Our eyes watch the teacher, our ears are listening",
        "Practice: Let's all try sitting the right way together!"
      ],
      activity: "Attention Signal Practice - Teach '1-2-3 eyes on me' and '1-2 eyes on you' response. Practice 5 times with a fun game - when they get it right, everyone celebrates!",
      materials: ["Carpet squares or spots", "Visual poster of sitting position", "Attention signal poster"]
    },
    literacy: {
      bigBook: "David Goes to School",
      focusSkill: "Identifying school rules (what David should/shouldn't do)",
      vocabulary: ["classroom", "rules", "listen", "quiet", "friend"]
    },
    closingCircle: {
      reflection: "What's ONE rule we learned today? Thumbs up if you can remember!",
      song: "🎵 Goodbye Friends, Goodbye Friends, See You Very Soon! 🎵",
      transition: "When I call your name, tiptoe quietly to your table like a little mouse..."
    },
    socialEmotional: "It's okay to feel nervous on the first day! Everyone feels that way. We're all friends here and we'll learn together.",
    homeConnection: "Ask your child to show you how they sit at circle time! Practice the attention signal at home."
  },

  // ==========================================
  // WEEK 2 - Classroom Rules
  // ==========================================
  {
    week: 2,
    dates: "August Week 2",
    theme: "Classroom Rules",
    monthTopic: "Back to School",
    openingCircle: {
      greeting: "Good morning superstars! Show me your best listening ears! Let's see who remembers our attention signal...",
      song: "🎵 We Are Here Together 🎵 - Point to each friend as we sing",
      movement: "Simon Says: Touch your listening ears! Touch your watching eyes! Touch your quiet mouth! Touch your helping hands!"
    },
    mainLesson: {
      topic: "Our Four Classroom Rules",
      discussion: [
        "Rule 1: We speak quietly with permission - Show quiet voice vs loud voice",
        "Rule 2: We listen and follow instructions - Practice following 1-step directions",
        "Rule 3: We stay inside of our own space - Show personal bubble",
        "Rule 4: We are kind and caring to each other - What does kindness look like?"
      ],
      activity: "Rule Charades - Teacher acts out following/breaking each rule. Children guess which rule and show thumbs up (following) or thumbs down (breaking).",
      materials: ["4 rule posters with pictures", "Hula hoop for personal space demo", "Kindness heart cutouts"]
    },
    literacy: {
      bigBook: "No David!",
      focusSkill: "Identifying rule-breaking behavior and what David should do instead",
      vocabulary: ["rules", "safe", "kind", "gentle", "permission"]
    },
    closingCircle: {
      reflection: "Hold up fingers - how many rules do we have? Can you tell a friend one rule?",
      song: "🎵 Clean Up, Clean Up, Everybody Everywhere! 🎵",
      transition: "If you're wearing [color], you may walk quietly to wash your hands..."
    },
    socialEmotional: "Rules keep us SAFE and help us be FRIENDS. When everyone follows rules, our classroom is a happy place!",
    homeConnection: "Talk about one classroom rule at dinner. What rules do you have at home? Are they the same or different?"
  },

  // ==========================================
  // WEEK 3 - My Body
  // ==========================================
  {
    week: 3,
    dates: "9.1-9.5",
    theme: "My Body",
    monthTopic: "All About Me",
    openingCircle: {
      greeting: "Good morning friends! Let's wake up our bodies! Wiggle your fingers, wiggle your toes, shake your whole body!",
      song: "🎵 Head, Shoulders, Knees and Toes 🎵 - Start slow, then FAST!",
      movement: "Body freeze dance - When the music stops, freeze and touch the body part I call out!"
    },
    mainLesson: {
      topic: "The Amazing Parts of My Body",
      discussion: [
        "Point to your head - What's inside? Your amazing BRAIN that helps you think!",
        "Point to your chest - Feel your HEART beating! It pumps blood all through your body",
        "Wiggle your fingers - How many do you have? Let's count together!",
        "Our bodies are amazing! Every part has an important job"
      ],
      activity: "Body Tracing - Children lie on large paper, trace their outline, then add eyes, nose, mouth, heart. Label body parts together.",
      materials: ["Large paper rolls", "Crayons/markers", "Body parts labels", "Mirrors"]
    },
    literacy: {
      bigBook: "Inside My Bones",
      focusSkill: "Understanding that our body has parts we can see AND parts inside we can't see",
      vocabulary: ["body", "bones", "muscles", "heart", "brain", "skeleton"]
    },
    closingCircle: {
      reflection: "Touch one body part and tell me what it does! My eyes help me...",
      song: "🎵 If You're Happy and You Know It 🎵 - Use body part movements",
      transition: "Use your quiet feet to walk to the library corner..."
    },
    socialEmotional: "Our bodies are all different and all WONDERFUL! Some bodies are tall, some are small, but every body is special.",
    homeConnection: "Look in a mirror together and name body parts. How are your bodies the same? Different?"
  },

  // ==========================================
  // WEEK 4 - My 5 Senses
  // ==========================================
  {
    week: 4,
    dates: "9.8-9.12",
    theme: "My 5 Senses",
    monthTopic: "All About Me",
    openingCircle: {
      greeting: "Good morning! Let's use our senses! What do you HEAR right now? What do you SEE?",
      song: "🎵 I Have Two Eyes to See With 🎵 (Senses song)",
      movement: "Sense Stretches - Stretch your eyes open wide, cup your ears, wiggle your nose, stick out your tongue, rub your hands together!"
    },
    mainLesson: {
      topic: "Exploring Our Five Amazing Senses",
      discussion: [
        "EYES help us SEE - What colors do you see in our classroom?",
        "EARS help us HEAR - Let's close our eyes. What sounds do you hear?",
        "NOSE helps us SMELL - Sniff sniff! What smells do you like?",
        "TONGUE helps us TASTE - Sweet, sour, salty!",
        "HANDS help us TOUCH - Soft, hard, smooth, rough!"
      ],
      activity: "Sense Stations - Rotate through 5 stations: 1) Mystery box (touch), 2) Smell jars, 3) Sound shakers, 4) Taste test, 5) I Spy (sight)",
      materials: ["Mystery touch box with objects", "Smell jars (vanilla, lemon, etc)", "Sound shakers", "Safe taste samples", "I Spy pictures"]
    },
    literacy: {
      bigBook: "My Great Body / My Senses Help Me",
      focusSkill: "Matching senses to body parts and their functions",
      vocabulary: ["senses", "sight", "hearing", "smell", "taste", "touch"]
    },
    closingCircle: {
      reflection: "Which sense station was your favorite? Show me with your body which sense!",
      song: "🎵 Five Senses Song 🎵",
      transition: "Close your eyes and use your ears - listen for your name to line up..."
    },
    socialEmotional: "Some friends might not have all 5 senses working the same way. That's okay! Our other senses can help us even more.",
    homeConnection: "Go on a 'senses walk' at home or outside. What can you see, hear, smell, touch?"
  },

  // ==========================================
  // WEEK 5 - My Feelings
  // ==========================================
  {
    week: 5,
    dates: "9.15-9.19",
    theme: "My Feelings",
    monthTopic: "All About Me",
    openingCircle: {
      greeting: "Good morning! Show me with your face - how are you feeling today? Happy? Sleepy? Excited?",
      song: "🎵 If You're Happy and You Know It 🎵 - Add verses: sad, angry, scared, excited",
      movement: "Feelings Freeze - I'll call out a feeling, you show it with your whole body! HAPPY! SAD! ANGRY! SCARED! SURPRISED!"
    },
    mainLesson: {
      topic: "Understanding Our Feelings",
      discussion: [
        "Everyone has feelings - they're like weather inside us!",
        "It's okay to feel ANY feeling - happy, sad, angry, scared, excited",
        "What makes YOU feel happy? Sad? Let's share...",
        "How can we help a friend who feels sad? Be kind, ask 'Are you okay?'"
      ],
      activity: "Feelings Faces - Create emotion masks or draw feeling faces. Practice showing each emotion. Play 'Match the Feeling' - I'll describe a situation, you show the feeling face.",
      materials: ["Paper plates", "Craft sticks", "Mirrors", "Emotion picture cards", "Feeling faces poster"]
    },
    literacy: {
      bigBook: "How I Feel / I Like Me",
      focusSkill: "Identifying emotions in characters and connecting to our own experiences",
      vocabulary: ["happy", "sad", "angry", "scared", "excited", "feelings", "emotions"]
    },
    closingCircle: {
      reflection: "Take a deep breath with me. In through your nose... out through your mouth. This helps when we have big feelings!",
      song: "🎵 Shake Your Sillies Out 🎵",
      transition: "Show me a CALM face and body, then walk to your table..."
    },
    socialEmotional: "Mid-Autumn Festival connection: During festivals, we feel HAPPY to be with family! What makes your family happy?",
    homeConnection: "Make a feelings chart at home. Each day, point to how you're feeling and talk about why."
  },

  // ==========================================
  // WEEK 6 - I Am Special / I Like Myself
  // ==========================================
  {
    week: 6,
    dates: "9.22-9.26",
    theme: "I Am Special / I Like Myself",
    monthTopic: "All About Me",
    openingCircle: {
      greeting: "Good morning, SPECIAL friends! Everyone here is unique and wonderful. Let's celebrate YOU!",
      song: "🎵 I Am Special, I Am Special, Look at Me! 🎵",
      movement: "Strike a special pose! Show me YOUR special way to stand - like a superhero, a dancer, a tree!"
    },
    mainLesson: {
      topic: "What Makes ME Special",
      discussion: [
        "Look at your hands - no one else has fingerprints just like yours!",
        "What do you like about yourself? I like my smile! I'm good at...",
        "What makes you different? Hair color, eye color, things you love",
        "Being different is WONDERFUL - imagine if everyone was the same!"
      ],
      activity: "'All About Me' Star - Children decorate a star with drawings of: My family, My favorite food, What I'm good at, What makes me happy. Share with the class.",
      materials: ["Large star cutouts", "Crayons/markers", "Magazines for cutting", "Glue", "Mirrors"]
    },
    literacy: {
      bigBook: "Dinosaur is Hungry / My Body Needs Food",
      focusSkill: "Connecting to food groups - our special bodies need healthy food!",
      vocabulary: ["special", "unique", "different", "wonderful", "healthy", "food groups"]
    },
    closingCircle: {
      reflection: "Turn to a friend and say: 'You are special because...' (help them complete the sentence)",
      song: "🎵 You Are My Sunshine 🎵",
      transition: "Special superstars, when I call your name, show me your special walk to line up!"
    },
    socialEmotional: "The 5 Food Groups introduction: Just like we're all special, foods are special too! Different foods help our body in different ways.",
    homeConnection: "Tell your family THREE things that make you special. Ask them what makes THEM special!"
  },

  // ==========================================
  // WEEK 7-8 - Five Food Groups
  // ==========================================
  {
    week: 7,
    dates: "10.9-10.17",
    theme: "Five Food Groups",
    monthTopic: "Healthy And I",
    openingCircle: {
      greeting: "Good morning healthy friends! Rub your tummy - are you hungry? Let's learn about yummy, healthy foods!",
      song: "🎵 Apples and Bananas 🎵 (change vowels: A-ples and Ba-na-nas)",
      movement: "Food Dance - Grow like a carrot from the ground, be round like an orange, wiggle like spaghetti!"
    },
    mainLesson: {
      topic: "The Five Food Groups & My Healthy Plate",
      discussion: [
        "FRUITS - Sweet and colorful! What fruits do you love? 🍎🍌🍊",
        "VEGETABLES - Help us grow strong! Green beans, carrots, broccoli 🥕🥦",
        "GRAINS - Give us energy! Bread, rice, noodles 🍚🍞",
        "PROTEIN - Makes muscles strong! Meat, eggs, beans, tofu 🍗🥚",
        "DAIRY - Healthy bones! Milk, cheese, yogurt 🥛🧀"
      ],
      activity: "Build My Plate - Give each child a paper plate divided into sections. They glue/draw foods in each section to create their own healthy plate. Count: Do you have all 5 groups?",
      materials: ["Paper plates divided into 5 sections", "Food pictures (magazines/printed)", "My Plate poster", "Glue", "Crayons"]
    },
    literacy: {
      bigBook: "The Big Hungry Bear / Choose Good Food",
      focusSkill: "Categorizing foods into food groups, understanding healthy choices",
      vocabulary: ["fruits", "vegetables", "grains", "protein", "dairy", "healthy", "energy"]
    },
    closingCircle: {
      reflection: "Tell me one food from each group! Start with fruits... vegetables... grains... protein... dairy!",
      song: "🎵 Do You Know the Food Group? (to Do You Know the Muffin Man) 🎵",
      transition: "If your favorite fruit is an apple, you may go. If it's a banana..."
    },
    socialEmotional: "Our bodies need ALL the food groups to be healthy and strong. Trying new foods is being BRAVE!",
    homeConnection: "At dinner, play 'Name That Food Group!' Point to foods and guess which group they belong to."
  },

  // ==========================================
  // WEEK 9 - Healthy Food (Hygiene & Habits)
  // ==========================================
  {
    week: 9,
    dates: "10.20-10.24",
    theme: "Healthy Food & Hygiene",
    monthTopic: "Healthy And I",
    openingCircle: {
      greeting: "Good morning! Let's check - did everyone wash their hands? Show me your clean hands! Sparkly clean!",
      song: "🎵 Wash, Wash, Wash Your Hands 🎵 (to Row Your Boat)",
      movement: "Washing Hands Dance - Pretend to turn on water, pump soap, scrub scrub scrub, rinse, shake dry!"
    },
    mainLesson: {
      topic: "Hygiene and Healthy Habits",
      discussion: [
        "Why do we wash hands? To wash away GERMS we can't see!",
        "When do we wash? Before eating, after bathroom, after playing",
        "How long do we wash? Sing the whole ABCs!",
        "Other healthy habits: Cover coughs, use tissues, drink water"
      ],
      activity: "Glitter Germs Experiment - Put glitter on hands, shake hands with friends, see how 'germs' spread. Then wash with soap and see the glitter disappear!",
      materials: ["Glitter (the 'germs')", "Soap", "Water basin", "Paper towels", "Hygiene routine poster"]
    },
    literacy: {
      bigBook: "Clean It (who are characters) / This is the Way (who is an author)",
      focusSkill: "Identifying characters and author, sequencing hygiene routines",
      vocabulary: ["germs", "hygiene", "healthy", "clean", "soap", "routine"]
    },
    closingCircle: {
      reflection: "Show me the hand washing steps with your hands! First... then... then...",
      song: "🎵 This is the Way We Wash Our Hands 🎵",
      transition: "Let's practice! Everyone walk to the sink and show me perfect hand washing!"
    },
    socialEmotional: "Taking care of our body shows we LOVE ourselves! When we wash hands, we also help keep our FRIENDS healthy!",
    homeConnection: "Practice the hand washing song at home! Time yourselves - can you wash for the whole song?"
  },

  // ==========================================
  // WEEK 10 - Healthy Habits (Dental Health)
  // ==========================================
  {
    week: 10,
    dates: "10.27-10.31",
    theme: "Healthy Habits - Dental Health",
    monthTopic: "Healthy And I",
    openingCircle: {
      greeting: "Good morning! Big SMILE everyone! Let me see those teeth! Shiny and clean!",
      song: "🎵 Brush, Brush, Brush Your Teeth 🎵 (to Row Your Boat)",
      movement: "Pretend Brushing - Get your pretend toothbrush! Brush the front, brush the sides, brush the back, brush your tongue!"
    },
    mainLesson: {
      topic: "Taking Care of Our Teeth",
      discussion: [
        "Why do we need teeth? To bite, chew, smile, and talk!",
        "What hurts our teeth? Sugar bugs love candy and sweet drinks!",
        "How do we keep teeth healthy? Brush 2x a day, eat healthy foods, visit the dentist",
        "What about losing teeth? That's exciting! New grown-up teeth are coming!"
      ],
      activity: "Egg Tooth Experiment - Show how vinegar (like sugar) makes eggshell soft, but brushing protects teeth. Or: Practice brushing on a teeth model with a big toothbrush.",
      materials: ["Eggs", "Vinegar", "Teeth model", "Large toothbrush", "Tooth brushing sequence cards"]
    },
    literacy: {
      bigBook: "Animal Teeth / Brush Your Teeth",
      focusSkill: "Comparing different animal teeth to human teeth, sequencing brushing routine",
      vocabulary: ["teeth", "dentist", "toothbrush", "toothpaste", "cavity", "healthy"]
    },
    closingCircle: {
      reflection: "How many times a day should we brush? Hold up your fingers! When? Morning and...",
      song: "🎵 Brushing Teeth Song 🎵",
      transition: "Show me your biggest smile as you walk to wash hands!"
    },
    socialEmotional: "Going to the dentist might feel scary, but dentists are helpers who keep our teeth healthy! It's okay to feel nervous and still be brave.",
    homeConnection: "Brush teeth together! Let your child 'teach' you the right way to brush. Make it fun!"
  },

  // ==========================================
  // WEEK 11 - People Around Me (Family & Friends)
  // ==========================================
  {
    week: 11,
    dates: "11.3-11.7",
    theme: "People Around Me (My Family & Friends)",
    monthTopic: "My Family",
    openingCircle: {
      greeting: "Good morning! Who woke you up today? Was it Mommy? Daddy? Grandma? Let's talk about our families!",
      song: "🎵 Family Song - I love mommy, yes I do! I love daddy, yes I do! 🎵",
      movement: "Family Hug - Give yourself a big hug from your family! Squeeze tight! Now give an air hug to your friends!"
    },
    mainLesson: {
      topic: "My Family and My Friends",
      discussion: [
        "Who is in YOUR family? Let's share! (Mommy, daddy, siblings, grandparents, pets)",
        "Families are all different - some big, some small, all special!",
        "What do you love about your family? They take care of us, love us",
        "Friends are like family at school! How do we take care of our friends?"
      ],
      activity: "Family Portrait - Draw a picture of your family. Who will you include? Share and tell about each person. Display on 'Our Families' wall.",
      materials: ["Paper", "Crayons/markers", "Family photos (if available)", "'Our Families' display area"]
    },
    literacy: {
      bigBook: "My Family / My Mum / My Dad",
      focusSkill: "Identifying family members, understanding different family structures",
      vocabulary: ["family", "mother", "father", "sister", "brother", "grandparents", "love"]
    },
    closingCircle: {
      reflection: "Tell your friend one thing you love about YOUR family!",
      song: "🎵 I Love You, You Love Me, We're a Happy Family 🎵",
      transition: "Give an air hug to your family at home, then walk quietly to your table..."
    },
    socialEmotional: "Sing a song to let kids love their family! All families show love in different ways. Some hug, some make food, some play together. All families are special!",
    homeConnection: "Look at family photos together. Tell stories about family members. Who do you look like?"
  },

  // ==========================================
  // WEEK 12 - The Cycle of Plants (Be Thankful)
  // ==========================================
  {
    week: 12,
    dates: "11.10-11.14",
    theme: "The Cycle of Plants",
    monthTopic: "My Family",
    openingCircle: {
      greeting: "Good morning little gardeners! Have you ever watched something GROW? Today we learn how plants grow!",
      song: "🎵 The Seed Song - I'm a little seed in the ground 🎵",
      movement: "Be a Seed - Curl up small like a seed, feel the rain (wiggle fingers), feel the sun (reach up), GROW GROW GROW into a tall plant!"
    },
    mainLesson: {
      topic: "How Seeds Become Plants",
      discussion: [
        "Where do plants come from? A tiny SEED!",
        "What does a seed need? Water, sunlight, soil - just like we need food and love!",
        "Watch it grow: Seed → Sprout → Plant → Flower → Fruit → Seeds again!",
        "Being thankful: Plants give us so much! Food, air, beauty"
      ],
      activity: "Plant a Seed - Each child plants a bean seed in a clear cup to watch it grow. Label with names. Observe roots and sprout over coming weeks.",
      materials: ["Clear cups", "Soil", "Bean seeds", "Water", "Plant cycle poster", "Journals for observation"]
    },
    literacy: {
      bigBook: "How Seeds Become a Plant? / How Do Pumpkins Grow?",
      focusSkill: "Sequencing the plant life cycle, making predictions",
      vocabulary: ["seed", "sprout", "roots", "stem", "leaves", "flower", "grow"]
    },
    closingCircle: {
      reflection: "What are you THANKFUL for today? I'm thankful for... (Go around circle)",
      song: "🎵 Oats, Peas, Beans and Barley Grow 🎵",
      transition: "Grow like a plant as you walk to the door - start small, get bigger!"
    },
    socialEmotional: "Being thankful helps us feel happy! When we notice good things (like plants that give us food), we feel grateful. What are you thankful for?",
    homeConnection: "Check on your seed every day! Draw what you see. What are you thankful for as a family?"
  },

  // ==========================================
  // WEEK 13 - The Cycle of Animals
  // ==========================================
  {
    week: 13,
    dates: "11.17-11.21",
    theme: "The Cycle of Animals",
    monthTopic: "My Family",
    openingCircle: {
      greeting: "Good morning! What's your favorite animal? Today we learn how animals grow - just like us!",
      song: "🎵 Old MacDonald Had a Farm 🎵 - With animal movements!",
      movement: "Animal Transformations - Be an egg (curl up), hatch into a chick (peck peck), grow into a chicken (flap wings)!"
    },
    mainLesson: {
      topic: "How Animals Grow and Change",
      discussion: [
        "Do animals come from eggs or mommies? BOTH! Some hatch, some are born",
        "Frog cycle: Egg → Tadpole → Froglet → Frog! They CHANGE completely!",
        "Chick cycle: Egg → Chick → Chicken - they grow bigger!",
        "How are WE like animals? We grow bigger too! (Baby → Kid → Adult)"
      ],
      activity: "Life Cycle Sequencing - Sort picture cards to show frog and chick life cycles. Create a life cycle wheel or accordion book.",
      materials: ["Life cycle cards (frog, chick, butterfly)", "Paper plates for cycle wheels", "Brass fasteners", "Crayons"]
    },
    literacy: {
      bigBook: "How Frogs Grow / The Chick",
      focusSkill: "Sequencing life cycles, comparing different animal changes",
      vocabulary: ["egg", "tadpole", "frog", "chick", "hatch", "life cycle", "grow"]
    },
    closingCircle: {
      reflection: "Show me with your body - what comes FIRST in the frog cycle? Then what?",
      song: "🎵 Five Little Speckled Frogs 🎵",
      transition: "Hop like a frog... waddle like a chick... walk to your table!"
    },
    socialEmotional: "Be kind and helpful to animals! They are living things that need care, just like us. How can we help animals?",
    homeConnection: "Look for animals outside! Are they babies or grown-ups? What might they look like when they grow?"
  },

  // ==========================================
  // WEEK 14 - Thanksgiving Day
  // ==========================================
  {
    week: 14,
    dates: "11.24-11.28",
    theme: "Thanksgiving Day",
    monthTopic: "My Family",
    openingCircle: {
      greeting: "Good morning thankful friends! This week we celebrate being THANKFUL! What does thankful mean?",
      song: "🎵 Thank You Song - Thank you for the sun, thank you for the rain 🎵",
      movement: "Thankful Heart Beats - Put hand on heart. Think of something you're thankful for. Feel your heart beat with thankfulness!"
    },
    mainLesson: {
      topic: "Giving Thanks",
      discussion: [
        "What is Thanksgiving? A time to say THANK YOU for all good things",
        "What are YOU thankful for? Family, food, friends, toys, health...",
        "How do we show we're thankful? Say thank you, help others, share",
        "Thanksgiving feast - families gather to eat and be grateful together"
      ],
      activity: "Thankful Turkey - Create a turkey with hand tracings. On each feather, draw or write something you're thankful for. Display turkeys together!",
      materials: ["Paper", "Fall colored crayons/markers", "Thankful turkey template", "Feather cutouts"]
    },
    literacy: {
      bigBook: "I Said Thanks / Giving Thanks",
      focusSkill: "Understanding gratitude, expressing thanks in different ways",
      vocabulary: ["thankful", "grateful", "Thanksgiving", "feast", "family", "share"]
    },
    closingCircle: {
      reflection: "Turn to your friend and say 'Thank you for being my friend!' How did that feel?",
      song: "🎵 Over the River and Through the Woods 🎵",
      transition: "Say 'thank you, Teacher' as you walk to line up!"
    },
    socialEmotional: "Giving thanks makes US feel good AND makes others feel good! Practice saying thank you today - see how many times you can say it!",
    homeConnection: "Go around the dinner table - everyone share one thing they're thankful for. Make it a Thanksgiving tradition!"
  },

  // ==========================================
  // WEEK 15 - Community Helpers (People & Places)
  // ==========================================
  {
    week: 15,
    dates: "12.1-12.5",
    theme: "Community Helpers",
    monthTopic: "My School and Community",
    openingCircle: {
      greeting: "Good morning helpers! Who helps YOU? Today we learn about special people who help our community!",
      song: "🎵 People in Your Neighborhood 🎵 (Sesame Street)",
      movement: "Helper Actions - Drive like a bus driver, type like a teacher, check hearts like a doctor, pour water like a firefighter!"
    },
    mainLesson: {
      topic: "People Who Help in Our Neighborhood",
      discussion: [
        "What is a community? All the people and places around us!",
        "DOCTORS help us when we're sick - they make us feel better",
        "TEACHERS help us learn - just like in our classroom!",
        "Who else? Mail carrier, garbage collector, crossing guard, librarian"
      ],
      activity: "Community Helper Match - Match helpers to their tools and places. Doctor→Stethoscope→Hospital. Create a class 'Our Community' mural.",
      materials: ["Community helper pictures", "Tool pictures", "Place pictures", "Large mural paper", "Magazines for cutting"]
    },
    literacy: {
      bigBook: "People in the Neighborhood / Places in My Community / Doctors",
      focusSkill: "Identifying helpers, matching jobs to tools and places",
      vocabulary: ["community", "helper", "doctor", "teacher", "neighborhood", "hospital"]
    },
    closingCircle: {
      reflection: "When I grow up, I want to be a... because I want to help people by...",
      song: "🎵 Career Song - What do you want to be? 🎵",
      transition: "Walk like your favorite community helper to the door!"
    },
    socialEmotional: "Community helpers CARE about others. How can YOU be a helper in our classroom? At home? We can ALL be helpers!",
    homeConnection: "Look for community helpers when you're out! Wave and say thank you to them!"
  },

  // ==========================================
  // WEEK 16 - Community Helpers (Safety Heroes)
  // ==========================================
  {
    week: 16,
    dates: "12.8-12.12",
    theme: "Community Helpers - Safety Heroes",
    monthTopic: "My School and Community",
    openingCircle: {
      greeting: "Good morning! What sound does a fire truck make? WEEE-OOO! Today we learn about SAFETY helpers!",
      song: "🎵 Hurry Hurry Drive the Fire Truck 🎵",
      movement: "Safety Hero Actions - Spray the hose, drive the fire truck, stop traffic like a police officer, bandage someone like a paramedic!"
    },
    mainLesson: {
      topic: "Firefighters and Police Officers",
      discussion: [
        "FIREFIGHTERS fight fires and help in emergencies. What do they wear? Why?",
        "POLICE OFFICERS keep us safe and help when we're lost. They're our friends!",
        "What do we do in an emergency? Stay calm, call for help, listen to adults",
        "911 is for emergencies only - when is an emergency? Fire, someone hurt, danger"
      ],
      activity: "Safety Hero Dress-Up - Try on firefighter hats and badges. Role-play calling 911 (pretend phone). Practice Stop, Drop, Roll!",
      materials: ["Firefighter hats", "Police badges", "Pretend phone", "Fire safety poster", "Stop Drop Roll pictures"]
    },
    literacy: {
      bigBook: "Police Officer / Firefighter",
      focusSkill: "Understanding safety procedures, emergency awareness",
      vocabulary: ["firefighter", "police officer", "emergency", "safe", "911", "helmet"]
    },
    closingCircle: {
      reflection: "Show me Stop, Drop, and Roll! What do we do if we hear the fire alarm?",
      song: "🎵 Fire Safety Song 🎵",
      transition: "Practice our fire drill walk - quiet, quick, stay in line!"
    },
    socialEmotional: "It's okay to feel scared in emergencies. That's why we practice! When we know what to do, we feel braver.",
    homeConnection: "Practice your home fire escape plan. Where would you meet outside? Thank a firefighter or police officer if you see one!"
  },

  // ==========================================
  // WEEK 17 - Christmas
  // ==========================================
  {
    week: 17,
    dates: "12.15-12.19",
    theme: "Christmas",
    monthTopic: "My School and Community",
    openingCircle: {
      greeting: "Good morning! It's almost Christmas! What are you excited about?",
      song: "🎵 Jingle Bells 🎵 - Ring jingle bells while singing!",
      movement: "Christmas Actions - Decorate the tree (reach high), wrap presents (folding motions), ride the sleigh (gallop)!"
    },
    mainLesson: {
      topic: "Merry Christmas - A Time for Giving",
      discussion: [
        "Christmas is a special holiday many people celebrate!",
        "What do families do? Decorate trees, give gifts, spend time together",
        "The BEST gift is LOVE - giving to others makes us happy!",
        "How can we give without buying? Hugs, helping, making cards, sharing"
      ],
      activity: "Handmade Gift Cards - Create Christmas cards for family members. Decorate with drawings, stamps, and special messages. The gift of love!",
      materials: ["Card paper", "Holiday stamps/stickers", "Crayons/markers", "Glitter", "Envelopes"]
    },
    literacy: {
      bigBook: "It's Christmas / Merry Christmas Little Hoo",
      focusSkill: "Understanding holiday traditions, the spirit of giving",
      vocabulary: ["Christmas", "gift", "giving", "celebrate", "family", "love", "holiday"]
    },
    closingCircle: {
      reflection: "What gift of LOVE will you give someone? A hug? A smile? Helping?",
      song: "🎵 We Wish You a Merry Christmas 🎵",
      transition: "Give a holiday hug to a friend, then line up quietly!"
    },
    socialEmotional: "Different families celebrate different holidays - and that's wonderful! What makes YOUR family's celebration special?",
    homeConnection: "Work together to do something KIND for someone else this holiday. Bake cookies for a neighbor, donate toys, visit grandparents!"
  },

  // ==========================================
  // WEEK 18 - Winter is Coming
  // ==========================================
  {
    week: 18,
    dates: "1.5-1.9",
    theme: "Winter is Coming",
    monthTopic: "Winter",
    openingCircle: {
      greeting: "Good morning! Brrr! Is it cold outside? It's WINTER! Let's learn about this chilly season!",
      song: "🎵 Winter Wonderland 🎵 (simplified version)",
      movement: "Winter Warm-Up - Shiver like you're cold, put on pretend mittens, hat, coat. Now you're warm! Jump to warm up!"
    },
    mainLesson: {
      topic: "A Year of Change - Winter Season",
      discussion: [
        "What season is it now? WINTER! How do you know? Cold, maybe snow, bare trees",
        "What do WE do in winter? Wear warm clothes, play inside more, drink hot cocoa",
        "What do ANIMALS do? Some sleep (hibernate), some have warm fur, some fly away (migrate)",
        "Winter can be fun! Snow play, cozy inside, winter sports"
      ],
      activity: "Winter Animals - Learn about what animals do in winter. Sort pictures into: Hibernate (bear, hedgehog), Migrate (birds), Stay and adapt (rabbits, deer). Create winter habitat dioramas.",
      materials: ["Animal pictures", "Sorting mat", "Shoe boxes for dioramas", "Cotton balls (snow)", "White paper"]
    },
    literacy: {
      bigBook: "Kitten's Winter / Animals in Winter / Winter",
      focusSkill: "Understanding seasonal changes, animal adaptations",
      vocabulary: ["winter", "cold", "snow", "hibernate", "migrate", "warm", "season"]
    },
    closingCircle: {
      reflection: "If you were an animal in winter, would you hibernate, migrate, or stay? Why?",
      song: "🎵 Snowflake, Snowflake, Little Snowflake 🎵",
      transition: "Float like a snowflake to your table... gently, softly, slowly..."
    },
    socialEmotional: "A Year of Change and Discovery! Life has seasons - things change and that's okay! We can find something good in every season.",
    homeConnection: "Look outside - what signs of winter do you see? No leaves? Animals? Cold weather? Draw a winter picture together!"
  },

  // ==========================================
  // WEEK 19 - Weather
  // ==========================================
  {
    week: 19,
    dates: "1.12-1.16",
    theme: "Weather",
    monthTopic: "Winter",
    openingCircle: {
      greeting: "Good morning weather watchers! Look outside - what's the weather today? Sunny? Cloudy? Rainy?",
      song: "🎵 What's the Weather Like Today? 🎵",
      movement: "Weather Dance - Rain (fingers wiggle down), sun (stretch out wide), wind (sway and spin), snow (twirl gently down)!"
    },
    mainLesson: {
      topic: "The Weather is Our Daily Adventure",
      discussion: [
        "Weather affects how we FEEL - sunny days feel happy, rainy days feel cozy",
        "Weather affects what we WEAR - hot = shorts, cold = coat, rain = boots!",
        "Weather affects what we DO - sunny = park, rainy = inside play",
        "Types of weather: sunny, cloudy, rainy, snowy, windy, stormy"
      ],
      activity: "Weather Wheel & Dress-Up - Create a weather wheel. Spin and dress the paper doll for that weather! Or: Real dress-up with different weather clothes.",
      materials: ["Weather wheel template", "Paper dolls", "Weather clothes cutouts", "Real weather clothes (rain boots, mittens, sun hat)"]
    },
    literacy: {
      bigBook: "Water Changes / Weather",
      focusSkill: "Understanding weather types, cause and effect (weather → clothes/activities)",
      vocabulary: ["weather", "sunny", "cloudy", "rainy", "snowy", "windy", "temperature"]
    },
    closingCircle: {
      reflection: "What's your FAVORITE weather? What do you like to do in that weather?",
      song: "🎵 Rain, Rain, Go Away 🎵 OR 🎵 Mr. Sun 🎵",
      transition: "Show me how you walk in the rain (tiptoe through puddles)... in the wind (lean and push)... in the sun (skip happily)!"
    },
    socialEmotional: "Weather is like feelings - it changes! Sometimes sunny, sometimes stormy. Both are okay. What's YOUR weather today?",
    homeConnection: "Check the weather each morning together. What will you wear? What might you do? Start a weather journal!"
  },

  // ==========================================
  // WEEK 20 - Beijing
  // ==========================================
  {
    week: 20,
    dates: "1.19-1.23",
    theme: "Beijing",
    monthTopic: "City/Beijing/China",
    openingCircle: {
      greeting: "Good morning travelers! Today we're going on an adventure to BEIJING, a very special city! 你好 (nǐ hǎo)!",
      song: "🎵 Hello in Chinese - 你好歌 🎵",
      movement: "Fly to Beijing - Spread your wings, fly over the ocean, land in China! Take a bow like they do in Beijing!"
    },
    mainLesson: {
      topic: "Exploring Beijing - China's Capital City",
      discussion: [
        "Beijing is in CHINA, on the continent of ASIA! Find it on our map!",
        "The GREAT WALL - So long you can see it from space! Built to protect people long ago",
        "Famous food: Peking duck, dumplings (jiaozi), noodles - Yummy!",
        "Has anyone been to Beijing? What did you see? What would you like to see?"
      ],
      activity: "Build the Great Wall - Use blocks or cardboard boxes to build our own classroom Great Wall. Work together like the people did long ago! Take photos!",
      materials: ["World map/globe", "Pictures of Beijing landmarks", "Building blocks/boxes", "China flag", "Chinese music"]
    },
    literacy: {
      bigBook: "Busy Beijing / City Music",
      focusSkill: "Identifying landmarks, learning about Chinese culture",
      vocabulary: ["Beijing", "China", "Asia", "Great Wall", "capital", "dumpling"]
    },
    closingCircle: {
      reflection: "What's ONE thing you learned about Beijing? What would you like to eat there?",
      song: "🎵 Gong Xi Gong Xi (preview for Chinese New Year) 🎵",
      transition: "Walk on our Great Wall carefully... then fly back home to your table!"
    },
    socialEmotional: "Students can share their OWN experiences! Has anyone visited Beijing or seen pictures? Sharing our experiences helps us learn from each other.",
    homeConnection: "Look up pictures of Beijing together! Try making dumplings at home if you can!"
  },

  // ==========================================
  // WEEK 21 - China
  // ==========================================
  {
    week: 21,
    dates: "1.26-1.30",
    theme: "China",
    monthTopic: "City/Beijing/China",
    openingCircle: {
      greeting: "Nǐ hǎo, péngyǒu (Hello, friends)! Let's learn more about China - a beautiful country!",
      song: "🎵 Chinese Counting Song - Yī, Èr, Sān 🎵",
      movement: "Panda Walk - Walk like a giant panda! Slow and roly-poly. Now eat pretend bamboo!"
    },
    mainLesson: {
      topic: "Animals of China - Pandas and More!",
      discussion: [
        "GIANT PANDA - China's special treasure! Black and white, eats bamboo, lives in mountains",
        "RED PANDA - Not a bear! Small, red and fluffy, also loves bamboo",
        "Other Chinese animals: Golden snub-nosed monkey, Chinese alligator, crane",
        "Why are pandas special? They're endangered - not many left. We must protect them!"
      ],
      activity: "Panda Art - Create panda faces using paper plates (white) with black ears, eyes, and nose. Or make red panda crafts with orange paper!",
      materials: ["Paper plates", "Black and white paper", "Orange paper (red panda)", "Bamboo pictures", "China animal photos"]
    },
    literacy: {
      bigBook: "China Rice / Where is China / 年 (English) Chinese Zodiac",
      focusSkill: "Learning about Chinese animals, introduction to Chinese zodiac",
      vocabulary: ["panda", "bamboo", "China", "endangered", "protect", "zodiac"]
    },
    closingCircle: {
      reflection: "What's your favorite Chinese animal? Why? What Chinese zodiac animal are you?",
      song: "🎵 Panda Bear, Panda Bear, What Do You See? 🎵 (adaptation)",
      transition: "Waddle like a panda to get your coat!"
    },
    socialEmotional: "Animals are our friends! We take care of them like we take care of each other. How can we help pandas?",
    homeConnection: "Find out your family's Chinese zodiac animals! Look it up by birth year. Are you a dragon? Rabbit? Tiger?"
  },

  // ==========================================
  // WEEK 22 - Chinese New Year
  // ==========================================
  {
    week: 22,
    dates: "2.2-2.6",
    theme: "Chinese New Year",
    monthTopic: "City/Beijing/China",
    openingCircle: {
      greeting: "Gōng xǐ fā cái! Happy New Year! It's time to celebrate Chinese New Year!",
      song: "🎵 Gong Xi Gong Xi 恭喜恭喜 🎵 - Traditional CNY song!",
      movement: "Lion Dance - Pretend to be the lion! Shake your head, jump, chase away bad luck! Play drums (pat your legs)!"
    },
    mainLesson: {
      topic: "Celebrating Chinese New Year",
      discussion: [
        "Chinese New Year is the BIGGEST holiday in China! Families get together",
        "RED is lucky! Red decorations, red envelopes with money, red clothes",
        "What do families do? Clean house, eat special food, watch fireworks, give red envelopes",
        "Dragon and Lion dances - scare away bad luck, bring good fortune!"
      ],
      activity: "Red Envelope Craft - Make red envelopes (hóngbāo) to give to family! Decorate with gold and good wishes. Also: Make paper lanterns!",
      materials: ["Red paper/envelopes", "Gold markers/stickers", "Lantern template", "Chinese decorations", "Lucky character templates (福)"]
    },
    literacy: {
      bigBook: "Busy Chinese New Year / Lunar New Year / Chinese Zodiac",
      focusSkill: "Understanding cultural celebrations, sequencing holiday traditions",
      vocabulary: ["Chinese New Year", "lucky", "red envelope", "lantern", "dragon", "celebration"]
    },
    closingCircle: {
      reflection: "What's ONE thing you'll tell your family about Chinese New Year? Practice saying 'Gōng xǐ fā cái!'",
      song: "🎵 Happy New Year Song 🎵",
      transition: "Dragon parade! Line up behind me and we'll dragon-dance to the door!"
    },
    socialEmotional: "Lunar New Year reminds us to be grateful for family and to wish good things for others. What GOOD WISHES do you have for your friends?",
    homeConnection: "Celebrate at home! Wear something red, make dumplings, clean your room for good luck! Share the good wishes you learned!"
  },

  // ==========================================
  // WEEK 23 - Our Amazing Seven Continents
  // ==========================================
  {
    week: 23,
    dates: "3.2-3.6",
    theme: "Our Amazing Seven Continents",
    monthTopic: "7 Continents",
    openingCircle: {
      greeting: "Good morning world explorers! Our Earth is SO BIG! It has 7 giant pieces of land called CONTINENTS!",
      song: "🎵 Seven Continents Song 🎵 - To a catchy tune!",
      movement: "Continent Dance - Asia (big!), Africa (drum), Europe (small steps), N. America (wave), S. America (samba), Australia (kangaroo hop), Antarctica (shiver)!"
    },
    mainLesson: {
      topic: "Learning About the Seven Continents",
      discussion: [
        "A CONTINENT is a giant piece of land! We live on one right now - which one?",
        "Count with me: Asia, Africa, North America, South America, Europe, Australia, Antarctica",
        "Which is BIGGEST? Asia! Which is COLDEST? Antarctica (penguins live there!)",
        "Each continent has special animals, people, and places!"
      ],
      activity: "World Map Puzzle - Put together continent puzzle pieces. Color/label each continent. Create a class world map display with animals on each continent.",
      materials: ["Large world map", "Continent puzzle", "Continent labels", "Animal stickers/pictures for each continent", "Globe"]
    },
    literacy: {
      bigBook: "Counting Continents",
      focusSkill: "Identifying and naming 7 continents, basic geography",
      vocabulary: ["continent", "Earth", "world", "map", "globe", "Asia", "Africa", "Europe", "North America", "South America", "Australia", "Antarctica"]
    },
    closingCircle: {
      reflection: "Can you remember all 7 continents? Let's say them together! Point to them on the map!",
      song: "🎵 We've Got the Whole World in Our Hands 🎵",
      transition: "Walk around the world (circle) to your table - which continent will you visit?"
    },
    socialEmotional: "People live all around the world! We may look different and speak different languages, but we're all part of ONE world family!",
    homeConnection: "Find your continent on a map or globe at home! Where would you like to visit someday?"
  },

  // ==========================================
  // WEEK 24 - Exploring the Five Oceans
  // ==========================================
  {
    week: 24,
    dates: "3.9-3.13",
    theme: "Exploring the Five Oceans",
    monthTopic: "7 Continents",
    openingCircle: {
      greeting: "Good morning ocean explorers! Did you know most of Earth is covered in WATER? Let's dive into the oceans!",
      song: "🎵 A Sailor Went to Sea 🎵 - With ocean movements!",
      movement: "Ocean Waves - Be the waves! Start calm, get bigger, CRASH! Then calm again. Now swim like fish!"
    },
    mainLesson: {
      topic: "The Five Amazing Oceans",
      discussion: [
        "OCEANS are giant bodies of salt water! Fish and sea animals live there",
        "Five oceans: Pacific (biggest!), Atlantic, Indian, Southern, Arctic (coldest!)",
        "What lives in the ocean? Whales, dolphins, sharks, fish, octopus, jellyfish, coral",
        "We must take care of oceans - no trash! Ocean animals need clean water"
      ],
      activity: "Ocean in a Bottle - Create ocean sensory bottles with water, blue food coloring, oil, glitter, and small sea creatures. Shake and watch the waves!",
      materials: ["Clear plastic bottles", "Water", "Blue food coloring", "Baby oil", "Glitter", "Small plastic sea animals", "Ocean photos"]
    },
    literacy: {
      bigBook: "Who Lives in the Ocean? / Help Our Oceans / Ocean Animals",
      focusSkill: "Identifying ocean animals, understanding ocean conservation",
      vocabulary: ["ocean", "Pacific", "Atlantic", "whale", "dolphin", "coral", "waves"]
    },
    closingCircle: {
      reflection: "What's your favorite ocean animal? Show me how it moves!",
      song: "🎵 Baby Shark 🎵 (of course!)",
      transition: "Swim like your favorite ocean animal to line up!"
    },
    socialEmotional: "Oceans are precious! When we take care of the Earth (no littering, recycling), we help ocean animals stay healthy and happy.",
    homeConnection: "Watch an ocean video together! Talk about ocean animals you'd like to see. How can your family help keep oceans clean?"
  },
  // ==========================================
  // WEEK 25 - Choose One Continent (Asia)
  // ==========================================
  {
    week: 25,
    dates: "3.16-3.20",
    theme: "Exploring Asia",
    monthTopic: "7 Continents",
    openingCircle: {
      greeting: "Nǐ hǎo! Konnichiwa! Namaste! These are hellos from ASIA - the biggest continent! Let's explore!",
      song: "🎵 Hello in Different Languages 🎵",
      movement: "Asian Dance Moves - Bow like in Japan, do yoga like in India, dragon dance like in China, martial arts poses!"
    },
    mainLesson: {
      topic: "Discovering Asia - The Biggest Continent",
      discussion: [
        "Asia is HUGE! More people live here than anywhere else!",
        "Countries in Asia: China (we know this!), Japan, India, Korea, Thailand, and many more!",
        "Cool things: Great Wall of China, Mount Everest (tallest mountain!), pandas, tigers, elephants",
        "Yummy food: Sushi (Japan), curry (India), rice (everywhere!), noodles (China)"
      ],
      activity: "Asia Passport Activity - Create a 'passport' booklet. 'Visit' different Asian countries by stamping or stickering your passport. Learn one fact about each country!",
      materials: ["Passport booklet templates", "Country stamps/stickers", "Pictures from Asian countries", "World map", "Asian artifacts/items to show"]
    },
    literacy: {
      bigBook: "Asia Series / Explore Asia Series",
      focusSkill: "Identifying Asian countries, appreciating cultural diversity",
      vocabulary: ["Asia", "continent", "country", "culture", "tradition", "diverse"]
    },
    closingCircle: {
      reflection: "Which Asian country would YOU like to visit? What would you do there?",
      song: "🎵 It's a Small World 🎵",
      transition: "Bow to a friend (Japanese style) then walk to your table!"
    },
    socialEmotional: "Asia has SO many different cultures! Different is wonderful. We can learn something special from every culture!",
    homeConnection: "Try food from an Asian country this week! Talk about what continent it comes from."
  },

  // ==========================================
  // WEEK 26 - Choose One Country (Japan in Asia)
  // ==========================================
  {
    week: 26,
    dates: "3.23-3.27",
    theme: "Exploring Japan",
    monthTopic: "7 Continents",
    openingCircle: {
      greeting: "Konnichiwa, tomodachi (Hello, friends)! Today we visit JAPAN - a beautiful island country in Asia!",
      song: "🎵 Head, Shoulders, Knees and Toes in Japanese 🎵",
      movement: "Japanese Movements - Bow politely, fold origami (hand motions), eat with chopsticks, cherry blossoms falling (flutter down)!"
    },
    mainLesson: {
      topic: "Discovering Japan - Land of the Rising Sun",
      discussion: [
        "Japan is made of ISLANDS! It's in Asia, across the ocean from us",
        "Japanese people bow to say hello - so polite! Let's practice!",
        "Special things: Cherry blossoms (sakura), Mount Fuji, bullet trains, origami, sushi",
        "Animals: Koi fish (beautiful fish!), Japanese macaque (snow monkeys!), tanuki (raccoon dogs)"
      ],
      activity: "Origami Fun! - Learn to fold a simple origami shape (dog face, boat, or cup). Japanese children love origami! Also try writing your name in Japanese style.",
      materials: ["Origami paper (square, colorful)", "Step-by-step origami instructions", "Japan photos", "Cherry blossom pictures", "Japanese flag"]
    },
    literacy: {
      bigBook: "Children's book about Japan (or teacher-made Japan book)",
      focusSkill: "Learning about Japanese culture, geography, and traditions",
      vocabulary: ["Japan", "konnichiwa", "origami", "sakura", "Mount Fuji", "island", "bow"]
    },
    closingCircle: {
      reflection: "Show me your origami! What's one thing you learned about Japan?",
      song: "🎵 Sakura Sakura (Cherry Blossoms) 🎵 - simplified",
      transition: "Bow to the teacher, then float like cherry blossoms to your table!"
    },
    socialEmotional: "In Japan, people are very RESPECTFUL and POLITE. Bowing shows respect. How can WE show respect to others in our classroom?",
    homeConnection: "Try making origami at home! Look up 'easy origami for kids.' Can you find Japan on a map?"
  },

  // ==========================================
  // WEEK 27 - The Earth
  // ==========================================
  {
    week: 27,
    dates: "3.30-4.3",
    theme: "The Earth",
    monthTopic: "Earth",
    openingCircle: {
      greeting: "Good morning Earthlings! We ALL live on planet EARTH! Let's learn about our beautiful home!",
      song: "🎵 He's Got the Whole World in His Hands 🎵",
      movement: "Be the Earth! Spin slowly around (Earth rotates!), orbit around the 'sun' (teacher), show day and night!"
    },
    mainLesson: {
      topic: "Our Earth - Our Only Home",
      discussion: [
        "Earth is our PLANET! It floats in space! It's mostly blue and green",
        "Blue = WATER (oceans!), Green = LAND (continents!), White = CLOUDS and ICE",
        "Earth gives us everything we need: air to breathe, water to drink, food to eat",
        "WE must take care of Earth because it takes care of US!"
      ],
      activity: "Earth Art - Create Earth using paper plates painted blue and green. Add cotton clouds! Or: Coffee filter Earth (color, spray with water for blended effect).",
      materials: ["Paper plates", "Blue and green paint/crayons", "Cotton balls (clouds)", "Coffee filters", "Spray bottles", "Globe/Earth photos"]
    },
    literacy: {
      bigBook: "Let's Explore the Earth / The Big Bang Book / Watch Over Our Water",
      focusSkill: "Understanding Earth as our home, basic environmental awareness",
      vocabulary: ["Earth", "planet", "ocean", "land", "continent", "environment", "protect"]
    },
    closingCircle: {
      reflection: "Earth takes care of us. How can WE take care of Earth? (Don't litter, save water, recycle)",
      song: "🎵 What a Wonderful World 🎵 (simplified)",
      transition: "Tiptoe gently on our Earth to your table..."
    },
    socialEmotional: "We are all part of a GLOBAL COMMUNITY! People all over Earth are our neighbors. Taking care of Earth means taking care of each other.",
    homeConnection: "Go outside and appreciate Earth! Feel the grass, look at the sky, smell the air. How can your family help take care of Earth?"
  },

  // ==========================================
  // WEEK 28 - Landforms
  // ==========================================
  {
    week: 28,
    dates: "4.7-4.10",
    theme: "Landforms",
    monthTopic: "Earth",
    openingCircle: {
      greeting: "Good morning explorers! Earth has so many shapes on its surface - mountains, valleys, rivers! Let's explore!",
      song: "🎵 The Bear Went Over the Mountain 🎵",
      movement: "Be the Landform! Stand tall like a mountain, lie flat like a plain, flow like a river, dip down like a valley!"
    },
    mainLesson: {
      topic: "Earth's Amazing Landforms",
      discussion: [
        "MOUNTAINS - tall, pointy land reaching up to the sky! (Touch the clouds!)",
        "VALLEYS - low land between mountains (like a bowl)",
        "RIVERS and LAKES - water flowing through land or collected in low spots",
        "DESERTS - dry land with sand, very little water",
        "ISLANDS - land surrounded by water (like Japan!)"
      ],
      activity: "Landform Playdough - Create different landforms using playdough! Mountains (cones), valleys (dips), rivers (snake shapes), islands (surrounded by blue paper 'water').",
      materials: ["Playdough (brown, green, blue)", "Landform pictures/cards", "Trays for building", "Blue paper (water)"]
    },
    literacy: {
      bigBook: "Earth Landforms / Looking at Landforms / This Land is Your Land",
      focusSkill: "Identifying and describing different landforms",
      vocabulary: ["mountain", "valley", "river", "lake", "desert", "island", "landform"]
    },
    closingCircle: {
      reflection: "What landform would you like to visit? Would you climb a mountain or swim in a lake?",
      song: "🎵 This Land is Your Land 🎵",
      transition: "Show me your favorite landform with your body as you line up!"
    },
    socialEmotional: "People, animals, and plants live on ALL these landforms! They adapt to where they live. Mountains, deserts, rivers - all are homes!",
    homeConnection: "What landforms are near YOUR home? Hills? Rivers? Flat land? Take a 'landform walk' and see what you find!"
  },

  // ==========================================
  // WEEK 29 - Animal Habitats
  // ==========================================
  {
    week: 29,
    dates: "4.13-4.17",
    theme: "Animal Habitats",
    monthTopic: "Earth",
    openingCircle: {
      greeting: "Good morning animal friends! Where do animals LIVE? Every animal has a special home called a HABITAT!",
      song: "🎵 Going on a Safari 🎵 (adaptation)",
      movement: "Habitat Movements - Swing through the forest (monkey), swim in the ocean (fish), hop in the desert (kangaroo rat), waddle on ice (penguin)!"
    },
    mainLesson: {
      topic: "Where Animals Live - Exploring Habitats",
      discussion: [
        "FOREST - Trees everywhere! Bears, deer, squirrels, owls live here",
        "OCEAN - Saltwater! Whales, fish, dolphins, octopus live here",
        "DESERT - Hot and dry! Camels, lizards, snakes live here",
        "GRASSLAND - Open spaces! Lions, zebras, elephants live here",
        "ARCTIC - Cold and icy! Polar bears, penguins, seals live here"
      ],
      activity: "Habitat Sorting Game - Sort animal pictures into the correct habitat! Create habitat dioramas or posters for each habitat with the right animals.",
      materials: ["Animal pictures (many!)", "Habitat pictures/labels", "Sorting mats", "Shoe boxes for dioramas", "Craft supplies"]
    },
    literacy: {
      bigBook: "Habitat Boy / Where Do Animals Live / In the Desert / In the Pond",
      focusSkill: "Matching animals to their habitats, understanding adaptations",
      vocabulary: ["habitat", "forest", "ocean", "desert", "grassland", "arctic", "adapt"]
    },
    closingCircle: {
      reflection: "If YOU were an animal, which habitat would you choose to live in? Why?",
      song: "🎵 Down in the Jungle 🎵",
      transition: "Move like an animal from your favorite habitat to line up!"
    },
    socialEmotional: "Animals adapt to their homes. Humans can adapt too! When things change, we learn new ways to be happy and healthy.",
    homeConnection: "What habitat do YOU live in? Urban (city)? Suburban? Rural? What animals share your habitat?"
  },

  // ==========================================
  // WEEK 30 - Earth Day
  // ==========================================
  {
    week: 30,
    dates: "4.20-4.24",
    theme: "Earth Day",
    monthTopic: "Earth",
    openingCircle: {
      greeting: "Happy Earth Day, Earth Heroes! This special day is for celebrating and HELPING our planet!",
      song: "🎵 Earth Day Song - Take Care of the Earth 🎵",
      movement: "Earth Hero Actions - Pick up trash (bend and grab), plant a tree (digging motion), turn off lights (click!), recycle (sorting motion)!"
    },
    mainLesson: {
      topic: "Protecting Our Earth",
      discussion: [
        "Earth Day is April 22 - a day to celebrate and help our planet!",
        "REDUCE - use less stuff (less plastic, less water)",
        "REUSE - use things again instead of throwing away",
        "RECYCLE - turn old things into new things (paper, plastic, cans)",
        "Small actions make a BIG difference when everyone helps!"
      ],
      activity: "Earth Day Pledge - Each child makes a promise to help Earth. Create 'Earth Promise' badges or certificates. Also: Recycling sorting game or trash clean-up walk!",
      materials: ["Earth promise cards", "Badge materials", "Recycling bins (paper, plastic, metal)", "Sorting items", "Gloves for outdoor cleanup"]
    },
    literacy: {
      bigBook: "Earth Day / We Celebrate Earth Day in Spring",
      focusSkill: "Understanding environmental responsibility, making personal commitments",
      vocabulary: ["Earth Day", "reduce", "reuse", "recycle", "protect", "environment", "pollution"]
    },
    closingCircle: {
      reflection: "What is YOUR Earth Promise? What will YOU do to help our planet?",
      song: "🎵 This Pretty Planet 🎵",
      transition: "Earth Heroes, walk proudly to your table - you're going to save the Earth!"
    },
    socialEmotional: "We are all responsible for taking care of Earth. Even small children can make a difference! What you do MATTERS!",
    homeConnection: "Do an Earth Day activity at home! Pick up litter, plant something, turn off lights, start recycling. Every bit helps!"
  },

  // ==========================================
  // WEEK 31 - Exploring the Solar System
  // ==========================================
  {
    week: 31,
    dates: "4.27-4.30",
    theme: "Exploring the Solar System",
    monthTopic: "Space",
    openingCircle: {
      greeting: "Good morning astronauts! 3... 2... 1... BLAST OFF! We're flying into SPACE to explore the solar system!",
      song: "🎵 Zoom Zoom Zoom, We're Going to the Moon 🎵",
      movement: "Rocket Launch - Squat down, count down from 10, BLAST OFF and jump high! Fly around space, land gently on a planet!"
    },
    mainLesson: {
      topic: "Our Solar System - The Sun's Family",
      discussion: [
        "The SUN is a star! It gives us light and warmth - like a giant ball of fire!",
        "PLANETS go around the sun - 8 planets in our solar system!",
        "The sun is like the heart of our community - we all depend on it!",
        "The sun's warmth is like KINDNESS - it helps everything grow!"
      ],
      activity: "Sun Craft - Create bright, warm suns with paper plates and yellow/orange streamers. Discuss how we can be like the sun - spreading warmth and kindness!",
      materials: ["Paper plates", "Yellow/orange paint and streamers", "Sun facts poster", "Solar system poster", "Flashlight (demonstrate sun's light)"]
    },
    literacy: {
      bigBook: "Solar Energy / The Solar System",
      focusSkill: "Understanding the sun's role, connecting warmth to kindness",
      vocabulary: ["sun", "star", "solar system", "planet", "warm", "light", "orbit"]
    },
    closingCircle: {
      reflection: "How can YOU be like the sun? Spread warmth with a smile! Give kindness like the sun gives light!",
      song: "🎵 Mr. Sun, Sun, Mr. Golden Sun 🎵",
      transition: "Shine bright like the sun as you walk to your table!"
    },
    socialEmotional: "Just like the sun warms the Earth, WE can warm others with KINDNESS! A smile, a hug, helping someone - that's spreading warmth!",
    homeConnection: "Notice the sun this week! When do you see it? How does it make you feel? Do something KIND to spread warmth like the sun!"
  },

  // ==========================================
  // WEEK 32 - The Planets of the Solar System
  // ==========================================
  {
    week: 32,
    dates: "5.6-5.8",
    theme: "The Planets of the Solar System",
    monthTopic: "Space",
    openingCircle: {
      greeting: "Hello space travelers! The sun has 8 planets orbiting around it - let's meet them all!",
      song: "🎵 Planet Song - Mercury, Venus, Earth and Mars 🎵",
      movement: "Planet Orbit - Children stand in a circle (planets), one child is the sun in the middle. Planets slowly walk around the sun!"
    },
    mainLesson: {
      topic: "The Eight Planets - Working Together",
      discussion: [
        "Mercury - closest to sun, small and fast!",
        "Venus, Earth (that's us!), Mars - the rocky planets",
        "Jupiter, Saturn (with beautiful rings!) - the gas giants, so big!",
        "Uranus, Neptune - far away and cold!",
        "Each planet is different but they ALL work together in the solar system - like a COMMUNITY!"
      ],
      activity: "Solar System Mobile - Create a hanging mobile with the sun and 8 planets in order. Children paint paper circles for each planet with its colors.",
      materials: ["Different sized circles", "Paint (planet colors)", "String/yarn", "Coat hangers", "Planet size comparison chart"]
    },
    literacy: {
      bigBook: "The Universe and You / Universe",
      focusSkill: "Naming planets in order, understanding community through solar system metaphor",
      vocabulary: ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "orbit"]
    },
    closingCircle: {
      reflection: "Can you name the planets in order? My Very Educated Mother Just Served Us Nachos!",
      song: "🎵 Eight Planets Song 🎵",
      transition: "Orbit around the room to your table - don't crash into other planets!"
    },
    socialEmotional: "Each planet is DIFFERENT - different sizes, colors, temperatures. But they all work together! In our class, we're all different too, and we all belong!",
    homeConnection: "Learn the planet song together! Can you see any planets in the night sky? (Venus is often visible!)"
  },

  // ==========================================
  // WEEK 33 - Exploring the Sun
  // ==========================================
  {
    week: 33,
    dates: "5.11-5.15",
    theme: "Exploring the Sun: Our Warm and Shiny Star",
    monthTopic: "Space",
    openingCircle: {
      greeting: "Good morning sunshine! The sun is waking up and so are we! Let's learn more about our special star!",
      song: "🎵 Here Comes the Sun 🎵 (simplified)",
      movement: "Sun Salutation - Reach up to the sun, bend down to Earth, stretch wide like sun rays!"
    },
    mainLesson: {
      topic: "The Sun - Friendship and Teamwork",
      discussion: [
        "The sun gives LIGHT so we can see and HEAT so we can be warm",
        "Plants need sun to grow, animals need sun for warmth - everything connects!",
        "When we work TOGETHER, we're like the sun - we help each other shine!",
        "Teamwork activity: Like planets need the sun, we need each other!"
      ],
      activity: "Teamwork Sun Craft - Create a GIANT class sun! Each child makes one sun ray with their name and draws something they do to help the class. Assemble together!",
      materials: ["Large yellow circle", "Yellow/orange paper rays", "Crayons/markers", "Tape/glue", "Teamwork examples pictures"]
    },
    literacy: {
      bigBook: "Let's Explore the Sun",
      focusSkill: "Understanding friendship and teamwork through sun metaphor",
      vocabulary: ["sun", "rays", "bright", "warm", "teamwork", "together", "friendship"]
    },
    closingCircle: {
      reflection: "Look at our class sun! What does YOUR ray say? How do you help our class community?",
      song: "🎵 The More We Get Together 🎵",
      transition: "High-five a friend (share your sunshine!) then walk to your table!"
    },
    socialEmotional: "Friends help each other shine! When we work together, we're STRONGER - like the sun's rays all coming together to warm the Earth!",
    homeConnection: "Do a teamwork activity with your family! Cook together, clean together, play together. How does working together feel?"
  },

  // ==========================================
  // WEEK 34 - The Moon and Mars
  // ==========================================
  {
    week: 34,
    dates: "5.18-5.22",
    theme: "The Moon and Mars",
    monthTopic: "Space",
    openingCircle: {
      greeting: "Good morning space explorers! Tonight look up - you might see the MOON! And far away is the red planet MARS!",
      song: "🎵 I See the Moon, the Moon Sees Me 🎵",
      movement: "Moon Walk - Walk slowly in slow motion like astronauts on the moon! Low gravity makes you bounce and float!"
    },
    mainLesson: {
      topic: "The Moon and Mars - Each One is Special",
      discussion: [
        "The MOON circles Earth! It reflects the sun's light - that's why it glows!",
        "Moon phases - sometimes full circle, sometimes crescent! (Show pictures)",
        "MARS is the red planet! It's dusty and rocky. Scientists want to send people there!",
        "Each planet and moon is DIFFERENT but SPECIAL - just like each of us!"
      ],
      activity: "Moon Phases Art - Create moon phase cards showing full moon, half moon, crescent moon. Use Oreo cookies to show phases (scrape off filling)! Mars crater art with paint and marbles.",
      materials: ["Moon phase pictures", "Black paper", "White/gray paint/paper", "Oreo cookies", "Red paint (Mars)", "Marbles for crater rolling"]
    },
    literacy: {
      bigBook: "The Moon / Day and Night / Mars",
      focusSkill: "Understanding moon phases, appreciating differences",
      vocabulary: ["moon", "Mars", "crater", "phases", "full moon", "crescent", "astronaut"]
    },
    closingCircle: {
      reflection: "Would you rather visit the Moon or Mars? Why? What would you do there?",
      song: "🎵 Fly Me to the Moon 🎵 (kid version)",
      transition: "Float like you're on the moon to your table... slowly... gently..."
    },
    socialEmotional: "The moon and Mars are very different from Earth, but each is special! In our class, we're all different too. Different is what makes us INTERESTING!",
    homeConnection: "Moon watching! Look at the moon this week. What shape is it? Is it changing? Draw the moon you see!"
  },

  // ==========================================
  // WEEK 35 - Astronauts and Telescopes
  // ==========================================
  {
    week: 35,
    dates: "5.25-5.29",
    theme: "Astronauts and Telescopes",
    monthTopic: "Space",
    openingCircle: {
      greeting: "Good morning future astronauts! Do you dream of going to space? Let's learn about the brave people who do!",
      song: "🎵 I Want to Be an Astronaut 🎵",
      movement: "Astronaut Training - Put on pretend space suit, climb into rocket, blast off, float in zero gravity, do space exercises!"
    },
    mainLesson: {
      topic: "Astronauts and How We See Space",
      discussion: [
        "ASTRONAUTS are brave explorers who travel to space! They train for years!",
        "Neil Armstrong was the FIRST person to walk on the moon! (1969)",
        "How do astronauts feel? Excited but maybe scared too - it's okay to feel both!",
        "TELESCOPES help us see far into space! Like super-powered eyes!"
      ],
      activity: "Make a Telescope - Create simple pretend telescopes with paper towel tubes. Decorate and 'look' at space pictures around the room. Also: Space suit dress-up!",
      materials: ["Paper towel tubes", "Decorating supplies", "Space pictures to 'discover'", "Astronaut costume pieces", "Neil Armstrong photos"]
    },
    literacy: {
      bigBook: "Tom's Telescope / Space Song Rocket Ride / Neil Armstrong",
      focusSkill: "Understanding astronauts' experiences, identifying emotions",
      vocabulary: ["astronaut", "telescope", "space suit", "rocket", "brave", "explore", "Neil Armstrong"]
    },
    closingCircle: {
      reflection: "Would YOU like to be an astronaut? What would you feel - excited? Nervous? Both? That's okay!",
      song: "🎵 Twinkle Twinkle Little Star 🎵",
      transition: "Walk in slow motion like you're on a space station... to your table!"
    },
    socialEmotional: "Astronauts feel MANY emotions - excitement, fear, loneliness, wonder. It's okay to have big feelings! We can be brave AND scared at the same time.",
    homeConnection: "Watch videos of astronauts in space! Talk about how it might FEEL to be so far from home. What would you miss?"
  },

  // ==========================================
  // WEEK 36 - Dinosaurs and Fossils
  // ==========================================
  {
    week: 36,
    dates: "6.3-6.6",
    theme: "Dinosaurs and Fossils",
    monthTopic: "June",
    openingCircle: {
      greeting: "ROAR! Good morning dinosaur hunters! Today we travel back in TIME to when dinosaurs walked the Earth!",
      song: "🎵 We Are the Dinosaurs 🎵",
      movement: "Dinosaur Moves - Stomp like T-Rex, reach your long neck like Brachiosaurus, fly like Pterodactyl, chomp like Triceratops!"
    },
    mainLesson: {
      topic: "Discovering Dinosaurs Through Fossils",
      discussion: [
        "Dinosaurs lived MILLIONS of years ago - long before people!",
        "How do we know about them? FOSSILS! Bones and prints left in rocks",
        "PALEONTOLOGISTS are scientists who dig up and study fossils - like detectives!",
        "So many kinds: T-Rex (big teeth!), Triceratops (three horns!), Brachiosaurus (long neck!)"
      ],
      activity: "Fossil Dig - Hide plastic dinosaurs or 'bones' in sand. Children use brushes to carefully dig like real paleontologists! Also: Make fossil prints with playdough and toy dinosaurs.",
      materials: ["Sand table/bins", "Plastic dinosaurs", "Paintbrushes", "Playdough", "Dinosaur toys for prints", "Magnifying glasses"]
    },
    literacy: {
      bigBook: "Here We Go Digging Dinosaur Bones / Paleontologists / Three Little Dinosaurs",
      focusSkill: "Understanding fossils, learning dinosaur names, scientific discovery",
      vocabulary: ["dinosaur", "fossil", "paleontologist", "bones", "extinct", "T-Rex", "dig"]
    },
    closingCircle: {
      reflection: "What's YOUR favorite dinosaur? Can you move like it? ROAR!",
      song: "🎵 Dinosaur Stomp 🎵",
      transition: "Stomp like dinosaurs to the door - but don't knock anything over, gentle giants!"
    },
    socialEmotional: "Paleontologists are CURIOUS - they ask questions and search for answers! Being curious is wonderful. What are YOU curious about?",
    homeConnection: "Visit a museum with dinosaur fossils if you can! Or watch dinosaur videos together. What questions does your child have about dinosaurs?"
  },
];

// Export function to get plan by week
export function getCircleTimePlan(week: number): CircleTimePlan | undefined {
  return CIRCLE_TIME_PLANS.find(p => p.week === week);
}

// Export function to get all plans
export function getAllCircleTimePlans(): CircleTimePlan[] {
  return CIRCLE_TIME_PLANS;
}

// Export plans grouped by month
export function getPlansByMonth(): Record<string, CircleTimePlan[]> {
  const months: Record<string, CircleTimePlan[]> = {
    'August - Back to School': [],
    'September - All About Me': [],
    'October - Healthy And I': [],
    'November - My Family': [],
    'December - My School and Community': [],
    'January - Winter': [],
    'February - Beijing/China': [],
    'March - 7 Continents': [],
    'April - Earth': [],
    'May - Space': [],
    'June - Dinosaurs': [],
  };
  
  CIRCLE_TIME_PLANS.forEach(plan => {
    if (plan.week <= 2) months['August - Back to School'].push(plan);
    else if (plan.week <= 6) months['September - All About Me'].push(plan);
    else if (plan.week <= 10) months['October - Healthy And I'].push(plan);
    else if (plan.week <= 14) months['November - My Family'].push(plan);
    else if (plan.week <= 17) months['December - My School and Community'].push(plan);
    else if (plan.week <= 19) months['January - Winter'].push(plan);
    else if (plan.week <= 22) months['February - Beijing/China'].push(plan);
    else if (plan.week <= 26) months['March - 7 Continents'].push(plan);
    else if (plan.week <= 30) months['April - Earth'].push(plan);
    else if (plan.week <= 35) months['May - Space'].push(plan);
    else months['June - Dinosaurs'].push(plan);
  });
  
  return months;
}
