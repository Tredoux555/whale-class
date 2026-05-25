import Link from 'next/link';
import type { Metadata } from 'next';
import LanguageToggle from '@/components/montree/LanguageToggle';

// /montree/about — Montree Limited corporate identity / About page.
//
// Server component so we can export Metadata + ship Schema.org Organization
// JSON-LD inline. Built to match the landing-page (/montree) visual aesthetic:
// dark-forest gradient, Lora serif headings, gold accent on labels and the
// M monogram. No scroll-reveal animations here — the page is static credibility
// content, doesn't benefit from progressive disclosure.
//
// English-only in v1. i18n via useI18n() can be added later if/when this page
// becomes a translation priority. SEO and Google entity-graph signals work
// fine in English alone.

export const metadata: Metadata = {
  title: 'About Montree — Montessori School Management Platform',
  description:
    'Montree is a Montessori school management platform built by a practicing AMS-certified Montessori teacher. Operated by Montree Limited, Hong Kong SAR.',
  alternates: {
    canonical: 'https://montree.xyz/montree/about',
  },
  openGraph: {
    title: 'About Montree — Montessori School Management Platform',
    description:
      'Built by a practicing AMS-certified Montessori teacher. Operated by Montree Limited, Hong Kong SAR.',
    url: 'https://montree.xyz/montree/about',
    siteName: 'Montree',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: 'https://montree.xyz/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Montree — Montessori School Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Montree — Montessori School Management Platform',
    description:
      'Built by a practicing AMS-certified Montessori teacher. Operated by Montree Limited, Hong Kong SAR.',
    images: ['https://montree.xyz/og-image.png'],
  },
  robots: { index: true, follow: true },
};

// Schema.org Organization JSON-LD.
// Polish items applied per Browser Claude review:
//   - addressRegion dropped (HK has no separate regions)
//   - addressLocality set to "Hong Kong"
//   - legalName field added alongside name + alternateName for Google's
//     entity-graph trading-name vs legal-entity disambiguation
// BRN 80261361 carried under identifier as a Schema.org PropertyValue.
// CR (Certificate of Incorporation) number to be added later as a second
// identifier once the Vistra paperwork is in hand.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Montree Limited',
  legalName: 'Montree Limited',
  alternateName: 'Montree',
  url: 'https://montree.xyz',
  logo: 'https://montree.xyz/logo-1024.png',
  founder: {
    '@type': 'Person',
    name: 'Tredoux Willemse',
    jobTitle: 'AMS-certified Montessori Young Learner Specialist',
  },
  foundingDate: '2026-04-23',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Flat/RM 1911, Lee Garden One, 33 Hysan Avenue',
    addressLocality: 'Hong Kong',
    addressCountry: 'HK',
  },
  email: 'hello@montree.xyz',
  identifier: [
    {
      '@type': 'PropertyValue',
      propertyID: 'Hong Kong Business Registration Number',
      value: '80261361',
    },
  ],
};

