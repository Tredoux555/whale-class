// ============================================================
// MONTREE GURU — Claude Tool-Use API Design
// ============================================================
//
// This file defines:
// 1. The TOOL SCHEMAS that Claude can call (our reasoning engine exposed as tools)
// 2. The SYSTEM PROMPT that makes Claude a Montessori 3-6 expert
// 3. The ORCHESTRATION LAYER that processes tool calls and returns results
// 4. Sample conversation flows showing how it all works end-to-end
//
// In production, this runs inside LangGraph. Here we simulate the full loop.

// ============================================================
// PART 1: TOOL DEFINITIONS (Claude API format)
// ============================================================
//
// These are the tools the Guru can call. Each one maps to a function
// in our reasoning engine. Claude decides WHEN to call them based on
// the teacher's question.

const GURU_TOOLS = [
  {
    name: "get_child_profile",
    description: "Get a comprehensive profile of a specific child including mastered/practicing/struggling exercises, skill strengths, area coverage, and latest observations. Use this when the teacher asks about a specific child's progress or status.",
    input_schema: {
      type: "object",
      properties: {
        child_name: {
          type: "string",
          description: "The child's name (case-insensitive match)"
        }
      },
      required: ["child_name"]
    }
  },
  {
    name: "get_prioritized_recommendations",
    description: "Get prioritized next-presentation recommendations for a child, scored by urgency. Returns exercises grouped into urgent/recommended/available tiers with reasoning for each. Use when the teacher asks 'what should I present next?' or 'what does this child need?'",
    input_schema: {
      type: "object",
      properties: {
        child_name: {
          type: "string",
          description: "The child's name"
        },
        area_filter: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "culture"],
          description: "Optional: filter recommendations to a specific curriculum area"
        },
        limit: {
          type: "integer",
          description: "Maximum number of recommendations to return. Default 10.",
          default: 10
        }
      },
      required: ["child_name"]
    }
  },
  {
    name: "get_struggling_analysis",
    description: "Deep analysis of why a child is struggling with specific exercises. Returns weak skills, observation note clues, and suggested bridge exercises (including cross-area bridges). Use when the teacher says a child is having trouble or asks why something isn't clicking.",
    input_schema: {
      type: "object",
      properties: {
        child_name: {
          type: "string",
          description: "The child's name"
        },
        exercise_id: {
          type: "string",
          description: "Optional: specific exercise ID to analyze. If omitted, analyzes all struggling exercises."
        }
      },
      required: ["child_name"]
    }
  },
  {
    name: "get_attention_flags",
    description: "Get attention flags for a child: prolonged struggles, stale areas, stalled practice, missing curriculum areas. Use when the teacher asks 'anything I should be worried about?' or for morning briefings.",
    input_schema: {
      type: "object",
      properties: {
        child_name: {
          type: "string",
          description: "The child's name. Use '__ALL__' for whole-classroom scan."
        }
      },
      required: ["child_name"]
    }
  },
  {
    name: "get_classroom_overview",
    description: "Get a high-level overview of the entire classroom: each child's status, top flags, and most urgent recommendations. Use for morning briefings, weekly planning, or when the teacher asks about the class as a whole.",
    input_schema: {
      type: "object",
      properties: {
        sort_by: {
          type: "string",
          enum: ["urgency", "name", "age"],
          description: "How to sort the children. Default: urgency (most flags first).",
          default: "urgency"
        }
      },
      required: []
    }
  },
  {
    name: "check_exercise_readiness",
    description: "Check whether a specific child is ready for a specific exercise. Returns prerequisite status, skill readiness, age fit, and any concerns. Use when the teacher says 'can I present X to Y?' or 'is Z ready for the golden beads?'",
    input_schema: {
      type: "object",
      properties: {
        child_name: {
          type: "string",
          description: "The child's name"
        },
        exercise_id: {
          type: "string",
          description: "The exercise ID (e.g. 'M020') or exercise name to check"
        }
      },
      required: ["child_name", "exercise_id"]
    }
  },
  {
    name: "find_exercise",
    description: "Search for an exercise by name, area, or skill. Returns matching exercises with their details. Use when the teacher mentions an exercise by name and you need to find its ID, or when searching for exercises that develop a specific skill.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search term: exercise name, area name, skill name, or sub-area"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_skill_analysis",
    description: "Analyze a specific skill across a child's profile: which exercises have developed it, current strength, and exercises that could further develop it. Use when the teacher asks about a specific skill like 'how is her pincer grip?' or 'is he ready for writing?'",
    input_schema: {
      type: "object",
      properties: {
        child_name: {
          type: "string",
          description: "The child's name"
        },
        skill_name: {
          type: "string",
          description: "The skill to analyze (e.g. 'pincer_grip', 'concentration', 'phonemic_awareness')"
        }
      },
      required: ["child_name", "skill_name"]
    }
  },
  {
    name: "compare_children",
    description: "Compare two or more children's progress side-by-side. Shows area coverage, skill strengths, and where each child is in the curriculum. Use when the teacher asks about grouping children or comparing progress.",
    input_schema: {
      type: "object",
      properties: {
        child_names: {
          type: "array",
          items: { type: "string" },
          description: "List of child names to compare"
        },
        focus_area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "culture"],
          description: "Optional: focus comparison on a specific area"
        }
      },
      required: ["child_names"]
    }
  },
  {
    name: "record_observation",
    description: "Record a new observation for a child. This is used during batch processing when the teacher dictates observations. Returns confirmation and any immediate insights triggered by the new data.",
    input_schema: {
      type: "object",
      properties: {
        child_name: {
          type: "string",
          description: "The child's name"
        },
        exercise_id: {
          type: "string",
          description: "The exercise ID or name"
        },
        status: {
          type: "string",
          enum: ["introduced", "practicing", "mastered", "struggling"],
          description: "The observation status"
        },
        notes: {
          type: "string",
          description: "Teacher's observation notes (free text)"
        },
        date: {
          type: "string",
          description: "Observation date in YYYY-MM-DD format. Defaults to today."
        }
      },
      required: ["child_name", "exercise_id", "status"]
    }
  }
];


// ============================================================
// PART 2: SYSTEM PROMPT
// ============================================================
//
// This is what makes Claude behave as "the Guru" — a Montessori 3-6
// expert teaching partner. It sets tone, boundaries, and behavior.

