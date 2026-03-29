/**
 * skill-graph.ts — V3 Guru Intelligence Skill Graph
 *
 * This is the data layer that powers cross-area bridge detection,
 * note analysis, and skill-based priority scoring for the V3 Guru engine.
 *
 * The skill graph is an OVERLAY on the existing production curriculum.
 * It does NOT replace the 5 JSON stem files. It adds skill metadata
 * derived from the V3 research curriculum graph (231 exercises)
 * reconciled with production work_keys (270 works).
 *
 * 191 V3 exercises matched to production work_keys.
 * 40 V3 exercises had no production equivalent (excluded).
 * 169 unique work_key entries with skill data.
 * 84 unique skills mapped across all areas.
 *
 * Source: docs/montree-v3-research/montree-curriculum-graph.json
 * Reference: docs/montree-v3-research/guru-engine-v3-test.js
 */

// ============================================================
// TYPES
// ============================================================

export interface ExerciseSkillData {
  skills_developed: string[];
  skills_required: string[];
  age_range: string; // e.g. '3-4.5'
}

export interface NotePattern {
  patterns: string[];
  skills: string[];
  label: string;
}

export interface SkillClue {
  skill: string;
  label: string;
  matchedPatterns: string[];
}

export type AgeFit =
  | 'ideal'
  | 'slightly_young'
  | 'too_young'
  | 'slightly_old'
  | 'too_old';

export interface AttentionFlag {
  type: 'stale_area' | 'prolonged_struggle' | 'stalled_practice' | 'area_imbalance';
  severity: 'high' | 'medium' | 'low';
  message: string;
  area?: string;
  work_key?: string;
  details?: Record<string, unknown>;
}

export interface BridgeRecommendation {
  work_key: string;
  from_area: string;
  target_skill: string;
  reason: string;
}

export type ScoringTier = 'urgent' | 'recommended' | 'available' | 'deferred';

// ============================================================
// EXERCISE → SKILL MAP (169 entries)
// Maps production work_key → skill data from V3 curriculum graph
// ============================================================

