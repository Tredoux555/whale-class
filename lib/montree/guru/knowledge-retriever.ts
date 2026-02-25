// lib/montree/guru/knowledge-retriever.ts
// Retrieves relevant Montessori knowledge from source books

import { promises as fs } from 'fs';
import * as path from 'path';

// Topic index structure
interface TopicIndex {
  version: string;
  generated: string;
  total_lines: number;
  books: string[];
  topics: {
    [category: string]: {
      [topic: string]: {
        sources: string[];
        line_ranges: {
          [book: string]: [number, number][];
        };
        total_matches: number;
        key_passages: Array<{
          source: string;
          line: number;
          excerpt: string;
        }>;
      };
    };
  };
}

// Book file mapping
const BOOK_FILES: Record<string, string> = {
  absorbent_mind: 'the_absorbent_mind.txt',
  secret_of_childhood: 'secret_of_childhood.txt',
  montessori_method: 'the_montessori_method.txt',
  own_handbook: 'dr_montessoris_own_handbook.txt',
  pedagogical_anthropology: 'pedagogical_anthropology.txt',
  spontaneous_activity: 'spontaneous_activity_in_education.txt',
  elementary_material: 'the_montessori_elementary_material.txt',
  discovery_of_child: 'the_discovery_of_the_child.txt',
};

const BOOK_NAMES: Record<string, string> = {
  absorbent_mind: 'The Absorbent Mind',
  secret_of_childhood: 'The Secret of Childhood',
  montessori_method: 'The Montessori Method',
  own_handbook: "Dr. Montessori's Own Handbook",
  pedagogical_anthropology: 'Pedagogical Anthropology',
  spontaneous_activity: 'Spontaneous Activity in Education',
  elementary_material: 'The Montessori Elementary Material',
  discovery_of_child: 'The Discovery of the Child',
};

