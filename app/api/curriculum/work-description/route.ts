import { NextRequest, NextResponse } from 'next/server';
import { getSimpleDescription } from '@/lib/curriculum/simple-descriptions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workName = searchParams.get('name');
  
  if (!workName) {
    return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
  }
  
  const description = getSimpleDescription(workName);
  
  if (!description) {
    return NextResponse.json({ 
      found: false,
      message: 'No description found for this work',
      searchTerm: workName
    });
  }
  
  return NextResponse.json({
    found: true,
    work: {
      name: workName,
      line1: description.line1,
      line2: description.line2,
    }
  });
}
