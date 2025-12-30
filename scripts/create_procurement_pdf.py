from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

# Create the PDF
doc = SimpleDocTemplate(
    "/Users/tredouxwillemse/Desktop/whale/public/docs/1688_Procurement_Guide.pdf",
    pagesize=A4,
    rightMargin=2*cm,
    leftMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2*cm
)

styles = getSampleStyleSheet()

title_style = ParagraphStyle('CustomTitle', parent=styles['Title'], fontSize=24, spaceAfter=30, textColor=HexColor('#1e3a5f'))
heading1_style = ParagraphStyle('CustomH1', parent=styles['Heading1'], fontSize=16, spaceBefore=20, spaceAfter=10, textColor=HexColor('#2563eb'))
heading2_style = ParagraphStyle('CustomH2', parent=styles['Heading2'], fontSize=14, spaceBefore=15, spaceAfter=8, textColor=HexColor('#059669'))
normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=10, spaceAfter=6, leading=14)
chinese_style = ParagraphStyle('ChineseText', parent=styles['Normal'], fontSize=10, spaceAfter=4, leading=14, backColor=HexColor('#f0f9ff'), borderPadding=10)

story = []

# ============ TITLE PAGE ============
story.append(Paragraph("1688 Classroom Procurement Guide", title_style))
story.append(Paragraph("Montessori Language Materials - Beijing International School", styles['Heading2']))
story.append(Spacer(1, 20))

intro = """<b>Purpose:</b> This document contains all the information you need to purchase Montessori 
language materials from 1688.com suppliers. Each section includes the factory name, 
search terms, items to order, and a ready-to-paste Chinese message.
<br/><br/><b>Budget Estimate:</b> ¥400-600 total<br/><b>Delivery:</b> Beijing, Chaoyang District"""
story.append(Paragraph(intro, normal_style))
story.append(Spacer(1, 20))

# Quick reference table
story.append(Paragraph("QUICK REFERENCE - Supplier Categories", heading2_style))
quick_data = [
    ['Category', 'Best Supplier Type', 'Est. Cost'],
    ['Animal Models (Farm/Wild/Ocean)', 'Chenghai Toy Factories', '¥80-150'],
    ['Transport Models', 'Chenghai Toy Factories', '¥30-50'],
    ['Fruit & Vegetable Models', 'Yiwu Toy Factories', '¥40-60'],
    ['Tool Models', 'Yiwu/Chenghai Factories', '¥20-40'],
    ['Wicker Baskets (10-15)', 'Caoxian Craft Suppliers', '¥100-200'],
]
quick_table = Table(quick_data, colWidths=[6*cm, 6*cm, 3*cm])
quick_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e3a5f')),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
]))
story.append(quick_table)
story.append(PageBreak())

# ============ SUPPLIER 1: ANIMAL MODELS ============
story.append(Paragraph("SUPPLIER 1: Animal Models Factory", heading1_style))
story.append(Paragraph("Recommended: Chenghai Leduomei Toy Factory", heading2_style))

info1 = """<b>Factory:</b> 澄海乐哆美玩具厂 (Chenghai Leduomei)<br/>
<b>Location:</b> Chenghai, Shantou, Guangdong<br/>
<b>Experience:</b> 30+ years<br/>
<b>1688 Search:</b> 乐哆美 动物模型<br/>
<b>Alternative:</b> 澄海优优玩具 (Youyou Toys)"""
story.append(Paragraph(info1, normal_style))

items1_data = [
    ['Category', 'Items (6 each)', 'Size'],
    ['Farm Animals', 'Cow, Pig, Horse, Sheep, Chicken, Duck', '2-4cm'],
    ['Wild Animals', 'Lion, Elephant, Giraffe, Zebra, Hippo, Tiger', '2-4cm'],
    ['Ocean Animals', 'Whale, Dolphin, Shark, Octopus, Starfish, Crab', '2-4cm'],
    ['Transport', 'Car, Truck, Bus, Airplane, Train, Boat', '2-4cm'],
]
items1_table = Table(items1_data, colWidths=[3.5*cm, 8*cm, 2*cm])
items1_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#059669')),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
]))
story.append(items1_table)
story.append(Spacer(1, 10))

