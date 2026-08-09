// Milestone content. All wording ORIGINAL (EYFS Development Matters register, "can…" phrasing).
// Framework codes are citations, never reproduced text.
// Direct milestone row  : "statement_en|statement_zh|expectation"
// Observation milestone : "statement_en|statement_zh|expectation|em_en|dev_en|sec_en|em_zh|dev_zh|sec_zh"
// Row order is always: A3.1, A3.2, A4.1, A4.2, A5.1, A5.2

export const DOMAINS = [
  ['ATL', 'Approaches to Learning & Self-Regulation', '学习方式与自我调节', 'core', 'practical_life', 1],
  ['SED', 'Social & Emotional Development', '社会性与情感发展', 'core', 'practical_life', 2],
  ['LCL', 'Language, Communication & Literacy', '语言、沟通与读写', 'core', 'language', 3],
  ['COG', 'Cognition: Mathematics & Exploration', '认知：数学与探索', 'core', 'mathematics', 4],
  ['PPL', 'Physical Development & Practical Life', '身体发展与日常生活', 'core', 'sensorial', 5],
  ['EFL', 'English (EFL track)', '英语（外语轨道）', 'efl', 'language', 6],
];

// strandId, domainId, name_en, name_zh, method, seq, constructSpec, stopRule n
export const STRANDS = [
  ['ATL-A', 'ATL', 'Engagement & persistence', '投入与坚持', 'observation', 1, 'Sustained attention to a self-chosen activity and willingness to keep going when it is hard.'],
  ['ATL-B', 'ATL', 'Initiative & choice-making', '主动性与选择', 'observation', 2, 'Choosing work independently and seeking out what comes next.'],
  ['ATL-C', 'ATL', 'Flexible thinking & problem-solving', '灵活思维与解决问题', 'observation', 3, 'Trying alternative approaches, asking useful questions, and reasoning about a problem.'],
  ['ATL-D', 'ATL', 'Self-regulation & impulse control', '自我调节与冲动控制', 'observation', 4, 'Waiting, stopping, adapting to change and returning to calm.'],
  ['SED-A', 'SED', 'Relationships with adults', '与成人的关系', 'observation', 1, 'Trust in and communication with familiar adults.'],
  ['SED-B', 'SED', 'Peer interaction & cooperation', '同伴互动与合作', 'observation', 2, 'Playing and working with other children and resolving small conflicts.'],
  ['SED-C', 'SED', 'Emotional knowledge & expression', '情绪认知与表达', 'observation', 3, 'Recognising, naming and responding to feelings in self and others.'],
  ['SED-D', 'SED', 'Grace, courtesy & community', '优雅、礼仪与社群', 'observation', 4, 'The Montessori courtesies and belonging to a working community.'],
  ['LCL-A', 'LCL', 'Receptive language & listening', '接受性语言与倾听', 'direct', 1, 'Understanding spoken language without any reading demand.'],
  ['LCL-B', 'LCL', 'Expressive language & vocabulary', '表达性语言与词汇', 'direct', 2, 'Producing spoken language: naming, describing, sequencing and explaining.'],
  ['LCL-C', 'LCL', 'Phonological awareness', '语音意识', 'direct', 3, 'Awareness of the sound structure of spoken words, independent of print. ENGLISH-MEDIUM: the rhyme and sound targets are English words.', true],
  ['LCL-D', 'LCL', 'Print & alphabet knowledge', '文字与字母知识', 'direct', 4, 'Concepts of print, letter identification, letter-sound links and first word reading. ENGLISH-MEDIUM: the alphabet is the Roman alphabet in the house SATPIN order.', true],
  ['LCL-E', 'LCL', 'Emergent writing', '早期书写', 'observation', 5, 'Purposeful mark-making growing into letters and taught words.'],
  ['COG-A', 'COG', 'Number sense & counting', '数感与计数', 'direct', 1, 'Subitising, one-to-one counting, numeral recognition and the number sequence.'],
  ['COG-B', 'COG', 'Quantity, comparison & early operations', '数量、比较与初步运算', 'direct', 2, 'More/fewer, numeral-to-quantity matching, and joining or taking away small amounts.'],
  ['COG-C', 'COG', 'Shape, space & pattern', '图形、空间与规律', 'direct', 3, 'Naming shapes, continuing repeating patterns and understanding positional language.'],
  ['COG-D', 'COG', 'Measurement, sorting & classification', '测量、分类与归类', 'direct', 4, 'Comparing by size, ordering, grouping by attribute and finding the odd one out.'],
  ['COG-E', 'COG', 'Scientific & world exploration', '科学与世界探索', 'observation', 5, 'Noticing, questioning, predicting and talking about the living and social world.'],
  ['PPL-A', 'PPL', 'Fine motor & hand control', '精细动作与手部控制', 'observation', 1, 'Grip, precision and the hand skills the prepared environment asks for.'],
  ['PPL-B', 'PPL', 'Gross motor & coordination', '大肌肉动作与协调', 'observation', 2, 'Whole-body movement, balance and carrying with care.'],
  ['PPL-C', 'PPL', 'Self-care & independence', '自理与独立', 'observation', 3, 'Managing the body, clothing, food and belongings without adult hands.'],
  ['PPL-D', 'PPL', 'Care of environment & tool use', '照顾环境与工具使用', 'observation', 4, 'Restoring the environment and using real tools for their purpose.'],
  ['E1', 'EFL', 'Receptive vocabulary (English)', '英语接受性词汇', 'direct', 1, 'Recognising taught English words from a spoken prompt and a picture array.'],
  ['E2', 'EFL', 'Listening & instruction-following (English)', '英语听力与指令理解', 'direct', 2, 'Acting on spoken English instructions of growing length and complexity.'],
  ['E3', 'EFL', 'Phonological awareness (English)', '英语语音意识', 'direct', 3, 'Rhyme and sound-position awareness in taught English words.'],
  ['E4', 'EFL', 'Letter–sound knowledge (English)', '英语字母与读音', 'direct', 4, 'Linking English letters to their sounds in the house SATPIN order.'],
  ['E5', 'EFL', 'Word reading / CVC (English)', '英语单词认读', 'direct', 5, 'Reading short English words built only from letters already taught.'],
  ['E6', 'EFL', 'Spoken production (English)', '英语口语表达', 'direct', 6, 'Producing intelligible, appropriate spoken English in a simple exchange.'],
];

