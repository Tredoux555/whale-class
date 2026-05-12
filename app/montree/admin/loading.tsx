// app/montree/admin/loading.tsx — cockpit "Today" page skeleton
// Renders inside the admin layout (sidebar + nav stay mounted). Only the main
// content area is replaced. Server component — zero client JS cost, paints
// immediately on cold nav. Shape matches the Today page so there's no layout
// shift when the real content arrives.
export default function Loading() {
  return (
    <div style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* School-name header */}
      <div
        style={{
          height: 40, width: '55%',
          background: 'rgba(232,201,106,0.10)',
          borderRadius: 8, marginBottom: 14,
        }}
        className="animate-pulse"
        aria-hidden
      />
      {/* Welcome line */}
      <div
        style={{
          height: 18, width: '70%',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 6, marginBottom: 12,
        }}
        className="animate-pulse"
        aria-hidden
      />
      {/* Digest paragraph */}
      <div
        style={{
          height: 14, width: '90%',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6, marginBottom: 8,
        }}
        className="animate-pulse"
        aria-hidden
      />
      <div
        style={{
          height: 14, width: '78%',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6, marginBottom: 32,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* 4 metric tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 32,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 96,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>

      {/* Attention list */}
      <div
        style={{
          height: 26, width: '32%',
          background: 'rgba(232,201,106,0.12)',
          borderRadius: 6, marginBottom: 14,
        }}
        className="animate-pulse"
        aria-hidden
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 58,
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
  );
}
