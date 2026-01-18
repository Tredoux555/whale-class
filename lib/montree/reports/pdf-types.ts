// lib/montree/reports/pdf-types.ts
// TypeScript types and configuration for PDF report generation
// Phase 4A - Session 55

// ============================================
// PDF CONTENT TYPES
// ============================================

export interface PDFReportData {
  // Child info
  childName: string;
  childGender: 'he' | 'she' | 'they';
  
  // Report metadata
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  
  // Content
  summary: string;
  parentMessage?: string;
  highlights: PDFHighlight[];
  
  // School info
  schoolName: string;
  teacherName: string;
}

export interface PDFHighlight {
  workName: string;
  workArea: string;
  observation: string;
  developmentalNote?: string;
  homeExtension?: string;
  thumbnailUrl?: string;
}

// ============================================
// PDF STYLING CONFIGURATION
// ============================================

export const PDF_CONFIG = {
  // Page setup
  pageSize: 'A4' as const,
  margins: {
    top: 60,
    bottom: 60,
    left: 50,
    right: 50,
  },
  
  // Colors (Montessori-inspired palette)
  colors: {
    primary: '#3B82F6',      // Blue - main accent
    secondary: '#10B981',    // Green - growth
    warmAccent: '#F59E0B',   // Amber - warmth
    text: '#1F2937',         // Gray-800
    textLight: '#6B7280',    // Gray-500
    background: '#F9FAFB',   // Gray-50
    white: '#FFFFFF',
    border: '#E5E7EB',       // Gray-200
    
    // Work area colors
    practical_life: '#10B981',
    sensorial: '#8B5CF6',
    language: '#3B82F6',
    mathematics: '#EF4444',
    cultural: '#F59E0B',
  },
  
  // Typography
  fonts: {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
    italic: 'Helvetica-Oblique',
  },
  
  // Font sizes
  fontSize: {
    title: 24,
    subtitle: 14,
    heading: 16,
    subheading: 12,
    body: 10,
    small: 8,
  },
  
  // Spacing
  spacing: {
    section: 24,
    paragraph: 12,
    line: 6,
  },
  
  // Dimensions
  dimensions: {
    thumbnailWidth: 80,
    thumbnailHeight: 80,
    logoSize: 40,
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getAreaColor(areaKey: string): string {
  const normalizedKey = areaKey.toLowerCase().replace(/[\s-]/g, '_');
  
  const colorMap: Record<string, string> = {
    practical_life: PDF_CONFIG.colors.practical_life,
    sensorial: PDF_CONFIG.colors.sensorial,
    language: PDF_CONFIG.colors.language,
    mathematics: PDF_CONFIG.colors.mathematics,
    cultural: PDF_CONFIG.colors.cultural,
  };
  
  return colorMap[normalizedKey] || PDF_CONFIG.colors.primary;
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options: Intl.DateTimeFormatOptions = { 
    month: 'long', 
    day: 'numeric',
  };
  
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}

export function getPronoun(gender: 'he' | 'she' | 'they'): {
  subject: string;
  possessive: string;
  object: string;
} {
  switch (gender) {
    case 'he':
      return { subject: 'he', possessive: 'his', object: 'him' };
    case 'she':
      return { subject: 'she', possessive: 'her', object: 'her' };
    case 'they':
      return { subject: 'they', possessive: 'their', object: 'them' };
  }
}
