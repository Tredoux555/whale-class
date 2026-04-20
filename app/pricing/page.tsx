"use client";

export default function PricingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #ecfdf5 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '40px 24px 0',
        textAlign: 'center',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#065f46', letterSpacing: '-0.5px' }}>
          montree
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 800,
          color: '#111827',
          margin: '24px 0 12px',
          lineHeight: 1.1,
          letterSpacing: '-1px',
        }}>
          Choose your tier
        </h1>
        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 20px)',
          color: '#6b7280',
          maxWidth: 560,
          margin: '0 auto 48px',
          lineHeight: 1.5,
        }}>
          Every tier includes the full Montessori classroom platform.
          Pick how much intelligence you want behind it.
        </p>
      </header>

      {/* Pricing Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        maxWidth: 960,
        margin: '0 auto',
        padding: '0 24px 48px',
      }}>
        {/* SEED */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '36px 28px',
          border: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Seed
          </div>
          <div style={{ margin: '16px 0 8px' }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#111827', letterSpacing: '-2px' }}>$0</span>
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>
            Free forever &middot; No AI
          </div>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, marginBottom: 28, flex: 1 }}>
            Your digital classroom. Everything you do on paper &mdash; but organised, searchable, and always with you.
          </p>
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 24 }}>
            <Feature text="Photo capture & manual tagging" />
            <Feature text="Curriculum tracking across 5 areas" />
            <Feature text="Student profiles & progress" />
            <Feature text="Classroom builder" />
            <Feature text="Photo gallery & library" />
            <Feature text="Teacher notes" />
          </div>
          <a href="/montree/login" style={{
            display: 'block',
            textAlign: 'center',
            padding: '14px 24px',
            borderRadius: 10,
            border: '2px solid #d1d5db',
            color: '#374151',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            marginTop: 28,
          }}>
            Get started free
          </a>
        </div>

        {/* GUIDE */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: '36px 28px',
          border: '2px solid #10b981',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.12)',
        }}>
          <div style={{
            position: 'absolute',
            top: -13,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#10b981',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 16px',
            borderRadius: 20,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Popular
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Guide
          </div>
          <div style={{ margin: '16px 0 8px' }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#111827', letterSpacing: '-2px' }}>$4</span>
            <span style={{ fontSize: 16, color: '#6b7280', marginLeft: 4 }}>/student/month</span>
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>
            Powered by Claude Haiku
          </div>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, marginBottom: 28, flex: 1 }}>
            The full AI classroom. Take a photo &mdash; AI identifies the material, tracks progress, writes reports, and fills your paperwork. Everything runs on Claude Haiku: fast, accurate, affordable.
          </p>
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 24 }}>
            <Feature text="Everything in Seed, plus:" bold />
            <Feature text="Instant photo identification (Haiku)" />
            <Feature text="Weekly parent reports (Haiku)" />
            <Feature text="Parent portal with family login" />
            <Feature text="Weekly game plans per child (Haiku)" />
            <Feature text="Auto-filled weekly admin docs" />
            <Feature text="AI Montessori advisor (Haiku)" />
            <Feature text="Classroom intelligence panels" />
            <Feature text="Self-learning system" />
          </div>
          <a href="/montree/login" style={{
            display: 'block',
            textAlign: 'center',
            padding: '14px 24px',
            borderRadius: 10,
            background: '#10b981',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            marginTop: 28,
          }}>
            Start with Guide
          </a>
        </div>

        {/* BLOOM */}
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
          borderRadius: 16,
          padding: '36px 28px',
          border: '1px solid #065f46',
          display: 'flex',
          flexDirection: 'column',
          color: '#ffffff',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Bloom
          </div>
          <div style={{ margin: '16px 0 8px' }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: '#ffffff', letterSpacing: '-2px' }}>$8</span>
            <span style={{ fontSize: 16, color: '#a7f3d0', marginLeft: 4 }}>/student/month</span>
          </div>
          <div style={{ fontSize: 14, color: '#6ee7b7', marginBottom: 24 }}>
            Powered by Claude Sonnet
          </div>
          <p style={{ fontSize: 15, color: '#d1fae5', lineHeight: 1.6, marginBottom: 28, flex: 1 }}>
            Same features. Smarter brain. Sonnet writes richer parent reports, catches harder photo identifications, and gives deeper Montessori guidance. The system also learns faster with an advanced recognition layer.
          </p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 24 }}>
            <Feature text="Everything in Guide, upgraded:" bold light />
            <Feature text="Photo identification (Haiku + Sonnet)" light />
            <Feature text="Parent reports (Sonnet — richer, more personal)" light />
            <Feature text="Game plans & admin docs (Sonnet)" light />
            <Feature text="AI Montessori advisor (Sonnet — deeper)" light />
            <Feature text="Advanced recognition layer (Pass 3)" light />
            <Feature text="Semester progress reports (PPTX)" light />
            <Feature text="Curriculum enrichment (Sonnet)" light />
          </div>
          <a href="/montree/login" style={{
            display: 'block',
            textAlign: 'center',
            padding: '14px 24px',
            borderRadius: 10,
            background: '#ffffff',
            color: '#065f46',
            fontWeight: 700,
            fontSize: 15,
            textDecoration: 'none',
            marginTop: 28,
          }}>
            Start with Bloom
          </a>
        </div>
      </div>

      {/* What's the difference section */}
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 24px 48px',
      }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#111827',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          What&apos;s the difference?
        </h2>
        <p style={{
          fontSize: 15,
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          Guide and Bloom have the same features. The difference is the AI model behind them.
        </p>

        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14,
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '16px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 13 }}>Feature</th>
                <th style={{ padding: '16px 16px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 13 }}>Seed</th>
                <th style={{ padding: '16px 16px', textAlign: 'center', color: '#059669', fontWeight: 600, fontSize: 13 }}>Guide</th>
                <th style={{ padding: '16px 16px', textAlign: 'center', color: '#065f46', fontWeight: 600, fontSize: 13 }}>Bloom</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow feature="Photo identification" seed="Manual" guide="Haiku" bloom="Haiku + Sonnet" />
              <CompareRow feature="Parent reports" seed="&mdash;" guide="Haiku" bloom="Sonnet" />
              <CompareRow feature="Parent portal" seed="&mdash;" guide="Yes" bloom="Yes" />
              <CompareRow feature="Game plans" seed="&mdash;" guide="Haiku" bloom="Sonnet" />
              <CompareRow feature="Weekly admin docs" seed="Manual" guide="Haiku auto-fill" bloom="Sonnet auto-fill" />
              <CompareRow feature="Guru advisor" seed="&mdash;" guide="Haiku" bloom="Sonnet" />
              <CompareRow feature="Intelligence panels" seed="&mdash;" guide="Yes" bloom="Yes" />
              <CompareRow feature="Self-learning system" seed="&mdash;" guide="Yes" bloom="Yes" />
              <CompareRow feature="Advanced recognition" seed="&mdash;" guide="&mdash;" bloom="Sonnet Pass 3" last />
            </tbody>
          </table>
        </div>

        <p style={{
          fontSize: 13,
          color: '#9ca3af',
          textAlign: 'center',
          marginTop: 16,
          lineHeight: 1.5,
        }}>
          Montree uses Anthropic&apos;s Claude AI models. Haiku is fast and efficient. Sonnet is more capable and nuanced.{' '}
          <a href="https://www.anthropic.com/claude" target="_blank" rel="noopener noreferrer" style={{ color: '#059669', textDecoration: 'underline' }}>
            Learn more about Claude
          </a>
        </p>
      </div>

      {/* Trial banner */}
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 24px 48px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: 16,
          padding: '32px 28px',
          textAlign: 'center',
          border: '1px solid #a7f3d0',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#065f46', marginBottom: 12 }}>
            Try before you choose
          </div>
          <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.6, maxWidth: 480, margin: '0 auto' }}>
            Every new school starts with one week of Bloom, then one week of Guide, then one week of Seed.
            Experience the full range &mdash; then pick the tier that fits.
          </p>
        </div>
      </div>

      {/* Bottom line */}
      <div style={{
        textAlign: 'center',
        padding: '0 24px 60px',
        maxWidth: 600,
        margin: '0 auto',
      }}>
        <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.6 }}>
          All plans include unlimited classrooms. No setup fees. No contracts.<br />
          Start free and upgrade when you&apos;re ready.
        </p>
      </div>
    </div>
  );
}

