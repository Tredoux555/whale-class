import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

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

// A4 dimensions in mm
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const MARGIN = 10;

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

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const borderWidth = cardsPerPage === 1 ? 3 : cardsPerPage === 2 ? 2 : 1.5;
    const cornerRadius = cardsPerPage === 1 ? 5 : cardsPerPage === 2 ? 4 : 3;
    const fontSize = cardsPerPage === 1 ? 16 : cardsPerPage === 2 ? 12 : 8;

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
        gap = 5;
        cardWidth = availableWidth;
        cardHeight = (availableHeight - gap) / 2;
        break;
      case 4:
        cols = 2;
        rows = 2;
        gap = 4;
        cardWidth = (availableWidth - gap) / 2;
        cardHeight = (availableHeight - gap) / 2;
        break;
    }

    // Process frames
    let frameIndex = 0;
    const cardsOnPage = cardsPerPage;
    let pageNum = 0;

    while (frameIndex < frames.length) {
      if (pageNum > 0) {
        doc.addPage();
      }
      pageNum++;

      // Draw cards on this page
      for (let cardNum = 0; cardNum < cardsOnPage && frameIndex < frames.length; cardNum++) {
        const frame = frames[frameIndex];
        
        // Calculate position
        const col = cardNum % cols;
        const row = Math.floor(cardNum / cols);
        const x = MARGIN + (col * (cardWidth + gap));
        const y = MARGIN + (row * (cardHeight + gap));

        // Draw rounded rectangle border
        // Parse border color
        const hex = borderColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(borderWidth);
        doc.roundedRect(x, y, cardWidth, cardHeight, cornerRadius, cornerRadius);

        // Calculate image dimensions (maintain aspect ratio, fit within card)
        const imagePadding = borderWidth + 5;
        const imageMaxWidth = cardWidth - (imagePadding * 2);
        const imageMaxHeight = frame.lyric 
          ? cardHeight - (imagePadding * 2) - 20 // Leave space for text
          : cardHeight - (imagePadding * 2);
        
        const imageX = x + imagePadding;
        const imageY = y + imagePadding;

        // Add image
        try {
          doc.addImage(
            frame.imageData,
            'JPEG',
            imageX,
            imageY,
            imageMaxWidth,
            imageMaxHeight,
            undefined,
            'FAST'
          );
        } catch (error) {
          console.error('Error adding image:', error);
        }

        // Draw lyric text
        if (frame.lyric) {
          const textY = imageY + imageMaxHeight + 5;
          
          doc.setFontSize(fontSize);
          doc.setTextColor(31, 41, 55); // #1f2937
          
          // Center text
          const textWidth = cardWidth - (imagePadding * 2);
          const lines = doc.splitTextToSize(frame.lyric, textWidth);
          const textX = x + imagePadding + (textWidth / 2);
          
          doc.text(lines, textX, textY, { align: 'center', maxWidth: textWidth });
        }

        // Draw timestamp if enabled
        if (showTimestamps) {
          const timestampSize = cardsPerPage === 1 ? 8 : 6;
          doc.setFontSize(timestampSize);
          doc.setTextColor(156, 163, 175); // #9ca3af
          
          const timestamp = formatTimestamp(frame.timestamp);
          doc.text(
            timestamp,
            x + cardWidth - imagePadding,
            y + cardHeight - imagePadding,
            { align: 'right' }
          );
        }

        frameIndex++;
      }

      // Add page footer
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `${songTitle} - Page ${pageNum}`,
        A4_WIDTH / 2,
        A4_HEIGHT - 5,
        { align: 'center' }
      );
    }

    // Generate PDF as buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

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
