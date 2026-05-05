'use client';

import { useState, useMemo } from 'react';
import { Lead } from './types';

interface LeadsTabProps {
  leads: Lead[];
  loadingLeads: boolean;
  onFetchLeads: () => void;
  onUpdateStatus: (leadId: string, status: string) => void;
  onDeleteLead: (lead: Lead) => void;
  onBulkDeleteByIds?: (ids: string[]) => Promise<number>;
  onBulkDeleteByStatus?: (status: 'new' | 'contacted' | 'onboarded' | 'declined') => Promise<number>;
  onProvision: (lead: Lead) => void;
  onOpenDm: (id: string, name?: string, email?: string) => void;
  onLoginAs: (schoolId: string) => void;
  editingNotes: string | null;
  setEditingNotes: (id: string | null) => void;
  notesText: string;
  setNotesText: (text: string) => void;
  onSaveNotes: (leadId: string) => void;
  dmUnreadPerConvo: Record<string, { count: number; sender_name: string }>;
  dmUnreadTotal: number;
  newLeadCount: number;
}

const getLeadStatusColor = (status: string) => {
  switch (status) {
    case 'new': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    case 'contacted': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    case 'onboarded': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    case 'declined': return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
  }
};

const getLeadStatusEmoji = (status: string) => {
  switch (status) {
    case 'new': return '🆕';
    case 'contacted': return '📞';
    case 'onboarded': return '✅';
    case 'declined': return '❌';
    default: return '❓';
  }
};