export const EXERCISE_SKILL_MAP: Record<string, ExerciseSkillData> = {
  cu_animal_habitats: { skills_developed: ["classification","vocabulary_enrichment","logical_reasoning","observation"], skills_required: ["classification"], age_range: '4.5-5.5' },
  cu_art_appreciation: { skills_developed: ["vocabulary_enrichment","observation","memory_visual","synthesis"], skills_required: ["observation"], age_range: '4.5-6' },
  cu_bells: { skills_developed: ["auditory_discrimination","pattern_recognition","concentration","memory_sequential"], skills_required: ["auditory_discrimination"], age_range: '4.5-6' },
  cu_birthday_celebration: { skills_developed: ["spatial_reasoning","order_sense","vocabulary_enrichment","memory_sequential"], skills_required: ["spatial_reasoning"], age_range: '3-6' },
  cu_botany_experiments: { skills_developed: ["plant_care","order_sense","concentration","logical_reasoning","responsibility"], skills_required: ["plant_care","order_sense"], age_range: '4-6' },
  cu_clay: { skills_developed: ["fine_motor_control","grip_strength","spatial_reasoning","concentration"], skills_required: ["fine_motor_control"], age_range: '3-6' },
  cu_clock: { skills_developed: ["number_sense","spatial_reasoning","vocabulary_enrichment"], skills_required: ["number_sense","order_sense"], age_range: '5-6' },
  cu_collage: { skills_developed: ["fine_motor_control","creativity","hand_eye_coordination","spatial_reasoning"], skills_required: ["fine_motor_control"], age_range: '3-5' },
  cu_color_mixing: { skills_developed: ["chromatic_sense","vocabulary_enrichment","problem_solving","creativity"], skills_required: ["chromatic_sense"], age_range: '4.5-6' },
  cu_drawing: { skills_developed: ["fine_motor_control","hand_eye_coordination","creative_writing","concentration"], skills_required: [], age_range: '3-6' },
  cu_flags: { skills_developed: ["visual_discrimination","vocabulary_enrichment","memory_visual","fine_motor_control"], skills_required: ["visual_discrimination"], age_range: '4-6' },
  cu_fundamental_needs: { skills_developed: ["classification","logical_reasoning","vocabulary_enrichment","synthesis"], skills_required: ["classification"], age_range: '4.5-6' },
  cu_globe_continents: { skills_developed: ["spatial_reasoning","vocabulary_enrichment","visual_discrimination","memory_visual"], skills_required: ["spatial_reasoning"], age_range: '3-4.5' },
  cu_globe_land_water: { skills_developed: ["spatial_reasoning","vocabulary_enrichment","visual_discrimination","tactile_discrimination"], skills_required: [], age_range: '3-4' },
  cu_land_water_forms: { skills_developed: ["visual_discrimination","vocabulary_enrichment","classification","spatial_reasoning"], skills_required: ["visual_discrimination"], age_range: '4-5' },
  cu_life_cycles: { skills_developed: ["vocabulary_enrichment","order_sense","memory_sequential","synthesis"], skills_required: ["order_sense"], age_range: '4-5.5' },
  cu_living_nonliving: { skills_developed: ["classification","logical_reasoning","vocabulary_enrichment","observation"], skills_required: [], age_range: '3-4' },
  cu_magnetic: { skills_developed: ["observation","classification","vocabulary_enrichment","problem_solving"], skills_required: ["observation"], age_range: '3-4.5' },
  cu_music_appreciation: { skills_developed: ["vocabulary_enrichment","memory_visual","observation","synthesis"], skills_required: ["memory_visual"], age_range: '5.5-6' },
  cu_parts_fish: { skills_developed: ["vocabulary_enrichment","classification","spatial_reasoning","analysis"], skills_required: ["classification"], age_range: '3.5-5' },
  cu_parts_flower: { skills_developed: ["vocabulary_enrichment","spatial_reasoning","classification","observation"], skills_required: ["classification"], age_range: '3.5-5' },
  cu_parts_leaf: { skills_developed: ["vocabulary_enrichment","spatial_reasoning","observation","analysis"], skills_required: ["observation"], age_range: '4-5.5' },
  cu_parts_plant: { skills_developed: ["vocabulary_enrichment","classification","spatial_reasoning","analysis"], skills_required: ["classification"], age_range: '3-5' },
  cu_personal_timeline: { skills_developed: ["memory_sequential","order_sense","vocabulary_enrichment","observation"], skills_required: ["order_sense"], age_range: '3.5-5' },
  cu_plant_animal: { skills_developed: ["classification","comparison","vocabulary_enrichment","logical_reasoning"], skills_required: ["classification"], age_range: '3-4.5' },
  cu_plant_life_cycle: { skills_developed: ["vocabulary_enrichment","order_sense","memory_sequential","synthesis"], skills_required: ["order_sense"], age_range: '4.5-5.5' },
  cu_printmaking: { skills_developed: ["fine_motor_control","creativity","hand_eye_coordination","problem_solving"], skills_required: ["fine_motor_control"], age_range: '3-5' },
  cu_puzzle_map_world: { skills_developed: ["spatial_reasoning","visual_discrimination","fine_motor_control","vocabulary_enrichment"], skills_required: ["spatial_reasoning","visual_discrimination"], age_range: '3-5' },
  cu_puzzle_maps_continents: { skills_developed: ["spatial_reasoning","vocabulary_enrichment","visual_discrimination","concentration"], skills_required: ["spatial_reasoning"], age_range: '3.5-5.5' },
  cu_rhythm: { skills_developed: ["auditory_discrimination","fine_motor_control","rhythm_sense","coordination"], skills_required: ["fine_motor_control"], age_range: '3-5' },
  cu_simple_machines: { skills_developed: ["vocabulary_enrichment","logical_reasoning","problem_solving","observation"], skills_required: ["logical_reasoning"], age_range: '5-6' },
  cu_singing: { skills_developed: ["auditory_discrimination","oral_expression","cooperation","vocabulary_enrichment"], skills_required: ["auditory_discrimination"], age_range: '3-6' },
  cu_sink_float: { skills_developed: ["observation","classification","logical_reasoning","problem_solving"], skills_required: ["observation"], age_range: '3-4.5' },
  cu_states_matter: { skills_developed: ["observation","classification","vocabulary_enrichment","logical_reasoning"], skills_required: ["observation"], age_range: '4-5' },
  cu_timeline_life: { skills_developed: ["memory_sequential","order_sense","logical_reasoning","vocabulary_enrichment"], skills_required: ["order_sense","classification"], age_range: '5-6' },
  cu_vertebrate_invertebrate: { skills_developed: ["classification","logical_reasoning","vocabulary_enrichment"], skills_required: ["classification"], age_range: '4-5.5' },
  cu_weather: { skills_developed: ["observation","vocabulary_enrichment","memory_sequential","scientific_method"], skills_required: ["observation"], age_range: '4-5.5' },
  la_adjective_intro: { skills_developed: ["grammar_awareness","vocabulary_enrichment","classification","observation"], skills_required: ["grammar_awareness","reading_fluency"], age_range: '4.5-5.5' },
  la_adverb_intro: { skills_developed: ["grammar_awareness","vocabulary_enrichment","classification","sentence_construction"], skills_required: ["grammar_awareness","reading_fluency"], age_range: '5.5-6' },
  la_article_intro: { skills_developed: ["grammar_awareness","symbol_recognition","classification","sentence_construction"], skills_required: ["grammar_awareness","reading_fluency"], age_range: '4.5-5' },
  la_blue_series: { skills_developed: ["phonetic_decoding","reading_fluency","reading_comprehension","vocabulary_enrichment","blending"], skills_required: ["phonetic_decoding","blending"], age_range: '4.5-5' },
  la_chalkboard_writing: { skills_developed: ["letter_formation","gross_motor_control","controlled_movement","fine_motor_control"], skills_required: ["gross_motor_control","fine_motor_control"], age_range: '3.5-4.5' },
  la_classified_cards: { skills_developed: ["vocabulary_enrichment","classification","oral_expression","visual_discrimination"], skills_required: [], age_range: '2.5-6' },
  la_command_cards: { skills_developed: ["grammar_awareness","vocabulary_enrichment","observation","sentence_construction"], skills_required: ["grammar_awareness","reading_fluency"], age_range: '5-5.5' },
  la_conjunction_intro: { skills_developed: ["grammar_awareness","reading_comprehension","logical_reasoning","sentence_construction"], skills_required: ["grammar_awareness"], age_range: '5.5-6' },
  la_creative_writing: { skills_developed: ["creative_writing","sentence_construction","handwriting_control","oral_expression","concentration"], skills_required: ["handwriting_control","sentence_construction","oral_expression"], age_range: '5-6' },
  la_enrichment_vocabulary: { skills_developed: ["vocabulary_enrichment","comparison","oral_expression","logical_reasoning"], skills_required: ["vocabulary_enrichment"], age_range: '3.5-5' },
  la_green_series: { skills_developed: ["reading_comprehension","reading_fluency","story_comprehension","vocabulary_enrichment","blending"], skills_required: ["phonetic_decoding","blending"], age_range: '5-5.5' },
  la_handwriting_paper: { skills_developed: ["handwriting_control","creative_writing","sentence_construction","concentration"], skills_required: ["letter_formation","handwriting_control","word_building"], age_range: '4.5-6' },
  la_metal_insets: { skills_developed: ["handwriting_control","fine_motor_control","tripod_grip","concentration","controlled_movement"], skills_required: ["fine_motor_control","pincer_grip","hand_eye_coordination"], age_range: '3.5-5.5' },
  la_moveable_alphabet: { skills_developed: ["word_building","sentence_construction","creative_writing","concentration"], skills_required: ["word_building","phonemic_awareness"], age_range: '4-5.5' },
  la_noun_intro: { skills_developed: ["grammar_awareness","classification","reading_comprehension","logical_reasoning"], skills_required: ["reading_fluency","word_building"], age_range: '4.5-6' },
  la_phonogram_intro: { skills_developed: ["phonemic_awareness","symbol_sound_association","reading_fluency","memory_visual"], skills_required: ["phonetic_decoding","reading_fluency"], age_range: '4.5-5.5' },
  la_pink_object_box: { skills_developed: ["phonetic_decoding","blending","reading_fluency","concentration"], skills_required: ["symbol_sound_association","blending"], age_range: '4-5' },
  la_pink_series: { skills_developed: ["phonetic_decoding","reading_fluency","blending","reading_comprehension"], skills_required: ["phonetic_decoding","blending"], age_range: '4-4.5' },
  la_preposition_intro: { skills_developed: ["grammar_awareness","spatial_reasoning","vocabulary_enrichment","sentence_construction"], skills_required: ["grammar_awareness","spatial_reasoning"], age_range: '5.5-6' },
  la_puzzle_words: { skills_developed: ["reading_fluency","memory_visual","reading_comprehension"], skills_required: ["phonetic_decoding"], age_range: '4.5-5.5' },
  la_reading_analysis: { skills_developed: ["reading_comprehension","analysis","grammar_awareness","logical_reasoning"], skills_required: ["reading_fluency","sentence_construction","grammar_awareness"], age_range: '5-6' },
  la_reading_classification: { skills_developed: ["reading_comprehension","classification","vocabulary_enrichment"], skills_required: ["phonetic_decoding","reading_fluency"], age_range: '4.5-5.5' },
  la_sandpaper_letters: { skills_developed: ["symbol_sound_association","fine_motor_control","tactile_discrimination","phonemic_awareness"], skills_required: ["symbol_sound_association","phonemic_awareness"], age_range: '3.5-4.5' },
  la_sentence_analysis: { skills_developed: ["grammar_awareness","analysis","symbol_recognition","sentence_construction"], skills_required: ["grammar_awareness","reading_fluency","analysis"], age_range: '5.5-6' },
  la_sound_games: { skills_developed: ["phonemic_awareness","auditory_discrimination","analysis","concentration"], skills_required: ["phonemic_awareness"], age_range: '3-4' },
  la_storytelling: { skills_developed: ["oral_expression","story_comprehension","memory_sequential","confidence","vocabulary_enrichment"], skills_required: [], age_range: '3-6' },
  la_verb_intro: { skills_developed: ["grammar_awareness","classification","reading_comprehension","logical_reasoning"], skills_required: ["grammar_awareness","reading_fluency"], age_range: '5-6' },
  ma_addition_snake_game: { skills_developed: ["number_sense","decimal_understanding","one_to_one_correspondence","problem_solving"], skills_required: ["number_sense","one_to_one_correspondence","decimal_understanding"], age_range: '4.5-5.5' },
  ma_addition_strip_board: { skills_developed: ["number_sense","memory_visual","pattern_recognition","abstraction"], skills_required: ["number_sense"], age_range: '5-6' },
  ma_association_quantity_symbol: { skills_developed: ["decimal_understanding","number_sense","symbol_recognition","logical_reasoning"], skills_required: ["decimal_understanding","symbol_recognition"], age_range: '4-5' },
  ma_calendar: { skills_developed: ["order_sense","vocabulary_enrichment","memory_sequential","number_sense"], skills_required: [], age_range: '3-4' },
  ma_cards_counters: { skills_developed: ["number_sense","one_to_one_correspondence","classification","order_sense"], skills_required: ["number_sense","symbol_recognition","one_to_one_correspondence"], age_range: '4-5' },
  ma_dot_game: { skills_developed: ["abstraction","decimal_understanding","logical_reasoning","problem_solving","estimation"], skills_required: ["number_sense","decimal_understanding","symbol_recognition"], age_range: '5-6' },
  ma_fraction_addition: { skills_developed: ["number_sense","part_whole_understanding","logical_reasoning","problem_solving"], skills_required: ["number_sense","part_whole_understanding"], age_range: '5.5-6' },
  ma_fraction_circles: { skills_developed: ["number_sense","part_whole_understanding","visual_discrimination","spatial_reasoning"], skills_required: ["number_sense","part_whole_understanding"], age_range: '4.5-5.5' },
  ma_fraction_skittles: { skills_developed: ["number_sense","part_whole_understanding","comparison","observation"], skills_required: ["number_sense","one_to_one_correspondence"], age_range: '4-5' },
  ma_geometry_sticks: { skills_developed: ["spatial_reasoning","geometric_understanding","angle_understanding","problem_solving"], skills_required: ["spatial_reasoning","visual_discrimination"], age_range: '4.5-6' },
  ma_golden_beads_addition: { skills_developed: ["decimal_understanding","number_sense","logical_reasoning","problem_solving"], skills_required: ["decimal_understanding","number_sense"], age_range: '4.5-5.5' },
  ma_golden_beads_division: { skills_developed: ["decimal_understanding","number_sense","logical_reasoning","concentration"], skills_required: ["decimal_understanding","number_sense"], age_range: '5-6' },
  ma_golden_beads_intro: { skills_developed: ["decimal_understanding","symbol_recognition","number_sense","estimation"], skills_required: ["decimal_understanding","symbol_recognition"], age_range: '4-5' },
  ma_golden_beads_multiplication: { skills_developed: ["decimal_understanding","number_sense","logical_reasoning","concentration"], skills_required: ["decimal_understanding","number_sense"], age_range: '5-6' },
  ma_golden_beads_subtraction: { skills_developed: ["decimal_understanding","number_sense","logical_reasoning","problem_solving"], skills_required: ["decimal_understanding"], age_range: '5-6' },
  ma_hundred_board: { skills_developed: ["number_sense","pattern_recognition","order_sense","concentration","symbol_recognition"], skills_required: ["decimal_understanding","number_sense"], age_range: '4.5-5.5' },
  ma_long_chains: { skills_developed: ["number_sense","concentration","persistence","pattern_recognition"], skills_required: ["number_sense","pattern_recognition","concentration"], age_range: '5-6' },
  ma_memory_game: { skills_developed: ["number_sense","memory_sequential","concentration","independence"], skills_required: ["number_sense","one_to_one_correspondence"], age_range: '4-5' },
  ma_money: { skills_developed: ["number_sense","practical_application","comparison","vocabulary_enrichment"], skills_required: ["number_sense","one_to_one_correspondence"], age_range: '4.5-5.5' },
  ma_multiplication_bead_board: { skills_developed: ["number_sense","memory_visual","pattern_recognition","concentration"], skills_required: ["number_sense"], age_range: '5-6' },
  ma_number_rods: { skills_developed: ["number_sense","symbol_recognition","one_to_one_correspondence","estimation"], skills_required: ["number_sense","symbol_recognition"], age_range: '3.5-4.5' },
  ma_sandpaper_numerals: { skills_developed: ["symbol_recognition","fine_motor_control","memory_visual","concentration"], skills_required: ["number_sense"], age_range: '3.5-4.5' },
  ma_short_bead_stair: { skills_developed: ["number_sense","seriation","one_to_one_correspondence","pattern_recognition","estimation"], skills_required: ["number_sense","one_to_one_correspondence"], age_range: '4-5' },
  ma_short_chains: { skills_developed: ["number_sense","pattern_recognition","concentration","memory_sequential"], skills_required: ["number_sense","pattern_recognition"], age_range: '5-6' },
  ma_small_bead_frame: { skills_developed: ["decimal_understanding","abstraction","number_sense","concentration"], skills_required: ["decimal_understanding","abstraction"], age_range: '5.5-6' },
  ma_spindle_box: { skills_developed: ["number_sense","one_to_one_correspondence","concentration","fine_motor_control"], skills_required: ["symbol_recognition","one_to_one_correspondence"], age_range: '3.5-4.5' },
  ma_stamp_game: { skills_developed: ["decimal_understanding","abstraction","number_sense","concentration","estimation"], skills_required: ["decimal_understanding","number_sense"], age_range: '5-6' },
  ma_subtraction_snake_game: { skills_developed: ["number_sense","decimal_understanding","logical_reasoning","problem_solving"], skills_required: ["number_sense","decimal_understanding"], age_range: '5-6' },
  ma_subtraction_strip_board: { skills_developed: ["number_sense","memory_visual","logical_reasoning","abstraction"], skills_required: ["number_sense","abstraction"], age_range: '5-6' },
  ma_teen_board_1: { skills_developed: ["number_sense","decimal_understanding","symbol_recognition","vocabulary_enrichment"], skills_required: ["number_sense","symbol_recognition"], age_range: '4-5' },
  ma_ten_board_1: { skills_developed: ["number_sense","decimal_understanding","pattern_recognition","concentration"], skills_required: ["decimal_understanding","number_sense"], age_range: '4-5.5' },
  ma_unit_division_board: { skills_developed: ["number_sense","logical_reasoning","concentration"], skills_required: ["number_sense"], age_range: '5-6' },
  pl_braiding: { skills_developed: ["fine_motor_control","bilateral_coordination","pattern_recognition","concentration"], skills_required: ["fine_motor_control","bilateral_coordination"], age_range: '4-6' },
  pl_carrying_chair: { skills_developed: ["gross_motor_control","controlled_movement","care_of_environment","spatial_reasoning"], skills_required: ["gross_motor_control"], age_range: '2.5-3.5' },
  pl_carrying_mat: { skills_developed: ["fine_motor_control","bilateral_coordination","order_sense","respect_for_materials"], skills_required: ["gross_motor_control","controlled_movement"], age_range: '2.5-3.5' },
  pl_carrying_tray: { skills_developed: ["gross_motor_control","bilateral_coordination","controlled_movement","responsibility"], skills_required: ["gross_motor_control"], age_range: '2.5-3.5' },
  pl_cross_stitch: { skills_developed: ["fine_motor_control","pattern_recognition","concentration","spatial_reasoning"], skills_required: ["fine_motor_control","pattern_recognition","hand_eye_coordination"], age_range: '5-6' },
  pl_cutting_hard: { skills_developed: ["food_preparation","tool_use","hand_eye_coordination","controlled_movement","grip_strength"], skills_required: ["tool_use","hand_eye_coordination","controlled_movement"], age_range: '4-5.5' },
  pl_cutting_soft: { skills_developed: ["food_preparation","tool_use","hand_eye_coordination","order_sense","independence"], skills_required: ["hand_eye_coordination","controlled_movement"], age_range: '3-4' },
  pl_dropper: { skills_developed: ["pincer_grip","fine_motor_control","concentration","controlled_movement"], skills_required: ["pincer_grip","hand_eye_coordination"], age_range: '3-4.5' },
  pl_face_washing: { skills_developed: ["self_care","independence","order_sense"], skills_required: ["self_care","water_handling"], age_range: '3-4' },
  pl_folding_cloth: { skills_developed: ["folding_skill","hand_eye_coordination","spatial_reasoning","fine_motor_control","order_sense"], skills_required: ["fine_motor_control","hand_eye_coordination"], age_range: '4-5.5' },
  pl_frame_bow_tying: { skills_developed: ["fine_motor_control","bilateral_coordination","memory_sequential","persistence","independence"], skills_required: ["fine_motor_control","bilateral_coordination","hand_eye_coordination"], age_range: '4-5.5' },
  pl_frame_lacing: { skills_developed: ["fine_motor_control","bilateral_coordination","hand_eye_coordination","order_sense","patience"], skills_required: ["pincer_grip","hand_eye_coordination"], age_range: '3.5-4.5' },
  pl_frame_large_buttons: { skills_developed: ["fine_motor_control","bilateral_coordination","self_care","pincer_grip","independence"], skills_required: ["pincer_grip","bilateral_coordination"], age_range: '3-3.5' },
  pl_frame_safety_pins: { skills_developed: ["fine_motor_control","pincer_grip","concentration","tool_use"], skills_required: ["fine_motor_control","pincer_grip","concentration"], age_range: '4.5-6' },
  pl_frame_small_buttons: { skills_developed: ["fine_motor_control","pincer_grip","concentration","self_care"], skills_required: ["pincer_grip","fine_motor_control"], age_range: '3.5-4.5' },
  pl_frame_snaps: { skills_developed: ["fine_motor_control","pincer_grip","self_care","problem_solving"], skills_required: ["pincer_grip","fine_motor_control"], age_range: '3.5-4.5' },
  pl_frame_zipper: { skills_developed: ["fine_motor_control","bilateral_coordination","self_care","independence"], skills_required: ["fine_motor_control","bilateral_coordination"], age_range: '3.5-4.5' },
  pl_greetings: { skills_developed: ["grace_and_courtesy","oral_expression","confidence","empathy"], skills_required: [], age_range: '2.5-3.5' },
  pl_hair_brushing: { skills_developed: ["self_care","bilateral_coordination","independence","hand_eye_coordination"], skills_required: [], age_range: '3-4' },
  pl_hand_washing: { skills_developed: ["self_care","order_sense","independence","water_handling"], skills_required: ["wrist_rotation"], age_range: '2.5-3' },
  pl_interrupting: { skills_developed: ["grace_and_courtesy","self_regulation","patience","oral_expression"], skills_required: ["grace_and_courtesy","self_regulation"], age_range: '3.5-5' },
  pl_laundry: { skills_developed: ["care_of_environment","order_sense","grip_strength","water_handling","independence"], skills_required: ["water_handling","grip_strength","order_sense"], age_range: '3.5-5' },
  pl_mopping: { skills_developed: ["care_of_environment","gross_motor_control","bilateral_coordination","water_handling"], skills_required: ["gross_motor_control","water_handling","care_of_environment"], age_range: '3.5-5' },
  pl_nose_blowing: { skills_developed: ["self_care","independence"], skills_required: [], age_range: '2.5-3.5' },
  pl_plant_care: { skills_developed: ["plant_care","care_of_environment","fine_motor_control","concentration","controlled_movement"], skills_required: ["fine_motor_control","plant_care"], age_range: '3.5-5' },
  pl_please_thank_you: { skills_developed: ["grace_and_courtesy","oral_expression","self_regulation","empathy"], skills_required: ["grace_and_courtesy"], age_range: '2.5-4' },
  pl_polishing_metal: { skills_developed: ["care_of_environment","order_sense","concentration","controlled_movement","fine_motor_control"], skills_required: ["order_sense","concentration"], age_range: '3.5-5' },
  pl_pouring_dry: { skills_developed: ["pouring_control","wrist_rotation","bilateral_coordination","controlled_movement","concentration","palmar_grasp"], skills_required: ["bilateral_coordination","controlled_movement"], age_range: '2.5-3.5' },
  pl_pouring_water: { skills_developed: ["pouring_control","water_handling","wrist_rotation","self_correction","care_of_environment"], skills_required: ["pouring_control","controlled_movement"], age_range: '3-3.5' },
  pl_punching: { skills_developed: ["cutting_skill","hand_eye_coordination","bilateral_coordination","fine_motor_control"], skills_required: ["hand_eye_coordination","bilateral_coordination"], age_range: '3-3.5' },
  pl_running_stitch: { skills_developed: ["fine_motor_control","hand_eye_coordination","concentration","pattern_recognition","patience"], skills_required: ["pincer_grip","hand_eye_coordination","bilateral_coordination"], age_range: '4-5.5' },
  pl_sponging: { skills_developed: ["grip_strength","water_handling","bilateral_coordination","concentration"], skills_required: ["water_handling","bilateral_coordination"], age_range: '3-3.5' },
  pl_spooning: { skills_developed: ["food_preparation","hand_eye_coordination","controlled_movement","self_care"], skills_required: ["hand_eye_coordination","controlled_movement"], age_range: '3-4' },
  pl_spreading: { skills_developed: ["food_preparation","tool_use","bilateral_coordination","self_care"], skills_required: ["hand_eye_coordination","bilateral_coordination"], age_range: '3-4' },
  pl_sweeping: { skills_developed: ["care_of_environment","gross_motor_control","bilateral_coordination","responsibility"], skills_required: ["gross_motor_control","bilateral_coordination"], age_range: '3-4' },
  pl_table_scrubbing: { skills_developed: ["care_of_environment","order_sense","concentration","water_handling","gross_motor_control"], skills_required: ["water_handling","order_sense"], age_range: '3-4' },
  pl_teeth_brushing: { skills_developed: ["self_care","order_sense","fine_motor_control","independence"], skills_required: ["self_care","wrist_rotation"], age_range: '3-4' },
  pl_threading_beads: { skills_developed: ["pincer_grip","hand_eye_coordination","bilateral_coordination","concentration","finger_isolation"], skills_required: ["pincer_grip","hand_eye_coordination"], age_range: '3-4' },
  pl_tweezers: { skills_developed: ["pincer_grip","hand_eye_coordination","concentration","fine_motor_control"], skills_required: ["palmar_grasp","hand_eye_coordination"], age_range: '3-4' },
  pl_walking_around_work: { skills_developed: ["grace_and_courtesy","spatial_reasoning","respect_for_materials","self_regulation"], skills_required: ["controlled_movement"], age_range: '2.5-3.5' },
  pl_walking_line: { skills_developed: ["gross_motor_control","concentration","controlled_movement","self_regulation"], skills_required: [], age_range: '2.5-3.5' },
  pl_weaving: { skills_developed: ["fine_motor_control","spatial_reasoning","patience","hand_eye_coordination"], skills_required: ["fine_motor_control"], age_range: '4-6' },
  pl_window_washing: { skills_developed: ["care_of_environment","gross_motor_control","order_sense","water_handling"], skills_required: ["water_handling","care_of_environment"], age_range: '3.5-5' },
  se_baric_tablets: { skills_developed: ["baric_sense","comparison","seriation","concentration"], skills_required: [], age_range: '3.5-5' },
  se_bells: { skills_developed: ["auditory_discrimination","seriation","concentration","controlled_movement","phonemic_awareness"], skills_required: ["auditory_discrimination"], age_range: '3.5-6' },
  se_binomial_cube: { skills_developed: ["spatial_reasoning","pattern_recognition","visual_discrimination","concentration","problem_solving"], skills_required: ["visual_discrimination","dimension_perception"], age_range: '3.5-5' },
  se_brown_stair: { skills_developed: ["visual_discrimination","dimension_perception","seriation","gross_motor_control","concentration"], skills_required: [], age_range: '2.5-3.5' },
  se_color_box_1: { skills_developed: ["chromatic_sense","visual_discrimination","classification","vocabulary_enrichment"], skills_required: [], age_range: '2.5-3' },
  se_color_box_2: { skills_developed: ["chromatic_sense","visual_discrimination","classification","vocabulary_enrichment"], skills_required: ["chromatic_sense"], age_range: '3-3.5' },
  se_color_box_3: { skills_developed: ["chromatic_sense","visual_discrimination","seriation","concentration","comparison"], skills_required: ["chromatic_sense","seriation"], age_range: '3.5-5' },
  se_constructive_triangles_large_hex: { skills_developed: ["spatial_reasoning","geometric_understanding","visual_discrimination","problem_solving"], skills_required: ["spatial_reasoning","geometric_understanding"], age_range: '4.5-5.5' },
  se_constructive_triangles_rect: { skills_developed: ["spatial_reasoning","geometric_understanding","visual_discrimination","problem_solving"], skills_required: ["spatial_reasoning","geometric_understanding"], age_range: '4-5' },
  se_constructive_triangles_tri: { skills_developed: ["spatial_reasoning","geometric_understanding","visual_discrimination","problem_solving"], skills_required: ["spatial_reasoning","visual_discrimination"], age_range: '3.5-5' },
  se_cylinder_block_1: { skills_developed: ["visual_discrimination","dimension_perception","concentration","order_sense","pincer_grip","fine_motor_control"], skills_required: [], age_range: '2.5-3.5' },
  se_cylinder_block_2: { skills_developed: ["visual_discrimination","dimension_perception","comparison","concentration"], skills_required: ["visual_discrimination","pincer_grip"], age_range: '2.5-3.5' },
  se_cylinder_block_3: { skills_developed: ["visual_discrimination","dimension_perception","seriation","concentration"], skills_required: ["visual_discrimination","pincer_grip"], age_range: '2.5-3.5' },
  se_cylinder_block_4: { skills_developed: ["visual_discrimination","dimension_perception","logical_reasoning","concentration"], skills_required: ["visual_discrimination","pincer_grip"], age_range: '3-4' },
  se_cylinder_blocks_combined: { skills_developed: ["visual_discrimination","dimension_perception","concentration","problem_solving","logical_reasoning"], skills_required: ["visual_discrimination","dimension_perception","concentration"], age_range: '3.5-5' },
  se_fabric_matching: { skills_developed: ["tactile_discrimination","classification","concentration","stereognostic_sense"], skills_required: ["tactile_discrimination"], age_range: '3.5-5' },
  se_geometric_cabinet: { skills_developed: ["visual_discrimination","spatial_reasoning","abstraction","classification"], skills_required: ["visual_discrimination","spatial_reasoning"], age_range: '4-5.5' },
  se_geometric_solids: { skills_developed: ["stereognostic_sense","spatial_reasoning","vocabulary_enrichment","tactile_discrimination"], skills_required: [], age_range: '3-4' },
  se_mystery_bag: { skills_developed: ["stereognostic_sense","tactile_discrimination","vocabulary_enrichment","concentration","memory_visual"], skills_required: ["tactile_discrimination"], age_range: '3-5' },
  se_pink_tower: { skills_developed: ["visual_discrimination","dimension_perception","spatial_reasoning","problem_solving","concentration"], skills_required: ["visual_discrimination","dimension_perception","seriation"], age_range: '3.5-5' },
  se_red_rods: { skills_developed: ["visual_discrimination","dimension_perception","seriation","gross_motor_control","concentration"], skills_required: ["visual_discrimination","seriation"], age_range: '3-4' },
  se_smelling_bottles: { skills_developed: ["olfactory_discrimination","classification","vocabulary_enrichment","concentration"], skills_required: [], age_range: '3-5' },
  se_sorting_grains: { skills_developed: ["classification","logical_reasoning","visual_discrimination","vocabulary_enrichment"], skills_required: ["visual_discrimination"], age_range: '3-5' },
  se_sound_boxes: { skills_developed: ["auditory_discrimination","comparison","concentration","memory_visual"], skills_required: [], age_range: '3-4' },
  se_tasting_bottles: { skills_developed: ["gustatory_discrimination","classification","vocabulary_enrichment"], skills_required: [], age_range: '3.5-5' },
  se_thermic_bottles: { skills_developed: ["thermic_sense","comparison","seriation","vocabulary_enrichment"], skills_required: [], age_range: '3-4' },
  se_thermic_tablets: { skills_developed: ["thermic_sense","comparison","classification","concentration"], skills_required: ["thermic_sense"], age_range: '3.5-5' },
  se_touch_boards: { skills_developed: ["tactile_discrimination","concentration","vocabulary_enrichment","controlled_movement"], skills_required: [], age_range: '2.5-3.5' },
  se_touch_tablets: { skills_developed: ["tactile_discrimination","seriation","comparison","concentration"], skills_required: ["tactile_discrimination"], age_range: '3-4' },
  se_trinomial_cube: { skills_developed: ["spatial_reasoning","pattern_recognition","visual_discrimination","concentration","problem_solving","persistence"], skills_required: ["spatial_reasoning","pattern_recognition","concentration"], age_range: '4-6' },
};

