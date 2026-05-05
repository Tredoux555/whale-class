"use client";

import React, { useRef, useCallback, useEffect } from 'react';
import { Card } from './types';

/** Compact button style used by the strip-mode action row. */
const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: bg,
  color: '#fff',
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: 'system-ui',
});

interface CardPreviewProps {
  card: Card;
  borderColor: string;
  fontFamily: string;
  layoutMode?: 'square' | 'strip';
  /** Label override for the third card type. 'Sentence' for strip mode, 'Label' otherwise. */
  thirdCardLabel?: string;
  onUpdateLabel: (id: number, newLabel: string) => void;
  onStartCrop: (id: number) => void;
  onDownloadCard: (card: Card, type: 'control' | 'picture' | 'label') => void;
  onRemoveCard: (id: number) => void;
  onUpdateOffset: (id: number, x: number, y: number) => void;
}

/**
 * Draggable image component — lets user click+drag to reposition the image
 * within its square frame (like object-position adjustment).
 */
const DraggableImage: React.FC<{
  src: string;
  alt: string;
  size: number;
  offsetX: number;
  offsetY: number;
  onOffsetChange: (x: number, y: number) => void;
  onDoubleClick?: () => void;
}> = ({ src, alt, size, offsetX, offsetY, onOffsetChange, onDoubleClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startRef = useRef({ mouseX: 0, mouseY: 0, startOffX: 0, startOffY: 0 });
  const cleanupRef = useRef<(() => void) | null>(null);

  // Clean up window listeners on unmount (prevents leak if component unmounts mid-drag)
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      draggingRef.current = false;
    };
  }, []);

  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if ('clientX' in e) {
      return { x: e.clientX, y: e.clientY };
    }
    return { x: 0, y: 0 };
  };

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    const pos = getClientPos(e);
    startRef.current = { mouseX: pos.x, mouseY: pos.y, startOffX: offsetX, startOffY: offsetY };

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      ev.preventDefault();
      const p = getClientPos(ev);
      // Convert pixel drag to percentage offset change
      // Dragging right → image moves right → object-position x increases
      const dx = ((p.x - startRef.current.mouseX) / size) * 100;
      const dy = ((p.y - startRef.current.mouseY) / size) * 100;
      const newX = Math.max(0, Math.min(100, startRef.current.startOffX + dx));
      const newY = Math.max(0, Math.min(100, startRef.current.startOffY + dy));
      onOffsetChange(newX, newY);
    };

    const handleEnd = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      cleanupRef.current = null;
    };

    // Store cleanup so unmount can call it if needed
    cleanupRef.current = handleEnd;

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  }, [offsetX, offsetY, size, onOffsetChange]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); onDoubleClick?.(); }}
      style={{
        backgroundColor: '#fff',
        width: `${size}px`,
        height: `${size}px`,
        overflow: 'hidden',
        cursor: 'grab',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      title="Drag to reposition · Double-click to crop"
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${offsetX}% ${offsetY}%`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

const CardPreview: React.FC<CardPreviewProps> = ({
  card,
  borderColor,
  fontFamily,
  layoutMode = 'square',
  thirdCardLabel,
  onUpdateLabel,
  onStartCrop,
  onDownloadCard,
  onRemoveCard,
  onUpdateOffset,
}) => {
  const offX = card.imageOffset?.x ?? 50;
  const offY = card.imageOffset?.y ?? 50;
  const isRepositioned = offX !== 50 || offY !== 50;
  const isStrip = layoutMode === 'strip';
  const thirdLabel = thirdCardLabel ?? (isStrip ? 'Sentence' : 'Label');

  const handleOffsetChange = useCallback((x: number, y: number) => {
    onUpdateOffset(card.id, x, y);
  }, [card.id, onUpdateOffset]);

  // ----- Strip-layout preview -----
  // Mirrors the print layout: control = wide strip with sentence-left + picture-right,
  // picture = square card, sentence = wide text-only strip.
  if (isStrip) {
    return (
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {/* Control strip — sentence left, picture right */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            width: '100%',
          }}>
            <span style={{ fontSize: '10px', color: '#666', fontFamily: 'system-ui' }}>Control</span>
            <div style={{
              width: '100%',
              maxWidth: '280px',
              backgroundColor: borderColor,
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              gap: '4px',
              alignItems: 'stretch',
            }}>
              <div style={{
                flex: 1,
                backgroundColor: '#fff',
                padding: '4px 6px',
                textAlign: 'center',
                fontFamily: fontFamily,
                fontSize: '10px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                wordBreak: 'break-word',
                lineHeight: 1.25,
                minHeight: '70px',
              }}>
                {card.label}
              </div>
              <div style={{ flexShrink: 0 }}>
                <DraggableImage
                  src={card.croppedImage}
                  alt={card.label}
                  size={70}
                  offsetX={offX}
                  offsetY={offY}
                  onOffsetChange={handleOffsetChange}
                  onDoubleClick={() => onStartCrop(card.id)}
                />
              </div>
            </div>
          </div>

          {/* Picture card preview (square) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span style={{ fontSize: '10px', color: '#666', fontFamily: 'system-ui' }}>Picture</span>
            <div style={{
              backgroundColor: borderColor,
              padding: '4px',
              borderRadius: '4px'
            }}>
              <DraggableImage
                src={card.croppedImage}
                alt={card.label}
                size={78}
                offsetX={offX}
                offsetY={offY}
                onOffsetChange={handleOffsetChange}
                onDoubleClick={() => onStartCrop(card.id)}
              />
            </div>
          </div>

          {/* Sentence strip preview (text only, full width) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            width: '100%',
          }}>
            <span style={{ fontSize: '10px', color: '#666', fontFamily: 'system-ui' }}>Sentence</span>
            <div style={{
              width: '100%',
              maxWidth: '280px',
              backgroundColor: borderColor,
              padding: '4px',
              borderRadius: '4px',
            }}>
              <div style={{
                backgroundColor: '#fff',
                padding: '10px 6px',
                textAlign: 'center',
                fontFamily: fontFamily,
                fontSize: '11px',
                fontWeight: 'bold',
                wordBreak: 'break-word',
                lineHeight: 1.3,
                minHeight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {card.label}
              </div>
            </div>
          </div>
        </div>

        {/* Reposition hint */}
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: '#999',
          fontFamily: 'system-ui',
        }}>
          Drag picture to reposition · Double-click to crop
          {isRepositioned && (
            <button
              onClick={() => onUpdateOffset(card.id, 50, 50)}
              style={{
                marginLeft: '8px',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                backgroundColor: '#f5f5f5',
                color: '#666',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'system-ui',
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Multi-line sentence editor */}
        <textarea
          value={card.label}
          onChange={(e) => onUpdateLabel(card.id, e.target.value)}
          rows={2}
          placeholder="The cat sits on the mat."
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '2px solid #e0e0e0',
            fontFamily: 'system-ui',
            fontSize: '14px',
            textAlign: 'center',
            resize: 'vertical',
            minHeight: '52px',
          }}
        />

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <button onClick={() => onStartCrop(card.id)} style={btnStyle('#2196F3')}>✂️ Crop</button>
          <button onClick={() => onDownloadCard(card, 'control')} style={btnStyle('#4CAF50')}>⬇ Control</button>
          <button onClick={() => onDownloadCard(card, 'picture')} style={btnStyle('#FF9800')}>⬇ Picture</button>
          <button onClick={() => onDownloadCard(card, 'label')} style={btnStyle('#9C27B0')}>⬇ {thirdLabel}</button>
          <button onClick={() => onRemoveCard(card.id)} style={btnStyle('#f44336')}>🗑️</button>
        </div>
      </div>
    );
  }

  // ----- Square-layout preview (default — three-part cards) -----
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {/* Control Card Preview */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '10px', color: '#666', fontFamily: 'system-ui' }}>Control</span>
          <div style={{
            width: '100px',
            backgroundColor: borderColor,
            padding: '4px',
            borderRadius: '4px'
          }}>
            <DraggableImage
              src={card.croppedImage}
              alt={card.label}
              size={92}
              offsetX={offX}
              offsetY={offY}
              onOffsetChange={handleOffsetChange}
              onDoubleClick={() => onStartCrop(card.id)}
            />
            <div style={{
              backgroundColor: '#fff',
              marginTop: '4px',
              padding: '4px',
              textAlign: 'center',
              fontFamily: fontFamily,
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {card.label}
            </div>
          </div>
        </div>

        {/* Picture Card Preview */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '10px', color: '#666', fontFamily: 'system-ui' }}>Picture</span>
          <div style={{
            width: '100px',
            backgroundColor: borderColor,
            padding: '4px',
            borderRadius: '4px'
          }}>
            <DraggableImage
              src={card.croppedImage}
              alt={card.label}
              size={92}
              offsetX={offX}
              offsetY={offY}
              onOffsetChange={handleOffsetChange}
              onDoubleClick={() => onStartCrop(card.id)}
            />
          </div>
        </div>

        {/* Label Card Preview */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{ fontSize: '10px', color: '#666', fontFamily: 'system-ui' }}>{thirdLabel}</span>
          <div style={{
            width: '100px',
            backgroundColor: borderColor,
            padding: '4px',
            borderRadius: '4px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              padding: '8px 4px',
              textAlign: 'center',
              fontFamily: fontFamily,
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {card.label}
            </div>
          </div>
        </div>
      </div>

      {/* Reposition hint */}
      <div style={{
        textAlign: 'center',
        fontSize: '11px',
        color: '#999',
        fontFamily: 'system-ui',
      }}>
        Drag to reposition · Double-click to crop
        {isRepositioned && (
          <button
            onClick={() => onUpdateOffset(card.id, 50, 50)}
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              backgroundColor: '#f5f5f5',
              color: '#666',
              cursor: 'pointer',
              fontSize: '11px',
              fontFamily: 'system-ui',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Card controls */}
      <input
        type="text"
        value={card.label}
        onChange={(e) => onUpdateLabel(card.id, e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: '6px',
          border: '2px solid #e0e0e0',
          fontFamily: 'system-ui',
          fontSize: '14px',
          textAlign: 'center'
        }}
      />

      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => onStartCrop(card.id)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#2196F3',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'system-ui'
          }}
        >
          ✂️ Crop
        </button>
        <button
          onClick={() => onDownloadCard(card, 'control')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#4CAF50',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'system-ui'
          }}
        >
          ⬇ Control
        </button>
        <button
          onClick={() => onDownloadCard(card, 'picture')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#FF9800',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'system-ui'
          }}
        >
          ⬇ Picture
        </button>
        <button
          onClick={() => onDownloadCard(card, 'label')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#9C27B0',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'system-ui'
          }}
        >
          ⬇ {thirdLabel}
        </button>
        <button
          onClick={() => onRemoveCard(card.id)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#f44336',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'system-ui'
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default CardPreview;
