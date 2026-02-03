// /api/montree/curriculum/generate-description/route.ts
// POST - Generate parent-friendly descriptions for custom Montessori works

import { NextRequest, NextResponse } from 'next/server';

interface RequestBody {
  work_name: string;
  area: string;
  classroom_id?: string;
}

interface DescriptionResponse {
  description: string;
  why_it_matters: string;
}

// Template-based description generators for each curriculum area
const descriptionTemplates = {
  practical_life: {
    descriptions: [
      `Your child is developing independence and fine motor skills through {work_name}. This activity builds confidence as they practice everyday tasks and learn to care for themselves and their environment. Through repetition and concentration, your child is strengthening both their hands and their sense of responsibility.`,
      `Your child is learning practical skills and self-reliance through {work_name}. As they work with real, purposeful materials, they develop coordination, focus, and a growing sense of competence. These foundational skills support all other learning.`,
      `Through {work_name}, your child is discovering their ability to contribute meaningfully to daily life. This activity builds hand-eye coordination, patience, and the joy that comes from completing real, purposeful work that matters in our home and classroom.`,
    ],
    why_it_matters: [
      `Independence and self-care are essential foundations for lifelong learning. By mastering practical skills, your child gains confidence and autonomy that supports their development across all areas.`,
      `Practical life activities develop the fine motor control and concentration needed for writing, math, and other academic skills. More importantly, they build self-esteem and a sense of contribution to the family and community.`,
      `These activities teach your child that their work has value and purpose. The confidence and independence gained here translates to every other area of life and learning.`,
    ],
  },
  sensorial: {
    descriptions: [
      `Your child is refining their senses and building concentration through {work_name}. By exploring materials through touch, sight, and sometimes sound or smell, they're developing sensory awareness and learning to notice fine details. This sensory foundation is essential for all future learning.`,
      `Through {work_name}, your child is becoming a careful observer of the world around them. They're learning to distinguish subtle differences, organize their thinking, and develop patience through hands-on exploration. This work sharpens their mind and builds focus.`,
      `Your child is engaging their natural curiosity through {work_name}, discovering how to look closely, compare, and understand patterns. These sensorial explorations are foundational to mathematical and scientific thinking.`,
    ],
    why_it_matters: [
      `Refined sensory perception is the foundation for all learning. Through sensorial work, your child develops the concentration and attention to detail that will later support reading, writing, and mathematics.`,
      `Children learn about the world first through their senses. By providing carefully designed materials that isolate sensory qualities, we help them move from random exploration to deliberate, focused investigation.`,
      `Sensorial activities build the cognitive bridges between concrete experiences and abstract concepts. The patterns and relationships they discover here will later support mathematical and logical thinking.`,
    ],
  },
  mathematics: {
    descriptions: [
      `Your child is developing mathematical thinking through {work_name}. By working with concrete materials and discovering numerical relationships, they're building a deep understanding that goes far beyond memorization. Math becomes something they discover and understand, not just something they learn.`,
      `Through {work_name}, your child is learning that math is logical, orderly, and makes sense. They're building number sense, understanding quantity, and discovering mathematical relationships through hands-on exploration. This concrete foundation supports all future mathematical learning.`,
      `Your child is experiencing the joy of mathematical discovery through {work_name}. By working with materials that show mathematical concepts visually and tactilely, they're building both understanding and confidence with numbers and their relationships.`,
    ],
    why_it_matters: [
      `Mathematics is a language for understanding the world. By discovering mathematical relationships through concrete materials first, your child builds true understanding and genuine enthusiasm for math, rather than just memorizing facts.`,
      `The concrete materials in Montessori math work show children how mathematical concepts actually function. This visual and tactile understanding creates the strong foundation needed for abstract mathematical thinking in later years.`,
      `When children discover math themselves rather than being told rules, they develop mathematical reasoning that will serve them forever. They learn to think mathematically, not just compute mathematically.`,
    ],
  },
  language: {
    descriptions: [
      `Your child is building literacy foundations through {work_name}. Whether exploring sounds, learning letters, or discovering how words work, they're developing the skills and confidence needed for reading and writing. Each activity is carefully designed to make language clear, logical, and engaging.`,
      `Through {work_name}, your child is discovering the patterns and rules of language. They're learning that writing and reading are systematic, and that they have the power to express their thoughts and understand the thoughts of others through the written word.`,
      `Your child is experiencing language as a tool for connection and expression through {work_name}. From sound exploration to early writing, each activity builds the skills and confidence that lead naturally to fluent reading and confident self-expression.`,
    ],
    why_it_matters: [
      `Language is the foundation for all academic learning and human connection. By learning language in a logical, concrete sequence, your child develops the reading and writing skills that will support learning in every other area.`,
      `In Montessori, we follow the child's natural progression from sounds to letters to words to reading. This method respects how children actually learn and builds lasting literacy skills with genuine understanding and enthusiasm.`,
      `When children learn to read and write as meaningful tools for expression and connection, they develop a lifelong love of language and communication. The foundation built here supports not just academics, but the joy of learning itself.`,
    ],
  },
  cultural: {
    descriptions: [
      `Your child is exploring the world through {work_name}. Whether discovering geography, history, science, or cultural diversity, they're developing an understanding of how our world works and the interconnectedness of all people and places. This work sparks curiosity and builds global awareness.`,
      `Through {work_name}, your child is learning about the natural world and the diversity of human cultures. These activities satisfy children's innate curiosity about how things work and who we are as part of the larger world community.`,
      `Your child is becoming a curious explorer of our world through {work_name}. From nature study to geography to cultural exploration, they're building knowledge and developing respect for the natural world and all people in it.`,
    ],
    why_it_matters: [
      `Cultural studies awaken children's natural curiosity about the world and our place in it. Through these explorations, they develop respect for all people and cultures, and understand their connection to the larger human and natural world.`,
      `Science and cultural awareness cannot wait until "academic subjects" begin. Young children are naturally curious about how things work and fascinated by the world around them. We honor this curiosity by providing rich, engaging explorations early on.`,
      `Understanding the world builds confidence and connection. As children learn about different cultures, geographical features, and scientific phenomena, they develop both knowledge and empathy for all people and respect for our planet.`,
    ],
  },
};

