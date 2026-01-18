// app/api/montree/classroom/bootstrap/preview/route.ts
// BULLETPROOF IMPORT PREVIEW
// AI extracts -> Deterministic matching -> Confidence scoring

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { CURRICULUM } from '@/lib/montree/curriculum-data';
import { matchWork, CONFIDENCE_THRESHOLDS } from '@/lib/montree/fuzzy-matcher';
import { createServerClient } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const REQUIRED_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

// AI EXTRACTION ONLY - no matching
function buildExtractionPrompt(): string {
  return `You are a document parser for a Montessori school. Extract ALL children and their work assignments.

For EACH child, extract the RAW TEXT of what the teacher wrote for each area:
1. Practical Life
2. Sensorial  
3. Mathematics
4. Language
5. Cultural/Science

DO NOT try to match or standardize - just extract EXACTLY what the document says.

Return ONLY valid JSON:
{
  "children": [
    {
      "name": "Amy",
      "name_chinese": "艾米",
      "age": 4,
      "works": [
        { "area": "practical_life", "raw_text": "Small dropper" },
        { "area": "sensorial", "raw_text": "Colour boxes 2LA" },
        { "area": "mathematics", "raw_text": "Bead stair 10-19" },
        { "area": "language", "raw_text": "Review Box 1" },
        { "area": "cultural", "raw_text": "RB 2" }
      ]
    }
  ]
}

RULES:
1. Extract EVERY child
2. Extract EXACT text - do not modify
3. Include all 5 areas (null if not found)
4. Return ONLY JSON`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { content, content_type, school_id } = await request.json();
    
    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 });
    }
    
    // STEP 1: AI EXTRACTION
    let messageContent: Anthropic.MessageParam['content'];
    
    if (content_type === 'image' || content.startsWith('data:image')) {
      const match = content.match(/^data:image\/([^;]+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
      }
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: `image/${match[1]}` as any, data: match[2] } },
        { type: 'text', text: buildExtractionPrompt() },
      ];
    } else {
      messageContent = [{ type: 'text', text: `${buildExtractionPrompt()}\n\n---\nDOCUMENT:\n---\n${content}` }];
    }
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: messageContent }],
    });
    
    const responseText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');
    
    let extracted: { children: any[] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*"children"[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ 
        error: 'Failed to parse AI extraction', 
        raw: responseText.slice(0, 500) 
      }, { status: 500 });
    }
    
    if (!extracted.children?.length) {
      return NextResponse.json({ error: 'No children found' }, { status: 400 });
    }
    
    // STEP 2: DETERMINISTIC MATCHING
    const validatedChildren = await Promise.all(
      extracted.children.map(async (child) => {
        const works: any[] = [];
        const warnings: string[] = [];
        const areasProcessed = new Set<string>();
        
        for (const work of (child.works || [])) {
          const area = work.area;
          const rawText = work.raw_text;
          areasProcessed.add(area);
          
          if (!rawText) {
            works.push({
              area,
              area_label: AREA_LABELS[area] || area,
              work_id: null,
              work_name: null,
              original_text: null,
              status: 'missing',
              confidence: 0,
              suggestions: [],
            });
            warnings.push(`${AREA_LABELS[area]}: No work in document`);
            continue;
          }
          
          // DETERMINISTIC FUZZY MATCHING
          const matchResult = await matchWork(rawText, area, school_id);
          
          works.push({
            area,
            area_label: AREA_LABELS[area] || area,
            work_id: matchResult.match?.work_id || null,
            work_name: matchResult.match?.work_name || null,
            work_chinese: matchResult.match?.work_chinese || null,
            original_text: rawText,
            status: matchResult.status,
            confidence: matchResult.confidence,
            match_source: matchResult.match?.match_source || null,
            suggestions: matchResult.suggestions.slice(0, 5),
          });
          
          if (matchResult.status !== 'auto') {
            if (matchResult.status === 'suggest') {
              warnings.push(`${AREA_LABELS[area]}: "${rawText}" (${matchResult.confidence}% match)`);
            } else {
              warnings.push(`${AREA_LABELS[area]}: "${rawText}" - manual selection required`);
            }
          }
        }
        
        // Check for missing areas
        for (const area of REQUIRED_AREAS) {
          if (!areasProcessed.has(area)) {
            works.push({
              area,
              area_label: AREA_LABELS[area] || area,
              work_id: null,
              work_name: null,
              original_text: null,
              status: 'missing',
              confidence: 0,
              suggestions: [],
            });
            warnings.push(`${AREA_LABELS[area]}: Not found in document`);
          }
        }
        
        works.sort((a, b) => REQUIRED_AREAS.indexOf(a.area) - REQUIRED_AREAS.indexOf(b.area));
        
        const autoMatched = works.filter(w => w.status === 'auto').length;
        const needsReview = works.filter(w => w.status === 'suggest').length;
        const manual = works.filter(w => w.status === 'manual').length;
        const missing = works.filter(w => w.status === 'missing').length;
        
        return {
          name: child.name?.trim() || 'Unknown',
          name_chinese: child.name_chinese?.trim() || null,
          age: child.age || null,
          works,
          warnings,
          auto_matched: autoMatched,
          needs_review: needsReview,
          manual_required: manual,
          missing: missing,
          total_areas: REQUIRED_AREAS.length,
          has_warnings: warnings.length > 0,
          is_complete: autoMatched === REQUIRED_AREAS.length,
          confidence_avg: works.length > 0 
            ? Math.round(works.reduce((sum, w) => sum + (w.confidence || 0), 0) / works.length)
            : 0,
        };
      })
    );
    
    // STEP 3: SUMMARY
    const totalChildren = validatedChildren.length;
    const totalWorks = totalChildren * REQUIRED_AREAS.length;
    const autoMatched = validatedChildren.reduce((sum, c) => sum + c.auto_matched, 0);
    const needsReview = validatedChildren.reduce((sum, c) => sum + c.needs_review, 0);
    const manualRequired = validatedChildren.reduce((sum, c) => sum + c.manual_required, 0);
    const missing = validatedChildren.reduce((sum, c) => sum + c.missing, 0);
    const totalWarnings = validatedChildren.reduce((sum, c) => sum + c.warnings.length, 0);
    
    // Create import log
    let importLogId: string | null = null;
    try {
      const supabase = await createServerClient();
      const { data: log } = await supabase
        .from('montree_import_logs')
        .insert({
          school_id: school_id || null,
          status: 'pending',
          total_children: totalChildren,
          total_works: totalWorks,
          works_auto_matched: autoMatched,
          works_suggested: needsReview,
          works_manual: manualRequired + missing,
          raw_extraction: extracted,
          validation_result: validatedChildren,
        })
        .select('id')
        .single();
      
      importLogId = log?.id || null;
    } catch (error) {
      console.warn('Failed to create import log:', error);
    }
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      import_log_id: importLogId,
      preview: {
        children: validatedChildren,
        summary: {
          total_children: totalChildren,
          total_works: totalWorks,
          auto_matched: autoMatched,
          needs_review: needsReview,
          manual_required: manualRequired,
          missing: missing,
          auto_rate: Math.round((autoMatched / totalWorks) * 100),
          total_warnings: totalWarnings,
          all_matched: totalWarnings === 0,
          ready_to_import: manualRequired === 0 && missing === 0,
          processing_time_ms: processingTime,
        },
        thresholds: CONFIDENCE_THRESHOLDS,
      },
    });
    
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview' },
      { status: 500 }
    );
  }
}
