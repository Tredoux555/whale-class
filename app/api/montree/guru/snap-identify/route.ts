// app/api/montree/guru/snap-identify/route.ts
// "Snap & Identify v1" — One photo replaces the teacher's entire observation-analysis-planning workflow.
// Teacher snaps a photo → Sonnet identifies the work, writes AMI observation notes,
// analyzes strengths/weaknesses, compares history, recommends next steps, generates weekly admin narrative.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
import { loadAllCurriculumWorks, type CurriculumWork } from '@/lib/montree/curriculum-loader';
import { getActiveSensitivePeriods } from '@/lib/montree/guru/knowledge/sensitive-periods';
import { checkRateLimit } from '@/lib/rate-limiter';

// ──────────────────────────────────────────────
// Module-level caches (loaded once, never changes)
// ──────────────────────────────────────────────

let WORK_CATALOG: CurriculumWork[] = [];
let COMPACT_CATALOG = '';
let WORK_BY_NAME: Map<string, CurriculumWork> = new Map();

try {
  WORK_CATALOG = loadAllCurriculumWorks();
  // Build compact catalog: "PL: Pouring, Spooning, ... | S: Pink Tower, ..."
  const byArea: Record<string, string[]> = {};
  for (const w of WORK_CATALOG) {
    if (!byArea[w.area_key]) byArea[w.area_key] = [];
    byArea[w.area_key].push(w.name);
  }
  const AREA_ABBREV: Record<string, string> = {
    practical_life: 'PL', sensorial: 'S', mathematics: 'M', language: 'L', cultural: 'C',
  };
  COMPACT_CATALOG = Object.entries(byArea)
    .map(([area, names]) => `${AREA_ABBREV[area] || area}: ${names.join(', ')}`)
    .join('\n');

  // Name lookup
  for (const w of WORK_CATALOG) {
    WORK_BY_NAME.set(w.name.toLowerCase().trim(), w);
  }
} catch {
  console.warn('[Snap Identify] Could not load curriculum');
}

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const VALID_STATUSES = ['presented', 'practicing', 'mastered'];

// Cross-area dependency map (hardcoded Montessori pedagogy)
const AREA_DEPENDENCIES: Record<string, { area: string; reason: string }[]> = {
  mathematics: [
    { area: 'sensorial', reason: 'grading and ordering (Pink Tower, Brown Stair)' },
    { area: 'practical_life', reason: 'sequencing and concentration' },
  ],
  language: [
    { area: 'sensorial', reason: 'auditory discrimination and visual discrimination' },
    { area: 'practical_life', reason: 'fine motor control (pencil readiness)' },
  ],
  cultural: [
    { area: 'language', reason: 'vocabulary and reading readiness' },
    { area: 'sensorial', reason: 'observation and classification skills' },
  ],
  sensorial: [
    { area: 'practical_life', reason: 'hand-eye coordination and order' },
  ],
  practical_life: [],
};

// ──────────────────────────────────────────────
// Helper: compute per-area progress analysis
// ──────────────────────────────────────────────
interface AreaStats {
  mastered: number;
  practicing: number;
  presented: number;
  total_in_curriculum: number;
  last_mastery_date: string | null;
  last_presentation_date: string | null;
  mastered_works: string[];
}