// Helper function to normalize area names
function normalizeArea(area: string): keyof typeof descriptionTemplates {
  const normalized = area.toLowerCase().trim().replace(/\s+/g, '_').replace('-', '_');
  
  const areaMap: Record<string, keyof typeof descriptionTemplates> = {
    'practical_life': 'practical_life',
    'practicallife': 'practical_life',
    'practical': 'practical_life',
    'sensorial': 'sensorial',
    'sensory': 'sensorial',
    'mathematics': 'mathematics',
    'math': 'mathematics',
    'language': 'language',
    'literacy': 'language',
    'cultural': 'cultural',
    'culture': 'cultural',
    'studies': 'cultural',
    'cultural_studies': 'cultural',
  };
  
  return areaMap[normalized] || 'practical_life';
}

// Helper function to select random template and substitute work name
function generateFromTemplate(
  templates: string[],
  workName: string
): string {
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  return randomTemplate.replace(/{work_name}/g, workName);
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { work_name, area, classroom_id } = body;

    // Validate required fields
    if (!work_name || !area) {
      return NextResponse.json(
        { error: 'Missing required fields: work_name and area are required' },
        { status: 400 }
      );
    }

    // Normalize the area
    const normalizedArea = normalizeArea(area);
    const templates = descriptionTemplates[normalizedArea];

    if (!templates) {
      return NextResponse.json(
        { error: `Invalid area: ${area}. Must be one of: practical_life, sensorial, mathematics, language, cultural` },
        { status: 400 }
      );
    }

    // Generate description and why_it_matters by randomly selecting from templates
    const description = generateFromTemplate(templates.descriptions, work_name);
    const why_it_matters = generateFromTemplate(templates.why_it_matters, work_name);

    const response: DescriptionResponse = {
      description,
      why_it_matters,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Generate description error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
