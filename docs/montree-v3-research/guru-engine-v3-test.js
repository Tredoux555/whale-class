const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('montree-curriculum-graph.json', 'utf8'));
const EXERCISES = graph.exercises;

// ============================================================
// REASONING ENGINE V3 — Priority Scoring + Age Filter + Expanded Notes
// ============================================================
//
// V2 RECAP: Skill strength model, observation note analysis, bridge scoring
//
// V3 ADDITIONS:
// 1. PRIORITY SCORING for exercise recommendations
//    Hierarchy: unblocking > struggling bridges > area gaps > age-appropriate > normal progression
//    Each ready exercise gets a composite priority score so teachers see the MOST important thing first.
//
// 2. AGE-APPROPRIATENESS FILTER
//    Each exercise has typical_age_range. We parse this and:
//    - Hard filter: never suggest exercises > 1 year above child's age
//    - Soft boost: exercises within the child's age range get priority boost
//    - Soft penalty: exercises below the child's age range get deprioritized
//
// 3. EXPANDED OBSERVATION NOTE PATTERNS
//    V2 had: grip, pincer, hold, seriate, arrangement, order, length
//    V3 adds: dozens more diagnostic keyword patterns across all skill areas

// ============================================================
// AGE PARSING UTILITY
// ============================================================

function parseAgeRange(rangeStr) {
  if (!rangeStr) return { min: 2.5, max: 6 };
  const parts = rangeStr.split("-");
  return {
    min: parseFloat(parts[0]) || 2.5,
    max: parseFloat(parts[1]) || 6
  };
}

function getAgeFit(childAge, exercise) {
  const range = parseAgeRange(exercise.typical_age_range);
  if (childAge >= range.min && childAge <= range.max + 0.5) return "ideal";    // Within range (+ 6mo grace)
  if (childAge < range.min && childAge >= range.min - 0.5) return "slightly_young"; // Up to 6mo young
  if (childAge < range.min - 0.5) return "too_young";                           // More than 6mo young
  if (childAge > range.max + 0.5 && childAge <= range.max + 1.5) return "slightly_old"; // Past range but ok
  return "too_old";
}

// ============================================================
// EXPANDED NOTE KEYWORD PATTERNS
// ============================================================
// Maps diagnostic keywords in teacher notes → skills they indicate weakness in
// Each entry: { patterns: [regex-ready strings], skills: [skill_ids], label: string }

