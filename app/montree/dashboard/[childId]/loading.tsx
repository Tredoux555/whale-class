// app/montree/dashboard/[childId]/loading.tsx — child week view skeleton
// Critical: this is the highest-traffic teacher page. Shape matches:
// hero (photo + name), 5-row focus shelf, recent observations.
export default function Loading() {
  return (
    <div style={{ padding: '16px 14px 32px', maxWidth: 720, margin: '0 auto' }}>
      {/* Back link */}
      <div
        style={{
          height: 12, width: 90,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 4, marginBottom: 14,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Hero: photo + name + meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div
          style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
          className="animate-pulse"
          aria-hidden
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 26, width: '60%',
              background: 'rgba(232,201,106,0.10)',
              borderRadius: 6, marginBottom: 8,
            }}
            className="animate-pulse"
            aria-hidden
          />
          <div
            style={{
              height: 12, width: '40%',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4,
            }}
            className="animate-pulse"
            aria-hidden
          />
        </div>
      </div>

      {/* Focus works section header */}
      <div
        style={{
          height: 14, width: '32%',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 4, marginBottom: 12,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* 5-row focus shelf — matches FocusWorksSection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 58,
              background: 'rgba(8,20,12,0.55)',
              border: '1px solid rgba(52,211,153,0.10)',
              borderRadius: 14,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>

      {/* Recent observations */}
      <div
        style={{
          height: 14, width: '40%',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 4, marginBottom: 12,
        }}
        className="animate-pulse"
        aria-hidden
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              aspectRatio: '4 / 3',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