// ============================================================
// SKILL → EXERCISE MAP (84 skills)
// Reverse index: which exercises develop a given skill?
// ============================================================

export const SKILL_EXERCISE_MAP: Record<string, string[]> = {
  abstraction: ["se_geometric_cabinet","ma_stamp_game","ma_small_bead_frame","ma_addition_strip_board","ma_subtraction_strip_board","ma_dot_game"],
  analysis: ["la_sound_games","cu_parts_plant","cu_parts_leaf","cu_parts_fish","la_reading_analysis","la_sentence_analysis"],
  angle_understanding: ["ma_geometry_sticks"],
  auditory_discrimination: ["se_sound_boxes","se_bells","la_sound_games","cu_rhythm","cu_bells","cu_singing"],
  baric_sense: ["se_baric_tablets"],
  bilateral_coordination: ["pl_carrying_tray","pl_carrying_mat","pl_threading_beads","pl_pouring_dry","pl_sponging","pl_spooning","pl_hair_brushing","pl_braiding","pl_frame_large_buttons","pl_frame_lacing","pl_frame_bow_tying","pl_frame_zipper","pl_running_stitch","pl_spreading","pl_sweeping","pl_mopping","pl_punching"],
  blending: ["la_pink_object_box","la_pink_series","la_blue_series","la_green_series"],
  care_of_environment: ["pl_carrying_chair","pl_pouring_water","pl_table_scrubbing","pl_laundry","pl_sweeping","pl_mopping","pl_polishing_metal","pl_window_washing","pl_plant_care"],
  chromatic_sense: ["se_color_box_1","se_color_box_2","se_color_box_3","cu_color_mixing"],
  classification: ["se_color_box_1","se_color_box_2","se_geometric_cabinet","se_fabric_matching","se_thermic_tablets","se_smelling_bottles","se_tasting_bottles","se_sorting_grains","ma_cards_counters","la_classified_cards","la_reading_classification","la_noun_intro","la_verb_intro","cu_living_nonliving","cu_plant_animal","cu_parts_plant","cu_vertebrate_invertebrate","cu_timeline_life","cu_fundamental_needs","cu_land_water_forms","cu_sink_float","cu_magnetic","cu_states_matter","cu_parts_flower","cu_parts_fish","cu_animal_habitats","la_article_intro","la_adjective_intro","la_adverb_intro"],
  comparison: ["se_cylinder_block_2","se_color_box_3","se_touch_tablets","se_thermic_bottles","se_thermic_tablets","se_baric_tablets","se_sound_boxes","ma_golden_beads_intro","la_enrichment_vocabulary","cu_land_water_forms","cu_plant_animal","ma_fraction_skittles","ma_money"],
  concentration: ["pl_walking_line","pl_tweezers","pl_dropper","pl_threading_beads","pl_pouring_dry","pl_sponging","pl_spooning","pl_braiding","pl_frame_small_buttons","pl_frame_safety_pins","pl_running_stitch","pl_cross_stitch","pl_table_scrubbing","pl_polishing_metal","pl_plant_care","se_cylinder_block_1","se_cylinder_block_2","se_cylinder_block_3","se_cylinder_block_4","se_cylinder_blocks_combined","se_pink_tower","se_brown_stair","se_red_rods","se_color_box_3","se_binomial_cube","se_trinomial_cube","se_touch_boards","se_touch_tablets","se_fabric_matching","se_thermic_tablets","se_baric_tablets","se_sound_boxes","se_bells","se_smelling_bottles","se_mystery_bag","ma_number_rods","ma_sandpaper_numerals","ma_spindle_box","ma_memory_game","ma_ten_board_1","ma_hundred_board","ma_short_chains","ma_golden_beads_multiplication","ma_golden_beads_division","ma_stamp_game","ma_small_bead_frame","ma_long_chains","ma_multiplication_bead_board","ma_unit_division_board","la_sound_games","la_metal_insets","la_moveable_alphabet","la_handwriting_paper","la_pink_object_box","la_pink_series","la_creative_writing","cu_puzzle_maps_continents","cu_botany_experiments","cu_drawing","cu_clay","cu_rhythm","cu_bells"],
  confidence: ["pl_greetings","la_storytelling"],
  controlled_movement: ["pl_walking_line","pl_carrying_tray","pl_carrying_chair","pl_carrying_mat","pl_dropper","pl_pouring_dry","pl_pouring_water","pl_spooning","pl_cutting_soft","pl_cutting_hard","pl_polishing_metal","pl_plant_care","pl_walking_around_work","se_pink_tower","se_touch_boards","se_bells","la_metal_insets","la_chalkboard_writing"],
  cooperation: ["ma_golden_beads_addition","cu_rhythm","cu_singing"],
  estimation: ["ma_number_rods","ma_golden_beads_intro","ma_stamp_game","ma_dot_game","ma_short_bead_stair"],
  coordination: ["cu_rhythm"],
  creative_writing: ["la_moveable_alphabet","la_handwriting_paper","la_creative_writing","cu_drawing"],
  creativity: ["cu_color_mixing","cu_printmaking","cu_collage"],
  cutting_skill: ["pl_punching"],
  decimal_understanding: ["ma_teen_board_1","ma_ten_board_1","ma_hundred_board","ma_golden_beads_intro","ma_association_quantity_symbol","ma_golden_beads_addition","ma_golden_beads_subtraction","ma_golden_beads_multiplication","ma_golden_beads_division","ma_stamp_game","ma_small_bead_frame","ma_addition_snake_game","ma_subtraction_snake_game","ma_dot_game"],
  dimension_perception: ["se_cylinder_block_1","se_cylinder_block_2","se_cylinder_block_3","se_cylinder_block_4","se_cylinder_blocks_combined","se_pink_tower","se_brown_stair","se_red_rods","se_binomial_cube","ma_number_rods"],
  empathy: ["pl_greetings","pl_please_thank_you"],
  fine_motor_control: ["pl_carrying_mat","pl_tweezers","pl_dropper","pl_spooning","pl_teeth_brushing","pl_braiding","pl_frame_large_buttons","pl_frame_small_buttons","pl_frame_lacing","pl_frame_bow_tying","pl_frame_snaps","pl_frame_zipper","pl_frame_safety_pins","pl_running_stitch","pl_cross_stitch","pl_polishing_metal","pl_plant_care","pl_punching","pl_folding_cloth","se_cylinder_block_1","se_geometric_cabinet","ma_sandpaper_numerals","ma_spindle_box","la_sandpaper_letters","la_metal_insets","la_handwriting_paper","cu_puzzle_map_world","cu_flags","cu_drawing","cu_clay","cu_printmaking","cu_collage","pl_weaving","cu_rhythm","la_command_cards","la_chalkboard_writing"],
  finger_isolation: ["pl_threading_beads"],
  folding_skill: ["pl_folding_cloth"],
  food_preparation: ["pl_spooning","pl_cutting_soft","pl_spreading","pl_cutting_hard"],
  geometric_understanding: ["se_constructive_triangles_tri","se_constructive_triangles_rect","se_constructive_triangles_large_hex","ma_geometry_sticks"],
  grace_and_courtesy: ["pl_greetings","pl_please_thank_you","pl_walking_around_work","pl_interrupting"],
  grammar_awareness: ["la_noun_intro","la_verb_intro","la_conjunction_intro","la_reading_analysis","la_article_intro","la_adjective_intro","la_command_cards","la_adverb_intro","la_preposition_intro","la_sentence_analysis"],
  grip_strength: ["pl_sponging","pl_cutting_hard","pl_laundry","cu_clay"],
  gross_motor_control: ["pl_walking_line","pl_carrying_tray","pl_carrying_chair","pl_carrying_mat","pl_table_scrubbing","pl_sweeping","pl_mopping","pl_window_washing","se_brown_stair","se_red_rods","cu_rhythm","la_chalkboard_writing"],
  gustatory_discrimination: ["se_tasting_bottles"],
  hand_eye_coordination: ["pl_tweezers","pl_dropper","pl_threading_beads","pl_spooning","pl_hair_brushing","pl_frame_lacing","pl_frame_bow_tying","pl_running_stitch","pl_cross_stitch","pl_cutting_soft","pl_spreading","pl_cutting_hard","pl_punching","pl_folding_cloth","se_pink_tower","la_metal_insets","cu_drawing","cu_printmaking","cu_collage","pl_weaving"],
  handwriting_control: ["la_metal_insets","la_handwriting_paper","la_creative_writing"],
  independence: ["pl_hand_washing","pl_face_washing","pl_teeth_brushing","pl_nose_blowing","pl_hair_brushing","pl_frame_large_buttons","pl_frame_bow_tying","pl_frame_zipper","pl_cutting_soft","pl_laundry","ma_memory_game"],
  letter_formation: ["la_sandpaper_letters","la_handwriting_paper","la_chalkboard_writing"],
  logical_reasoning: ["se_cylinder_block_4","se_cylinder_blocks_combined","se_constructive_triangles_rect","se_sorting_grains","ma_association_quantity_symbol","ma_golden_beads_addition","ma_golden_beads_subtraction","ma_golden_beads_multiplication","ma_golden_beads_division","ma_subtraction_strip_board","ma_unit_division_board","la_enrichment_vocabulary","la_noun_intro","la_verb_intro","la_conjunction_intro","cu_living_nonliving","cu_plant_animal","cu_vertebrate_invertebrate","cu_botany_experiments","ma_subtraction_snake_game","ma_dot_game","ma_fraction_addition","cu_timeline_life","cu_fundamental_needs","cu_sink_float","cu_states_matter","cu_simple_machines","cu_animal_habitats","la_command_cards","la_reading_analysis"],
  memory_sequential: ["pl_frame_bow_tying","ma_memory_game","ma_short_chains","la_storytelling","ma_calendar","cu_bells","cu_personal_timeline","cu_birthday_celebration","cu_timeline_life","cu_weather","cu_plant_life_cycle","cu_life_cycles"],
  memory_visual: ["se_sound_boxes","se_mystery_bag","ma_sandpaper_numerals","ma_addition_strip_board","ma_subtraction_strip_board","ma_multiplication_bead_board","la_sandpaper_letters","la_phonogram_intro","la_puzzle_words","cu_globe_continents","cu_flags","cu_art_appreciation","cu_music_appreciation"],
  number_sense: ["ma_number_rods","ma_sandpaper_numerals","ma_spindle_box","ma_cards_counters","ma_memory_game","ma_teen_board_1","ma_ten_board_1","ma_hundred_board","ma_short_chains","ma_golden_beads_intro","ma_association_quantity_symbol","ma_golden_beads_addition","ma_golden_beads_subtraction","ma_golden_beads_multiplication","ma_golden_beads_division","ma_stamp_game","ma_small_bead_frame","ma_long_chains","ma_addition_strip_board","ma_subtraction_strip_board","ma_multiplication_bead_board","ma_unit_division_board","ma_calendar","cu_clock","ma_addition_snake_game","ma_subtraction_snake_game","ma_dot_game","ma_fraction_skittles","ma_fraction_circles","ma_fraction_addition","ma_money","ma_short_bead_stair"],
  observation: ["cu_living_nonliving","ma_fraction_skittles","cu_personal_timeline","cu_sink_float","cu_magnetic","cu_states_matter","cu_simple_machines","cu_color_mixing","cu_weather","cu_parts_flower","cu_parts_leaf","cu_animal_habitats","cu_art_appreciation","cu_music_appreciation","la_adjective_intro","la_command_cards"],
  olfactory_discrimination: ["se_smelling_bottles"],
  one_to_one_correspondence: ["ma_number_rods","ma_spindle_box","ma_cards_counters","ma_memory_game","ma_golden_beads_intro","ma_addition_snake_game","ma_fraction_skittles","ma_money","ma_short_bead_stair"],
  oral_expression: ["pl_greetings","pl_please_thank_you","pl_interrupting","la_classified_cards","la_enrichment_vocabulary","la_storytelling","la_creative_writing","cu_singing"],
  order_sense: ["pl_carrying_mat","pl_hand_washing","pl_face_washing","pl_teeth_brushing","pl_frame_lacing","pl_cutting_soft","pl_table_scrubbing","pl_laundry","pl_polishing_metal","pl_window_washing","pl_folding_cloth","se_cylinder_block_1","ma_cards_counters","ma_hundred_board","cu_botany_experiments","ma_calendar","cu_clock","cu_personal_timeline","cu_birthday_celebration","cu_timeline_life","cu_plant_life_cycle","cu_life_cycles"],
  palmar_grasp: ["pl_tweezers","pl_pouring_dry"],
  part_whole_understanding: ["ma_fraction_skittles","ma_fraction_circles","ma_fraction_addition"],
  patience: ["pl_frame_lacing","pl_running_stitch","pl_interrupting","pl_weaving"],
  pattern_recognition: ["pl_braiding","pl_running_stitch","pl_cross_stitch","se_binomial_cube","se_trinomial_cube","ma_ten_board_1","ma_hundred_board","ma_short_chains","ma_long_chains","ma_addition_strip_board","ma_multiplication_bead_board","cu_bells","ma_short_bead_stair","la_green_series"],
  persistence: ["pl_frame_bow_tying","se_trinomial_cube","ma_long_chains"],
  phonemic_awareness: ["se_bells","la_sound_games","la_sandpaper_letters","la_moveable_alphabet","la_phonogram_intro","la_pink_series"],
  phonetic_decoding: ["la_pink_object_box","la_pink_series","la_phonogram_intro","la_puzzle_words","la_reading_classification","la_blue_series","la_green_series","la_command_cards"],
  pincer_grip: ["pl_tweezers","pl_dropper","pl_threading_beads","pl_frame_large_buttons","pl_frame_small_buttons","pl_frame_lacing","pl_frame_snaps","pl_frame_safety_pins","pl_running_stitch","se_cylinder_block_1","se_cylinder_block_2","se_cylinder_block_3","se_cylinder_block_4","la_metal_insets"],
  plant_care: ["pl_plant_care","cu_botany_experiments"],
  pouring_control: ["pl_pouring_dry","pl_pouring_water","pl_plant_care"],
  practical_application: ["ma_money"],
  problem_solving: ["pl_frame_snaps","se_cylinder_blocks_combined","se_pink_tower","se_constructive_triangles_rect","se_binomial_cube","se_trinomial_cube","ma_golden_beads_addition","ma_golden_beads_subtraction","ma_addition_snake_game","ma_subtraction_snake_game","ma_dot_game","ma_fraction_addition","se_constructive_triangles_tri","se_constructive_triangles_large_hex","ma_geometry_sticks","cu_sink_float","cu_magnetic","cu_simple_machines","cu_color_mixing","cu_printmaking"],
  reading_comprehension: ["la_pink_series","la_puzzle_words","la_reading_classification","la_noun_intro","la_verb_intro","la_conjunction_intro","la_blue_series","la_green_series","la_command_cards","la_reading_analysis"],
  reading_fluency: ["la_pink_object_box","la_pink_series","la_phonogram_intro","la_puzzle_words","la_reading_classification","la_noun_intro","la_verb_intro","la_blue_series","la_green_series","la_reading_analysis","la_article_intro","la_adjective_intro","la_command_cards","la_adverb_intro","la_sentence_analysis"],
  respect_for_materials: ["pl_carrying_mat","pl_walking_around_work"],
  responsibility: ["pl_carrying_tray","pl_sweeping","pl_plant_care","cu_botany_experiments"],
  rhythm_sense: ["cu_rhythm"],
  scientific_method: ["cu_weather"],
  self_care: ["pl_spooning","pl_hand_washing","pl_face_washing","pl_teeth_brushing","pl_nose_blowing","pl_hair_brushing","pl_frame_large_buttons","pl_frame_small_buttons","pl_frame_snaps","pl_frame_zipper","pl_spreading"],
  self_correction: ["pl_pouring_water"],
  self_regulation: ["pl_walking_line","pl_please_thank_you","pl_walking_around_work","pl_interrupting"],
  sentence_construction: ["la_moveable_alphabet","la_handwriting_paper","la_conjunction_intro","la_creative_writing","la_reading_analysis","la_article_intro","la_command_cards","la_adverb_intro","la_preposition_intro","la_sentence_analysis"],
  seriation: ["se_cylinder_block_3","se_pink_tower","se_brown_stair","se_red_rods","se_color_box_3","se_touch_tablets","se_thermic_bottles","se_baric_tablets","se_bells","ma_number_rods","ma_short_bead_stair"],
  spatial_reasoning: ["pl_carrying_chair","pl_cross_stitch","pl_walking_around_work","pl_folding_cloth","se_pink_tower","se_geometric_solids","se_geometric_cabinet","se_constructive_triangles_rect","se_binomial_cube","se_trinomial_cube","cu_globe_land_water","cu_globe_continents","cu_puzzle_map_world","cu_puzzle_maps_continents","cu_land_water_forms","cu_parts_plant","cu_clock","cu_clay","ma_fraction_circles","se_constructive_triangles_tri","se_constructive_triangles_large_hex","ma_geometry_sticks","cu_birthday_celebration","cu_parts_flower","cu_parts_leaf","cu_parts_fish","cu_collage","pl_weaving","la_preposition_intro"],
  stereognostic_sense: ["se_geometric_solids","se_fabric_matching","se_mystery_bag"],
  story_comprehension: ["la_storytelling","la_green_series"],
  symbol_recognition: ["ma_sandpaper_numerals","ma_number_rods","ma_spindle_box","ma_cards_counters","ma_teen_board_1","ma_hundred_board","ma_golden_beads_intro","ma_association_quantity_symbol","ma_dot_game","la_blue_series","la_article_intro","la_sentence_analysis"],
  symbol_sound_association: ["la_sandpaper_letters","la_moveable_alphabet","la_pink_object_box","la_phonogram_intro","la_pink_series","la_blue_series","la_green_series"],
  synthesis: ["cu_fundamental_needs","cu_plant_life_cycle","cu_life_cycles","cu_art_appreciation","cu_music_appreciation"],
  tactile_discrimination: ["se_geometric_solids","se_touch_boards","se_touch_tablets","se_fabric_matching","se_mystery_bag","la_sandpaper_letters","cu_globe_land_water","cu_land_water_forms"],
  thermic_sense: ["se_thermic_bottles","se_thermic_tablets"],
  tool_use: ["pl_frame_safety_pins","pl_cutting_soft","pl_spreading","pl_cutting_hard"],
  tripod_grip: ["la_metal_insets","la_handwriting_paper"],
  visual_discrimination: ["se_cylinder_block_1","se_cylinder_block_2","se_cylinder_block_3","se_cylinder_block_4","se_cylinder_blocks_combined","se_pink_tower","se_brown_stair","se_red_rods","se_color_box_1","se_color_box_2","se_color_box_3","se_geometric_cabinet","se_constructive_triangles_rect","se_binomial_cube","se_trinomial_cube","se_sorting_grains","ma_number_rods","la_classified_cards","cu_globe_land_water","cu_globe_continents","cu_puzzle_map_world","cu_puzzle_maps_continents","cu_flags","ma_fraction_circles","se_constructive_triangles_tri","se_constructive_triangles_large_hex","ma_geometry_sticks","cu_land_water_forms"],
  vocabulary_enrichment: ["se_color_box_1","se_color_box_2","se_geometric_solids","se_geometric_cabinet","se_touch_boards","se_thermic_bottles","se_smelling_bottles","se_tasting_bottles","se_mystery_bag","se_sorting_grains","ma_number_rods","ma_teen_board_1","ma_golden_beads_intro","la_sound_games","la_classified_cards","la_enrichment_vocabulary","la_storytelling","la_reading_classification","cu_globe_land_water","cu_globe_continents","cu_puzzle_map_world","cu_puzzle_maps_continents","cu_land_water_forms","cu_flags","cu_living_nonliving","cu_plant_animal","cu_parts_plant","cu_vertebrate_invertebrate","ma_calendar","cu_clock","ma_money","cu_personal_timeline","cu_birthday_celebration","cu_timeline_life","cu_fundamental_needs","cu_magnetic","cu_states_matter","cu_simple_machines","cu_weather","cu_parts_flower","cu_parts_leaf","cu_plant_life_cycle","cu_parts_fish","cu_life_cycles","cu_animal_habitats","cu_art_appreciation","cu_color_mixing","cu_singing","cu_music_appreciation","la_blue_series","la_green_series","la_adjective_intro","la_command_cards","la_adverb_intro","la_preposition_intro"],
  water_handling: ["pl_pouring_water","pl_sponging","pl_hand_washing","pl_face_washing","pl_table_scrubbing","pl_laundry","pl_mopping","pl_window_washing"],
  word_building: ["la_moveable_alphabet","la_handwriting_paper","la_noun_intro","la_pink_series"],
  wrist_rotation: ["pl_pouring_dry","pl_pouring_water","pl_hand_washing","pl_teeth_brushing"],
};

