/**
 * DarkPhonicsAppQr — a static, scannable QR code for
 * https://montree.xyz/dark-phonics-app (this page pointing at itself), so the
 * download page can be printed on a poster or screenshotted into a WeChat
 * moment and still lead somewhere.
 *
 * WHY THE PATH IS HARD-CODED
 * The module matrix below was generated ONCE, offline, with the `qrcode` npm
 * package (version 3 symbol, error-correction level M, 29x29 modules + a
 * 2-module quiet zone → a 33x33 viewBox) and the resulting SVG was rasterised
 * and decoded back to verify it reads as the exact URL. Inlining the result
 * keeps `qrcode` OUT of montree's runtime dependencies — this is one constant
 * string for one constant URL, not a feature that needs a library.
 *
 * TO REGENERATE (only if the URL changes):
 *   npx -y qrcode --version 2>/dev/null   # or: npm i qrcode
 *   node -e "const q=require('qrcode').create('https://montree.xyz/dark-phonics-app',{errorCorrectionLevel:'M'});..."
 * …emitting one horizontal run per `M x y h n v1 h-n z` group, offset by the
 * 2-module margin. Regenerate the viewBox with it: dim = modules + 2*margin.
 *
 * Pure presentational server component — no hooks, no client bundle.
 */

/** 29 modules + 2-module quiet zone on each side. */
const QR_VIEWBOX = 33;

