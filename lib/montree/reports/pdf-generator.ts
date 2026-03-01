// lib/montree/reports/pdf-generator.ts
// PDFKit-based PDF report generation
// Phase 4A - Session 55

import PDFDocument from 'pdfkit';
import type { PDFReportData, PDFHighlight } from './pdf-types';
import { PDF_CONFIG, getAreaColor, formatDateRange } from './pdf-types';
import { getTranslator, type Locale } from '@/lib/montree/i18n/server';

// ============================================
// MAIN GENERATOR FUNCTION
// ============================================

export async function generateReportPDF(data: PDFReportData, locale: Locale = 'en'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: PDF_CONFIG.pageSize,
        margins: PDF_CONFIG.margins,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      drawHeader(doc, data, locale);
      drawSummarySection(doc, data, locale);
      drawHighlightsSection(doc, data, locale);
      drawParentMessage(doc, data, locale);
      drawFooter(doc, data, locale);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================
// HEADER SECTION
// ============================================

function drawHeader(doc: PDFKit.PDFDocument, data: PDFReportData, locale: Locale) {
  const t = getTranslator(locale);
  const { margins, colors, fonts, fontSize } = PDF_CONFIG;
  const pageWidth = doc.page.width - margins.left - margins.right;

  doc.rect(0, 0, doc.page.width, 8).fill(colors.primary);

  doc.fontSize(fontSize.title)
    .font(fonts.bold)
    .fillColor(colors.text)
    .text('🌳 ' + data.schoolName, margins.left, margins.top);

  doc.moveDown(0.3)
    .fontSize(fontSize.subtitle)
    .font(fonts.regular)
    .fillColor(colors.textLight)
    .text(t('report.pdf.title' as any, 'Weekly Progress Report'));
  
  const dividerY = doc.y + 10;
  doc.moveTo(margins.left, dividerY)
    .lineTo(margins.left + pageWidth, dividerY)
    .strokeColor(colors.border)
    .lineWidth(1)
    .stroke();
  
  doc.y = dividerY + 20;
  
  const boxY = doc.y;
  const boxHeight = 60;
  
  doc.rect(margins.left, boxY, pageWidth, boxHeight).fillColor('#EFF6FF').fill();
  
  doc.fontSize(fontSize.heading + 4)
    .font(fonts.bold)
    .fillColor(colors.text)
    .text(data.childName, margins.left, boxY + 12, { width: pageWidth, align: 'center' });
  
  const dateRange = formatDateRange(data.weekStart, data.weekEnd, locale);
  doc.fontSize(fontSize.body)
    .font(fonts.regular)
    .fillColor(colors.textLight)
    .text(dateRange, margins.left, boxY + 36, { width: pageWidth, align: 'center' });
  
  doc.y = boxY + boxHeight + PDF_CONFIG.spacing.section;
}

// ============================================
// SUMMARY SECTION
// ============================================

function drawSummarySection(doc: PDFKit.PDFDocument, data: PDFReportData, locale: Locale) {
  const t = getTranslator(locale);
  const { margins, colors, fonts, fontSize, spacing } = PDF_CONFIG;
  const pageWidth = doc.page.width - margins.left - margins.right;

  doc.fontSize(fontSize.heading)
    .font(fonts.bold)
    .fillColor(colors.primary)
    .text('📝 ' + t('report.pdf.weeklySummary' as any, 'Weekly Summary'), margins.left, doc.y);

  doc.moveDown(0.5);

  doc.fontSize(fontSize.body)
    .font(fonts.regular)
    .fillColor(colors.text)
    .text(data.summary || t('report.pdf.defaultSummary' as any, 'This week was full of wonderful learning experiences.'), {
      width: pageWidth,
      align: 'left',
      lineGap: 4,
    });

  doc.y += spacing.section;
}

// ============================================
// HIGHLIGHTS SECTION
// ============================================

function drawHighlightsSection(doc: PDFKit.PDFDocument, data: PDFReportData, locale: Locale) {
  const t = getTranslator(locale);
  const { margins, colors, fonts, fontSize, spacing } = PDF_CONFIG;
  const pageWidth = doc.page.width - margins.left - margins.right;

  if (!data.highlights || data.highlights.length === 0) {
    return;
  }

  doc.fontSize(fontSize.heading)
    .font(fonts.bold)
    .fillColor(colors.primary)
    .text('✨ ' + t('report.pdf.learningHighlights' as any, 'Learning Highlights'), margins.left, doc.y);

  doc.moveDown(0.5);

  for (let i = 0; i < data.highlights.length; i++) {
    const highlight = data.highlights[i];
    drawHighlightCard(doc, highlight, i + 1, pageWidth, locale);
  }
}

function drawHighlightCard(
  doc: PDFKit.PDFDocument,
  highlight: PDFHighlight,
  index: number,
  pageWidth: number,
  locale: Locale
) {
  const t = getTranslator(locale);
  const { margins, colors, fonts, fontSize, spacing } = PDF_CONFIG;
  
  // Check for page break
  if (doc.y > doc.page.height - 200) {
    doc.addPage();
    doc.y = margins.top;
  }
  
  const cardY = doc.y;
  const cardPadding = 12;
  
  // Calculate card height dynamically
  const contentStartX = margins.left + cardPadding;
  const contentWidth = pageWidth - (cardPadding * 2);
  
  // Estimate height needed
  // Use Chinese name when locale is zh and available
  const displayName = locale === 'zh' && highlight.chineseName ? highlight.chineseName : highlight.workName;

  doc.fontSize(fontSize.subheading).font(fonts.bold);
  const titleHeight = doc.heightOfString(displayName, { width: contentWidth });
  
  doc.fontSize(fontSize.body).font(fonts.regular);
  const obsHeight = highlight.observation 
    ? doc.heightOfString(highlight.observation, { width: contentWidth }) 
    : 0;
  
  const devHeight = highlight.developmentalNote 
    ? doc.heightOfString(highlight.developmentalNote, { width: contentWidth }) + 20 
    : 0;
  
  const homeHeight = highlight.homeExtension 
    ? doc.heightOfString(highlight.homeExtension, { width: contentWidth }) + 20 
    : 0;
  
  const cardHeight = Math.max(
    80,
    cardPadding * 2 + titleHeight + 20 + obsHeight + devHeight + homeHeight + 10
  );
  
  // Card background
  const areaColor = getAreaColor(highlight.workArea);
  doc.rect(margins.left, cardY, pageWidth, cardHeight)
    .fillColor('#FAFAFA')
    .fill();
  
  // Left color bar
  doc.rect(margins.left, cardY, 4, cardHeight)
    .fillColor(areaColor)
    .fill();
  
  // Work number badge
  doc.circle(margins.left + 20, cardY + 20, 12)
    .fillColor(areaColor)
    .fill();
  
  doc.fontSize(fontSize.body)
    .font(fonts.bold)
    .fillColor(colors.white)
    .text(String(index), margins.left + 14, cardY + 15, { width: 12, align: 'center' });
  
  // Work name and area
  doc.fontSize(fontSize.subheading)
    .font(fonts.bold)
    .fillColor(colors.text)
    .text(displayName, margins.left + 40, cardY + 12);
  
  doc.fontSize(fontSize.small)
    .font(fonts.regular)
    .fillColor(areaColor)
    .text(highlight.workArea.toUpperCase(), margins.left + 40, cardY + 28);
  
  let currentY = cardY + 45;
  
  // Observation
  if (highlight.observation) {
    doc.fontSize(fontSize.body)
      .font(fonts.regular)
      .fillColor(colors.text)
      .text(highlight.observation, contentStartX, currentY, {
        width: contentWidth,
        lineGap: 3,
      });
    currentY = doc.y + 8;
  }
  
  // Developmental Note
  if (highlight.developmentalNote) {
    doc.fontSize(fontSize.small)
      .font(fonts.bold)
      .fillColor(colors.secondary)
      .text('🌱 ' + t('report.pdf.developmentalNote' as any, 'Developmental Note') + ':', contentStartX, currentY);
    currentY = doc.y + 2;

    doc.fontSize(fontSize.body)
      .font(fonts.italic)
      .fillColor(colors.textLight)
      .text(highlight.developmentalNote, contentStartX, currentY, {
        width: contentWidth,
        lineGap: 2,
      });
    currentY = doc.y + 8;
  }

  // Home Extension
  if (highlight.homeExtension) {
    doc.fontSize(fontSize.small)
      .font(fonts.bold)
      .fillColor(colors.warmAccent)
      .text('🏠 ' + t('report.pdf.tryAtHome' as any, 'Try at Home') + ':', contentStartX, currentY);
    currentY = doc.y + 2;

    doc.fontSize(fontSize.body)
      .font(fonts.italic)
      .fillColor(colors.textLight)
      .text(highlight.homeExtension, contentStartX, currentY, {
        width: contentWidth,
        lineGap: 2,
      });
  }
  
  doc.y = cardY + cardHeight + spacing.paragraph;
}

// ============================================
// PARENT MESSAGE SECTION
// ============================================

function drawParentMessage(doc: PDFKit.PDFDocument, data: PDFReportData, locale: Locale) {
  const t = getTranslator(locale);
  const { margins, colors, fonts, fontSize, spacing } = PDF_CONFIG;
  const pageWidth = doc.page.width - margins.left - margins.right;

  if (!data.parentMessage) {
    return;
  }

  // Check for page break
  if (doc.y > doc.page.height - 150) {
    doc.addPage();
    doc.y = margins.top;
  }

  doc.y += spacing.paragraph;

  doc.fontSize(fontSize.heading)
    .font(fonts.bold)
    .fillColor(colors.warmAccent)
    .text('💌 ' + t('report.pdf.messageFromTeacher' as any, 'Message from Your Teacher'), margins.left, doc.y);

  doc.moveDown(0.5);
  
  // Message box with warm background
  const boxY = doc.y;
  const boxPadding = 16;
  
  doc.fontSize(fontSize.body).font(fonts.italic);
  const messageHeight = doc.heightOfString(data.parentMessage, { 
    width: pageWidth - (boxPadding * 2) 
  });
  
  const boxHeight = messageHeight + (boxPadding * 2) + 30;
  
  doc.rect(margins.left, boxY, pageWidth, boxHeight)
    .fillColor('#FFFBEB')
    .fill();
  
  doc.rect(margins.left, boxY, 4, boxHeight)
    .fillColor(colors.warmAccent)
    .fill();
  
  doc.fontSize(fontSize.body)
    .font(fonts.italic)
    .fillColor(colors.text)
    .text(data.parentMessage, margins.left + boxPadding, boxY + boxPadding, {
      width: pageWidth - (boxPadding * 2),
      lineGap: 4,
    });
  
  // Teacher signature
  doc.fontSize(fontSize.small)
    .font(fonts.regular)
    .fillColor(colors.textLight)
    .text(`— ${data.teacherName}`, margins.left + boxPadding, boxY + boxHeight - 24);
  
  doc.y = boxY + boxHeight + spacing.section;
}

// ============================================
// FOOTER SECTION
// ============================================

function drawFooter(doc: PDFKit.PDFDocument, data: PDFReportData, locale: Locale) {
  const t = getTranslator(locale);
  const { margins, colors, fonts, fontSize } = PDF_CONFIG;
  const pageWidth = doc.page.width - margins.left - margins.right;

  // Go to bottom of page
  const footerY = doc.page.height - margins.bottom;

  // Divider line
  doc.moveTo(margins.left, footerY - 20)
    .lineTo(margins.left + pageWidth, footerY - 20)
    .strokeColor(colors.border)
    .lineWidth(0.5)
    .stroke();

  // Footer text
  const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
  const generatedDate = new Date(data.generatedAt).toLocaleDateString(dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const generatedText = t('report.pdf.generatedDate' as any, `Generated: ${generatedDate}`).replace('{date}', generatedDate);

  doc.fontSize(fontSize.small)
    .font(fonts.regular)
    .fillColor(colors.textLight)
    .text(
      `${generatedText} • ${data.schoolName}`,
      margins.left,
      footerY - 10,
      { width: pageWidth, align: 'center' }
    );
}

// ============================================
// UTILITY: Add image to PDF (for future use)
// ============================================

export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
