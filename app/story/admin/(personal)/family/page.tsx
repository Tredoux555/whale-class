'use client';

// Family — the captain's surface for the one-way context channel into a loved
// one's coach. Pick a person → write & manage a running list of real-world
// observations and "skills to gently build" that their coach uses.
//
// 🔒 What this page can and cannot do (said plainly to the captain):
//   • You hand context IN. Their coach uses it to help THEM.
//   • You can NEVER read what they say to their coach. That stays sealed and
//     private to them, always — child OR partner. Hand-in only, never read-out.
//
// 🤝 The one difference, by recipient kind:
//   • a CHILD's coach uses it as quiet background (the child-therapist model);
//   • a PARTNER's coach is TRANSPARENT — she knows a loved one shared something,
//     it supports HER, and it's never covert correction or control.

import { useCallback, useEffect, useState } from 'react';
import { pget, ppost, ppatch } from '@/lib/story/personal-client';
import { T } from '@/lib/story/personal-theme';

type LinkKind = 'to_child' | 'to_partner';
interface Recipient {
  space: string;
  display_name: string;
  kind: LinkKind;
  last_login: string | null;
  note_count: number;
}
interface ContextNote {
  id: string;
  observation: string;
  skill_tag: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export default function FamilyPage() {
  const [role, setRole] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState<ContextNote[] | null>(null);
  const [loadErr, setLoadErr] = useState('');

  const [obs, setObs] = useState('');
  const [skill, setSkill] = useState('');
  const [busy, setBusy] = useState(false);
  const [formMsg, setFormMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editObs, setEditObs] = useState('');
  const [editSkill, setEditSkill] = useState('');

  // Family Brain (pattern-level read; never attributed to a person).
  const [brainObs, setBrainObs] = useState<string | null>(null);
  const [brainBusy, setBrainBusy] = useState(false);

  const current = recipients?.find((r) => r.space === selected) || null;
  const isPartner = current?.kind === 'to_partner';
  const name = current?.display_name || 'them';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await pget<{ role: string; recipients: Recipient[] }>('/api/story/admin/family/recipients');
        if (cancelled) return;
        setRole(data.role);
        setRecipients(data.recipients || []);
        if ((data.recipients || []).length) setSelected(data.recipients[0].space);
      } catch {
        if (!cancelled) { setRecipients([]); setLoadErr('Could not load your family.'); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadNotes = useCallback(async (space: string) => {
    setNotes(null);
    try {
      const data = await pget<{ notes: ContextNote[] }>(`/api/story/admin/family/context?child=${encodeURIComponent(space)}`);
      setNotes(data.notes || []);
    } catch {
      setNotes([]);
    }
  }, []);

  useEffect(() => {
    if (selected) void loadNotes(selected);
  }, [selected, loadNotes]);

  async function refreshCounts() {
    try {
      const data = await pget<{ recipients: Recipient[] }>('/api/story/admin/family/recipients');
      setRecipients(data.recipients || []);
    } catch { /* non-fatal */ }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const observation = obs.trim();
    if (!observation) return;
    setBusy(true);
    setFormMsg(null);
    try {
      await ppost('/api/story/admin/family/context', { child: selected, observation, skill_tag: skill.trim() || undefined });
      setObs(''); setSkill('');
      setFormMsg({ kind: 'ok', text: `Shared with ${name}'s coach.` });
      await loadNotes(selected);
      void refreshCounts();
    } catch (err) {
      setFormMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Could not save.' });
    } finally {
      setBusy(false);
    }
  }

  function startEdit(n: ContextNote) {
    setEditingId(n.id);
    setEditObs(n.observation);
    setEditSkill(n.skill_tag || '');
  }
  async function saveEdit(id: string) {
    const observation = editObs.trim();
    if (!observation) return;
    try {
      await ppatch('/api/story/admin/family/context', { id, observation, skill_tag: editSkill.trim() || null });
      setEditingId(null);
      if (selected) await loadNotes(selected);
    } catch { /* keep edit open on failure */ }
  }
  async function removeNote(id: string) {
    try {
      await ppatch('/api/story/admin/family/context', { id, archived: true });
      if (selected) await loadNotes(selected);
      void refreshCounts();
    } catch { /* non-fatal */ }
  }

  async function askBrain() {
    setBrainBusy(true);
    try {
      const data = await ppost<{ observation: string }>('/api/story/admin/family/brain', {});
      setBrainObs(data.observation || 'All quiet right now.');
    } catch {
      setBrainObs('Could not read the family right now — try again in a moment.');
    } finally {
      setBrainBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '11px 13px', borderRadius: 11,
    background: 'rgba(8,20,12,0.6)', border: `1px solid ${T.border}`, color: T.text,
    fontFamily: T.sans, fontSize: 15, outline: 'none',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, color: T.textMid, marginBottom: 6, fontWeight: 500 };

  if (recipients !== null && role !== null && role !== 'parent') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 16px', color: T.textMid, fontFamily: T.sans }}>
        <div style={{ fontSize: 32, marginBottom: 10 }}>🌿</div>
        <p style={{ fontSize: 15 }}>This area is for the family captain, feeding context to a loved one&apos;s coach.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.text, margin: '0 0 4px' }}>Family</h1>
      <p style={{ color: T.textMid, fontSize: 14, margin: '0 0 8px', lineHeight: 1.55 }}>
        You&apos;re the captain here. Tell a loved one&apos;s coach what you notice in the real world — and the
        skills you&apos;d like it to gently help with. Their coach takes it from there.
      </p>

      {/* Family Brain — pattern-level read, never attributed. Parents only. */}
      {recipients && recipients.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,201,106,0.12), rgba(232,201,106,0.04))',
          border: `1px solid ${T.borderSoft}`, borderRadius: 16, padding: '15px 16px', margin: '0 0 24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.text }}>What I&apos;m seeing in your family</div>
            <button
              onClick={askBrain} disabled={brainBusy}
              style={{
                appearance: 'none', border: `1px solid ${T.border}`, cursor: brainBusy ? 'default' : 'pointer',
                background: 'rgba(255,255,255,0.05)', color: T.text, fontFamily: T.sans, fontSize: 13.5, fontWeight: 600,
                padding: '8px 14px', borderRadius: 10, whiteSpace: 'nowrap',
              }}
            >
              {brainBusy ? 'Looking…' : brainObs ? 'Refresh' : 'Ask'}
            </button>
          </div>
          {brainObs ? (
            <p style={{ color: T.textMid, fontSize: 14, lineHeight: 1.6, margin: '12px 0 0' }}>{brainObs}</p>
          ) : (
            <p style={{ color: T.textDim, fontSize: 13, lineHeight: 1.55, margin: '10px 0 0' }}>
              A quiet, family-level read of how everyone&apos;s doing together — patterns only, never anyone&apos;s private words.
            </p>
          )}
        </div>
      )}

      {recipients === null && !loadErr ? (
        <p style={{ color: T.textDim, fontSize: 14 }}>Loading…</p>
      ) : loadErr ? (
        <p style={{ color: '#f2a3a3', fontSize: 14 }}>{loadErr}</p>
      ) : recipients.length === 0 ? (
        <p style={{ color: T.textDim, fontSize: 14, lineHeight: 1.6 }}>
          No one linked yet. A loved one&apos;s sanctuary needs to be created and linked to you before you can feed their coach context.
        </p>
      ) : (
        <>
          {recipients.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              {recipients.map((r) => {
                const active = r.space === selected;
                return (
                  <button
                    key={r.space}
                    onClick={() => setSelected(r.space)}
                    style={{
                      appearance: 'none', cursor: 'pointer', borderRadius: 12, padding: '9px 14px',
                      border: `1px solid ${active ? T.emerald : T.border}`,
                      background: active ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)',
                      color: active ? T.text : T.textMid, fontFamily: T.sans, fontSize: 14, fontWeight: active ? 600 : 500,
                    }}
                  >
                    {r.display_name}
                    <span style={{ color: T.textDim, fontWeight: 400 }}>{r.kind === 'to_partner' ? ' · partner' : ' · child'}</span>
                    {r.note_count ? ` · ${r.note_count}` : ''}
                  </button>
                );
              })}
            </div>
          )}

          {/* The seal, adapted to the selected recipient. */}
          <div style={{
            fontSize: 13, color: T.textMid, lineHeight: 1.55, background: 'rgba(52,211,153,0.07)',
            border: `1px solid ${T.borderSoft}`, borderRadius: 12, padding: '11px 13px', margin: '0 0 22px',
          }}>
            {isPartner ? (
              <>🤝 {name} is an adult, so this is open, not secret — her coach may acknowledge that a loved one
              shared something, and it works in service of <strong style={{ color: T.text }}>her</strong>, never as
              correction or control. And you still can <strong style={{ color: T.text }}>never</strong> read what she
              tells her coach. Hand-in only, never read-out.</>
            ) : (
              <>🔒 You hand context <strong style={{ color: T.text }}>in</strong> — you can never read what {name}
              {' '}says to their coach. That stays private to them, always. It&apos;s how a good child therapist works:
              they take a briefing from you and keep the child&apos;s sessions sacred.</>
            )}
          </div>

          {/* Composer */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: 20, marginBottom: 26 }}>
            <h2 style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 600, color: T.text, margin: '0 0 16px' }}>
              Tell {name}&apos;s coach
            </h2>
            <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>What you&apos;ve noticed</label>
                <textarea
                  value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
                  placeholder={isPartner
                    ? "e.g. She's been carrying a lot lately and is hardest on herself when she's tired."
                    : "e.g. He's been anxious about the swimming gala and keeps saying he's no good at it."}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 76, lineHeight: 1.5 }}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {isPartner ? 'Something to gently support' : 'A skill to gently build'} <span style={{ color: T.textDim }}>(optional)</span>
                </label>
                <input
                  style={inputStyle} value={skill} onChange={(e) => setSkill(e.target.value)}
                  placeholder={isPartner ? 'e.g. self-compassion / rest' : 'e.g. courage / handling nerves / self-belief'}
                />
              </div>
              {formMsg && (
                <div style={{
                  fontSize: 13.5, padding: '10px 13px', borderRadius: 10,
                  background: formMsg.kind === 'ok' ? 'rgba(52,211,153,0.12)' : 'rgba(242,120,120,0.12)',
                  border: `1px solid ${formMsg.kind === 'ok' ? T.border : 'rgba(242,120,120,0.3)'}`,
                  color: formMsg.kind === 'ok' ? T.text : '#f2a3a3',
                }}>
                  {formMsg.text}
                </div>
              )}
              <button
                type="submit" disabled={busy || !obs.trim()}
                style={{
                  appearance: 'none', border: 'none', cursor: busy || !obs.trim() ? 'default' : 'pointer',
                  background: busy || !obs.trim() ? 'rgba(52,211,153,0.25)' : `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`,
                  color: '#06140c', fontFamily: T.sans, fontSize: 15, fontWeight: 600, padding: '12px 16px', borderRadius: 12,
                }}
              >
                {busy ? 'Sharing…' : `Share with ${name}'s coach`}
              </button>
            </form>
          </div>

          {/* Existing notes */}
          <h3 style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.text, margin: '0 0 12px' }}>
            What you&apos;ve shared
          </h3>
          {notes === null ? (
            <p style={{ color: T.textDim, fontSize: 14 }}>Loading…</p>
          ) : notes.length === 0 ? (
            <p style={{ color: T.textDim, fontSize: 14 }}>Nothing yet. The first thing you share will appear here.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map((n) => (
                <div key={n.id} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: '13px 15px' }}>
                  {editingId === n.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <textarea value={editObs} onChange={(e) => setEditObs(e.target.value)} rows={3}
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 70, lineHeight: 1.5 }} />
                      <input style={inputStyle} value={editSkill} onChange={(e) => setEditSkill(e.target.value)} placeholder="Skill (optional)" />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => saveEdit(n.id)} disabled={!editObs.trim()}
                          style={{ appearance: 'none', border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${T.emerald}, ${T.emeraldDeep})`, color: '#06140c', fontWeight: 600, fontSize: 13.5, padding: '8px 14px', borderRadius: 10 }}>
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ appearance: 'none', border: `1px solid ${T.borderSoft}`, background: 'transparent', color: T.textMid, fontSize: 13.5, padding: '8px 14px', borderRadius: 10, cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ color: T.text, fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{n.observation}</div>
                      {n.skill_tag && (
                        <div style={{ display: 'inline-block', marginTop: 8, fontSize: 12, color: T.emerald, background: 'rgba(52,211,153,0.1)', border: `1px solid ${T.borderSoft}`, borderRadius: 999, padding: '3px 10px' }}>
                          🌱 {n.skill_tag}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        <span style={{ fontSize: 11.5, color: T.textDim }}>{new Date(n.created_at).toLocaleDateString()}</span>
                        <span style={{ display: 'flex', gap: 14 }}>
                          <button onClick={() => startEdit(n)} style={{ appearance: 'none', border: 'none', background: 'transparent', color: T.textDim, fontSize: 12.5, cursor: 'pointer' }}>Edit</button>
                          <button onClick={() => removeNote(n.id)} style={{ appearance: 'none', border: 'none', background: 'transparent', color: '#d98b8b', fontSize: 12.5, cursor: 'pointer' }}>Remove</button>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