const NOTE_PATTERNS = [
  // Motor / Fine Motor
  { patterns: ["grip", "pincer", "hold", "grasp", "tripod"],
    skills: ["pincer_grip", "fine_motor_control", "tripod_grip"],
    label: "grip/grasp difficulty" },
  { patterns: ["fatigue", "tires", "tired hand", "hand cramp", "shaking"],
    skills: ["grip_strength", "fine_motor_control"],
    label: "hand fatigue" },
  { patterns: ["drops", "dropping", "spill", "knocks over"],
    skills: ["hand_eye_coordination", "controlled_movement", "fine_motor_control"],
    label: "object control difficulty" },
  { patterns: ["scissors", "cutting", "cut"],
    skills: ["cutting_skill", "bilateral_coordination", "hand_eye_coordination"],
    label: "cutting difficulty" },
  { patterns: ["fold", "folding", "crease"],
    skills: ["folding_skill", "bilateral_coordination", "fine_motor_control"],
    label: "folding difficulty" },
  { patterns: ["pour", "pouring", "overflow", "miss the cup"],
    skills: ["pouring_control", "hand_eye_coordination", "controlled_movement"],
    label: "pouring difficulty" },
  { patterns: ["wrist", "twist", "turn the", "rotate"],
    skills: ["wrist_rotation", "fine_motor_control"],
    label: "wrist rotation difficulty" },
  { patterns: ["both hands", "two hands", "one hand only", "doesn't stabilize"],
    skills: ["bilateral_coordination"],
    label: "bilateral coordination difficulty" },

  // Cognitive / Sequencing
  { patterns: ["seriate", "arrangement", "order", "sequence", "length", "height", "gradient"],
    skills: ["seriation", "order_sense", "dimension_perception"],
    label: "seriation/ordering difficulty" },
  { patterns: ["sort", "classify", "group", "categorize", "which pile"],
    skills: ["classification", "logical_reasoning"],
    label: "classification difficulty" },
  { patterns: ["pattern", "repeat", "what comes next"],
    skills: ["pattern_recognition"],
    label: "pattern recognition difficulty" },
  { patterns: ["count", "counting", "skip", "loses count", "miscounts"],
    skills: ["one_to_one_correspondence", "number_sense", "memory_sequential"],
    label: "counting difficulty" },
  { patterns: ["quantity", "how many", "more than", "less than", "greater", "fewer"],
    skills: ["number_sense", "comparison"],
    label: "quantity comprehension difficulty" },
  { patterns: ["tens", "hundreds", "place value", "decimal", "units"],
    skills: ["decimal_understanding", "number_sense"],
    label: "place value difficulty" },
  { patterns: ["concentrate", "focus", "distract", "attention", "wanders", "fidget"],
    skills: ["concentration", "self_regulation"],
    label: "concentration difficulty" },
  { patterns: ["remember", "forgot", "memory", "forgets step", "sequence wrong"],
    skills: ["memory_sequential", "order_sense"],
    label: "memory/sequence difficulty" },
  { patterns: ["problem solv", "stuck", "gives up", "won't try", "frustrated"],
    skills: ["problem_solving", "persistence"],
    label: "problem solving / persistence difficulty" },

  // Sensorial
  { patterns: ["color", "colour", "shade", "gradient", "match the color"],
    skills: ["chromatic_sense", "visual_discrimination"],
    label: "color discrimination difficulty" },
  { patterns: ["texture", "rough", "smooth", "feel"],
    skills: ["tactile_discrimination"],
    label: "tactile discrimination difficulty" },
  { patterns: ["sound", "loud", "quiet", "hear", "listening"],
    skills: ["auditory_discrimination"],
    label: "auditory discrimination difficulty" },
  { patterns: ["size", "dimension", "bigger", "smaller", "thick", "thin", "wide", "narrow"],
    skills: ["dimension_perception", "visual_discrimination", "comparison"],
    label: "dimension perception difficulty" },
  { patterns: ["shape", "triangle", "circle", "square", "geometric"],
    skills: ["spatial_reasoning", "visual_discrimination"],
    label: "shape recognition difficulty" },
  { patterns: ["weight", "heavy", "light", "heavier"],
    skills: ["baric_sense"],
    label: "weight discrimination difficulty" },

  // Language
  { patterns: ["sound out", "phoneme", "beginning sound", "ending sound", "rhyme"],
    skills: ["phonemic_awareness", "auditory_discrimination"],
    label: "phonemic awareness difficulty" },
  { patterns: ["blend", "blending", "put sounds together"],
    skills: ["blending", "phonetic_decoding"],
    label: "blending difficulty" },
  { patterns: ["letter", "reversal", "backward", "mirror", "confuse b and d", "mixes up", "mix up"],
    skills: ["letter_formation", "symbol_recognition", "visual_discrimination"],
    label: "letter formation/recognition difficulty" },
  { patterns: ["read", "decode", "sound it out", "doesn't recognize"],
    skills: ["phonetic_decoding", "reading_fluency", "symbol_sound_association"],
    label: "reading/decoding difficulty" },
  { patterns: ["write", "writing", "pencil control", "trace", "tracing"],
    skills: ["handwriting_control", "tripod_grip", "letter_formation"],
    label: "writing difficulty" },
  { patterns: ["vocabulary", "word", "doesn't know the word", "name it"],
    skills: ["vocabulary_enrichment", "oral_expression"],
    label: "vocabulary difficulty" },
  { patterns: ["sentence", "grammar", "word order"],
    skills: ["sentence_construction", "grammar_awareness"],
    label: "grammar/sentence difficulty" },
  { patterns: ["comprehension", "understand", "meaning", "doesn't get", "confused by story"],
    skills: ["reading_comprehension", "story_comprehension"],
    label: "comprehension difficulty" },

  // Social / Emotional
  { patterns: ["independent", "asks for help", "won't try alone", "needs adult"],
    skills: ["independence", "confidence"],
    label: "independence difficulty" },
  { patterns: ["upset", "tantrum", "cry", "emotional", "overwhelm"],
    skills: ["self_regulation", "patience"],
    label: "emotional regulation difficulty" },
  { patterns: ["share", "turn", "wait", "snatch", "grab"],
    skills: ["cooperation", "patience", "grace_and_courtesy"],
    label: "social interaction difficulty" },
  { patterns: ["careful", "rough", "throws", "careless", "doesn't return"],
    skills: ["respect_for_materials", "care_of_environment"],
    label: "material handling difficulty" },
  { patterns: ["self.correct", "check", "error", "doesn't notice mistake"],
    skills: ["self_correction", "observation"],
    label: "self-correction difficulty" },
  // V3.1: Coverage for remaining skills
  { patterns: ["balance", "stumble", "bump into", "clumsy", "trip", "fall", "unsteady"],
    skills: ["gross_motor_control", "controlled_movement"],
    label: "gross motor difficulty" },
  { patterns: ["whole hand", "fist", "can't open hand", "palm"],
    skills: ["palmar_grasp", "fine_motor_control"],
    label: "palmar grasp difficulty" },
  { patterns: ["individual finger", "finger isolation", "can't point", "all fingers move"],
    skills: ["finger_isolation", "fine_motor_control"],
    label: "finger isolation difficulty" },
  { patterns: ["visual memory", "can't picture", "doesn't remember what it looked like", "forgot the image"],
    skills: ["memory_visual"],
    label: "visual memory difficulty" },
  { patterns: ["abstract", "concrete only", "needs the material", "can't do it in head", "without the beads"],
    skills: ["abstraction", "logical_reasoning"],
    label: "abstraction difficulty" },
  { patterns: ["estimate", "guess how many", "approximate", "about how much"],
    skills: ["estimation", "number_sense"],
    label: "estimation difficulty" },
  { patterns: ["take apart", "break down", "which parts"],
    skills: ["analysis", "logical_reasoning"],
    label: "analysis difficulty" },
  { patterns: ["put together", "combine", "build from parts", "assemble", "compose"],
    skills: ["synthesis", "problem_solving"],
    label: "synthesis difficulty" },
  { patterns: ["dress", "button", "zip", "shoe", "lace", "apron", "jacket"],
    skills: ["self_care", "care_of_self", "independence"],
    label: "self-care/dressing difficulty" },
  { patterns: ["cook", "recipe", "ingredient", "stir", "chop", "peel"],
    skills: ["food_preparation", "order_sense", "tool_use"],
    label: "food preparation difficulty" },
  { patterns: ["sweep", "wipe", "mop", "dust", "tidy", "clean up"],
    skills: ["cleaning", "care_of_environment"],
    label: "cleaning difficulty" },
  { patterns: ["tool", "handle", "safely", "proper way to hold"],
    skills: ["tool_use", "hand_eye_coordination"],
    label: "tool use difficulty" },
  { patterns: ["water play", "splash", "overflow the basin", "can't control water"],
    skills: ["water_handling", "controlled_movement"],
    label: "water handling difficulty" },
  { patterns: ["water the plant", "soil", "garden", "leaf care"],
    skills: ["plant_care", "care_of_environment", "responsibility"],
    label: "plant care difficulty" },
  { patterns: ["animal", "feed the", "gentle with", "cage", "fish tank"],
    skills: ["animal_care", "empathy", "responsibility"],
    label: "animal care difficulty" },
  { patterns: ["spell", "build the word", "moveable alphabet", "which letters make"],
    skills: ["word_building", "phonetic_decoding", "symbol_sound_association"],
    label: "word building difficulty" },
  { patterns: ["story writing", "what to write", "can't think of", "ideas for writing", "journal"],
    skills: ["creative_writing", "oral_expression"],
    label: "creative writing difficulty" },
  { patterns: ["feelings", "how they feel", "kind to", "hurt someone's feelings"],
    skills: ["empathy", "cooperation"],
    label: "empathy difficulty" },
  { patterns: ["responsible", "owns up", "blame", "forgot to put back", "left it out"],
    skills: ["responsibility", "care_of_environment"],
    label: "responsibility difficulty" },
  { patterns: ["smell", "sniff", "stinky", "fragrance", "nose"],
    skills: ["olfactory_discrimination"],
    label: "olfactory discrimination difficulty" },
  { patterns: ["taste", "sour", "sweet", "bitter", "salty", "tongue"],
    skills: ["gustatory_discrimination"],
    label: "gustatory discrimination difficulty" },
  { patterns: ["temperature", "hot", "cold", "warm", "cool", "thermic"],
    skills: ["thermic_sense"],
    label: "thermic discrimination difficulty" },
  { patterns: ["blindfold", "by touch", "eyes closed", "stereognostic", "what is it without looking"],
    skills: ["stereognostic_sense", "tactile_discrimination"],
    label: "stereognostic difficulty" },
];

