import io
import re
import csv
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, Circle, Polygon

def format_inr(val) -> str:
    """Formats numeric values into Indian comma grouping (e.g. 1,05,000)."""
    if val is None:
        return "—"
    try:
        n = round(float(val))
        s = str(abs(n))
        if len(s) <= 3:
            res = s
        else:
            last3 = s[-3:]
            rest = s[:-3]
            grouped = re.sub(r'\B(?=(\d{2})+(?!\d))', ',', rest)
            res = grouped + ',' + last3
        return f"-{res}" if n < 0 else res
    except Exception:
        return str(val)

def generate_csv_report(data: Dict[str, Any]) -> str:
    """Generates a clean CSV report string from comparison data."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["FARMPRICE AI — Agricultural Market Price Comparison Report"])
    writer.writerow(["Crop", data.get("crop_name", "N/A")])
    writer.writerow(["Variety", data.get("variety_name", "All")])
    writer.writerow(["Quantity (Quintals)", data.get("quantity_quintals", 0)])
    writer.writerow(["Origin Location", data.get("origin_name", "Hassan, Karnataka")])
    writer.writerow(["Date", data.get("comparison_date", "")])
    writer.writerow(["Data Mode", data.get("data_mode", "LOCAL_DEVELOPMENT_ADAPTER")])
    writer.writerow([])
    
    writer.writerow([
        "Rank", "Mandi", "Price (Rs/q)", "Road Dist (km)", "Gross Value (Rs)",
        "Total Costs (Rs)", "Net Return (Rs)", "Net / q (Rs)"
    ])

    for m in data.get("mandis", []):
        writer.writerow([
            f"#{m.get('rank', '')}",
            m.get("mandi_name"),
            m.get("modal_price_per_q"),
            m.get("estimated_road_distance_km"),
            m.get("gross_sale_value"),
            m.get("total_expenses"),
            m.get("estimated_net_return"),
            m.get("net_return_per_quintal")
        ])

    writer.writerow([])
    writer.writerow(["Data Source", "AGMARKNET / Official Karnataka Mandi Data Warehouse"])
    writer.writerow(["Disclaimer", "Calculations are deterministic mathematical estimates based on observed Agmarknet auction modal prices, standard road curvature freight metrics, and statutory APMC costs."])
    return output.getvalue()

def generate_pdf_report(data: Dict[str, Any]) -> bytes:
    """
    Generates an official, print-ready PDF matching the
    FarmPrice AI Market Comparison Report template layout.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=30,
        bottomMargin=24
    )

    styles = getSampleStyleSheet()

    # Custom Paragraph Styles
    brand_farm_style = ParagraphStyle(
        'BrandFarm',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=22,
        textColor=colors.HexColor('#0F3D24')
    )
    tagline_style = ParagraphStyle(
        'Tagline',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#1B5E38')
    )
    slogan_style = ParagraphStyle(
        'Slogan',
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=12,
        alignment=2, # Right align
        textColor=colors.HexColor('#0F3D24')
    )
    title_style = ParagraphStyle(
        'ReportTitle',
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=20,
        textColor=colors.HexColor('#0F3D24')
    )
    subtitle_style = ParagraphStyle(
        'ReportSubtitle',
        fontName='Helvetica',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor('#4B6354')
    )
    section_h2_style = ParagraphStyle(
        'SectionH2',
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13,
        textColor=colors.HexColor('#0F3D24')
    )
    body_cell_style = ParagraphStyle(
        'BodyCell',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1A241F')
    )
    body_cell_bold = ParagraphStyle(
        'BodyCellBold',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0F3D24')
    )
    table_head_style = ParagraphStyle(
        'TableHead',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=1 # Center
    )
    card_title_style = ParagraphStyle(
        'CardTitle',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0F3D24')
    )
    card_desc_style = ParagraphStyle(
        'CardDesc',
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#354F3E')
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#354F3E')
    )

    elements = []

    # 1. Header (Left: Brand & Tagline; Right: Slogan & Leaf)
    header_table_data = [
        [
            Paragraph('<b>FarmPrice</b> <font color="#16A34A"><b>AI</b></font><br/><font size="8" color="#1B5E38"><b>Predict &bull; Compare &bull; Get Better Prices</b></font>', brand_farm_style),
            Paragraph('<i>Smarter Decisions<br/>for a Prosperous Farm</i>', slogan_style)
        ]
    ]
    t_header = Table(header_table_data, colWidths=[320, 220])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E8F2EB')),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 10))

    # 2. Title & Subtitle
    elements.append(Paragraph('Market Price Comparison &amp; Anal<font color="#DC2626"><b>I</b></font>ysis', title_style))
    elements.append(Spacer(1, 2))
    elements.append(Paragraph('Know Your Market. Compare Prices. Sell With Confidence.', subtitle_style))
    elements.append(Spacer(1, 4))

    # Accent Line Table
    accent_bar = Table([['']], colWidths=[65], rowHeights=[2.5])
    accent_bar.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#559F63')),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(accent_bar)
    elements.append(Spacer(1, 10))

    # 3. Crop & Report Summary Panel (2 columns, pale green)
    best_mandi = data.get("best_mandi_name") or (
        data.get("mandis", [{}])[0].get("mandi_name") if data.get("mandis") else "Hassan APMC"
    )
    crop_display = f"{data.get('crop_name', 'Tomato')} ({data.get('variety_name', 'Hybrid')})"
    qty_display = f"{data.get('quantity_quintals', 50)} Quintals"
    origin_display = data.get('origin_name', 'Hassan, Karnataka')
    date_display = data.get('comparison_date', '2026-10-24')
    mode_display = data.get('data_mode', 'LOCAL_DEVELOPMENT_ADAPTER')

    summary_data = [
        [
            Paragraph(f'<b>Crop:</b> {crop_display}', body_cell_style),
            Paragraph(f'<b>Quantity:</b> {qty_display}', body_cell_style)
        ],
        [
            Paragraph(f'<b>Origin:</b> {origin_display}', body_cell_style),
            Paragraph(f'<b>Date:</b> {date_display}', body_cell_style)
        ],
        [
            Paragraph(f'<b>Best Recommended Mandi:</b> <font color="#0F3D24"><b>{best_mandi} &starf;</b></font>', body_cell_style),
            Paragraph(f'<b>Data Mode:</b> <font face="Courier" size="7.5">{mode_display}</font>', body_cell_style)
        ]
    ]
    t_summary = Table(summary_data, colWidths=[270, 270])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EDF7F0')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#D2EBD7')),
        ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor('#E2F3E7')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(t_summary)
    elements.append(Spacer(1, 12))

    # 4. Market Comparison & Net Return Breakdown Heading
    elements.append(Paragraph('&bull; <b>Market Comparison &amp; Net Return Breakdown</b>', section_h2_style))
    elements.append(Spacer(1, 6))

    # 5. Table Data (8 Columns)
    table_headers = [
        Paragraph('<b>Rank</b>', table_head_style),
        Paragraph('<b>Mandi</b>', ParagraphStyle('THL', parent=table_head_style, alignment=0)),
        Paragraph('<b>Price (Rs/q)</b>', ParagraphStyle('THR', parent=table_head_style, alignment=2)),
        Paragraph('<b>Road Dist (km)</b>', ParagraphStyle('THR', parent=table_head_style, alignment=2)),
        Paragraph('<b>Gross Value (Rs)</b>', ParagraphStyle('THR', parent=table_head_style, alignment=2)),
        Paragraph('<b>Total Costs (Rs)</b>', ParagraphStyle('THR', parent=table_head_style, alignment=2)),
        Paragraph('<b>Net Return (Rs)</b>', ParagraphStyle('THR', parent=table_head_style, alignment=2)),
        Paragraph('<b>Net / q (Rs)</b>', ParagraphStyle('THR', parent=table_head_style, alignment=2))
    ]
    table_rows = [table_headers]

    mandis_list = data.get("mandis", [])[:6]
    for idx, m in enumerate(mandis_list):
        is_best = m.get("is_best_net_return") or idx == 0
        star = " &starf;" if is_best else ""
        m_name = m.get("mandi_name", "")
        mandi_text = f"<b>{m_name}{star}</b>" if is_best else m_name

        road_km = m.get("estimated_road_distance_km")
        road_str = f"{road_km:.1f}" if isinstance(road_km, (int, float)) else str(road_km or "—")

        cell_style = body_cell_bold if is_best else body_cell_style
        cell_style_r = ParagraphStyle('CR', parent=cell_style, alignment=2)
        cell_style_c = ParagraphStyle('CC', parent=cell_style, alignment=1)

        table_rows.append([
            Paragraph(f"#{m.get('rank', idx + 1)}", cell_style_c),
            Paragraph(mandi_text, cell_style),
            Paragraph(format_inr(m.get("modal_price_per_q")), cell_style_r),
            Paragraph(road_str, cell_style_r),
            Paragraph(format_inr(m.get("gross_sale_value")), cell_style_r),
            Paragraph(format_inr(m.get("total_expenses")), cell_style_r),
            Paragraph(format_inr(m.get("estimated_net_return")), cell_style_r),
            Paragraph(format_inr(m.get("net_return_per_quintal")), cell_style_r)
        ])

    col_widths = [32, 130, 56, 56, 68, 62, 76, 60]
    t_comp = Table(table_rows, colWidths=col_widths)
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#144A30')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#D5E5D9')),
        ('INNERGRID', (0,0), (-1,-1), 0.25, colors.HexColor('#E1ECE4')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F7FAF8')]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(t_comp)
    elements.append(Spacer(1, 12))

    # 6. Why This Market? Heading & 3 Recommendation Cards
    elements.append(Paragraph('&bull; <b>Why This Market?</b>', section_h2_style))
    elements.append(Spacer(1, 6))

    top_mandi = mandis_list[0] if mandis_list else {}
    top_mandi_name = top_mandi.get("mandi_name", "Hassan APMC")
    top_net = format_inr(top_mandi.get("estimated_net_return", 102790))
    top_dist = top_mandi.get("estimated_road_distance_km", 2.0)
    top_dist_str = f"{top_dist:.1f}" if isinstance(top_dist, (int, float)) else str(top_dist)
    top_trans = format_inr(top_mandi.get("transport_expense", 2210))
    top_arrival = top_mandi.get("arrival_quantity_tonnes", 125.0)

    card_1_text = (
        f"<b>Highest Take-home Return</b><br/>"
        f"<font size='7.5' color='#354F3E'>{top_mandi_name} gives the highest net return of "
        f"Rs {top_net} for your {qty_display.lower()}.</font>"
    )
    card_2_text = (
        f"<b>Low Freight Overhead</b><br/>"
        f"<font size='7.5' color='#354F3E'>Only {top_dist_str} km road distance from origin, "
        f"reducing transport cost (Rs {top_trans}).</font>"
    )
    if top_arrival:
        card_3_text = (
            f"<b>High Trading Volume</b><br/>"
            f"<font size='7.5' color='#354F3E'>{top_arrival} tonnes ({(top_arrival * 10):.0f} quintals) "
            f"guarantees fast auction clearance.</font>"
        )
    else:
        card_3_text = (
            f"<b>High Trading Volume</b><br/>"
            f"<font size='7.5' color='#354F3E'>Consistent daily APMC trading volume guarantees "
            f"active buyer competition and prompt settlement.</font>"
        )

    cards_data = [
        [
            Paragraph(card_1_text, card_title_style),
            Paragraph(card_2_text, card_title_style),
            Paragraph(card_3_text, card_title_style)
        ]
    ]
    t_cards = Table(cards_data, colWidths=[180, 180, 180])
    t_cards.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F3F8F3')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#DCECE0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E5F2E8')),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(t_cards)
    elements.append(Spacer(1, 10))

    # 7. Important Disclaimer & Assumptions Callout Box
    disclaimer_html = (
        "<b>Important Disclaimer &amp; Assumptions:</b> Calculations are deterministic mathematical "
        "estimates based on observed Agmarknet auction modal prices, standard road curvature freight metrics, "
        "and statutory APMC costs. Actual realized earnings may vary based on physical crop quality grading "
        "and same-day auction dynamics."
    )
    t_disc = Table([[Paragraph(disclaimer_html, disclaimer_style)]], colWidths=[540])
    t_disc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EDF7F0')),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor('#D2EBD7')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    elements.append(t_disc)
    elements.append(Spacer(1, 10))

    # 8. Bottom Agricultural Landscape Drawing
    d = Drawing(540, 42)
    # Sun on right
    d.add(Circle(485, 20, 15, fillColor=colors.HexColor('#FEF08A'), strokeColor=None))
    d.add(Circle(485, 20, 9, fillColor=colors.HexColor('#FDE047'), strokeColor=None))
    # Distant hill
    d.add(Polygon([0, 0, 540, 0, 540, 20, 420, 12, 260, 24, 100, 14, 0, 18], fillColor=colors.HexColor('#A8DCB7'), strokeColor=None))
    # Mid hill
    d.add(Polygon([0, 0, 540, 0, 540, 14, 380, 22, 180, 10, 0, 16], fillColor=colors.HexColor('#3E935A'), strokeColor=None))
    # Farm buildings
    d.add(Rect(435, 10, 16, 11, fillColor=colors.HexColor('#F0FDF4'), strokeColor=None))
    d.add(Polygon([433, 21, 443, 28, 453, 21], fillColor=colors.HexColor('#1B4D2E'), strokeColor=None))
    d.add(Rect(453, 11, 10, 8, fillColor=colors.HexColor('#E2F3E7'), strokeColor=None))
    d.add(Circle(428, 14, 5, fillColor=colors.HexColor('#1E6B3E'), strokeColor=None))
    # Foreground hill
    d.add(Polygon([0, 0, 540, 0, 540, 8, 300, 15, 0, 9], fillColor=colors.HexColor('#1E5C34'), strokeColor=None))
    # Corner leaf left
    d.add(Polygon([0, 0, 14, 20, 30, 12, 18, 0], fillColor=colors.HexColor('#15803D'), strokeColor=None))
    # Corner leaf right
    d.add(Polygon([540, 0, 526, 18, 510, 10, 524, 0], fillColor=colors.HexColor('#166534'), strokeColor=None))

    elements.append(d)

    # Build the PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
