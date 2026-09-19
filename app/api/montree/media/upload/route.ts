// /api/montree/media/upload/route.ts
// Upload photos to Supabase storage
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { validateJpegPhoto } from '@/lib/montree/media/jpeg-validation';
import { safeContentType, assertUploadSize } from '@/lib/montree/media/safe-upload';
import { enforcePhotoCap } from '@/lib/montree/plans/photo-cap';
import { transcodeVideoMedia } from '@/lib/montree/media/transcode';
import { triggerIdentification } from '@/lib/montree/media/identify-trigger';
import { isPhotoRecognitionEnabled } from '@/lib/montree/photo-identification/flag';
import { advanceProgressOnConfirm } from '@/lib/montree/progress/advance-on-confirm';

// 🚨 NODE RUNTIME REQUIRED: the video transcode kicked off below shells out to
// ffmpeg (child_process + fs), which the edge runtime does not have.
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const thumbnail = formData.get('thumbnail') as File | null;
    const metadataStr = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let metadata;
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch {
        return NextResponse.json({ error: 'Invalid metadata' }, { status: 400 });
      }
    } else {
      // Fallback: read flat form fields (e.g. Guru image upload sends child_id + type directly)
      metadata = {
        school_id: auth.schoolId,
        classroom_id: (formData.get('classroom_id') as string) || auth.classroomId || null,
        child_id: (formData.get('child_id') as string) || null,
        media_type: (formData.get('type') as string) || 'photo',
      };
    }

    const { school_id, classroom_id, child_id: rawChildId, child_ids: rawChildIds, work_id, event_id, caption, tags, width, height, media_type, duration } = metadata;

    // 🚨 TWO CLEAN PATHS — server-side invariant.
    // A photo is EITHER an event photo (event_id set, ZERO montree_media_children
    // rows, never seen by the AI/Wrap-Up pipeline) OR a child photo (child tags,
    // no event_id). Event wins when both arrive: the offline queue on a device
    // running an older build can still hold mixed entries, and refusing them
    // (400) would strand those photos forever. So we accept the upload and drop
    // the child links, loudly. `parent_visible` is untouched — it stays true, the
    // montage event picker depends on it.
    const hasEvent = !!event_id;
    const child_id = hasEvent ? null : rawChildId;
    const child_ids = hasEvent ? null : rawChildIds;
    if (hasEvent && (rawChildId || (Array.isArray(rawChildIds) && rawChildIds.length > 0))) {
      console.warn('[MediaUpload] event_id present — dropping child tags for event photo. event_id:', event_id);
    }

    // JPEG-only gate for PHOTOS into montree_media (Session 100).
    // PNG/HEIC/WebP/GIF/AVIF do not render reliably across our proxy + thumbnail
    // pipeline + parent surfaces, so reject them at the door rather than dump
    // dead bytes into the photo bank. Videos and audio are unaffected.
    //
    // 🚨 Videos/audio are NOT unvalidated: skipping the JPEG gate used to mean
    // `media_type: 'video'` let ANY bytes in under ANY declared Content-Type,
    // which the media proxy then served same-origin (stored XSS). They now go
    // through the storage allow-list instead.
    const effectiveMediaType = media_type || 'photo';
    const isVideoOrAudio = effectiveMediaType === 'video' || effectiveMediaType === 'audio';
    const storedContentType = safeContentType(file.type, file.name);
    if (!isVideoOrAudio) {
      const photoErr = validateJpegPhoto({ name: file.name, type: file.type });
      if (photoErr) {
        return NextResponse.json({ error: photoErr }, { status: 400 });
      }
    } else if (!storedContentType.startsWith(`${effectiveMediaType}/`)) {
      return NextResponse.json(
        { error: `Unsupported ${effectiveMediaType} format` },
        { status: 400 }
      );
    }

    const sizeErr = assertUploadSize(
      file,
      isVideoOrAudio ? (effectiveMediaType as 'video' | 'audio') : 'image'
    );
    if (sizeErr) {
      return NextResponse.json({ error: sizeErr }, { status: 400 });
    }

    // Use auth school_id as fallback (Guru uploads may not send school_id explicitly)
    const effectiveSchoolId = school_id || auth.schoolId;

    if (!effectiveSchoolId) {
      return NextResponse.json({ error: 'school_id required' }, { status: 400 });
    }

    // Verify school_id matches authenticated user's school (skip if using auth's own school_id)
    if (school_id && school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'school_id mismatch' }, { status: 403 });
    }

    // Verify child belongs to the authenticated user's school
    if (child_id) {
      const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
      if (!access.allowed) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // Verify all children in group photo belong to the authenticated user's school
    if (child_ids && Array.isArray(child_ids) && child_ids.length > 0) {
      for (const cid of child_ids) {
        const access = await verifyChildBelongsToSchool(cid, auth.schoolId);
        if (!access.allowed) {
          return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
        }
      }
    }

    // Phase 6: Input length limits
    if (caption && caption.length > 1000) {
      return NextResponse.json({ error: 'Caption too long' }, { status: 400 });
    }
    if (tags && Array.isArray(tags) && tags.some((t: string) => t.length > 500)) {
      return NextResponse.json({ error: 'Tag too long' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || (media_type === 'video' ? 'webm' : 'jpg');
    const filename = `${timestamp}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Generate storage path: {school_id}/{child_id}/{videos|photos}/{timestamp}.{ext}
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const mediaFolder = media_type === 'video' ? 'videos' : 'photos';
    const childFolder = child_id || 'group';
    const storagePath = `${effectiveSchoolId}/${childFolder}/${mediaFolder}/${year}/${month}/${filename}`;
    
    // Upload main file to Supabase storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, fileBuffer, {
        contentType: storedContentType,
        upsert: false
      });

    if (uploadError) {
      // StorageError carries name/message (and `status` on StorageApiError) —
      // there is no `.error` property, so log the whole object for the detail.
      console.error('Upload error:', uploadError.message, uploadError);
      return NextResponse.json({
        error: 'Upload failed'
      }, { status: 500 });
    }

    // Upload thumbnail if provided
    let thumbnailPath = null;
    if (thumbnail) {
      const thumbFilename = filename.replace(`.${ext}`, `-thumb.${ext}`);
      thumbnailPath = `${effectiveSchoolId}/${childFolder}/${year}/${month}/${thumbFilename}`;
      
      const thumbBuffer = await thumbnail.arrayBuffer();
      await supabase.storage
        .from('montree-media')
        .upload(thumbnailPath, thumbBuffer, {
          contentType: safeContentType(thumbnail.type, thumbnail.name),
          upsert: false
        });
    }

    // Create database record
    // Photos now go straight into the AI identification pipeline — no manual review gate
    const mediaRecord = {
      school_id: effectiveSchoolId,
      classroom_id: classroom_id || auth.classroomId || null,
      child_id: child_id || null,
      media_type: media_type || 'photo',
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      file_size_bytes: file.size,
      width: width || null,
      height: height || null,
      duration_seconds: media_type === 'video' ? (duration || null) : null,
      // 🚨 EVERY video is queued — the upload never decides playability itself
      // (fixed 2026-09-19). It used to shortcut on the file EXTENSION and stamp
      // an iPhone `.mov` as 'done'; those are HEVC and do not play in Chrome or
      // on Android. The decision is now an ffprobe of the actual bytes, made
      // once inside transcodeVideoMedia(), which passes a genuine H.264/AAC MP4
      // through untouched and re-encodes everything else. Until it finishes,
      // getVideoPlaybackUrl() falls back to storage_path, so nothing regresses
      // for a clip that was already fine.
      ...(media_type === 'video' ? { transcode_status: 'pending' } : {}),
      captured_at: metadata.captured_at || new Date().toISOString(),
      work_id: work_id || null,
      // 🚨 TAG-FIRST (2026-09-17, photo recognition retired).
      // The teacher answers "what work is this?" on the capture screen, so the
      // upload already knows the answer. A work_id means a HUMAN said so —
      // that is exactly what teacher_confirmed has always meant, and
      // identification_status 'confirmed' is the existing terminal value for
      // it (no new enum value, no migration: see migrations/210).
      // No work_id means "tag later" → 'skipped', the existing terminal value
      // that keeps the photo out of every AI queue and puts it in the
      // "Photos to tag" list. identification_attempted_at stays NULL: nothing
      // was ever attempted.
      ...(event_id
        ? {}
        : work_id
          ? { teacher_confirmed: true, identification_status: 'confirmed', identification_attempted_at: null }
          : { teacher_confirmed: false, identification_status: 'skipped', identification_attempted_at: null }),
      event_id: event_id || null,
      caption: caption || null,
      tags: tags || [],
      sync_status: 'synced',
      processing_status: 'complete',
    };

    let { data: media, error: dbError } = await supabase
      .from('montree_media')
      .insert(mediaRecord)
      .select()
      .maybeSingle();

    // Deploy-before-migration safety: migrations/354 adds playback_path and
    // transcode_status. If it has not been run yet the insert fails with 42703
    // / PGRST204 and the teacher's upload is LOST. Drop the two new keys and
    // save the media anyway — the transcode backfill picks it up afterwards.
    if (dbError && (dbError.code === '42703' || dbError.code === 'PGRST204' ||
        /playback_path|transcode_status/.test(dbError.message || ''))) {
      console.warn('[media/upload] migration 354 not applied — inserting without playback columns');
      const legacyRecord = { ...mediaRecord } as Record<string, unknown>;
      delete legacyRecord.playback_path;
      delete legacyRecord.transcode_status;
      ({ data: media, error: dbError } = await supabase
        .from('montree_media')
        .insert(legacyRecord)
        .select()
        .maybeSingle());
    }

    if (dbError || !media) {
      console.error('DB error:', dbError?.message, dbError?.code);
      // Try to clean up uploaded file
      await supabase.storage.from('montree-media').remove([storagePath]);
      return NextResponse.json({
        error: 'Insert failed'
      }, { status: 500 });
    }

    // 🚨 BASIC PHOTO CAP (plan §5). Fire-and-forget, AFTER the row exists and
    // BEFORE either return path, so the group-link-failure branch is covered
    // too. Never blocks the upload; an uncapped plan returns without a query.
    enforcePhotoCap(supabase, auth.schoolId).catch((err) =>
      console.error('[MediaUpload] photo cap enforcement failed:', err)
    );

    // If group photo, link to multiple children via junction table
    // AND set child_id on the media record to the first child (ensures it shows in direct queries)
    if (child_ids && child_ids.length > 0) {
      const childLinks = child_ids.map((cid: string) => ({
        media_id: media.id,
        child_id: cid
      }));

      const { error: linkError } = await supabase.from('montree_media_children').insert(childLinks);

      if (linkError) {
        console.error('Group photo link error:', linkError.message, linkError.code);
        // Don't fail the whole upload — media is saved, just links failed
        // Return success but flag the issue
        // NOTE: this branch used to return `ai_deferred: aiDeferred` — an
        // identifier that exists nowhere in this file. It threw a ReferenceError
        // straight into the outer catch, so a group photo whose child links
        // failed answered 500 "Server error" even though the photo (and its
        // event_id) were already saved. Dropped the phantom field.
        return NextResponse.json({
          success: true,
          media,
          warning: 'Photo saved but group tagging partially failed'
        });
      }

      // Also set child_id on the media record to the first child
      // This ensures the photo appears in direct child_id queries (not just junction table)
      if (!child_id && child_ids.length > 0) {
        const { error: updateError } = await supabase
          .from('montree_media')
          .update({ child_id: child_ids[0] })
          .eq('id', media.id);

        if (updateError) {
          console.error('Group photo child_id update error:', updateError.message);
          // Non-fatal — photo is saved and junction links exist, just direct query fallback failed
        }
      }
    }

    // Auto-confirm today's focus list rows for any child tagged in this photo.
    // Fire-and-forget — never fail the upload response on this.
    try {
      const taggedChildIds: string[] = [];
      if (child_id) taggedChildIds.push(child_id);
      if (child_ids && Array.isArray(child_ids)) {
        for (const cid of child_ids) if (!taggedChildIds.includes(cid)) taggedChildIds.push(cid);
      }
      const effectiveClassroomId = classroom_id || auth.classroomId || null;
      if (taggedChildIds.length > 0 && effectiveClassroomId) {
        const focusDate = new Date().toISOString().slice(0, 10);
        const via = child_ids && child_ids.length > 1 ? 'group_photo' : 'photo';
        supabase
          .from('montree_daily_focus')
          .update({
            confirmed_at: new Date().toISOString(),
            confirmed_via: via,
            confirmed_media_id: media.id,
          })
          .eq('classroom_id', effectiveClassroomId)
          .eq('focus_date', focusDate)
          .in('child_id', taggedChildIds)
          .is('confirmed_at', null)
          .then(({ error: focusError }) => {
            if (focusError) {
              console.error('[DailyFocus] Auto-confirm error:', focusError.message);
            }
          });
      }
    } catch (focusErr) {
      console.error('[DailyFocus] Auto-confirm exception:', focusErr);
    }

    // ── TAG-FIRST → THE TRACKER (2026-09-17) ────────────────────────────────
    // The teacher picked the work at capture time, so the observation is a
    // CONFIRMED one the moment the photo lands. It goes through the ONE DOOR
    // (advanceProgressOnConfirm → writeProgress) exactly as the "This is…"
    // sheet's photo-audit/resolve does — same ladder, same journal, same
    // review-queue behaviour for a name that cannot be resolved. Nothing here
    // touches montree_child_progress directly.
    //
    // Group capture: one work applies to every child tagged in the shot. That
    // is the Montessori reality — a work is presented to a small group and the
    // photo is the evidence for all of them.
    //
    // Never fails the upload: a progress hiccup must not lose a photo.
    if (work_id && !event_id) {
      try {
        const taggedForProgress: string[] = [];
        if (child_id) taggedForProgress.push(child_id);
        if (child_ids && Array.isArray(child_ids)) {
          for (const cid of child_ids) if (!taggedForProgress.includes(cid)) taggedForProgress.push(cid);
        }
        if (taggedForProgress.length > 0) {
          // School-scope the work the client named: a work_id is client-supplied,
          // so prove it belongs to a classroom in the caller's school before any
          // progress is written against it.
          const { data: workRow } = await supabase
            .from('montree_classroom_curriculum_works')
            .select('id, name, work_key, classroom_id, area:montree_classroom_curriculum_areas!area_id ( area_key )')
            .eq('id', work_id)
            .maybeSingle();

          let ownedWork = null as null | { name: string; work_key: string | null; classroom_id: string; area_key: string | null };
          if (workRow?.classroom_id) {
            const { data: ownedClassroom } = await supabase
              .from('montree_classrooms')
              .select('id')
              .eq('id', workRow.classroom_id)
              .eq('school_id', auth.schoolId)
              .maybeSingle();
            if (ownedClassroom?.id) {
              const areaRel = (workRow as Record<string, unknown>).area as { area_key?: string } | { area_key?: string }[] | null;
              const areaKey = Array.isArray(areaRel) ? areaRel[0]?.area_key ?? null : areaRel?.area_key ?? null;
              ownedWork = {
                name: workRow.name as string,
                work_key: (workRow.work_key as string) || null,
                classroom_id: workRow.classroom_id as string,
                area_key: areaKey,
              };
            }
          }

          if (!ownedWork) {
            console.warn('[MediaUpload] work_id not owned by this school — no progress written:', work_id);
          } else {
            for (const cid of taggedForProgress) {
              await advanceProgressOnConfirm({
                supabase,
                childId: cid,
                workName: ownedWork.name,
                workKey: ownedWork.work_key,
                area: ownedWork.area_key,
                classroomId: ownedWork.classroom_id,
                schoolId: effectiveSchoolId,
                source: 'photo_confirm',
                actor: auth.userId || null,
              });
            }
          }
        }
      } catch (progressErr) {
        console.error('[MediaUpload] tag-first progress write failed (non-fatal):', progressErr);
      }
    }

    // 🚨 VIDEO TRANSCODE — fire-and-forget, never blocks the upload response.
    // WebM (VP9/Opus) does not decode on iOS Safari or QuickTime, and an iPhone
    // `.mov` is HEVC, which Chrome/Android cannot decode — so the server probes
    // the file and makes an H.264/AAC MP4 alongside it when needed, plus
    // a poster frame that lets the clip enter the work-identification pipeline.
    // If this is lost to a cold shutdown, /api/montree/cron/video-transcode
    // picks the row up again (transcode_status stays 'pending').
    if (media_type === 'video') {
      const origin = request.nextUrl.origin;
      void (async () => {
        try {
          const result = await transcodeVideoMedia(media.id);
          // 🚨 RETIRED 2026-09-17 — the poster frame is still made (it is the
          // video's thumbnail everywhere), it is simply never identified.
          if (isPhotoRecognitionEnabled() && result.ok && result.posterPath && !event_id && !work_id) {
            await triggerIdentification({
              mediaId: media.id,
              schoolId: effectiveSchoolId,
              classroomId: classroom_id || auth.classroomId || null,
              origin,
              subject: 'upload:video-transcode',
            });
          }
        } catch (err) {
          console.error('[MediaUpload] video transcode kick-off failed:', err);
        }
      })();
    }

    // Build URL for client use (Guru image upload expects data.url)
    const url = getProxyUrl(storagePath);

    return NextResponse.json({
      success: true,
      media,
      url,
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({
      error: 'Server error'
    }, { status: 500 });
  }
}
