'use client';

import { TabType } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onlineCount: number;
  totalUsers: number;
  messagesLength: number;
  filesLength: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onlineCount,
  totalUsers,
  messagesLength,
  filesLength
}: SidebarProps) {
  const tabs = ['online', 'logs', 'messages', 'vault', 'files', 'controls'] as const;

  return (
    <div className="lg:col-span-1">
      <div className="bg-[rgba(8,20,12,0.55)] border border-[rgba(52,211,153,0.18)] rounded-lg shadow-sm p-4 sticky top-6 backdrop-blur-md">
        <h2 className="text-sm font-bold text-white/70 uppercase tracking-wide mb-4">Navigation</h2>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                activeTab === tab
                  ? tab === 'controls'
                    ? 'bg-red-500 text-[#0a1a0f]'
                    : 'bg-emerald-500 text-[#0a1a0f]'
                  : tab === 'controls'
                  ? 'text-red-300 hover:bg-red-500/10'
                  : 'text-white/70 hover:bg-emerald-500/10'
              }`}
            >
              {tab === 'online' && `👥 Active Users (${onlineCount})`}
              {tab === 'logs' && '📋 Activity Log'}
              {tab === 'messages' && '💬 Messages'}
              {tab === 'vault' && '🔒 Media Vault'}
              {tab === 'files' && `📁 Files (${filesLength})`}
              {tab === 'controls' && '⚙️ System Controls'}
            </button>
          ))}
        </div>

        <div className="border-t border-white/10 mt-6 pt-4">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wide mb-3">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Total Students:</span>
              <span className="font-semibold text-emerald-400">{totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Active Now:</span>
              <span className="font-semibold text-emerald-400">{onlineCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Messages:</span>
              <span className="font-semibold text-[#E8C96A]">{messagesLength}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
