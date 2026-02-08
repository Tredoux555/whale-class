import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
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
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#10B981",
};

// JSON-LD structured data for Google rich results
const jsonLd = {
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