// NOTE: GURU_SYSTEM_PROMPT is defined as a function so it can reference EXERCISES after load
function getGuruSystemPrompt() {
  return `You are the Guru — an AI teaching partner for Montessori 3-6 classrooms, built into the Montree platform.

## WHO YOU ARE

You are a deeply knowledgeable Montessori guide assistant. You have studied AMI and AMS approaches to the 3-6 curriculum and understand the developmental reasoning behind every material, sequence, and presentation. You are NOT the teacher — you are the teacher's thinking partner. You observe patterns across the data they've collected and surface insights they might not have time to notice.

## YOUR CORE PRINCIPLES

1. **The Teacher Decides.** You suggest, you never dictate. Every recommendation ends with space for the teacher's judgment. You might say "The data suggests..." or "You might consider..." — never "You should" or "You must."

2. **Show Your Reasoning.** Every insight you share, explain WHY. If you suggest a child needs more practical life work before advancing in language, explain the specific skill gap, which exercises evidence the gap, and what you'd recommend to fill it. Teachers learn from your reasoning and can push back when you're wrong.

3. **Follow the Child.** This isn't a checklist curriculum. Children develop at their own pace. Your job is to notice when the data suggests a child is ready, struggling, or being overlooked — not to enforce a rigid timeline.

4. **Cross-Area Thinking is Your Superpower.** Teachers often think within one curriculum area at a time. Your unique value is seeing connections across areas — how practical life fine motor work enables writing, how sensorial dimension work enables math, how vocabulary enrichment enables cultural studies. Always look for these bridges.

5. **Observation Notes Are Gold.** When a teacher writes "grip is weak" or "loses count in the 70s," that's diagnostic information. Parse these notes carefully. They often contain the WHY behind a struggle that the exercise status alone can't reveal.

6. **Celebrate Progress.** Don't only flag problems. When a child has mastered a beautiful sequence, or when their skill strength in an area is growing, say so. Teachers need encouragement too.

## YOUR TOOLS

You have access to the Montree reasoning engine through tool calls. Use them liberally — don't guess at data you can look up. Specifically:

- When asked about a child → call get_child_profile first
- When asked what to present next → call get_prioritized_recommendations
- When a child is struggling → call get_struggling_analysis for the deep dive
- When asked about a specific skill → call get_skill_analysis
- When checking if a child is ready → call check_exercise_readiness
- For morning briefings → call get_classroom_overview
- When recording observations → call record_observation, then surface any new insights

## RESPONSE STYLE

- **Conversational but substantive.** You're talking to a busy professional during their prep time or after school. Be warm but get to the point.
- **Use the child's name.** Always refer to children by name, never by ID.
- **Translate technical terms.** Say "pincer grip" not "pincer_grip". Say "she's practiced 3 exercises that build this skill" not "skill_strength: 3".
- **Structure for scanning.** Teachers will often skim your response. Put the most important insight first. Use brief structure when listing multiple recommendations.
- **Be honest about uncertainty.** If you're not sure, say so. "Based on the data I can see..." or "This might also be because..." — never present inference as fact.

## WHAT YOU DON'T DO

- You don't diagnose developmental delays or disabilities. If patterns suggest something beyond typical development, gently suggest the teacher speak with the school's support team.
- You don't override the teacher's direct observation. If a teacher says "actually she's doing fine with that," trust them — they see the child daily.
- You don't make up data. If an observation hasn't been recorded, say so.
- You don't provide generic Montessori advice disconnected from the specific child's data. Every recommendation should be grounded in what you actually know about that child.

## CONTEXT

You are currently supporting a Montessori 3-6 classroom. The curriculum covers five areas: Practical Life, Sensorial, Mathematics, Language, and Culture. Each area contains exercises with prerequisites, skill dependencies, and typical age ranges. Your knowledge base includes ${Object.keys(EXERCISES).length} exercises and ${Object.keys(graphData.skills_taxonomy).reduce((sum, cat) => sum + Object.keys(graphData.skills_taxonomy[cat]).length, 0)} tracked skills across ${Object.keys(graphData.skills_taxonomy).length} categories.`;
}


// ============================================================
// PART 3: TOOL EXECUTION LAYER
// ============================================================
//
// When Claude makes a tool call, we execute it against our engine
// and return structured results. In production, this is a LangGraph node.

const fs = require('fs');
const graphData = JSON.parse(fs.readFileSync('montree-curriculum-graph.json', 'utf8'));
const EXERCISES = graphData.exercises;

// Import engine functions (in production these are modules; here we inline the V3 engine)
// --- Paste from guru-engine-v3-test.js: core functions only ---

function parseAgeRange(rangeStr) {
  if (!rangeStr) return { min: 2.5, max: 6 };
  const parts = rangeStr.split("-");
  return { min: parseFloat(parts[0]) || 2.5, max: parseFloat(parts[1]) || 6 };
}

function getAgeFit(childAge, exercise) {
  const range = parseAgeRange(exercise.typical_age_range);
  if (childAge >= range.min && childAge <= range.max + 0.5) return "ideal";
  if (childAge < range.min && childAge >= range.min - 0.5) return "slightly_young";
  if (childAge < range.min - 0.5) return "too_young";
  if (childAge > range.max + 0.5 && childAge <= range.max + 1.5) return "slightly_old";
  return "too_old";
}

