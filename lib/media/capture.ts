// lib/media/capture.ts
// High-level capture API - the only interface components should use
// Session 54: Simple, instant, bulletproof

import { v4 as uuidv4 } from 'uuid';
import type { MediaRecord, CaptureOptions } from './types';
import * as db from './db';
import { queueUpload, getSyncState } from './sync';

/**
 * Compress image for storage efficiency
 * Target: ~500KB per photo, maintain quality
 */
async function compressImage(blob: Blob, maxWidth = 1920): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      // Calculate dimensions
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ blob, width: img.width, height: img.height });
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob with compression
      canvas.toBlob(
        (compressedBlob) => {
          resolve({ 
            blob: compressedBlob || blob, 
            width, 
            height 
          });
        },
        'image/jpeg',
        0.85 // Quality: 85%
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob, width: 0, height: 0 });
    };
    
    img.src = url;
  });
}

/**
 * Create data URL for instant preview
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * MAIN CAPTURE FUNCTION
 * Call this with a blob from camera or file picker
 * Returns immediately with local record, syncs in background
 */
export async function captureMedia(
  blob: Blob,
  options: CaptureOptions
): Promise<MediaRecord> {
  const id = uuidv4();
  const now = new Date().toISOString();
  const isDocument = options.mediaType === 'document';
  
  let finalBlob: Blob;
  let width = 0;
  let height = 0;
  let dataUrl: string | undefined;
  
  if (isDocument) {
    // Documents: no compression, no preview image
    finalBlob = blob;
    dataUrl = undefined; // Documents don't need base64 preview
  } else {
    // Photos: compress and generate preview
    const compressed = await compressImage(blob);
    finalBlob = compressed.blob;
    width = compressed.width;
    height = compressed.height;
    dataUrl = await blobToDataUrl(finalBlob);
  }
  
  // Create media record
  const media: MediaRecord = {
    id,
    childId: options.childId,
    childName: options.childName,
    mediaType: isDocument ? 'document' : 'photo',
    dataUrl,
    capturedAt: now,
    workId: options.workId,
    workName: options.workName,
    caption: options.caption,
    tags: options.tags,
    width,
    height,
    fileSizeBytes: finalBlob.size,
    fileName: options.fileName,
    mimeType: options.mimeType,
    syncStatus: 'pending',
    syncAttempts: 0,
  };
  
  // Queue for upload (saves to IndexedDB + queues sync)
  await queueUpload(media, finalBlob, 2); // Priority 2 = normal
  
  return media;
}

/**
 * Get all media for a child (local + remote)
 * Returns local first for instant display
 */
export async function getChildMedia(childId: string): Promise<MediaRecord[]> {
  const localMedia = await db.getMediaByChild(childId);
  
  // Sort by capture time, newest first
  return localMedia.sort((a, b) => 
    new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
  );
}

/**
 * Get all pending uploads
 */
export async function getPendingUploads(): Promise<MediaRecord[]> {
  return db.getPendingMedia();
}

/**
 * Get recent captures across all children
 */
export async function getRecentCaptures(limit = 20): Promise<MediaRecord[]> {
  const allMedia = await db.getAllMedia();
  
  return allMedia
    .sort((a, b) => 
      new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    )
    .slice(0, limit);
}

/**
 * Delete a media item (local and remote)
 */
export async function deleteCapture(id: string): Promise<void> {
  const media = await db.getMedia(id);
  
  if (!media) return;
  
  // Delete locally
  await db.deleteMedia(id);
  
  // If synced, delete from server too
  if (media.syncStatus === 'synced' && media.remotePath) {
    try {
      await fetch(`/api/montree/media/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete from server:', error);
      // Local delete succeeded, server delete failed - acceptable
    }
  }
}

/**
 * Get media by ID
 */
export async function getCapture(id: string): Promise<MediaRecord | undefined> {
  return db.getMedia(id);
}

/**
 * Check if system is ready for captures
 */
export function isReady(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * Get sync status summary
 */
export function getStatus() {
  return getSyncState();
}