// crosswalk per strand: elof[], eyfsArea, eyfsElg (A5 only), chinaMoe base (null for EFL), montessori areaKeys/workKeys
export const CROSSWALK = {
  'ATL-A': [['P-ATL 6', 'P-ATL 7'], 'Characteristics of Effective Teaching and Learning', null, '说明.学习品质.专注与坚持', ['practical_life'], ['pl_work_cycle']],
  // P-ATL 10 is the goal titled "demonstrates initiative and independence"; 11 is curiosity,
  // a defensible secondary. P-ATL 12 (creativity) was wrong here and is dropped (k-standards §2).
  'ATL-B': [['P-ATL 10', 'P-ATL 11'], 'Characteristics of Effective Teaching and Learning', null, '说明.学习品质.主动性', ['practical_life'], ['pl_free_choice']],
  // P-ATL 10 (initiative) belongs to ATL-B — a straight transposition. P-ATL 8 (holds information
  // in mind and manipulates it) is the goal adjacent to reasoning about a problem (k-standards §2).
  'ATL-C': [['P-ATL 9', 'P-ATL 8'], 'Characteristics of Effective Teaching and Learning', null, '科学.科学探究.目标1', ['sensorial'], ['se_problem_solving']],
  'ATL-D': [['P-ATL 4', 'P-ATL 5'], 'Personal, Social and Emotional Development', 'Self-Regulation', '社会.社会适应.目标1', ['practical_life'], ['pl_grace_courtesy']],
  'SED-A': [['P-SE 1'], 'Personal, Social and Emotional Development', 'Building Relationships', '社会.人际交往.目标1', ['practical_life'], ['pl_grace_courtesy']],
  'SED-B': [['P-SE 3', 'P-SE 4', 'P-SE 5'], 'Personal, Social and Emotional Development', 'Building Relationships', '社会.人际交往.目标2', ['practical_life'], ['pl_grace_courtesy']],
  'SED-C': [['P-SE 6', 'P-SE 7'], 'Personal, Social and Emotional Development', 'Self-Regulation', '健康.身心状况.目标2', ['practical_life'], ['pl_grace_courtesy']],
  'SED-D': [['P-SE 2', 'P-SE 11'], 'Personal, Social and Emotional Development', 'Managing Self', '社会.社会适应.目标3', ['practical_life'], ['pl_grace_courtesy']],
  'LCL-A': [['P-LC 1', 'P-LC 2'], 'Communication and Language', 'Listening, Attention and Understanding', '语言.倾听与表达.目标1', ['language'], ['la_oral_language']],
  'LCL-B': [['P-LC 5', 'P-LC 6'], 'Communication and Language', 'Speaking', '语言.倾听与表达.目标2', ['language'], ['la_oral_language']],
  'LCL-C': [['P-LIT 1'], 'Literacy', 'Word Reading', null, ['language'], ['la_sound_games']],
  'LCL-D': [['P-LIT 2', 'P-LIT 3'], 'Literacy', 'Word Reading', null, ['language'], ['la_sandpaper_letters', 'la_moveable_alphabet']],
  'LCL-E': [['P-LIT 6'], 'Literacy', 'Writing', '语言.阅读与书写准备.目标3', ['language'], ['la_metal_insets', 'la_moveable_alphabet']],
  'COG-A': [['P-MATH 1', 'P-MATH 2'], 'Mathematics', 'Number', '科学.数学认知.目标2', ['mathematics'], ['ma_number_rods', 'ma_sandpaper_numerals']],
  'COG-B': [['P-MATH 4', 'P-MATH 5', 'P-MATH 6'], 'Mathematics', 'Number', '科学.数学认知.目标2', ['mathematics'], ['ma_spindle_boxes', 'ma_cards_and_counters']],
  'COG-C': [['P-MATH 7', 'P-MATH 9', 'P-MATH 10'], 'Mathematics', 'Numerical Patterns', '科学.数学认知.目标3', ['sensorial', 'mathematics'], ['se_geometric_cabinet']],
  // eyfsElg was null: since the 2021 EYFS reform there is no dedicated ELG for measurement,
  // sorting or classification — that content sits inside Numerical Patterns. Best fit, labelled
  // as such, rather than a gap (k-standards §3b/§4).
  'COG-D': [['P-MATH 8', 'P-SCI 3'], 'Mathematics', 'Numerical Patterns', '科学.数学认知.目标1', ['sensorial'], ['se_red_rods', 'se_knobbed_cylinders']],
  'COG-E': [['P-SCI 1', 'P-SCI 4'], 'Understanding the World', 'The Natural World', '科学.科学探究.目标2', ['cultural'], ['cu_living_nonliving']],
  'PPL-A': [['P-PMP 3'], 'Physical Development', 'Fine Motor Skills', '健康.动作发展.目标2', ['practical_life'], ['pl_transferring', 'pl_dressing_frames']],
  'PPL-B': [['P-PMP 1', 'P-PMP 2'], 'Physical Development', 'Gross Motor Skills', '健康.动作发展.目标1', ['practical_life'], ['pl_carrying']],
  'PPL-C': [['P-PMP 4'], 'Personal, Social and Emotional Development', 'Managing Self', '健康.生活习惯与生活能力.目标2', ['practical_life'], ['pl_care_of_self']],
  'PPL-D': [['P-PMP 3', 'P-ATL 3'], 'Physical Development', 'Fine Motor Skills', '健康.生活习惯与生活能力.目标3', ['practical_life'], ['pl_care_of_environment']],
  'E1': [['P-LC 6'], 'Communication and Language', 'Listening, Attention and Understanding', null, ['language'], ['la_english_vocabulary']],
  'E2': [['P-LC 1', 'P-LC 2'], 'Communication and Language', 'Listening, Attention and Understanding', null, ['language'], ['la_english_oral']],
  'E3': [['P-LIT 1'], 'Literacy', 'Word Reading', null, ['language'], ['la_english_sound_games']],
  'E4': [['P-LIT 3'], 'Literacy', 'Word Reading', null, ['language'], ['la_english_letter_sounds']],
  'E5': [['P-LIT 3'], 'Literacy', 'Word Reading', null, ['language'], ['la_english_cvc']],
  'E6': [['P-LC 5'], 'Communication and Language', 'Speaking', null, ['language'], ['la_english_oral']],
};