const NOTE_PATTERNS = [
  { patterns: ["grip", "pincer", "hold", "grasp", "tripod"], skills: ["pincer_grip", "fine_motor_control", "tripod_grip"], label: "grip/grasp difficulty" },
  { patterns: ["fatigue", "tires", "tired hand", "hand cramp", "shaking"], skills: ["grip_strength", "fine_motor_control"], label: "hand fatigue" },
  { patterns: ["drops", "dropping", "spill", "knocks over"], skills: ["hand_eye_coordination", "controlled_movement", "fine_motor_control"], label: "object control difficulty" },
  { patterns: ["scissors", "cutting", "cut"], skills: ["cutting_skill", "bilateral_coordination", "hand_eye_coordination"], label: "cutting difficulty" },
  { patterns: ["fold", "folding", "crease"], skills: ["folding_skill", "bilateral_coordination", "fine_motor_control"], label: "folding difficulty" },
  { patterns: ["pour", "pouring", "overflow", "miss the cup"], skills: ["pouring_control", "hand_eye_coordination", "controlled_movement"], label: "pouring difficulty" },
  { patterns: ["wrist", "twist", "turn the", "rotate"], skills: ["wrist_rotation", "fine_motor_control"], label: "wrist rotation difficulty" },
  { patterns: ["both hands", "two hands", "one hand only", "doesn't stabilize"], skills: ["bilateral_coordination"], label: "bilateral coordination difficulty" },
  { patterns: ["seriate", "arrangement", "order", "sequence", "length", "height", "gradient"], skills: ["seriation", "order_sense", "dimension_perception"], label: "seriation/ordering difficulty" },
  { patterns: ["sort", "classify", "group", "categorize", "which pile"], skills: ["classification", "logical_reasoning"], label: "classification difficulty" },
  { patterns: ["pattern", "repeat", "what comes next"], skills: ["pattern_recognition"], label: "pattern recognition difficulty" },
  { patterns: ["count", "counting", "skip", "loses count", "miscounts"], skills: ["one_to_one_correspondence", "number_sense", "memory_sequential"], label: "counting difficulty" },
  { patterns: ["quantity", "how many", "more than", "less than", "greater", "fewer"], skills: ["number_sense", "comparison"], label: "quantity comprehension difficulty" },
  { patterns: ["tens", "hundreds", "place value", "decimal", "units"], skills: ["decimal_understanding", "number_sense"], label: "place value difficulty" },
  { patterns: ["concentrate", "focus", "distract", "attention", "wanders", "fidget"], skills: ["concentration", "self_regulation"], label: "concentration difficulty" },
  { patterns: ["remember", "forgot", "memory", "forgets step", "sequence wrong"], skills: ["memory_sequential", "order_sense"], label: "memory/sequence difficulty" },
  { patterns: ["problem solv", "stuck", "gives up", "won't try", "frustrated"], skills: ["problem_solving", "persistence"], label: "problem solving / persistence difficulty" },
  { patterns: ["color", "colour", "shade", "gradient", "match the color"], skills: ["chromatic_sense", "visual_discrimination"], label: "color discrimination difficulty" },
  { patterns: ["texture", "rough", "smooth", "feel"], skills: ["tactile_discrimination"], label: "tactile discrimination difficulty" },
  { patterns: ["sound", "loud", "quiet", "hear", "listening"], skills: ["auditory_discrimination"], label: "auditory discrimination difficulty" },
  { patterns: ["size", "dimension", "bigger", "smaller", "thick", "thin", "wide", "narrow"], skills: ["dimension_perception", "visual_discrimination", "comparison"], label: "dimension perception difficulty" },
  { patterns: ["shape", "triangle", "circle", "square", "geometric"], skills: ["spatial_reasoning", "visual_discrimination"], label: "shape recognition difficulty" },
  { patterns: ["weight", "heavy", "light", "heavier"], skills: ["baric_sense"], label: "weight discrimination difficulty" },
  { patterns: ["sound out", "phoneme", "beginning sound", "ending sound", "rhyme"], skills: ["phonemic_awareness", "auditory_discrimination"], label: "phonemic awareness difficulty" },
  { patterns: ["blend", "blending", "put sounds together"], skills: ["blending", "phonetic_decoding"], label: "blending difficulty" },
  { patterns: ["letter", "reversal", "backward", "mirror", "confuse b and d", "mixes up", "mix up"], skills: ["letter_formation", "symbol_recognition", "visual_discrimination"], label: "letter formation/recognition difficulty" },
  { patterns: ["read", "decode", "sound it out", "doesn't recognize"], skills: ["phonetic_decoding", "reading_fluency", "symbol_sound_association"], label: "reading/decoding difficulty" },
  { patterns: ["write", "writing", "pencil control", "trace", "tracing"], skills: ["handwriting_control", "tripod_grip", "letter_formation"], label: "writing difficulty" },
  { patterns: ["vocabulary", "word", "doesn't know the word", "name it"], skills: ["vocabulary_enrichment", "oral_expression"], label: "vocabulary difficulty" },
  { patterns: ["sentence", "grammar", "word order"], skills: ["sentence_construction", "grammar_awareness"], label: "grammar/sentence difficulty" },
  { patterns: ["comprehension", "understand", "meaning", "doesn't get", "confused by story"], skills: ["reading_comprehension", "story_comprehension"], label: "comprehension difficulty" },
  { patterns: ["independent", "asks for help", "won't try alone", "needs adult"], skills: ["independence", "confidence"], label: "independence difficulty" },
  { patterns: ["upset", "tantrum", "cry", "emotional", "overwhelm"], skills: ["self_regulation", "patience"], label: "emotional regulation difficulty" },
  { patterns: ["share", "turn", "wait", "snatch", "grab"], skills: ["cooperation", "patience", "grace_and_courtesy"], label: "social interaction difficulty" },
  { patterns: ["careful", "rough", "throws", "careless", "doesn't return"], skills: ["respect_for_materials", "care_of_environment"], label: "material handling difficulty" },
  { patterns: ["self.correct", "check", "error", "doesn't notice mistake"], skills: ["self_correction", "observation"], label: "self-correction difficulty" },
  { patterns: ["balance", "stumble", "bump into", "clumsy", "trip", "fall", "unsteady"], skills: ["gross_motor_control", "controlled_movement"], label: "gross motor difficulty" },
  { patterns: ["whole hand", "fist", "can't open hand", "palm"], skills: ["palmar_grasp", "fine_motor_control"], label: "palmar grasp difficulty" },
  { patterns: ["individual finger", "finger isolation", "can't point", "all fingers move"], skills: ["finger_isolation", "fine_motor_control"], label: "finger isolation difficulty" },
  { patterns: ["visual memory", "can't picture", "doesn't remember what it looked like", "forgot the image"], skills: ["memory_visual"], label: "visual memory difficulty" },
  { patterns: ["abstract", "concrete only", "needs the material", "can't do it in head", "without the beads"], skills: ["abstraction", "logical_reasoning"], label: "abstraction difficulty" },
  { patterns: ["estimate", "guess how many", "approximate", "about how much"], skills: ["estimation", "number_sense"], label: "estimation difficulty" },
  { patterns: ["take apart", "break down", "which parts"], skills: ["analysis", "logical_reasoning"], label: "analysis difficulty" },
  { patterns: ["put together", "combine", "build from parts", "assemble", "compose"], skills: ["synthesis", "problem_solving"], label: "synthesis difficulty" },
  { patterns: ["dress", "button", "zip", "shoe", "lace", "apron", "jacket"], skills: ["self_care", "care_of_self", "independence"], label: "self-care/dressing difficulty" },
  { patterns: ["cook", "recipe", "ingredient", "stir", "chop", "peel"], skills: ["food_preparation", "order_sense", "tool_use"], label: "food preparation difficulty" },
  { patterns: ["sweep", "wipe", "mop", "dust", "tidy", "clean up"], skills: ["cleaning", "care_of_environment"], label: "cleaning difficulty" },
  { patterns: ["tool", "handle", "safely", "proper way to hold"], skills: ["tool_use", "hand_eye_coordination"], label: "tool use difficulty" },
  { patterns: ["water play", "splash", "overflow the basin", "can't control water"], skills: ["water_handling", "controlled_movement"], label: "water handling difficulty" },
  { patterns: ["water the plant", "soil", "garden", "leaf care"], skills: ["plant_care", "care_of_environment", "responsibility"], label: "plant care difficulty" },
  { patterns: ["animal", "feed the", "gentle with", "cage", "fish tank"], skills: ["animal_care", "empathy", "responsibility"], label: "animal care difficulty" },
  { patterns: ["spell", "build the word", "moveable alphabet", "which letters make"], skills: ["word_building", "phonetic_decoding", "symbol_sound_association"], label: "word building difficulty" },
  { patterns: ["story writing", "what to write", "can't think of", "ideas for writing", "journal"], skills: ["creative_writing", "oral_expression"], label: "creative writing difficulty" },
  { patterns: ["feelings", "how they feel", "kind to", "hurt someone's feelings"], skills: ["empathy", "cooperation"], label: "empathy difficulty" },
  { patterns: ["responsible", "owns up", "blame", "forgot to put back", "left it out"], skills: ["responsibility", "care_of_environment"], label: "responsibility difficulty" },
  { patterns: ["smell", "sniff", "stinky", "fragrance", "nose"], skills: ["olfactory_discrimination"], label: "olfactory discrimination difficulty" },
  { patterns: ["taste", "sour", "sweet", "bitter", "salty", "tongue"], skills: ["gustatory_discrimination"], label: "gustatory discrimination difficulty" },
  { patterns: ["temperature", "hot", "cold", "warm", "cool", "thermic"], skills: ["thermic_sense"], label: "thermic discrimination difficulty" },
  { patterns: ["blindfold", "by touch", "eyes closed", "stereognostic", "what is it without looking"], skills: ["stereognostic_sense", "tactile_discrimination"], label: "stereognostic difficulty" },
];

function analyzeNotes(notesText) {
  if (!notesText) return [];
  const lower = notesText.toLowerCase();
  const clues = [];
  for (const pattern of NOTE_PATTERNS) {
    for (const keyword of pattern.patterns) {
      if (lower.includes(keyword)) {
        clues.push({ matchedKeyword: keyword, skills: pattern.skills, label: pattern.label });
        break;
      }
    }
  }
  return clues;
}

function getChildProfile(child) {
  const mastered = new Set();
  const practicing = new Set();
  const struggling = new Set();
  const allObserved = new Set();
  const latestObs = {};

  for (const obs of child.observations) {
    allObserved.add(obs.exercise);
    if (!latestObs[obs.exercise] || obs.date > latestObs[obs.exercise].date) {
      latestObs[obs.exercise] = obs;
    }
  }

  for (const [exId, obs] of Object.entries(latestObs)) {
    if (obs.status === "mastered") mastered.add(exId);
    else if (obs.status === "practicing") practicing.add(exId);
    else if (obs.status === "struggling") struggling.add(exId);
  }

  const skillStrength = {};
  for (const exId of mastered) {
    const ex = EXERCISES[exId];
    if (ex) {
      for (const skill of ex.skills_developed) {
        skillStrength[skill] = (skillStrength[skill] || 0) + 1;
      }
    }
  }

  const areaCoverage = {};
  for (const exId of [...mastered, ...practicing, ...struggling]) {
    const ex = EXERCISES[exId];
    if (ex) areaCoverage[ex.area] = (areaCoverage[ex.area] || 0) + 1;
  }

  const lastObsByArea = {};
  for (const obs of child.observations) {
    const ex = EXERCISES[obs.exercise];
    if (ex) {
      if (!lastObsByArea[ex.area] || obs.date > lastObsByArea[ex.area]) {
        lastObsByArea[ex.area] = obs.date;
      }
    }
  }

  return { mastered, practicing, struggling, allObserved, latestObs, skillStrength, areaCoverage, lastObsByArea };
}

