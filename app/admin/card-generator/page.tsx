"use client";

import React, { useState, useRef, useCallback } from 'react';

// ============================================
// MONTESSORI THREE-PART CARD GENERATOR
// ============================================
// Embeddable component for teacherpotato.xyz
// Generates Control Cards, Picture Cards, and Label Cards
// ============================================

interface Card {
  id: number;
  originalImage: string;
  croppedImage: string;
  label: string;
  width: number;
  height: number;
}

interface CropData {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const MontessoriCardGenerator = () => {
  // State management
  const [cards, setCards] = useState<Card[]>([]);
  const [borderColor, setBorderColor] = useState('#2D5A27');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [bulkText, setBulkText] = useState('');
  const [cropMode, setCropMode] = useState<number | null>(null);
  const [cropData, setCropData] = useState<CropData>({ startX: 0, startY: 0, endX: 0, endY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('upload');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLDivElement>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);

  // Card dimensions in pixels (assuming 96 DPI for screen)
  // 10cm image + 0.5cm border on each side = 11cm total width
  // At 96 DPI: 1cm ≈ 37.8px
  const CM_TO_PX = 37.8;
  const IMAGE_SIZE = 10 * CM_TO_PX; // 378px
  const BORDER_SIZE = 0.5 * CM_TO_PX; // 19px
  const CARD_SIZE = IMAGE_SIZE + (BORDER_SIZE * 2); // 416px
  const LABEL_HEIGHT = 2 * CM_TO_PX; // 76px for label area

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            setCards(prev => [...prev, {
              id: Date.now() + Math.random(),
              originalImage: event.target?.result as string,
              croppedImage: event.target?.result as string,
              label: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
              width: img.width,
              height: img.height
            }]);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
    
    if (e.target) {
      e.target.value = '';
    }
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            setCards(prev => [...prev, {
              id: Date.now() + Math.random(),
              originalImage: event.target?.result as string,
              croppedImage: event.target?.result as string,
              label: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
              width: img.width,
              height: img.height
            }]);
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Apply bulk text labels
  const applyBulkLabels = () => {
    const labels = bulkText.split('\n').filter(l => l.trim());
    setCards(prev => prev.map((card, index) => ({
      ...card,
      label: labels[index] || card.label
    })));
  };

  // Update individual card label
  const updateCardLabel = (id: number, newLabel: string) => {
    setCards(prev => prev.map(card => 
      card.id === id ? { ...card, label: newLabel } : card
    ));
  };

  // Remove card
  const removeCard = (id: number) => {
    setCards(prev => prev.filter(card => card.id !== id));
    if (cropMode === id) setCropMode(null);
  };

  // Start crop mode
  const startCrop = (id: number) => {
    setCropMode(id);
    setCropData({ startX: 0, startY: 0, endX: 0, endY: 0 });
  };

  // Crop canvas mouse handlers
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!cropCanvasRef.current) return;
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropData({ startX: x, startY: y, endX: x, endY: y });
    setIsDragging(true);
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cropCanvasRef.current) return;
    const rect = cropCanvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCropData(prev => ({ ...prev, endX: x, endY: y }));
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
  };

  // Apply crop
  const applyCrop = () => {
    const card = cards.find(c => c.id === cropMode);
    if (!card || !cropCanvasRef.current || !cropImageRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = cropImageRef.current;
    
    const displayRect = cropCanvasRef.current.getBoundingClientRect();
    const scaleX = img.naturalWidth / displayRect.width;
    const scaleY = img.naturalHeight / displayRect.height;
    
    const x = Math.min(cropData.startX, cropData.endX) * scaleX;
    const y = Math.min(cropData.startY, cropData.endY) * scaleY;
    const width = Math.abs(cropData.endX - cropData.startX) * scaleX;
    const height = Math.abs(cropData.endY - cropData.startY) * scaleY;
    
    if (width < 10 || height < 10) {
      setCropMode(null);
      return;
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    
    const croppedDataUrl = canvas.toDataURL('image/png');
    
    setCards(prev => prev.map(c => 
      c.id === cropMode ? { ...c, croppedImage: croppedDataUrl } : c
    ));
    setCropMode(null);
  };

  // Generate card image
  const generateCardCanvas = (card: Card, type: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      if (type === 'control') {
        // Control card: Image + Label
        canvas.width = CARD_SIZE;
        canvas.height = CARD_SIZE + LABEL_HEIGHT;
        
        // Border/background
        ctx.fillStyle = borderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // White area for image
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, IMAGE_SIZE);
        
        // White area for label
        ctx.fillRect(BORDER_SIZE, CARD_SIZE, IMAGE_SIZE, LABEL_HEIGHT - BORDER_SIZE);
        
        // Draw image
        const img = new Image();
        img.onload = () => {
          // Calculate aspect ratio fit
          const scale = Math.min(IMAGE_SIZE / img.width, IMAGE_SIZE / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = BORDER_SIZE + (IMAGE_SIZE - scaledWidth) / 2;
          const offsetY = BORDER_SIZE + (IMAGE_SIZE - scaledHeight) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
          
          // Draw label
          ctx.fillStyle = '#000000';
          ctx.font = `bold ${Math.round(LABEL_HEIGHT * 0.5)}px "${fontFamily}", cursive`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(card.label, canvas.width / 2, CARD_SIZE + LABEL_HEIGHT / 2);
          
          resolve(canvas);
        };
        img.src = card.croppedImage;
        
      } else if (type === 'picture') {
        // Picture card: Image only
        canvas.width = CARD_SIZE;
        canvas.height = CARD_SIZE;
        
        ctx.fillStyle = borderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, IMAGE_SIZE);
        
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(IMAGE_SIZE / img.width, IMAGE_SIZE / img.height);
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const offsetX = BORDER_SIZE + (IMAGE_SIZE - scaledWidth) / 2;
          const offsetY = BORDER_SIZE + (IMAGE_SIZE - scaledHeight) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
          resolve(canvas);
        };
        img.src = card.croppedImage;
        
      } else if (type === 'label') {
        // Label card: Text only
        canvas.width = CARD_SIZE;
        canvas.height = LABEL_HEIGHT;
        
        ctx.fillStyle = borderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, LABEL_HEIGHT - BORDER_SIZE * 2);
        
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.round(LABEL_HEIGHT * 0.5)}px "${fontFamily}", cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.label, canvas.width / 2, canvas.height / 2);
        
        resolve(canvas);
      }
    });
  };

  // Download individual card
  const downloadCard = async (card: Card, type: string) => {
    const canvas = await generateCardCanvas(card, type);
    const link = document.createElement('a');
    link.download = `${card.label.replace(/\s+/g, '_')}_${type}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Generate printable sheet (A4)
  const generatePrintableSheet = async () => {
    setGenerating(true);
    
    // A4 at 96 DPI: 794 x 1123 pixels (with margins: ~750 x 1080 usable)
    const A4_WIDTH = 794;
    const A4_HEIGHT = 1123;
    const MARGIN = 20;
    const SPACING = 10;
    
    const sheets: HTMLCanvasElement[] = [];
    type SheetType = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
    let currentSheet: SheetType | null = null;
    let currentX = MARGIN;
    let currentY = MARGIN;
    let rowHeight = 0;
    
    const createNewSheet = (): SheetType => {
      const canvas = document.createElement('canvas');
      canvas.width = A4_WIDTH;
      canvas.height = A4_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
      return { canvas, ctx };
    };
    
    const addCardToSheet = async (cardCanvas: HTMLCanvasElement) => {
      if (!currentSheet) {
        currentSheet = createNewSheet();
        currentX = MARGIN;
        currentY = MARGIN;
        rowHeight = 0;
      }
      
      const cardWidth = cardCanvas.width;
      const cardHeight = cardCanvas.height;
      
      // Check if card fits in current row
      if (currentX + cardWidth > A4_WIDTH - MARGIN) {
        currentX = MARGIN;
        currentY += rowHeight + SPACING;
        rowHeight = 0;
      }
      
      // Check if card fits on current page
      if (currentY + cardHeight > A4_HEIGHT - MARGIN) {
        if (currentSheet !== null) {
          sheets.push((currentSheet as SheetType).canvas);
        }
        currentSheet = createNewSheet();
        currentX = MARGIN;
        currentY = MARGIN;
        rowHeight = 0;
      }
      
      if (currentSheet !== null) {
        (currentSheet as SheetType).ctx.drawImage(cardCanvas, currentX, currentY);
      }
      currentX += cardWidth + SPACING;
      rowHeight = Math.max(rowHeight, cardHeight);
    };
    
    // Generate all cards
    for (const card of cards) {
      const controlCanvas = await generateCardCanvas(card, 'control');
      const pictureCanvas = await generateCardCanvas(card, 'picture');
      const labelCanvas = await generateCardCanvas(card, 'label');
      
      await addCardToSheet(controlCanvas);
      await addCardToSheet(pictureCanvas);
      await addCardToSheet(labelCanvas);
    }
    
    if (currentSheet !== null) {
      sheets.push((currentSheet as SheetType).canvas);
    }
    
    // Download all sheets
    sheets.forEach((sheet, index) => {
      const link = document.createElement('a');
      link.download = `montessori_cards_page_${index + 1}.png`;
      link.href = sheet.toDataURL('image/png');
      link.click();
    });
    
    setGenerating(false);
  };

  // Download all cards individually
  const downloadAllCards = async () => {
    setGenerating(true);
    
    for (const card of cards) {
      await downloadCard(card, 'control');
      await new Promise(r => setTimeout(r, 100));
      await downloadCard(card, 'picture');
      await new Promise(r => setTimeout(r, 100));
      await downloadCard(card, 'label');
      await new Promise(r => setTimeout(r, 100));
    }
    
    setGenerating(false);
  };

  // Crop overlay component
  const CropOverlay = () => {
    const card = cards.find(c => c.id === cropMode);
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
              onClick={() => setCropMode(null)}
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
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
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
              onClick={() => setCropMode(null)}
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
              onClick={applyCrop}
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

  // Card preview component
  const CardPreview = ({ card }: { card: Card }) => (
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
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img
                src={card.croppedImage}
                alt={card.label}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
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
              aspectRatio: '1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              <img
                src={card.croppedImage}
                alt={card.label}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
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
        onChange={(e) => updateCardLabel(card.id, e.target.value)}
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
          onClick={() => startCrop(card.id)}
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
          onClick={() => downloadCard(card, 'control')}
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
          onClick={() => downloadCard(card, 'picture')}
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
          onClick={() => downloadCard(card, 'label')}
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
          onClick={() => removeCard(card.id)}
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

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px',
        padding: '24px',
        background: 'linear-gradient(135deg, #2D5A27 0%, #4a8c42 100%)',
        borderRadius: '16px',
        color: '#fff'
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontSize: '2.5rem',
          fontWeight: '800'
        }}>
          🍎 Montessori Three-Part Card Generator
        </h1>
        <p style={{
          margin: 0,
          opacity: 0.9,
          fontSize: '1.1rem'
        }}>
          Create beautiful nomenclature cards for your classroom
        </p>
      </div>

      {/* Settings Panel */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#333' }}>
          ⚙️ Card Settings
        </h2>
        <div style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#555'
            }}>
              Border Color
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="color"
                value={borderColor}
                onChange={(e) => setBorderColor(e.target.value)}
                style={{
                  width: '50px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
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
                  fontFamily: 'monospace'
                }}
              />
            </div>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '6px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#555'
            }}>
              Font Style
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
              <option value="Arial">Arial (Sans-serif)</option>
              <option value="Verdana">Verdana</option>
              <option value="Georgia">Georgia</option>
              <option value="Trebuchet MS">Trebuchet MS</option>
            </select>
          </div>
          
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#e8f5e9',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#2e7d32'
          }}>
            <strong>Card Size:</strong> 11cm × 11cm (10cm image + 0.5cm border)
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px'
      }}>
        <button
          onClick={() => setActiveTab('upload')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'upload' ? '#fff' : '#e0e0e0',
            cursor: 'pointer',
            fontWeight: activeTab === 'upload' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          📤 Upload Images
        </button>
        <button
          onClick={() => setActiveTab('labels')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'labels' ? '#fff' : '#e0e0e0',
            cursor: 'pointer',
            fontWeight: activeTab === 'labels' ? '600' : '400',
            fontSize: '14px'
          }}
        >
          📝 Bulk Labels
        </button>
      </div>

      {/* Tab Content */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '0 12px 12px 12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
        {activeTab === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '3px dashed #ccc',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: '#fafafa'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#4CAF50';
              e.currentTarget.style.backgroundColor = '#f0fff0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#ccc';
              e.currentTarget.style.backgroundColor = '#fafafa';
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
            <p style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#333' }}>
              Drop images here or click to upload
            </p>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Supports PNG, JPG, GIF, WebP
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}
        
        {activeTab === 'labels' && (
          <div>
            <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '14px' }}>
              Enter one label per line. Labels will be applied to cards in order.
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder="apple&#10;banana&#10;cherry&#10;..."
              style={{
                width: '100%',
                minHeight: '150px',
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
              onClick={applyBulkLabels}
              style={{
                marginTop: '12px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#2196F3',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Apply Labels to Cards
            </button>
          </div>
        )}
      </div>

      {/* Cards Grid */}
      {cards.length > 0 && (
        <>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#333' }}>
              📚 Your Cards ({cards.length})
            </h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={downloadAllCards}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#4CAF50',
                  color: '#fff',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: generating ? 0.7 : 1
                }}
              >
                {generating ? '⏳ Generating...' : '⬇️ Download All Cards'}
              </button>
              <button
                onClick={generatePrintableSheet}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#9C27B0',
                  color: '#fff',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: generating ? 0.7 : 1
                }}
              >
                {generating ? '⏳ Generating...' : '🖨️ Generate Print Sheets'}
              </button>
              <button
                onClick={() => setCards([])}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '2px solid #f44336',
                  backgroundColor: 'transparent',
                  color: '#f44336',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                🗑️ Clear All
              </button>
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '20px'
          }}>
            {cards.map(card => (
              <CardPreview key={card.id} card={card} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {cards.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: '#999'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎴</div>
          <p style={{ fontSize: '18px', margin: 0 }}>
            Upload some images to get started!
          </p>
        </div>
      )}

      {/* Crop overlay */}
      {cropMode && <CropOverlay />}

      {/* Info section */}
      <div style={{
        marginTop: '48px',
        padding: '24px',
        backgroundColor: '#fff3e0',
        borderRadius: '12px',
        borderLeft: '4px solid #ff9800'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#e65100' }}>
          ℹ️ About Montessori Three-Part Cards
        </h3>
        <p style={{ margin: '0 0 8px 0', color: '#555', lineHeight: 1.6 }}>
          Three-part cards (also called nomenclature cards) consist of:
        </p>
        <ul style={{ margin: '0 0 12px 0', color: '#555', lineHeight: 1.8, paddingLeft: '20px' }}>
          <li><strong>Control Card:</strong> Picture + label together (used for self-checking)</li>
          <li><strong>Picture Card:</strong> Image only (for matching)</li>
          <li><strong>Label Card:</strong> Word only (for reading practice)</li>
        </ul>
        <p style={{ margin: 0, color: '#555', lineHeight: 1.6 }}>
          Children match picture cards and label cards, then use the control cards to verify their work.
          This self-correcting format builds vocabulary, reading skills, and independence.
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

export default MontessoriCardGenerator;
