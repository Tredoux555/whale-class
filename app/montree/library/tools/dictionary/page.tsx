// /montree/library/tools/dictionary/page.tsx
// Redirect straight to the static HTML tool
import { redirect } from 'next/navigation';

export default function DictionaryToolPage() {
  redirect('/tools/my-first-dictionary.html');
}
