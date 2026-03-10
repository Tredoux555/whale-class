// app/api/montree/voice-notes/route.ts
// POST: Create a voice note with AI extraction + auto-apply to progress
// GET: Fetch voice notes for a child this week

import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getSupabase } from '@/lib/supabase-client';
import { extractFromVoiceNote, getWeekStart, type VoiceNoteExtraction } from '@/lib/montree/voice-notes/extraction';

export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { child_id, transcript, audio_duration, language } = body;

    // Validate required fields
    if (!child_id || typeof child_id !== 'string') {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 3) {
      return NextResponse.json({ error: 'transcript required (min 3 chars)' }, { status: 400 });
    }
    if (transcript.length > 10000) {
      return NextResponse.json({ error: 'transcript too long (max 10000 chars)' }, { status: 400 });
    }

    // Validate audio_duration bounds
    const validDuration = typeof audio_duration === 'number' && audio_duration >= 0 && audio_duration <= 3600
      ? Math.round(audio_duration)
      : 0;

    // Security: verify child belongs to school
    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const classroomId = access.classroomId || auth.classroomId;
    if (!classroomId) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 400 });
    }

    // Extract structured data via Haiku
    let extraction: VoiceNoteExtraction | null;
    try {
      extraction = await extractFromVoiceNote(
        transcript.trim(),
        classroomId,
        auth.schoolId,
        language || 'auto'
      );
    } catch (extractErr) {
      console.error('[voice-notes] Extraction error:', extractErr);
      return NextResponse.json(
        {
          error: 'AI extraction failed',
          code: 'EXTRACTION_FAILED',
          details: extractErr instanceof Error ? extractErr.message : 'Unknown error',
        },
        { status: 502 }
      );
    }

    const weekStart = getWeekStart();
    const supabase = getSupabase();
    const now = new Date().toISOString();

    // Save voice note record
    const noteRecord: Record<string, unknown> = {
      classroom_id: classroomId,
      child_id,
      teacher_id: auth.userId,
      school_id: auth.schoolId,
      voice_date: now.split('T')[0],
      voice_week_start: weekStart,
      audio_duration_seconds: validDuration,
      transcript: transcript.trim(),
      transcript_language: language || 'auto',
      child_name_spoken: extraction?.child_name_spoken || null,
      work_name: extraction?.work_name || null,
      work_key: extraction?.work_key || null,
      area: extraction?.area || null,
      work_match_confidence: extraction?.work_match_confidence || 0,
      proposed_status: extraction?.proposed_status || null,
      status_confidence: extraction?.status_confidence || 0,
      behavioral_notes: extraction?.behavioral_notes || null,
      next_steps: extraction?.next_steps || null,
      extraction_status: extraction ? 'success' : 'no_extraction',
      auto_applied: false,
    };

    let savedNote: any;
    try {
      const result = await supabase
        .from('montree_voice_notes')
        .insert(noteRecord)
        .select('id')
        .single();

      if (result.error) {
        console.error('[voice-notes] Save error:', result.error);
        // Check if table exists
        if (result.error.message?.includes('relation') || result.error.message?.includes('does not exist')) {
          return NextResponse.json(
            { error: 'Voice notes table not found', code: 'TABLE_NOT_FOUND' },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: 'Failed to save voice note', code: 'DB_ERROR' },
          { status: 500 }
        );
      }

      savedNote = result.data;
    } catch (dbErr) {
      console.error('[voice-notes] Database error:', dbErr);
      return NextResponse.json(
        { error: 'Database error', code: 'DB_ERROR' },
        { status: 500 }
      );
    }

    // Auto-apply to progress if high confidence
    let autoApplied = false;
    if (
      extraction &&
      extraction.child_id &&
      extraction.work_name &&
      extraction.proposed_status &&
      extraction.work_match_confidence >= 0.7 &&
      extraction.status_confidence >= 0.7 &&
      extraction.child_match_confidence >= 0.85
    ) {
      try {
        // Build notes string from behavioral_notes + next_steps
        const noteParts = [];
        if (extraction.behavioral_notes) noteParts.push(extraction.behavioral_notes);
        if (extraction.next_steps) noteParts.push(`Next: ${extraction.next_steps}`);
        const notesStr = noteParts.join(' | ') || null;

        // Upsert to progress (same pattern as progress/update route)
        const progressRecord: Record<string, unknown> = {
          child_id: extraction.child_id,
          work_name: extraction.work_name,
          area: extraction.area || null,
          status: extraction.proposed_status,
          notes: notesStr,
          updated_at: now,
        };

        // Protect mastered_at — only set on first mastery
        if (extraction.proposed_status === 'mastered') {
          const { data: existing } = await supabase
            .from('montree_child_progress')
            .select('mastered_at')
            .eq('child_id', extraction.child_id)
            .eq('work_name', extraction.work_name)
            .maybeSingle();

          if (!existing?.mastered_at) {
            progressRecord.mastered_at = now;
          }
        }

        const { error: progressError } = await supabase
          .from('montree_child_progress')
          .upsert(progressRecord, {
            onConflict: 'child_id,work_name',
            ignoreDuplicates: false,
          });

        if (!progressError) {
          autoApplied = true;
          // Update voice note record
          await supabase
            .from('montree_voice_notes')
            .update({ auto_applied: true })
            .eq('id', savedNote.id);
        }
      } catch (progressErr) {
        // Non-fatal — voice note is saved regardless
        console.error('[voice-notes] Auto-apply error (non-fatal):', progressErr);
      }
    }

    return NextResponse.json({
      success: true,
      note_id: savedNote.id,
      extraction: extraction
        ? {
            child_name: extraction.child_name_spoken,
            child_matched: !!extraction.child_id,
            child_match_confidence: extraction.child_match_confidence,
            work_name: extraction.work_name,
            work_key: extraction.work_key,
            area: extraction.area,
            work_match_confidence: extraction.work_match_confidence,
            proposed_status: extraction.proposed_status,
            status_confidence: extraction.status_confidence,
            behavioral_notes: extraction.behavioral_notes,
            next_steps: extraction.next_steps,
          }
        : null,
      auto_applied: autoApplied,
    });
  } catch (err) {
    console.error('[voice-notes] POST error:', err);
    return NextResponse.json({ error: 'Failed to process voice note' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const classroomId = searchParams.get('classroom_id') || auth.classroomId;
  const weekStart = searchParams.get('week_start') || getWeekStart();

  const supabase = getSupabase();

  // Build query
  let query = supabase
    .from('montree_voice_notes')
    .select('*')
    .eq('school_id', auth.schoolId)
    .eq('voice_week_start', weekStart)
    .order('created_at', { ascending: false })
    .limit(200);

  if (childId) {
    // Verify child access
    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    query = query.eq('child_id', childId);
  } else if (classroomId) {
    query = query.eq('classroom_id', classroomId);
  } else {
    return NextResponse.json({ error: 'child_id or classroom_id required' }, { status: 400 });
  }

  const { data, error } = await query;

  if (error) {
    console.error('[voice-notes] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch voice notes' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    notes: data || [],
    week_start: weekStart,
    count: data?.length || 0,
  });
}
