import React, { useState, useRef, useEffect } from 'react';

// ============================================================
// COMPRESSED CURRICULUM DATA (40+ key exercises)
// ============================================================

const EXERCISES = {
  "PL001": { n: "Walking on the Line", a: "practical_life", sa: "Movement", p: [], s: ["PL002", "PL003", "PL010"], d: ["gross_motor_control", "concentration", "controlled_movement", "self_regulation"], r: [], y: "2.5-3.5" },
  "PL002": { n: "Carrying a Tray", a: "practical_life", sa: "Movement", p: ["PL001"], s: ["PL010", "PL011", "PL020"], d: ["bilateral_coordination", "controlled_movement"], r: ["gross_motor_control"], y: "3-3.5" },
  "PL005": { n: "Opening & Closing Containers", a: "practical_life", sa: "Care of Self", p: ["PL001"], s: ["PL010"], d: ["hand_eye_coordination", "problem_solving", "fine_motor_control"], r: [], y: "3-3.5" },
  "PL007": { n: "Transferring with Tongs", a: "practical_life", sa: "Care of Environment", p: ["PL001", "PL005"], s: ["PL020"], d: ["pincer_grip", "hand_eye_coordination", "concentration"], r: ["controlled_movement"], y: "3.5-4.5" },
  "PL010": { n: "Pouring Grains", a: "practical_life", sa: "Care of Environment", p: ["PL001", "PL002"], s: ["PL011", "PL020"], d: ["pouring_control", "hand_eye_coordination", "concentration"], r: [], y: "3.5-4" },
  "PL011": { n: "Pouring Water", a: "practical_life", sa: "Care of Environment", p: ["PL001", "PL010"], s: ["PL020"], d: ["pouring_control", "hand_eye_coordination", "bilateral_coordination"], r: ["controlled_movement"], y: "3.5-4.5" },
  "PL020": { n: "Spooning", a: "practical_life", sa: "Care of Self", p: ["PL010"], s: ["PL030"], d: ["pincer_grip", "hand_eye_coordination", "fine_motor_control"], r: [], y: "3.5-4" },
  "PL030": { n: "Washing Hands", a: "practical_life", sa: "Care of Self", p: ["PL001", "PL020"], s: ["PL070"], d: ["self_care", "order_sense", "independence"], r: ["controlled_movement"], y: "3.5-4.5" },
  "PL040": { n: "Dressing Frames", a: "practical_life", sa: "Care of Self", p: ["PL002", "PL020"], s: [], d: ["self_care", "bilateral_coordination", "independence"], r: [], y: "4-5" },
  "PL060": { n: "Caring for Plants", a: "practical_life", sa: "Care of Environment", p: ["PL001", "PL011"], s: ["PL070"], d: ["plant_care", "care_of_environment", "responsibility"], r: ["controlled_movement"], y: "4-5" },
  "PL070": { n: "Grace and Courtesy", a: "practical_life", sa: "Social Grace", p: ["PL001"], s: [], d: ["grace_and_courtesy", "cooperation", "empathy"], r: [], y: "3-5" },
  "S001": { n: "Cylinder Blocks (Pink Tower)", a: "sensorial", sa: "Solid Geometry", p: [], s: ["S010", "S011"], d: ["visual_discrimination", "seriation", "dimension_perception"], r: [], y: "3-3.5" },
  "S010": { n: "Brown Stair", a: "sensorial", sa: "Solid Geometry", p: ["S001"], s: ["S011", "S012"], d: ["visual_discrimination", "seriation", "comparison"], r: [], y: "3.5-4" },
  "S011": { n: "Red Rods", a: "sensorial", sa: "Solid Geometry", p: ["S001", "S010"], s: ["S020"], d: ["visual_discrimination", "dimension_perception", "seriation"], r: [], y: "3.5-4.5" },
  "S012": { n: "Knobbed Cylinders", a: "sensorial", sa: "Solid Geometry", p: ["S010"], s: [], d: ["visual_discrimination", "pincer_grip", "problem_solving"], r: [], y: "4-4.5" },
  "S020": { n: "Color Tablets (Primary)", a: "sensorial", sa: "Color", p: ["S001"], s: ["S021"], d: ["chromatic_sense", "visual_discrimination", "classification"], r: [], y: "3.5-4" },
  "S021": { n: "Color Tablets (Secondary)", a: "sensorial", sa: "Color", p: ["S020"], s: [], d: ["chromatic_sense", "visual_discrimination", "seriation"], r: [], y: "4.5-5" },
  "S030": { n: "Geometry Cabinet (Outline)", a: "sensorial", sa: "Form", p: ["S001"], s: ["S031"], d: ["spatial_reasoning", "visual_discrimination"], r: [], y: "4-5" },
  "S031": { n: "Geometry Cabinet (Inlay)", a: "sensorial", sa: "Form", p: ["S030"], s: [], d: ["spatial_reasoning", "pincer_grip", "hand_eye_coordination"], r: ["fine_motor_control"], y: "4.5-5.5" },
  "M001": { n: "Number Rods (Seriation)", a: "mathematics", sa: "Quantity", p: ["S011"], s: ["M002", "M005"], d: ["one_to_one_correspondence", "seriation", "number_sense"], r: ["visual_discrimination"], y: "4-5" },
  "M002": { n: "Golden Beads (Units)", a: "mathematics", sa: "Quantity", p: ["M001"], s: ["M003", "M010"], d: ["one_to_one_correspondence", "number_sense", "decimal_understanding"], r: [], y: "4.5-5" },
  "M003": { n: "Golden Beads (Tens)", a: "mathematics", sa: "Quantity", p: ["M002"], s: ["M004", "M010"], d: ["decimal_understanding", "number_sense", "comparison"], r: [], y: "4.5-5.5" },
  "M004": { n: "Golden Beads (Hundreds)", a: "mathematics", sa: "Quantity", p: ["M003"], s: ["M005", "M010"], d: ["decimal_understanding", "number_sense", "symbol_recognition"], r: [], y: "5-5.5" },
  "M005": { n: "Multiplication Board", a: "mathematics", sa: "Operations", p: ["M001"], s: ["M010", "M011"], d: ["number_sense", "pattern_recognition", "abstraction"], r: [], y: "5-6" },
  "M010": { n: "Golden Beads (Complete)", a: "mathematics", sa: "Quantity", p: ["M002", "M003", "M004"], s: ["M011", "M020"], d: ["decimal_understanding", "abstraction", "number_sense"], r: [], y: "5-5.5" },
  "M011": { n: "Bead Board (Counting)", a: "mathematics", sa: "Counting", p: ["M010"], s: ["M020"], d: ["one_to_one_correspondence", "number_sense", "memory_sequential"], r: [], y: "5.5-6" },
  "M020": { n: "Addition (Golden Beads)", a: "mathematics", sa: "Operations", p: ["M011"], s: [], d: ["symbol_recognition", "abstraction", "logical_reasoning"], r: [], y: "5.5-6" },
  "L001": { n: "Phonemic Awareness (Beginning Sounds)", a: "language", sa: "Phonetics", p: [], s: ["L002", "L005"], d: ["phonemic_awareness", "auditory_discrimination", "symbol_sound_association"], r: [], y: "3.5-4.5" },
  "L002": { n: "Phonemic Awareness (Ending Sounds)", a: "language", sa: "Phonetics", p: ["L001"], s: ["L005"], d: ["phonemic_awareness", "auditory_discrimination", "pattern_recognition"], r: [], y: "4-4.5" },
  "L005": { n: "Vocabulary Enrichment", a: "language", sa: "Vocabulary", p: ["L001"], s: ["L010", "L011"], d: ["vocabulary_enrichment", "oral_expression", "memory_visual"], r: [], y: "4-4.5" },
  "L010": { n: "Letter Tracing", a: "language", sa: "Writing", p: ["L001"], s: ["L011", "L012"], d: ["letter_formation", "tripod_grip", "hand_eye_coordination"], r: ["fine_motor_control"], y: "4-4.5" },
  "L011": { n: "Sandpaper Letters", a: "language", sa: "Phonetics", p: ["L001"], s: ["L012"], d: ["symbol_sound_association", "fine_motor_control", "letter_formation"], r: [], y: "4-4.5" },
  "L012": { n: "Metal Insets", a: "language", sa: "Writing", p: ["L010", "L011"], s: ["L020", "L021"], d: ["tripod_grip", "hand_eye_coordination", "controlled_movement"], r: ["pincer_grip", "fine_motor_control"], y: "4.5-5" },
  "L020": { n: "Moveable Alphabet (Phonetic)", a: "language", sa: "Writing", p: ["L012"], s: ["L021", "L030"], d: ["word_building", "phonetic_decoding", "symbol_sound_association"], r: [], y: "4.5-5.5" },
  "L021": { n: "Reading (Phonetic)", a: "language", sa: "Reading", p: ["L012", "L020"], s: ["L030", "L031"], d: ["phonetic_decoding", "reading_fluency", "blending"], r: [], y: "5-5.5" },
  "L030": { n: "Moveable Alphabet (Sight Words)", a: "language", sa: "Writing", p: ["L021"], s: ["L031"], d: ["word_building", "vocabulary_enrichment", "symbol_recognition"], r: [], y: "5-5.5" },
  "L031": { n: "Reading (Comprehension)", a: "language", sa: "Reading", p: ["L021", "L030"], s: [], d: ["reading_comprehension", "story_comprehension", "logical_reasoning"], r: [], y: "5.5-6" },
  "C001": { n: "Land & Water", a: "culture", sa: "Geography", p: [], s: ["C002", "C010"], d: ["classification", "visual_discrimination", "observation"], r: [], y: "4-5" },
  "C002": { n: "Continent Map", a: "culture", sa: "Geography", p: ["C001"], s: ["C010"], d: ["spatial_reasoning", "classification", "memory_visual"], r: [], y: "4.5-5" },
  "C010": { n: "Living vs Non-Living", a: "culture", sa: "Biology", p: [], s: ["C020"], d: ["classification", "logical_reasoning", "observation"], r: [], y: "3.5-4.5" },
  "C020": { n: "Days of the Week", a: "culture", sa: "Temporal Concepts", p: ["C001"], s: [], d: ["order_sense", "memory_sequential", "symbol_recognition"], r: [], y: "4-5" },
};