// ============================================================
// NOTE PATTERNS (59 patterns)
// Maps teacher free-text observations to skill weaknesses
// Source: guru-engine-v3-test.js lines 54-242
// ============================================================

const NOTE_PATTERNS: NotePattern[] = [
  // Motor / Fine Motor (8)
  { patterns: ["grip", "pincer", "hold", "grasp", "tripod"], skills: ["pincer_grip", "fine_motor_control", "tripod_grip"], label: "grip/grasp difficulty" },
  { patterns: ["fatigue", "tires", "tired hand", "hand cramp", "shaking"], skills: ["grip_strength", "fine_motor_control"], label: "hand fatigue" },
  { patterns: ["drops", "dropping", "spill", "knocks over"], skills: ["hand_eye_coordination", "controlled_movement", "fine_motor_control"], label: "object control difficulty" },
  { patterns: ["scissors", "cutting", "cut"], skills: ["cutting_skill", "bilateral_coordination", "hand_eye_coordination"], label: "cutting difficulty" },
  { patterns: ["fold", "folding", "crease"], skills: ["folding_skill", "bilateral_coordination", "fine_motor_control"], label: "folding difficulty" },
  { patterns: ["pour", "pouring", "overflow", "miss the cup"], skills: ["pouring_control", "hand_eye_coordination", "controlled_movement"], label: "pouring difficulty" },
  { patterns: ["wrist", "twist", "turn the", "rotate"], skills: ["wrist_rotation", "fine_motor_control"], label: "wrist rotation difficulty" },
  { patterns: ["both hands", "two hands", "one hand only", "doesn't stabilize"], skills: ["bilateral_coordination"], label: "bilateral coordination difficulty" },

  // Cognitive / Sequencing (9)
  { patterns: ["seriate", "arrangement", "order", "sequence", "length", "height", "gradient"], skills: ["seriation", "order_sense", "dimension_perception"], label: "seriation/ordering difficulty" },
  { patterns: ["sort", "classify", "group", "categorize", "which pile"], skills: ["classification", "logical_reasoning"], label: "classification difficulty" },
  { patterns: ["pattern", "repeat", "what comes next"], skills: ["pattern_recognition"], label: "pattern recognition difficulty" },
  { patterns: ["count", "counting", "skip", "loses count", "miscounts"], skills: ["one_to_one_correspondence", "number_sense", "memory_sequential"], label: "counting difficulty" },
  { patterns: ["quantity", "how many", "more than", "less than", "greater", "fewer"], skills: ["number_sense", "comparison"], label: "quantity comprehension difficulty" },
  { patterns: ["tens", "hundreds", "place value", "decimal", "units"], skills: ["decimal_understanding", "number_sense"], label: "place value difficulty" },
  { patterns: ["concentrate", "focus", "distract", "attention", "wanders", "fidget"], skills: ["concentration", "self_regulation"], label: "concentration difficulty" },
  { patterns: ["remember", "forgot", "memory", "forgets step", "sequence wrong"], skills: ["memory_sequential", "order_sense"], label: "memory/sequence difficulty" },
  { patterns: ["problem solv", "stuck", "gives up", "won't try", "frustrated"], skills: ["problem_solving", "persistence"], label: "problem solving / persistence difficulty" },

  // Sensorial (6)
  { patterns: ["color", "colour", "shade", "gradient", "match the color"], skills: ["chromatic_sense", "visual_discrimination"], label: "color discrimination difficulty" },
  { patterns: ["texture", "rough", "smooth", "feel"], skills: ["tactile_discrimination"], label: "tactile discrimination difficulty" },
  { patterns: ["sound", "loud", "quiet", "hear", "listening"], skills: ["auditory_discrimination"], label: "auditory discrimination difficulty" },
  { patterns: ["size", "dimension", "bigger", "smaller", "thick", "thin", "wide", "narrow"], skills: ["dimension_perception", "visual_discrimination", "comparison"], label: "dimension perception difficulty" },
  { patterns: ["shape", "triangle", "circle", "square", "geometric"], skills: ["spatial_reasoning", "visual_discrimination"], label: "shape recognition difficulty" },
  { patterns: ["weight", "heavy", "light", "heavier"], skills: ["baric_sense"], label: "weight discrimination difficulty" },

  // Language (8)
  { patterns: ["sound out", "phoneme", "beginning sound", "ending sound", "rhyme"], skills: ["phonemic_awareness", "auditory_discrimination"], label: "phonemic awareness difficulty" },
  { patterns: ["blend", "blending", "put sounds together"], skills: ["blending", "phonetic_decoding"], label: "blending difficulty" },
  { patterns: ["letter", "reversal", "backward", "mirror", "confuse b and d", "mixes up", "mix up"], skills: ["letter_formation", "symbol_recognition", "visual_discrimination"], label: "letter formation/recognition difficulty" },
  { patterns: ["read", "decode", "sound it out", "doesn't recognize"], skills: ["phonetic_decoding", "reading_fluency", "symbol_sound_association"], label: "reading/decoding difficulty" },
  { patterns: ["write", "writing", "pencil control", "trace", "tracing"], skills: ["handwriting_control", "tripod_grip", "letter_formation"], label: "writing difficulty" },
  { patterns: ["vocabulary", "word", "doesn't know the word", "name it"], skills: ["vocabulary_enrichment", "oral_expression"], label: "vocabulary difficulty" },
  { patterns: ["sentence", "grammar", "word order"], skills: ["sentence_construction", "grammar_awareness"], label: "grammar/sentence difficulty" },
  { patterns: ["comprehension", "understand", "meaning", "doesn't get", "confused by story"], skills: ["reading_comprehension", "story_comprehension"], label: "comprehension difficulty" },

  // Social / Emotional (5)
  { patterns: ["independent", "asks for help", "won't try alone", "needs adult"], skills: ["independence", "confidence"], label: "independence difficulty" },
  { patterns: ["upset", "tantrum", "cry", "emotional", "overwhelm"], skills: ["self_regulation", "patience"], label: "emotional regulation difficulty" },
  { patterns: ["share", "turn", "wait", "snatch", "grab"], skills: ["cooperation", "patience", "grace_and_courtesy"], label: "social interaction difficulty" },
  { patterns: ["careful", "rough", "throws", "careless", "doesn't return"], skills: ["respect_for_materials", "care_of_environment"], label: "material handling difficulty" },
  { patterns: ["self.correct", "check", "error", "doesn't notice mistake"], skills: ["self_correction", "observation"], label: "self-correction difficulty" },

  // V3.1: Coverage for remaining skills (23)
  { patterns: ["balance", "stumble", "bump into", "clumsy", "trip", "fall", "unsteady"], skills: ["gross_motor_control", "controlled_movement"], label: "gross motor difficulty" },
  { patterns: ["whole hand", "fist", "can't open hand", "palm"], skills: ["palmar_grasp", "fine_motor_control"], label: "palmar grasp difficulty" },
  { patterns: ["individual finger", "finger isolation", "can't point", "all fingers move"], skills: ["finger_isolation", "fine_motor_control"], label: "finger isolation difficulty" },
  { patterns: ["visual memory", "can't picture", "doesn't remember what it looked like", "forgot the image"], skills: ["memory_visual"], label: "visual memory difficulty" },
  { patterns: ["abstract", "concrete only", "needs the material", "can't do it in head", "without the beads"], skills: ["abstraction", "logical_reasoning"], label: "abstraction difficulty" },
  { patterns: ["estimate", "guess how many", "approximate", "about how much"], skills: ["estimation", "number_sense"], label: "estimation difficulty" },
  { patterns: ["take apart", "break down", "which parts"], skills: ["analysis", "logical_reasoning"], label: "analysis difficulty" },
  { patterns: ["put together", "combine", "build from parts", "assemble", "compose"], skills: ["synthesis", "problem_solving"], label: "synthesis difficulty" },
  { patterns: ["dress", "button", "zip", "shoe", "lace", "apron", "jacket"], skills: ["self_care", "independence"], label: "self-care/dressing difficulty" },
  { patterns: ["cook", "recipe", "ingredient", "stir", "chop", "peel"], skills: ["food_preparation", "order_sense", "tool_use"], label: "food preparation difficulty" },
  { patterns: ["sweep", "wipe", "mop", "dust", "tidy", "clean up"], skills: ["care_of_environment"], label: "cleaning difficulty" },
  { patterns: ["tool", "handle", "safely", "proper way to hold"], skills: ["tool_use", "hand_eye_coordination"], label: "tool use difficulty" },
  { patterns: ["water play", "splash", "overflow the basin", "can't control water"], skills: ["water_handling", "controlled_movement"], label: "water handling difficulty" },
  { patterns: ["water the plant", "soil", "garden", "leaf care"], skills: ["plant_care", "care_of_environment", "responsibility"], label: "plant care difficulty" },
  { patterns: ["animal", "feed the", "gentle with", "cage", "fish tank"], skills: ["empathy", "responsibility"], label: "animal care difficulty" },
  { patterns: ["spell", "build the word", "moveable alphabet", "which letters make"], skills: ["word_building", "phonetic_decoding", "symbol_sound_association"], label: "word building difficulty" },
  { patterns: ["story writing", "what to write", "can't think of", "ideas for writing", "journal"], skills: ["creative_writing", "oral_expression"], label: "creative writing difficulty" },
  { patterns: ["feelings", "how they feel", "kind to", "hurt someone's feelings"], skills: ["empathy", "cooperation"], label: "empathy difficulty" },
  { patterns: ["responsible", "owns up", "blame", "forgot to put back", "left it out"], skills: ["responsibility", "care_of_environment"], label: "responsibility difficulty" },
  { patterns: ["smell", "sniff", "stinky", "fragrance", "nose"], skills: ["olfactory_discrimination"], label: "olfactory discrimination difficulty" },
  { patterns: ["taste", "sour", "sweet", "bitter", "salty", "tongue"], skills: ["gustatory_discrimination"], label: "gustatory discrimination difficulty" },
  { patterns: ["temperature", "hot", "cold", "warm", "cool", "thermic"], skills: ["thermic_sense"], label: "thermic discrimination difficulty" },
  { patterns: ["blindfold", "by touch", "eyes closed", "stereognostic", "what is it without looking"], skills: ["stereognostic_sense", "tactile_discrimination"], label: "stereognostic difficulty" },
];

