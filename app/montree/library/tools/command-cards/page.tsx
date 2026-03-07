// /montree/library/tools/command-cards/page.tsx
// AMI Command Cards Generator — Montessori reading comprehension through action
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import { escapeHtml } from '@/lib/sanitize';

// ============================================
// AMI COMMAND CARDS GENERATOR
// ============================================
// Generates printable command cards for the
// Montessori language curriculum.
// 3 levels: single action, two actions, chains
// ESL-friendly with optional Chinese translation
// ============================================

type CommandLevel = 'level1' | 'level2' | 'level3';

const LEVEL_1_COMMANDS = [
  'sit', 'stand', 'walk', 'run', 'hop',
  'jump', 'stop', 'clap', 'wave', 'nod',
  'push', 'pull', 'read', 'draw', 'cut',
  'fold', 'pour', 'mix', 'open', 'close',
  'wash', 'dry', 'roll', 'spin',
];
const LEVEL_2_COMMANDS = [
  'sit and stand',
  'walk and stop',
  'jump and clap',
  'open the door',
  'close the book',
  'wash your hands',
  'touch the table',
  'pick up the pen',
  'put down the cup',
  'push the chair',
  'pull the mat',
  'roll the rug',
  'pour the water',
  'cut the paper',
  'fold the cloth',
  'wave and smile',
];

const LEVEL_3_COMMANDS = [
  'Walk to the door, touch it, and come back.',
  'Pick up the red pencil and put it on the shelf.',
  'Stand up, push in your chair, and walk to the rug.',
  'Open the box, take out the beads, and close the box.',
  'Walk to the window, look outside, and come back.',
  'Pick up the cloth, fold it, and put it in the basket.',
  'Pour the water into the cup and carry it to the table.',
  'Take the book from the shelf and put it on the mat.',
  'Walk around the table two times and sit down.',
  'Touch your nose, clap your hands, and jump one time.',
  'Pick up the tray, carry it to the shelf, and put it down.',
  'Go to the door, open it, close it, and come back.',
];

const LEVEL_1_CHINESE: Record<string, string> = {
  'sit': '坐', 'stand': '站', 'walk': '走', 'run': '跑', 'hop': '单脚跳',
  'jump': '跳', 'stop': '停', 'clap': '拍手', 'wave': '挥手', 'nod': '点头',
  'push': '推', 'pull': '拉', 'read': '读', 'draw': '画', 'cut': '剪',
  'fold': '折', 'pour': '倒', 'mix': '搅拌', 'open': '打开', 'close': '关上',
  'wash': '洗', 'dry': '擦干', 'roll': '卷', 'spin': '转',
};

