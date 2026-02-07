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
      <div className="bg-white rounded-lg shadow-sm p-4 sticky top-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Navigation</h2>
        <div className="space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                activeTab === tab
                  ? tab === 'controls'
                    ? 'bg-red-600 text-white'
                    : tab === 'files'
                    ? 'bg-blue-600 text-white'
                    : 'bg-indigo-600 text-white'
                  : tab === 'controls'
                  ? 'text-red-700 hover:bg-red-50'
                  : tab === 'files'
                  ? 'text-blue-700 hover:bg-blue-50'
                  : 'text-gray-700 hover:bg-indigo-50'
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

        <div className="border-t border-gray-200 mt-6 pt-4">
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Quick Stats</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Students:</span>
              <span className="font-semibold text-indigo-600">{totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Now:</span>
              <span className="font-semibold text-green-600">{onlineCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Messages:</span>
              <span className="font-semibold text-blue-600">{messagesLength}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