// ============================================================
// AREA DETECTION (derive area from work_key prefix)
// ============================================================

const AREA_PREFIX_MAP: Record<string, string> = {
  pl_: 'practical_life',
  se_: 'sensorial',
  ma_: 'mathematics',
  la_: 'language',
  cu_: 'cultural',
};

export function getAreaFromWorkKey(workKey: string): string | null {
  for (const [prefix, area] of Object.entries(AREA_PREFIX_MAP)) {
    if (workKey.startsWith(prefix)) return area;
  }
  return null;
}

// ============================================================
// AGE-FIT CLASSIFICATION
// 5 categories with 0.5-year grace windows
// ============================================================

function parseAgeRange(ageRange: string): { min: number; max: number } | null {
  const parts = ageRange.split('-');
  if (parts.length !== 2) return null;
  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);
  if (isNaN(min) || isNaN(max)) return null;
  if (min > max) return null;
  return { min, max };
}

export function getAgeFit(workKey: string, childAgeYears: number): AgeFit {
  const data = EXERCISE_SKILL_MAP[workKey];
  if (!data) return 'ideal'; // No age data → don't penalize
  const range = parseAgeRange(data.age_range);
  if (!range) return 'ideal';

  const GRACE = 0.5;

  if (childAgeYears >= range.min && childAgeYears <= range.max) {
    return 'ideal';
  }
  if (childAgeYears < range.min && childAgeYears >= range.min - GRACE) {
    return 'slightly_young';
  }
  if (childAgeYears < range.min - GRACE) {
    return 'too_young';
  }
  if (childAgeYears > range.max && childAgeYears <= range.max + GRACE) {
    return 'slightly_old';
  }
  return 'too_old';
}

