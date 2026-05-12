// app/montree/admin/classrooms/loading.tsx — classroom grid skeleton
export default function Loading() {
  return (
    <div style={{ padding: '24px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          height: 36, width: '38%',
          background: 'rgba(232,201,106,0.10)',
          borderRadius: 8, marginBottom: 8,
        }}
        className="animate-pulse"
        aria-hidden
      />
      <div
        style={{
          height: 14, width: '60%',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 6, marginBottom: 28,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Classroom cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 168,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
            }}
            className="animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
