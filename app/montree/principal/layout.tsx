// app/montree/principal/layout.tsx
// Principal pages layout

import PushRegistrar from '@/components/montree/PushRegistrar';

export default function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PushRegistrar />
    </>
  );
}