export default function LeadsTab({
  leads,
  loadingLeads,
  onFetchLeads,
  onUpdateStatus,
  onDeleteLead,
  onBulkDeleteByIds,
  onBulkDeleteByStatus,
  onProvision,
  onOpenDm,
  onLoginAs,
  editingNotes,
  setEditingNotes,
  notesText,
  setNotesText,
  onSaveNotes,
  dmUnreadPerConvo,
  dmUnreadTotal,
  newLeadCount
}: LeadsTabProps) {
  // Multi-select state for bulk clean-up
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const newLeadsCount = useMemo(() => leads.filter(l => l.status === 'new').length, [leads]);
  const declinedLeadsCount = useMemo(() => leads.filter(l => l.status === 'declined').length, [leads]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => setSelectedIds(new Set(leads.map(l => l.id)));
  const selectAllNew = () => setSelectedIds(new Set(leads.filter(l => l.status === 'new').map(l => l.id)));
  const clearSelection = () => setSelectedIds(new Set());
  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const handleBulkDeleteSelected = async () => {
    if (!onBulkDeleteByIds || selectedIds.size === 0) return;
    const deleted = await onBulkDeleteByIds(Array.from(selectedIds));
    if (deleted > 0) exitSelectMode();
  };

  const handleBulkDeleteByStatus = async (status: 'new' | 'contacted' | 'onboarded' | 'declined') => {
    if (!onBulkDeleteByStatus) return;
    await onBulkDeleteByStatus(status);
  };

  return (
    <div className="space-y-4">
      {/* Leads Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-white">People interested in Montree</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {!selectMode && onBulkDeleteByStatus && newLeadsCount > 0 && (
            <button
              onClick={() => handleBulkDeleteByStatus('new')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 font-medium whitespace-nowrap"
              title="Delete every lead currently marked 'new'"
            >
              🧹 Clear all New ({newLeadsCount})
            </button>
          )}
          {!selectMode && onBulkDeleteByStatus && declinedLeadsCount > 0 && (
            <button
              onClick={() => handleBulkDeleteByStatus('declined')}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/40 text-slate-300 hover:bg-slate-700/60 border border-slate-600 font-medium whitespace-nowrap"
              title="Delete every lead currently marked 'declined'"
            >
              🧹 Clear Declined ({declinedLeadsCount})
            </button>
          )}
          {onBulkDeleteByIds && (
            <button
              onClick={() => { setSelectMode(s => !s); if (selectMode) setSelectedIds(new Set()); }}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap ${
                selectMode
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60 border-slate-600'
              }`}
            >
              {selectMode ? '✓ Selecting' : '☑️ Select'}
            </button>
          )}
          <button onClick={onFetchLeads} className="text-sm text-slate-400 hover:text-white">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Multi-select action bar (only visible in select mode) */}
      {selectMode && (
        <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-300 mr-2">
            {selectedIds.size} selected
          </span>
          <button
            onClick={selectAllVisible}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-700/60 text-slate-200 hover:bg-slate-600"
          >
            Select all ({leads.length})
          </button>
          {newLeadsCount > 0 && (
            <button
              onClick={selectAllNew}
              className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
            >
              Select all New ({newLeadsCount})
            </button>
          )}
          <button
            onClick={clearSelection}
            disabled={selectedIds.size === 0}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-700/40 text-slate-400 hover:bg-slate-700/60 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleBulkDeleteSelected}
              disabled={selectedIds.size === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🗑️ Delete {selectedIds.size > 0 ? selectedIds.size : ''} selected
            </button>
            <button
              onClick={exitSelectMode}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:bg-slate-600"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Lead Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          <p className="text-emerald-400 text-xs">New</p>
          <p className="text-xl font-bold text-emerald-400">{leads.filter(l => l.status === 'new').length}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <p className="text-amber-400 text-xs">Contacted</p>
          <p className="text-xl font-bold text-amber-400">{leads.filter(l => l.status === 'contacted').length}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
          <p className="text-blue-400 text-xs">Onboarded</p>
          <p className="text-xl font-bold text-blue-400">{leads.filter(l => l.status === 'onboarded').length}</p>
        </div>
        <div className="bg-slate-500/10 border border-slate-500/30 rounded-xl p-3">
          <p className="text-slate-400 text-xs">Total</p>
          <p className="text-xl font-bold text-slate-300">{leads.length}</p>
        </div>
      </div>

      {loadingLeads ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <div className="animate-pulse text-4xl">👋</div>
          <p className="text-slate-400 mt-2">Loading leads...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
          <span className="text-5xl block mb-4">🌱</span>
          <h3 className="text-xl font-semibold text-white mb-2">No leads yet</h3>
          <p className="text-slate-400">When someone visits /montree and clicks &ldquo;I want to try&rdquo;, they&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            // Compute DM target once per lead (teacher/principal ID from notes, or lead ID)
            const userIdMatch = lead.notes?.match(/(Teacher|Principal) ID: ([a-fA-F0-9-]+)/);
            const dmTarget = userIdMatch ? userIdMatch[2] : lead.id;
            // Check both principal ID and lead ID for unread (handles pre/post-bridge)
            const leadUnreadCount = dmUnreadPerConvo[dmTarget]?.count
              || (userIdMatch ? dmUnreadPerConvo[lead.id]?.count : 0)
              || 0;

            return (
            <div
              key={lead.id}
              onClick={selectMode ? () => toggleSelect(lead.id) : undefined}
              className={`bg-slate-800/50 border rounded-xl p-4 transition-all ${
                selectMode && selectedIds.has(lead.id)
                  ? 'border-emerald-400/80 bg-emerald-500/10 cursor-pointer'
                  : selectMode
                    ? 'border-slate-700 cursor-pointer hover:border-slate-500'
                    : lead.status === 'new'
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-slate-700'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Selection checkbox (only visible in select mode) */}
                {selectMode && (
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )}

                {/* Interest type icon */}
                <div className="text-2xl mt-1">
                  {lead.interest_type === 'try' ? '🚀' : '💬'}
                </div>

                {/* Lead info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white text-lg">
                      {lead.name || 'Anonymous'}
                    </span>
                    {lead.role && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                        {lead.role === 'teacher' ? '👩‍🏫' : lead.role === 'principal' ? '👔' : '🤔'} {lead.role}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getLeadStatusColor(lead.status)}`}>
                      {getLeadStatusEmoji(lead.status)} {lead.status}
                    </span>
                    <span className="text-slate-500 text-sm ml-auto">
                      {new Date(lead.created_at).toLocaleString()}
                    </span>
                  </div>

                  {lead.email && (
                    <p className="text-slate-300 text-sm">
                      📧 <a href={`mailto:${lead.email}`} className="hover:text-emerald-400 transition-colors">{lead.email}</a>
                    </p>
                  )}
                  {lead.school_name && (
                    <p className="text-slate-400 text-sm">🏫 {lead.school_name}</p>
                  )}
                  {lead.message && (
                    <p className="text-slate-300 mt-2 text-sm bg-slate-900/50 p-3 rounded-lg">
                      &ldquo;{lead.message}&rdquo;
                    </p>
                  )}
                  {lead.interest_type === 'try' && (
                    <p className="text-emerald-400/60 text-xs mt-1">Wants to try Montree</p>
                  )}
                  {lead.interest_type === 'info' && (
                    <p className="text-blue-400/60 text-xs mt-1">Wants more information</p>
                  )}

                  {/* Notes */}
                  {editingNotes === lead.id ? (
                    <div className="mt-3">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Your notes about this lead..."
                        rows={2}
                        className="w-full p-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:border-emerald-500 outline-none resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => onSaveNotes(lead.id)}
                          className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="px-3 py-1 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : lead.notes ? (
                    <button
                      onClick={() => { setEditingNotes(lead.id); setNotesText(lead.notes || ''); }}
                      className="mt-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      📝 {lead.notes}
                    </button>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                  {lead.status === 'new' && (
                    <>
                      <button
                        onClick={() => onUpdateStatus(lead.id, 'contacted')}
                        className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg font-medium whitespace-nowrap"
                      >
                        📞 Contacted
                      </button>
                      <button
                        onClick={() => onProvision(lead)}
                        className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg font-medium whitespace-nowrap"
                      >
                        🏫 Provision
                      </button>
                    </>
                  )}
                  {lead.status === 'contacted' && (
                    <>
                      <button
                        onClick={() => onProvision(lead)}
                        className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg font-medium whitespace-nowrap"
                      >
                        🏫 Provision
                      </button>
                      <button
                        onClick={() => onUpdateStatus(lead.id, 'declined')}
                        className="px-3 py-1.5 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-lg font-medium whitespace-nowrap"
                      >
                        ❌ Decline
                      </button>
                    </>
                  )}
                  {lead.status === 'onboarded' && lead.provisioned_school_id && (
                    <button
                      onClick={() => onLoginAs(lead.provisioned_school_id as string)}
                      className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg font-medium whitespace-nowrap"
                    >
                      Login As →
                    </button>
                  )}
                  <button
                    onClick={() => onOpenDm(dmTarget, lead.name || 'Anonymous', lead.email || '')}
                    className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg font-medium whitespace-nowrap relative"
                  >
                    💬 Message
                    {leadUnreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                        {leadUnreadCount}
                      </span>
                    )}
                  </button>
                  {!editingNotes && (
                    <button
                      onClick={() => { setEditingNotes(lead.id); setNotesText(lead.notes || ''); }}
                      className="px-3 py-1.5 text-xs bg-slate-700 text-slate-400 hover:bg-slate-600 rounded-lg font-medium whitespace-nowrap"
                    >
                      📝 Notes
                    </button>
                  )}
                  <button
                    onClick={() => onDeleteLead(lead)}
                    className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg font-medium whitespace-nowrap"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
