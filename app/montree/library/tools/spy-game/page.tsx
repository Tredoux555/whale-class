// /montree/library/tools/spy-game/page.tsx
// Detective Spy Game Generator — ESL-friendly printable missions
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { escapeHtml } from '@/lib/sanitize';

// ============================================
// DETECTIVE SPY GAME GENERATOR
// ============================================
// Generates printable mission cards for ESL children
// 3 levels: Sound Spy, Word Spy, Action Spy
// Designed for L1 Chinese learners

type SpyLevel = 'sound' | 'word' | 'action';
type PrintMode = 'missions' | 'code-cards' | 'report';

// Pre-populated content per level
const SOUND_SPY_MISSIONS = [
  { sound: '/m/', instruction: 'Find 3 things that start with mmm' },
  { sound: '/s/', instruction: 'Find 3 things that start with sss' },
  { sound: '/f/', instruction: 'Find 3 things that start with fff' },
  { sound: '/n/', instruction: 'Find 3 things that start with nnn' },
  { sound: '/l/', instruction: 'Find 3 things that start with lll' },
  { sound: '/b/', instruction: 'Find 3 things that start with b' },
  { sound: '/p/', instruction: 'Find 3 things that start with p' },
  { sound: '/t/', instruction: 'Find 3 things that start with t' },
  { sound: '/d/', instruction: 'Find 3 things that start with d' },
  { sound: '/k/', instruction: 'Find 3 things that start with k' },
  { sound: '/g/', instruction: 'Find 3 things that start with g' },
  { sound: '/h/', instruction: 'Find 3 things that start with h' },
];
const WORD_SPY_WORDS: Record<string, string[]> = {
  'Short A': ['cat', 'bat', 'hat', 'mat', 'bag', 'tag', 'cap', 'map', 'fan', 'pan', 'can', 'van'],
  'Short E': ['bed', 'red', 'pen', 'hen', 'ten', 'pet', 'wet', 'net', 'jet', 'leg', 'peg', 'beg'],
  'Short I': ['pig', 'big', 'pin', 'bin', 'sit', 'hit', 'fit', 'lip', 'tip', 'dip', 'zip', 'rip'],
  'Short O': ['dog', 'log', 'pot', 'hot', 'dot', 'top', 'mop', 'hop', 'pop', 'box', 'fox', 'cot'],
  'Short U': ['cup', 'pup', 'bus', 'jug', 'mug', 'hug', 'bug', 'rug', 'tub', 'sun', 'run', 'fun'],
};

const ACTION_SPY_COMMANDS = [
  'Stand up',
  'Sit down',
  'Touch your nose',
  'Clap your hands',
  'Jump two times',
  'Walk to the door',
  'Point to the window',
  'Wave your hand',
  'Stamp your feet',
  'Turn around',
  'Touch your head',
  'Close your eyes',
  'Open your mouth',
  'Shake your hands',
  'Nod your head',
  'Put your hands up',
];

