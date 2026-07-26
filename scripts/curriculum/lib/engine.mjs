/**
 * scripts/curriculum/lib/engine.mjs — load the shared render engine, anywhere.
 *
 * build-week.mjs esbuild-bundles render/index.ts on every run. That is fine on
 * the Mac and nowhere else: esbuild ships a platform-native binary, so the same
 * node_modules cannot bundle from a Linux VM ("Exec format error"), and esbuild
 * is not even declared in package.json.
 *
 * So: bundle ONCE to scripts/curriculum/dist/render-engine.mjs and commit it.
 *   • bundle present and newer than every render source → import it. No esbuild,
 *     no platform binary, works from any machine.
 *   • sources newer, or no bundle → rebuild, pointing esbuild at the binary that
 *     matches THIS platform, and refresh the committed bundle.
 *
 * The engine itself is imported unchanged. This module only gets it loaded.
 */

import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const RENDER_REL = ['lib', 'montree', 'english-curriculum', 'render'];
const SPEC_REL = ['lib', 'montree', 'english-curriculum', 'spec'];

export function enginePaths(repoRoot) {
  return {
    entry: path.join(repoRoot, ...RENDER_REL, 'index.ts'),
    renderDir: path.join(repoRoot, ...RENDER_REL),
    specDir: path.join(repoRoot, ...SPEC_REL),
    dist: path.join(repoRoot, 'scripts', 'curriculum', 'dist', 'render-engine.mjs'),
  };
}

function newestMtime(dir, exts = ['.ts', '.json']) {
  let newest = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { stack.push(p); continue; }
      if (!exts.includes(path.extname(e.name))) continue;
      try { newest = Math.max(newest, fs.statSync(p).mtimeMs); } catch { /* ignore */ }
    }
  }
  return newest;
}

/** Point esbuild at the binary for the platform we are actually running on. */
function prepareEsbuildBinary(repoRoot) {
  if (process.env.ESBUILD_BINARY_PATH && fs.existsSync(process.env.ESBUILD_BINARY_PATH)) return;
  const plat = `${process.platform}-${process.arch === 'x64' ? 'x64' : process.arch}`;
  const candidate = path.join(repoRoot, 'node_modules', '@esbuild', plat, 'bin', 'esbuild');
  if (fs.existsSync(candidate)) process.env.ESBUILD_BINARY_PATH = candidate;
}

async function bundle(repoRoot, paths) {
  prepareEsbuildBinary(repoRoot);
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    throw new Error(
      'The render bundle is stale and esbuild is not available to rebuild it.\n'
      + `  Expected bundle: ${paths.dist}\n`
      + '  Fix: run this on the Mac once (npm i -D esbuild) to refresh the committed bundle.',
    );
  }
  fs.mkdirSync(path.dirname(paths.dist), { recursive: true });
  await esbuild.build({
    entryPoints: [paths.entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    outfile: paths.dist,
    // NOT packages:'external' (what build-week.mjs uses). The engine statically
    // imports qrcode, so an external build cannot even be loaded without a
    // healthy node_modules next to it. Inlining makes the committed bundle
    // self-contained: node built-ins stay external, everything else comes along.
    alias: { '@': repoRoot },
    // qrcode is CommonJS and does `require('fs')` at load. Bundled into an ESM
    // output that call has no `require` in scope, so give it a real one.
    banner: {
      js: "import { createRequire as __makeRequire } from 'module';\n"
        + 'const require = __makeRequire(import.meta.url);',
    },
    logLevel: 'error',
  });
  return paths.dist;
}

/**
 * Import the render engine, rebuilding the committed bundle only when the
 * TypeScript sources have moved on.
 */
export async function loadEngine(repoRoot, { force = false } = {}) {
  const paths = enginePaths(repoRoot);
  if (!fs.existsSync(paths.entry)) {
    throw new Error(`Render engine not found at ${paths.entry} — is this the montree repo?`);
  }

  const distMtime = fs.existsSync(paths.dist) ? fs.statSync(paths.dist).mtimeMs : 0;
  const srcMtime = Math.max(newestMtime(paths.renderDir), newestMtime(paths.specDir, ['.ts']));
  const stale = force || distMtime === 0 || distMtime < srcMtime;

  let built = false;
  if (stale) { await bundle(repoRoot, paths); built = true; }

  // Cache-bust so a rebuild inside one process is actually picked up.
  const engine = await import(`${pathToFileURL(paths.dist).href}?v=${fs.statSync(paths.dist).mtimeMs}`);
  return { engine, rebuilt: built, bundlePath: paths.dist };
}