// Expand compressed data
const expandedExercises = {};
for (const [id, ex] of Object.entries(EXERCISES)) {
  expandedExercises[id] = {
    id, name: ex.n, area: ex.a, sub_area: ex.sa, prerequisites: ex.p, successors: ex.s,
    skills_developed: ex.d, skills_required: ex.r, typical_age_range: ex.y,
  };
}

// ============================================================
// NOTE PATTERNS (diagnostic keyword → skills)
// ============================================================

const NOTE_PATTERNS = [
  { patterns: ["grip", "pincer", "hold", "grasp", "tripod"], skills: ["pincer_grip", "fine_motor_control", "tripod_grip"], label: "grip/grasp" },
  { patterns: ["fatigue", "tires", "tired hand", "cramp"], skills: ["grip_strength", "fine_motor_control"], label: "hand fatigue" },
  { patterns: ["drops", "dropping", "spill", "knocks"], skills: ["hand_eye_coordination", "controlled_movement"], label: "object control" },
  { patterns: ["seriate", "arrangement", "order", "sequence", "length"], skills: ["seriation", "order_sense"], label: "seriation" },
  { patterns: ["sort", "classify", "group"], skills: ["classification"], label: "classification" },
  { patterns: ["count", "counting", "loses count"], skills: ["one_to_one_correspondence", "number_sense"], label: "counting" },
  { patterns: ["concentrate", "focus", "distract"], skills: ["concentration"], label: "concentration" },
  { patterns: ["remember", "forgot", "memory"], skills: ["memory_sequential"], label: "memory" },
  { patterns: ["color", "shade", "gradient"], skills: ["chromatic_sense"], label: "color" },
  { patterns: ["texture", "rough", "smooth"], skills: ["tactile_discrimination"], label: "tactile" },
  { patterns: ["sound", "loud", "quiet"], skills: ["auditory_discrimination"], label: "auditory" },
  { patterns: ["size", "dimension", "bigger", "smaller"], skills: ["dimension_perception"], label: "dimension" },
  { patterns: ["shape", "triangle", "circle"], skills: ["spatial_reasoning"], label: "shape" },
  { patterns: ["phoneme", "sound out", "rhyme"], skills: ["phonemic_awareness"], label: "phonemic awareness" },
  { patterns: ["blend", "blending"], skills: ["blending"], label: "blending" },
  { patterns: ["letter", "reversal", "backward"], skills: ["letter_formation", "symbol_recognition"], label: "letter formation" },
  { patterns: ["read", "decode"], skills: ["phonetic_decoding", "reading_fluency"], label: "reading" },
  { patterns: ["write", "writing", "pencil"], skills: ["handwriting_control", "tripod_grip"], label: "writing" },
  { patterns: ["vocabulary", "word"], skills: ["vocabulary_enrichment"], label: "vocabulary" },
  { patterns: ["independent", "asks for help"], skills: ["independence"], label: "independence" },
  { patterns: ["upset", "tantrum", "emotional"], skills: ["self_regulation"], label: "regulation" },
  { patterns: ["share", "turn", "wait"], skills: ["cooperation"], label: "cooperation" },
];

