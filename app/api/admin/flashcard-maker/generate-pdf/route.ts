import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';

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

// A4 dimensions in points (72 points per inch)
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 40;

// Convert hex color to RGB array
function hexToRGB(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ];
  }
  return [6, 182, 212]; // Default cyan
}

// Format timestamp for display
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Convert base64 data URL to Buffer
function base64ToBuffer(dataUrl: string): Buffer {
  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
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

    const rgb = hexToRGB(borderColor);
    const borderWidth = cardsPerPage === 1 ? 12 : cardsPerPage === 2 ? 8 : 6;
    const cornerRadius = cardsPerPage === 1 ? 20 : cardsPerPage === 2 ? 15 : 10;
    const fontSize = cardsPerPage === 1 ? 28 : cardsPerPage === 2 ? 20 : 14;

    // Calculate card dimensions based on cards per page
    const availableWidth = A4_WIDTH - (MARGIN * 2);
    const availableHeight = A4_HEIGHT - (MARGIN * 2);

    let cardWidth: number;
    let cardHeight: number;
    let cols: number;
    let rows: number;
    let gap: number;

    switch (cardsPerPage) {
      case 1:
        cols = 1;
        rows = 1;
        gap = 0;
        cardWidth = availableWidth;
        cardHeight = availableHeight;
        break;
      case 2:
        cols = 1;
        rows = 2;
        gap = 20;
        cardWidth = availableWidth;
        cardHeight = (availableHeight - gap) / 2;
        break;
      case 4:
        cols = 2;
        rows = 2;
        gap = 15;
        cardWidth = (availableWidth - gap) / 2;
        cardHeight = (availableHeight - gap) / 2;
        break;
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      info: {
        Title: `${songTitle} Flashcards`,
        Author: 'Whale Montessori - Flashcard Maker',
        Subject: 'Song Flashcards for Kindergarten'
      }
    });

    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Pre-convert all images to buffers before PDF generation
    const imageBuffers: Buffer[] = frames.map(frame => {
      if (frame.imageData && frame.imageData.startsWith('data:')) {
        return base64ToBuffer(frame.imageData);
      }
      return Buffer.alloc(0);
    });

    // Process frames
    let frameIndex = 0;
    const cardsOnPage = cardsPerPage;
    let pageNumber = 1;

    while (frameIndex < frames.length) {
      if (frameIndex > 0) {
        doc.addPage();
      }

      // Draw cards on this page
      for (let cardNum = 0; cardNum < cardsOnPage && frameIndex < frames.length; cardNum++) {
        const frame = frames[frameIndex];
        const imageBuffer = imageBuffers[frameIndex];
        
        // Calculate position
        const col = cardNum % cols;
        const row = Math.floor(cardNum / cols);
        const x = MARGIN + (col * (cardWidth + gap));
        const y = MARGIN + (row * (cardHeight + gap));

        // Draw colored border rectangle
        doc.save();
        doc.roundedRect(x, y, cardWidth, cardHeight, cornerRadius)
           .fill(rgb);

        // Draw inner white rectangle
        const innerX = x + borderWidth;
        const innerY = y + borderWidth;
        const innerWidth = cardWidth - (borderWidth * 2);
        const innerHeight = cardHeight - (borderWidth * 2);
        
        doc.roundedRect(innerX, innerY, innerWidth, innerHeight, Math.max(cornerRadius - 4, 4))
           .fill('#ffffff');

        // Calculate image dimensions
        const imagePadding = 10;
        const imageX = innerX + imagePadding;
        const imageY = innerY + imagePadding;
        const maxImageWidth = innerWidth - (imagePadding * 2);
        
        // Reserve space for lyrics text
        const textAreaHeight = frame.lyric ? (cardsPerPage === 1 ? 100 : cardsPerPage === 2 ? 70 : 50) : 20;
        const maxImageHeight = innerHeight - (imagePadding * 2) - textAreaHeight;

        // Draw image if buffer is valid
        if (imageBuffer && imageBuffer.length > 0) {
          try {
            doc.image(imageBuffer, imageX, imageY, {
              fit: [maxImageWidth, maxImageHeight],
              align: 'center',
              valign: 'center'
            });
          } catch (imgError) {
            console.error(`Failed to embed image ${frameIndex}:`, imgError);
            // Draw placeholder rectangle if image fails
            doc.rect(imageX, imageY, maxImageWidth, maxImageHeight)
               .fill('#f3f4f6');
            doc.fillColor('#9ca3af')
               .fontSize(12)
               .text('Image failed to load', imageX, imageY + maxImageHeight / 2, {
                 width: maxImageWidth,
                 align: 'center'
               });
          }
        }

        // Draw lyric text below image
        if (frame.lyric) {
          const textY = innerY + imagePadding + maxImageHeight + 10;
          
          doc.fillColor('#1f2937')
             .fontSize(fontSize)
             .font('Helvetica-Bold')
             .text(frame.lyric, innerX + imagePadding, textY, {
               width: innerWidth - (imagePadding * 2),
               height: textAreaHeight - 10,
               align: 'center',
               lineGap: 4
             });
        }

        // Draw timestamp if enabled
        if (showTimestamps) {
          const timestampSize = cardsPerPage === 1 ? 11 : 9;
          doc.fillColor('#9ca3af')
             .fontSize(timestampSize)
             .font('Helvetica')
             .text(
               formatTimestamp(frame.timestamp),
               innerX + innerWidth - 45,
               innerY + innerHeight - 18,
               { width: 40, align: 'right' }
             );
        }

        doc.restore();
        frameIndex++;
      }

      // Add page footer with song title and page number
      doc.fillColor('#9ca3af')
         .fontSize(10)
         .font('Helvetica')
         .text(
           `${songTitle} - Page ${pageNumber}`,
           MARGIN,
           A4_HEIGHT - 30,
           { width: A4_WIDTH - (MARGIN * 2), align: 'center' }
         );
      
      pageNumber++;
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);
    });

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
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
