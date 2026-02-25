// /montree/layout.tsx — Session 158
// Montree PWA layout with manifest for "Add to Home Screen"
// Enhanced metadata for SEO + bilingual i18n provider
import type { Metadata, Viewport } from "next";
import I18nClientWrapper from "@/components/montree/I18nClientWrapper";

export const metadata: Metadata = {
  title: {
    default: "Montree — Montessori Classroom Management",
    template: "%s | Montree",
  },
  description:
    "Montessori classroom management platform for teachers and schools. Track progress, manage students, generate reports, and share with parents.",
  manifest: "/montree-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Montree",
  },
  openGraph: {
    title: "Montree — Montessori Classroom Management",
    description:
      "Montessori classroom management platform for teachers and schools. Track progress, manage students, generate reports, and share with parents.",
    url: "https://montree.xyz/montree",
    siteName: "Montree",
    images: [
      {
        url: "https://montree.xyz/og-image.png",
        width: 1200,
        height: 630,
        alt: "Montree — Montessori Classroom Management Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Montree — Montessori Classroom Management",
    description:
      "Montessori classroom management platform for teachers and schools. Track progress and share with parents.",
    images: ["https://montree.xyz/og-image.png"],
  },
  alternates: {
    canonical: "https://montree.xyz/montree",
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
  return (
    <I18nClientWrapper>
      {children}
    </I18nClientWrapper>
  );
}
