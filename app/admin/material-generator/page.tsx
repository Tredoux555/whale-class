// app/admin/material-generator/page.tsx
// Material Generator Page

import MaterialGenerator from '@/components/materials/MaterialGenerator';

export const metadata = {
  title: 'Material Generator | Whale Montessori',
  description: 'Generate printable Montessori language materials',
};

export default function MaterialGeneratorPage() {
  return (
    <div style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      <MaterialGenerator />
    </div>
  );
}

