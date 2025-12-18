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

// Convert hex color to RGB
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

    // Create PDF
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
    doc.on('data', (chunk) => chunks.push(chunk));

    // Process frames
    let frameIndex = 0;
    const cardsOnPage = cardsPerPage;

    while (frameIndex < frames.length) {
      if (frameIndex > 0) {
        doc.addPage();
      }

      // Draw cards on this page
      for (let cardNum = 0; cardNum < cardsOnPage && frameIndex < frames.length; cardNum++) {
        const frame = frames[frameIndex];
        
        // Calculate position
        const col = cardNum % cols;
        const row = Math.floor(cardNum / cols);
        const x = MARGIN + (col * (cardWidth + gap));
        const y = MARGIN + (row * (cardHeight + gap));

        // Draw rounded rectangle border
        doc.save();
        
        // Border background (colored)
        doc.roundedRect(x, y, cardWidth, cardHeight, cornerRadius)
           .fillColor(rgb)
           .fill();

        // Inner white area (smaller by border width)
        const innerX = x + borderWidth;
        const innerY = y + borderWidth;
        const innerWidth = cardWidth - (borderWidth * 2);
        const innerHeight = cardHeight - (borderWidth * 2);
        
        doc.roundedRect(innerX, innerY, innerWidth, innerHeight, cornerRadius - 4)
           .fillColor('white')
           .fill();

        // Calculate image area (16:9 aspect ratio)
        const imagePadding = borderWidth + 8;
        const imageX = x + imagePadding;
        const imageY = y + imagePadding;
        const imageWidth = cardWidth - (imagePadding * 2);
        
        // Calculate text area
        const textAreaHeight = frame.lyric ? (cardsPerPage === 1 ? 80 : cardsPerPage === 2 ? 60 : 40) : 0;
        const imageHeight = (cardHeight - (imagePadding * 2) - textAreaHeight) * 0.95;

        // Embed image (convert base64 to buffer)
        if (frame.imageData) {
          const base64Data = frame.imageData.replace(/^data:image\/\w+;base64,/, '');
          const imageBuffer = Buffer.from(base64Data, 'base64');
          
          doc.image(imageBuffer, imageX, imageY, {
            width: imageWidth,
            height: imageHeight,
            fit: [imageWidth, imageHeight],
            align: 'center',
            valign: 'center'
          });
        }

        // Draw lyric text
        if (frame.lyric) {
          const textY = imageY + imageHeight + 10;
          const textHeight = cardHeight - imagePadding - imageHeight - 20;
          
          doc.fillColor('#1f2937')
             .fontSize(fontSize)
             .font('Helvetica-Bold')
             .text(frame.lyric, imageX, textY, {
               width: imageWidth,
               height: textHeight,
               align: 'center',
               lineGap: 4
             });
        }

        // Draw timestamp if enabled
        if (showTimestamps) {
          const timestampSize = cardsPerPage === 1 ? 12 : 10;
          doc.fillColor('#9ca3af')
             .fontSize(timestampSize)
             .font('Helvetica')
             .text(
               formatTimestamp(frame.timestamp),
               x + cardWidth - 50 - borderWidth,
               y + cardHeight - 20 - borderWidth,
               { width: 50, align: 'right' }
             );
        }

        doc.restore();
        frameIndex++;
      }

      // Add page number
      doc.fillColor('#9ca3af')
         .fontSize(10)
         .text(
           `${songTitle} - Page ${Math.ceil(frameIndex / cardsPerPage)}`,
           MARGIN,
           A4_HEIGHT - 30,
           { width: A4_WIDTH - (MARGIN * 2), align: 'center' }
         );
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    // Return PDF as download
    return new Response(pdfBuffer, {
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

