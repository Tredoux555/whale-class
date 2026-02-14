import { promises as fs } from 'fs';
import path from 'path';

const KNOWLEDGE_DIR = path.join(process.cwd(), 'lib', 'social-media-guru', 'knowledge');

interface KnowledgeFile {
  name: string;
  content: string;
}

/**
 * Load all knowledge files from the knowledge directory
 */
export async function loadAllKnowledge(): Promise<KnowledgeFile[]> {
  const files = await fs.readdir(KNOWLEDGE_DIR);
  const markdownFiles = files.filter(f => f.endsWith('.md'));

  const knowledge: KnowledgeFile[] = [];

  for (const file of markdownFiles) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const content = await fs.readFile(filePath, 'utf-8');
    knowledge.push({
      name: file.replace('.md', ''),
      content
    });
  }

  return knowledge;
}

/**
 * Build context string for the Social Media Guru
 * Includes Montree product info + all social media knowledge
 */
export async function buildSocialMediaGuruContext(userQuestion: string): Promise<string> {
  // Load all knowledge files
  const knowledge = await loadAllKnowledge();

  // Determine which knowledge files are most relevant (for now, include all)
  // In future, could use embeddings or keyword matching for selective loading

  let context = `# Social Media Guru Knowledge Base

You are an expert social media strategist helping Montree (montree.xyz) grow its presence on Instagram, TikTok, Facebook, LinkedIn, and YouTube.

## About Montree

**Product:** Free classroom management app for Montessori teachers
**Target Audience:** Montessori teachers (preschool, 3-6 years), school principals, parents
**Key Features:**
- Progress tracking across all 5 Montessori areas (Practical Life, Sensorial, Language, Mathematics, Cultural)
- Photo-based parent reports with automatic work matching
- Visual curriculum planning
- Teacher time savings: Cut admin from 2 hours to 15 minutes per week

**Brand Voice:** Friendly, empathetic, clear, inspiring (NOT corporate, salesy, or guilt-tripping)

**Current Social Presence:**
- Instagram: @montreexyz
- TikTok: @montreexyz
- Facebook: facebook.com/montreexyz
- Posted to 17 Montessori Facebook groups (~815K combined reach)

**Product URL:** montree.xyz

---

`;

  // Add each knowledge file
  for (const file of knowledge) {
    context += `## ${file.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}\n\n`;
    context += file.content;
    context += '\n\n---\n\n';
  }

  return context;
}

/**
 * Check if a knowledge file exists
 */
export async function hasKnowledge(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(KNOWLEDGE_DIR, `${filename}.md`);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
