"use client";

import React, { useState } from 'react';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { SortingMatCount } from './types';
import { generateSortingMat } from './print-utils';

interface HeaderConfig {
  showBackButton?: boolean;
  backButtonLabel?: string;
  onBackClick?: () => void;
  title?: string;
  subtitle?: string;
  gradientStart?: string;
  gradientEnd?: string;
  centered?: boolean;
}

interface SortingMatGeneratorProps {
  headerConfig?: HeaderConfig;
}

const DEFAULT_LABELS_BY_COUNT: Record<SortingMatCount, string[]> = {
  2: ['sh', 'ch'],
  3: ['sh', 'ch', 'th'],
  4: ['sh', 'ch', 'th', 'wh'],
};

const SortingMatGenerator: React.FC<SortingMatGeneratorProps> = ({ headerConfig = {} }) => {
  const {
    showBackButton = false,
    backButtonLabel = '←',
    onBackClick,
    title = '🎯 Sorting Mat Generator',
    subtitle = 'Create A4 sorting mats with 2, 3, or 4 designated circles',
    gradientStart = '#0d9488',
    gradientEnd = '#10b981',
    centered = true,
  } = headerConfig;

  const [count, setCount] = useState<SortingMatCount>(3);
  const [labels, setLabels] = useState<string[]>(DEFAULT_LABELS_BY_COUNT[3]);
  const [matTitle, setMatTitle] = useState<string>('Sort by Sound');
  const [borderColor, setBorderColor] = useState<string>('#2D5A27');
  const [fontFamily, setFontFamily] = useState<string>('Comic Sans MS');

  // Change count + sync labels atomically — preserve entered values where
  // possible, top up with sensible defaults when growing.
  const handleCountChange = (newCount: SortingMatCount) => {
    setCount(newCount);
    setLabels(prev => {
      if (prev.length === newCount) return prev;
      if (prev.length > newCount) return prev.slice(0, newCount);
      const extra = DEFAULT_LABELS_BY_COUNT[newCount].slice(prev.length);
      return [...prev, ...extra];
    });
  };

  const updateLabel = (idx: number, value: string) => {
    setLabels(prev => prev.map((l, i) => (i === idx ? value : l)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to use the print feature');
      return;
    }
    const html = generateSortingMat({
      title: matTitle,
      count,
      labels,
      borderColor,
      fontFamily,
    });
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // ============================================================
  // Live preview
  // ============================================================
  const PreviewCircle: React.FC<{ label: string; size: number }> = ({ label, size }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `4px solid ${borderColor}`,
        backgroundColor: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: size * 0.18,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 'bold',
          fontSize: Math.max(14, Math.round(size * 0.18)),
          color: '#1f2937',
          textAlign: 'center',
          maxWidth: '80%',
          lineHeight: 1.1,
          wordBreak: 'break-word',
        }}
      >
        {label || '—'}
      </div>
    </div>
  );

  const previewSize = count === 2 ? 140 : 110;
  const previewGrid: React.CSSProperties = {
    display: 'grid',
    gap: '12px',
    justifyItems: 'center',
    alignItems: 'center',
    gridTemplateColumns: count === 2 ? '1fr 1fr' : count === 4 ? '1fr 1fr' : '1fr 1fr',
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        ...(centered ? { textAlign: 'center', justifyContent: 'center' } : {}),
        marginBottom: '32px',
        padding: '24px',
        background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
        borderRadius: '16px',
        color: '#fff',
      }}>
        {showBackButton && (
          <button
            onClick={onBackClick}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: '#fff',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              flexShrink: 0,
            }}
          >
            {backButtonLabel}
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5rem', fontWeight: 800 }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1rem' }}>{subtitle}</p>
          )}
        </div>
        <div style={{ flexShrink: 0, marginLeft: '12px' }}>
          <LanguageToggle />
        </div>
      </div>

      {/* Settings Panel */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#333' }}>
          ⚙️ Mat Settings
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Number of circles */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#555' }}>
              Number of Circles
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([2, 3, 4] as const).map(n => (
                <button
                  key={n}
                  onClick={() => handleCountChange(n)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: count === n ? `2px solid ${borderColor}` : '2px solid #e0e0e0',
                    backgroundColor: count === n ? borderColor : '#fff',
                    color: count === n ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '16px',
                    minWidth: '48px',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Mat title */}
          <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#555' }}>
              Mat Title (optional)
            </label>
            <input
              type="text"
              value={matTitle}
              onChange={(e) => setMatTitle(e.target.value)}
              placeholder="e.g. Sort by Sound"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                fontFamily: 'system-ui',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Border color */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#555' }}>
              Circle Border
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                style={{ width: '50px', height: '40px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              />
              <input
                type="text"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0',
                  width: '100px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          {/* Font */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#555' }}>
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
                backgroundColor: '#fff',
              }}
            >
              <option value="Comic Sans MS">Comic Sans MS</option>
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
            </select>
          </div>

        </div>
      </div>

      {/* Designation labels */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', color: '#333' }}>
          🏷️ Circle Designations
        </h2>
        <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: '14px' }}>
          Type whatever you want in each circle — sounds, words, colours, numbers, anything.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '12px',
        }}>
          {labels.map((label, idx) => (
            <div key={idx}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600, color: '#777' }}>
                Circle {idx + 1}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                placeholder={`e.g. ${DEFAULT_LABELS_BY_COUNT[count][idx] || 'label'}`}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '2px solid #e0e0e0',
                  fontFamily,
                  fontSize: '18px',
                  textAlign: 'center',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>
            👀 Preview ({count} circles)
          </h2>
          <button
            onClick={handlePrint}
            style={{
              padding: '12px 28px',
              borderRadius: '10px',
              border: 'none',
              background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            🖨️ Print Mat
          </button>
        </div>

        {/* The mat preview itself — proportionally sized box */}
        <div style={{
          backgroundColor: '#fafafa',
          borderRadius: '12px',
          padding: '24px',
          aspectRatio: '21 / 29.7',
          maxWidth: '420px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'inset 0 0 0 1px #e0e0e0',
        }}>
          {matTitle && (
            <div style={{
              fontFamily,
              fontWeight: 'bold',
              fontSize: '20px',
              textAlign: 'center',
              padding: '8px 0',
              color: '#1f2937',
            }}>
              {matTitle}
            </div>
          )}
          <div style={{
            flex: 1,
            ...previewGrid,
            alignContent: 'center',
            paddingTop: '12px',
          }}>
            {labels.map((label, idx) => {
              const isTriangleBottom = count === 3 && idx === 2;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    ...(isTriangleBottom ? { gridColumn: '1 / span 2' } : {}),
                  }}
                >
                  <PreviewCircle label={label} size={previewSize} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div style={{
        marginTop: '32px',
        padding: '24px',
        backgroundColor: '#fff3e0',
        borderRadius: '12px',
        borderLeft: '4px solid #ff9800',
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#e65100' }}>
          ℹ️ How to use a sorting mat
        </h3>
        <p style={{ margin: '0 0 8px 0', color: '#555', lineHeight: 1.6 }}>
          Print the mat at full A4 size. Each circle is labelled with one designation
          (a sound, a colour, a category — whatever you want).
        </p>
        <p style={{ margin: 0, color: '#555', lineHeight: 1.6 }}>
          The child sorts small picture cards or word cards into the correct circle.
          Pair this with the 3-Part Card Generator or the Sentence Match Generator
          to make the items they sort.
        </p>
      </div>

      <div style={{ marginTop: '32px', textAlign: 'center', padding: '16px', color: '#999', fontSize: '14px' }}>
        Made with 🥔 by Teacher Potato
      </div>
    </div>
  );
};

export default SortingMatGenerator;
