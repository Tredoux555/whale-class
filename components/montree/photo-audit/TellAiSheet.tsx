'use client';

// Tell the AI what it is — bottom sheet that lets a teacher type freeform
// context about a photo, calls /api/montree/photo-audit/tell-ai to get a
// Sonnet proposal, then calls /api/montree/photo-audit/resolve with
// {type: 'new_custom'} to save it as a fresh custom curriculum work.

import React, { useState } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { invalidateEnglishWeekCache } from '@/lib/montree/cache';
import { useI18n } from '@/lib/montree/i18n';
import { getAreaLabel, AREA_KEYS } from '@/lib/montree/i18n/area-labels';
import VoiceDictate from '@/components/montree/voice/VoiceDictate';

interface Photo {
  id: string;
  url: string | null;
  child_name?: string;
}

interface Proposal {
  proposed_name: string;
  suggested_area: string;
  visual_description: string;
  parent_description: string;
  why_it_matters: string;
  key_materials: string[];
}

interface Props {
  photo: Photo;
  onClose: () => void;
  onSaved: (photoId: string) => void;
}

export default function TellAiSheet({ photo, onClose, onSaved }: Props) {
  const { locale } = useI18n();
  const [context, setContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedArea, setEditedArea] = useState('practical_life');
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (context.trim().length < 5) {
      setError('Please describe what this is (at least a few words).');
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await montreeApi('/api/montree/photo-audit/tell-ai', {
        method: 'POST',
        body: JSON.stringify({ media_id: photo.id, teacher_context: context.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'AI could not generate a proposal — try rewording.');
        return;
      }
      setProposal(json.proposal);
      setEditedName(json.proposal.proposed_name);
      setEditedArea(json.proposal.suggested_area);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!proposal) return;
    const name = editedName.trim();
    if (name.length < 2 || name.length > 80) {
      setError('Name must be 2–80 characters.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await montreeApi('/api/montree/photo-audit/resolve', {
        method: 'POST',
        body: JSON.stringify({
          media_id: photo.id,
          resolution: { type: 'new_custom', name, area_key: editedArea },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to save');
        return;
      }
      // Session 119: invalidate english-missing cache (the new_custom resolve
      // sets teacher_confirmed=true on the photo with a Language-area work).
      invalidateEnglishWeekCache();
      onSaved(photo.id);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 560,
          height: 'min(720px, 90vh)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Tell the AI what it is
            </div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
              Describe it in your own words — the AI will write up a custom work.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#999' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {photo.url && (
            <img
              src={photo.url}
              alt=""
              style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 12, background: '#f5f5f5', marginBottom: 16 }}
            />
          )}

          {!proposal && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>
                  What is happening in this photo?
                </label>
                <VoiceDictate
                  size="sm"
                  onAppend={(text) => setContext((prev) => (prev ? prev + ' ' + text : text))}
                />
              </div>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. This is a phonics review game I set up to help the kids practice letter sound recognition. They match the letter card to an object in the basket."
                rows={5}
                disabled={generating}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid #ddd',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>
                Be specific — name the materials, the goal, what the child does. The AI will use this plus the photo to write the curriculum entry.
              </div>
            </>
          )}

          {proposal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Work Name
                </label>
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginTop: 4,
                    borderRadius: 10,
                    border: '1px solid #ddd',
                    fontSize: 15,
                    fontWeight: 600,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Area
                </label>
                <select
                  value={editedArea}
                  onChange={(e) => setEditedArea(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginTop: 4,
                    borderRadius: 10,
                    border: '1px solid #ddd',
                    fontSize: 14,
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  {AREA_KEYS.map(k => (
                    <option key={k} value={k}>{getAreaLabel(k, locale)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  For Parents
                </label>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4, lineHeight: 1.5, background: '#f9f9f9', padding: 12, borderRadius: 10 }}>
                  {proposal.parent_description}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Why It Matters
                </label>
                <div style={{ fontSize: 13, color: '#333', marginTop: 4, lineHeight: 1.5, background: '#f9f9f9', padding: 12, borderRadius: 10 }}>
                  {proposal.why_it_matters}
                </div>
              </div>

              {proposal.key_materials.length > 0 && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Materials
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {proposal.key_materials.map((m, i) => (
                      <span key={i} style={{ fontSize: 12, background: '#ede9fe', color: '#5b21b6', padding: '4px 10px', borderRadius: 999 }}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setProposal(null); setError(null); }}
                style={{
                  fontSize: 12,
                  color: '#7c3aed',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                  padding: 0,
                }}
              >
                ← Edit description and regenerate
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={generating || saving}
            style={{
              flex: '0 0 auto',
              padding: '12px 18px',
              borderRadius: 12,
              border: '1px solid #ddd',
              background: '#fff',
              color: '#555',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          {!proposal ? (
            <button
              onClick={handleGenerate}
              disabled={generating || context.trim().length < 5}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                background: generating || context.trim().length < 5 ? '#c4b5fd' : '#7c3aed',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: generating || context.trim().length < 5 ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? 'Generating…' : '✨ Generate Proposal'}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                background: saving ? '#c4b5fd' : '#7c3aed',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : '✓ Save as New Work'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