const ABOUT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }

  .m-about-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    background: rgba(8,26,18,0.62);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    /* Edge-to-edge iPhones: pad past the status bar. env() = 0 elsewhere. */
    padding-top: env(safe-area-inset-top);
  }
  .m-about-nav-inner {
    max-width: 1180px;
    margin: 0 auto;
    padding: 16px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .m-about-logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: #ffffff;
    font-family: var(--font-lora), Georgia, serif;
    font-weight: 500;
    font-size: 1.0625rem;
    letter-spacing: -0.01em;
  }
  .m-about-logo-mark {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    background: #0a261a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(130,217,174,0.18);
    color: #E8C96A;
    font-family: var(--font-lora), Georgia, serif;
    font-weight: 500;
    font-size: 16px;
    line-height: 1;
    flex-shrink: 0;
  }
  .m-about-nav-link {
    font-size: 0.875rem;
    color: rgba(255,255,255,0.55);
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: color 200ms ease;
  }
  .m-about-nav-link:hover { color: rgba(255,255,255,0.9); }

  .m-about-hero {
    padding: 100px 32px 56px;
    text-align: center;
    max-width: 760px;
    margin: 0 auto;
  }
  .m-about-hero h1 {
    font-family: var(--font-lora), Georgia, serif;
    font-weight: 400;
    font-size: clamp(2.4rem, 5.6vw, 3.8rem);
    letter-spacing: -0.025em;
    color: #ffffff;
    line-height: 1.05;
    margin: 0;
  }

  .m-about-content {
    max-width: 760px;
    margin: 0 auto;
    padding: 0 32px 96px;
  }
  .m-about-content section {
    padding: 48px 0;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .m-about-content section:first-of-type {
    border-top: none;
    padding-top: 16px;
  }
  .m-about-content h2 {
    font-family: var(--font-lora), Georgia, serif;
    font-weight: 400;
    font-size: clamp(1.5rem, 3.2vw, 2rem);
    letter-spacing: -0.01em;
    color: #ffffff;
    margin: 0 0 22px 0;
    line-height: 1.2;
  }
  .m-about-content p {
    color: rgba(255,255,255,0.72);
    line-height: 1.85;
    font-size: 1.0625rem;
    margin: 0 0 18px 0;
  }
  .m-about-content p:last-child { margin-bottom: 0; }

  .m-about-facts {
    margin-top: 28px;
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 14px 28px;
    font-size: 0.9375rem;
  }
  .m-about-facts dt {
    color: rgba(232,201,106,0.88);
    font-weight: 500;
    letter-spacing: 0.005em;
    align-self: start;
  }
  .m-about-facts dd {
    color: rgba(255,255,255,0.86);
    line-height: 1.55;
    margin: 0;
  }
  .m-about-facts a {
    color: rgba(255,255,255,0.86);
    text-decoration: underline;
    text-decoration-color: rgba(255,255,255,0.25);
    text-underline-offset: 2px;
    transition: text-decoration-color 200ms ease;
  }
  .m-about-facts a:hover { text-decoration-color: rgba(232,201,106,0.7); }

  .m-about-footer {
    padding: 56px 32px 64px;
    text-align: center;
    color: rgba(255,255,255,0.28);
    font-size: 0.78rem;
    letter-spacing: 0.02em;
    border-top: 1px solid rgba(255,255,255,0.06);
  }
  .m-about-footer-inner {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .m-about-footer-mark {
    width: 16px;
    height: 16px;
    border-radius: 5px;
    background: #0a261a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(130,217,174,0.18);
    color: #E8C96A;
    font-family: var(--font-lora), Georgia, serif;
    font-weight: 500;
    font-size: 9px;
    line-height: 1;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .m-about-nav-inner { padding: 14px 20px; }
    .m-about-hero { padding: 70px 24px 40px; }
    .m-about-content { padding: 0 24px 64px; }
    .m-about-content section { padding: 40px 0; }
    .m-about-facts {
      grid-template-columns: 1fr;
      gap: 4px 0;
    }
    .m-about-facts dt {
      margin-top: 14px;
      font-size: 0.8125rem;
    }
    .m-about-facts dt:first-of-type { margin-top: 0; }
    .m-about-footer { padding: 40px 24px 48px; }
  }
`;

export default function AboutPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ABOUT_STYLES }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* Background gradient as a fixed div (matches /montree landing pattern
          so Next.js stacking context can't block it on certain browsers). */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          background: `
            radial-gradient(ellipse 1000px 800px at 78% 10%, rgba(39,129,90,0.55), rgba(39,129,90,0) 55%),
            radial-gradient(ellipse 600px 500px at 72% 16%, rgba(130,217,174,0.28), rgba(130,217,174,0) 60%),
            linear-gradient(155deg, #0c2419 0%, #0a1f16 38%, #081a12 70%, #06140e 100%)
          `,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Page content rides above the fixed gradient div. */}
      <div style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.85)' }}>
        <nav className="m-about-nav" aria-label="Primary">
          <div className="m-about-nav-inner">
            <Link className="m-about-logo" href="/montree" aria-label="Montree home">
              <span className="m-about-logo-mark" aria-hidden="true">M</span>
              <span>Montree</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Link className="m-about-nav-link" href="/montree/login-select">
                Log in
              </Link>
              <LanguageToggle />
            </div>
          </div>
        </nav>

        <header className="m-about-hero">
          <h1>About Montree</h1>
        </header>

        <main className="m-about-content">
          <section aria-label="What Montree is">
            <p>
              Montree is a school management platform built specifically for Montessori schools.
              It tracks each child&apos;s progress through the Montessori curriculum, captures
              observations directly from classroom photos, and produces the records parents and
              principals need — without forcing teachers to adapt to software designed for
              conventional schools.
            </p>
            <p>
              The platform is multi-tenant: a single school, a network of schools, or a
              homeschool can each run independently.
            </p>
          </section>

          <section aria-label="Built by a practicing Montessori teacher">
            <h2>Built by a practicing Montessori teacher</h2>
            <p>
              Montree is built by Tredoux Willemse, an AMS-certified Montessori Young Learner
              Specialist currently teaching a PreK 4 class in Beijing. Every feature in the
              platform comes from the gap between what a Montessori teacher actually needs in a
              classroom and what the existing software was built to do.
            </p>
            <p>
              The premise is simple: school management software for Montessori schools should be
              built by someone who teaches in one. What counts as a presentation, how a
              child&apos;s mastery is recorded, what a parent letter should sound like — these
              are pedagogical decisions, not engineering ones. Software built outside the
              classroom tends to get them wrong in ways that cost teachers time.
            </p>
          </section>

          <section aria-label="Company">
            <h2>Company</h2>
            <p>
              Montree is operated by Montree Limited, a limited company incorporated in the
              Hong Kong Special Administrative Region.
            </p>
            <dl className="m-about-facts">
              <dt>Legal name</dt>
              <dd>Montree Limited</dd>

              <dt>Jurisdiction</dt>
              <dd>Hong Kong SAR</dd>

              <dt>Business Registration Number</dt>
              <dd>80261361</dd>

              <dt>Founded</dt>
              <dd>23 April 2026</dd>

              <dt>Registered office</dt>
              <dd>
                Flat/RM 1911, Lee Garden One, 33 Hysan Avenue, Causeway Bay, Hong Kong
              </dd>

              <dt>Website</dt>
              <dd>
                <a href="https://montree.xyz">montree.xyz</a>
              </dd>

              <dt>Contact</dt>
              <dd>
                <a href="mailto:hello@montree.xyz">hello@montree.xyz</a>
              </dd>
            </dl>
          </section>
        </main>

        <footer className="m-about-footer">
          <div className="m-about-footer-inner">
            <span className="m-about-footer-mark" aria-hidden="true">M</span>
            <span>Montree · montree.xyz</span>
          </div>
        </footer>
      </div>
    </>
  );
}