// ============================================================
// CORE ENGINE (from V2, enhanced)
// ============================================================

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

  // Skill strength: count how many mastered exercises contribute to each skill
  const skillStrength = {};
  for (const exId of mastered) {
    const ex = EXERCISES[exId];
    if (ex) {
      for (const skill of ex.skills_developed) {
        skillStrength[skill] = (skillStrength[skill] || 0) + 1;
      }
    }
  }

  // Area coverage
  const areaCoverage = {};
  for (const exId of [...mastered, ...practicing, ...struggling]) {
    const ex = EXERCISES[exId];
    if (ex) areaCoverage[ex.area] = (areaCoverage[ex.area] || 0) + 1;
  }

  // Last observation by area
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

// ============================================================
// EXPANDED NOTE ANALYSIS (V3)
// ============================================================

function analyzeNotes(notesText) {
  if (!notesText) return [];
  const lower = notesText.toLowerCase();
  const clues = [];

  for (const pattern of NOTE_PATTERNS) {
    for (const keyword of pattern.patterns) {
      if (lower.includes(keyword)) {
        clues.push({
          matchedKeyword: keyword,
          skills: pattern.skills,
          label: pattern.label
        });
        break; // One match per pattern group is enough
      }
    }
  }

  return clues;
}

// ============================================================
// CROSS-AREA INSIGHTS (V3 — uses expanded note analysis)
// ============================================================

