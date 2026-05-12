// app/montree/admin/pulse/loading.tsx — pulse hub skeleton
export default function Loading() {
  return (
    <div style={{ padding: '24px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          height: 36, width: '28%',
          background: 'rgba(232,201,106,0.10)',
          borderRadius: 8, marginBottom: 28,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Metric tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14, marginBottom: 28,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              height: 110,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>

      {/* Detail panel */}
      <div
        style={{
          height: 280,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
        }}
        className="animate-pulse"
        aria-hidden
      />
    </div>
  );
}
