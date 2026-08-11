'use client';

// Default whale-emblem art shipped with the Tracing Work tool — used whenever
// a teacher doesn't upload their own logo. See public/tools/tracing-work/.
const DEFAULT_LOGO_URL = '/tools/tracing-work/default-logo.png';
const DEFAULT_WATERMARK_URL = '/tools/tracing-work/default-watermark.png';

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return res.arrayBuffer();
}

export async function loadDefaultLogo(): Promise<ArrayBuffer> {
  return fetchBytes(DEFAULT_LOGO_URL);
}

export async function loadDefaultWatermark(): Promise<ArrayBuffer> {
  return fetchBytes(DEFAULT_WATERMARK_URL);
}

export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
