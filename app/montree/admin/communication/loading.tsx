// app/montree/admin/communication/loading.tsx — communication tab skeleton
// Shape matches: tab strip + thread list cards. Server component.
export default function Loading() {
  return (
    <div style={{ padding: '24px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          height: 36, width: '40%',
          background: 'rgba(232,201,106,0.10)',
          borderRadius: 8, marginBottom: 18,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 32,
              width: i === 0 ? 110 : 88,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 999,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>

      {/* Thread rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: 72,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