// ============================================================
// SKILL STRENGTH
// Count how many exercises a child has mastered for a given skill
// ============================================================

export interface ChildProgressEntry {
  work_key: string;
  status: 'mastered' | 'practicing' | 'presented' | string;
}

export function getSkillStrength(
  childProgress: ChildProgressEntry[],
  skillName: string
): { total: number; mastered: number; practicing: number; presented: number; strength: number } {
  const exercises = SKILL_EXERCISE_MAP[skillName];
  if (!exercises || exercises.length === 0) {
    return { total: 0, mastered: 0, practicing: 0, presented: 0, strength: 0 };
  }

  const progressMap = new Map<string, string>();
  for (const entry of childProgress) {
    progressMap.set(entry.work_key, entry.status);
  }

  let mastered = 0;
  let practicing = 0;
  let presented = 0;

  for (const ex of exercises) {
    const status = progressMap.get(ex);
    if (status === 'mastered') mastered++;
    else if (status === 'practicing') practicing++;
    else if (status === 'presented') presented++;
  }

  const total = exercises.length;
  // Weighted strength: mastered=1.0, practicing=0.5, presented=0.25
  const strength = total > 0
    ? (mastered * 1.0 + practicing * 0.5 + presented * 0.25) / total
    : 0;

  return { total, mastered, practicing, presented, strength };
}

