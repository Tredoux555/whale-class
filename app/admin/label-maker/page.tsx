"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================
// MOVABLE ALPHABET LABEL MAKER
// ============================================
// Creates labels for small objects to match
// with the movable alphabet
// Same style as three-part card labels
// ============================================

interface Label {
  id: number;
  text: string;
}

const LabelMaker = () => {
  const router = useRouter();
  const [labels, setLabels] = useState<Label[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [borderColor, setBorderColor] = useState('#2D5A27');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [generating, setGenerating] = useState(false);

  // Size configurations (same proportions as three-part card labels)
  const SIZE_CONFIG = {
    small: { width: 5, height: 1.6, fontSize: '14pt', perRow: 3, rows: 12 }, // 36 per page
    medium: { width: 7.5, height: 2.4, fontSize: '20pt', perRow: 2, rows: 8 }, // 16 per page (matches 3-part cards)
    large: { width: 9, height: 3, fontSize: '26pt', perRow: 2, rows: 6 }, // 12 per page
  };

  // Parse bulk text into labels
  const parseBulkText = () => {
    const words = bulkText
      .split('\n')
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    const newLabels = words.map((text, i) => ({
      id: Date.now() + i,
      text
    }));
    
    setLabels(prev => [...prev, ...newLabels]);
    setBulkText('');
  };

  // Update single label
  const updateLabel = (id: number, newText: string) => {
    setLabels(prev => prev.map(l => 
      l.id === id ? { ...l, text: newText } : l
    ));
  };

  // Remove label
  const removeLabel = (id: number) => {
    setLabels(prev => prev.filter(l => l.id !== id));
  };

  // Generate printable sheet
  const generatePrintSheet = () => {
    if (labels.length === 0) {
      alert('Please add some labels first!');
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

      const config = SIZE_CONFIG[labelSize];
      const A4_WIDTH_CM = 21;
      const A4_HEIGHT_CM = 29.7;
      const BORDER_CM = 0.4;
      const BORDER_RADIUS = 0.3;

      // Calculate grid
      const gridWidth = config.width * config.perRow;
      const gridHeight = config.height * config.rows;
      const marginLeft = (A4_WIDTH_CM - gridWidth) / 2;
      const marginTop = (A4_HEIGHT_CM - gridHeight) / 2;
      const labelsPerPage = config.perRow * config.rows;

      let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Movable Alphabet Labels - Print</title>
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: system-ui, sans-serif;
      background: white;
    }
    
    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      overflow: hidden;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .page-title {
      font-size: 9pt;
      color: #999;
      text-align: center;
      padding-top: 0.3cm;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(${config.perRow}, ${config.width}cm);
      grid-template-rows: repeat(${config.rows}, ${config.height}cm);
      gap: 0;
      margin-left: ${marginLeft}cm;
      margin-top: ${marginTop - 0.5}cm;
    }
    
    .label {
      background: ${borderColor};
      padding: ${BORDER_CM}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      border-radius: ${BORDER_RADIUS}cm;
    }
    
    .label-inner {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "${fontFamily}", cursive;
      font-size: ${config.fontSize};
      font-weight: bold;
      text-align: center;
      border-radius: ${BORDER_RADIUS}cm;
      padding: 0.1cm 0.2cm;
      overflow: hidden;
      word-wrap: break-word;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .page-title {
        display: none;
      }
      
      .label {
        background: ${borderColor} !important;
      }
    }
    
    @media screen {
      body {
        padding: 20px;
        background: #f0f0f0;
      }
      
      .page {
        background: white;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    }
  </style>
</head>
<body>
`;

      // Generate pages
      for (let i = 0; i < labels.length; i += labelsPerPage) {
        const pageLabels = labels.slice(i, i + labelsPerPage);
        const pageNum = Math.floor(i / labelsPerPage) + 1;
        
        html += `
  <div class="page">
    <div class="page-title">Labels - Page ${pageNum}</div>
    <div class="grid">
      ${pageLabels.map(l => `
        <div class="label">
          <div class="label-inner">${l.text}</div>
        </div>
      `).join('')}
      ${pageLabels.length < labelsPerPage ? '<div></div>'.repeat(labelsPerPage - pageLabels.length) : ''}
    </div>
  </div>
`;
      }

      html += `
  <script>
    window.onload = function() {
      setTimeout(() => window.print(), 500);
    };
  </script>
</body>
</html>
`;

      printWindow.document.write(html);
      printWindow.document.close();

    } catch (error) {
      console.error('Error generating print:', error);
      alert('Error generating print. Please try again.');
    }

    setGenerating(false);
  };

  // Quick add common word sets
  const WORD_SETS = {
    'CVC Short A': ['cat', 'bat', 'hat', 'rat', 'mat', 'sat', 'pat', 'can', 'fan', 'man', 'pan', 'ran', 'van', 'bag', 'tag', 'rag', 'wag', 'cap', 'map', 'tap', 'nap', 'gap', 'lap'],
    'CVC Short E': ['bed', 'red', 'led', 'wed', 'pen', 'hen', 'ten', 'men', 'den', 'pet', 'wet', 'jet', 'net', 'set', 'bet', 'get', 'let', 'met', 'leg', 'peg', 'beg'],
    'CVC Short I': ['pig', 'big', 'wig', 'dig', 'fig', 'pin', 'bin', 'tin', 'win', 'fin', 'sit', 'bit', 'hit', 'fit', 'kit', 'pit', 'lit', 'lip', 'tip', 'dip', 'hip', 'zip', 'rip', 'sip'],
    'CVC Short O': ['dog', 'log', 'fog', 'hog', 'jog', 'cog', 'pot', 'hot', 'not', 'dot', 'got', 'lot', 'cot', 'top', 'mop', 'hop', 'pop', 'cop', 'box', 'fox'],
    'CVC Short U': ['cup', 'pup', 'up', 'bus', 'jug', 'mug', 'hug', 'bug', 'rug', 'dug', 'tub', 'rub', 'sub', 'cub', 'sun', 'run', 'fun', 'bun', 'gun', 'nut', 'cut', 'but', 'hut', 'gut'],
  };

  const addWordSet = (setName: string) => {
    const words = WORD_SETS[setName as keyof typeof WORD_SETS];
    const newLabels = words.map((text, i) => ({
      id: Date.now() + i,
      text
    }));
    setLabels(prev => [...prev, ...newLabels]);
  };

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
        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        borderRadius: '16px',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <button onClick={() => router.back()} style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
            ← Back
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: '800' }}>
              🔤 Movable Alphabet Label Maker
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1rem' }}>
              Create matching labels for small objects
            </p>
          </div>
          <div style={{ width: '80px' }}></div>
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
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#333' }}>⚙️ Settings</h2>
        
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              Label Size
            </label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as 'small' | 'medium' | 'large')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: '#fff'
              }}
            >
              <option value="small">Small (5×1.6cm) - 36/page</option>
              <option value="medium">Medium (7.5×2.4cm) - 16/page</option>
              <option value="large">Large (9×3cm) - 12/page</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              Border Color
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px', border: '2px solid #e0e0e0', width: '90px', fontFamily: 'monospace', fontSize: '12px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#555' }}>
              Font
            </label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: '#fff'
              }}
            >
              <option value="Comic Sans MS">Comic Sans MS</option>
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>

          <div style={{
            padding: '10px 14px',
            backgroundColor: '#FEF3C7',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#92400E'
          }}>
            <strong>Tip:</strong> Medium size matches 3-part card labels exactly
          </div>
        </div>
      </div>

      {/* Quick Add Word Sets */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#333' }}>⚡ Quick Add CVC Word Sets</h2>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.keys(WORD_SETS).map(setName => (
            <button
              key={setName}
              onClick={() => addWordSet(setName)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                backgroundColor: setName.includes('A') ? '#FEE2E2' :
                                setName.includes('E') ? '#DBEAFE' :
                                setName.includes('I') ? '#FCE7F3' :
                                setName.includes('O') ? '#FEF3C7' : '#D1FAE5',
                color: setName.includes('A') ? '#991B1B' :
                       setName.includes('E') ? '#1E40AF' :
                       setName.includes('I') ? '#9D174D' :
                       setName.includes('O') ? '#92400E' : '#065F46',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              + {setName}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Input */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: '#333' }}>📝 Add Words</h2>
        <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px' }}>
          Enter one word per line, then click "Add Labels"
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder="cat&#10;dog&#10;hat&#10;sun&#10;..."
          style={{
            width: '100%',
            minHeight: '120px',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #e0e0e0',
            fontFamily: 'system-ui',
            fontSize: '14px',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />
        <button
          onClick={parseBulkText}
          disabled={!bulkText.trim()}
          style={{
            marginTop: '12px',
            padding: '10px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: bulkText.trim() ? '#F59E0B' : '#e0e0e0',
            color: bulkText.trim() ? '#fff' : '#999',
            cursor: bulkText.trim() ? 'pointer' : 'not-allowed',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          Add Labels
        </button>
      </div>

      {/* Labels List */}
      {labels.length > 0 && (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>
              🏷️ Your Labels ({labels.length})
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={generatePrintSheet}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: generating ? 0.7 : 1
                }}
              >
                {generating ? '⏳ Generating...' : '🖨️ Print Labels'}
              </button>
              <button
                onClick={() => setLabels([])}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '2px solid #EF4444',
                  backgroundColor: 'transparent',
                  color: '#EF4444',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🗑️ Clear All
              </button>
            </div>
          </div>

          {/* Label Preview Grid */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {labels.map(label => (
              <div
                key={label.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: borderColor,
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <div style={{
                  backgroundColor: '#fff',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontFamily: fontFamily,
                  fontWeight: 'bold',
                  fontSize: '14px',
                  minWidth: '40px',
                  textAlign: 'center'
                }}>
                  {label.text}
                </div>
                <button
                  onClick={() => removeLabel(label.id)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {labels.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#999'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏷️</div>
          <p style={{ fontSize: '18px', margin: 0 }}>
            Add some words to create labels!
          </p>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#EFF6FF',
        borderRadius: '12px',
        borderLeft: '4px solid #3B82F6'
      }}>
        <h3 style={{ margin: '0 0 8px 0', color: '#1E40AF', fontSize: '1rem' }}>
          ℹ️ About Movable Alphabet Labels
        </h3>
        <p style={{ margin: '0 0 8px 0', color: '#1E40AF', lineHeight: 1.6, fontSize: '14px' }}>
          These labels are designed to match small objects for the Movable Alphabet work:
        </p>
        <ul style={{ margin: 0, color: '#1E40AF', lineHeight: 1.8, fontSize: '14px', paddingLeft: '20px' }}>
          <li><strong>Small size:</strong> Perfect for miniature objects in I-Spy baskets</li>
          <li><strong>Medium size:</strong> Matches 3-part card labels exactly - use with vocabulary baskets</li>
          <li><strong>Large size:</strong> For larger objects or children who need bigger text</li>
        </ul>
        <p style={{ margin: '12px 0 0 0', color: '#1E40AF', fontSize: '13px' }}>
          💡 Children use these labels as control cards - they build the word with the Movable Alphabet, then check with the label.
        </p>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '32px',
        textAlign: 'center',
        padding: '16px',
        color: '#999',
        fontSize: '14px'
      }}>
        Made with 🥔 by Teacher Potato
      </div>
    </div>
  );
};

export default LabelMaker;
