// components/montree/events/EventAttendanceModal.tsx
// Modal for tagging children to class events — stacked list with Tag All
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import type { MontreeEvent } from '@/lib/montree/media/types';

interface Child {
  id: string;
  name: string;
  date_of_birth?: string;
}

interface EventAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroomId: string;
  schoolId: string;
  /** Pre-select this event when modal opens */
  preSelectedEventId?: string | null;
  /** Called after successful save */
  onSaved?: () => void;
}

export default function EventAttendanceModal({
  isOpen,
  onClose,
  classroomId,
  schoolId,
  preSelectedEventId,
  onSaved,
}: EventAttendanceModalProps) {
  const { t } = useI18n();

  // State
  const [events, setEvents] = useState<MontreeEvent[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(preSelectedEventId || null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [initialChecked, setInitialChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Create event inline
  const [showCreate, setShowCreate] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);

  const childrenRef = useRef<Child[]>([]);
  childrenRef.current = children;

  // Fetch events + children on open
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setChecked(new Set());
    setInitialChecked(new Set());
    setSelectedEventId(preSelectedEventId || null);
    setShowCreate(false);
    setNewEventDate(new Date().toISOString().slice(0, 10));

    const controller = new AbortController();
    Promise.all([
      fetch('/api/montree/events', { signal: controller.signal }).then(r => r.json()),
      fetch(`/api/montree/children?classroom_id=${classroomId}`, { signal: controller.signal }).then(r => r.json()),
    ])
      .then(([evtData, childData]) => {
        setEvents(evtData.events || []);
        const sorted = (childData.children || childData || []).sort((a: Child, b: Child) =>
          (a.name || '').localeCompare(b.name || '')
        );
        setChildren(sorted);
      })
      .catch(err => {
        if (err?.name !== 'AbortError') console.error('Load error:', err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [isOpen, classroomId, preSelectedEventId]);

  // Load existing attendance when event changes
  useEffect(() => {
    if (!isOpen || !selectedEventId) {
      setChecked(new Set());
      setInitialChecked(new Set());
      return;
    }
    const controller = new AbortController();
    fetch(`/api/montree/events/attendance?event_id=${selectedEventId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.children) {
          const ids = new Set(data.children.map((c: { child_id: string }) => c.child_id));
          setChecked(ids);
          setInitialChecked(new Set(ids));
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') console.error('Load attendance error:', err);
      });
    return () => controller.abort();
  }, [isOpen, selectedEventId]);

  // Toggle a child
  const toggle = useCallback((childId: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(childId)) next.delete(childId);
      else next.add(childId);
      return next;
    });
  }, []);

  // Tag All / Clear All — use functional state to avoid stale closure
  const toggleAll = useCallback(() => {
    const currentChildren = childrenRef.current;
    setChecked(prev => {
      const allCheckedNow = currentChildren.length > 0 && prev.size === currentChildren.length;
      if (allCheckedNow) {
        return new Set<string>();
      } else {
        return new Set(currentChildren.map(c => c.id));
      }
    });
  }, []);

  // Save — atomic: compute diff and send set + remove in parallel, or skip unchanged
  const handleSave = useCallback(async () => {
    if (!selectedEventId) {
      toast.error(t('events.selectEventFirst'));
      return;
    }
    setSaving(true);
    try {
      // Compute diff from initial state
      const toAdd = Array.from(checked).filter(id => !initialChecked.has(id));
      const toRemove = Array.from(initialChecked).filter(id => !checked.has(id));

      // Execute both operations in parallel for atomicity
      const promises: Promise<Response>[] = [];

      if (toAdd.length > 0) {
        promises.push(
          fetch('/api/montree/events/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: selectedEventId,
              child_ids: toAdd,
              action: 'set',
            }),
          })
        );
      }

      if (toRemove.length > 0) {
        promises.push(
          fetch('/api/montree/events/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_id: selectedEventId,
              child_ids: toRemove,
              action: 'remove',
            }),
          })
        );
      }

      if (promises.length > 0) {
        const results = await Promise.all(promises);
        for (const res of results) {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to save');
          }
        }
      }

      const eventName = events.find(e => e.id === selectedEventId)?.name || '';
      toast.success(`${checked.size} ${t('events.childrenTagged')} — ${eventName}`);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Save attendance error:', err);
      toast.error(t('events.attendanceFailed'));
    } finally {
      setSaving(false);
    }
  }, [selectedEventId, checked, initialChecked, events, onSaved, onClose]);

  // Create new event inline
  const handleCreateEvent = useCallback(async () => {
    if (!newEventName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/montree/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEventName.trim(),
          event_date: newEventDate,
          classroom_id: classroomId,
        }),
      });
      if (!res.ok) throw new Error('Failed to create');
      const data = await res.json();
      if (data.event) {
        setEvents(prev => [data.event, ...prev]);
        setSelectedEventId(data.event.id);
        setShowCreate(false);
        setNewEventName('');
        toast.success(`${t('events.created')} ${data.event.name}`);
      }
    } catch (err) {
      console.error('Create event error:', err);
      toast.error(t('events.attendanceFailed'));
    } finally {
      setCreating(false);
    }
  }, [newEventName, newEventDate, classroomId]);

  if (!isOpen) return null;

  const allChecked = children.length > 0 && checked.size === children.length;
  const hasChanges = (() => {
    if (checked.size !== initialChecked.size) return true;
    for (const id of checked) {
      if (!initialChecked.has(id)) return true;
    }
    return false;
  })();

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('events.tagEvent')}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none px-1">&times;</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Event Selector */}
            <div className="px-4 pt-3 pb-2">
              {showCreate ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={t('events.newEventPlaceholder')}
                    value={newEventName}
                    onChange={e => setNewEventName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    autoFocus
                  />
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={e => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="flex-1 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg"
                    >
                      {t('events.cancel')}
                    </button>
                    <button
                      onClick={handleCreateEvent}
                      disabled={!newEventName.trim() || creating}
                      className="flex-1 py-2 text-sm text-white bg-emerald-500 rounded-lg font-medium disabled:opacity-40"
                    >
                      {creating ? t('events.creating') : t('events.create')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedEventId || ''}
                    onChange={e => setSelectedEventId(e.target.value || null)}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">{t('events.selectAnEvent')}</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} — {ev.event_date}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-lg font-medium whitespace-nowrap"
                  >
                    + {t('events.createNew')}
                  </button>
                </div>
              )}
            </div>

            {/* Children list */}
            {!selectedEventId && !showCreate ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                {t('events.selectEventFirst')}
              </div>
            ) : selectedEventId && children.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                {t('events.noChildren')}
              </div>
            ) : selectedEventId ? (
              <>
                {/* Tag All bar */}
                <div className="px-4 py-2 flex items-center justify-between border-b bg-gray-50">
                  <span className="text-sm text-gray-600">
                    {checked.size} {t('events.ofTagged')} {children.length} {t('events.tagged')}
                  </span>
                  <button
                    onClick={toggleAll}
                    className="text-sm font-medium text-emerald-600 active:text-emerald-800"
                  >
                    {allChecked ? t('events.clearAll') : t('events.tagAll')}
                  </button>
                </div>

                {/* Scrollable child list */}
                <div className="flex-1 overflow-y-auto divide-y">
                  {children.map(child => {
                    const isChecked = checked.has(child.id);
                    return (
                      <button
                        key={child.id}
                        onClick={() => toggle(child.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isChecked ? 'bg-emerald-50' : 'bg-white active:bg-gray-50'
                        }`}
                      >
                        {/* Avatar circle */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                          isChecked ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {(child.name || '?')[0].toUpperCase()}
                        </div>

                        {/* Name */}
                        <span className={`flex-1 text-sm ${isChecked ? 'text-emerald-900 font-medium' : 'text-gray-700'}`}>
                          {child.name}
                        </span>

                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                        }`}>
                          {isChecked && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}

            {/* Save button */}
            {selectedEventId && children.length > 0 && (
              <div className="px-4 py-3 border-t bg-white">
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-40 active:bg-emerald-600 transition-colors"
                >
                  {saving ? t('events.savingAttendance') : hasChanges ? `${t('events.saveTagged')} — ${checked.size} ${t('events.tagged')}` : `${checked.size} ${t('events.tagged')}`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
