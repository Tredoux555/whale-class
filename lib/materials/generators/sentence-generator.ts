// lib/materials/generators/sentence-generator.ts
// Sentence strips with LARGE kindergarten-readable text

import jsPDF from 'jspdf';
import { SENTENCES } from '../language-data';

export type SentenceLevel = 'pink-level' | 'blue-level' | 'green-level' | 'all';

export interface SentenceOptions {
  level: SentenceLevel;
}

export function generateSentenceStripsPDF(options: SentenceOptions): jsPDF {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const levels = options.level === 'all' 
    ? Object.keys(SENTENCES) 
    : [options.level];

  const allSentences: { sentence: string; level: string }[] = [];
  
  levels.forEach(level => {
    const sentences = SENTENCES[level as keyof typeof SENTENCES] || [];
    sentences.forEach(s => {
      allSentences.push({ sentence: s, level });
    });
  });

  // LARGER strips for kindergarten
  const stripHeight = 55;
  const margin = 12;
  const pageWidth = 297;
  const pageHeight = 210;
  const stripsPerPage = Math.floor((pageHeight - margin * 2) / (stripHeight + 8));

  // Level colors
  const levelColors: Record<string, { bg: number[], dot: number[] }> = {
    'pink-level': { bg: [252, 228, 236], dot: [216, 27, 96] },
    'blue-level': { bg: [227, 242, 253], dot: [25, 118, 210] },
    'green-level': { bg: [232, 245, 233], dot: [56, 142, 60] },
  };

  // Title page
  pdf.setFillColor(250, 250, 250);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(48);
  pdf.setTextColor(50, 50, 50);
  pdf.text('Sentence Strips', pageWidth / 2, 70, { align: 'center' });
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(20);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`${allSentences.length} sentences for reading practice`, pageWidth / 2, 95, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.text('Print on cardstock, cut along lines, laminate for durability', pageWidth / 2, 130, { align: 'center' });

  // Generate strips
  let stripIndex = 0;
  
  while (stripIndex < allSentences.length) {
    pdf.addPage('a4', 'landscape');
    
    for (let i = 0; i < stripsPerPage && stripIndex < allSentences.length; i++) {
      const y = margin + i * (stripHeight + 8);
      const sentence = allSentences[stripIndex];
      
      const colors = levelColors[sentence.level] || { bg: [255, 255, 255], dot: [100, 100, 100] };
      
      // Strip background
      pdf.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, stripHeight, 4, 4, 'FD');
      
      // Level indicator dot (larger)
      pdf.setFillColor(colors.dot[0], colors.dot[1], colors.dot[2]);
      pdf.circle(margin + 18, y + stripHeight / 2, 6, 'F');
      
      // SENTENCE TEXT - LARGE AND BOLD FOR KINDERGARTEN
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(36); // Large, readable text
      pdf.setTextColor(30, 30, 30);
      
      // Center vertically in strip
      const textY = y + (stripHeight / 2);
      pdf.text(sentence.sentence, margin + 40, textY, {
        baseline: 'middle',
      });
      
      // Cutting guide line
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineDashPattern([4, 4], 0);
      pdf.setLineWidth(0.3);
      pdf.line(margin, y + stripHeight + 4, pageWidth - margin, y + stripHeight + 4);
      pdf.setLineDashPattern([], 0);
      
      stripIndex++;
    }
    
    // Page number
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${pdf.getNumberOfPages() - 1}`, 
      pageWidth - margin, 
      pageHeight - 6, 
      { align: 'right' }
    );
  }

  return pdf;
}

export function generateSentencesByLevel(
  level: keyof typeof SENTENCES,
  options: Omit<SentenceOptions, 'level'>
): jsPDF {
  return generateSentenceStripsPDF({
    ...options,
    level: level as SentenceLevel,
  });
}
