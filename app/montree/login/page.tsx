// Login page - ULTRA SIMPLE for Capacitor debugging
export default function LoginPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#ecfdf5',
      padding: '16px'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '24px', 
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '48px' }}>🌱</span>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>Montree</h1>
          <p style={{ color: '#6b7280' }}>Teacher Login</p>
        </div>
        
        <p style={{ 
          textAlign: 'center', 
          padding: '16px', 
          backgroundColor: '#fef3c7', 
          borderRadius: '12px',
          color: '#92400e',
          marginBottom: '24px'
        }}>
          ⚠️ Login requires internet connection. This is a test page.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <a
            href="/montree/dashboard/"
            style={{
              display: 'block',
              padding: '16px',
              backgroundColor: '#10b981',
              color: 'white',
              textAlign: 'center',
              fontWeight: '600',
              borderRadius: '12px',
              textDecoration: 'none'
            }}
          >
            Go to Dashboard (Test) →
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
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
