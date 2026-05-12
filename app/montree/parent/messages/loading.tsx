// app/montree/parent/messages/loading.tsx — parent thread list skeleton
// (Feature-gated by parent_messaging — when flag is OFF the API 404s and
// the page bounces to /montree/parent/dashboard. The skeleton paints
// during that probe window so the user doesn't see blank.)
export default function Loading() {
  return (
    <div style={{ padding: '24px 18px', maxWidth: 720, margin: '0 auto' }}>
      <div
        style={{
          height: 30, width: '38%',
          background: 'rgba(232,201,106,0.10)',
          borderRadius: 6, marginBottom: 22,
        }}
        className="animate-pulse"
        aria-hidden
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 76,
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