/** Foreground modules of https://montree.xyz/dark-phonics-app (ECC level M). */
const QR_PATH =
  'M2 2h7v1h-7zM11 2h2v1h-2zM14 2h2v1h-2zM17 2h1v1h-1zM21 2h2v1h-2zM24 2h7v1h-7zM2 3h1v1h-1zM8 3h1v1h-1'
  + 'zM11 3h7v1h-7zM19 3h2v1h-2zM22 3h1v1h-1zM24 3h1v1h-1zM30 3h1v1h-1zM2 4h1v1h-1zM4 4h3v1h-3zM8 4h1v1h-'
  + '1zM10 4h2v1h-2zM15 4h1v1h-1zM17 4h1v1h-1zM20 4h1v1h-1zM24 4h1v1h-1zM26 4h3v1h-3zM30 4h1v1h-1zM2 5h1v'
  + '1h-1zM4 5h3v1h-3zM8 5h1v1h-1zM10 5h1v1h-1zM13 5h1v1h-1zM16 5h4v1h-4zM24 5h1v1h-1zM26 5h3v1h-3zM30 5h'
  + '1v1h-1zM2 6h1v1h-1zM4 6h3v1h-3zM8 6h1v1h-1zM10 6h2v1h-2zM13 6h1v1h-1zM18 6h5v1h-5zM24 6h1v1h-1zM26 6'
  + 'h3v1h-3zM30 6h1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h2v1h-2zM17 7h1v1h-1zM19 7h2v1h-2zM24 7h1v1h-1zM30'
  + ' 7h1v1h-1zM2 8h7v1h-7zM10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1z'
  + 'M22 8h1v1h-1zM24 8h7v1h-7zM10 9h2v1h-2zM16 9h2v1h-2zM22 9h1v1h-1zM2 10h1v1h-1zM4 10h5v1h-5zM11 10h1v'
  + '1h-1zM13 10h1v1h-1zM17 10h4v1h-4zM24 10h5v1h-5zM3 11h1v1h-1zM5 11h1v1h-1zM9 11h1v1h-1zM13 11h1v1h-1z'
  + 'M15 11h2v1h-2zM18 11h5v1h-5zM24 11h3v1h-3zM30 11h1v1h-1zM2 12h7v1h-7zM12 12h1v1h-1zM14 12h5v1h-5zM22'
  + ' 12h2v1h-2zM26 12h1v1h-1zM2 13h1v1h-1zM9 13h1v1h-1zM11 13h1v1h-1zM15 13h1v1h-1zM17 13h1v1h-1zM21 13h'
  + '7v1h-7zM29 13h1v1h-1zM2 14h1v1h-1zM4 14h3v1h-3zM8 14h1v1h-1zM12 14h1v1h-1zM14 14h1v1h-1zM16 14h2v1h-'
  + '2zM19 14h1v1h-1zM21 14h1v1h-1zM25 14h1v1h-1zM27 14h2v1h-2zM7 15h1v1h-1zM10 15h2v1h-2zM13 15h2v1h-2zM'
  + '18 15h1v1h-1zM21 15h1v1h-1zM23 15h4v1h-4zM30 15h1v1h-1zM2 16h2v1h-2zM8 16h2v1h-2zM11 16h1v1h-1zM13 1'
  + '6h2v1h-2zM17 16h2v1h-2zM20 16h1v1h-1zM27 16h2v1h-2zM2 17h2v1h-2zM6 17h1v1h-1zM11 17h1v1h-1zM13 17h2v'
  + '1h-2zM16 17h3v1h-3zM20 17h2v1h-2zM25 17h1v1h-1zM29 17h1v1h-1zM2 18h1v1h-1zM5 18h1v1h-1zM7 18h3v1h-3z'
  + 'M11 18h3v1h-3zM19 18h1v1h-1zM21 18h2v1h-2zM27 18h2v1h-2zM2 19h1v1h-1zM5 19h2v1h-2zM15 19h2v1h-2zM19 '
  + '19h8v1h-8zM28 19h1v1h-1zM30 19h1v1h-1zM2 20h1v1h-1zM4 20h2v1h-2zM8 20h1v1h-1zM11 20h3v1h-3zM15 20h4v'
  + '1h-4zM20 20h1v1h-1zM22 20h1v1h-1zM25 20h1v1h-1zM28 20h1v1h-1zM2 21h1v1h-1zM4 21h3v1h-3zM11 21h3v1h-3'
  + 'zM15 21h1v1h-1zM20 21h1v1h-1zM25 21h1v1h-1zM29 21h1v1h-1zM2 22h1v1h-1zM4 22h5v1h-5zM12 22h1v1h-1zM16'
  + ' 22h4v1h-4zM21 22h6v1h-6zM28 22h3v1h-3zM10 23h1v1h-1zM14 23h1v1h-1zM18 23h5v1h-5zM26 23h5v1h-5zM2 24'
  + 'h7v1h-7zM11 24h1v1h-1zM13 24h2v1h-2zM17 24h3v1h-3zM21 24h2v1h-2zM24 24h1v1h-1zM26 24h3v1h-3zM2 25h1v'
  + '1h-1zM8 25h1v1h-1zM10 25h2v1h-2zM14 25h1v1h-1zM16 25h1v1h-1zM21 25h2v1h-2zM26 25h1v1h-1zM29 25h1v1h-'
  + '1zM2 26h1v1h-1zM4 26h3v1h-3zM8 26h1v1h-1zM10 26h1v1h-1zM13 26h1v1h-1zM17 26h1v1h-1zM19 26h1v1h-1zM22'
  + ' 26h5v1h-5zM28 26h1v1h-1zM2 27h1v1h-1zM4 27h3v1h-3zM8 27h1v1h-1zM10 27h2v1h-2zM13 27h1v1h-1zM16 27h1'
  + 'v1h-1zM18 27h3v1h-3zM23 27h1v1h-1zM27 27h4v1h-4zM2 28h1v1h-1zM4 28h3v1h-3zM8 28h1v1h-1zM10 28h1v1h-1'
  + 'zM12 28h1v1h-1zM14 28h2v1h-2zM17 28h3v1h-3zM22 28h8v1h-8zM2 29h1v1h-1zM8 29h1v1h-1zM13 29h1v1h-1zM15'
  + ' 29h1v1h-1zM17 29h1v1h-1zM20 29h3v1h-3zM24 29h4v1h-4zM29 29h1v1h-1zM2 30h7v1h-7zM10 30h1v1h-1zM12 30'
  + 'h4v1h-4zM19 30h1v1h-1zM21 30h1v1h-1zM23 30h3v1h-3zM28 30h1v1h-1z';

export default function DarkPhonicsAppQr({ size = 148 }: { size?: number }) {
  return (
    <svg
      viewBox={`0 0 ${QR_VIEWBOX} ${QR_VIEWBOX}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label="扫码打开下载页 Scan to open the download page"
      className="rounded-[var(--dpl-r-sm)]"
    >
      {/* The cream from the Midnight Studio slide surface — a QR needs a light,
          high-contrast quiet zone to scan, so this rect is load-bearing. */}
      <rect width={QR_VIEWBOX} height={QR_VIEWBOX} fill="var(--dpl-slide-bg)" />
      <path d={QR_PATH} fill="var(--dpl-slide-ink)" />
    </svg>
  );
}