// Keywords that map to topic categories
const KEYWORD_MAPPINGS: Record<string, string[]> = {
  // Question patterns -> topics
  'focus|concentrate|attention|distracted': ['concentration.development', 'concentration.obstacles', 'concentration.fostering'],
  'wander|wandering|restless|cant sit|can\'t sit': ['concentration.obstacles', 'normalization.deviations', 'discipline.natural_discipline'],
  'order|organizing|mess|chaos': ['sensitive_periods.order', 'environment.prepared'],
  'language|speaking|talking|words|vocabulary': ['sensitive_periods.language', 'materials.language_materials'],
  'move|movement|running|climbing|physical': ['sensitive_periods.movement', 'child_psychology.independence'],
  'discipline|behavior|misbehav|obey|obedience': ['discipline.natural_discipline', 'discipline.obedience', 'normalization.deviations'],
  'freedom|limits|boundary|boundaries': ['discipline.freedom_limits'],
  'social|friends|sharing|conflict|fight': ['social_development.social_interaction', 'social_development.grace_courtesy'],
  'independent|independence|help me do it': ['child_psychology.independence', 'teacher_role.intervention'],
  'sensitive period': ['sensitive_periods.order', 'sensitive_periods.language', 'sensitive_periods.movement', 'sensitive_periods.sensory'],
  'normal|normalization|normalize': ['normalization.process', 'normalization.characteristics'],
  'deviat|regression|setback': ['normalization.deviations'],
  'teacher|guide|help|interven': ['teacher_role.observation', 'teacher_role.intervention'],
  'material|work|activity|lesson': ['materials.practical_life', 'materials.sensorial', 'materials.math'],
  'environment|classroom|space': ['environment.prepared'],
  'parent|home|family|sibling': ['environment.home'],
  'emotion|angry|upset|frustrated|crying|tantrum': ['child_psychology.emotions', 'normalization.deviations'],
  'will|willpower|choice|decide': ['child_psychology.will', 'discipline.obedience'],
  'character|personality': ['child_psychology.character'],
  'age|development|stage|plane': ['development_stages.planes', 'development_stages.absorbent_mind'],
  'read|write|writing|letter|alphabet|phonics|spell': ['sensitive_periods.language', 'materials.language_materials'],
  'math|count|number|arithmetic|addition': ['materials.math'],
  'sensorial|pink tower|cylinder|colour|texture|smell': ['materials.sensorial', 'sensitive_periods.sensory'],
  'practical life|pouring|buttoning|washing|polishing|dressing': ['materials.practical_life'],
  'grace|courtesy|polite|manners|greeting': ['social_development.grace_courtesy'],
  'mixed age|older|younger|age group': ['social_development.mixed_ages'],
  'prepared environment|classroom setup|shelves|child.sized': ['environment.prepared'],
  'nature|garden|plant|outdoor|cosmic': ['environment.nature'],

  // Phase 7: Expanded keyword mappings for homeschool parents
  // Developmental milestones & age-specific guidance
  'milestone|developmental|behind|ahead|on track|normal for age': ['development_stages.milestones', 'development_stages.planes', 'development_stages.absorbent_mind'],
  'two year|2 year|toddler|18 month': ['development_stages.toddler', 'sensitive_periods.order', 'sensitive_periods.movement'],
  'three year|3 year|preschool': ['development_stages.three_year', 'sensitive_periods.language', 'materials.practical_life'],
  'four year|4 year': ['development_stages.four_year', 'sensitive_periods.language', 'materials.sensorial'],
  'five year|5 year|kindergarten|school ready': ['development_stages.five_year', 'materials.math', 'materials.language_materials'],
  'six year|6 year|first grade': ['development_stages.planes', 'materials.math', 'materials.language_materials'],

  // Common parent mistakes & misconceptions
  'mistake|wrong|doing it wrong|bad parent|failing': ['teacher_role.intervention', 'child_psychology.independence', 'normalization.process'],
  'too much|overwhelm|overschedul|pressure|push': ['concentration.obstacles', 'teacher_role.observation', 'child_psychology.will'],
  'correct|fix|teach them|show them|help them': ['teacher_role.intervention', 'child_psychology.independence', 'materials.control_of_error'],
  'screen|ipad|tablet|phone|tv|youtube': ['concentration.obstacles', 'environment.prepared', 'child_psychology.independence'],
  'reward|sticker|praise|good job|punishment': ['discipline.natural_discipline', 'child_psychology.will', 'normalization.process'],
  'compare|other kids|classmate|neighbour|sibling differ': ['development_stages.planes', 'child_psychology.character', 'normalization.characteristics'],

  // Home environment setup
  'home setup|set up|organize|shelf|low shelf|child height': ['environment.prepared', 'environment.home', 'materials.practical_life'],
  'rotation|rotate|swap|change out|new materials': ['environment.prepared', 'concentration.fostering'],
  'tray|basket|container|beautiful|inviting|aesthetic': ['environment.prepared', 'materials.practical_life'],
  'kitchen|cook|bake|food prep|snack': ['materials.practical_life', 'child_psychology.independence'],
  'bedroom|sleep|bed|morning routine|getting dressed': ['materials.practical_life', 'sensitive_periods.order', 'child_psychology.independence'],
  'bathroom|toilet|potty|hand washing|teeth': ['materials.practical_life', 'child_psychology.independence'],
  'budget|cheap|affordable|diy|homemade|household': ['environment.home', 'materials.practical_life'],

  // Observation techniques for untrained parents
  'observe|watch|notice|journal|record|document': ['teacher_role.observation', 'normalization.characteristics'],
  'how do i know|how can i tell|signs of|indicator': ['teacher_role.observation', 'normalization.characteristics', 'sensitive_periods.order'],
  'interest|follow the child|inner guide|what they want': ['teacher_role.observation', 'child_psychology.will', 'concentration.fostering'],

  // When to worry — professional referral benchmarks
  'worry|concerned|delayed|delay|late|slow|regression': ['development_stages.milestones', 'normalization.deviations'],
  'speech delay|not talking|few words|nonverbal': ['sensitive_periods.language', 'development_stages.milestones'],
  'motor delay|clumsy|coordination|balance|gross motor|fine motor': ['sensitive_periods.movement', 'development_stages.milestones'],
  'sensory issue|sensory processing|overwhelmed by noise|texture': ['sensitive_periods.sensory', 'child_psychology.emotions'],
  'spectrum|autism|adhd|add|learning disability|special needs': ['normalization.deviations', 'teacher_role.intervention', 'child_psychology.character'],
  'therapist|specialist|evaluation|assessment|paediatrician': ['development_stages.milestones', 'normalization.deviations'],
};