function computeAreaAnalysis(
  progress: Array<{ work_name: string; area: string; status: string; presented_at?: string; mastered_at?: string; updated_at?: string }>,
): Record<string, AreaStats> {
  // Count total works per area in curriculum
  const areaWorkCounts: Record<string, number> = {};
  for (const w of WORK_CATALOG) {
    areaWorkCounts[w.area_key] = (areaWorkCounts[w.area_key] || 0) + 1;
  }

  const stats: Record<string, AreaStats> = {};
  for (const area of VALID_AREAS) {
    stats[area] = {
      mastered: 0,
      practicing: 0,
      presented: 0,
      total_in_curriculum: areaWorkCounts[area] || 0,
      last_mastery_date: null,
      last_presentation_date: null,
      mastered_works: [],
    };
  }

  for (const p of progress) {
    const area = VALID_AREAS.includes(p.area) ? p.area : null;
    if (!area || !stats[area]) continue;

    if (p.status === 'mastered') {
      stats[area].mastered++;
      stats[area].mastered_works.push(p.work_name);
      if (p.mastered_at && (!stats[area].last_mastery_date || p.mastered_at > stats[area].last_mastery_date!)) {
        stats[area].last_mastery_date = p.mastered_at;
      }
    } else if (p.status === 'practicing') {
      stats[area].practicing++;
    } else if (p.status === 'presented') {
      stats[area].presented++;
      if (p.presented_at && (!stats[area].last_presentation_date || p.presented_at > stats[area].last_presentation_date!)) {
        stats[area].last_presentation_date = p.presented_at;
      }
    }
  }

  return stats;
}

function formatAreaAnalysisForPrompt(stats: Record<string, AreaStats>): string {
  const lines: string[] = ['CHILD PROGRESS BY AREA:'];
  const rankings: { area: string; mastered: number; pct: number }[] = [];

  for (const [area, s] of Object.entries(stats)) {
    const label = AREA_LABELS[area] || area;
    const pct = s.total_in_curriculum > 0 ? Math.round((s.mastered / s.total_in_curriculum) * 100) : 0;
    lines.push(`${label}: ${s.mastered} mastered, ${s.practicing} practicing, ${s.presented} presented (${pct}% of ${s.total_in_curriculum} works)`);
    if (s.last_mastery_date) {
      lines.push(`  Last mastery: ${new Date(s.last_mastery_date).toLocaleDateString()}`);
    }
    rankings.push({ area: label, mastered: s.mastered, pct });
  }

  rankings.sort((a, b) => b.pct - a.pct);
  lines.push(`\nSTRENGTH RANKING: ${rankings.map((r, i) => `${i + 1}. ${r.area} (${r.pct}%)`).join(', ')}`);

  return lines.join('\n');
}

// ──────────────────────────────────────────────
// Helper: get curriculum metadata for likely works
// ──────────────────────────────────────────────
function getCurriculumMetadataForPrompt(
  focusWorkNames: string[],
  weakestArea: string,
): string {
  const lines: string[] = ['CURRICULUM DETAILS FOR LIKELY WORKS:'];
  const added = new Set<string>();

  // Add focus work metadata
  for (const name of focusWorkNames) {
    const work = WORK_BY_NAME.get(name.toLowerCase().trim());
    if (work && !added.has(work.name)) {
      added.add(work.name);
      lines.push(formatWorkMetadata(work));
    }
  }

  // Add top 5 works from weakest area
  const weakWorks = WORK_CATALOG.filter(w => w.area_key === weakestArea).slice(0, 5);
  for (const work of weakWorks) {
    if (!added.has(work.name)) {
      added.add(work.name);
      lines.push(formatWorkMetadata(work));
    }
  }

  return lines.join('\n');
}

function formatWorkMetadata(work: CurriculumWork): string {
  const parts = [`\n[${work.name}] (${AREA_LABELS[work.area_key] || work.area_key})`];
  if (work.control_of_error) parts.push(`  Control of error: ${work.control_of_error}`);
  if (work.prerequisites && work.prerequisites.length > 0) parts.push(`  Prerequisites: ${work.prerequisites.join(', ')}`);
  if (work.variations && work.variations.length > 0) parts.push(`  Variations: ${work.variations.slice(0, 3).join('; ')}`);
  if (work.extensions && work.extensions.length > 0) parts.push(`  Extensions: ${work.extensions.slice(0, 3).join('; ')}`);
  if (work.points_of_interest && work.points_of_interest.length > 0) parts.push(`  Points of interest: ${work.points_of_interest.slice(0, 3).join('; ')}`);
  return parts.join('\n');
}

