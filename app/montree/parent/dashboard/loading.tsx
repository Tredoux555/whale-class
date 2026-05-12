// app/montree/parent/dashboard/loading.tsx — parent home skeleton
// Parent dashboard surface is intentionally minimal (log in → see Weekly Wrap).
export default function Loading() {
  return (
    <div style={{ padding: '24px 18px', maxWidth: 720, margin: '0 auto' }}>
      {/* Greeting */}
      <div
        style={{
          height: 28, width: '60%',
          background: 'rgba(232,201,106,0.10)',
          borderRadius: 6, marginBottom: 10,
        }}
        className="animate-pulse"
        aria-hidden
      />
      <div
        style={{
          height: 14, width: '80%',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 4, marginBottom: 24,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Weekly wrap card */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '22px 22px',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            height: 18, width: '45%',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 4, marginBottom: 16,
          }}
          className="animate-pulse"
          aria-hidden
        />
        {['92%', '85%', '90%', '70%'].map((w, i) => (
          <div
            key={i}
            style={{
              height: 12, width: w,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 4, marginBottom: 8,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>

      {/* Photo strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              aspectRatio: '1 / 1',
              background: 'rgba(255,255,255,0.05)',
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
