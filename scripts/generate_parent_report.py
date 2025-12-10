#!/usr/bin/env python3
# scripts/generate_parent_report.py
"""
Generate a professional PDF parent report for a child's Montessori progress.
Usage: python generate_parent_report.py <report_data_json> <output_pdf>
"""

import sys
import json
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# Area labels and colors
AREA_LABELS = {
    'practical_life': 'Practical Life',
    'sensorial': 'Sensorial',
    'mathematics': 'Mathematics',
    'language': 'Language Arts',
    'english': 'English',
    'cultural': 'Cultural Studies'
}

AREA_COLORS = {
    'practical_life': colors.HexColor('#3B82F6'),
    'sensorial': colors.HexColor('#8B5CF6'),
    'mathematics': colors.HexColor('#10B981'),
    'language': colors.HexColor('#F59E0B'),
    'english': colors.HexColor('#EC4899'),
    'cultural': colors.HexColor('#EAB308')
}

def create_header(canvas, doc):
    """Add header to each page"""
    canvas.saveState()
    canvas.setFont('Helvetica-Bold', 10)
    canvas.setFillColor(colors.HexColor('#4A90E2'))
    canvas.drawString(inch, letter[1] - 0.5*inch, "Montessori Progress Report")
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.grey)
    canvas.drawRightString(letter[0] - inch, letter[1] - 0.5*inch, 
                          f"Generated: {datetime.now().strftime('%B %d, %Y')}")
    canvas.line(inch, letter[1] - 0.6*inch, letter[0] - inch, letter[1] - 0.6*inch)
    canvas.restoreState()

def create_footer(canvas, doc):
    """Add footer to each page"""
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.grey)
    page_num = canvas.getPageNumber()
    text = f"Page {page_num}"
    canvas.drawCentredString(letter[0] / 2, 0.5*inch, text)
    canvas.restoreState()

def add_title_page(story, styles, data):
    """Add title page to the report"""
    # Title
    title = Paragraph("Montessori Progress Report", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 0.3*inch))
    
    # Child name
    child_name = Paragraph(
        f"<font size=24 color='#4A90E2'><b>{data['child']['name']}</b></font>",
        styles['Normal']
    )
    story.append(child_name)
    story.append(Spacer(1, 0.2*inch))
    
    # Age
    age_text = Paragraph(
        f"<font size=14>Age Group: {data['child']['age_group']}</font>",
        styles['Normal']
    )
    story.append(age_text)
    story.append(Spacer(1, 0.1*inch))
    
    # Date range
    start_date = datetime.strptime(data['dateRange']['start'], '%Y-%m-%d').strftime('%B %d, %Y')
    end_date = datetime.strptime(data['dateRange']['end'], '%Y-%m-%d').strftime('%B %d, %Y')
    date_text = Paragraph(
        f"<font size=12>Report Period: {start_date} - {end_date}</font>",
        styles['Normal']
    )
    story.append(date_text)
    story.append(Spacer(1, 0.5*inch))
    
    # Summary stats in a table
    summary_data = [
        ['Total Activities', str(data['summary']['totalActivities'])],
        ['Completed Activities', str(data['summary']['completedActivities'])],
        ['Completion Rate', f"{data['summary']['completionRate']:.0f}%"],
        ['Skills Tracked', str(data['summary']['totalSkills'])],
        ['Skills Mastered', str(data['summary']['masteredSkills'])]
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#E8F4F8')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#2C5F7C')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('PADDING', (0, 0), (-1, -1), 12),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.white, colors.HexColor('#F0F8FF')])
    ]))
    
    story.append(summary_table)
    story.append(PageBreak())

def add_progress_by_area(story, styles, data):
    """Add progress by curriculum area"""
    story.append(Paragraph("<font size=18 color='#4A90E2'><b>Progress by Curriculum Area</b></font>", styles['Heading1']))
    story.append(Spacer(1, 0.2*inch))
    
    progress_by_area = data.get('progressByArea', {})
    
    if not progress_by_area:
        story.append(Paragraph("No progress data available yet.", styles['Normal']))
        story.append(Spacer(1, 0.3*inch))
        return
    
    for area, progress in progress_by_area.items():
        area_name = AREA_LABELS.get(area, area)
        area_color = AREA_COLORS.get(area, colors.grey)
        
        # Area header
        area_title = Paragraph(
            f"<font size=14 color='{area_color.hexval()}'><b>{area_name}</b></font>",
            styles['Heading2']
        )
        story.append(area_title)
        story.append(Spacer(1, 0.1*inch))
        
        # Progress stats
        avg_status = progress.get('averageStatus', 0)
        progress_pct = (avg_status / 5) * 100
        
        stats_data = [
            ['Total Skills', str(progress.get('totalSkills', 0))],
            ['Average Progress', f"{avg_status:.1f} / 5.0"],
            ['Introduced', str(progress.get('introduced', 0))],
            ['Practicing', str(progress.get('practicing', 0))],
            ['Independent', str(progress.get('independent', 0))],
            ['Mastered', str(progress.get('mastery', 0))]
        ]
        
        stats_table = Table(stats_data, colWidths=[2*inch, 1.5*inch])
        stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F9FAFB')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        
        story.append(stats_table)
        story.append(Spacer(1, 0.3*inch))
    
    story.append(PageBreak())

