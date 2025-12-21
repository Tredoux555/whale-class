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
            // Calculate aspect ratio fit
            const scale = Math.min(IMAGE_SIZE / img.width, IMAGE_SIZE / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = BORDER_SIZE + (IMAGE_SIZE - scaledWidth) / 2;
            const offsetY = BORDER_SIZE + (IMAGE_SIZE - scaledHeight) / 2;
            
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
            
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
            const scale = Math.min(IMAGE_SIZE / img.width, IMAGE_SIZE / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const offsetX = BORDER_SIZE + (IMAGE_SIZE - scaledWidth) / 2;
            const offsetY = BORDER_SIZE + (IMAGE_SIZE - scaledHeight) / 2;
            
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
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
  const generatePrintableSheet = async () => {
    if (cards.length === 0) {
      alert('Please upload some images first!');
      return;
    }
    
    setGenerating(true);
    
    try {
      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to use the print feature');
        setGenerating(false);
        return;
      }

      // Capture current settings
      const currentBorderColor = borderColor;
      const currentFontFamily = fontFamily;
      
      // A4 dimensions at 96 DPI for print
      const A4_WIDTH_CM = 21;
      const A4_HEIGHT_CM = 29.7;
      
      // Card dimensions - fixed sizes for Montessori three-part cards
      const PICTURE_CARD_SIZE_CM = 7.5; // 7.5cm × 7.5cm for picture cards
      const LABEL_HEIGHT_CM = 2; // 2cm for label area (standard Montessori proportion)
      const CONTROL_CARD_HEIGHT_CM = PICTURE_CARD_SIZE_CM + LABEL_HEIGHT_CM; // ~9.5cm total
      const LABEL_CARD_HEIGHT_CM = 3.5; // Smaller height for label-only cards (maintains proportion)
      
      // Zero margins to allow cutting lines to reach page edges
      const MARGIN_CM = 0; // No margin - cutting lines extend to page edges
      const CUTTING_LINE_WIDTH = 0.02; // Slightly thicker for better visibility (0.02cm ≈ 0.76pt)
      const WHITE_BORDER_CM = 0.5; // White border around card content (~5mm for comfortable cutting)
      const CARD_BORDER_RADIUS = 0.4; // Rounded corners (~4mm or ~15px - aesthetically pleasing)
      
      // Calculate grid positioning (center cards on page)
      // For 2 columns of 7.5cm cards: 2 × 7.5 = 15cm, leaving 6cm total margin (3cm each side)
      const gridMarginLeft = (A4_WIDTH_CM - (PICTURE_CARD_SIZE_CM * 2)) / 2;
      
      // For 3 rows of 7.5cm picture cards: 3 × 7.5 = 22.5cm, leaving 7.2cm total margin
      const pictureGridMarginTop = (A4_HEIGHT_CM - (PICTURE_CARD_SIZE_CM * 3)) / 2;
      
      // For 3 rows of control cards (~9.5cm each): 3 × 9.5 = 28.5cm, leaving 1.2cm total margin
      const controlGridMarginTop = (A4_HEIGHT_CM - (CONTROL_CARD_HEIGHT_CM * 3)) / 2;
      
      // For label cards: 2 columns × 4 rows layout
      const labelGridMarginTop = (A4_HEIGHT_CM - (LABEL_CARD_HEIGHT_CM * 4)) / 2;
      
      // Build HTML for print
      let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Montessori Cards - Print</title>
  <style>
    @page {
      size: A4;
      margin: ${MARGIN_CM}cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: system-ui, sans-serif;
      background: white;
      position: relative;
    }
    
    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      padding: ${MARGIN_CM}cm;
      position: relative;
      overflow: hidden;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .page-title {
      font-size: 10pt;
      color: #999;
      margin-bottom: 0.5cm;
      text-align: center;
    }
    
    
    .grid {
      display: grid;
      grid-template-columns: ${PICTURE_CARD_SIZE_CM}cm ${PICTURE_CARD_SIZE_CM}cm;
      gap: 0;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      margin: 0;
      padding: 0;
    }
    
    /* Grid for picture cards - 2 columns × 3 rows */
    .grid-picture {
      grid-template-rows: repeat(3, ${PICTURE_CARD_SIZE_CM}cm);
      margin-left: ${gridMarginLeft}cm;
      margin-top: ${pictureGridMarginTop}cm;
    }
    
    /* Grid for control cards - 2 columns × 3 rows */
    .grid-control {
      grid-template-rows: repeat(3, ${CONTROL_CARD_HEIGHT_CM}cm);
      margin-left: ${gridMarginLeft}cm;
      margin-top: ${controlGridMarginTop}cm;
    }
    
    
    .card {
      background: ${currentBorderColor};
      padding: ${WHITE_BORDER_CM}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      gap: 0.5cm;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      margin: 0;
      border: none;
    }
    
    .card-control {
      height: ${CONTROL_CARD_HEIGHT_CM}cm;
      width: ${PICTURE_CARD_SIZE_CM}cm;
    }
    
    .card-picture {
      height: ${PICTURE_CARD_SIZE_CM}cm;
      width: ${PICTURE_CARD_SIZE_CM}cm;
    }
    
    .card-label-only {
      height: ${LABEL_CARD_HEIGHT_CM}cm;
      width: ${PICTURE_CARD_SIZE_CM}cm;
    }
    
    .card-label-only .label-area {
      height: auto;
      flex: 1;
    }
    
    .image-area {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }
    
    .image-area img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .label-area {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      height: ${LABEL_HEIGHT_CM}cm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "${currentFontFamily}", cursive;
      font-size: 24pt;
      font-weight: bold;
      text-align: center;
      padding: 0.2cm 0.3cm;
      line-height: 1.2;
      overflow: hidden;
      word-wrap: break-word;
      max-width: 100%;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      .page-title {
        display: none; /* Hide labels when printing */
      }
      
      /* Force card borders to print */
      .card {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: ${currentBorderColor} !important;
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

      // Helper to create card HTML
      const createCardHTML = (card: Card, type: 'control' | 'picture' | 'label') => {
        if (type === 'control') {
          return `
            <div class="card card-control">
              <div class="image-area">
                <img src="${card.croppedImage}" alt="${card.label}">
              </div>
              <div class="label-area">${card.label}</div>
            </div>
          `;
        } else if (type === 'picture') {
          return `
            <div class="card card-picture">
              <div class="image-area">
                <img src="${card.croppedImage}" alt="${card.label}">
              </div>
            </div>
          `;
        } else {
          return `
            <div class="card card-label-only">
              <div class="label-area" style="flex: 1;">${card.label}</div>
            </div>
          `;
        }
      };

      // Generate Control Cards pages (6 per page in 2x3 grid)
      const controlCards = cards.map(card => createCardHTML(card, 'control'));
      for (let i = 0; i < controlCards.length; i += 6) {
        const pageCards = controlCards.slice(i, i + 6);
        const pageNum = Math.floor(i / 6) + 1;
        html += `
          <div class="page page-has-3rows-control">
            <div class="page-title">Control Cards - Page ${pageNum}</div>
            <div class="grid grid-control">
              ${pageCards.join('')}
              ${pageCards.length < 6 ? '<div></div>'.repeat(6 - pageCards.length) : ''}
            </div>
          </div>
        `;
      }

      // Generate Picture Cards pages (6 per page in 2x3 grid)
      const pictureCards = cards.map(card => createCardHTML(card, 'picture'));
      for (let i = 0; i < pictureCards.length; i += 6) {
        const pageCards = pictureCards.slice(i, i + 6);
        const pageNum = Math.floor(i / 6) + 1;
        html += `
          <div class="page page-has-3rows-picture">
            <div class="page-title">Picture Cards - Page ${pageNum}</div>
            <div class="grid grid-picture">
              ${pageCards.join('')}
              ${pageCards.length < 6 ? '<div></div>'.repeat(6 - pageCards.length) : ''}
            </div>
          </div>
        `;
      }

      // Generate Label Cards pages (8 per page in 2x4 grid)
      const labelCards = cards.map(card => createCardHTML(card, 'label'));
      const labelGridMarginLeft = (A4_WIDTH_CM - (PICTURE_CARD_SIZE_CM * 2)) / 2;
      for (let i = 0; i < labelCards.length; i += 8) {
        const pageCards = labelCards.slice(i, i + 8);
        const pageNum = Math.floor(i / 8) + 1;
        html += `
          <div class="page">
            <div class="page-title">Label Cards - Page ${pageNum}</div>
            <div class="grid" style="grid-template-rows: repeat(4, ${LABEL_CARD_HEIGHT_CM}cm); grid-auto-rows: ${LABEL_CARD_HEIGHT_CM}cm; margin-left: ${labelGridMarginLeft}cm; margin-top: ${labelGridMarginTop}cm;">
              ${pageCards.join('')}
              ${pageCards.length < 8 ? '<div></div>'.repeat(8 - pageCards.length) : ''}
            </div>
          </div>
        `;
      }

      html += `
  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

      printWindow.document.write(html);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Error generating print sheets:', error);
      alert('Error generating print sheets. Please try again.');
    }
    
    setGenerating(false);
  };

  // Generate images-only print layout
  const generateImagesOnlySheet = async () => {
    if (cards.length === 0) {
      alert('Please upload some images first!');
      return;
    }
    
    setGenerating(true);
    
    try {
      // Create print window
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to use the print feature');
        setGenerating(false);
        return;
      }

      // Capture current settings
      const currentBorderColor = borderColor;

      // A4 dimensions at 96 DPI for print
      const A4_WIDTH_CM = 21;
      const A4_HEIGHT_CM = 29.7;
      
      // Calculate image size for 2x2 grid on A4
      // Zero margins to allow cutting lines to reach page edges
      const MARGIN_CM = 0; // No margin - cutting lines extend to page edges
      const CUTTING_LINE_WIDTH = 0.01; // 1px cutting line (0.01cm ≈ 0.38pt)
      const WHITE_BORDER_CM = 0.5; // White border around card content (~5mm for comfortable cutting)
      const CARD_BORDER_RADIUS = 0.4; // Rounded corners (~4mm or ~15px - aesthetically pleasing)
      
      const usableWidth = A4_WIDTH_CM - (2 * MARGIN_CM);
      const usableHeight = A4_HEIGHT_CM - (2 * MARGIN_CM);
      
      // For 2x2 grid - cards touch each other, no gap
      const imageSize = Math.min(
        usableWidth / 2,
        usableHeight / 2
      );
      
      // Build HTML for print
      let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Montessori Images - Print</title>
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
      position: relative;
    }
    
    .page {
      page-break-after: always;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      padding: 0;
      margin: 0;
      position: relative;
      overflow: hidden;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .page-title {
      font-size: 10pt;
      color: #999;
      margin-bottom: 0.5cm;
      text-align: center;
    }
    
    
    .grid {
      display: grid;
      grid-template-columns: ${imageSize}cm ${imageSize}cm;
      grid-template-rows: ${imageSize}cm ${imageSize}cm;
      gap: 0;
      width: ${A4_WIDTH_CM}cm;
      height: ${A4_HEIGHT_CM}cm;
      position: relative;
      margin: 0;
      padding: 0;
    }
    
    
    .image-box {
      background: ${currentBorderColor};
      padding: ${WHITE_BORDER_CM}cm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
      margin: 0;
      border: none;
    }
    
    .image-inner {
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: ${CARD_BORDER_RADIUS}cm;
    }
    
    .image-inner img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .page-title {
        display: none;
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

      // Generate pages with 4 images each
      for (let i = 0; i < cards.length; i += 4) {
        const pageCards = cards.slice(i, i + 4);
        const pageNum = Math.floor(i / 4) + 1;
        html += `
          <div class="page">
            <div class="page-title">Images - Page ${pageNum}</div>
            <div class="grid">
              ${pageCards.map(card => `
                <div class="image-box">
                  <div class="image-inner">
                    <img src="${card.croppedImage}" alt="${card.label}">
                  </div>
                </div>
              `).join('')}
              ${pageCards.length < 4 ? '<div></div>'.repeat(4 - pageCards.length) : ''}
            </div>
          </div>
        `;
      }

      html += `
  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

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
  const CropOverlay = React.useMemo(() => {
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
            onMouseDown={handleCropStart}
            onMouseMove={handleCropMove}
            onMouseUp={handleCropEnd}
            onMouseLeave={handleCropEnd}
            onTouchStart={handleCropStart}
            onTouchMove={handleCropMove}
            onTouchEnd={handleCropEnd}
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
  }, [cards, cropMode, cropData, cropCanvasRef, cropImageRef, handleCropStart, handleCropMove, handleCropEnd, applyCrop, setCropMode]);

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
      {cropMode && CropOverlay}

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
