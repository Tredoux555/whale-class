// components/montree/media/EventPicker.tsx
// Event selection modal for capture flow — pick or create a special event
'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import type { MontreeEvent } from '@/lib/montree/media/types';

interface EventPickerProps {
  schoolId: string;
  selectedEventId: string | null;
  onSelect: (event: MontreeEvent | null) => void;
  onClose: () => void;
}

export default function EventPicker({
  schoolId,
  selectedEventId,
  onSelect,
  onClose,
}: EventPickerProps) {
  const { t } = useI18n();
  const [events, setEvents] = useState<MontreeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/montree/events', { signal: abortController.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (data.events) setEvents(data.events);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Failed to fetch events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    return () => abortController.abort();
  }, [schoolId]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/montree/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          event_date: newDate,
          school_id: schoolId,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.event) {
        setEvents(prev => [data.event, ...prev]);
        onSelect(data.event);
        setShowCreate(false);
        setNewName('');
      }
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h2 className="text-white text-xl font-bold">
          {t('events.selectEvent')}
        </h2>
        <button onClick={onClose} className="text-white/60 text-2xl px-2">✕</button>
      </div>

      {/* No Event option */}
      <div className="px-4 pb-2">
        <button
          onClick={() => { onSelect(null); onClose(); }}
          className={`w-full p-4 rounded-xl text-left transition-all ${
            !selectedEventId
              ? 'bg-emerald-500/30 ring-2 ring-emerald-400'
              : 'bg-white/10 active:bg-white/20'
          }`}
        >
          <span className="text-white font-medium">{t('events.noEvent')}</span>
          <span className="text-white/50 text-sm block mt-1">
            {t('albums.includeCurriculum')}
          </span>
        </button>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />
          </div>
        ) : (
          events.map(event => {
            const isSelected = selectedEventId === event.id;
            return (
              <button
                key={event.id}
                onClick={() => { onSelect(event); onClose(); }}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/30 ring-2 ring-amber-400'
                    : 'bg-white/10 active:bg-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <span className={`font-medium ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                      {event.name}
                    </span>
                    <span className="text-white/50 text-sm block">
                      {event.event_date}
                    </span>
                  </div>
                  {isSelected && <span className="ml-auto text-amber-400">✓</span>}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Create new event section */}
      <div className="px-4 pb-8 pt-3">
        {showCreate ? (
          <div className="bg-white/10 rounded-xl p-4 space-y-3">
            <input
              type="text"
              placeholder={t('events.eventName')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 outline-none focus:border-emerald-400 placeholder-white/40"
              autoFocus
            />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 outline-none focus:border-emerald-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2 rounded-lg text-white/60 bg-white/5"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex-1 py-2 rounded-lg bg-emerald-500 text-white font-medium disabled:opacity-40"
              >
                {creating ? '...' : t('events.createNew')}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full py-4 rounded-2xl bg-white/10 text-white/70 font-medium active:bg-white/20"
          >
            + {t('events.createNew')}
          </button>
        )}
      </div>
    </div>
  );
}
