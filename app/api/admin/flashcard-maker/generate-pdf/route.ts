import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const TEMP_DIR = '/tmp/flashcard-maker';

interface ExtractedFrame {
  timestamp: number;
  imageData: string;
  lyric?: string;
}

interface PDFRequest {
  frames: ExtractedFrame[];
  songTitle: string;
  cardsPerPage: 1 | 2 | 4;
  borderColor: string;
  showTimestamps: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequest = await request.json();
    const { frames, songTitle, cardsPerPage, borderColor, showTimestamps } = body;

    if (!frames || frames.length === 0) {
      return NextResponse.json(
        { message: 'No frames provided' },
        { status: 400 }
      );
    }

    // Create temp directory
    await fs.mkdir(TEMP_DIR, { recursive: true });
    
    const timestamp = Date.now();
    const imagesDir = path.join(TEMP_DIR, `images_${timestamp}`);
    await fs.mkdir(imagesDir, { recursive: true });

    // Save all images to disk (Python will read them)
    const imageFiles: string[] = [];
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame.imageData && frame.imageData.startsWith('data:')) {
        const base64Data = frame.imageData.replace(/^data:image\/\w+;base64,/, '');
        const imagePath = path.join(imagesDir, `frame_${i.toString().padStart(3, '0')}.jpg`);
        await fs.writeFile(imagePath, Buffer.from(base64Data, 'base64'));
        imageFiles.push(imagePath);
      }
    }

    // Prepare frame data for Python (without base64, just paths and metadata)
    const frameData = frames.map((frame, i) => ({
      imagePath: imageFiles[i] || '',
      timestamp: frame.timestamp,
      lyric: frame.lyric || ''
    }));

    // Write frame data as JSON for Python to read
    const dataPath = path.join(TEMP_DIR, `data_${timestamp}.json`);
    await fs.writeFile(dataPath, JSON.stringify({
      frames: frameData,
      songTitle,
      cardsPerPage,
      borderColor,
      showTimestamps
    }));

    // Output PDF path
    const outputPath = path.join(TEMP_DIR, `flashcards_${timestamp}.pdf`);

    // Get the Python script path (should be in lib/pdf-generator.py)
    const scriptPath = path.join(process.cwd(), 'lib', 'pdf-generator.py');
    
    // Check if script exists, if not use inline Python
    let pythonCommand: string;
    
    try {
      await fs.access(scriptPath);
      pythonCommand = `python3 "${scriptPath}" "${dataPath}" "${outputPath}"`;
    } catch {
      // Script doesn't exist, use inline Python command
      pythonCommand = `python3 -c "
import sys
import json
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16)/255 for i in (0, 2, 4))

def create_pdf(data_path, output_path):
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    frames = data['frames']
    song_title = data['songTitle']
    cards_per_page = data['cardsPerPage']
    border_color = hex_to_rgb(data['borderColor'])
    show_timestamps = data['showTimestamps']
    
    width, height = landscape(A4)
    margin = 15 * mm
    
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    
    if cards_per_page == 1:
        cols, rows = 1, 1
        gap = 0
    elif cards_per_page == 2:
        cols, rows = 1, 2
        gap = 8 * mm
    else:
        cols, rows = 2, 2
        gap = 6 * mm
    
    card_width = (width - 2 * margin - (cols - 1) * gap) / cols
    card_height = (height - 2 * margin - (rows - 1) * gap) / rows
    border_width = 4 * mm if cards_per_page == 1 else 3 * mm
    
    frame_idx = 0
    page_num = 1
    
    while frame_idx < len(frames):
        for row in range(rows):
            for col in range(cols):
                if frame_idx >= len(frames):
                    break
                
                frame = frames[frame_idx]
                x = margin + col * (card_width + gap)
                y = height - margin - (row + 1) * card_height - row * gap
                
                # Draw border
                c.setFillColorRGB(*border_color)
                c.roundRect(x, y, card_width, card_height, 8*mm, fill=1, stroke=0)
                
                # Draw inner white area
                inner_x = x + border_width
                inner_y = y + border_width
                inner_w = card_width - 2 * border_width
                inner_h = card_height - 2 * border_width
                c.setFillColorRGB(1, 1, 1)
                c.roundRect(inner_x, inner_y, inner_w, inner_h, 5*mm, fill=1, stroke=0)
                
                # Calculate image area - no padding, image fills entire inner area
                has_lyric = frame.get('lyric') and len(frame.get('lyric', '').strip()) > 0
                text_height = 18 * mm if has_lyric else 0
                
                img_x = inner_x
                img_y = inner_y + text_height
                img_w = inner_w
                img_h = inner_h - text_height
                
                # Draw image - FILL mode (cover entire area, crop if needed)
                if frame.get('imagePath'):
                    try:
                        img = ImageReader(frame['imagePath'])
                        iw, ih = img.getSize()
                        img_aspect = iw / ih
                        area_aspect = img_w / img_h
                        
                        # Scale to FILL (cover entire area, may crop)
                        if img_aspect > area_aspect:
                            # Image is wider - scale by height, crop width
                            draw_h = img_h
                            draw_w = draw_h * img_aspect
                        else:
                            # Image is taller - scale by width, crop height
                            draw_w = img_w
                            draw_h = draw_w / img_aspect
                        
                        # Center the image
                        draw_x = img_x + (img_w - draw_w) / 2
                        draw_y = img_y + (img_h - draw_h) / 2
                        
                        # Clip to image area and draw
                        c.saveState()
                        path = c.beginPath()
                        path.rect(img_x, img_y, img_w, img_h)
                        c.clipPath(path, stroke=0)
                        c.drawImage(img, draw_x, draw_y, draw_w, draw_h)
                        c.restoreState()
                    except Exception as e:
                        print(f'Image error: {e}')
                
                # Draw lyric only if present
                if has_lyric:
                    c.setFillColorRGB(0.1, 0.1, 0.1)
                    font_size = 14 if cards_per_page == 1 else 10 if cards_per_page == 2 else 8
                    c.setFont('Helvetica-Bold', font_size)
                    text_y = inner_y + text_height / 2
                    c.drawCentredString(inner_x + inner_w / 2, text_y, frame['lyric'][:60])
                
                # Draw timestamp
                if show_timestamps:
                    c.setFillColorRGB(0.6, 0.6, 0.6)
                    c.setFont('Helvetica', 8)
                    ts = frame.get('timestamp', 0)
                    ts_str = f'{int(ts//60)}:{int(ts%60):02d}'
                    c.drawRightString(inner_x + inner_w - 2*mm, inner_y + 2*mm, ts_str)
                
                frame_idx += 1
        
        # Page footer
        c.setFillColorRGB(0.6, 0.6, 0.6)
        c.setFont('Helvetica', 9)
        c.drawCentredString(width / 2, 10 * mm, f'{song_title} - Page {page_num}')
        
        if frame_idx < len(frames):
            c.showPage()
            page_num += 1
    
    c.save()
    print(f'PDF created: {output_path}')

create_pdf('${dataPath}', '${outputPath}')
"`;
    }

    // Execute Python script
    try {
      const { stdout, stderr } = await execAsync(pythonCommand, { timeout: 60000 });
      if (stderr && !stderr.includes('PDF created')) {
        console.error('Python stderr:', stderr);
      }
      console.log('Python stdout:', stdout);
    } catch (execError: unknown) {
      console.error('Python execution error:', execError);
      // Try to give more specific error
      const errorObj = execError as { stderr?: string; message?: string };
      if (errorObj.stderr?.includes('No module named')) {
        return NextResponse.json(
          { message: 'Missing Python dependency. Run: pip3 install reportlab --break-system-packages' },
          { status: 500 }
        );
      }
      throw new Error(`PDF generation failed: ${errorObj.message || 'Unknown error'}`);
    }

    // Read the generated PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await fs.readFile(outputPath);
    } catch {
      return NextResponse.json(
        { message: 'PDF file was not created. Check Python installation.' },
        { status: 500 }
      );
    }

    // Cleanup
    try {
      await fs.rm(imagesDir, { recursive: true, force: true });
      await fs.unlink(dataPath);
      await fs.unlink(outputPath);
    } catch {
      // Ignore cleanup errors
    }

    // Return PDF - Convert Buffer to Uint8Array for Next.js 16 compatibility
    const uint8Array = new Uint8Array(pdfBuffer);
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${songTitle.replace(/[^a-z0-9]/gi, '_')}_flashcards.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