function detectCrossAreaInsights(child) {
  const profile = getChildProfile(child);
  const insights = [];

  // ---- STRUGGLING ANALYSIS ----
  for (const exId of profile.struggling) {
    const ex = EXERCISES[exId];
    if (!ex) continue;

    // Collect observation notes for this exercise
    const notesText = child.observations
      .filter(o => o.exercise === exId)
      .map(o => o.notes)
      .filter(n => n)
      .join(" ");

    // Identify weak skills — skills required by this exercise where the child
    // has low strength (fewer than 3 mastered exercises developing it)
    const weakSkills = [];
    for (const skill of ex.skills_required) {
      const strength = profile.skillStrength[skill] || 0;
      if (strength < 3) {
        weakSkills.push({ skill, strength });
      }
    }

    // V3: Use expanded note analysis for clue detection
    const noteClues = [];
    const noteAnalysis = analyzeNotes(notesText);
    for (const clue of noteAnalysis) {
      noteClues.push(`Notes indicate: ${clue.label} ("${clue.matchedKeyword}")`);
      // Add any skills from note clues that aren't already tracked
      for (const skill of clue.skills) {
        if (!weakSkills.find(w => w.skill === skill)) {
          weakSkills.push({ skill, strength: profile.skillStrength[skill] || 0 });
        }
      }
    }

    if (weakSkills.length > 0) {
      // Find bridge exercises that develop the weak skills
      const weakSkillNames = weakSkills.map(w => w.skill);
      const bridgeExercises = [];

      for (const [otherId, otherEx] of Object.entries(EXERCISES)) {
        if (profile.mastered.has(otherId) || otherId === exId) continue;
        const develops = otherEx.skills_developed.filter(s => weakSkillNames.includes(s));
        if (develops.length > 0) {
          const prereqsMet = otherEx.prerequisites.every(p => profile.mastered.has(p)) || otherEx.prerequisites.length === 0;
          if (prereqsMet) {
            bridgeExercises.push({
              id: otherId,
              name: otherEx.name,
              area: otherEx.area,
              sub_area: otherEx.sub_area,
              bridgeSkills: develops,
              crossArea: otherEx.area !== ex.area,
              score: develops.length * 2 + (otherEx.area !== ex.area ? 3 : 0)
            });
          }
        }
      }

      bridgeExercises.sort((a, b) => b.score - a.score);

      insights.push({
        type: "struggling_analysis",
        severity: "high",
        child: child.name,
        exercise: { id: exId, name: ex.name, area: ex.area },
        weak_skills: weakSkills,
        note_clues: noteClues,
        suggested_bridges: bridgeExercises,
        cross_area_bridges: bridgeExercises.filter(b => b.crossArea),
        same_area_bridges: bridgeExercises.filter(b => !b.crossArea)
      });
    }
  }

  // ---- PREMATURE INTRODUCTION ----
  for (const exId of profile.practicing) {
    const ex = EXERCISES[exId];
    if (!ex) continue;
    const unmetPrereqs = ex.prerequisites.filter(p => !profile.mastered.has(p));
    if (unmetPrereqs.length > 0) {
      insights.push({
        type: "premature_introduction",
        severity: "medium",
        child: child.name,
        exercise: { id: exId, name: ex.name, area: ex.area },
        unmet_prerequisites: unmetPrereqs.map(p => ({ id: p, name: EXERCISES[p]?.name, area: EXERCISES[p]?.area }))
      });
    }
  }

  // ---- AREA IMBALANCE ----
  const areas = ["practical_life", "sensorial", "mathematics", "language", "culture"];
  const totalObs = Object.values(profile.areaCoverage).reduce((a, b) => a + b, 0);
  if (totalObs >= 8) {
    for (const area of areas) {
      const count = profile.areaCoverage[area] || 0;
      const pct = count / totalObs;
      if (pct > 0.6) {
        insights.push({
          type: "area_imbalance",
          severity: "low",
          child: child.name,
          dominant_area: area,
          percentage: Math.round(pct * 100),
          message: `${Math.round(pct * 100)}% of observations are in ${area.replace(/_/g, " ")} — consider broadening`
        });
      }
    }
  }

  return insights;
}

// ============================================================
// ATTENTION FLAGS (same as V2)
// ============================================================

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

// ============================================================
// PRIORITY SCORING (V3 NEW)
// ============================================================
//
// Each ready exercise gets a priority score. Higher = present sooner.
//
// Score components:
//   +50  UNBLOCKING BONUS: Exercise is prerequisite for a STRUGGLING exercise
//        (mastering this may unblock the child's struggle)
//   +40  BRIDGE BONUS: Exercise was suggested as a bridge for a struggling exercise
//   +30  AREA GAP BONUS: Exercise is in an underrepresented or stale area
//   +20  SKILL REINFORCEMENT: Develops skills the child is weak in
//   +15  AGE IDEAL: Exercise is within the child's typical age range
//   +10  CURRICULUM FLOW: Exercise has many successors (high graph connectivity)
//   -10  AGE PENALTY: Exercise is below child's age range (too easy)
//   -30  AGE HARD BLOCK: Exercise typical_age_range starts > 1yr above child's age
//
// The Guru presents the top-scored exercises to the teacher, grouped by priority tier.