// ============================================================
// CROSS-AREA BRIDGE DETECTION
// Find exercises in OTHER areas that develop needed skills
// ============================================================

export function findBridgeExercises(
  weakSkills: string[],
  currentArea: string,
  childProgress?: ChildProgressEntry[],
  maxResults: number = 5
): BridgeRecommendation[] {
  const progressMap = new Map<string, string>();
  if (childProgress) {
    for (const entry of childProgress) {
      progressMap.set(entry.work_key, entry.status);
    }
  }

  const bridges: BridgeRecommendation[] = [];

  for (const skill of weakSkills) {
    const exercises = SKILL_EXERCISE_MAP[skill];
    if (!exercises) continue;

    for (const workKey of exercises) {
      const area = getAreaFromWorkKey(workKey);
      if (!area || area === currentArea) continue;

      // Skip if already mastered
      const status = progressMap.get(workKey);
      if (status === 'mastered') continue;

      bridges.push({
        work_key: workKey,
        from_area: area,
        target_skill: skill,
        reason: `Develops ${skill.replace(/_/g, ' ')} (needed for ${currentArea.replace(/_/g, ' ')}) via ${area.replace(/_/g, ' ')}`,
      });
    }
  }

  // Deduplicate by work_key (keep first occurrence — highest-priority skill)
  const seen = new Set<string>();
  const deduped: BridgeRecommendation[] = [];
  for (const b of bridges) {
    if (!seen.has(b.work_key)) {
      seen.add(b.work_key);
      deduped.push(b);
    }
  }

  return deduped.slice(0, maxResults);
}

// ============================================================
// NOTE ANALYSIS
// Maps teacher free-text observations to skill weaknesses
// ============================================================

export function analyzeNotes(notes: string[]): SkillClue[] {
  if (!notes || notes.length === 0) return [];

  const combined = notes.join(' ').toLowerCase();
  const clues: SkillClue[] = [];
  const seenSkills = new Set<string>();

  for (const pattern of NOTE_PATTERNS) {
    const matchedPatterns: string[] = [];
    for (const p of pattern.patterns) {
      // Word-boundary matching to avoid substring false positives
      // e.g. "hand" should not match "handle"
      const escaped = p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(combined)) {
        matchedPatterns.push(p);
      }
    }
    if (matchedPatterns.length > 0) {
      for (const skill of pattern.skills) {
        if (!seenSkills.has(skill)) {
          seenSkills.add(skill);
          clues.push({
            skill,
            label: pattern.label,
            matchedPatterns,
          });
        }
      }
    }
  }

  return clues;
}

