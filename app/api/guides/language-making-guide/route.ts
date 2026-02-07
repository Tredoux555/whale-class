import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  // Try multiple locations
  const locations = [
    join(process.cwd(), 'Montessori_Language_Making_Guide.docx'),
    join(process.cwd(), 'public', 'guides', 'Montessori_Language_Making_Guide.docx'),
  ];
  
  let fileBuffer: Buffer | null = null;
  
  for (const loc of locations) {
    try {
      fileBuffer = await readFile(loc);
      break;
    } catch {
      continue;
    }
  }
  
  if (!fileBuffer) {
    return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
  }
  
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="Montessori_Language_Making_Guide.docx"',
    },
  });
}