// ============================================================
// GURU ENGINE V3 — Core Functions
// ============================================================

function getProfile(child) {
  const mastered = new Set();
  const practicing = new Set();
  const struggling = new Set();
  const latestObs = {};

  for (const obs of child.observations) {
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
    const ex = expandedExercises[exId];
    if (ex) {
      for (const skill of ex.skills_developed) {
        skillStrength[skill] = (skillStrength[skill] || 0) + 1;
      }
    }
  }

  const areaCoverage = {};
  for (const exId of [...mastered, ...practicing, ...struggling]) {
    const ex = expandedExercises[exId];
    if (ex) areaCoverage[ex.area] = (areaCoverage[ex.area] || 0) + 1;
  }

  const lastObsByArea = {};
  for (const obs of child.observations) {
    const ex = expandedExercises[obs.exercise];
    if (ex) {
      if (!lastObsByArea[ex.area] || obs.date > lastObsByArea[ex.area]) {
        lastObsByArea[ex.area] = obs.date;
      }
    }
  }

  return { mastered, practicing, struggling, latestObs, skillStrength, areaCoverage, lastObsByArea };
}

function analyzeNotes(notesText) {
  if (!notesText) return [];
  const lower = notesText.toLowerCase();
  const clues = [];
  for (const pattern of NOTE_PATTERNS) {
    for (const keyword of pattern.patterns) {
      if (lower.includes(keyword)) {
        clues.push({ skills: pattern.skills, label: pattern.label });
        break;
      }
    }
  }
  return clues;
}

