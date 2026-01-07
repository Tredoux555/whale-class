'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2,
  Plus,
  Camera,
  Calendar,
  Trash2,
  Image as ImageIcon,
  X,
  Save
} from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  activity_name: string;
  activity_area: string;
  note: string;
  photo_url?: string;
  created_at: string;
}

export default function PhotoJournal({ 
  params 
}: { 
  params: Promise<{ familyId: string; childId: string }> 
}) {
  const { familyId, childId } = use(params);
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    activity_name: '',
    activity_area: 'practical_life',
    note: '',
    photo_url: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [childId]);

  const loadEntries = async () => {
    try {
      const res = await fetch(`/api/montree-home/journal?child_id=${childId}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Error loading journal:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async () => {
    if (!newEntry.activity_name || !newEntry.note) return;
    setSaving(true);

    try {
      const entry: JournalEntry = {
        id: `${Date.now()}`,
        ...newEntry,
        created_at: new Date().toISOString()
      };

      const updated = [entry, ...entries];
      setEntries(updated);

      await fetch('/api/montree-home/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          entries: updated
        })
      });

      setShowAdd(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        activity_name: '',
        activity_area: 'practical_life',
        note: '',
        photo_url: ''
      });
    } catch (err) {
      console.error('Error saving:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);

    await fetch('/api/montree-home/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        entries: updated
      })
    });
  };

  const getAreaEmoji = (area: string) => {
    const emojis: Record<string, string> = {
      practical_life: '🧹',
      sensorial: '👁️',
      mathematics: '🔢',
      language: '📚',
      cultural: '🌍'
    };
    return emojis[area] || '📖';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = [];
    acc[entry.date].push(entry);
    return acc;
  }, {} as Record<string, JournalEntry[]>);

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/parent/home/${familyId}/${childId}`)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Photo Journal</h1>
            <p className="text-sm text-gray-500">{entries.length} entries</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {entries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Start Your Journal</h3>
            <p className="text-gray-600 text-sm mb-4">
              Document your child&apos;s Montessori journey with photos and notes
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-green-700"
            >
              Add First Entry
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(date)}
                </h3>
                <div className="space-y-4">
                  {groupedEntries[date].map(entry => (
                    <div key={entry.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      {entry.photo_url && (
                        <div className="aspect-video bg-gray-100 relative">
                          <img
                            src={entry.photo_url}
                            alt={entry.activity_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{getAreaEmoji(entry.activity_area)}</span>
                              <h4 className="font-semibold text-gray-900">{entry.activity_name}</h4>
                            </div>
                            <p className="text-gray-600">{entry.note}</p>
                          </div>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Entry Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Add Journal Entry</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activity Name</label>
                <input
                  type="text"
                  value={newEntry.activity_name}
                  onChange={(e) => setNewEntry({ ...newEntry, activity_name: e.target.value })}
                  placeholder="e.g., Pink Tower, Pouring Water"
                  className="w-full px-4 py-2 border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select
                  value={newEntry.activity_area}
                  onChange={(e) => setNewEntry({ ...newEntry, activity_area: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl"
                >
                  <option value="practical_life">🧹 Practical Life</option>
                  <option value="sensorial">👁️ Sensorial</option>
                  <option value="mathematics">🔢 Mathematics</option>
                  <option value="language">📚 Language</option>
                  <option value="cultural">🌍 Cultural</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newEntry.note}
                  onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                  placeholder="What happened? How did they do?"
                  rows={3}
                  className="w-full px-4 py-2 border rounded-xl resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo URL <span className="text-gray-400">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="url"
                      value={newEntry.photo_url}
                      onChange={(e) => setNewEntry({ ...newEntry, photo_url: e.target.value })}
                      placeholder="Paste image URL from Google Photos, etc."
                      className="w-full px-4 py-2 border rounded-xl"
                    />
                  </div>
                  {newEntry.photo_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={newEntry.photo_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Upload photo to Google Photos or Imgur, then paste the link here
                </p>
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 px-4 py-2 border rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEntry}
                disabled={!newEntry.activity_name || !newEntry.note || saving}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
