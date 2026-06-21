'use client';

// Prepare an attached image for the coach to READ (vision). Phone photos are
// huge, so we cap the long edge at ~1568px (Claude's recommended max) and
// JPEG-encode to keep the payload small + fast. Returns base64 (no data: prefix)
// for the API + a preview data URL for the chat bubble.

export interface CoachImage {
  media_type: string;
  data: string;       // base64, no prefix
  previewUrl: string; // data URL for the bubble thumbnail
}

const MAX_EDGE = 1568;

export async function fileToCoachImage(file: File): Promise<CoachImage | null> {
  if (!file || !file.type.startsWith('image/')) return null;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result || ''));
    fr.onerror = () => reject(new Error('Could not read that file'));
    fr.readAsDataURL(file);
  });

  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not open that image'));
      i.src = dataUrl;
    });
  } catch {
    // Can't decode for downscale — fall back to the original bytes (capped by the
    // server's size guard). Strip the data: prefix.
    const comma = dataUrl.indexOf(',');
    const meta = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mt = /data:([^;]+)/.exec(meta)?.[1] || file.type;
    return { media_type: mt, data: b64, previewUrl: dataUrl };
  }

  const longest = Math.max(img.width, img.height) || 1;
  const scale = Math.min(1, MAX_EDGE / longest);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const comma = dataUrl.indexOf(',');
    const meta = dataUrl.slice(0, comma);
    const b64 = dataUrl.slice(comma + 1);
    const mt = /data:([^;]+)/.exec(meta)?.[1] || file.type;
    return { media_type: mt, data: b64, previewUrl: dataUrl };
  }
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL('image/jpeg', 0.85);
  return { media_type: 'image/jpeg', data: out.split(',')[1] || '', previewUrl: out };
}
