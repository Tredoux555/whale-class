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
          maxWidth: 520,
          margin: '0 auto 48px',
          lineHeight: 1.5,
        }}>
          Every tier includes the full Montessori classroom platform.<br />
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
        padding: '0 24px 80px',
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
            Free forever
          </div>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, marginBottom: 28, flex: 1 }}>
            Your digital classroom. Everything you do on paper — but organised, searchable, and always with you.
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
            transition: 'all 0.2s',
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
            AI-assisted classroom
          </div>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, marginBottom: 28, flex: 1 }}>
            The system starts working for you. Take a photo — AI identifies the material, tracks progress, and fills your paperwork automatically.
          </p>
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 24 }}>
            <Feature text="Everything in Seed" bold />
            <Feature text="AI identifies materials from photos" />
            <Feature text="Weekly game plans per child" />
            <Feature text="Auto-filled weekly admin docs" />
            <Feature text="One-tap shelf management" />
            <Feature text="Classroom intelligence panels" />
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
            transition: 'all 0.2s',
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
            Complete intelligence
          </div>
          <p style={{ fontSize: 15, color: '#d1fae5', lineHeight: 1.6, marginBottom: 28, flex: 1 }}>
            The system thinks with you and talks to parents. Personalised reports, a parent portal, and an AI Montessori advisor that knows every child.
          </p>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 24 }}>
            <Feature text="Everything in Guide" bold light />
            <Feature text="Personalised weekly parent reports" light />
            <Feature text="Parent portal with login" light />
            <Feature text="AI Montessori advisor per child" light />
            <Feature text="Smart learning that improves daily" light />
            <Feature text="Semester progress reports (PPTX)" light />
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
            transition: 'all 0.2s',
          }}>
            Start with Bloom
          </a>
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
          All plans include unlimited classrooms and children. No setup fees. No contracts.<br />
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
