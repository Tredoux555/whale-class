/**
 * scripts/curriculum/lib/chrome.mjs — find a Chrome, print a PDF, refuse to lie.
 *
 * Same contract as build-week.mjs, including its hard-won guard: Chrome can exit
 * 0 and still write nothing (disk full, renderer crash), and a 0-byte PDF once
 * got logged as a success. A missing or empty file is an error, always.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

function glob1(dir, match, tail) {
  try {
    for (const name of fs.readdirSync(dir).sort().reverse()) {
      if (!match.test(name)) continue;
      const p = path.join(dir, name, ...tail);
      if (fs.existsSync(p)) return p;
    }
  } catch { /* not present */ }
  return null;
}

/** Locate a usable Chrome/Chromium, or null. */
export function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;

  const fixed = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  for (const c of fixed) if (fs.existsSync(c)) return c;

  // Playwright-managed builds (this is what a cloud sandbox usually has).
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers',
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
  ];
  for (const root of roots) {
    const hit = glob1(root, /^chromium-\d+$/, ['chrome-linux', 'chrome'])
      || glob1(root, /^chromium-\d+$/, ['chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'])
      || glob1(root, /^chromium_headless_shell-\d+$/, ['chrome-linux', 'headless_shell']);
    if (hit) return hit;
  }
  return null;
}

/** Render a local HTML file to PDF. Throws with Chrome's own reason on failure. */
export function htmlToPdf(chrome, htmlPath, pdfPath, { timeout = 120000 } = {}) {
  try { fs.rmSync(pdfPath, { force: true }); } catch { /* ignore */ }

  const r = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=10000',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ], { stdio: ['ignore', 'ignore', 'pipe'], timeout, encoding: 'utf8' });

  if (r.error) throw r.error;

  const size = fs.existsSync(pdfPath) ? fs.statSync(pdfPath).size : 0;
  if (size === 0) {
    const reason = String(r.stderr || '')
      .split('\n')
      .filter((l) => /ERROR|space|Failed|allocat|crash/i.test(l))
      .slice(-2).join(' | ')
      .trim() || `chrome exited ${r.status} with no output`;
    throw new Error(`0-byte PDF — ${reason}`);
  }
  return size;
}
