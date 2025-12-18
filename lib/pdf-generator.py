#!/usr/bin/env python3
"""
Flashcard PDF Generator
Generates A4 PDFs with images and text for kindergarten flashcards.
Usage: python3 pdf-generator.py <input_json> <output_pdf>
"""

import sys
import json
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple (0-1 range)."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))


def create_flashcard_pdf(data_path: str, output_path: str):
    """Generate flashcard PDF from JSON data."""
    
    # Load data
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    frames = data['frames']
    song_title = data['songTitle']
    cards_per_page = data['cardsPerPage']
    border_color = hex_to_rgb(data['borderColor'])
    show_timestamps = data['showTimestamps']
    
    # A4 landscape dimensions (swapped width/height for landscape)
    width, height = landscape(A4)
    margin = 15 * mm
    
    # Create canvas with landscape orientation
    c = canvas.Canvas(output_path, pagesize=landscape(A4))
    
    # Layout settings based on cards per page
    if cards_per_page == 1:
        cols, rows = 1, 1
        gap = 0
        border_width = 5 * mm
        font_size = 18
        corner_radius = 10 * mm
    elif cards_per_page == 2:
        cols, rows = 1, 2
        gap = 10 * mm
        border_width = 4 * mm
        font_size = 14
        corner_radius = 8 * mm
    else:  # 4 cards
        cols, rows = 2, 2
        gap = 8 * mm
        border_width = 3 * mm
        font_size = 10
        corner_radius = 6 * mm
    
    # Calculate card dimensions
    card_width = (width - 2 * margin - (cols - 1) * gap) / cols
    card_height = (height - 2 * margin - (rows - 1) * gap) / rows
    
    frame_idx = 0
    page_num = 1
    
    while frame_idx < len(frames):
        # Draw cards on current page
        for row in range(rows):
            for col in range(cols):
                if frame_idx >= len(frames):
                    break
                
                frame = frames[frame_idx]
                
                # Calculate card position (top-left origin for reportlab is bottom-left)
                x = margin + col * (card_width + gap)
                y = height - margin - (row + 1) * card_height - row * gap
                
                # Draw colored border (rounded rectangle)
                c.setFillColorRGB(*border_color)
                c.roundRect(x, y, card_width, card_height, corner_radius, fill=1, stroke=0)
                
                # Draw inner white area
                inner_x = x + border_width
                inner_y = y + border_width
                inner_w = card_width - 2 * border_width
                inner_h = card_height - 2 * border_width
                inner_radius = max(corner_radius - 2 * mm, 3 * mm)
                
                c.setFillColorRGB(1, 1, 1)
                c.roundRect(inner_x, inner_y, inner_w, inner_h, inner_radius, fill=1, stroke=0)
                
                # Calculate image and text areas
                padding = 4 * mm
                lyric = frame.get('lyric', '')
                text_height = 25 * mm if lyric else 8 * mm
                
                img_x = inner_x + padding
                img_y = inner_y + padding + text_height
                img_w = inner_w - 2 * padding
                img_h = inner_h - 2 * padding - text_height
                
                # Draw image
                image_path = frame.get('imagePath', '')
                if image_path:
                    try:
                        img = ImageReader(image_path)
                        iw, ih = img.getSize()
                        aspect = iw / ih
                        
                        # Fit image maintaining aspect ratio
                        if img_w / img_h > aspect:
                            draw_h = img_h
                            draw_w = draw_h * aspect
                        else:
                            draw_w = img_w
                            draw_h = draw_w / aspect
                        
                        # Center image
                        draw_x = img_x + (img_w - draw_w) / 2
                        draw_y = img_y + (img_h - draw_h) / 2
                        
                        c.drawImage(img, draw_x, draw_y, draw_w, draw_h)
                    except Exception as e:
                        print(f'Warning: Could not load image {image_path}: {e}', file=sys.stderr)
                        # Draw placeholder
                        c.setFillColorRGB(0.95, 0.95, 0.95)
                        c.rect(img_x, img_y, img_w, img_h, fill=1, stroke=0)
                
                # Draw lyric text
                if lyric:
                    c.setFillColorRGB(0.12, 0.12, 0.12)
                    c.setFont('Helvetica-Bold', font_size)
                    
                    # Truncate if too long
                    max_chars = int(inner_w / (font_size * 0.5))
                    display_text = lyric[:max_chars] + '...' if len(lyric) > max_chars else lyric
                    
                    text_y = inner_y + padding + text_height / 2 - font_size / 3
                    c.drawCentredString(inner_x + inner_w / 2, text_y, display_text)
                
                # Draw timestamp if enabled
                if show_timestamps:
                    c.setFillColorRGB(0.6, 0.6, 0.6)
                    c.setFont('Helvetica', 8)
                    ts = frame.get('timestamp', 0)
                    mins = int(ts // 60)
                    secs = int(ts % 60)
                    ts_str = f'{mins}:{secs:02d}'
                    c.drawRightString(inner_x + inner_w - padding, inner_y + padding + 2 * mm, ts_str)
                
                frame_idx += 1
        
        # Page footer
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.setFont('Helvetica', 9)
        footer_text = f'{song_title} - Page {page_num}'
        c.drawCentredString(width / 2, 8 * mm, footer_text)
        
        # Add new page if more frames
        if frame_idx < len(frames):
            c.showPage()
            page_num += 1
    
    # Save PDF
    c.save()
    print(f'PDF created successfully: {output_path}')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python3 pdf-generator.py <input_json> <output_pdf>')
        sys.exit(1)
    
    create_flashcard_pdf(sys.argv[1], sys.argv[2])