function getAgeFit(childAge, exercise) {
  const parts = exercise.typical_age_range.split("-");
  const minAge = parseFloat(parts[0]) || 2.5;
  const maxAge = parseFloat(parts[1]) || 6;
  if (childAge >= minAge && childAge <= maxAge + 0.5) return "ideal";
  if (childAge < minAge && childAge >= minAge - 0.5) return "slightly_young";
  if (childAge < minAge - 0.5) return "too_young";
  if (childAge > maxAge + 0.5 && childAge <= maxAge + 1.5) return "slightly_old";
  return "too_old";
}

function getInsights(child) {
  const profile = getProfile(child);
  const insights = [];

  for (const exId of profile.struggling) {
    const ex = expandedExercises[exId];
    if (!ex) continue;

    const notesText = child.observations
      .filter(o => o.exercise === exId)
      .map(o => o.notes)
      .join(" ");

    const weakSkills = [];
    for (const skill of ex.skills_required) {
      if ((profile.skillStrength[skill] || 0) < 3) {
        weakSkills.push(skill);
      }
    }

    const noteClues = analyzeNotes(notesText);
    for (const clue of noteClues) {
      for (const skill of clue.skills) {
        if (!weakSkills.includes(skill)) weakSkills.push(skill);
      }
    }

    if (weakSkills.length > 0) {
      // Find bridge exercises that develop weak skills
      const bridges = [];
      for (const [oid, oe] of Object.entries(expandedExercises)) {
        if (profile.mastered.has(oid) || oid === exId) continue;
        const develops = oe.skills_developed.filter(s => weakSkills.includes(s));
        if (develops.length > 0 && (oe.prerequisites.every(p => profile.mastered.has(p)) || oe.prerequisites.length === 0)) {
          bridges.push({ id: oid, name: oe.name, area: oe.area, skills: develops, cross: oe.area !== ex.area });
        }
      }
      bridges.sort((a, b) => (b.skills.length * 2 + (b.cross ? 3 : 0)) - (a.skills.length * 2 + (a.cross ? 3 : 0)));
      insights.push({
        type: "struggling",
        exercise: { id: exId, name: ex.name, area: ex.area },
        weakSkills,
        noteClues: noteClues.map(c => c.label),
        bridges,
        crossBridges: bridges.filter(b => b.cross)
      });
    }
  }

  return insights;
}

function getFlags(child) {
  const profile = getProfile(child);
  const flags = [];
  const areas = ["practical_life", "sensorial", "mathematics", "language", "culture"];
  const today = new Date();

  for (const area of areas) {
    const lastObs = profile.lastObsByArea[area];
    if (!lastObs) {
      flags.push({ type: "no_observations", area });
    } else {
      const daysSince = Math.floor((today - new Date(lastObs)) / 86400000);
      if (daysSince > 21) {
        flags.push({ type: "stale_area", area, daysSince });
      }
    }
  }

  return flags;
}

function getRecommendations(child) {
  const profile = getProfile(child);
  const insights = getInsights(child);
  const flags = getFlags(child);

  const readyRaw = [];
  for (const [exId, ex] of Object.entries(expandedExercises)) {
    if (profile.mastered.has(exId) || profile.practicing.has(exId) || profile.struggling.has(exId)) continue;
    const prereqsMet = ex.prerequisites.length === 0 || ex.prerequisites.every(p => profile.mastered.has(p));
    if (prereqsMet) readyRaw.push(exId);
  }

  // Collect weak skills from struggling analysis
  const weakSkillSet = new Set();
  for (const insight of insights) {
    for (const skill of insight.weakSkills) weakSkillSet.add(skill);
  }
  // Collect bridge exercise IDs
  const bridgeIds = new Set();
  for (const i of insights) { if (i.bridges) for (const b of i.bridges) bridgeIds.add(b.id); }
  // Collect unblocking prereqs (struggling child hasn't mastered prereqs)
  const unblockIds = new Set();
  for (const exId of profile.struggling) {
    const ex = expandedExercises[exId];
    if (ex) for (const p of ex.prerequisites) if (!profile.mastered.has(p)) unblockIds.add(p);
  }
  // Gap and stale areas
  const areas = ["practical_life","sensorial","mathematics","language","culture"];
  const tot = Object.values(profile.areaCoverage || {}).reduce((a,b)=>a+b,0);
  const gapAreas = new Set();
  for (const a of areas) { if (!profile.lastObsByArea[a]) gapAreas.add(a); }
  for (const f of flags) { if (f.type === "stale_area" || f.type === "no_observations") gapAreas.add(f.area); }

  const scored = readyRaw.map(exId => {
    const ex = expandedExercises[exId];
    let score = 0;
    const reasons = [];

    // V3 priority hierarchy
    if (unblockIds.has(exId)) { score += 50; reasons.push("unblocks struggling exercise"); }
    if (bridgeIds.has(exId)) { score += 40; reasons.push("bridge for weak skill"); }
    if (gapAreas.has(ex.area)) { score += 30; reasons.push("fills gap in " + ex.area.replace(/_/g," ")); }
    const developsWeak = ex.skills_developed.filter(s => weakSkillSet.has(s));
    if (developsWeak.length > 0) {
      score += 10 + developsWeak.length * 5;
      reasons.push("reinforces: " + developsWeak.map(s=>s.replace(/_/g," ")).join(", "));
    }

    const ageFit = getAgeFit(child.age, ex);
    if (ageFit === "ideal") { score += 15; reasons.push("age-appropriate"); }
    else if (ageFit === "slightly_young") { score += 5; reasons.push("slightly young but reachable"); }
    else if (ageFit === "too_young") return null; // hard filter
    else if (ageFit === "slightly_old" || ageFit === "too_old") { score -= 10; reasons.push("below age range"); }

    const successors = ex.successors ? ex.successors.length : 0;
    score += Math.min(successors * 3, 10);
    if (successors > 0) reasons.push("unlocks " + successors + " successor" + (successors > 1 ? "s" : ""));

    return {
      id: exId, name: ex.name, area: ex.area, sub_area: ex.sub_area, score, reasons, ageFit,
      tier: score >= 40 ? "urgent" : score >= 20 ? "recommended" : "available"
    };
  }).filter(x => x);

  scored.sort((a, b) => b.score - a.score);

  return {
    urgent: scored.filter(r => r.tier === "urgent").slice(0, 3),
    recommended: scored.filter(r => r.tier === "recommended").slice(0, 4),
    all: scored.slice(0, 10)
  };
}