function Feature({ text, bold, light }: { text: string; bold?: boolean; light?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
    }}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        <path
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          fill={light ? '#6ee7b7' : '#10b981'}
        />
      </svg>
      <span style={{
        fontSize: 14,
        color: light ? '#d1fae5' : '#374151',
        fontWeight: bold ? 600 : 400,
        lineHeight: 1.4,
      }}>
        {text}
      </span>
    </div>
  );
}

function CompareRow({ feature, seed, guide, bloom, last }: {
  feature: string;
  seed: string;
  guide: string;
  bloom: string;
  last?: boolean;
}) {
  const cellStyle = {
    padding: '12px 16px',
    textAlign: 'center' as const,
    borderBottom: last ? 'none' : '1px solid #f3f4f6',
    fontSize: 14,
    color: '#374151',
  };
  return (
    <tr>
      <td style={{ ...cellStyle, textAlign: 'left' as const, paddingLeft: 20, fontWeight: 500 }}>{feature}</td>
      <td style={cellStyle} dangerouslySetInnerHTML={{ __html: seed }} />
      <td style={{ ...cellStyle, color: '#059669', fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: guide }} />
      <td style={{ ...cellStyle, color: '#065f46', fontWeight: 600 }} dangerouslySetInnerHTML={{ __html: bloom }} />
    </tr>
  );
}
