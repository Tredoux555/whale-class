// /montree/layout.tsx
// Montree PWA layout with manifest for "Add to Home Screen"
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Montree",
  description: "Montessori progress tracking for teachers",
  manifest: "/montree-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Montree",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10b981",
};

export default function MontreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