message1 = """您好老板！

我是北京国际幼儿园蒙台梭利班的老师，正在准备开学教具采购。

需要以下仿真动物模型（每个尺寸2-4厘米，PVC实心材质）：

🐄 农场动物 6件：牛、猪、马、羊、鸡、鸭
🦁 野生动物 6件：狮子、大象、长颈鹿、斑马、河马、老虎
🐠 海洋动物 6件：鲸鱼、海豚、鲨鱼、章鱼、海星、螃蟹
🚗 交通工具 6件：汽车、卡车、公交车、飞机、火车、船

要求：✅ 仿真度高 ✅ 安全无毒 ✅ 请发实物图

请报价（含运费到北京朝阳区），可以微信沟通 谢谢！🙏"""
story.append(Paragraph("<b>MESSAGE TO COPY:</b>", normal_style))
story.append(Paragraph(message1.replace('\n', '<br/>'), chinese_style))
story.append(PageBreak())

# ============ SUPPLIER 2: FRUIT & VEGETABLE MODELS ============
story.append(Paragraph("SUPPLIER 2: Fruit & Vegetable Models", heading1_style))
story.append(Paragraph("Recommended: Yiwu Aotai Toy Factory", heading2_style))

info2 = """<b>Factory:</b> 义乌奥泰玩具厂 (Yiwu Aotai)<br/>
<b>Location:</b> Yiwu, Zhejiang<br/>
<b>Specialty:</b> Simulation fruits, vegetables, novelty toys<br/>
<b>1688 Search:</b> 奥泰玩具 仿真水果蔬菜"""
story.append(Paragraph(info2, normal_style))

items2_data = [
    ['Category', 'Items (6 each)', 'Size'],
    ['Fruits', 'Apple, Banana, Orange, Grapes, Strawberry, Pear', '2-4cm'],
    ['Vegetables', 'Carrot, Tomato, Broccoli, Potato, Corn, Pepper', '2-4cm'],
    ['Tools', 'Hammer, Screwdriver, Wrench, Pliers, Saw', '2-4cm'],
]
items2_table = Table(items2_data, colWidths=[3.5*cm, 8*cm, 2*cm])
items2_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#dc2626')),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
]))
story.append(items2_table)
story.append(Spacer(1, 10))

message2 = """您好老板！

幼儿园教具采购，需要迷你仿真水果蔬菜模型：

🍎 水果6件：苹果、香蕉、橙子、葡萄、草莓、梨
🥕 蔬菜6件：胡萝卜、番茄、西兰花、土豆、玉米、辣椒
🔧 工具5件：锤子、螺丝刀、扳手、钳子、锯子

尺寸要求：每个2-4厘米（迷你款）
材质：PVC或泡沫，安全无毒

请报价，可以发实物图看看吗？运费到北京 谢谢！🙏"""
story.append(Paragraph("<b>MESSAGE TO COPY:</b>", normal_style))
story.append(Paragraph(message2.replace('\n', '<br/>'), chinese_style))
story.append(PageBreak())

# ============ SUPPLIER 3: WICKER BASKETS ============
story.append(Paragraph("SUPPLIER 3: Wicker Storage Baskets", heading1_style))
story.append(Paragraph("Recommended: Caoxian Liuqiao Crafts", heading2_style))

info3 = """<b>Factory:</b> 曹县柳桥工艺 (Caoxian Liuqiao)<br/>
<b>Location:</b> Caoxian, Heze, Shandong (Famous for wicker crafts)<br/>
<b>1688 Search:</b> 柳桥工艺 藤编收纳筐 OR 曹县 藤筐<br/>
<b>Alternative:</b> 青岛成百顺工艺品 - ¥13.50/basket"""
story.append(Paragraph(info3, normal_style))

items3_data = [
    ['Item', 'Quantity', 'Size', 'Color'],
    ['Wicker Storage Baskets', '10-15 pieces', '20-22cm dia, 8-10cm height', 'Natural'],
]
items3_table = Table(items3_data, colWidths=[4*cm, 3*cm, 5*cm, 2.5*cm])
items3_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#d97706')),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
]))
story.append(items3_table)
story.append(Spacer(1, 10))

message3 = """您好！

幼儿园采购，需要藤编收纳筐：

📦 数量：10-15个
📐 尺寸：直径20-22厘米，高度8-10厘米
🎨 颜色：原木色/浅棕色
✨ 要求：低边，方便小朋友取放物品

请问：1. 单价多少？ 2. 能发实物图吗？ 3. 运费到北京多少？

谢谢！"""
story.append(Paragraph("<b>MESSAGE TO COPY:</b>", normal_style))
story.append(Paragraph(message3.replace('\n', '<br/>'), chinese_style))
story.append(PageBreak())

# ============ COMBINED ORDER OPTION ============
story.append(Paragraph("OPTION 4: Combined Order (Most Efficient)", heading1_style))
story.append(Paragraph("For suppliers that carry multiple categories", heading2_style))

