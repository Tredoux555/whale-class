import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface Media {
  id: string;
  work_name: string;
  media_type: string;
  media_url: string;
  taken_at: string;
  category?: string;
  notes?: string;
}

interface ChildProgress {
  presented: number;
  practicing: number;
  mastered: number;
}

export async function POST(request: NextRequest) {
  try {
    const { childId, childName } = await request.json();
    
    if (!childId || !childName) {
      return NextResponse.json({ error: 'Missing childId or childName' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Fetch all photos for this child
    const { data: media } = await supabase
      .from('child_work_media')
      .select('*')
      .eq('child_id', childId)
      .eq('media_type', 'photo')
      .order('taken_at', { ascending: false });

    if (!media || media.length === 0) {
      return NextResponse.json({ error: 'No photos found' }, { status: 400 });
    }

    // Fetch progress
    const { data: progress } = await supabase
      .from('child_curriculum_progress')
      .select('status')
      .eq('child_id', childId);

    const progressCounts: ChildProgress = {
      presented: progress?.filter(p => p.status === 1).length || 0,
      practicing: progress?.filter(p => p.status === 2).length || 0,
      mastered: progress?.filter(p => p.status === 3).length || 0
    };

    // Group photos by category
    const workPhotos = media.filter(m => (m.category || 'work') === 'work');
    const lifePhotos = media.filter(m => m.category === 'life');
    const sharedPhotos = media.filter(m => m.category === 'shared');

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Collect PDF data
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));

    // Title Page
    doc.fontSize(36)
       .fillColor('#3B82F6')
       .text(childName, { align: 'center' })
       .moveDown(0.5);
    
    doc.fontSize(18)
       .fillColor('#6B7280')
       .text('Learning Journey Album', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(12)
       .fillColor('#9CA3AF')
       .text(new Date().toLocaleDateString('en-US', { 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric' 
       }), { align: 'center' })
       .moveDown(2);

    // Progress Summary
    doc.fontSize(14)
       .fillColor('#374151')
       .text('Progress Summary', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(12)
       .fillColor('#6B7280')
       .text(`Presented: ${progressCounts.presented}   Practicing: ${progressCounts.practicing}   Mastered: ${progressCounts.mastered}`, { align: 'center' })
       .moveDown(1);

    doc.fontSize(11)
       .text(`${media.length} photos captured`, { align: 'center' });

    // Helper function to add photo section
    const addPhotoSection = async (photos: Media[], title: string, color: string) => {
      if (photos.length === 0) return;

      doc.addPage();
      doc.fontSize(24)
         .fillColor(color)
         .text(title, { align: 'center' })
         .moveDown(1);

      // Add photos in grid (2 per row)
      let x = 50;
      let y = doc.y;
      const photoWidth = 240;
      const photoHeight = 180;

      for (let i = 0; i < Math.min(photos.length, 8); i++) {
        const photo = photos[i];
        
        try {
          // Fetch image
          const imgRes = await fetch(photo.media_url);
          const imgBuffer = await imgRes.arrayBuffer();
          
          // Position
          if (i > 0 && i % 2 === 0) {
            x = 50;
            y += photoHeight + 60;
          }

          if (y + photoHeight > 750) {
            doc.addPage();
            y = 50;
            x = 50;
          }

          // Draw photo
          doc.image(Buffer.from(imgBuffer), x, y, { 
            width: photoWidth, 
            height: photoHeight, 
            fit: [photoWidth, photoHeight] 
          });

          // Caption
          doc.fontSize(9)
             .fillColor('#6B7280')
             .text(
               photo.work_name || 'Untitled', 
               x, 
               y + photoHeight + 5, 
               { width: photoWidth, align: 'center' }
             );

          doc.fontSize(8)
             .fillColor('#9CA3AF')
             .text(
               new Date(photo.taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
               x, 
               y + photoHeight + 20, 
               { width: photoWidth, align: 'center' }
             );

          x = x === 50 ? 305 : 50;
        } catch (err) {
          console.error('Failed to add image:', err);
        }
      }
    };

    // Add sections
    await addPhotoSection(workPhotos, 'Work Photos', '#3B82F6');
    await addPhotoSection(lifePhotos, 'Life Moments', '#10B981');
    await addPhotoSection(sharedPhotos, 'Group Photos', '#8B5CF6');

    // Final page
    doc.addPage();
    doc.fontSize(20)
       .fillColor('#3B82F6')
       .text('Whale Classroom', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(10)
       .fillColor('#9CA3AF')
       .text('www.teacherpotato.xyz', { align: 'center' });

    doc.end();

    // Wait for PDF to complete
    await new Promise<void>((resolve) => doc.on('end', () => resolve()));

    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${childName.replace(/\s+/g, '_')}_Album.pdf"`
      }
    });

  } catch (error) {
    console.error('Album generation error:', error);
    return NextResponse.json({ error: 'Failed to generate album' }, { status: 500 });
  }
}
