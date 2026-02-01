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
};

const BOOK_NAMES: Record<string, string> = {
  absorbent_mind: 'The Absorbent Mind',
  secret_of_childhood: 'The Secret of Childhood',
  montessori_method: 'The Montessori Method',
  own_handbook: "Dr. Montessori's Own Handbook",
  pedagogical_anthropology: 'Pedagogical Anthropology',
  spontaneous_activity: 'Spontaneous Activity in Education',
  elementary_material: 'The Montessori Elementary Material',
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
