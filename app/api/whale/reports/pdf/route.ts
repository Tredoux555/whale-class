// app/api/whale/reports/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportData } = body;

    if (!reportData) {
      return NextResponse.json(
        { error: 'reportData is required' },
        { status: 400 }
      );
    }

    // Create temporary file paths
    const timestamp = Date.now();
    const tmpDir = os.tmpdir();
    const dataPath = path.join(tmpDir, `report_data_${timestamp}.json`);
    const pdfPath = path.join(tmpDir, `report_${timestamp}.pdf`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_parent_report.py');

    // Write report data to temporary file
    await writeFile(dataPath, JSON.stringify(reportData, null, 2));

    // Install reportlab if not installed (first time only)
    try {
      await execAsync('python3 -c "import reportlab"');
    } catch {
      console.log('Installing reportlab...');
      await execAsync('pip3 install reportlab --break-system-packages').catch(() => {
        // Try without --break-system-packages flag
        return execAsync('pip3 install reportlab');
      });
    }

    // Generate PDF using Python script
    await execAsync(`python3 "${scriptPath}" "${dataPath}" "${pdfPath}"`);

    // Read PDF file
    const pdfBuffer = await readFile(pdfPath);

    // Clean up temporary files
    await unlink(dataPath).catch(() => {});
    await unlink(pdfPath).catch(() => {});

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="progress_report_${reportData.child.name.replace(/\s+/g, '_')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
