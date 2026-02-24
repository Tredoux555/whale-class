// /montree/library/tools/bingo/page.tsx
// Redirect straight to the static HTML tool
import { redirect } from 'next/navigation';

export default function BingoToolPage() {
  redirect('/tools/bingo-generator.html');
}