let topicIndex: TopicIndex | null = null;
let bookContents: Record<string, string[]> = {};

async function loadTopicIndex(): Promise<TopicIndex> {
  if (topicIndex) return topicIndex;

  const indexPath = path.join(process.cwd(), 'data', 'guru_knowledge', 'topic_index.json');
  const content = await fs.readFile(indexPath, 'utf-8');
  topicIndex = JSON.parse(content);
  return topicIndex!;
}

async function loadBook(bookId: string): Promise<string[]> {
  if (bookContents[bookId]) return bookContents[bookId];

  const filename = BOOK_FILES[bookId];
  if (!filename) return [];

  const bookPath = path.join(process.cwd(), 'data', 'guru_knowledge', 'sources', filename);

  try {
    const content = await fs.readFile(bookPath, 'utf-8');
    bookContents[bookId] = content.split('\n');
    return bookContents[bookId];
  } catch (error) {
    console.error(`Failed to load book ${bookId}:`, error);
    return [];
  }
}

function identifyRelevantTopics(question: string): string[] {
  const questionLower = question.toLowerCase();
  const matchedTopics: Set<string> = new Set();

  for (const [pattern, topics] of Object.entries(KEYWORD_MAPPINGS)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(questionLower)) {
      topics.forEach(t => matchedTopics.add(t));
    }
  }

  // Default topics if nothing matched
  if (matchedTopics.size === 0) {
    matchedTopics.add('teacher_role.observation');
    matchedTopics.add('child_psychology.character');
    matchedTopics.add('normalization.process');
  }

  return Array.from(matchedTopics);
}

export interface KnowledgeResult {
  passages: Array<{
    book: string;
    bookName: string;
    startLine: number;
    endLine: number;
    content: string;
  }>;
  topics_used: string[];
  sources_used: string[];
}

export async function retrieveKnowledge(question: string, maxPassages: number = 5): Promise<KnowledgeResult> {
  const index = await loadTopicIndex();
  const relevantTopics = identifyRelevantTopics(question);

  const passages: KnowledgeResult['passages'] = [];
  const sourcesUsed: Set<string> = new Set();

  // For each relevant topic, get passages
  for (const topicPath of relevantTopics) {
    if (passages.length >= maxPassages) break;

    const [category, topic] = topicPath.split('.');
    const topicData = index.topics[category]?.[topic];

    if (!topicData) continue;

    // Get passages from each source
    for (const bookId of topicData.sources) {
      if (passages.length >= maxPassages) break;

      const ranges = topicData.line_ranges[bookId];
      if (!ranges || ranges.length === 0) continue;

      const lines = await loadBook(bookId);
      if (lines.length === 0) continue;

      // Take the first (most relevant) range from this book for this topic
      const [start, end] = ranges[0];

      // Limit passage size
      const actualEnd = Math.min(end, start + 100); // Max 100 lines per passage

      const passageLines = lines.slice(start - 1, actualEnd);
      const content = passageLines
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (content.length > 50) { // Skip very short passages
        passages.push({
          book: bookId,
          bookName: BOOK_NAMES[bookId] || bookId,
          startLine: start,
          endLine: actualEnd,
          content: content.slice(0, 1500), // Limit to ~1500 chars
        });
        sourcesUsed.add(bookId);
      }
    }
  }

  return {
    passages,
    topics_used: relevantTopics,
    sources_used: Array.from(sourcesUsed),
  };
}

export function formatKnowledgeForPrompt(knowledge: KnowledgeResult): string {
  if (knowledge.passages.length === 0) {
    return 'No specific passages found. Use general Montessori principles.';
  }

  const lines: string[] = ['RELEVANT MONTESSORI WISDOM:', ''];

  for (const passage of knowledge.passages) {
    lines.push(`FROM "${passage.bookName}":`);
    lines.push(passage.content);
    lines.push('');
  }

  return lines.join('\n');
}
