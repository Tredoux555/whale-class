import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className={`${inter.variable} antialiased`}>
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
