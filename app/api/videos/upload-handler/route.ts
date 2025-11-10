import { handleUpload } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';

// This endpoint handles client-side blob uploads
// It generates a secure token for direct upload to Vercel Blob
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Validate file type from client payload
        const contentType = (clientPayload as any)?.contentType || (body as any)?.contentType || '';
        const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/*'];
        
        // Check if content type matches allowed types
        const isValidType = allowedTypes.some(type => {
          if (type === 'video/*') return contentType.startsWith('video/');
          return contentType === type || contentType.includes(type.split('/')[1]);
        });

        if (!isValidType && contentType) {
          throw new Error('Invalid file type. Only video files are allowed.');
        }

        return {
          allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
          addRandomSuffix: true,
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Blob upload completed:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    );
  }
}

