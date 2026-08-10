'use client';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <div className="bg-[rgba(8,20,12,0.55)] border-b border-[rgba(52,211,153,0.18)] shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏫</div>
          <div>
            <h1 className="text-2xl font-bold text-white/90" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>Classroom Manager</h1>
            <p className="text-sm text-white/50">Manage student communications</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="btn btn-danger btn-soft btn-md"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
