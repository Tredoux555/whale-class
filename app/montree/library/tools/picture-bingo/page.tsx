// /montree/library/tools/picture-bingo/page.tsx
// Redirect straight to the static HTML tool
import { redirect } from 'next/navigation';

export default function PictureBingoPage() {
  redirect('/tools/picture-bingo-generator.html');
}
