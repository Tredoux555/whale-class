"use client";

import React from 'react';
import { Card, CropData } from './types';

interface CropOverlayProps {
  card: Card | undefined;
  cropData: CropData;
  cropCanvasRef: React.RefObject<HTMLDivElement>;
  cropImageRef: React.RefObject<HTMLImageElement>;
  onCropStart: (e: React.MouseEvent | React.TouchEvent) => void;
  onCropMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onCropEnd: () => void;
  onClose: () => void;
  onApplyCrop: () => void;
}

const CropOverlay: React.FC<CropOverlayProps> = ({
  card,
  cropData,
  cropCanvasRef,
  cropImageRef,
  onCropStart,
  onCropMove,
  onCropEnd,
  onClose,
  onApplyCrop
}) => {
  if (!card) return null;

  const left = Math.min(cropData.startX, cropData.endX);
  const top = Math.min(cropData.startY, cropData.endY);
  const width = Math.abs(cropData.endX - cropData.startX);
  const height = Math.abs(cropData.endY - cropData.startY);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1a1a2e',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, color: '#fff', fontFamily: 'system-ui' }}>
            ✂️ Crop Image: {card.label}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
        
        <p style={{ color: '#aaa', margin: 0, fontFamily: 'system-ui', fontSize: '14px' }}>
          Click and drag to select the area you want to keep
        </p>
        
        <div
          ref={cropCanvasRef}
          onMouseDown={onCropStart}
          onMouseMove={onCropMove}
          onMouseUp={onCropEnd}
          onMouseLeave={onCropEnd}
          onTouchStart={onCropStart}
          onTouchMove={onCropMove}
          onTouchEnd={onCropEnd}
          style={{
            position: 'relative',
            cursor: 'crosshair',
            maxHeight: '60vh',
            overflow: 'hidden',
            borderRadius: '8px'
          }}
        >
          <img
            ref={cropImageRef}
            src={card.originalImage}
            alt="Crop preview"
            style={{
              maxWidth: '100%',
              maxHeight: '60vh',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
            draggable={false}
          />
          {(width > 0 || height > 0) && (
            <div style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: '2px dashed #4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              pointerEvents: 'none'
            }} />
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid #555',
              backgroundColor: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'system-ui'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onApplyCrop}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#4CAF50',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'system-ui'
            }}
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
};

export default CropOverlay;