def add_recent_activities(story, styles, data):
    """Add recent completed activities"""
    story.append(Paragraph("<font size=18 color='#4A90E2'><b>Recent Activities</b></font>", styles['Heading1']))
    story.append(Spacer(1, 0.2*inch))
    
    recent = data.get('recentActivities', [])[:10]
    
    if not recent:
        story.append(Paragraph("No activities recorded yet.", styles['Normal']))
        return
    
    for activity_assignment in recent:
        activity = activity_assignment.get('activity', {})
        completed = activity_assignment.get('completed', False)
        date = activity_assignment.get('assigned_date', '')
        
        if date:
            date_obj = datetime.strptime(date, '%Y-%m-%d')
            date_str = date_obj.strftime('%B %d, %Y')
        else:
            date_str = 'Unknown date'
        
        # Activity name with status
        status = "✓ Completed" if completed else "○ Assigned"
        status_color = '#10B981' if completed else '#6B7280'
        
        activity_text = f"""
        <font size=12><b>{activity.get('name', 'Unknown Activity')}</b></font><br/>
        <font size=10 color='#6B7280'>{AREA_LABELS.get(activity.get('area', ''), 'Unknown Area')} • {date_str}</font><br/>
        <font size=10 color='{status_color}'>{status}</font>
        """
        
        story.append(Paragraph(activity_text, styles['Normal']))
        story.append(Spacer(1, 0.15*inch))

def add_activities_by_area(story, styles, data):
    """Add activities summary by curriculum area"""
    story.append(PageBreak())
    story.append(Paragraph("<font size=18 color='#4A90E2'><b>Activities by Curriculum Area</b></font>", styles['Heading1']))
    story.append(Spacer(1, 0.2*inch))
    
    by_area = data.get('activitiesByArea', {})
    
    if not by_area:
        story.append(Paragraph("No activities recorded yet.", styles['Normal']))
        return
    
    # Create summary table
    table_data = [['Curriculum Area', 'Total', 'Completed', 'Rate']]
    
    for area, stats in by_area.items():
        area_name = AREA_LABELS.get(area, area)
        total = stats.get('total', 0)
        completed = stats.get('completed', 0)
        rate = f"{(completed/total*100):.0f}%" if total > 0 else "0%"
        
        table_data.append([area_name, str(total), str(completed), rate])
    
    activities_table = Table(table_data, colWidths=[2.5*inch, 1*inch, 1*inch, 1*inch])
    activities_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4A90E2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    
    story.append(activities_table)

def generate_report(data, output_path):
    """Generate the complete PDF report"""
    # Create document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=1*inch,
        bottomMargin=0.75*inch,
        leftMargin=1*inch,
        rightMargin=1*inch
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Customize styles
    styles.add(ParagraphStyle(
        name='CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=colors.HexColor('#4A90E2'),
        spaceAfter=30,
        alignment=TA_CENTER
    ))
    
    # Build story
    story = []
    
    # Add sections
    add_title_page(story, styles, data)
    add_progress_by_area(story, styles, data)
    add_recent_activities(story, styles, data)
    add_activities_by_area(story, styles, data)
    
    # Build PDF with header/footer
    doc.build(story, onFirstPage=lambda c, d: (create_header(c, d), create_footer(c, d)),
              onLaterPages=lambda c, d: (create_header(c, d), create_footer(c, d)))

def main():
    if len(sys.argv) != 3:
        print("Usage: python generate_parent_report.py <report_data_json> <output_pdf>")
        sys.exit(1)
    
    data_path = sys.argv[1]
    output_path = sys.argv[2]
    
    # Load data
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    # Generate report
    generate_report(data, output_path)
    print(f"Report generated: {output_path}")

if __name__ == '__main__':
    main()