const LEVEL_CONFIG: Record<SpyLevel, { label: string; zhLabel: string; color: string; bgColor: string; badge: string }> = {
  sound: { label: 'Sound Spy', zhLabel: '声音侦探', color: '#065F46', bgColor: '#D1FAE5', badge: 'LEVEL 1' },
  word:  { label: 'Word Spy',  zhLabel: '单词侦探', color: '#1E40AF', bgColor: '#DBEAFE', badge: 'LEVEL 2' },
  action: { label: 'Action Spy', zhLabel: '动作侦探', color: '#9D174D', bgColor: '#FCE7F3', badge: 'LEVEL 3' },
};
export default function SpyGameGenerator() {
  const { t } = useI18n();
  const router = useRouter();

  const [level, setLevel] = useState<SpyLevel>('sound');
  const [customWords, setCustomWords] = useState('');
  const [customActions, setCustomActions] = useState('');
  const [borderColor, setBorderColor] = useState('#1a1a2e');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [cardsPerPage, setCardsPerPage] = useState<4 | 6>(4);
  const [printMode, setPrintMode] = useState<PrintMode>('missions');
  const [generating, setGenerating] = useState(false);

  // Get active word list based on level
  const getActiveItems = (): string[] => {
    if (level === 'sound') {
      return SOUND_SPY_MISSIONS.map(m => m.sound);
    }
    if (level === 'word') {
      if (customWords.trim()) {
        return customWords.split('\n').map(w => w.trim()).filter(Boolean);
      }
      return Object.values(WORD_SPY_WORDS).flat();
    }
    // action
    if (customActions.trim()) {
      return customActions.split('\n').map(w => w.trim()).filter(Boolean);
    }
    return ACTION_SPY_COMMANDS;
  };

  const addWordSet = (setName: string) => {
    const words = WORD_SPY_WORDS[setName];
    if (words) {
      setCustomWords(prev => {
        const existing = prev.trim();
        return existing ? existing + '\n' + words.join('\n') : words.join('\n');
      });
    }
  };
  // Generate printable output
  const generatePrint = () => {
    const items = getActiveItems();
    if (items.length === 0) {
      alert('Please add some items first!');
      return;
    }

    setGenerating(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to use the print feature');
        setGenerating(false);
        return;
      }

      const levelCfg = LEVEL_CONFIG[level];
      let html = '';

      if (printMode === 'missions') {
        html = generateMissionCards(items, levelCfg);
      } else if (printMode === 'code-cards') {
        html = generateCodeCards(items, levelCfg);
      } else {
        html = generateSpyReport(items, levelCfg);
      }

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating print:', error);
      alert('Error generating print. Please try again.');
    }
    setGenerating(false);
  };

  const wrapPage = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "${escapeHtml(fontFamily)}", "Comic Sans MS", cursive; background: white; }
    .page {
      page-break-after: always;
      width: 21cm; height: 29.7cm;
      position: relative; overflow: hidden;
      padding: 1cm;
    }
    .page:last-child { page-break-after: auto; }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    }
    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; margin: 0 auto 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
