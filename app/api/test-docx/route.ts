import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Try mammoth
    let text = '';
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } catch (e: any) {
      text = `Mammoth error: ${e.message}`;
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      textLength: text.length,
      textPreview: text.substring(0, 500),
      hasApiKey: !!process.env.ANTHROPIC_API_KEY,
      hasSupabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
