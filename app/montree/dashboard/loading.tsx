// app/montree/dashboard/loading.tsx — teacher dashboard skeleton (student grid)
// The DashboardHeader is in the layout and stays mounted across navigations.
// This skeleton only replaces the main content body.
export default function Loading() {
  return (
    <div style={{ padding: '16px 14px 24px', maxWidth: 980, margin: '0 auto' }}>
      {/* Classroom name + actions row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div
          style={{
            height: 22, width: '40%',
            background: 'rgba(232,201,106,0.10)',
            borderRadius: 6,
          }}
          className="animate-pulse"
          aria-hidden
        />
        <div
          style={{
            height: 28, width: 100,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 8,
          }}
          className="animate-pulse"
          aria-hidden
        />
      </div>

      {/* Daily brief strip */}
      <div
        style={{
          height: 64,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          marginBottom: 16,
        }}
        className="animate-pulse"
        aria-hidden
      />

      {/* Student grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 12,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <div key={i}>
            <div
              style={{
                aspectRatio: '1 / 1',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                marginBottom: 6,
              }}
              className="animate-pulse"
              aria-hidden
            />
            <div
              style={{
                height: 12, width: '70%',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
                margin: '0 auto',
              }}
              className="animate-pulse"
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}
