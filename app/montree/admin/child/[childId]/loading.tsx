// app/montree/admin/child/[childId]/loading.tsx — principal-facing child briefing skeleton
export default function Loading() {
  return (
    <div style={{ padding: '24px 24px', maxWidth: 760, margin: '0 auto' }}>
      {/* Back link */}
      <div
        style={{
          height: 12, width: 90,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 4, marginBottom: 18,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Hero: photo circle + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
        <div
          style={{
            width: 88, height: 88, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
          className="animate-pulse"
          aria-hidden
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 30, width: '55%',
              background: 'rgba(232,201,106,0.10)',
              borderRadius: 6, marginBottom: 8,
            }}
            className="animate-pulse"
            aria-hidden
          />
          <div
            style={{
              height: 14, width: '40%',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4,
            }}
            className="animate-pulse"
            aria-hidden
          />
        </div>
      </div>

      {/* Briefing prose */}
      <div
        style={{
          padding: '18px 20px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          marginBottom: 22,
        }}
      >
        {['90%', '85%', '94%', '70%', '88%', '60%'].map((w, i) => (
          <div
            key={i}
            style={{
              height: 12, width: w,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4, marginBottom: 10,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>

      {/* Parent question textarea */}
      <div
        style={{
          height: 130,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
        }}
        className="animate-pulse"
        aria-hidden
      />
    </div>
  );
}