const LEVEL_CONFIG: Record<CommandLevel, { label: string; zhLabel: string; color: string; bgColor: string; borderDefault: string }> = {
  level1: { label: 'Single Action', zhLabel: '单个动作', color: '#BE185D', bgColor: '#FCE7F3', borderDefault: '#BE185D' },
  level2: { label: 'Two Actions',   zhLabel: '两个动作', color: '#1D4ED8', bgColor: '#DBEAFE', borderDefault: '#1D4ED8' },
  level3: { label: 'Action Chains', zhLabel: '动作链',   color: '#047857', bgColor: '#D1FAE5', borderDefault: '#047857' },
};
export default function CommandCardsGenerator() {
  const { t } = useI18n();
  const router = useRouter();

  const [level, setLevel] = useState<CommandLevel>('level1');
  const [customCommands, setCustomCommands] = useState('');
  const [borderColor, setBorderColor] = useState('#BE185D');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [cardsPerPage, setCardsPerPage] = useState<4 | 6 | 8>(6);
  const [showChinese, setShowChinese] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Update border color when level changes
  const handleLevelChange = (newLevel: CommandLevel) => {
    setLevel(newLevel);
    setBorderColor(LEVEL_CONFIG[newLevel].borderDefault);
  };

  const getCommands = (): string[] => {
    if (customCommands.trim()) {
      return customCommands.split('\n').map(c => c.trim()).filter(Boolean);
    }
    if (level === 'level1') return LEVEL_1_COMMANDS;
    if (level === 'level2') return LEVEL_2_COMMANDS;
    return LEVEL_3_COMMANDS;
  };

  const generatePrint = () => {
    const commands = getCommands();
    if (commands.length === 0) {
      alert('Please add some commands first!');
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

      const cfg = LEVEL_CONFIG[level];
      const html = generateCardPages(commands, cfg);
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating print:', error);
      alert('Error generating print. Please try again.');
    }
    setGenerating(false);
  };
  const generateCardPages = (commands: string[], cfg: typeof LEVEL_CONFIG.level1) => {
    // Card dimensions based on cardsPerPage
    const layouts: Record<number, { cols: number; rows: number; cardW: number; cardH: number }> = {
      4: { cols: 2, rows: 2, cardW: 8.5, cardH: 12 },
      6: { cols: 2, rows: 3, cardW: 8.5, cardH: 8 },
      8: { cols: 2, rows: 4, cardW: 8.5, cardH: 6 },
    };
    const layout = layouts[cardsPerPage];
    const gap = 0.4;

    let pages = '';
    for (let i = 0; i < commands.length; i += cardsPerPage) {
      const pageCommands = commands.slice(i, i + cardsPerPage);

      let cards = '';
      pageCommands.forEach((cmd) => {
        const zhTranslation = level === 'level1' ? LEVEL_1_CHINESE[cmd.toLowerCase()] : undefined;
        const fontSize = level === 'level3' ? '14pt' : level === 'level2' ? '18pt' : '28pt';

        cards += `
          <div style="
            width: ${layout.cardW}cm; height: ${layout.cardH}cm;
            border: 3px solid ${borderColor};
            border-radius: 0.4cm;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            text-align: center; padding: 0.5cm;
            background: white;
            position: relative;
          ">
            <div style="
              position: absolute; top: 0.2cm; left: 0.3cm;
              font-size: 7pt; color: ${cfg.color}; opacity: 0.5;
              font-weight: 600;
            ">${escapeHtml(cfg.label)}</div>
            <div style="
              font-family: '${escapeHtml(fontFamily)}', cursive;
              font-size: ${fontSize};
              font-weight: bold;
              color: #1a1a1a;
              line-height: 1.4;
              max-width: 95%;
            ">${escapeHtml(cmd)}</div>
            ${showChinese && zhTranslation ? `
              <div style="
                font-size: 14pt; color: #888;
                margin-top: 0.3cm;
              ">${escapeHtml(zhTranslation)}</div>
            ` : ''}
          </div>`;
      });

      pages += `
        <div class="page">
          <div style="
            display: grid;
            grid-template-columns: repeat(${layout.cols}, ${layout.cardW}cm);
            grid-template-rows: repeat(${layout.rows}, ${layout.cardH}cm);
            gap: ${gap}cm;
            justify-content: center;
            align-content: center;
            height: 100%;
          ">${cards}</div>
        </div>`;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Command Cards - ${escapeHtml(cfg.label)}</title>
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
${pages}
<script>window.onload = function() { setTimeout(() => window.print(), 500); };</script>
</body>
</html>`;
  };
  const commands = getCommands();
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
        background: 'linear-gradient(135deg, #BE185D 0%, #9D174D 100%)',
        borderRadius: '16px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <button onClick={() => router.back()} style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
            ← {t('tools.back_to_tools') || 'Back'}
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: '800' }}>
              {t('tools.command_cards') || 'Command Cards'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
              {t('tools.command_cards_subtitle') || 'AMI Montessori reading through action'}
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
          {t('tools.cmd_select_level') || 'Select Level'}
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {(Object.keys(LEVEL_CONFIG) as CommandLevel[]).map(lv => {
            const cfg = LEVEL_CONFIG[lv];
            const isActive = level === lv;
            return (
              <button key={lv} onClick={() => handleLevelChange(lv)}
                style={{
                  flex: '1 1 140px', padding: '14px 16px', borderRadius: '12px',
                  border: isActive ? `3px solid ${cfg.color}` : '3px solid #e0e0e0',
                  backgroundColor: isActive ? cfg.bgColor : '#fff',
                  color: cfg.color, cursor: 'pointer', fontWeight: '700',
                  fontSize: '14px', textAlign: 'center', transition: 'all 0.2s',
                }}
              >
                <div>{cfg.label}</div>
                <div style={{ fontSize: '11px', fontWeight: '400', marginTop: '4px', opacity: 0.8 }}>{cfg.zhLabel}</div>
              </button>
            );
          })}
        </div>

        <div style={{
          marginTop: '12px', padding: '12px',
          backgroundColor: levelCfg.bgColor, borderRadius: '8px',
          fontSize: '13px', color: levelCfg.color, lineHeight: 1.6,
        }}>
          {level === 'level1' && (
            <span><strong>Level 1 — Single Action:</strong> One verb per card. Child reads the word and does the action. Uses high-frequency verbs from classroom routines. Perfect for CVC/phonetic readers.</span>
          )}
          {level === 'level2' && (
            <span><strong>Level 2 — Two Actions:</strong> Short phrases combining a verb with an object or second action. Builds reading fluency and comprehension.</span>
          )}
          {level === 'level3' && (
            <span><strong>Level 3 — Action Chains:</strong> Multi-step sequences. Child must read, remember, and execute 2-3 actions in order. Builds working memory and reading stamina.</span>
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
          {t('tools.cmd_settings') || 'Print Settings'}
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              {t('tools.cmd_cards_per_page') || 'Cards per Page'}
            </label>
            <select value={cardsPerPage} onChange={(e) => setCardsPerPage(Number(e.target.value) as 4 | 6 | 8)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff' }}>
              <option value={4}>4 (large)</option>
              <option value={6}>6 (medium)</option>
              <option value={8}>8 (small)</option>
            </select>
          </div>

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
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '2px solid #e0e0e0', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff' }}>
              <option value="Comic Sans MS">Comic Sans MS</option>
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>

          {level === 'level1' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                <input type="checkbox" checked={showChinese} onChange={(e) => setShowChinese(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                {t('tools.cmd_show_chinese') || 'Show Chinese'}
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Custom Commands Input */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#333' }}>
          {t('tools.cmd_custom') || 'Custom Commands'}
        </h2>
        <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px' }}>
          Enter one command per line. Leave empty to use the default set for this level.
        </p>
        <textarea
          value={customCommands}
          onChange={(e) => setCustomCommands(e.target.value)}
          placeholder={level === 'level1' ? 'sit\nstand\nwalk\njump' : level === 'level2' ? 'open the door\nclose the book\nwash your hands' : 'Walk to the door, touch it, and come back.'}
          style={{
            width: '100%', minHeight: '120px', padding: '12px',
            borderRadius: '8px', border: '2px solid #e0e0e0',
            fontFamily: 'system-ui', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
          }}
        />
        {customCommands.trim() && (
          <button onClick={() => setCustomCommands('')}
            style={{
              marginTop: '8px', padding: '6px 16px', borderRadius: '6px',
              border: '1px solid #e0e0e0', backgroundColor: '#fff',
              color: '#666', cursor: 'pointer', fontSize: '13px'
            }}>
            Reset to defaults
          </button>
        )}
      </div>
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
            {t('tools.cmd_preview') || 'Preview'} ({commands.length} commands)
          </h2>
          <button onClick={generatePrint} disabled={generating || commands.length === 0}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              backgroundColor: commands.length > 0 ? levelCfg.color : '#ccc',
              color: '#fff', cursor: commands.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: '600', fontSize: '14px', opacity: generating ? 0.7 : 1
            }}>
            {generating ? (t('tools.generating') || 'Generating...') : (t('tools.print') || 'Print Cards')}
          </button>
        </div>

        {commands.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {commands.map((cmd, idx) => (
              <span key={idx} style={{
                padding: '8px 14px', borderRadius: '8px',
                border: `2px solid ${levelCfg.color}`,
                backgroundColor: levelCfg.bgColor, color: levelCfg.color,
                fontSize: '13px', fontWeight: '600',
              }}>
                {cmd}
                {showChinese && level === 'level1' && LEVEL_1_CHINESE[cmd.toLowerCase()] && (
                  <span style={{ marginLeft: '6px', opacity: 0.6 }}>{LEVEL_1_CHINESE[cmd.toLowerCase()]}</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <p style={{ fontSize: '16px', margin: 0 }}>Add commands or use defaults to get started</p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '24px', padding: '20px',
        backgroundColor: '#FFF1F2', borderRadius: '12px',
        borderLeft: '4px solid #BE185D'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#9D174D', fontSize: '1rem' }}>
          {t('tools.cmd_about') || 'About Command Cards (AMI)'}
        </h3>
        <ul style={{ margin: 0, color: '#9D174D', lineHeight: 1.8, fontSize: '14px', paddingLeft: '20px' }}>
          <li><strong>AMI Language Work #24</strong> — part of the Montessori reading curriculum</li>
          <li><strong>Reading through action</strong> — children prove comprehension by DOING, not speaking</li>
          <li><strong>Perfect for ESL</strong> — children in the Silent Period can still participate fully</li>
          <li><strong>Self-correcting</strong> — the teacher observes if the action matches the command</li>
        </ul>
        <p style={{ margin: '12px 0 0 0', color: '#9D174D', fontSize: '13px' }}>
          Print, cut, laminate, and place in a basket on the language shelf. Children take a card, read it silently, perform the action, then return it.
        </p>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '32px', textAlign: 'center', padding: '16px', color: '#999', fontSize: '14px' }}>
        Made with 🥔 by Teacher Potato
      </div>
    </div>
  );
}
