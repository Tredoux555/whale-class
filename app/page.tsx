export default function Home() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#1f2937',
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <span style={{ fontSize: '64px', marginBottom: '24px' }}>🔧</span>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
        Out for Upgrade
      </h1>
      <p style={{ color: '#9ca3af', fontSize: '18px' }}>
        We'll be back soon
      </p>
    </div>
  );
}
