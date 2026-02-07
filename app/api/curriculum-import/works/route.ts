// /api/curriculum-import/works/route.ts
// Student works import with AI-assisted matching
// Session: Curriculum Import System

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { v4 as uuidv4 } from 'uuid';
import {
  matchStudentToFilename,
  matchWorkToCurriculum,
  determineMatchStatus,
  CurriculumItem,
  StudentInfo
} from '@/lib/curriculum/import-ai';

// ============================================
// GET: List work imports for classroom
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');
    const status = searchParams.get('status'); // unmatched, suggested, auto, confirmed, manual

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase
      .from('montree_work_imports')
      .select(`
        *,
        matched_child:montree_children(id, name, nickname),
        custom_curriculum:montree_custom_curriculum(id, name, area)
      `)
      .eq('classroom_id', classroomId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('match_status', status);
    }

    const { data: works, error } = await query;

    if (error) {
      console.error('Get works error:', error);
      return NextResponse.json({ error: 'Failed to get works' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      works: works.map(w => ({
        id: w.id,
        filename: w.original_filename,
        fileType: w.file_type,
        extractedStudentName: w.extracted_student_name,
        student: w.matched_child ? {
          id: w.matched_child.id,
          name: w.matched_child.nickname || w.matched_child.name
        } : null,
        curriculumItem: w.custom_curriculum ? {
          id: w.custom_curriculum.id,
          name: w.custom_curriculum.name,
          area: w.custom_curriculum.area
        } : (w.matched_work_key ? { id: w.matched_work_key, name: w.matched_work_key } : null),
        matchStatus: w.match_status,
        studentConfidence: w.student_confidence,
        curriculumConfidence: w.curriculum_confidence,
        aiReasoning: w.ai_reasoning,
        alternatives: w.alternative_matches
      }))
    });

  } catch (error) {
    console.error('Works GET error:', error);
    return NextResponse.json({ error: 'Failed to get works' }, { status: 500 });
  }
}

// ============================================
// POST: Upload and match works
// ============================================
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();

    const classroomId = formData.get('classroom_id') as string;
    const files = formData.getAll('files') as File[];

    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Check classroom is in works phase
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('onboarding_phase')
      .eq('id', classroomId)
      .single();

    if (!classroom || classroom.onboarding_phase !== 'works') {
      return NextResponse.json(
        { error: 'Classroom must be in works phase to upload' },
        { status: 400 }
      );
    }

    // Get students for matching
    const { data: students } = await supabase
      .from('montree_children')
      .select('id, name, nickname')
      .eq('classroom_id', classroomId);

    // Get aliases
    const childIds = students?.map(s => s.id) || [];
    const { data: aliases } = await supabase
      .from('montree_student_aliases')
      .select('child_id, alias')
      .in('child_id', childIds);

    // Build student info with aliases
    const studentsWithAliases: StudentInfo[] = (students || []).map(s => ({
      id: s.id,
      name: s.name,
      nickname: s.nickname,
      aliases: aliases?.filter(a => a.child_id === s.id).map(a => a.alias) || []
    }));

    // Get curriculum items for matching
    const { data: customCurriculum } = await supabase
      .from('montree_custom_curriculum')
      .select('id, name, area, category, keywords, description')
      .eq('classroom_id', classroomId);

    const curriculumItems: CurriculumItem[] = (customCurriculum || []).map(c => ({
      id: c.id,
      name: c.name,
      area: c.area,
      category: c.category,
      keywords: c.keywords,
      description: c.description
    }));

    // Get recent matched works for pattern detection
    const { data: recentWorks } = await supabase
      .from('montree_work_imports')
      .select('original_filename')
      .eq('classroom_id', classroomId)
      .not('matched_custom_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    const recentFilenames = recentWorks?.map(w => w.original_filename) || [];

    // Process each file
    const results = {
      uploaded: 0,
      autoMatched: 0,
      suggested: 0,
      unmatched: 0,
      errors: [] as string[]
    };

    for (const file of files) {
      try {
        const storedFilename = `${uuidv4()}.${file.name.split('.').pop()}`;
        const storagePath = `work-imports/${classroomId}/${storedFilename}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from('work-imports')
          .upload(storagePath, arrayBuffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          results.errors.push(`${file.name}: Upload failed`);
          continue;
        }

        // Extract content preview (for text-based files)
        let contentPreview = '';
        if (file.type.includes('text') || file.name.endsWith('.txt')) {
          const text = await file.text();
          contentPreview = text.slice(0, 1000);
        }
        // Note: For PDF/DOCX, we'd need server-side processing
        // This could be enhanced with a separate processing endpoint

        // AI matching
        const studentResult = await matchStudentToFilename(
          file.name,
          studentsWithAliases,
          contentPreview
        );

        const curriculumResult = await matchWorkToCurriculum(
          file.name,
          contentPreview,
          file.name.split('.').pop() || '',
          curriculumItems,
          recentFilenames
        );

        // Determine match status
        const matchStatus = determineMatchStatus(
          studentResult.confidence,
          curriculumResult.confidence
        );

        // Find extracted name from filename
        const extractedName = extractNameFromFilename(file.name);

        // Create work import record
        const { error: insertError } = await supabase
          .from('montree_work_imports')
          .insert({
            classroom_id: classroomId,
            original_filename: file.name,
            stored_filename: storedFilename,
            storage_path: storagePath,
            file_type: file.name.split('.').pop(),
            file_size: file.size,
            content_preview: contentPreview || null,
            extracted_student_name: extractedName,
            matched_child_id: studentResult.matchedId,
            student_confidence: studentResult.confidence,
            matched_custom_id: curriculumResult.matchedId,
            curriculum_confidence: curriculumResult.confidence,
            match_status: matchStatus,
            ai_reasoning: `Student: ${studentResult.reasoning}. Curriculum: ${curriculumResult.reasoning}`,
            alternative_matches: {
              students: studentResult.alternatives,
              curriculum: curriculumResult.alternatives
            }
          });

        if (insertError) {
          results.errors.push(`${file.name}: Failed to save`);
          continue;
        }

        results.uploaded++;
        if (matchStatus === 'auto') results.autoMatched++;
        else if (matchStatus === 'suggested') results.suggested++;
        else results.unmatched++;

        // If we found a new name variant, save as alias
        if (extractedName && studentResult.matchedId && studentResult.confidence > 0.7) {
          const student = studentsWithAliases.find(s => s.id === studentResult.matchedId);
          if (student && extractedName.toLowerCase() !== student.name.toLowerCase()) {
            await supabase
              .from('montree_student_aliases')
              .upsert({
                child_id: studentResult.matchedId,
                alias: extractedName,
                source: 'import'
              }, { onConflict: 'child_id,alias' });
          }
        }

      } catch (fileError) {
        results.errors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Uploaded ${results.uploaded} files. Auto: ${results.autoMatched}, Review: ${results.suggested + results.unmatched}`
    });

  } catch (error) {
    console.error('Works POST error:', error);
    return NextResponse.json({ error: 'Failed to upload works' }, { status: 500 });
  }
}

