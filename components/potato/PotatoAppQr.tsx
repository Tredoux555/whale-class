/**
 * PotatoAppQr — a static, scannable QR code for
 * https://montree.xyz/potato-app (this page pointing at itself), so the
 * download page can be printed for the staff room or screenshotted into a chat
 * and still lead somewhere.
 *
 * WHY THE PATH IS HARD-CODED
 * The module matrix below was generated ONCE, offline, with the `qrcode` npm
 * package (version 3 symbol, error-correction level M, 29x29 modules + a
 * 2-module quiet zone → a 33x33 viewBox). The generated path was then painted
 * back into a bitmap and decoded with `jsqr`, which read it as exactly
 * "https://montree.xyz/potato-app" — so this constant is verified, not
 * assumed. Inlining the result keeps `qrcode` OUT of montree's runtime
 * dependencies: this is one constant string for one constant URL, not a
 * feature that needs a library.
 *
 * TO REGENERATE (only if the URL changes):
 *   npm i qrcode  # in a scratch dir, NOT in montree
 *   node -e "const q=require('qrcode').create(URL,{errorCorrectionLevel:'M'});…"
 * …emitting one horizontal run per `M x y h n v1 h-n z` group, offset by the
 * 2-module margin. Regenerate the viewBox with it: dim = modules + 2*margin,
 * and decode the result before committing it.
 *
 * Pure presentational server component — no hooks, no client bundle.
 */

/** 29 modules + 2-module quiet zone on each side. */
const QR_VIEWBOX = 33;