// ============================================================
// SAMPLE CHILDREN
// ============================================================

const SAMPLE_CHILDREN = [
  {
    name: "Priya", age: 4.2,
    observations: [
      { exercise: "PL001", date: "2026-03-01", status: "mastered", notes: "Confident on the line" },
      { exercise: "PL002", date: "2026-03-01", status: "mastered", notes: "Carries tray steadily" },
      { exercise: "PL005", date: "2026-03-02", status: "mastered", notes: "" },
      { exercise: "PL010", date: "2026-03-02", status: "mastered", notes: "" },
      { exercise: "PL020", date: "2026-03-03", status: "mastered", notes: "" },
      { exercise: "PL011", date: "2026-03-05", status: "mastered", notes: "" },
      { exercise: "PL030", date: "2026-03-05", status: "mastered", notes: "" },
      { exercise: "PL070", date: "2026-03-07", status: "mastered", notes: "" },
      { exercise: "S001", date: "2026-03-10", status: "mastered", notes: "" },
      { exercise: "S010", date: "2026-03-10", status: "mastered", notes: "" },
      { exercise: "L001", date: "2026-03-14", status: "mastered", notes: "" },
      { exercise: "L005", date: "2026-03-15", status: "mastered", notes: "" },
      { exercise: "L012", date: "2026-03-20", status: "struggling", notes: "Difficulty gripping metal inset knob, hand fatigues quickly" },
      { exercise: "L012", date: "2026-03-22", status: "struggling", notes: "Grip remains weak, pencil slips" },
      { exercise: "PL007", date: "2026-03-08", status: "practicing", notes: "Drops tongs frequently, grip not strong enough" },
    ]
  },
  {
    name: "Marcus", age: 4.8,
    observations: [
      { exercise: "PL001", date: "2025-09-01", status: "mastered", notes: "" },
      { exercise: "PL002", date: "2025-09-01", status: "mastered", notes: "" },
      { exercise: "PL005", date: "2025-09-05", status: "mastered", notes: "" },
      { exercise: "PL010", date: "2025-09-05", status: "mastered", notes: "" },
      { exercise: "S001", date: "2025-10-01", status: "mastered", notes: "" },
      { exercise: "S010", date: "2025-10-05", status: "mastered", notes: "" },
      { exercise: "L001", date: "2025-10-20", status: "mastered", notes: "" },
      { exercise: "M001", date: "2025-12-01", status: "practicing", notes: "Struggles with seriation of rods. Visual comparison weak." },
      { exercise: "M001", date: "2025-12-15", status: "practicing", notes: "Counting strong but can't reliably seriate by length" },
    ]
  },
  {
    name: "Liam", age: 5.1,
    observations: [
      { exercise: "PL001", date: "2026-01-10", status: "mastered", notes: "" },
      { exercise: "PL002", date: "2026-01-10", status: "mastered", notes: "" },
      { exercise: "S001", date: "2026-01-22", status: "mastered", notes: "" },
      { exercise: "S010", date: "2026-01-22", status: "mastered", notes: "" },
      { exercise: "L001", date: "2026-02-05", status: "mastered", notes: "Strong phonemic awareness" },
      { exercise: "L012", date: "2026-02-15", status: "mastered", notes: "Beautiful inset work" },
      { exercise: "M001", date: "2026-03-01", status: "mastered", notes: "" },
      { exercise: "M011", date: "2026-03-18", status: "practicing", notes: "Working on tens, loses count in 70s-90s" },
    ]
  },
  {
    name: "Amara", age: 3.4,
    observations: [
      { exercise: "PL001", date: "2026-02-01", status: "mastered", notes: "" },
      { exercise: "PL002", date: "2026-02-05", status: "mastered", notes: "" },
      { exercise: "PL005", date: "2026-02-05", status: "mastered", notes: "Loves the containers" },
      { exercise: "PL070", date: "2026-02-12", status: "mastered", notes: "" },
      { exercise: "PL010", date: "2026-02-15", status: "practicing", notes: "Some spilling but improving" },
      { exercise: "S010", date: "2026-02-20", status: "practicing", notes: "" },
      { exercise: "L001", date: "2026-02-25", status: "practicing", notes: "Getting beginning sounds" },
    ]
  }
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MontreeGuru() {
  const [selectedChild, setSelectedChild] = useState(SAMPLE_CHILDREN[0]);
  const [messages, setMessages] = useState([
    { role: "guru", content: `Hi! Let's explore ${SAMPLE_CHILDREN[0].name}'s progress. What would you like to know?` }
  ]);
  const [input, setInput] = useState("");
  const [showRecordOverlay, setShowRecordOverlay] = useState(false);
  const [recordForm, setRecordForm] = useState({ exercise: "", status: "practicing", notes: "" });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");

    setTimeout(() => {
      const response = generateGuruResponse(text, selectedChild);
      setMessages(prev => [...prev, { role: "guru", content: response }]);
    }, 300);
  };

  const handleRecordObservation = () => {
    if (!recordForm.exercise.trim()) {
      alert("Please select an exercise");
      return;
    }

    const newObs = {
      exercise: recordForm.exercise.split(" (")[0] || recordForm.exercise,
      date: new Date().toISOString().split('T')[0],
      status: recordForm.status,
      notes: recordForm.notes
    };

    // Find exercise ID by name
    let exerciseId = "";
    for (const [id, ex] of Object.entries(expandedExercises)) {
      if (ex.name === recordForm.exercise) {
        exerciseId = id;
        break;
      }
    }

    if (!exerciseId) {
      alert("Exercise not found");
      return;
    }

    const updatedChild = {
      ...selectedChild,
      observations: [...selectedChild.observations, { ...newObs, exercise: exerciseId }]
    };

    setSelectedChild(updatedChild);
    setShowRecordOverlay(false);
    setRecordForm({ exercise: "", status: "practicing", notes: "" });

    setMessages(prev => [...prev, { role: "guru", content: `✓ Observation saved. Let me update my analysis...` }]);

    setTimeout(() => {
      const response = generateGuruResponse("", updatedChild);
      setMessages(prev => [...prev, { role: "guru", content: response }]);
    }, 500);
  };

  const generateGuruResponse = (query, child) => {
    const q = query.toLowerCase();
    const profile = getProfile(child);
    const recs = getRecommendations(child);
    const flags = getFlags(child);
    const insights = getInsights(child);
    const name = child.name;

    // Overview / greeting
    if (q.match(/\b(hi|hello|hey|how is|how's|doing|overview|summary|update|progress)\b/) || q === "") {
      let html = `<div style="display:grid;gap:10px;"><div style="font-size:14px;line-height:1.6;">`;
      html += `${name} has mastered <strong>${profile.mastered.size}</strong> exercises and is practicing <strong>${profile.practicing.size}</strong>.`;
      if (profile.struggling.size > 0) html += ` Struggling with <strong>${profile.struggling.size}</strong>.`;
      html += `</div>`;
      const strs = insights.filter(i => i.type === "struggling");
      if (strs.length > 0) {
        const s = strs[0];
        html += `<div style="padding:10px 12px;background:#fde8e8;border-left:3px solid #c05746;border-radius:4px;font-size:13px;">`;
        html += `<strong>${s.exercise.name}</strong> — ${s.noteClues.length > 0 ? s.noteClues.join(", ") : "needs skill development"}`;
        if (s.crossBridges && s.crossBridges.length > 0) html += `<br/>Try <strong>${s.crossBridges[0].name}</strong> as a bridge.`;
        html += `</div>`;
      }
      if (flags.length > 0) {
        html += `<div style="font-size:12px;color:#8a7b6b;margin-top:2px;">${flags.length} flag${flags.length > 1 ? "s" : ""} to watch</div>`;
      }
      if (recs.urgent.length > 0) {
        html += `<div style="padding:10px 12px;background:#e8f5ee;border-left:3px solid #2d6a4f;border-radius:4px;font-size:13px;">`;
        html += `Top pick: <strong>${recs.urgent[0].name}</strong> — ${recs.urgent[0].reasons[0]}`;
        html += `</div>`;
      }
      html += `</div>`;
      return html;
    }

    // Recommendations
    if (q.match(/\b(present|next|recommend|suggest|what should|ready|introduce|give|show)\b/)) {
      let html = `<div style="display:grid;gap:8px;">`;
      if (recs.urgent.length > 0) {
        html += `<div style="padding:10px 12px;background:#fde8e8;border-left:3px solid #c05746;border-radius:4px;">`;
        html += `<div style="font-weight:700;color:#c05746;font-size:11px;text-transform:uppercase;margin-bottom:6px;">Urgent</div>`;
        for (const r of recs.urgent) {
          html += `<div style="font-size:13px;margin-bottom:6px;"><strong>${r.name}</strong> <span style="color:#8a7b6b;font-size:11px;">${r.area.replace(/_/g," ")}</span><br/><span style="font-size:12px;color:#5c4f42;">${r.reasons.slice(0,2).join(" · ")}</span></div>`;
        }
        html += `</div>`;
      }
      if (recs.recommended.length > 0) {
        html += `<div style="padding:10px 12px;background:#fffbf0;border-left:3px solid #e9a820;border-radius:4px;">`;
        html += `<div style="font-weight:700;color:#b8860b;font-size:11px;text-transform:uppercase;margin-bottom:6px;">Recommended</div>`;
        for (const r of recs.recommended) {
          html += `<div style="font-size:13px;margin-bottom:4px;"><strong>${r.name}</strong> <span style="color:#8a7b6b;font-size:11px;">${r.area.replace(/_/g," ")}</span></div>`;
        }
        html += `</div>`;
      }
      if (recs.urgent.length > 0) {
        html += `<div style="font-size:13px;color:#3d3229;margin-top:4px;">I'd start with <strong>${recs.urgent[0].name}</strong> — ${recs.urgent[0].reasons[0]}.</div>`;
      }
      html += `</div>`;
      return html;
    }

    // Struggling / difficulty
    if (q.match(/\b(struggl|difficult|trouble|concern|worry|problem|stuck|weak|behind|help)\b/)) {
      const strs = insights.filter(i => i.type === "struggling");
      if (strs.length === 0) return `${name} isn't struggling with anything right now — keep observing for natural moments to stretch.`;
      let html = `<div style="display:grid;gap:10px;">`;
      for (const s of strs) {
        html += `<div style="padding:12px;background:#f5f0ea;border-radius:8px;">`;
        html += `<div style="font-weight:700;font-size:14px;margin-bottom:6px;">${s.exercise.name}</div>`;
        html += `<div style="font-size:12px;color:#5c4f42;margin-bottom:6px;">Weak skills: ${s.weakSkills.map(sk => sk.replace(/_/g," ")).join(", ")}</div>`;
        if (s.noteClues.length > 0) html += `<div style="font-size:12px;color:#8a7b6b;margin-bottom:8px;">From notes: ${s.noteClues.join(", ")}</div>`;
        if (s.crossBridges && s.crossBridges.length > 0) {
          html += `<div style="font-size:12px;font-weight:600;margin-bottom:4px;">Cross-area bridges:</div>`;
          for (const b of s.crossBridges.slice(0, 4)) {
            html += `<div style="font-size:12px;padding:3px 0;display:flex;align-items:center;gap:6px;"><span style="width:6px;height:6px;border-radius:50%;background:#2d6a4f;flex-shrink:0;"></span><strong>${b.name}</strong> <span style="color:#8a7b6b;">${b.area.replace(/_/g," ")} — ${b.skills.map(sk=>sk.replace(/_/g," ")).join(", ")}</span></div>`;
          }
        }
        html += `</div>`;
      }
      html += `<div style="font-size:13px;color:#5c4f42;">Step back to exercises that build these skills, then return when readiness shows.</div></div>`;
      return html;
    }

    // Flags / attention
    if (q.match(/\b(flag|alert|attention|watch|monitor|check)\b/)) {
      if (flags.length === 0) return `No flags for ${name} right now. Looking good!`;
      let html = `<div style="display:grid;gap:6px;">`;
      for (const f of flags) {
        const color = f.type === "prolonged_struggle" ? "#c05746" : f.type === "stalled_practice" ? "#e9a820" : "#4a7fb5";
        html += `<div style="padding:8px 10px;border-left:3px solid ${color};background:${color}11;border-radius:0 6px 6px 0;font-size:13px;">${f.message || f.msg || f.area}</div>`;
      }
      html += `</div>`;
      return html;
    }

    // Skills / strengths
    if (q.match(/\b(skill|strength|strong|good at|excels|capable)\b/)) {
      const top = Object.entries(profile.skillStrength).sort((a,b) => b[1] - a[1]).slice(0, 6);
      if (top.length === 0) return `${name} is still building their foundation. Keep presenting!`;
      let html = `<div><div style="font-size:13px;margin-bottom:8px;"><strong>${name}'s strongest skills:</strong></div>`;
      const mx = top[0][1];
      for (const [sk, str] of top) {
        const pct = Math.round(str / Math.max(mx, 5) * 100);
        const color = str >= 4 ? "#2d6a4f" : str >= 2 ? "#e9a820" : "#c05746";
        html += `<div style="margin-bottom:4px;"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:1px;"><span>${sk.replace(/_/g," ")}</span><span style="color:#8a7b6b;">${str}</span></div><div style="height:4px;background:#ede8e0;border-radius:2px;overflow:hidden;"><div style="height:100%;width:${Math.max(pct,8)}%;background:${color};border-radius:2px;"></div></div></div>`;
      }
      html += `</div>`;
      return html;
    }

    // Area balance / gaps
    if (q.match(/\b(area|coverage|balance|gap|missing|spread)\b/)) {
      const areas = ["practical_life","sensorial","mathematics","language","culture"];
      let html = `<div style="font-size:13px;line-height:1.8;">`;
      for (const a of areas) {
        const ct = profile.areaCoverage[a] || 0;
        const icon = ct === 0 ? "⚠️" : "✓";
        html += `${icon} <strong>${a.replace(/_/g," ")}</strong>: ${ct} exercises<br/>`;
      }
      const gaps = areas.filter(a => !(profile.areaCoverage[a]));
      if (gaps.length > 0) html += `<br/>Prioritize: <strong>${gaps.map(g=>g.replace(/_/g," ")).join(", ")}</strong>`;
      html += `</div>`;
      return html;
    }

    // Fallback
    return `I can help with ${name}. Try asking:<br/><br/>• "How is ${name} doing?"<br/>• "What should I present next?"<br/>• "What's ${name} struggling with?"<br/>• "Any flags?"<br/>• "What are ${name}'s strengths?"<br/>• "Any gaps in coverage?"`;
  };

  const suggestionQuestions = [
    "What's next?",
    "Any flags?",
    "What's weak?",
    "Insights?"
  ];

  const exerciseOptions = Object.values(expandedExercises).map(e => e.name).sort();

  return (
    <div style={{ background: "#faf8f5", minHeight: "100vh", padding: "20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h1 style={{ margin: 0, fontSize: "24px", color: "#3d3229", fontWeight: "600" }}>Montree Guru</h1>
            <button onClick={() => setShowRecordOverlay(!showRecordOverlay)}
              style={{ padding: "8px 16px", background: "#2d6a4f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
              {showRecordOverlay ? "Close" : "Record"}
            </button>
          </div>

          {/* Child Selector */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {SAMPLE_CHILDREN.map(child => (
              <button key={child.name} onClick={() => {
                setSelectedChild(child);
                setMessages([{ role: "guru", content: `Hi! Let's explore ${child.name}'s progress. Age ${child.age}y.` }]);
              }}
                style={{
                  padding: "8px 16px", background: selectedChild.name === child.name ? "#2d6a4f" : "#f5f0ea",
                  color: selectedChild.name === child.name ? "#fff" : "#3d3229", border: "none", borderRadius: "20px",
                  cursor: "pointer", fontSize: "13px", fontWeight: "500"
                }}>
                {child.name}
              </button>
            ))}
          </div>
        </div>

        {/* Record Overlay */}
        {showRecordOverlay && (
          <div style={{ background: "#f5f0ea", padding: "16px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #e9e4dd" }}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Exercise</label>
              <input type="text" list="exercises" placeholder="Type exercise name..." value={recordForm.exercise}
                onChange={(e) => setRecordForm({ ...recordForm, exercise: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d9cfc3", borderRadius: "4px", fontSize: "13px", boxSizing: "border-box" }} />
              <datalist id="exercises">
                {exerciseOptions.map((name, i) => <option key={i} value={name} />)}
              </datalist>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Status</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {["mastered", "practicing", "struggling"].map(status => (
                  <button key={status} onClick={() => setRecordForm({ ...recordForm, status })}
                    style={{
                      flex: 1, padding: "8px 12px", background: recordForm.status === status ? "#2d6a4f" : "#fff",
                      color: recordForm.status === status ? "#fff" : "#3d3229", border: `1px solid ${recordForm.status === status ? "#2d6a4f" : "#d9cfc3"}`,
                      borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "500"
                    }}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>Notes</label>
              <textarea placeholder="Observations..." value={recordForm.notes}
                onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #d9cfc3", borderRadius: "4px", fontSize: "13px", fontFamily: "inherit", boxSizing: "border-box", minHeight: "60px", resize: "none" }} />
            </div>

            <button onClick={handleRecordObservation}
              style={{ width: "100%", padding: "10px", background: "#2d6a4f", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
              Save Observation
            </button>
          </div>
        )}

        {/* Chat */}
        <div style={{
          background: "#f5f0ea", borderRadius: "8px", padding: "16px", minHeight: "400px", maxHeight: "500px",
          overflowY: "auto", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "12px"
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "12px 14px",
              background: msg.role === "user" ? "#2d6a4f" : "#fff", color: msg.role === "user" ? "#fff" : "#3d3229",
              borderRadius: "8px", fontSize: "13px", lineHeight: "1.5"
            }}>
              {msg.role === "guru" ? <div dangerouslySetInnerHTML={{ __html: msg.content }} /> : msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
          {suggestionQuestions.map(q => (
            <button key={q} onClick={() => handleSendMessage(q)}
              style={{
                padding: "8px 14px", background: "#fff", color: "#2d6a4f", border: "1px solid #d9cfc3",
                borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: "500"
              }}
              onMouseOver={(e) => e.target.style.background = "#fffbf0"}
              onMouseOut={(e) => e.target.style.background = "#fff"}>
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ display: "flex", gap: "8px" }}>
          <input type="text" placeholder="Ask about progress..." value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
            style={{ flex: 1, padding: "10px 14px", border: "1px solid #d9cfc3", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", background: "#fff" }} />
          <button onClick={() => handleSendMessage(input)}
            style={{ padding: "10px 18px", background: "#2d6a4f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