// ============================================
// PATCH: Update work match (confirm/reject/manual)
// ============================================
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { workId, action, studentId, curriculumItemId } = body;

    if (!workId) {
      return NextResponse.json({ error: 'workId required' }, { status: 400 });
    }

    const { data: work, error: fetchError } = await supabase
      .from('montree_work_imports')
      .select('*')
      .eq('id', workId)
      .single();

    if (fetchError || !work) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    switch (action) {
      case 'confirm': {
        if (!work.matched_child_id || (!work.matched_custom_id && !work.matched_work_key)) {
          return NextResponse.json(
            { error: 'Cannot confirm - no match to confirm' },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from('montree_work_imports')
          .update({
            match_status: 'confirmed',
            matched_at: new Date().toISOString()
          })
          .eq('id', workId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Match confirmed' });
      }

      case 'reject': {
        const { error: updateError } = await supabase
          .from('montree_work_imports')
          .update({
            match_status: 'unmatched',
            matched_child_id: null,
            matched_custom_id: null,
            matched_work_key: null,
            student_confidence: null,
            curriculum_confidence: null
          })
          .eq('id', workId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Match rejected' });
      }

      case 'manual': {
        if (!studentId || !curriculumItemId) {
          return NextResponse.json(
            { error: 'studentId and curriculumItemId required for manual match' },
            { status: 400 }
          );
        }

        const { error: updateError } = await supabase
          .from('montree_work_imports')
          .update({
            matched_child_id: studentId,
            matched_custom_id: curriculumItemId,
            match_status: 'manual',
            matched_at: new Date().toISOString()
          })
          .eq('id', workId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: 'Manual match set' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Works PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update work' }, { status: 500 });
  }
}

// ============================================
// HELPERS
// ============================================

function extractNameFromFilename(filename: string): string | null {
  // Remove extension
  const namePart = filename.replace(/\.[^/.]+$/, '');

  // Common separators
  const parts = namePart.split(/[_\-.\s]+/);

  // Filter out common non-name words
  const commonWords = new Set([
    'essay', 'assignment', 'homework', 'project', 'final',
    'draft', 'v1', 'v2', 'revised', 'math', 'english',
    'science', 'history', 'report', 'paper', 'work'
  ]);

  const nameParts = parts.filter(part => {
    const lower = part.toLowerCase();
    return !commonWords.has(lower) && !/^\d+$/.test(part) && part.length > 1;
  });

  if (nameParts.length >= 1) {
    return nameParts.slice(0, 2).join(' ');
  }

  return null;
}
