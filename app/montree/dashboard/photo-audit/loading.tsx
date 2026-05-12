// app/montree/dashboard/photo-audit/loading.tsx — photo audit grid skeleton
// Page is heavy (3,400+ lines) so first paint matters a lot. Skeleton shape
// matches: zone toggle + date strip + 24-card photo grid.
export default function Loading() {
  return (
    <div style={{ padding: '12px 14px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Top zone toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 30, width: 86,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 999,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>

      {/* Date range strip */}
      <div
        style={{
          height: 38,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10,
          marginBottom: 16,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Photo grid — 24 cards, matches PAGE_SIZE */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 14,
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                aspectRatio: '4 / 3',
                background: 'rgba(0,0,0,0.30)',
              }}
              className="animate-pulse"
              aria-hidden
            />
            <div style={{ padding: '10px 12px' }}>
              <div
                style={{
                  height: 12, width: '70%',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 4, marginBottom: 6,
                }}
                className="animate-pulse"
                aria-hidden
              />
              <div
                style={{
                  height: 10, width: '40%',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 4,
                }}
                className="animate-pulse"
                aria-hidden
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