export const MONTREE_ENGLISH = {
  'LCL-C': { phase: 'pink', lessonRange: [1, 12] },
  'LCL-D': { phase: 'pink', lessonRange: [1, 27] },
  'LCL-E': { phase: 'pink', lessonRange: [1, 27] },
  'E3': { phase: 'pink', lessonRange: [1, 12] },
  'E4': { phase: 'pink', lessonRange: [1, 6] },
  'E5': { phase: 'pink', lessonRange: [4, 27] },
};

export const DIRECT = {
  'LCL-A': [
    'Listens to a short sentence and points to the picture it describes.|能听懂一句短句并指出对应的图片。|expected',
    'Follows a simple instruction with one step.|能听从一步的简单指令。|expected',
    'Understands a sentence that says where something is, such as under or on.|能听懂表示位置的句子，如"在下面""在上面"。|expected',
    'Follows an instruction with two steps in the right order.|能按顺序完成两步指令。|expected',
    'Listens to a short story and answers a question about what happened.|能听短故事并回答其中发生的事。|expected',
    'Understands words that tell the order of events, such as first and last.|能理解表示顺序的词，如"先""最后"。|expected',
  ],
  'LCL-B': [
    'Names familiar objects when shown a picture.|看到图片能说出熟悉物品的名称。|expected',
    'Uses short sentences of three or four words to tell you something.|能用三四个词的短句表达自己的意思。|expected',
    'Describes what is happening in a picture using several words.|能用较多词语描述图片中发生的事。|expected',
    'Uses joining words such as and or because to link two ideas.|能用"和""因为"等连接词把两个意思连起来。|expected',
    'Retells what happened in a picture story in the order it happened.|能按顺序复述图画故事的内容。|expected',
    'Explains an idea clearly enough for a listener who did not see it.|能把一件事讲清楚，让没看到的人也听得懂。|emerging_edge',
  ],
  'LCL-C': [
    'Hears when two familiar words rhyme.|能听出两个熟悉的词押韵。|expected',
    'Finds a rhyme even when the word is less familiar.|即使词不太熟悉，也能找出押韵的词。|emerging_edge',
    'Hears when two words start with the same sound.|能听出两个词的开头音相同。|expected',
    'Picks out the first sound in a short spoken word.|能听出一个短词的第一个音。|expected',
    'Picks out the first sound of a word on their own.|能独立听出一个词的第一个音。|expected',
    'Hears the last sound in a short spoken word.|能听出一个短词的最后一个音。|expected',
  ],
  'LCL-D': [
    'Knows that the writing on a page carries a message.|知道纸上的符号是有意义的。|expected',
    'Picks out a letter shape among other squiggles.|能在其他符号中认出字母的形状。|emerging_edge',
    'Matches a letter to the sound it makes, for taught letters.|能把学过的字母与它的读音对应起来。|expected',
    'Finds a named letter among other letters.|能在多个字母中找出说出的那个字母。|expected',
    'Reads a short taught word by looking at its letters.|能看着字母读出学过的短词。|expected',
    'Points to where a sentence begins and follows the words left to right.|能指出句子从哪里开始并从左到右跟读。|emerging_edge',
  ],
  'COG-A': [
    'Sees how many are in a small group without counting, up to three.|不用数就能看出三以内的数量。|expected',
    'Counts a small group of objects, saying one number for each one.|能一一对应地点数少量物品。|expected',
    'Recognises written numerals up to five.|能认读五以内的数字。|expected',
    'Counts on beyond five, out loud and when counting things.|数数和点数物品时都能数到五以上。|expected',
    'Counts on beyond ten, out loud and when counting things.|数数和点数物品时都能数到十以上。|expected',
    'Knows which number is one more than a given number, up to ten.|知道十以内某个数多一是几。|expected',
  ],
  'COG-B': [
    'Chooses the group that has more.|能选出数量多的一组。|expected',
    'Chooses the group that has fewer.|能选出数量少的一组。|emerging_edge',
    'Compares two groups and says which has fewer.|能比较两组并说出哪一组少。|expected',
    'Matches a written numeral to the right number of things, up to five.|能把五以内的数字与相应的数量对应起来。|expected',
    'Works out how many are left when some are taken away, within five.|能算出五以内拿走一些后还剩几个。|expected',
    'Works out how many there are altogether when two small groups are joined.|能算出两小组合起来一共有几个。|expected',
  ],
  'COG-C': [
    'Names or points to a circle, a square and a triangle.|能说出或指出圆形、正方形和三角形。|expected',
    'Copies a simple repeating pattern of two things.|能复制两种元素的简单重复排列。|expected',
    'Says what comes next in a repeating two-part pattern.|能说出两元素重复排列的下一个是什么。|expected',
    'Understands position words such as on, in and under.|能理解"上面""里面""下面"等位置词。|expected',
    'Says what comes next in a longer repeating pattern.|能说出较长重复排列的下一个是什么。|expected',
    'Understands position words such as behind, between and next to.|能理解"后面""中间""旁边"等位置词。|expected',
  ],
  'COG-D': [
    'Picks the longest or the biggest of three things.|能从三样东西中挑出最长或最大的。|expected',
    'Puts things that go together into the same group.|能把同类的东西归到一起。|expected',
    'Finds the one that does not belong in a group.|能找出一组中不属于同类的那一个。|expected',
    'Puts three things in order by size.|能把三样东西按大小排序。|expected',
    'Sorts things by two things at once, such as colour and size.|能同时按颜色和大小两个特征分类。|expected',
    'Chooses which of two things is longer or heavier.|能判断两样东西哪个更长或更重。|expected',
  ],
  'E1': [
    'Points to a familiar English word they hear, from a small set of pictures.|听到熟悉的英语单词能从几张图片中指出来。|expected',
    'Knows the English names of everyday things from more than one topic.|认识多个主题中日常物品的英语名称。|expected',
    'Recognises English words from several different topics taught in class.|能认出课堂上多个主题里的英语单词。|expected',
    'Chooses the right picture even when another one sounds similar.|即使有发音相近的选项，也能选对图片。|expected',
    'Recognises a wide set of taught English words, including describing words.|能认出较多学过的英语单词，包括描述性词语。|expected',
    'Understands English words for position, number and time.|能理解表示位置、数量和时间的英语词。|expected',
  ],
  'E2': [
    'Follows a one-step English instruction when it is shown as well as said.|在有示范的情况下能完成一步英语指令。|expected',
    'Follows a one-step English instruction without being shown.|无需示范也能完成一步英语指令。|emerging_edge',
    'Follows a one-step English instruction on their own.|能独立完成一步英语指令。|expected',
    'Follows a two-step English instruction.|能完成两步英语指令。|emerging_edge',
    'Follows a two-step English instruction in the right order.|能按正确顺序完成两步英语指令。|expected',
    'Follows an English instruction that includes a position word.|能完成含位置词的英语指令。|expected',
  ],
  'E3': [
    'Hears when two familiar English words rhyme.|能听出两个熟悉的英语词押韵。|expected',
    'Finds an English rhyme even when the word is less familiar.|即使英语词不太熟悉，也能找出押韵的词。|emerging_edge',
    'Hears when two English words start with the same sound.|能听出两个英语词的开头音相同。|expected',
    'Picks out the first sound of a short English word.|能听出英语短词的第一个音。|expected',
    'Picks out the first sound of an English word on their own.|能独立听出英语词的第一个音。|expected',
    'Hears the last sound in a short English word.|能听出英语短词的最后一个音。|expected',
  ],
  'E4': [
    'Recognises one or two taught letter sounds in English.|能认出一两个学过的英语字母音。|emerging_edge',
    'Says the sound for a taught English letter.|能说出学过的英语字母的读音。|extension',
    'Hears an English letter sound and finds the letter.|听到英语字母音能找出该字母。|expected',
    'Says the sound for taught English letters.|能说出学过的英语字母的读音。|expected',
    'Knows the sounds for the letters taught so far.|掌握目前教过的所有字母读音。|expected',
    'Says letter sounds quickly and clearly.|能快速清晰地说出字母读音。|expected',
  ],
  'E5': [
    'Reads a short taught English word and matches it to a picture.|能读出学过的英语短词并与图片配对。|extension',
    'Blends the sounds of a short English word to read it.|能把英语短词的音拼读出来。|extension',
    'Reads a short taught English word and finds the picture that matches.|能读出学过的英语短词并找到对应的图片。|emerging_edge',
    'Reads more than one short English word made from taught letters.|能读出不止一个由学过字母组成的英语短词。|extension',
    'Reads short English words made from taught letters.|能读出由学过字母组成的英语短词。|expected',
    'Reads short English words quickly enough to keep the meaning.|能较快读出英语短词并理解其意思。|expected',
  ],
  'E6': [
    'Says their name in English when asked.|被问到时能用英语说出自己的名字。|expected',
    'Names a familiar object in English.|能用英语说出熟悉物品的名称。|expected',
    'Answers a simple question about themselves in English.|能用英语回答关于自己的简单问题。|expected',
    'Answers a simple question about a picture in English.|能用英语回答关于图片的简单问题。|emerging_edge',
    'Answers a question about a picture in English.|能用英语回答关于图片的问题。|expected',
    'Says a short phrase in English that a listener can understand.|能说出让人听得懂的英语短语。|expected',
  ],
};
