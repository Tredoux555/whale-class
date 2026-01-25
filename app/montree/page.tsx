// /montree/page.tsx - ULTRA SIMPLE landing
export default function MontreeLanding() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f0fdf4',
      padding: '24px'
    }}>
      <span style={{ fontSize: '80px', marginBottom: '24px' }}>🌳</span>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#1f2937' }}>
        Montree
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        Simple progress tracking
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px' }}>
        <a
          href="/montree/login/"
          style={{
            display: 'block',
            padding: '16px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            textAlign: 'center',
            fontWeight: '600',
            borderRadius: '16px',
            textDecoration: 'none',
            fontSize: '18px'
          }}
        >
          Teacher Login
        </a>
        
        <a
          href="/montree/demo/"
          style={{
            display: 'block',
            padding: '16px 24px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            textAlign: 'center',
            fontWeight: '600',
            borderRadius: '16px',
            textDecoration: 'none',
            border: '2px solid #fcd34d'
          }}
        >
          ✨ Try Demo
        </a>
        
        <a
          href="/"
          style={{
            display: 'block',
            padding: '12px',
            color: '#6b7280',
            textAlign: 'center',
            textDecoration: 'none'
          }}
        >
          ← Back
        </a>
      </div>
    </div>
  );
}