/** Foreground modules of https://montree.xyz/potato-app (ECC level M). */
const QR_PATH =
  'M2 2h7v1h-7zM13 2h1v1h-1zM15 2h3v1h-3zM21 2h2v1h-2zM24 2h7v1h-7zM2 3h1v1h-1zM8 3h1v1h-1zM11 3h1v1h-1zM13 3h1'
  + 'v1h-1zM15 3h4v1h-4zM22 3h1v1h-1zM24 3h1v1h-1zM30 3h1v1h-1zM2 4h1v1h-1zM4 4h3v1h-3zM8 4h1v1h-1zM10 4h4v1h-4zM'
  + '15 4h1v1h-1zM17 4h1v1h-1zM20 4h3v1h-3zM24 4h1v1h-1zM26 4h3v1h-3zM30 4h1v1h-1zM2 5h1v1h-1zM4 5h3v1h-3zM8 5h1v'
  + '1h-1zM10 5h1v1h-1zM16 5h2v1h-2zM19 5h1v1h-1zM21 5h1v1h-1zM24 5h1v1h-1zM26 5h3v1h-3zM30 5h1v1h-1zM2 6h1v1h-1z'
  + 'M4 6h3v1h-3zM8 6h1v1h-1zM10 6h2v1h-2zM13 6h2v1h-2zM17 6h2v1h-2zM20 6h3v1h-3zM24 6h1v1h-1zM26 6h3v1h-3zM30 6h'
  + '1v1h-1zM2 7h1v1h-1zM8 7h1v1h-1zM10 7h1v1h-1zM13 7h1v1h-1zM20 7h1v1h-1zM24 7h1v1h-1zM30 7h1v1h-1zM2 8h7v1h-7z'
  + 'M10 8h1v1h-1zM12 8h1v1h-1zM14 8h1v1h-1zM16 8h1v1h-1zM18 8h1v1h-1zM20 8h1v1h-1zM22 8h1v1h-1zM24 8h7v1h-7zM10 '
  + '9h3v1h-3zM16 9h1v1h-1zM18 9h1v1h-1zM2 10h1v1h-1zM4 10h5v1h-5zM11 10h1v1h-1zM14 10h1v1h-1zM18 10h2v1h-2zM22 1'
  + '0h1v1h-1zM24 10h5v1h-5zM2 11h1v1h-1zM4 11h1v1h-1zM6 11h1v1h-1zM9 11h1v1h-1zM12 11h2v1h-2zM15 11h3v1h-3zM21 1'
  + '1h2v1h-2zM24 11h3v1h-3zM30 11h1v1h-1zM3 12h2v1h-2zM7 12h4v1h-4zM13 12h6v1h-6zM22 12h2v1h-2zM26 12h1v1h-1zM4 '
  + '13h1v1h-1zM6 13h2v1h-2zM10 13h3v1h-3zM14 13h2v1h-2zM17 13h1v1h-1zM20 13h8v1h-8zM29 13h1v1h-1zM5 14h1v1h-1zM7'
  + ' 14h2v1h-2zM11 14h1v1h-1zM16 14h2v1h-2zM19 14h1v1h-1zM21 14h1v1h-1zM25 14h1v1h-1zM27 14h2v1h-2zM2 15h1v1h-1z'
  + 'M5 15h2v1h-2zM9 15h1v1h-1zM11 15h3v1h-3zM17 15h5v1h-5zM23 15h4v1h-4zM30 15h1v1h-1zM5 16h1v1h-1zM8 16h1v1h-1z'
  + 'M13 16h2v1h-2zM19 16h1v1h-1zM27 16h2v1h-2zM4 17h2v1h-2zM10 17h1v1h-1zM12 17h2v1h-2zM16 17h1v1h-1zM18 17h1v1h'
  + '-1zM21 17h1v1h-1zM25 17h1v1h-1zM29 17h1v1h-1zM3 18h1v1h-1zM6 18h1v1h-1zM8 18h2v1h-2zM12 18h1v1h-1zM18 18h5v1'
  + 'h-5zM27 18h2v1h-2zM2 19h1v1h-1zM4 19h1v1h-1zM12 19h1v1h-1zM15 19h3v1h-3zM19 19h8v1h-8zM28 19h1v1h-1zM30 19h1'
  + 'v1h-1zM2 20h1v1h-1zM4 20h1v1h-1zM8 20h3v1h-3zM15 20h4v1h-4zM22 20h1v1h-1zM25 20h1v1h-1zM28 20h1v1h-1zM2 21h1'
  + 'v1h-1zM6 21h2v1h-2zM11 21h1v1h-1zM15 21h1v1h-1zM17 21h1v1h-1zM25 21h1v1h-1zM29 21h1v1h-1zM2 22h1v1h-1zM5 22h'
  + '5v1h-5zM14 22h1v1h-1zM16 22h2v1h-2zM19 22h1v1h-1zM21 22h6v1h-6zM28 22h3v1h-3zM10 23h5v1h-5zM17 23h2v1h-2zM20'
  + ' 23h3v1h-3zM26 23h5v1h-5zM2 24h7v1h-7zM11 24h1v1h-1zM13 24h1v1h-1zM20 24h3v1h-3zM24 24h1v1h-1zM26 24h3v1h-3z'
  + 'M2 25h1v1h-1zM8 25h1v1h-1zM10 25h5v1h-5zM16 25h1v1h-1zM18 25h1v1h-1zM21 25h2v1h-2zM26 25h1v1h-1zM29 25h2v1h-'
  + '2zM2 26h1v1h-1zM4 26h3v1h-3zM8 26h1v1h-1zM10 26h1v1h-1zM13 26h2v1h-2zM19 26h1v1h-1zM22 26h5v1h-5zM28 26h1v1h'
  + '-1zM30 26h1v1h-1zM2 27h1v1h-1zM4 27h3v1h-3zM8 27h1v1h-1zM10 27h1v1h-1zM13 27h5v1h-5zM23 27h1v1h-1zM27 27h2v1'
  + 'h-2zM2 28h1v1h-1zM4 28h3v1h-3zM8 28h1v1h-1zM10 28h3v1h-3zM15 28h1v1h-1zM17 28h1v1h-1zM20 28h1v1h-1zM22 28h8v'
  + '1h-8zM2 29h1v1h-1zM8 29h1v1h-1zM12 29h6v1h-6zM20 29h3v1h-3zM24 29h4v1h-4zM29 29h1v1h-1zM2 30h7v1h-7zM10 30h1'
  + 'v1h-1zM14 30h2v1h-2zM17 30h3v1h-3zM21 30h1v1h-1zM23 30h3v1h-3zM28 30h1v1h-1z';

export default function PotatoAppQr({ size = 150 }: { size?: number }) {
  return (
    <svg
      viewBox={`0 0 ${QR_VIEWBOX} ${QR_VIEWBOX}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Scan to open the Potato Snaps download page"
      style={{ display: 'block', borderRadius: 12 }}
    >
      {/* Potato Snaps paper white, not the page cream: a QR needs a light,
          high-contrast quiet zone to scan, so this rect is load-bearing. */}
      <rect width={QR_VIEWBOX} height={QR_VIEWBOX} fill="#FFFFFF" />
      <path d={QR_PATH} fill="#23395B" />
    </svg>
  );
}
