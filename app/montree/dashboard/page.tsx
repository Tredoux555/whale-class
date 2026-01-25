// Dashboard - ULTRA SIMPLE for Capacitor debugging
export default function DashboardPage() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0fdf4'
    }}>
      <header style={{ 
        backgroundColor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        padding: '16px',
        position: 'sticky',
        top: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>🌳</span>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '600' }}>My Classroom</h1>
            <p style={{ fontSize: '12px', color: '#9ca3af' }}>Demo Mode</p>
          </div>
        </div>
      </header>
      
      <main style={{ padding: '24px' }}>
        <p style={{ 
          textAlign: 'center', 
          padding: '32px', 
          backgroundColor: '#dbeafe',
          borderRadius: '16px',
          color: '#1e40af',
          marginBottom: '24px'
        }}>
          ✅ Dashboard loaded successfully!<br/>
          <small>If you see this without infinite reload, navigation works.</small>
        </p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '12px',
          marginBottom: '24px'
        }}>
          {['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver'].map((name, i) => (
            <div key={name} style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                margin: '0 auto 8px'
              }}>
                {name[0]}
              </div>
              <p style={{ fontSize: '14px' }}>{name}</p>
            </div>
          ))}
        </div>
        
        <a
          href="/"
          style={{
            display: 'block',
            padding: '16px',
            backgroundColor: '#ef4444',
            color: 'white',
            textAlign: 'center',
            fontWeight: '600',
            borderRadius: '12px',
            textDecoration: 'none'
          }}
        >
          Logout (Back to Home)
        </a>
      </main>
    </div>
  );
}