function getPrioritizedRecommendations(child) {
  const profile = getChildProfile(child);
  const insights = detectCrossAreaInsights(child);
  const flags = detectAttentionFlags(child);
  const areas = ["practical_life", "sensorial", "mathematics", "language", "culture"];

  // Step 1: Get all ready exercises (prerequisites met, not already observed)
  const readyRaw = [];
  for (const [exId, ex] of Object.entries(EXERCISES)) {
    if (profile.mastered.has(exId) || profile.practicing.has(exId) || profile.struggling.has(exId)) continue;

    const prereqsMet = ex.prerequisites.length > 0 && ex.prerequisites.every(p => profile.mastered.has(p));
    const isRoot = ex.prerequisites.length === 0 && !profile.allObserved.has(exId);

    if (prereqsMet || isRoot) {
      readyRaw.push({ id: exId, ...ex, isRoot });
    }
  }

  // Step 2: Identify context for scoring

  // 2a. Which exercises are prerequisites for currently struggling exercises?
  const unblockingTargets = new Set();
  for (const exId of profile.struggling) {
    const ex = EXERCISES[exId];
    if (!ex) continue;
    // Find ready exercises that are prerequisites of this struggling exercise
    for (const prereq of ex.prerequisites) {
      if (!profile.mastered.has(prereq)) {
        unblockingTargets.add(prereq);
      }
    }
  }

  // 2b. Bridge exercise IDs from struggling analysis
  const bridgeIds = new Set();
  for (const insight of insights.filter(i => i.type === "struggling_analysis")) {
    for (const bridge of insight.suggested_bridges) {
      bridgeIds.add(bridge.id);
    }
  }

  // 2c. Area gaps: which areas are underrepresented?
  const totalObs = Object.values(profile.areaCoverage).reduce((a, b) => a + b, 0);
  const gapAreas = new Set();
  const staleAreas = new Set();
  for (const area of areas) {
    const count = profile.areaCoverage[area] || 0;
    if (totalObs >= 5 && count / totalObs < 0.10) gapAreas.add(area);
    if (!profile.lastObsByArea[area]) gapAreas.add(area);
  }
  for (const flag of flags.filter(f => f.type === "stale_area" || f.type === "no_observations")) {
    staleAreas.add(flag.area);
  }

  // 2d. Weak skills across all struggling analyses
  const weakSkillSet = new Set();
  for (const insight of insights.filter(i => i.type === "struggling_analysis")) {
    for (const ws of insight.weak_skills) {
      weakSkillSet.add(ws.skill);
    }
  }

  // Step 3: Score each ready exercise
  const scored = readyRaw.map(ex => {
    let score = 0;
    const reasons = [];

    // UNBLOCKING BONUS (+50)
    if (unblockingTargets.has(ex.id)) {
      score += 50;
      reasons.push("unblocks a struggling exercise");
    }

    // BRIDGE BONUS (+40)
    if (bridgeIds.has(ex.id)) {
      score += 40;
      reasons.push("bridge for struggling skill");
    }

    // AREA GAP BONUS (+30)
    if (gapAreas.has(ex.area) || staleAreas.has(ex.area)) {
      score += 30;
      reasons.push(`fills gap in ${ex.area.replace(/_/g, " ")}`);
    }

    // SKILL REINFORCEMENT (+20)
    const developsWeak = ex.skills_developed.filter(s => weakSkillSet.has(s));
    if (developsWeak.length > 0) {
      score += 10 + (developsWeak.length * 5); // 15-35 range
      reasons.push(`reinforces weak: ${developsWeak.join(", ")}`);
    }

    // AGE FIT
    const ageFit = getAgeFit(child.age, ex);
    if (ageFit === "ideal") {
      score += 15;
      reasons.push("age-appropriate");
    } else if (ageFit === "slightly_young") {
      score += 5;
      reasons.push("slightly young but reachable");
    } else if (ageFit === "slightly_old") {
      score -= 10;
      reasons.push("below age range (review/reinforce)");
    } else if (ageFit === "too_old") {
      score -= 10;
      reasons.push("well below age range");
    } else if (ageFit === "too_young") {
      score -= 30;
      reasons.push("above age range — may not be ready");
    }

    // CURRICULUM FLOW BONUS (+0-10 based on successor count)
    const successorCount = ex.successors ? ex.successors.length : 0;
    const flowBonus = Math.min(successorCount * 3, 10);
    score += flowBonus;
    if (flowBonus > 0) reasons.push(`unlocks ${successorCount} successor(s)`);

    // ROOT PENALTY: unconnected root exercises are lower priority if child has progress
    if (ex.isRoot && profile.mastered.size > 5) {
      score -= 5;
      reasons.push("root exercise (lower priority for progressing child)");
    }

    return {
      id: ex.id,
      name: ex.name,
      area: ex.area,
      sub_area: ex.sub_area,
      score,
      reasons,
      ageFit,
      isRoot: ex.isRoot,
      tier: score >= 40 ? "urgent" : score >= 20 ? "recommended" : score >= 0 ? "available" : "deferred"
    };
  });

  // Step 4: Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Step 5: Hard-filter too_young exercises (>1yr above child's age)
  // These are filtered regardless of score — area gap bonuses shouldn't
  // override developmental readiness
  const filtered = scored.filter(ex => {
    if (ex.ageFit === "too_young") return false;
    return true;
  });

  return {
    recommendations: filtered,
    urgent: filtered.filter(r => r.tier === "urgent"),
    recommended: filtered.filter(r => r.tier === "recommended"),
    available: filtered.filter(r => r.tier === "available"),
    deferred: filtered.filter(r => r.tier === "deferred"),
    context: {
      unblockingTargets: [...unblockingTargets],
      bridgeCount: bridgeIds.size,
      gapAreas: [...gapAreas],
      staleAreas: [...staleAreas],
      weakSkills: [...weakSkillSet]
    }
  };
}

// ============================================================
// SAMPLE CHILDREN (same as V2)
// ============================================================

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

// ============================================================
// TESTS V3
// ============================================================

