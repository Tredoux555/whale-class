import type { Metadata, Viewport } from "next";
import { Inter, Lora } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Lora is the canonical Montree serif for school identity / hero text. Was
// loaded via inline `@import url('fonts.googleapis.com')` in 4 places (admin
// layout, super-admin page, montree landing, for-teachers) — each of those
// blocked first paint until the font CSS fetched. Centralising here means
// Next preloads the font at build time, the bytes land in the HTML head, and
// every page that references `var(--font-lora)` paints with the right
// glyph without a render-blocking waterfall.
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-lora",
  display: "swap",
});

// Domain-aware metadata — serves correct branding per domain
export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const hostname = headersList.get("x-hostname") || headersList.get("host") || "";
  const isTeacherPotato = hostname.includes("teacherpotato.xyz");

  if (isTeacherPotato) {
    // Whale Class branding for teacherpotato.xyz
    return {
      title: {
        default: "Whale Class — Montessori Learning Videos",
        template: "%s | Whale Class",
      },
      description:
        "Weekly songs, phonics videos, and stories for Montessori learners. A parent-facing video platform for Whale Class kindergarten.",
      metadataBase: new URL("https://www.teacherpotato.xyz"),
      openGraph: {
        title: "Whale Class — Montessori Learning Videos",
        description:
          "Weekly songs, phonics videos, and stories for Montessori learners.",
        url: "https://www.teacherpotato.xyz",
        siteName: "Whale Class",
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Whale Class — Montessori Learning Videos",
        description:
          "Weekly songs, phonics videos, and stories for Montessori learners.",
      },
      alternates: {
        canonical: "https://www.teacherpotato.xyz",
      },
      robots: {
        index: true,
        follow: true,
      },
      icons: {
        icon: [
          { url: "/favicon.ico", sizes: "any" },
          { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
          { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
          { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
        ],
        shortcut: ["/favicon.ico"],
        apple: [
          { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        ],
      },
    };
  }

  // Montree branding for montree.xyz (default)
  return {
    title: {
      default: "Montree — Montessori Classroom Management",
      template: "%s | Montree",
    },
    description:
      "Track children's Montessori progress, manage classrooms, and share reports with parents. Built for Montessori teachers, schools, and homeschool families.",
    metadataBase: new URL("https://montree.xyz"),
    openGraph: {
      title: "Montree — Montessori Classroom Management",
      description:
        "Track children's Montessori progress, manage classrooms, and share reports with parents. Built for Montessori teachers, schools, and homeschool families.",
      url: "https://montree.xyz",
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
        "Track children's Montessori progress, manage classrooms, and share reports with parents.",
      images: ["https://montree.xyz/og-image.png"],
    },
    alternates: {
      canonical: "https://montree.xyz",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      shortcut: ["/favicon.ico"],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/manifest.json",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#10B981",
};

// JSON-LD structured data for Google rich results (Montree only)
// Whale Class doesn't need JSON-LD since it's a simpler video site
const montreeJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Montree",
  description:
    "Montessori classroom management platform. Track children's progress, manage students, generate reports, and share with parents.",
  url: "https://montree.xyz",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free trial available",
  },
  author: {
    "@type": "Organization",
    name: "Montree",
    url: "https://montree.xyz",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const hostname = headersList.get("x-hostname") || headersList.get("host") || "";
  const isTeacherPotato = hostname.includes("teacherpotato.xyz");

  return (
    <html lang="en">
      <body className={`${inter.variable} ${lora.variable} antialiased`}>
        {!isTeacherPotato && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(montreeJsonLd) }}
          />
        )}
        {children}
      </body>
    </html>
  );
}
