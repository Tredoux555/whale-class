// app/montree/library/tools/cvc-bingo/page.tsx
// CVC Bingo is an ADD-ON to the phonics bingo pipeline, not its own tool —
// same boards, same duplex calling cards (picture front, word back).
import { redirect } from 'next/navigation';

export default function CvcBingoPage() {
  redirect('/montree/library/tools/phonics-fast/bingo?source=cvc');
}
