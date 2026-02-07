'use client';

interface HeaderProps {
  onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🏫</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Classroom Manager</h1>
            <p className="text-sm text-gray-500">Manage student communications</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
