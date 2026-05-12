// app/montree/admin/people/loading.tsx — people list skeleton (teachers + parents)
export default function Loading() {
  return (
    <div style={{ padding: '24px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          height: 36, width: '30%',
          background: 'rgba(232,201,106,0.10)',
          borderRadius: 8, marginBottom: 24,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Two columns: teachers + parents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {[0, 1].map((col) => (
          <div key={col}>
            <div
              style={{
                height: 22, width: '40%',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 6, marginBottom: 14,
              }}
              className="animate-pulse"
              aria-hidden
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 54,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                  }}
                  className="animate-pulse"
                  aria-hidden
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