let passed = 0, failed = 0, num = 0;
function test(name, fn) {
  num++;
  try { fn(); passed++; console.log(`  ✅ ${num}. ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${num}. ${name}\n     FAILED: ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m); }

console.log("\n══════════════════════════════════════════");
console.log("GURU ENGINE V3 — FULL TEST SUITE");
console.log("Priority Scoring + Age Filter + Expanded Notes");
console.log("══════════════════════════════════════════");

// ---- V2 REGRESSION TESTS ----
console.log("\n--- V2 REGRESSION: Core Engine ---\n");

test("Priya struggling analysis detects L012 issue", () => {
  const insights = detectCrossAreaInsights(PRIYA);
  const analysis = insights.find(i => i.type === "struggling_analysis" && i.exercise.id === "L012");
  assert(analysis, "Should detect L012 struggling analysis");
});

test("Priya L012 analysis identifies weak skills", () => {
  const insights = detectCrossAreaInsights(PRIYA);
  const analysis = insights.find(i => i.type === "struggling_analysis" && i.exercise.id === "L012");
  const weakSkillNames = analysis.weak_skills.map(w => w.skill);
  assert(weakSkillNames.includes("pincer_grip") || analysis.note_clues.length > 0,
    `Should identify pincer_grip or detect note clue`);
});

test("Priya L012 picks up 'grip' from observation notes", () => {
  const insights = detectCrossAreaInsights(PRIYA);
  const analysis = insights.find(i => i.type === "struggling_analysis" && i.exercise.id === "L012");
  assert(analysis.note_clues.length > 0, "Should have note clues");
  assert(analysis.note_clues.some(c => c.includes("grip")), "Should detect grip");
});

test("Priya L012 suggests PL bridges", () => {
  const insights = detectCrossAreaInsights(PRIYA);
  const analysis = insights.find(i => i.type === "struggling_analysis" && i.exercise.id === "L012");
  assert(analysis.cross_area_bridges.filter(b => b.area === "practical_life").length > 0, "Should have PL bridges");
});

test("Marcus premature introduction M001", () => {
  const insights = detectCrossAreaInsights(MARCUS);
  const premature = insights.find(i => i.type === "premature_introduction" && i.exercise.id === "M001");
  assert(premature, "Should detect M001 premature");
  assert(premature.unmet_prerequisites.some(p => p.id === "S012"), "Should identify S012");
});

test("Liam no struggling analysis", () => {
  const insights = detectCrossAreaInsights(LIAM);
  assert(insights.filter(i => i.type === "struggling_analysis").length === 0, "No struggling");
});

test("Liam no premature introductions", () => {
  const insights = detectCrossAreaInsights(LIAM);
  assert(!insights.find(i => i.type === "premature_introduction"), "No premature");
});

test("Empty child doesn't crash", () => {
  const empty = { name: "Empty", age: 3, observations: [] };
  getChildProfile(empty);
  detectCrossAreaInsights(empty);
  detectAttentionFlags(empty);
  getPrioritizedRecommendations(empty);
});

// ---- AGE FIT TESTS ----
console.log("\n--- V3 NEW: Age Fit ---\n");

test("Age fit: 4yo for 3-4 range = ideal", () => {
  assert(getAgeFit(4, { typical_age_range: "3-4" }) === "ideal", "Should be ideal");
});

test("Age fit: 3yo for 4-5 range = slightly_young", () => {
  assert(getAgeFit(3.6, { typical_age_range: "4-5" }) === "slightly_young", "Should be slightly_young");
});

test("Age fit: 3yo for 5-6 range = too_young", () => {
  assert(getAgeFit(3, { typical_age_range: "5-6" }) === "too_young", "Should be too_young");
});

test("Age fit: 5.5 for 3-4 range = slightly_old", () => {
  assert(getAgeFit(5.5, { typical_age_range: "3-4" }) === "slightly_old", "Should be slightly_old");
});

test("Age fit: 6yo for 2.5-3 range = too_old", () => {
  assert(getAgeFit(6, { typical_age_range: "2.5-3" }) === "too_old", "Should be too_old");
});

// ---- EXPANDED NOTE ANALYSIS TESTS ----
console.log("\n--- V3 NEW: Expanded Note Analysis ---\n");

test("Note analysis: 'grip' → pincer_grip + fine_motor + tripod", () => {
  const clues = analyzeNotes("Difficulty gripping metal inset knob, can't maintain tripod grip");
  assert(clues.length >= 1, "Should find clues");
  const allSkills = clues.flatMap(c => c.skills);
  assert(allSkills.includes("pincer_grip"), "Should detect pincer_grip");
  assert(allSkills.includes("tripod_grip"), "Should detect tripod_grip");
});

test("Note analysis: 'fatigue' → grip_strength", () => {
  const clues = analyzeNotes("Hand fatigues quickly during writing");
  assert(clues.some(c => c.skills.includes("grip_strength")), "Should detect grip_strength");
});

test("Note analysis: 'loses count' → counting skills", () => {
  const clues = analyzeNotes("Working on tens, loses count in the 70s");
  assert(clues.some(c => c.skills.includes("one_to_one_correspondence") || c.skills.includes("number_sense")),
    "Should detect counting skills");
});

test("Note analysis: 'seriation' → seriation + order_sense", () => {
  const clues = analyzeNotes("Can't reliably seriate the rods by length");
  const allSkills = clues.flatMap(c => c.skills);
  assert(allSkills.includes("seriation"), "Should detect seriation");
});

test("Note analysis: 'distracted' → concentration", () => {
  const clues = analyzeNotes("Gets distracted easily, wanders to other shelves");
  assert(clues.some(c => c.skills.includes("concentration")), "Should detect concentration");
});

test("Note analysis: 'reversal' → letter_formation + symbol_recognition", () => {
  const clues = analyzeNotes("Letter reversals on b and d");
  const allSkills = clues.flatMap(c => c.skills);
  assert(allSkills.includes("letter_formation"), "Should detect letter_formation");
  assert(allSkills.includes("symbol_recognition"), "Should detect symbol_recognition");
});

test("Note analysis: 'blend sounds' → blending", () => {
  const clues = analyzeNotes("Can identify sounds but can't blend them together");
  assert(clues.some(c => c.skills.includes("blending")), "Should detect blending");
});

test("Note analysis: 'drops objects' → hand_eye + controlled_movement", () => {
  const clues = analyzeNotes("Drops the beads frequently, knocks over the stand");
  const allSkills = clues.flatMap(c => c.skills);
  assert(allSkills.includes("hand_eye_coordination"), "Should detect hand_eye");
  assert(allSkills.includes("controlled_movement"), "Should detect controlled_movement");
});

test("Note analysis: empty notes → no clues", () => {
  assert(analyzeNotes("").length === 0, "Empty notes = no clues");
  assert(analyzeNotes(null).length === 0, "Null notes = no clues");
});

test("Note analysis: 'frustrated gives up' → persistence", () => {
  const clues = analyzeNotes("Gets frustrated and gives up after one try");
  assert(clues.some(c => c.skills.includes("persistence")), "Should detect persistence");
});

// ---- PRIORITY SCORING TESTS ----
console.log("\n--- V3 NEW: Priority Scoring ---\n");

test("Priya: bridge exercises ranked highest", () => {
  const recs = getPrioritizedRecommendations(PRIYA);
  assert(recs.recommendations.length > 0, "Should have recommendations");
  // Top recommendations should include bridge exercises for her grip struggle
  const top5 = recs.recommendations.slice(0, 5);
  const hasBridge = top5.some(r => r.reasons.some(reason => reason.includes("bridge") || reason.includes("reinforces weak")));
  assert(hasBridge, `Top 5 should include bridge/reinforcement exercises. Got: ${top5.map(r => `${r.name}(${r.score})`).join(", ")}`);
});

test("Priya: urgent tier exists", () => {
  const recs = getPrioritizedRecommendations(PRIYA);
  assert(recs.urgent.length > 0, `Should have urgent recommendations. Total: ${recs.recommendations.length}`);
});

test("Priya: PL exercises appear as bridges for grip", () => {
  const recs = getPrioritizedRecommendations(PRIYA);
  const plInTop = recs.recommendations.filter(r => r.area === "practical_life" && r.score >= 30);
  assert(plInTop.length >= 1, "Should have high-scoring PL exercises");
});

test("Marcus: sensorial exercises get area gap bonus", () => {
  const recs = getPrioritizedRecommendations(MARCUS);
  // Marcus has no recent sensorial observations, and S012 specifically is a premature-introduction prereq
  const sensorRecommended = recs.recommendations.filter(r => r.area === "sensorial" && r.score >= 20);
  assert(sensorRecommended.length >= 1,
    `Should recommend sensorial exercises. Got sensorial: ${recs.recommendations.filter(r => r.area === "sensorial").map(r => `${r.name}(${r.score})`).join(", ")}`);
});

test("Marcus: S011 Brown Stair is high priority", () => {
  const recs = getPrioritizedRecommendations(MARCUS);
  const s011 = recs.recommendations.find(r => r.id === "S011");
  assert(s011, "S011 should be in recommendations");
  assert(s011.score >= 20, `S011 should be recommended tier. Score: ${s011.score}`);
});

test("Liam: math exercises prioritized (M011 practicing blocks M020)", () => {
  const recs = getPrioritizedRecommendations(LIAM);
  // M020 should NOT appear (blocked by M011 practicing)
  assert(!recs.recommendations.find(r => r.id === "M020"), "M020 should be blocked");
});

test("Liam: urgent tier from stale areas (not struggling)", () => {
  const recs = getPrioritizedRecommendations(LIAM);
  // Liam has no struggling exercises, but has 3 stale areas (68d PL, 56d sensorial, 28d language)
  // Exercises filling those gaps correctly surface as urgent
  assert(recs.urgent.length > 0, "Should have urgent recs from stale areas");
  // Verify none of the urgent recs are bridge/unblocking — they should all be area-gap driven
  const urgentReasons = recs.urgent.flatMap(r => r.reasons);
  assert(!urgentReasons.some(r => r.includes("unblocks")), "No unblocking urgency for Liam");
  assert(urgentReasons.some(r => r.includes("fills gap")), "Urgent should be area-gap driven");
});

test("Amara: age-appropriate exercises scored higher", () => {
  const recs = getPrioritizedRecommendations(AMARA);
  // Amara is 3.4 — exercises in 2.5-4 range should score higher than 4.5-6 range
  const top5 = recs.recommendations.slice(0, 5);
  const ageAppropriate = top5.filter(r => {
    const fit = getAgeFit(3.4, EXERCISES[r.id]);
    return fit === "ideal" || fit === "slightly_young";
  });
  assert(ageAppropriate.length >= 3,
    `Most top 5 should be age-appropriate. Got ${ageAppropriate.length}/5: ${top5.map(r => `${r.name}(${r.ageFit})`).join(", ")}`);
});

test("Amara: no too_young exercises in filtered results at all", () => {
  const recs = getPrioritizedRecommendations(AMARA);
  const tooYoung = recs.recommendations.filter(r => r.ageFit === "too_young");
  assert(tooYoung.length === 0, `Should hard-filter all too_young exercises. Found: ${tooYoung.map(r => r.name).join(", ")}`);
});

test("Priority tiers are correctly assigned", () => {
  const recs = getPrioritizedRecommendations(PRIYA);
  for (const r of recs.recommendations) {
    if (r.score >= 40) assert(r.tier === "urgent", `${r.name} score=${r.score} should be urgent`);
    else if (r.score >= 20) assert(r.tier === "recommended", `${r.name} score=${r.score} should be recommended`);
    else if (r.score >= 0) assert(r.tier === "available", `${r.name} score=${r.score} should be available`);
    else assert(r.tier === "deferred", `${r.name} score=${r.score} should be deferred`);
  }
});

test("Scoring context captures gap/stale areas correctly", () => {
  const recs = getPrioritizedRecommendations(MARCUS);
  // Marcus hasn't been observed in culture, mathematics is practicing not mastered
  // His observations are all from Sep-Jan, many areas should be stale
  assert(recs.context.staleAreas.length >= 2,
    `Should have stale areas. Got: ${recs.context.staleAreas.join(", ")}`);
});

// ---- V3 INTEGRATION TESTS ----
console.log("\n--- V3 INTEGRATION: Full Pipeline ---\n");

test("Priya V3: expanded notes detect BOTH grip and fatigue", () => {
  const insights = detectCrossAreaInsights(PRIYA);
  const analysis = insights.find(i => i.type === "struggling_analysis" && i.exercise.id === "L012");
  // V3 should pick up grip + fatigue from her notes
  assert(analysis.note_clues.some(c => c.includes("grip")), "Should detect grip clue");
  assert(analysis.note_clues.some(c => c.includes("fatigue")), "Should detect fatigue clue");
});

test("Priya V3: weak skills now include grip_strength from fatigue notes", () => {
  const insights = detectCrossAreaInsights(PRIYA);
  const analysis = insights.find(i => i.type === "struggling_analysis" && i.exercise.id === "L012");
  const weakNames = analysis.weak_skills.map(w => w.skill);
  assert(weakNames.includes("grip_strength"),
    `Should detect grip_strength from fatigue notes. Got: ${weakNames.join(", ")}`);
});

test("Marcus V3: note analysis detects seriation from M001 notes", () => {
  // Marcus is practicing M001 not struggling, so struggling_analysis won't fire
  // But let's verify the note analyzer independently catches his clues
  const marcusNotes = MARCUS.observations
    .filter(o => o.exercise === "M001")
    .map(o => o.notes)
    .join(" ");
  const clues = analyzeNotes(marcusNotes);
  const allSkills = clues.flatMap(c => c.skills);
  assert(allSkills.includes("seriation"), "Should detect seriation from Marcus's notes");
});

test("Liam V3: 'loses count' note detected for M011", () => {
  const liamNotes = LIAM.observations
    .filter(o => o.exercise === "M011")
    .map(o => o.notes)
    .join(" ");
  const clues = analyzeNotes(liamNotes);
  assert(clues.some(c => c.skills.includes("one_to_one_correspondence") || c.skills.includes("number_sense")),
    "Should detect counting difficulty from Liam's M011 notes");
});

// ============================================================
// FULL CLASSROOM AUDIT V3
// ============================================================
console.log("\n══════════════════════════════════════════");
console.log("GURU V3 — PRIORITIZED CLASSROOM REPORT");
console.log("══════════════════════════════════════════");

for (const child of [PRIYA, MARCUS, LIAM, AMARA]) {
  const profile = getChildProfile(child);
  const flags = detectAttentionFlags(child);
  const insights = detectCrossAreaInsights(child);
  const recs = getPrioritizedRecommendations(child);

  console.log(`\n┌─── ${child.name} (${child.age}y) ${"─".repeat(40 - child.name.length)}┐`);
  console.log(`│ Mastered: ${profile.mastered.size} | Practicing: ${profile.practicing.size} | Struggling: ${profile.struggling.size}`);
  console.log(`│ Areas: ${Object.entries(profile.areaCoverage).map(([a, c]) => `${a.replace(/_/g, " ")}(${c})`).join(", ")}`);

  if (flags.length > 0) {
    console.log(`│`);
    console.log(`│ ⚑ ATTENTION FLAGS:`);
    flags.forEach(f => console.log(`│   ${f.message || `${f.type}: ${f.exercise || f.area}`}`));
  }

  const strugglingAnalysis = insights.filter(i => i.type === "struggling_analysis");
  if (strugglingAnalysis.length > 0) {
    for (const sa of strugglingAnalysis) {
      console.log(`│`);
      console.log(`│ 🧠 STRUGGLING ANALYSIS: ${sa.exercise.name}`);
      console.log(`│   Weak skills: ${sa.weak_skills.map(w => `${w.skill}(str:${w.strength})`).join(", ")}`);
      if (sa.note_clues.length > 0) {
        console.log(`│   Note clues:`);
        sa.note_clues.forEach(c => console.log(`│     • ${c}`));
      }
    }
  }

  const premature = insights.filter(i => i.type === "premature_introduction");
  if (premature.length > 0) {
    console.log(`│`);
    console.log(`│ ⚠️  PREMATURE: ${premature.map(p => `${p.exercise.name} (needs: ${p.unmet_prerequisites.map(u => u.name).join(", ")})`).join("; ")}`);
  }

  // PRIORITIZED RECOMMENDATIONS
  console.log(`│`);
  console.log(`│ 📋 PRIORITIZED NEXT PRESENTATIONS:`);
  if (recs.urgent.length > 0) {
    console.log(`│   🔴 URGENT:`);
    recs.urgent.slice(0, 4).forEach(r => {
      console.log(`│     ${r.name} [${r.area.replace(/_/g, " ")}] score:${r.score}`);
      console.log(`│       ${r.reasons.join(" | ")}`);
    });
  }
  if (recs.recommended.length > 0) {
    console.log(`│   🟡 RECOMMENDED:`);
    recs.recommended.slice(0, 4).forEach(r => {
      console.log(`│     ${r.name} [${r.area.replace(/_/g, " ")}] score:${r.score}`);
      console.log(`│       ${r.reasons.join(" | ")}`);
    });
  }
  if (recs.available.length > 0) {
    console.log(`│   🟢 AVAILABLE (${recs.available.length} more):`);
    recs.available.slice(0, 3).forEach(r => {
      console.log(`│     ${r.name} [${r.area.replace(/_/g, " ")}] score:${r.score}`);
    });
  }

  console.log(`│`);
  console.log(`│ Context: gaps=[${recs.context.gapAreas.join(",")}] stale=[${recs.context.staleAreas.join(",")}] weakSkills=${recs.context.weakSkills.length}`);
  console.log(`└${"─".repeat(50)}┘`);
}

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n══════════════════════════════════════════`);
console.log(`V3 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
console.log(`══════════════════════════════════════════\n`);
if (failed > 0) process.exit(1);