combined_info = """Some larger suppliers carry both animal models AND fruit/vegetable models. 
Use this combined message to save on shipping.<br/><br/>
<b>Search:</b> 仿真动物模型 水果蔬菜 套装 OR 幼儿园教具 仿真模型"""
story.append(Paragraph(combined_info, normal_style))

full_data = [
    ['Category', 'Items', 'Qty'],
    ['Farm Animals', 'Cow, Pig, Horse, Sheep, Chicken, Duck', '6'],
    ['Wild Animals', 'Lion, Elephant, Giraffe, Zebra, Hippo, Tiger', '6'],
    ['Ocean Animals', 'Whale, Dolphin, Shark, Octopus, Starfish, Crab', '6'],
    ['Transport', 'Car, Truck, Bus, Airplane, Train, Boat', '6'],
    ['Fruits', 'Apple, Banana, Orange, Grapes, Strawberry, Pear', '6'],
    ['Vegetables', 'Carrot, Tomato, Broccoli, Potato, Corn, Pepper', '6'],
    ['Tools', 'Hammer, Screwdriver, Wrench, Pliers, Saw', '5'],
    ['Baskets', 'Wicker, 20cm diameter, 8-10cm height', '10-15'],
]
full_table = Table(full_data, colWidths=[3.5*cm, 9*cm, 2*cm])
full_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#7c3aed')),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTSIZE', (0, 0), (-1, -1), 9),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
]))
story.append(full_table)
story.append(Spacer(1, 10))

message_combined = """您好！我是北京国际幼儿园老师，一次性采购多种教具：

【动物模型】每种6件，尺寸2-4cm
- 农场动物：牛、猪、马、羊、鸡、鸭
- 野生动物：狮子、大象、长颈鹿、斑马、河马、老虎
- 海洋动物：鲸鱼、海豚、鲨鱼、章鱼、海星、螃蟹

【其他模型】每种6件
- 交通工具：汽车、卡车、公交车、飞机、火车、船
- 水果：苹果、香蕉、橙子、葡萄、草莓、梨
- 蔬菜：胡萝卜、番茄、西兰花、土豆、玉米、辣椒
- 工具：锤子、螺丝刀、扳手、钳子、锯子（5件）

【收纳筐】10个 - 藤编，直径20cm，高8-10cm，原木色

总预算：¥400-600 | 运费：到北京朝阳区

请问可以打包报价吗？能发实物图确认质量？微信沟通更方便，谢谢！🙏"""
story.append(Paragraph("<b>COMBINED MESSAGE TO COPY:</b>", normal_style))
story.append(Paragraph(message_combined.replace('\n', '<br/>'), chinese_style))
story.append(PageBreak())

# ============ TIPS & SEARCH TERMS ============
story.append(Paragraph("Procurement Tips & Search Terms", heading1_style))

tips = """<b>Before Ordering:</b><br/>
☐ Search for the factory name on 1688.com<br/>
☐ Check their rating (回头率 > 15% is good)<br/>
☐ Look for 实力商家 badge (verified supplier)<br/>
☐ Ask for 实物图 (real photos, not listing photos)<br/>
☐ Confirm shipping cost to Beijing before ordering<br/><br/>

<b>Red Flags:</b><br/>
⚠️ No real product photos | ⚠️ Prices too good to be true<br/>
⚠️ New stores with no history | ⚠️ Can't provide safety certs"""
story.append(Paragraph(tips, normal_style))
story.append(Spacer(1, 15))

search_data = [
    ['What You Need', 'Chinese Search Term'],
    ['Animal models', '仿真动物模型 迷你'],
    ['Farm animals', '农场动物模型 仿真'],
    ['Wild animals', '野生动物模型 套装'],
    ['Ocean animals', '海洋动物模型'],
    ['Fruit models', '仿真水果模型 迷你'],
    ['Vegetable models', '仿真蔬菜模型'],
    ['Tool models', '迷你工具模型'],
    ['Wicker baskets', '藤编收纳筐 20cm'],
    ['Kindergarten supplies', '幼儿园教具'],
]
search_table = Table(search_data, colWidths=[6*cm, 8*cm])
search_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), HexColor('#1e3a5f')),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#cbd5e1')),
]))
story.append(Paragraph("<b>Quick Search Terms Reference:</b>", heading2_style))
story.append(search_table)

# Build PDF
doc.build(story)
print("PDF created successfully at: /Users/tredouxwillemse/Desktop/whale/public/docs/1688_Procurement_Guide.pdf")
