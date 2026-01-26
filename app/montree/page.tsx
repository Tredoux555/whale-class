'use client';

// /montree/page.tsx - Minimalist landing
export default function MontreeLanding() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #0f172a 100%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle glow effect */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      
      {/* Content */}
      <div style={{ 
        position: 'relative', 
        zIndex: 10, 
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        {/* Tree icon */}
        <div style={{ 
          fontSize: '48px', 
          marginBottom: '32px',
          opacity: 0.9
        }}>
          🌳
        </div>
        
        {/* Title */}
        <h1 style={{ 
          fontSize: '42px', 
          fontWeight: '300',
          color: 'white',
          marginBottom: '16px',
          letterSpacing: '-1px'
        }}>
          Welcome to <span style={{ fontWeight: '600' }}>Montree</span>
        </h1>
        
        {/* Subtitle */}
        <p style={{ 
          fontSize: '18px',
          color: 'rgba(167, 243, 208, 0.8)',
          marginBottom: '64px',
          fontWeight: '300',
          lineHeight: '1.6'
        }}>
          The future of Montessori Classroom Management
        </p>
        
        {/* CTA Button */}
        <a
          href="/montree/demo/"
          className="cta-button"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '18px 48px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '100px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '500',
            textDecoration: 'none',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
        >
          Begin
          <span style={{ fontSize: '20px' }}>→</span>
        </a>
        
        {/* Teacher login - very subtle */}
        <div style={{ marginTop: '80px' }}>
          <a
            href="/montree/login/"
            style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: '14px',
              textDecoration: 'none'
            }}
          >
            Teacher Login
          </a>
        </div>
      </div>
      
      {/* CSS for hover effect */}
      <style jsx>{`
        .cta-button:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
}