// ──────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (!AI_ENABLED || !anthropic) {
      return NextResponse.json({ success: false, error: 'AI features not enabled' }, { status: 503 });
    }

    // Rate limit: 20 snaps per 15 minutes per teacher
    const rateLimitKey = `snap_identify:${auth.userId || 'anon'}`;
    const rateOk = await checkRateLimit(rateLimitKey, 20, 15);
    if (!rateOk) {
      return NextResponse.json({ success: false, error: 'Too many snap requests. Please wait a few minutes.' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const childId = formData.get('child_id') as string | null;

    if (!file || !childId) {
      return NextResponse.json({ success: false, error: 'file and child_id are required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'Only image files are accepted' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 10MB)' }, { status: 400 });
    }

    if (!auth.schoolId) {
      return NextResponse.json({ success: false, error: 'Missing school context' }, { status: 401 });
    }

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const supabase = getSupabase();
    const now = new Date();

    // ── Step 1: Upload photo to storage ──
    const timestamp = Date.now();
    const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(rawExt) ? rawExt : 'jpg';
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const storagePath = `${auth.schoolId}/${childId}/photos/${year}/${month}/${filename}`;

    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Snap v1] Storage upload error:', uploadError.message);
      return NextResponse.json({ success: false, error: 'Photo upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('montree-media').getPublicUrl(storagePath);
    const photoUrl = urlData.publicUrl;

    // Save to montree_media
    const { data: mediaRecord, error: mediaDbError } = await supabase
      .from('montree_media')
      .insert({
        school_id: auth.schoolId,
        child_id: childId,
        media_type: 'photo',
        storage_path: storagePath,
        file_size_bytes: file.size,
        captured_at: now.toISOString(),
        caption: null,
        tags: ['snap-identify', 'guru-identified'],
        sync_status: 'synced',
        processing_status: 'complete',
      })
      .select('id')
      .single();

    if (mediaDbError) {
      console.error('[Snap v1] Media DB error:', mediaDbError.message);
      await supabase.storage.from('montree-media').remove([storagePath]);
      return NextResponse.json({ success: false, error: 'Failed to save photo record' }, { status: 500 });
    }

    // ── Step 2: Gather deep child context (5 parallel queries + 1 sequential) ──
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [childResult, progressResult, focusResult, observationsResult, snapHistoryResult] = await Promise.all([
      supabase.from('montree_children').select('name, age, date_of_birth, classroom_id').eq('id', childId).maybeSingle(),
      supabase.from('montree_child_progress').select('work_name, area, status, presented_at, mastered_at, updated_at, notes').eq('child_id', childId),
      supabase.from('montree_child_focus_works').select('area, work_name').eq('child_id', childId),
      supabase.from('montree_behavioral_observations').select('behavior_description, observed_at').eq('child_id', childId).gte('observed_at', thirtyDaysAgo.toISOString()).order('observed_at', { ascending: false }).limit(10),
      supabase.from('montree_guru_interactions').select('context_snapshot, asked_at').eq('child_id', childId).eq('question_type', 'snap_identify').order('asked_at', { ascending: false }).limit(5),
    ]);

    const child = childResult.data;
    const childName = child?.name?.split(' ')[0] || 'This child';
    const classroomId = child?.classroom_id || null;

    // Get school locale (use auth.schoolId directly — no need to look up via classroom)
    let locale = 'en';
    try {
      if (auth.schoolId) {
        const { data: school } = await supabase
          .from('montree_schools')
          .select('settings')
          .eq('id', auth.schoolId)
          .maybeSingle();
        const schoolSettings = (school?.settings as Record<string, unknown>) || {};
        if (schoolSettings.locale === 'zh') locale = 'zh';
      }
    } catch (err) { console.error('[snap-identify] School locale fetch error:', err); }

    // Compute age
    let ageStr = child?.age ? `${child.age} years` : 'unknown age';
    let ageMonths = (child?.age || 4) * 12 + 6;
    if (child?.date_of_birth) {
      try {
        const dob = new Date(child.date_of_birth);
        ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
        ageStr = `${Math.floor(ageMonths / 12)} years ${ageMonths % 12} months`;
      } catch (err) { console.error('[snap-identify] DOB parse error:', err); }
    }

    // ── Step 3: Build analysis context (server-side pre-computation) ──
    const progress = progressResult.data || [];
    const focusWorks = (focusResult.data || []).map(f => f.work_name);
    const observations = observationsResult.data || [];
    const snapHistory = snapHistoryResult.data || [];

    // Per-area analysis
    const areaStats = computeAreaAnalysis(progress);
    const areaAnalysisStr = formatAreaAnalysisForPrompt(areaStats);

    // Find weakest area (lowest mastery %)
    let weakestArea = 'practical_life';
    let lowestPct = 100;
    for (const [area, s] of Object.entries(areaStats)) {
      const pct = s.total_in_curriculum > 0 ? s.mastered / s.total_in_curriculum : 0;
      if (pct < lowestPct) { lowestPct = pct; weakestArea = area; }
    }

    // Curriculum metadata for likely works
    const curriculumMetadata = getCurriculumMetadataForPrompt(focusWorks, weakestArea);

    // Sensitive periods
    const activePeriods = getActiveSensitivePeriods(ageMonths);
    const sensitivePeriodsStr = activePeriods.length > 0
      ? `ACTIVE SENSITIVE PERIODS (${ageStr}):\n${activePeriods.map(p => `- ${p.period.name} (${p.status}): ${p.period.behaviors[0]}`).join('\n')}`
      : `SENSITIVE PERIODS: No data (age: ${ageStr})`;

    // Recent observations summary
    const recentObsStr = observations.length > 0
      ? `RECENT OBSERVATIONS (last 30 days):\n${observations.slice(0, 5).map(o => `- [${new Date(o.observed_at).toLocaleDateString()}] ${(o.behavior_description || '').slice(0, 100)}`).join('\n')}`
      : 'RECENT OBSERVATIONS: None in last 30 days';

    // Check how long this child has been observed on current work (from snap history)
    const previousSnaps = snapHistory.map(s => {
      const ctx = s.context_snapshot as Record<string, unknown> | null;
      return ctx ? { work: ctx.identified_work as string, date: s.asked_at } : null;
    }).filter(Boolean);

    // Cross-area dependencies for the child's current areas
    const crossAreaStr = Object.entries(AREA_DEPENDENCIES)
      .filter(([area]) => {
        const s = areaStats[area];
        return s && (s.practicing > 0 || s.presented > 0);
      })
      .map(([area, deps]) => {
        if (deps.length === 0) return null;
        return `${AREA_LABELS[area]} depends on: ${deps.map(d => `${AREA_LABELS[d.area]} (${d.reason})`).join(', ')}`;
      })
      .filter(Boolean)
      .join('\n');

    // ── Step 4: Sonnet Vision Call ──
    const systemPrompt = `You are an expert AMI Montessori guide performing a COMPLETE observation analysis from a single photo.

YOUR ROLE: Do everything a trained Montessori teacher would do after observing a child working — identify the work, write professional observation notes, analyze the child's development, and plan next steps.

CURRICULUM CATALOG (match the EXACT name):
${COMPACT_CATALOG}

${curriculumMetadata}

CHILD: ${childName}, ${ageStr}
Current focus shelf: ${focusWorks.length > 0 ? focusWorks.join(', ') : 'empty'}

${areaAnalysisStr}

${sensitivePeriodsStr}

${recentObsStr}

${crossAreaStr ? `CROSS-AREA DEPENDENCIES:\n${crossAreaStr}` : ''}

${previousSnaps.length > 0 ? `PREVIOUS SNAPS: ${previousSnaps.map(s => `${s!.work} (${new Date(s!.date).toLocaleDateString()})`).join(', ')}` : ''}

AMI OBSERVATION GUIDELINES:
- NORMALIZATION: Is the child normalized (calm, concentrated, purposeful) or showing deviation (scattered, dependent, aggressive)?
- WORK CYCLE: Which phase? preparation / active_work / repetition / restoration / unclear
- Note grip, posture, hand position, body orientation
- Note emotional quality — calm focus, engaged joy, frustration, uncertainty
- Note if child is engaging with the work's CONTROL OF ERROR (self-correction mechanism)
- Note independence level and any repetition visible

RULES:
- Use an EXACT work name from the catalog. Do not invent names.
- If identification is uncertain, use closest match and set confidence to "low".
- Base status on observation: "mastered" only if child shows fluent, confident, accurate performance.
- The weekly narrative should be 3-4 sentences, formal but warm, suitable for a government school report.${locale === 'zh' ? '\n- Also provide weekly_narrative_zh in Chinese.' : ''}`;

    const toolSchema = {
      name: 'snap_identify_analysis',
      description: 'Complete AMI Montessori observation analysis from a photo',
      input_schema: {
        type: 'object' as const,
        properties: {
          work_name: { type: 'string', description: 'EXACT work name from the curriculum catalog' },
          area: { type: 'string', enum: VALID_AREAS, description: 'Montessori area' },
          status: { type: 'string', enum: VALID_STATUSES, description: 'Observed progression status' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Identification confidence' },

          observation: {
            type: 'object',
            properties: {
              normalization: { type: 'string', enum: ['normalized', 'normalizing', 'deviated'], description: 'Normalization state — THE key Montessori indicator' },
              work_cycle_phase: { type: 'string', enum: ['preparation', 'active_work', 'repetition', 'restoration', 'unclear'], description: 'Work cycle phase visible in photo' },
              technique_notes: { type: 'string', description: 'Grip, posture, hand position, method observed' },
              concentration_level: { type: 'string', enum: ['deep', 'moderate', 'surface', 'distracted'] },
              independence_level: { type: 'string', enum: ['independent', 'minimal_help', 'guided', 'dependent'] },
              emotional_state: { type: 'string', enum: ['calm_focus', 'engaged', 'frustrated', 'joyful', 'uncertain'] },
              repetition_noted: { type: 'boolean', description: 'Is repetition visible?' },
              self_correcting: { type: 'boolean', description: 'Engaging with control of error?' },
              control_of_error_notes: { type: 'string', description: 'What self-correction was observed, or "not visible from photo"' },
              detailed_notes: { type: 'string', description: 'Full AMI-style observation paragraph (3-5 sentences)' },
            },
            required: ['normalization', 'work_cycle_phase', 'technique_notes', 'concentration_level', 'independence_level', 'emotional_state', 'repetition_noted', 'self_correcting', 'control_of_error_notes', 'detailed_notes'],
          },

          sensitive_period_alignment: { type: 'string', description: 'How this work aligns with active sensitive periods, or "No specific alignment"' },

          analysis: {
            type: 'object',
            properties: {
              time_on_work: { type: 'string', description: '"2 weeks since presented" or "first observation"' },
              area_progress_summary: { type: 'string', description: 'Summary of progress in this specific area' },
              relative_strength: { type: 'string', description: 'Which areas are strongest/weakest relative to each other' },
              trajectory: { type: 'string', enum: ['accelerating', 'steady', 'plateau', 'first_observation'], description: 'Child development trajectory' },
              prerequisite_status: { type: 'string', description: '"All prerequisites mastered" or list missing prerequisites' },
              comparison_to_past: { type: 'string', description: 'How this observation compares to recent ones' },
            },
            required: ['time_on_work', 'area_progress_summary', 'relative_strength', 'trajectory', 'prerequisite_status', 'comparison_to_past'],
          },

          cross_area: {
            type: 'object',
            properties: {
              supporting_areas: { type: 'array', items: { type: 'string' }, description: 'Areas that support this work' },
              foundation_gaps: { type: 'array', items: { type: 'string' }, description: 'Foundation gaps found, e.g., "Sensorial grading not mastered — consider Brown Stair"' },
              recommended_support_works: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    work_name: { type: 'string' },
                    area: { type: 'string' },
                    reason: { type: 'string' },
                  },
                  required: ['work_name', 'area', 'reason'],
                },
                description: 'Specific works to strengthen supporting areas',
              },
            },
            required: ['supporting_areas', 'foundation_gaps', 'recommended_support_works'],
          },

          next_steps: {
            type: 'object',
            properties: {
              stay_or_advance: { type: 'string', enum: ['stay', 'advance', 'revisit_prerequisites', 'try_variation'], description: 'Primary recommendation' },
              reason: { type: 'string', description: 'Why this recommendation' },
              next_work_in_area: { type: 'string', description: 'Specific next work in curriculum sequence' },
              suggested_variations: { type: 'array', items: { type: 'string' }, description: 'Variations/extensions if near mastery' },
              priority_actions: { type: 'array', items: { type: 'string' }, description: 'Top 3 things teacher should do' },
            },
            required: ['stay_or_advance', 'reason', 'next_work_in_area', 'suggested_variations', 'priority_actions'],
          },

          weekly_narrative: { type: 'string', description: 'Copy-paste paragraph for weekly admin report (3-4 sentences, formal/warm)' },
          ...(locale === 'zh' ? { weekly_narrative_zh: { type: 'string', description: 'Chinese version of weekly narrative' } } : {}),
        },
        required: ['work_name', 'area', 'status', 'confidence', 'observation', 'sensitive_period_alignment', 'analysis', 'cross_area', 'next_steps', 'weekly_narrative'],
      },
    };

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 3500,
      system: systemPrompt,
      tools: [toolSchema],
      tool_choice: { type: 'tool', name: 'snap_identify_analysis' },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: photoUrl } },
          { type: 'text', text: `Perform a complete AMI observation analysis for ${childName}. Identify the work, write detailed notes, analyze their development, and recommend next steps.` },
        ],
      }],
    });

    // Extract tool use result
    const toolBlock = message.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return NextResponse.json({
        success: false,
        error: 'AI could not analyze this photo. Try capturing the materials more clearly.',
        photo_url: photoUrl,
        media_id: mediaRecord.id,
      }, { status: 422 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = toolBlock.input as any;

    // Validate area + status
    if (!VALID_AREAS.includes(result.area)) result.area = 'practical_life';
    if (!VALID_STATUSES.includes(result.status)) result.status = 'practicing';

    // ── Step 5: Write to DB ──

    // 5a. Progress upsert with mastery/presentation protection
    const progressRecord: Record<string, unknown> = {
      child_id: childId,
      work_name: result.work_name,
      area: result.area,
      status: result.status,
      notes: result.observation?.detailed_notes || '',
      updated_at: now.toISOString(),
    };

    // Protection: never overwrite existing mastered_at / presented_at timestamps
    if (result.status === 'mastered' || result.status === 'presented') {
      const { data: existing } = await supabase
        .from('montree_child_progress')
        .select('mastered_at, presented_at')
        .eq('child_id', childId)
        .eq('work_name', result.work_name)
        .maybeSingle();
      if (result.status === 'mastered' && !existing?.mastered_at) {
        progressRecord.mastered_at = now.toISOString();
      }
      if (result.status === 'presented' && !existing?.presented_at) {
        progressRecord.presented_at = now.toISOString();
      }
    }

    const { error: progressError } = await supabase
      .from('montree_child_progress')
      .upsert(progressRecord, { onConflict: 'child_id,work_name' });

    if (progressError) {
      console.error('[Snap v1] Progress update error:', progressError.message);
    }

    // 5b. Save detailed observation
    const obsDescription = [
      `[Snap Identify] ${result.work_name} (${AREA_LABELS[result.area] || result.area})`,
      result.observation?.detailed_notes || '',
      result.observation?.normalization ? `Normalization: ${result.observation.normalization}` : '',
      result.observation?.work_cycle_phase ? `Work cycle: ${result.observation.work_cycle_phase}` : '',
    ].filter(Boolean).join(' | ');

    const { error: obsError } = await supabase
      .from('montree_behavioral_observations')
      .insert({
        child_id: childId,
        classroom_id: classroomId,
        observed_by: auth.userId || null,
        behavior_description: obsDescription.slice(0, 2000),
        behavior_function: 'attention',
        activity_during: result.work_name,
      });

    if (obsError) {
      console.error('[Snap v1] Observation save error:', obsError.message);
    }

    // 5c. Update media caption
    await supabase
      .from('montree_media')
      .update({ caption: `${result.work_name} — ${(result.observation?.detailed_notes || '').slice(0, 200)}` })
      .eq('id', mediaRecord.id);

    // 5d. Log interaction with full context
    await supabase
      .from('montree_guru_interactions')
      .insert({
        child_id: childId,
        classroom_id: classroomId,
        question: `snap_identify:${mediaRecord.id}`,
        question_type: 'snap_identify',
        response_insight: result.next_steps?.reason || result.observation?.detailed_notes || '',
        model_used: AI_MODEL,
        context_snapshot: {
          child_name: childName,
          media_id: mediaRecord.id,
          photo_url: photoUrl,
          identified_work: result.work_name,
          area: result.area,
          status: result.status,
          confidence: result.confidence,
          normalization: result.observation?.normalization,
          trajectory: result.analysis?.trajectory,
          mastered_count: Object.values(areaStats).reduce((sum, s) => sum + s.mastered, 0),
        },
      }).catch((err) => { console.error('[snap-identify] Interaction save error:', err); });

    // 5e. Append weekly narrative to child settings
    if (result.weekly_narrative) {
      try {
        const { data: childData } = await supabase
          .from('montree_children')
          .select('settings')
          .eq('id', childId)
          .maybeSingle();
        const settings = (childData?.settings as Record<string, unknown>) || {};
        const narratives = Array.isArray(settings.guru_snap_narratives) ? settings.guru_snap_narratives : [];
        narratives.push({
          date: now.toISOString(),
          work: result.work_name,
          narrative_en: result.weekly_narrative,
          narrative_zh: result.weekly_narrative_zh || null,
        });
        // Keep last 20 narratives
        const trimmed = narratives.slice(-20);
        await supabase
          .from('montree_children')
          .update({ settings: { ...settings, guru_snap_narratives: trimmed } })
          .eq('id', childId);
      } catch (err) { console.error('[snap-identify] Narrative append error:', err); }
    }

    // ── Step 6: Return rich response ──
    return NextResponse.json({
      success: true,
      // Identification
      work_name: result.work_name,
      area: result.area,
      area_label: AREA_LABELS[result.area] || result.area,
      status: result.status,
      confidence: result.confidence,
      // Observation
      observation: result.observation || {},
      sensitive_period_alignment: result.sensitive_period_alignment || '',
      // Analysis
      analysis: result.analysis || {},
      area_stats: areaStats,
      // Cross-area
      cross_area: result.cross_area || {},
      // Next steps
      next_steps: result.next_steps || {},
      // Weekly admin
      weekly_narrative: result.weekly_narrative || '',
      weekly_narrative_zh: result.weekly_narrative_zh || null,
      // Media
      photo_url: photoUrl,
      media_id: mediaRecord.id,
      progress_updated: !progressError,
    });

  } catch (error) {
    console.error('[Snap v1] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process photo' }, { status: 500 });
  }
}