function detectCrossAreaInsights(child) {
  const profile = getChildProfile(child);
  const insights = [];

  for (const exId of profile.struggling) {
    const ex = EXERCISES[exId];
    if (!ex) continue;

    const notesText = child.observations.filter(o => o.exercise === exId).map(o => o.notes).filter(n => n).join(" ");
    const weakSkills = [];
    for (const skill of ex.skills_required) {
      const strength = profile.skillStrength[skill] || 0;
      if (strength < 3) weakSkills.push({ skill, strength });
    }

    const noteClues = [];
    const noteAnalysis = analyzeNotes(notesText);
    for (const clue of noteAnalysis) {
      noteClues.push(`Notes indicate: ${clue.label} ("${clue.matchedKeyword}")`);
      for (const skill of clue.skills) {
        if (!weakSkills.find(w => w.skill === skill)) {
          weakSkills.push({ skill, strength: profile.skillStrength[skill] || 0 });
        }
      }
    }

    if (weakSkills.length > 0) {
      const weakSkillNames = weakSkills.map(w => w.skill);
      const bridgeExercises = [];
      for (const [otherId, otherEx] of Object.entries(EXERCISES)) {
        if (profile.mastered.has(otherId) || otherId === exId) continue;
        const develops = otherEx.skills_developed.filter(s => weakSkillNames.includes(s));
        if (develops.length > 0) {
          const prereqsMet = otherEx.prerequisites.every(p => profile.mastered.has(p)) || otherEx.prerequisites.length === 0;
          if (prereqsMet) {
            bridgeExercises.push({
              id: otherId, name: otherEx.name, area: otherEx.area, sub_area: otherEx.sub_area,
              bridgeSkills: develops, crossArea: otherEx.area !== ex.area,
              score: develops.length * 2 + (otherEx.area !== ex.area ? 3 : 0)
            });
          }
        }
      }
      bridgeExercises.sort((a, b) => b.score - a.score);
      insights.push({
        type: "struggling_analysis", severity: "high", child: child.name,
        exercise: { id: exId, name: ex.name, area: ex.area },
        weak_skills: weakSkills, note_clues: noteClues,
        suggested_bridges: bridgeExercises,
        cross_area_bridges: bridgeExercises.filter(b => b.crossArea),
        same_area_bridges: bridgeExercises.filter(b => !b.crossArea)
      });
    }
  }

  for (const exId of profile.practicing) {
    const ex = EXERCISES[exId];
    if (!ex) continue;
    const unmetPrereqs = ex.prerequisites.filter(p => !profile.mastered.has(p));
    if (unmetPrereqs.length > 0) {
      insights.push({
        type: "premature_introduction", severity: "medium", child: child.name,
        exercise: { id: exId, name: ex.name, area: ex.area },
        unmet_prerequisites: unmetPrereqs.map(p => ({ id: p, name: EXERCISES[p]?.name, area: EXERCISES[p]?.area }))
      });
    }
  }

  const areas = ["practical_life", "sensorial", "mathematics", "language", "culture"];
  const totalObs = Object.values(profile.areaCoverage).reduce((a, b) => a + b, 0);
  if (totalObs >= 8) {
    for (const area of areas) {
      const count = profile.areaCoverage[area] || 0;
      const pct = count / totalObs;
      if (pct > 0.6) {
        insights.push({
          type: "area_imbalance", severity: "low", child: child.name,
          dominant_area: area, percentage: Math.round(pct * 100),
          message: `${Math.round(pct * 100)}% of observations are in ${area.replace(/_/g, " ")} — consider broadening`
        });
      }
    }
  }

  return insights;
}

function detectAttentionFlags(child, today = "2026-03-29") {
  const profile = getChildProfile(child);
  const flags = [];
  const todayDate = new Date(today);
  const areas = ["practical_life", "sensorial", "mathematics", "language", "culture"];

  for (const area of areas) {
    const lastObs = profile.lastObsByArea[area];
    if (!lastObs) {
      flags.push({ type: "no_observations", area, message: `No observations in ${area.replace(/_/g, " ")}` });
    } else {
      const daysSince = Math.floor((todayDate - new Date(lastObs)) / 86400000);
      if (daysSince > 21) {
        flags.push({ type: "stale_area", area, daysSince, message: `No ${area.replace(/_/g, " ")} observations in ${daysSince} days` });
      }
    }
  }

  for (const exId of profile.struggling) {
    const obs = child.observations.filter(o => o.exercise === exId);
    if (obs.length >= 3) {
      flags.push({ type: "prolonged_struggle", exercise: exId, name: EXERCISES[exId]?.name, attempts: obs.length });
    }
  }

  for (const exId of profile.practicing) {
    const obs = child.observations.filter(o => o.exercise === exId).sort((a, b) => b.date.localeCompare(a.date));
    if (obs.length >= 2) {
      const daysSince = Math.floor((todayDate - new Date(obs[0].date)) / 86400000);
      if (daysSince > 14) {
        flags.push({ type: "stalled_practice", exercise: exId, name: EXERCISES[exId]?.name, daysSince });
      }
    }
  }

  return flags;
}