// ============================================================
// ATTENTION FLAGS
// Detects classroom-level concerns with skill-level granularity
// ============================================================

export interface ChildObservation {
  work_key: string;
  area?: string; // Optional — derived from work_key prefix if not provided
  status: string;
  observed_at: string; // ISO date
  attempts?: number;
}

export function detectAttentionFlags(
  childProgress: ChildObservation[],
  nowDate?: Date
): AttentionFlag[] {
  const now = nowDate || new Date();
  const flags: AttentionFlag[] = [];

  if (!childProgress || childProgress.length === 0) {
    flags.push({
      type: 'stale_area',
      severity: 'high',
      message: 'No observations recorded for this child',
    });
    return flags;
  }

  // Group by area
  const areaLatest = new Map<string, Date>();
  const areaCount = new Map<string, number>();
  let totalCount = 0;

  for (const obs of childProgress) {
    const area = obs.area || getAreaFromWorkKey(obs.work_key) || 'unknown';
    const date = new Date(obs.observed_at);
    const existing = areaLatest.get(area);
    if (!existing || date > existing) {
      areaLatest.set(area, date);
    }
    areaCount.set(area, (areaCount.get(area) || 0) + 1);
    totalCount++;
  }

  // Stale areas: >21 days without observation
  const STALE_THRESHOLD_MS = 21 * 24 * 60 * 60 * 1000;
  for (const [area, latest] of areaLatest) {
    const daysSince = (now.getTime() - latest.getTime()) / (24 * 60 * 60 * 1000);
    if (now.getTime() - latest.getTime() > STALE_THRESHOLD_MS) {
      flags.push({
        type: 'stale_area',
        severity: daysSince > 42 ? 'high' : 'medium',
        message: `No observations in ${area.replace(/_/g, ' ')} for ${Math.round(daysSince)} days`,
        area,
        details: { days_since: Math.round(daysSince) },
      });
    }
  }

  // Area imbalance: >60% in one area
  if (totalCount >= 5) {
    for (const [area, count] of areaCount) {
      const pct = count / totalCount;
      if (pct > 0.6) {
        flags.push({
          type: 'area_imbalance',
          severity: pct > 0.8 ? 'high' : 'medium',
          message: `${Math.round(pct * 100)}% of observations are in ${area.replace(/_/g, ' ')}`,
          area,
          details: { percentage: Math.round(pct * 100), count, total: totalCount },
        });
      }
    }
  }

  // Prolonged struggles: 3+ attempts on same work still not mastered
  const workAttempts = new Map<string, { count: number; status: string }>();
  for (const obs of childProgress) {
    const existing = workAttempts.get(obs.work_key);
    const attempts = obs.attempts || 1;
    if (!existing) {
      workAttempts.set(obs.work_key, { count: attempts, status: obs.status });
    } else {
      existing.count += attempts;
      existing.status = obs.status; // latest status
    }
  }

  for (const [workKey, data] of workAttempts) {
    if (data.count >= 3 && data.status !== 'mastered') {
      flags.push({
        type: 'prolonged_struggle',
        severity: data.count >= 5 ? 'high' : 'medium',
        message: `${workKey.replace(/_/g, ' ')} attempted ${data.count} times, still ${data.status}`,
        work_key: workKey,
        area: getAreaFromWorkKey(workKey) || undefined,
        details: { attempts: data.count, status: data.status },
      });
    }
  }

  // Stalled practice: >14 days on same work in 'practicing' status
  const STALL_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
  const workLatest = new Map<string, { date: Date; status: string }>();
  for (const obs of childProgress) {
    const date = new Date(obs.observed_at);
    const existing = workLatest.get(obs.work_key);
    if (!existing || date > existing.date) {
      workLatest.set(obs.work_key, { date, status: obs.status });
    }
  }

  for (const [workKey, data] of workLatest) {
    if (data.status === 'practicing' && (now.getTime() - data.date.getTime()) > STALL_THRESHOLD_MS) {
      const daysSince = Math.round((now.getTime() - data.date.getTime()) / (24 * 60 * 60 * 1000));
      flags.push({
        type: 'stalled_practice',
        severity: daysSince > 28 ? 'high' : 'medium',
        message: `${workKey.replace(/_/g, ' ')} has been 'practicing' for ${daysSince} days without progress`,
        work_key: workKey,
        area: getAreaFromWorkKey(workKey) || undefined,
        details: { days_stalled: daysSince },
      });
    }
  }

  return flags;
}

// ============================================================
// SCORING TIER ASSIGNMENT
// ============================================================

export function assignTier(score: number): ScoringTier {
  if (score >= 40) return 'urgent';
  if (score >= 20) return 'recommended';
  if (score >= 0) return 'available';
  return 'deferred';
}

// ============================================================
// UTILITY: Check if a work has V3 skill data
// ============================================================

export function hasSkillData(workKey: string): boolean {
  return workKey in EXERCISE_SKILL_MAP;
}

export function getExerciseSkills(workKey: string): ExerciseSkillData | null {
  return EXERCISE_SKILL_MAP[workKey] || null;
}

// ============================================================
// STATS (for logging / diagnostics)
// ============================================================

export const SKILL_GRAPH_STATS = {
  exerciseCount: Object.keys(EXERCISE_SKILL_MAP).length,
  skillCount: Object.keys(SKILL_EXERCISE_MAP).length,
  notePatternCount: NOTE_PATTERNS.length,
} as const;

// ============================================================
// CLASSROOM-LEVEL ATTENTION FLAGS (for Daily Brief)
// Aggregates V3 skill analysis across all children in a classroom
// ============================================================

export interface ClassroomAttentionFlag {
  type: 'skill_gap' | 'area_imbalance' | 'cross_area_opportunity' | 'prolonged_struggle';
  severity: 'high' | 'medium' | 'low';
  message: string;
  childName?: string;
  childId?: string;
  details?: Record<string, unknown>;
}

export interface ChildDataForFlags {
  childId: string;
  childName: string;
  progress: { work_key: string; work_name: string; area: string; status: string; updated_at?: string }[];
  observations: string[];
}

export function generateClassroomAttentionFlags(
  childrenData: ChildDataForFlags[],
  maxFlags: number = 10
): ClassroomAttentionFlag[] {
  const flags: ClassroomAttentionFlag[] = [];

  for (const child of childrenData) {
    const progressEntries: ChildProgressEntry[] = child.progress.map(p => ({
      work_key: p.work_key || p.work_name,
      status: p.status as ChildProgressEntry['status'],
    }));

    // 1. Detect prolonged struggles — works stuck at 'presented' or 'practicing' for 21+ days
    const now = Date.now();
    const stuckWorks = child.progress.filter(p => {
      if (p.status !== 'presented' && p.status !== 'practicing') return false;
      if (!p.updated_at) return false;
      const daysSince = (now - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= 21;
    });

    for (const work of stuckWorks) {
      const skills = getExerciseSkills(work.work_key || work.work_name);
      if (!skills || skills.skills_required.length === 0) continue;

      // Check if any required skill is weak
      const weakReqs: string[] = [];
      for (const req of skills.skills_required) {
        const result = getSkillStrength(progressEntries, req);
        if (result.strength < 0.5) {
          weakReqs.push(req);
        }
      }

      if (weakReqs.length > 0) {
        // This is a cross-area opportunity — child stuck because of prerequisite gaps
        const bridges = findBridgeExercises(weakReqs, work.area, progressEntries, 2);
        if (bridges.length > 0) {
          flags.push({
            type: 'cross_area_opportunity',
            severity: 'high',
            message: `${child.childName}: stuck on ${work.work_name} — weak ${weakReqs[0].replace(/_/g, ' ')} could be built through ${bridges[0].from_area.replace(/_/g, ' ')} exercises`,
            childName: child.childName,
            childId: child.childId,
            details: { work_name: work.work_name, weak_skills: weakReqs, bridges: bridges.map(b => b.work_key) },
          });
        } else {
          flags.push({
            type: 'prolonged_struggle',
            severity: 'medium',
            message: `${child.childName}: stuck on ${work.work_name} for 21+ days — weak prerequisites: ${weakReqs.join(', ').replace(/_/g, ' ')}`,
            childName: child.childName,
            childId: child.childId,
            details: { work_name: work.work_name, weak_skills: weakReqs },
          });
        }
      }
    }

    // 2. Detect area imbalance — >60% of progress in one area
    if (child.progress.length >= 5) {
      const areaCounts: Record<string, number> = {};
      for (const p of child.progress) {
        if (p.area) {
          areaCounts[p.area] = (areaCounts[p.area] || 0) + 1;
        }
      }
      const totalWorks = child.progress.length;
      for (const [area, count] of Object.entries(areaCounts)) {
        if (count / totalWorks > 0.6) {
          flags.push({
            type: 'area_imbalance',
            severity: 'low',
            message: `${child.childName}: ${Math.round((count / totalWorks) * 100)}% of work in ${area.replace(/_/g, ' ')} — consider diversifying`,
            childName: child.childName,
            childId: child.childId,
            details: { dominant_area: area, percentage: Math.round((count / totalWorks) * 100) },
          });
        }
      }
    }

    // 3. Note-based skill clues (if observations available)
    if (child.observations.length > 0) {
      const clues = analyzeNotes(child.observations);
      // Only flag if there are strong clues (3+ matched patterns for a skill)
      const strongClues = clues.filter(c => c.matchedPatterns.length >= 2);
      if (strongClues.length > 0) {
        const topClue = strongClues[0];
        flags.push({
          type: 'skill_gap',
          severity: 'medium',
          message: `${child.childName}: observations suggest weak ${topClue.skill.replace(/_/g, ' ')} — "${topClue.matchedPatterns[0]}"`,
          childName: child.childName,
          childId: child.childId,
          details: { skill: topClue.skill, clues: topClue.matchedPatterns },
        });
      }
    }
  }

  // Sort: high → medium → low, then deduplicate by keeping most severe per child
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  flags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return flags.slice(0, maxFlags);
}
