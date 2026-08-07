// app/potato/page.tsx — the front door.
// Two buttons. A teacher and a parent are looking for different things and
// should never have to read a paragraph to find out which one they are.

import Link from 'next/link';
import { Mascot } from '@/components/potato/PotatoBits';

export default function PotatoHomePage() {
  return (
    <div className="pt-app">
      <div className="pt-login">
        <div className="pt-halo">
          <Mascot size={150} shadow={false} />
        </div>
        <h1 className="pt-wordmark">Potato Snaps</h1>
        <div className="pt-wordrule" />
        <p className="pt-logintag">{'Little films of your child’s week'}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 300 }}>
          <Link href="/potato/teacher/login" className="pt-btn pt-btn--primary pt-btn--lg" style={{ textDecoration: 'none' }}>
            {'I’m a Teacher'}
          </Link>
          <Link href="/potato/parents" className="pt-btn pt-btn--blue pt-btn--lg" style={{ textDecoration: 'none' }}>
            {'I’m a Parent'}
          </Link>
        </div>

        <div className="pt-byline">Teacher Potato</div>
      </div>
    </div>
  );
}
