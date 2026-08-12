'use client';

// components/cms/documents/PrintButton.tsx
// The ONE piece of client JavaScript on a document page. `window.print()` has
// no server-side equivalent and no declarative HTML form, so this is the whole
// island: no state, no effects, no data. Everything around it — the paper, the
// rows, the header — stays a server component.

import { PrinterIcon } from '@/components/cms/icons';
import { useT } from '@/lib/cms/i18n/provider';

export function PrintButton() {
  const t = useT();
  return (
    <button
      type="button"
      className="cms-btn cms-btn-primary cms-btn-md"
      onClick={() => window.print()}
    >
      <PrinterIcon />
      {t('teacher.documents.print')}
    </button>
  );
}
