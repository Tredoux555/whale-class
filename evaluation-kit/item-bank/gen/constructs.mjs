// Construct tags — the load-bearing link between an item and the milestone it evidences.
// Evidence is assembled by MATCHING these tags, never by slicing items in authoring order
// (audit 01-content C1). Every scored direct item declares `mi` (1|2) in its data row, which
// resolves to the tag below; the validator refuses to ship if an evidence item's tag differs
// from its milestone's tag.
//
// CONSTRUCTS[strandId][band] = [tag for milestone .1, tag for milestone .2]

export const CONSTRUCTS = {
  'LCL-A': {
    A3: ['sentence_picture_match', 'one_step_instruction'],
    A4: ['positional_sentence', 'two_step_instruction'],
    A5: ['story_question', 'order_words'],
    G1: ['inference_from_read_aloud', 'three_step_instruction'],
  },
  'LCL-B': {
    A3: ['name_object', 'short_sentence'],
    A4: ['describe_picture', 'use_connective'],
    A5: ['retell_in_order', 'explain_to_naive_listener'],
    G1: ['retell_with_detail', 'word_meaning_and_category'],
  },
  'LCL-C': {
    A3: ['rhyme_choice_familiar', 'rhyme_choice_less_familiar'],
    A4: ['initial_sound_match', 'initial_sound_isolation'],
    A5: ['initial_sound_isolation', 'final_sound_isolation'],
    G1: ['phoneme_segmentation', 'vowel_sound_contrast'],
  },
  'LCL-D': {
    A3: ['print_carries_message', 'letter_shape_recognition'],
    A4: ['letter_to_sound', 'find_named_letter'],
    A5: ['word_reading', 'print_directionality'],
    G1: ['decode_taught_pattern_word', 'read_sentence_aloud'],
  },
  'COG-A': {
    A3: ['subitise_small', 'one_to_one_count'],
    A4: ['numeral_recognition_to_5', 'count_beyond_five'],
    A5: ['count_beyond_ten', 'one_more_than'],
    G1: ['count_past_hundred', 'tens_and_ones'],
  },
  'COG-B': {
    A3: ['more_than', 'fewer_than'],
    A4: ['fewer_than_compare', 'numeral_to_quantity'],
    A5: ['take_away_within_five', 'join_two_groups'],
    G1: ['add_subtract_within_twenty', 'word_problem_within_twenty'],
  },
  'COG-C': {
    A3: ['name_shape', 'copy_pattern'],
    A4: ['continue_ab_pattern', 'position_on_in_under'],
    A5: ['continue_longer_pattern', 'position_behind_between_next'],
    G1: ['name_solid_shape', 'halves_and_quarters'],
  },
  'COG-D': {
    A3: ['compare_size_extreme', 'group_by_category'],
    A4: ['odd_one_out', 'order_by_size'],
    A5: ['sort_two_attributes', 'compare_length_or_weight'],
    G1: ['read_clock_half_hour', 'compare_by_measure'],
  },
  E1: {
    A3: ['english_vocab_core', 'english_vocab_topics'],
    A4: ['english_vocab_topics', 'english_vocab_phonological_contrast'],
    A5: ['english_vocab_describing', 'english_vocab_position_number_time'],
    G1: ['english_vocab_school_day', 'english_vocab_action_and_place'],
  },
  E2: {
    A3: ['one_step_supported_en', 'one_step_unsupported_en'],
    A4: ['one_step_unsupported_en', 'two_step_en'],
    A5: ['two_step_en', 'instruction_with_position_en'],
    G1: ['three_step_en', 'instruction_with_order_en'],
  },
  E3: {
    A3: ['english_rhyme_familiar', 'english_rhyme_less_familiar'],
    A4: ['english_initial_match', 'english_initial_isolation'],
    A5: ['english_initial_isolation', 'english_final_sound'],
    G1: ['english_medial_vowel', 'english_phoneme_blend'],
  },
  E4: {
    A3: ['letter_sound_receptive', 'letter_sound_expressive'],
    A4: ['letter_sound_receptive', 'letter_sound_expressive'],
    A5: ['letter_sound_receptive', 'letter_sound_expressive'],
    G1: ['digraph_sound_receptive', 'digraph_sound_expressive'],
  },
  E5: {
    A3: ['cvc_read_one', 'cvc_read_more'],
    A4: ['cvc_read_one', 'cvc_read_more'],
    A5: ['cvc_read_one', 'cvc_read_more'],
    G1: ['read_english_word_pattern', 'read_english_sentence'],
  },
  E6: {
    A3: ['english_answer_personal', 'english_name_object'],
    A4: ['english_answer_personal', 'english_short_phrase'],
    A5: ['english_short_phrase', 'english_short_phrase'],
    G1: ['english_ask_question', 'english_describe_picture'],
  },
};

// Milestones whose evidence deliberately lives in another band (declared extension evidence).
// key = milestone id → the band its evidence items sit in.
export const EVIDENCE_BAND = {
  'E5.A3.1': 'A4', 'E5.A3.2': 'A5', 'E5.A4.1': 'A4', 'E5.A4.2': 'A5', 'E5.A5.1': 'A5', 'E5.A5.2': 'A5',
  'E6.A4.2': 'A5',
};

// Letters assumed already taught by the classroom's own phonics sequence at each band
// (Montree Phonics house order: s a t p i n · m d g o c k · ck e u r h b f l j v w x y z qu).
// Any printed word used in an item must be decodable from the letters listed for its band.
export const TAUGHT_LETTERS = {
  A3: ['s', 'a', 't', 'p', 'i', 'n'],
  A4: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k'],
  A5: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f'],
  // Montree Canopy (G1) assumes the whole house sequence is taught, plus the two-letter
  // sounds the Canopy items ask a child to decode.
  G1: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f',
    'l', 'j', 'v', 'w', 'x', 'y', 'z', 'qu', 'sh', 'ch', 'th', 'ng'],
};
export const HEART_WORDS = ['a', 'the', 'is', 'in', 'on', 'and'];
