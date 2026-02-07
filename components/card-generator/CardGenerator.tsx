"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Card, CropData } from './types';
import CropOverlay from './CropOverlay';
import CardPreview from './CardPreview';
import { generateCards, generateLargeCards } from './print-utils';

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

interface CardGeneratorProps {
  headerConfig?: HeaderConfig;
}

const CardGenerator: React.FC<CardGeneratorProps> = ({ headerConfig = {} }) => {
  const {
    showBackButton = false,
    backButtonLabel = '←',
    onBackClick,
    title = '🍎 Montessori Three-Part Card Generator',
    subtitle = 'Create beautiful nomenclature cards for your classroom',
    gradientStart = '#2D5A27',
    gradientEnd = '#4a8c42',
    centered = true
  } = headerConfig;
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
      // File size validation (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File is too large. Maximum size is 10MB.');
        return;
      }

      // File type validation
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }

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

  // Crop canvas mouse handlers (with touch support)
  const handleCropStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!cropCanvasRef.current) return;
    const rect = cropCanvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setCropData({ startX: x, startY: y, endX: x, endY: y });
    setIsDragging(true);
  };

  const handleCropMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !cropCanvasRef.current) return;
    e.preventDefault();
    const rect = cropCanvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    setCropData(prev => ({ ...prev, endX: x, endY: y }));
  };

  const handleCropEnd = () => {
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

  // Helper function to calculate optimal font size that fits within bounds
  const calculateOptimalFontSize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number, fontFamily: string): number => {
    // Start with a larger base size (80% of label height instead of 50%)
    let fontSize = Math.round(LABEL_HEIGHT * 0.8);
    const minFontSize = 20; // Minimum readable size
    
    // Binary search for optimal size
    while (fontSize >= minFontSize) {
      ctx.font = `bold ${fontSize}px "${fontFamily}", cursive`;
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = fontSize * 1.2; // Approximate height including line height
      
      // Check if text fits within bounds
      if (textWidth <= maxWidth * 0.95 && textHeight <= maxHeight * 0.95) {
        return fontSize;
      }
      
      // Reduce font size by 2px and try again
      fontSize -= 2;
    }
    
    return minFontSize;
  };

  // Generate card image
  const generateCardCanvas = (card: Card, type: string): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      // Capture current state values to avoid closure issues
      const currentBorderColor = borderColor;
      const currentFontFamily = fontFamily;
      const cardLabel = card.label;
      const cardImage = card.croppedImage;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2d context'));
        return;
      }
      
      if (type === 'control') {
        // Control card: Image + Label
        canvas.width = CARD_SIZE;
        canvas.height = CARD_SIZE + LABEL_HEIGHT;
        
        // Border/background
        ctx.fillStyle = currentBorderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // White area for image
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, IMAGE_SIZE);
        
        // White area for label
        ctx.fillRect(BORDER_SIZE, CARD_SIZE, IMAGE_SIZE, LABEL_HEIGHT - BORDER_SIZE);
        
        // Draw image
        const img = new Image();
        img.onload = () => {
          try {
            // Calculate aspect ratio fill (cover)
            const scale = Math.max(IMAGE_SIZE / img.width, IMAGE_SIZE / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = BORDER_SIZE + (IMAGE_SIZE - scaledWidth) / 2;
            const offsetY = BORDER_SIZE + (IMAGE_SIZE - scaledHeight) / 2;
            
            // Clip to image area
            ctx.save();
            ctx.beginPath();
            ctx.rect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, IMAGE_SIZE);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            ctx.restore();
            
            // Draw label with optimal font size
            ctx.fillStyle = '#000000';
            const labelFontSize = calculateOptimalFontSize(ctx, cardLabel, IMAGE_SIZE, LABEL_HEIGHT - BORDER_SIZE * 2, currentFontFamily);
            ctx.font = `bold ${labelFontSize}px "${currentFontFamily}", cursive`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cardLabel, canvas.width / 2, CARD_SIZE + LABEL_HEIGHT / 2);
            
            resolve(canvas);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = cardImage;
        
      } else if (type === 'picture') {
        // Picture card: Image only
        canvas.width = CARD_SIZE;
        canvas.height = CARD_SIZE;
        
        ctx.fillStyle = currentBorderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, IMAGE_SIZE);
        
        const img = new Image();
        img.onload = () => {
          try {
            // Calculate aspect ratio fill (cover)
            const scale = Math.max(IMAGE_SIZE / img.width, IMAGE_SIZE / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = BORDER_SIZE + (IMAGE_SIZE - scaledWidth) / 2;
            const offsetY = BORDER_SIZE + (IMAGE_SIZE - scaledHeight) / 2;
            
            // Clip to image area
            ctx.save();
            ctx.beginPath();
            ctx.rect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, IMAGE_SIZE);
            ctx.clip();
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            ctx.restore();
            resolve(canvas);
          } catch (error) {
            reject(error);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = cardImage;
        
      } else if (type === 'label') {
        // Label card: Text only
        canvas.width = CARD_SIZE;
        canvas.height = LABEL_HEIGHT;
        
        ctx.fillStyle = currentBorderColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(BORDER_SIZE, BORDER_SIZE, IMAGE_SIZE, LABEL_HEIGHT - BORDER_SIZE * 2);
        
        // Draw label with optimal font size
        ctx.fillStyle = '#000000';
        const labelFontSize = calculateOptimalFontSize(ctx, cardLabel, IMAGE_SIZE, LABEL_HEIGHT - BORDER_SIZE * 2, currentFontFamily);
        ctx.font = `bold ${labelFontSize}px "${currentFontFamily}", cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cardLabel, canvas.width / 2, canvas.height / 2);
        
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

  // Generate optimized print layout - 4 cards per page with white cutting guides
  // Generate optimized print layout - standard size control, picture, and label cards
  const generatePrintableSheet = async () => {
    if (cards.length === 0) {
      alert('Please upload some images first!');
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

      const html = generateCards({
        cards,
        borderColor,
        fontFamily
      });

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating print sheets:', error);
      alert('Error generating print sheets. Please try again.');
    }
    
    setGenerating(false);
  };

  // Generate images-only print layout (2x2 grid per page)
  const generateImagesOnlySheet = async () => {
    if (cards.length === 0) {
      alert('Please upload some images first!');
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

      const html = generateLargeCards({
        cards,
        borderColor,
        fontFamily
      });

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating images print:', error);
      alert('Error generating images print. Please try again.');
    }
    
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

  // Crop overlay component - using useMemo to avoid recreation
  // Get card in crop mode
  const cardInCropMode = cards.find(c => c.id === cropMode);


  // Card preview component

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
        display: 'flex',
        alignItems: 'center',
        ...(centered ? { textAlign: 'center', justifyContent: 'center' } : {}),
        marginBottom: '32px',
        padding: '24px',
        background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`,
        borderRadius: '16px',
        color: '#fff'
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
              flexShrink: 0
            }}
          >
            {backButtonLabel}
          </button>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '2.5rem',
            fontWeight: '800'
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: 0,
              opacity: 0.9,
              fontSize: '1.1rem'
            }}>
              {subtitle}
            </p>
          )}
        </div>
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
                {generating ? '⏳ Preparing...' : '🖨️ Print All Cards'}
              </button>
              <button
                onClick={generateImagesOnlySheet}
                disabled={generating}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#00BCD4',
                  color: '#fff',
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: generating ? 0.7 : 1
                }}
              >
                {generating ? '⏳ Preparing...' : '🖼️ Print Images Only'}
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
              <CardPreview 
                key={card.id} 
                card={card}
                borderColor={borderColor}
                fontFamily={fontFamily}
                onUpdateLabel={updateCardLabel}
                onStartCrop={startCrop}
                onDownloadCard={downloadCard}
                onRemoveCard={removeCard}
              />
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
      {cropMode && (
        <CropOverlay
          card={cardInCropMode}
          cropData={cropData}
          cropCanvasRef={cropCanvasRef}
          cropImageRef={cropImageRef}
          onCropStart={handleCropStart}
          onCropMove={handleCropMove}
          onCropEnd={handleCropEnd}
          onClose={() => setCropMode(null)}
          onApplyCrop={applyCrop}
        />
      )}

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

export default CardGenerator;
