"use client";

import React from 'react';
import { Card } from './types';

interface CardPreviewProps {
  card: Card;
  borderColor: string;
  fontFamily: string;
  onUpdateLabel: (id: number, newLabel: string) => void;
  onStartCrop: (id: number) => void;
  onDownloadCard: (card: Card, type: 'control' | 'picture' | 'label') => void;
  onRemoveCard: (id: number) => void;
}

const CardPreview: React.FC<CardPreviewProps> = ({
  card,
  borderColor,
  fontFamily,
  onUpdateLabel,
  onStartCrop,
  onDownloadCard,
  onRemoveCard
}) => (
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
          <div style={{
            backgroundColor: '#fff',
            width: '92px',
            height: '92px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img
              src={card.croppedImage}
              alt={card.label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
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
          <div style={{
            backgroundColor: '#fff',
            width: '92px',
            height: '92px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            <img
              src={card.croppedImage}
              alt={card.label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Label Card Preview */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{ fontSize: '10px', color: '#666', fontFamily: 'system-ui' }}>Label</span>
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
        ⬇ Label
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

export default CardPreview;
