// resources/gen-assets.mjs
// Rasterize the brand SVGs to the master PNGs that @capacitor/assets consumes
// (resources/icon.png 1024x1024, resources/splash.png 2732x2732) plus a 1024
// App Store marketing icon. Run: node resources/gen-assets.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const icon = readFileSync(new URL('./icon-master.svg', import.meta.url));
const splash = readFileSync(new URL('./splash-master.svg', import.meta.url));

await sharp(icon).resize(1024, 1024).png().toFile(new URL('./icon.png', import.meta.url).pathname);
await sharp(splash).resize(2732, 2732).png().toFile(new URL('./splash.png', import.meta.url).pathname);
// Dark splash variant (same — brand bg is already dark)
await sharp(splash).resize(2732, 2732).png().toFile(new URL('./splash-dark.png', import.meta.url).pathname);

console.log('✅ wrote resources/icon.png (1024), splash.png + splash-dark.png (2732)');