${bodyContent}
<script>window.onload = function() { setTimeout(() => window.print(), 500); };</script>
</body>
</html>`;

  const generateMissionCards = (items: string[], cfg: typeof LEVEL_CONFIG.sound) => {
    const rows = cardsPerPage === 4 ? 2 : 3;
    const cols = 2;
    const cardW = 8.5;
    const cardH = cardsPerPage === 4 ? 12 : 8;
    const gap = 0.5;

    let pages = '';
    for (let i = 0; i < items.length; i += cardsPerPage) {
      const pageItems = items.slice(i, i + cardsPerPage);
      let cards = '';
      pageItems.forEach((item, idx) => {
        const missionNum = i + idx + 1;
        let mainText = '';
        let instruction = '';

        if (level === 'sound') {
          const mission = SOUND_SPY_MISSIONS.find(m => m.sound === item);
          mainText = item;
          instruction = mission?.instruction || 'Find things with this sound';
        } else if (level === 'word') {
          mainText = item;
          instruction = 'Read this word. Find something that matches!';
        } else {
          mainText = item;
          instruction = 'Do this action! Show your teacher.';
        }

        cards += `
          <div style="
            width: ${cardW}cm; height: ${cardH}cm;
            border: 3px solid ${borderColor};
            border-radius: 0.5cm;
            display: flex; flex-direction: column;
            overflow: hidden;
            background: white;
          ">
            <div style="
              background: ${cfg.bgColor}; padding: 0.3cm 0.5cm;
              display: flex; justify-content: space-between; align-items: center;
              border-bottom: 2px solid ${cfg.color};
            ">
              <span style="font-size: 10pt; font-weight: bold; color: ${cfg.color};">
                ${cfg.badge}
              </span>
              <span style="
                background: ${cfg.color}; color: white;
                padding: 2px 10px; border-radius: 20px;
                font-size: 9pt; font-weight: bold;
              ">MISSION #${missionNum}</span>
            </div>
            <div style="
              flex: 1; display: flex; flex-direction: column;
              align-items: center; justify-content: center;
              padding: 0.5cm; text-align: center;
            ">
              <div style="
                font-size: ${level === 'action' ? '18pt' : '28pt'};
                font-weight: bold; color: ${cfg.color};
                margin-bottom: 0.4cm;
                ${level === 'word' ? 'letter-spacing: 2px;' : ''}
              ">${escapeHtml(mainText)}</div>
              <div style="
                font-size: 11pt; color: #555;
                line-height: 1.4; max-width: 90%;
              ">${escapeHtml(instruction)}</div>
            </div>
            <div style="
              background: ${borderColor}; color: white;
              text-align: center; padding: 0.2cm;
              font-size: 8pt; letter-spacing: 1px;
            ">-- TOP SECRET --</div>
          </div>`;
      });

      pages += `
        <div class="page">
          <div style="
            display: grid;
            grid-template-columns: repeat(${cols}, ${cardW}cm);
            grid-template-rows: repeat(${rows}, ${cardH}cm);
            gap: ${gap}cm;
            justify-content: center;
            align-content: center;
            height: 100%;
          ">${cards}</div>
        </div>`;
    }
    return wrapPage(`Spy Game - ${cfg.label} - Mission Cards`, pages);
  };
  const generateCodeCards = (items: string[], cfg: typeof LEVEL_CONFIG.sound) => {
    const perPage = 12;
    const cols = 3;
    const rows = 4;
    const cardW = 5.5;
    const cardH = 5.5;

    let pages = '';
    for (let i = 0; i < items.length; i += perPage) {
      const pageItems = items.slice(i, i + perPage);

      let cards = '';
      pageItems.forEach((item) => {
        cards += `
          <div style="
            width: ${cardW}cm; height: ${cardH}cm;
            border: 2px dashed ${borderColor};
            border-radius: 0.4cm;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            text-align: center; padding: 0.3cm;
            background: white;
          ">
            <div style="
              font-size: 8pt; color: ${cfg.color};
              font-weight: bold; margin-bottom: 0.3cm;
              letter-spacing: 1px;
            ">SECRET CODE</div>
            <div style="
              font-size: ${level === 'action' ? '14pt' : '22pt'};
              font-weight: bold; color: #1a1a1a;
              ${level === 'word' ? 'letter-spacing: 3px;' : ''}
            ">${escapeHtml(item)}</div>
          </div>`;
      });

      pages += `
        <div class="page">
          <div style="text-align: center; margin-bottom: 0.5cm;">
            <span style="font-size: 14pt; font-weight: bold; color: ${cfg.color};">
              Secret Code Cards - ${escapeHtml(cfg.label)}
            </span>
          </div>
          <div style="
            display: grid;
            grid-template-columns: repeat(${cols}, ${cardW}cm);
            grid-template-rows: repeat(${rows}, ${cardH}cm);
            gap: 0.4cm;
            justify-content: center;
          ">${cards}</div>
        </div>`;
    }
    return wrapPage(`Spy Game - ${cfg.label} - Code Cards`, pages);
  };
  const generateSpyReport = (items: string[], cfg: typeof LEVEL_CONFIG.sound) => {
    const checkboxes = items.map((item, idx) => `
      <div style="
        display: flex; align-items: center; gap: 0.4cm;
        padding: 0.25cm 0;
        border-bottom: 1px dotted #ddd;
      ">
        <div style="
          width: 0.6cm; height: 0.6cm;
          border: 2px solid ${cfg.color};
          border-radius: 3px; flex-shrink: 0;
        "></div>
        <span style="font-size: 13pt; color: #333;">
          Mission #${idx + 1}: <strong>${escapeHtml(item)}</strong>
        </span>
      </div>
    `).join('');

    const page = `
      <div class="page">
        <div style="text-align: center; margin-bottom: 0.6cm;">
          <div style="
            font-size: 22pt; font-weight: bold; color: ${cfg.color};
            letter-spacing: 1px;
          ">SPY REPORT</div>
          <div style="font-size: 11pt; color: #666; margin-top: 0.2cm;">
            ${escapeHtml(cfg.label)} -- TOP SECRET
          </div>
        </div>

        <div style="
          border: 2px solid ${borderColor}; border-radius: 0.4cm;
          padding: 0.5cm; margin-bottom: 0.5cm;
        ">
          <div style="display: flex; gap: 1cm; margin-bottom: 0.4cm;">
            <div style="flex: 1;">
              <span style="font-size: 10pt; color: #888;">Agent Name:</span>
              <div style="border-bottom: 1px solid #ccc; height: 1cm;"></div>
            </div>
            <div style="flex: 1;">
              <span style="font-size: 10pt; color: #888;">Date:</span>
              <div style="border-bottom: 1px solid #ccc; height: 1cm;"></div>
            </div>
          </div>
        </div>

        <div style="
          border: 2px solid ${cfg.color}; border-radius: 0.4cm;
          padding: 0.5cm;
        ">
          <div style="font-size: 12pt; font-weight: bold; color: ${cfg.color}; margin-bottom: 0.3cm;">
            Mission Checklist
          </div>
          ${checkboxes}
        </div>

        <div style="
          margin-top: 0.5cm; padding: 0.4cm;
          background: ${cfg.bgColor}; border-radius: 0.3cm;
          text-align: center;
        ">
          <div style="font-size: 11pt; color: ${cfg.color}; font-weight: bold;">
            Missions Complete: _____ / ${items.length}
          </div>
          <div style="font-size: 10pt; color: ${cfg.color}; margin-top: 0.2cm;">
            Great work, Agent!
          </div>
        </div>
      </div>`;

    return wrapPage(`Spy Game - ${cfg.label} - Spy Report`, page);
  };
  const items = getActiveItems();
  const levelCfg = LEVEL_CONFIG[level];

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '24px',
        padding: '24px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: '16px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <button onClick={() => router.back()} style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
            ← {t('tools.back_to_tools') || 'Back'}
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: '800' }}>
              {t('tools.spy_game') || 'Detective Spy Game'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
              {t('tools.spy_game_subtitle') || 'Printable mission cards for ESL learners'}
            </p>
          </div>
          <div style={{ width: '80px' }}></div>
        </div>
      </div>

      {/* Level Selector */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#333' }}>
          {t('tools.spy_select_level') || 'Select Spy Level'}
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(Object.keys(LEVEL_CONFIG) as SpyLevel[]).map(lv => {
            const cfg = LEVEL_CONFIG[lv];
            const isActive = level === lv;
            return (
              <button
                key={lv}
                onClick={() => setLevel(lv)}
                style={{
                  flex: '1 1 140px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: isActive ? `3px solid ${cfg.color}` : '3px solid #e0e0e0',
                  backgroundColor: isActive ? cfg.bgColor : '#fff',
                  color: cfg.color,
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: '600', marginBottom: '4px', opacity: 0.7 }}>{cfg.badge}</div>
                <div>{cfg.label}</div>
                <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '4px', opacity: 0.8 }}>{cfg.zhLabel}</div>
              </button>
            );
          })}
        </div>

        {/* Level description */}
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: levelCfg.bgColor,
          borderRadius: '8px',
          fontSize: '13px',
          color: levelCfg.color,
          lineHeight: 1.6,
        }}>
          {level === 'sound' && (
            <span><strong>Sound Spy:</strong> No reading required. Children listen for initial sounds and find matching objects. Uses sounds shared with Mandarin (/m/, /s/, /f/, /n/, /l/) first. Perfect during the Silent Period.</span>
          )}
          {level === 'word' && (
            <span><strong>Word Spy:</strong> CVC word reading. Children decode words and match to objects. Start with short-a words (most accessible for Chinese L1 learners).</span>
          )}
          {level === 'action' && (
            <span><strong>Action Spy:</strong> TPR (Total Physical Response) commands. Children prove comprehension through ACTION — no speaking or reading required. Ideal for Silent Period and early speech stages.</span>
          )}
        </div>
      </div>
      {/* Settings */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#333' }}>
          {t('tools.spy_settings') || 'Print Settings'}
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              {t('tools.spy_print_type') || 'Print Type'}
            </label>
            <select
              value={printMode}
              onChange={(e) => setPrintMode(e.target.value as PrintMode)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff' }}
            >
              <option value="missions">{t('tools.spy_mission_cards') || 'Mission Cards'}</option>
              <option value="code-cards">{t('tools.spy_code_cards') || 'Secret Code Cards'}</option>
              <option value="report">{t('tools.spy_report') || 'Spy Report Sheet'}</option>
            </select>
          </div>

          {printMode === 'missions' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                {t('tools.spy_cards_per_page') || 'Cards per Page'}
              </label>
              <select
                value={cardsPerPage}
                onChange={(e) => setCardsPerPage(Number(e.target.value) as 4 | 6)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff' }}
              >
                <option value={4}>4 (large)</option>
                <option value={6}>6 (medium)</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              {t('tools.border_color') || 'Border Color'}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
              <input type="text" value={borderColor} onChange={(e) => setBorderColor(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '2px solid #e0e0e0', width: '90px', fontFamily: 'monospace', fontSize: '12px' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              {t('tools.font') || 'Font'}
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff' }}
            >
              <option value="Comic Sans MS">Comic Sans MS</option>
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
        </div>
      </div>
      {/* Word Sets (for Word Spy) */}
      {level === 'word' && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#333' }}>
            {t('tools.spy_quick_add') || 'Quick Add CVC Word Sets'}
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.keys(WORD_SPY_WORDS).map(setName => (
              <button key={setName} onClick={() => addWordSet(setName)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: 'none',
                  backgroundColor: setName.includes('A') ? '#FEE2E2' : setName.includes('E') ? '#DBEAFE' : setName.includes('I') ? '#FCE7F3' : setName.includes('O') ? '#FEF3C7' : '#D1FAE5',
                  color: setName.includes('A') ? '#991B1B' : setName.includes('E') ? '#1E40AF' : setName.includes('I') ? '#9D174D' : setName.includes('O') ? '#92400E' : '#065F46',
                  cursor: 'pointer', fontSize: '13px', fontWeight: '500'
                }}
              >+ {setName}</button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Input (for Word Spy and Action Spy) */}
      {(level === 'word' || level === 'action') && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#333' }}>
            {level === 'word'
              ? (t('tools.spy_custom_words') || 'Custom Words')
              : (t('tools.spy_custom_actions') || 'Custom Actions')}
          </h2>
          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px' }}>
            {level === 'word'
              ? 'Enter one word per line. Leave empty to use all default CVC words.'
              : 'Enter one action per line. Leave empty to use all default TPR commands.'}
          </p>
          <textarea
            value={level === 'word' ? customWords : customActions}
            onChange={(e) => level === 'word' ? setCustomWords(e.target.value) : setCustomActions(e.target.value)}
            placeholder={level === 'word' ? 'cat\ndog\nhat\nsun' : 'Stand up\nSit down\nTouch your nose'}
            style={{
              width: '100%', minHeight: '120px', padding: '12px',
              borderRadius: '8px', border: '2px solid #e0e0e0',
              fontFamily: 'system-ui', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
            }}
          />
        </div>
      )}
      {/* Preview & Print */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
            {t('tools.spy_preview') || 'Preview'} ({items.length} {level === 'action' ? 'actions' : level === 'sound' ? 'sounds' : 'words'})
          </h2>
          <button
            onClick={generatePrint}
            disabled={generating || items.length === 0}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              backgroundColor: items.length > 0 ? levelCfg.color : '#ccc',
              color: '#fff', cursor: items.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '600', fontSize: '14px',
              opacity: generating ? 0.7 : 1
            }}
          >
            {generating ? (t('tools.generating') || 'Generating...') : (t('tools.print') || 'Print')}
          </button>
        </div>

        {/* Item preview chips */}
        {items.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {items.slice(0, 30).map((item, idx) => (
              <span key={idx} style={{
                padding: '6px 14px', borderRadius: '20px',
                backgroundColor: levelCfg.bgColor, color: levelCfg.color,
                fontSize: '13px', fontWeight: '600',
              }}>{item}</span>
            ))}
            {items.length > 30 && (
              <span style={{ padding: '6px 14px', color: '#999', fontSize: '13px' }}>
                +{items.length - 30} more
              </span>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <p style={{ fontSize: '16px', margin: 0 }}>
              {level === 'sound' ? 'Sound missions ready to print!' : 'Add some items to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '24px', padding: '20px',
        backgroundColor: '#EFF6FF', borderRadius: '12px',
        borderLeft: `4px solid ${levelCfg.color}`
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: levelCfg.color, fontSize: '1rem' }}>
          {t('tools.spy_how_to_use') || 'How to Use in the Classroom'}
        </h3>
        <ul style={{ margin: 0, color: levelCfg.color, lineHeight: 1.8, fontSize: '14px', paddingLeft: '20px' }}>
          <li><strong>Print Mission Cards</strong> — laminate and place in a basket on the language shelf</li>
          <li><strong>Print Code Cards</strong> — children match code cards to objects or pictures</li>
          <li><strong>Print Spy Report</strong> — children check off missions as they complete them</li>
          <li><strong>Silent Period friendly</strong> — Sound Spy and Action Spy need zero speaking</li>
        </ul>
        <p style={{ margin: '12px 0 0 0', color: levelCfg.color, fontSize: '13px' }}>
          Designed for L1 Chinese children learning English. Sounds shared with Mandarin are prioritized in Level 1.
        </p>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center', padding: '16px', color: '#999', fontSize: '14px' }}>
        Made with 🥔 by Teacher Potato
      </div>
    </div>
  );
}