function getPrioritizedRecommendations(child, areaFilter = null, limit = 10) {
  const profile = getChildProfile(child);
  const insights = detectCrossAreaInsights(child);
  const flags = detectAttentionFlags(child);
  const areas = ["practical_life", "sensorial", "mathematics", "language", "culture"];

  const readyRaw = [];
  for (const [exId, ex] of Object.entries(EXERCISES)) {
    if (profile.mastered.has(exId) || profile.practicing.has(exId) || profile.struggling.has(exId)) continue;
    if (areaFilter && ex.area !== areaFilter) continue;

    const prereqsMet = ex.prerequisites.length > 0 && ex.prerequisites.every(p => profile.mastered.has(p));
    const isRoot = ex.prerequisites.length === 0 && !profile.allObserved.has(exId);
    if (prereqsMet || isRoot) readyRaw.push({ id: exId, ...ex, isRoot });
  }

  const unblockingTargets = new Set();
  for (const exId of profile.struggling) {
    const ex = EXERCISES[exId];
    if (ex) for (const prereq of ex.prerequisites) if (!profile.mastered.has(prereq)) unblockingTargets.add(prereq);
  }

  const bridgeIds = new Set();
  for (const insight of insights.filter(i => i.type === "struggling_analysis")) {
    for (const bridge of insight.suggested_bridges) bridgeIds.add(bridge.id);
  }

  const totalObs = Object.values(profile.areaCoverage).reduce((a, b) => a + b, 0);
  const gapAreas = new Set();
  const staleAreas = new Set();
  for (const area of areas) {
    const count = profile.areaCoverage[area] || 0;
    if (totalObs >= 5 && count / totalObs < 0.10) gapAreas.add(area);
    if (!profile.lastObsByArea[area]) gapAreas.add(area);
  }
  for (const flag of flags.filter(f => f.type === "stale_area" || f.type === "no_observations")) staleAreas.add(flag.area);

  const weakSkillSet = new Set();
  for (const insight of insights.filter(i => i.type === "struggling_analysis")) {
    for (const ws of insight.weak_skills) weakSkillSet.add(ws.skill);
  }

  const scored = readyRaw.map(ex => {
    let score = 0;
    const reasons = [];

    if (unblockingTargets.has(ex.id)) { score += 50; reasons.push("unblocks a struggling exercise"); }
    if (bridgeIds.has(ex.id)) { score += 40; reasons.push("bridge for struggling skill"); }
    if (gapAreas.has(ex.area) || staleAreas.has(ex.area)) { score += 30; reasons.push(`fills gap in ${ex.area.replace(/_/g, " ")}`); }

    const developsWeak = ex.skills_developed.filter(s => weakSkillSet.has(s));
    if (developsWeak.length > 0) { score += 10 + developsWeak.length * 5; reasons.push(`reinforces weak: ${developsWeak.join(", ")}`); }

    const ageFit = getAgeFit(child.age, ex);
    if (ageFit === "ideal") { score += 15; reasons.push("age-appropriate"); }
    else if (ageFit === "slightly_young") { score += 5; reasons.push("slightly young but reachable"); }
    else if (ageFit === "slightly_old") { score -= 10; reasons.push("below age range"); }
    else if (ageFit === "too_old") { score -= 10; reasons.push("well below age range"); }
    else if (ageFit === "too_young") { score -= 30; reasons.push("above age range"); }

    const successorCount = ex.successors ? ex.successors.length : 0;
    const flowBonus = Math.min(successorCount * 3, 10);
    score += flowBonus;
    if (flowBonus > 0) reasons.push(`unlocks ${successorCount} successor(s)`);

    if (ex.isRoot && profile.mastered.size > 5) { score -= 5; reasons.push("root exercise"); }

    return {
      id: ex.id, name: ex.name, area: ex.area, sub_area: ex.sub_area,
      score, reasons, ageFit, isRoot: ex.isRoot,
      tier: score >= 40 ? "urgent" : score >= 20 ? "recommended" : score >= 0 ? "available" : "deferred"
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(ex => ex.ageFit !== "too_young").slice(0, limit);
}


// ============================================================
// PART 3b: TOOL EXECUTION DISPATCHER
// ============================================================
//
// Takes a tool call from Claude and executes it against the engine.
// In production, this is a LangGraph tool node. Here it's a switch.

// Simulated classroom database
const CLASSROOM = {};

function registerChild(child) {
  CLASSROOM[child.name.toLowerCase()] = child;
}

function findChild(name) {
  return CLASSROOM[name.toLowerCase()] || null;
}

function findExerciseByQuery(query) {
  const q = query.toLowerCase();
  const results = [];
  for (const [id, ex] of Object.entries(EXERCISES)) {
    const matchName = ex.name.toLowerCase().includes(q);
    const matchArea = ex.area.toLowerCase().includes(q);
    const matchSubArea = (ex.sub_area || "").toLowerCase().includes(q);
    const matchSkill = ex.skills_developed.some(s => s.includes(q)) || ex.skills_required.some(s => s.includes(q));
    if (matchName || matchArea || matchSubArea || matchSkill) {
      results.push({ id, ...ex, matchType: matchName ? "name" : matchArea ? "area" : matchSubArea ? "sub_area" : "skill" });
    }
  }
  return results.slice(0, 20);
}

function executeTool(toolName, toolInput) {
  switch (toolName) {

    case "get_child_profile": {
      const child = findChild(toolInput.child_name);
      if (!child) return { error: `Child "${toolInput.child_name}" not found in classroom.` };
      const profile = getChildProfile(child);
      return {
        name: child.name,
        age: child.age,
        summary: {
          mastered: profile.mastered.size,
          practicing: profile.practicing.size,
          struggling: profile.struggling.size,
          total_observed: profile.allObserved.size
        },
        mastered_exercises: [...profile.mastered].map(id => ({ id, name: EXERCISES[id]?.name, area: EXERCISES[id]?.area })),
        practicing_exercises: [...profile.practicing].map(id => ({ id, name: EXERCISES[id]?.name, area: EXERCISES[id]?.area })),
        struggling_exercises: [...profile.struggling].map(id => ({ id, name: EXERCISES[id]?.name, area: EXERCISES[id]?.area })),
        area_coverage: profile.areaCoverage,
        top_skills: Object.entries(profile.skillStrength).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([s, c]) => ({ skill: s, strength: c })),
        last_observation_by_area: profile.lastObsByArea
      };
    }

    case "get_prioritized_recommendations": {
      const child = findChild(toolInput.child_name);
      if (!child) return { error: `Child "${toolInput.child_name}" not found.` };
      const recs = getPrioritizedRecommendations(child, toolInput.area_filter || null, toolInput.limit || 10);
      return {
        child: child.name,
        age: child.age,
        total_available: recs.length,
        recommendations: recs.map(r => ({
          exercise: r.name,
          area: r.area.replace(/_/g, " "),
          priority_tier: r.tier,
          score: r.score,
          reasons: r.reasons,
          age_fit: r.ageFit
        }))
      };
    }

    case "get_struggling_analysis": {
      const child = findChild(toolInput.child_name);
      if (!child) return { error: `Child "${toolInput.child_name}" not found.` };
      const insights = detectCrossAreaInsights(child);
      let analyses = insights.filter(i => i.type === "struggling_analysis");
      if (toolInput.exercise_id) {
        analyses = analyses.filter(a => a.exercise.id === toolInput.exercise_id);
      }
      return {
        child: child.name,
        analyses: analyses.map(a => ({
          exercise: a.exercise.name,
          exercise_area: a.exercise.area.replace(/_/g, " "),
          weak_skills: a.weak_skills.map(w => ({ skill: w.skill.replace(/_/g, " "), strength: w.strength, needs_reinforcement: w.strength < 3 })),
          observation_clues: a.note_clues,
          recommended_bridges: {
            cross_area: a.cross_area_bridges.slice(0, 5).map(b => ({
              exercise: b.name, area: b.area.replace(/_/g, " "), develops: b.bridgeSkills.map(s => s.replace(/_/g, " "))
            })),
            same_area: a.same_area_bridges.slice(0, 3).map(b => ({
              exercise: b.name, develops: b.bridgeSkills.map(s => s.replace(/_/g, " "))
            }))
          }
        })),
        premature_introductions: insights.filter(i => i.type === "premature_introduction").map(p => ({
          exercise: p.exercise.name, unmet: p.unmet_prerequisites.map(u => u.name)
        }))
      };
    }

    case "get_attention_flags": {
      if (toolInput.child_name === "__ALL__") {
        const allFlags = {};
        for (const [name, child] of Object.entries(CLASSROOM)) {
          allFlags[child.name] = detectAttentionFlags(child);
        }
        return allFlags;
      }
      const child = findChild(toolInput.child_name);
      if (!child) return { error: `Child "${toolInput.child_name}" not found.` };
      return { child: child.name, flags: detectAttentionFlags(child) };
    }

    case "get_classroom_overview": {
      const overview = [];
      for (const [name, child] of Object.entries(CLASSROOM)) {
        const profile = getChildProfile(child);
        const flags = detectAttentionFlags(child);
        const insights = detectCrossAreaInsights(child);
        const recs = getPrioritizedRecommendations(child, null, 3);
        overview.push({
          name: child.name,
          age: child.age,
          mastered: profile.mastered.size,
          practicing: profile.practicing.size,
          struggling: profile.struggling.size,
          flag_count: flags.length,
          top_flags: flags.slice(0, 3).map(f => f.message || f.type),
          top_insight: insights[0] ? `${insights[0].type}: ${insights[0].exercise?.name || insights[0].dominant_area}` : "None",
          top_recommendation: recs[0] ? `${recs[0].name} (${recs[0].tier})` : "None"
        });
      }

      if (toolInput.sort_by === "name") overview.sort((a, b) => a.name.localeCompare(b.name));
      else if (toolInput.sort_by === "age") overview.sort((a, b) => a.age - b.age);
      else overview.sort((a, b) => b.flag_count - a.flag_count); // urgency default

      return { classroom_size: overview.length, children: overview };
    }

    case "check_exercise_readiness": {
      const child = findChild(toolInput.child_name);
      if (!child) return { error: `Child "${toolInput.child_name}" not found.` };

      // Find exercise by ID or name
      let exId = toolInput.exercise_id;
      let ex = EXERCISES[exId];
      if (!ex) {
        const found = findExerciseByQuery(toolInput.exercise_id);
        if (found.length > 0) { exId = found[0].id; ex = EXERCISES[exId]; }
        else return { error: `Exercise "${toolInput.exercise_id}" not found.` };
      }

      const profile = getChildProfile(child);
      const prereqStatus = ex.prerequisites.map(p => ({
        id: p, name: EXERCISES[p]?.name, mastered: profile.mastered.has(p)
      }));
      const allPrereqsMet = prereqStatus.every(p => p.mastered);
      const ageFit = getAgeFit(child.age, ex);
      const alreadyObserved = profile.allObserved.has(exId);
      const currentStatus = profile.latestObs[exId]?.status || null;

      // Skill readiness
      const skillReadiness = ex.skills_required.map(s => ({
        skill: s.replace(/_/g, " "),
        strength: profile.skillStrength[s] || 0,
        adequate: (profile.skillStrength[s] || 0) >= 2
      }));

      return {
        child: child.name,
        exercise: { id: exId, name: ex.name, area: ex.area },
        ready: allPrereqsMet && !alreadyObserved,
        prerequisites: { all_met: allPrereqsMet, details: prereqStatus },
        age_fit: ageFit,
        skill_readiness: skillReadiness,
        already_observed: alreadyObserved,
        current_status: currentStatus,
        recommendation: allPrereqsMet && !alreadyObserved && ageFit !== "too_young"
          ? "Ready to present"
          : !allPrereqsMet ? `Not yet — needs: ${prereqStatus.filter(p => !p.mastered).map(p => p.name).join(", ")}`
          : alreadyObserved ? `Already ${currentStatus}`
          : ageFit === "too_young" ? "May be too advanced for current age"
          : "Review prerequisites"
      };
    }

    case "find_exercise": {
      return { results: findExerciseByQuery(toolInput.query) };
    }

    case "get_skill_analysis": {
      const child = findChild(toolInput.child_name);
      if (!child) return { error: `Child "${toolInput.child_name}" not found.` };
      const profile = getChildProfile(child);
      const skill = toolInput.skill_name;
      const strength = profile.skillStrength[skill] || 0;

      // Which mastered exercises developed this skill?
      const developedBy = [...profile.mastered]
        .filter(id => EXERCISES[id]?.skills_developed.includes(skill))
        .map(id => ({ id, name: EXERCISES[id]?.name, area: EXERCISES[id]?.area }));

      // Which exercises could further develop it?
      const canDevelop = [];
      for (const [id, ex] of Object.entries(EXERCISES)) {
        if (profile.mastered.has(id)) continue;
        if (!ex.skills_developed.includes(skill)) continue;
        const prereqsMet = ex.prerequisites.every(p => profile.mastered.has(p)) || ex.prerequisites.length === 0;
        if (prereqsMet) canDevelop.push({ id, name: ex.name, area: ex.area, ageFit: getAgeFit(child.age, ex) });
      }

      return {
        child: child.name,
        skill: skill.replace(/_/g, " "),
        strength,
        assessment: strength >= 5 ? "strong" : strength >= 3 ? "developing" : strength >= 1 ? "emerging" : "not yet developed",
        developed_by: developedBy,
        can_further_develop: canDevelop.slice(0, 10)
      };
    }

    case "compare_children": {
      const children = toolInput.child_names.map(n => findChild(n)).filter(Boolean);
      if (children.length < 2) return { error: "Need at least 2 valid children to compare." };

      return {
        children: children.map(child => {
          const profile = getChildProfile(child);
          return {
            name: child.name,
            age: child.age,
            mastered: profile.mastered.size,
            practicing: profile.practicing.size,
            area_coverage: profile.areaCoverage,
            top_skills: Object.entries(profile.skillStrength).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${s}(${c})`)
          };
        })
      };
    }

    case "record_observation": {
      const child = findChild(toolInput.child_name);
      if (!child) return { error: `Child "${toolInput.child_name}" not found.` };

      let exId = toolInput.exercise_id;
      if (!EXERCISES[exId]) {
        const found = findExerciseByQuery(toolInput.exercise_id);
        if (found.length > 0) exId = found[0].id;
        else return { error: `Exercise "${toolInput.exercise_id}" not found.` };
      }

      const newObs = {
        exercise: exId,
        date: toolInput.date || new Date().toISOString().split("T")[0],
        status: toolInput.status,
        notes: toolInput.notes || ""
      };
      child.observations.push(newObs);

      // Check for new insights
      const insights = detectCrossAreaInsights(child);
      const flags = detectAttentionFlags(child);

      return {
        recorded: true,
        observation: { child: child.name, exercise: EXERCISES[exId].name, status: newObs.status, date: newObs.date },
        triggered_insights: insights.length > 0 ? insights.map(i => `${i.type}: ${i.exercise?.name || i.dominant_area}`) : [],
        active_flags: flags.length
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}


// ============================================================
// PART 4: SIMULATED CONVERSATIONS
// ============================================================
//
// These show exactly how the Guru would handle real teacher queries.
// Each conversation simulates the full Claude API loop:
// 1. Teacher message → Claude
// 2. Claude decides which tools to call
// 3. Tool results → Claude
// 4. Claude generates natural response
//
// We simulate steps 2 and 3; the actual Claude response (step 4)
// is described in comments showing what the Guru would say.

// Register sample children
const PRIYA = {
  name: "Priya", age: 4.2,
  observations: [
    { exercise: "PL001", date: "2026-03-01", status: "mastered", notes: "Confident on the line" },
    { exercise: "PL002", date: "2026-03-01", status: "mastered", notes: "Carries tray steadily" },
    { exercise: "PL005", date: "2026-03-02", status: "mastered", notes: "Opens all container types" },
    { exercise: "PL010", date: "2026-03-02", status: "mastered", notes: "Pours grains cleanly" },
    { exercise: "PL020", date: "2026-03-03", status: "mastered", notes: "Spoons accurately" },
    { exercise: "PL011", date: "2026-03-05", status: "mastered", notes: "Pours water confidently" },
    { exercise: "PL030", date: "2026-03-05", status: "mastered", notes: "Full hand washing sequence" },
    { exercise: "PL070", date: "2026-03-07", status: "mastered", notes: "Greets everyone warmly" },
    { exercise: "S001", date: "2026-03-10", status: "mastered", notes: "All cylinder blocks correct" },
    { exercise: "S010", date: "2026-03-10", status: "mastered", notes: "Builds tower confidently" },
    { exercise: "S020", date: "2026-03-12", status: "mastered", notes: "Names primary colors" },
    { exercise: "L001", date: "2026-03-14", status: "mastered", notes: "Strong beginning sound ID" },
    { exercise: "L005", date: "2026-03-15", status: "mastered", notes: "Rich vocabulary" },
    { exercise: "L010", date: "2026-03-18", status: "practicing", notes: "Traces most consonants, some reversals" },
    { exercise: "L012", date: "2026-03-20", status: "struggling", notes: "Difficulty gripping metal inset knob, can't maintain tripod grip" },
    { exercise: "L012", date: "2026-03-22", status: "struggling", notes: "Still struggling with grip. Hand fatigues quickly." },
    { exercise: "L012", date: "2026-03-25", status: "struggling", notes: "Third attempt. Grip remains weak. Pencil slips." },
    { exercise: "PL007", date: "2026-03-08", status: "practicing", notes: "Uses tongs but drops frequently. Grip not strong enough." },
    { exercise: "C001", date: "2026-03-08", status: "mastered", notes: "Land and water confident" },
  ]
};

const MARCUS = {
  name: "Marcus", age: 4.8,
  observations: [
    { exercise: "PL001", date: "2025-09-01", status: "mastered", notes: "" },
    { exercise: "PL002", date: "2025-09-01", status: "mastered", notes: "" },
    { exercise: "PL005", date: "2025-09-05", status: "mastered", notes: "" },
    { exercise: "PL010", date: "2025-09-05", status: "mastered", notes: "" },
    { exercise: "PL011", date: "2025-09-10", status: "mastered", notes: "" },
    { exercise: "PL020", date: "2025-09-10", status: "mastered", notes: "" },
    { exercise: "PL007", date: "2025-09-15", status: "mastered", notes: "" },
    { exercise: "PL030", date: "2025-09-20", status: "mastered", notes: "" },
    { exercise: "PL060", date: "2025-09-25", status: "mastered", notes: "" },
    { exercise: "PL070", date: "2025-09-25", status: "mastered", notes: "" },
    { exercise: "S001", date: "2025-10-01", status: "mastered", notes: "" },
    { exercise: "S010", date: "2025-10-05", status: "mastered", notes: "" },
    { exercise: "S020", date: "2025-10-10", status: "mastered", notes: "" },
    { exercise: "L001", date: "2025-10-20", status: "mastered", notes: "" },
    { exercise: "L010", date: "2025-11-01", status: "mastered", notes: "" },
    { exercise: "L005", date: "2025-11-15", status: "mastered", notes: "" },
    { exercise: "M001", date: "2025-12-01", status: "practicing", notes: "Struggles with seriation of rods. Counts segments but arrangement is inconsistent." },
    { exercise: "M001", date: "2025-12-15", status: "practicing", notes: "Still finding rod arrangement hard. Counts fine but visual comparison of lengths is weak." },
    { exercise: "M001", date: "2026-01-10", status: "practicing", notes: "Third attempt. Counting is strong but can't reliably seriate the rods by length." },
  ]
};

const LIAM = {
  name: "Liam", age: 5.1,
  observations: [
    { exercise: "PL001", date: "2026-01-10", status: "mastered", notes: "" },
    { exercise: "PL002", date: "2026-01-10", status: "mastered", notes: "" },
    { exercise: "PL005", date: "2026-01-10", status: "mastered", notes: "" },
    { exercise: "PL010", date: "2026-01-12", status: "mastered", notes: "" },
    { exercise: "PL011", date: "2026-01-12", status: "mastered", notes: "" },
    { exercise: "PL020", date: "2026-01-12", status: "mastered", notes: "" },
    { exercise: "PL007", date: "2026-01-15", status: "mastered", notes: "Excellent pincer grip" },
    { exercise: "PL030", date: "2026-01-15", status: "mastered", notes: "" },
    { exercise: "PL040", date: "2026-01-18", status: "mastered", notes: "" },
    { exercise: "PL060", date: "2026-01-20", status: "mastered", notes: "" },
    { exercise: "PL070", date: "2026-01-20", status: "mastered", notes: "" },
    { exercise: "S001", date: "2026-01-22", status: "mastered", notes: "" },
    { exercise: "S010", date: "2026-01-22", status: "mastered", notes: "" },
    { exercise: "S011", date: "2026-01-24", status: "mastered", notes: "" },
    { exercise: "S012", date: "2026-01-26", status: "mastered", notes: "" },
    { exercise: "S030", date: "2026-01-28", status: "mastered", notes: "" },
    { exercise: "S031", date: "2026-01-28", status: "mastered", notes: "Traces all shapes" },
    { exercise: "S020", date: "2026-02-01", status: "mastered", notes: "" },
    { exercise: "S021", date: "2026-02-01", status: "mastered", notes: "" },
    { exercise: "L001", date: "2026-02-05", status: "mastered", notes: "" },
    { exercise: "L002", date: "2026-02-05", status: "mastered", notes: "Strong phonemic awareness" },
    { exercise: "L010", date: "2026-02-08", status: "mastered", notes: "" },
    { exercise: "L011", date: "2026-02-10", status: "mastered", notes: "" },
    { exercise: "L005", date: "2026-02-12", status: "mastered", notes: "" },
    { exercise: "L012", date: "2026-02-15", status: "mastered", notes: "Beautiful inset work" },
    { exercise: "L020", date: "2026-02-18", status: "mastered", notes: "" },
    { exercise: "L021", date: "2026-02-20", status: "mastered", notes: "" },
    { exercise: "L030", date: "2026-02-25", status: "mastered", notes: "" },
    { exercise: "L031", date: "2026-03-01", status: "mastered", notes: "Reading with comprehension" },
    { exercise: "M001", date: "2026-03-01", status: "mastered", notes: "" },
    { exercise: "M002", date: "2026-03-05", status: "mastered", notes: "" },
    { exercise: "M003", date: "2026-03-08", status: "mastered", notes: "" },
    { exercise: "M004", date: "2026-03-10", status: "mastered", notes: "" },
    { exercise: "M005", date: "2026-03-12", status: "mastered", notes: "Odd/even understood" },
    { exercise: "M010", date: "2026-03-15", status: "mastered", notes: "" },
    { exercise: "M011", date: "2026-03-18", status: "practicing", notes: "Working on tens, loses count in 70s-90s" },
    { exercise: "C001", date: "2026-03-25", status: "mastered", notes: "" },
    { exercise: "C002", date: "2026-03-25", status: "mastered", notes: "" },
  ]
};

const AMARA = {
  name: "Amara", age: 3.4,
  observations: [
    { exercise: "PL001", date: "2026-02-01", status: "mastered", notes: "" },
    { exercise: "PL002", date: "2026-02-05", status: "mastered", notes: "" },
    { exercise: "PL005", date: "2026-02-05", status: "mastered", notes: "Loves the containers" },
    { exercise: "PL003", date: "2026-02-10", status: "mastered", notes: "" },
    { exercise: "PL070", date: "2026-02-12", status: "mastered", notes: "Very polite" },
    { exercise: "PL010", date: "2026-02-15", status: "practicing", notes: "Some spilling" },
    { exercise: "S010", date: "2026-02-20", status: "practicing", notes: "Doesn't always center cubes" },
    { exercise: "L001", date: "2026-02-25", status: "practicing", notes: "Getting beginning sounds" },
    { exercise: "C010", date: "2026-03-01", status: "mastered", notes: "Understands living vs non-living" },
    { exercise: "C020", date: "2026-03-05", status: "practicing", notes: "Learning days of the week" },
  ]
};

registerChild(PRIYA);
registerChild(MARCUS);
registerChild(LIAM);
registerChild(AMARA);


// ============================================================
// SIMULATED CONVERSATIONS
// ============================================================

console.log("\n══════════════════════════════════════════════════════════════");
console.log("MONTREE GURU — SIMULATED CONVERSATION FLOWS");
console.log("══════════════════════════════════════════════════════════════\n");

// --- CONVERSATION 1: "What should I present to Priya today?" ---
console.log("━━━ CONVERSATION 1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log('TEACHER: "Priya\'s been struggling with metal insets. What should I focus on with her today?"\n');
console.log("GURU THINKING: Teacher is asking about a specific struggling child → I need struggling analysis + recommendations\n");

console.log("→ Tool call 1: get_struggling_analysis({ child_name: 'Priya' })");
const priyaAnalysis = executeTool("get_struggling_analysis", { child_name: "Priya" });
console.log("  Result:", JSON.stringify(priyaAnalysis.analyses[0]?.weak_skills?.slice(0, 3), null, 2));
console.log(`  Note clues: ${priyaAnalysis.analyses[0]?.observation_clues?.join("; ")}`);
console.log(`  Top cross-area bridge: ${priyaAnalysis.analyses[0]?.recommended_bridges?.cross_area[0]?.exercise}\n`);

console.log("→ Tool call 2: get_prioritized_recommendations({ child_name: 'Priya', limit: 5 })");
const priyaRecs = executeTool("get_prioritized_recommendations", { child_name: "Priya", limit: 5 });
console.log("  Top 5:");
priyaRecs.recommendations.forEach((r, i) => {
  console.log(`    ${i + 1}. ${r.exercise} [${r.area}] — ${r.priority_tier} (score: ${r.score})`);
  console.log(`       Why: ${r.reasons.join(" | ")}`);
});

console.log(`
GURU WOULD RESPOND (natural language):
"Priya's been struggling with Metal Insets for three sessions now, and I can see why —
her observation notes consistently mention grip difficulty and hand fatigue. Looking at
her skill profile, she has pincer grip from just one exercise (Cylinder Blocks), and her
grip strength hasn't been developed yet.

Here's what I'd suggest: before pushing Metal Insets further, let's build her hand
strength through Practical Life. **Using Locks and Keys** and **Teeth Brushing** are
both ready for her and develop the fine motor control she needs. If you want something
specifically for grip strength, **Sponge Squeezing** is great for that.

She's also got no math observations yet — not urgent, but worth noting for your
weekly planning.

What do you think? Does the grip fatigue match what you're seeing?"
`);

// --- CONVERSATION 2: "Morning briefing" ---
console.log("━━━ CONVERSATION 2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log('TEACHER: "Good morning! Quick overview of the class?"\n');

console.log("→ Tool call: get_classroom_overview({ sort_by: 'urgency' })");
const overview = executeTool("get_classroom_overview", { sort_by: "urgency" });
overview.children.forEach(c => {
  console.log(`  ${c.name} (${c.age}y) — M:${c.mastered} P:${c.practicing} S:${c.struggling} | Flags: ${c.flag_count}`);
  if (c.top_flags.length > 0) console.log(`    Top: ${c.top_flags.slice(0, 2).join("; ")}`);
  console.log(`    Next: ${c.top_recommendation}`);
});

console.log(`
GURU WOULD RESPOND:
"Good morning! Here's your snapshot:

**Priya** needs attention — she's on her third session struggling with Metal Insets.
I've got some practical life suggestions that might help build her grip strength first.

**Marcus** has been quiet since January. His Number Rods practice is stalled, and I
think I know why — he hasn't done Brown Stair yet, which builds the seriation skills
Number Rods need. Plus his observations in several areas are getting stale.

**Liam** is cruising — 37 mastered! He's working through Teens Board and has lots
of options ready. He could use some catch-up in areas you haven't observed recently.

**Amara** is building good foundations. Some PL and culture exercises are ready for
her next presentations.

Want me to dive into any of these?"
`);

// --- CONVERSATION 3: "Can I present golden beads to Marcus?" ---
console.log("━━━ CONVERSATION 3 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log('TEACHER: "I was thinking of showing Marcus the golden beads. Is he ready?"\n');

console.log("→ Tool call: check_exercise_readiness({ child_name: 'Marcus', exercise_id: 'golden beads' })");
const marcusReady = executeTool("check_exercise_readiness", { child_name: "Marcus", exercise_id: "golden beads" });
console.log(`  Ready: ${marcusReady.ready}`);
console.log(`  Recommendation: ${marcusReady.recommendation}`);
if (marcusReady.prerequisites) {
  const unmet = marcusReady.prerequisites.details.filter(p => !p.mastered);
  if (unmet.length > 0) console.log(`  Unmet prereqs: ${unmet.map(p => p.name).join(", ")}`);
}

console.log(`
GURU WOULD RESPOND:
"Not quite yet — Marcus still needs to master ${marcusReady.prerequisites?.details?.filter(p => !p.mastered).map(p => p.name).join(" and ")} before
Golden Beads. He's been practicing Number Rods since December but the seriation
piece is holding him back.

I actually think the missing link is sensorial — he never did Brown Stair, which
is where children build that visual comparison of length and dimension that Number
Rods require. If you present Brown Stair this week, it could unlock the seriation
skill he needs to master Number Rods, which then opens the door to Golden Beads.

Would you like to see the full math pathway for him?"
`);

// --- CONVERSATION 4: "How's Priya's pincer grip?" ---
console.log("━━━ CONVERSATION 4 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log('TEACHER: "How\'s Priya\'s pincer grip looking overall?"\n');

console.log("→ Tool call: get_skill_analysis({ child_name: 'Priya', skill_name: 'pincer_grip' })");
const priyaGrip = executeTool("get_skill_analysis", { child_name: "Priya", skill_name: "pincer_grip" });
console.log(`  Strength: ${priyaGrip.strength} (${priyaGrip.assessment})`);
console.log(`  Developed by: ${priyaGrip.developed_by.map(e => e.name).join(", ") || "none"}`);
console.log(`  Can further develop: ${priyaGrip.can_further_develop.slice(0, 5).map(e => `${e.name} [${e.area}]`).join(", ")}`);

console.log(`
GURU WOULD RESPOND:
"Priya's pincer grip is still emerging — strength of ${priyaGrip.strength}, meaning only
${priyaGrip.developed_by.length} exercise${priyaGrip.developed_by.length === 1 ? '' : 's'} ${priyaGrip.developed_by.length === 1 ? 'has' : 'have'} built it so far (${priyaGrip.developed_by.map(e => e.name).join(", ")}).

For context, children who do well with Metal Insets typically have a pincer grip strength
of 3 or more — built through multiple practical life exercises before they ever pick up
an inset.

She's got several exercises available that specifically develop pincer grip:
${priyaGrip.can_further_develop.slice(0, 3).map(e => e.name).join(", ")}.
I'd suggest working through a couple of these over the next week or two before
returning to Metal Insets."
`);

// --- CONVERSATION 5: Batch observation recording ---
console.log("━━━ CONVERSATION 5 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log('TEACHER: "Let me log today\'s observations. Amara mastered dry pouring, really clean work."\n');

console.log("→ Tool call: record_observation({ child_name: 'Amara', exercise_id: 'PL010', status: 'mastered', notes: 'Really clean work, no spilling' })");
const obsResult = executeTool("record_observation", {
  child_name: "Amara",
  exercise_id: "PL010",
  status: "mastered",
  notes: "Really clean work, no spilling"
});
console.log(`  Recorded: ${obsResult.recorded}`);
console.log(`  ${obsResult.observation.child} → ${obsResult.observation.exercise}: ${obsResult.observation.status}`);
console.log(`  Active flags: ${obsResult.active_flags}`);

console.log(`
GURU WOULD RESPOND:
"Got it — Amara mastered Dry Pouring! That's a nice milestone for her.

This unlocks Water Pouring and Spooning as her next practical life steps. She's
also now got the palmar grasp foundation for Tongs/Tweezers when she's ready.

Want to log anything else?"
`);


console.log("\n══════════════════════════════════════════════════════════════");
console.log("All conversation simulations complete.");
console.log("══════════════════════════════════════════════════════════════\n");
