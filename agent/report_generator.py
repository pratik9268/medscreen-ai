"""
Phase 2: PDF Report Generator
Takes structured JSON summary from Phase 1, uses Groq LLM for narrative,
and ReportLab to render a professional medical pre-screening PDF.
"""

import os
import json
from datetime import datetime
from pathlib import Path

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)

# ── LLM ──────────────────────────────────────────────────────────────────────

_llm = None  # Lazy init to avoid import-time API key errors

def get_llm():
    global _llm
    if _llm is None:
        _llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.4)
    return _llm

# ── Color Palette ─────────────────────────────────────────────────────────────

DARK_BLUE   = colors.HexColor("#0f2b5b")
MED_BLUE    = colors.HexColor("#1e4db7")
LIGHT_BLUE  = colors.HexColor("#e8f0fe")
ACCENT_BLUE = colors.HexColor("#2563eb")
GREEN       = colors.HexColor("#059669")
GREEN_BG    = colors.HexColor("#d1fae5")
AMBER       = colors.HexColor("#d97706")
AMBER_BG    = colors.HexColor("#fef3c7")
RED         = colors.HexColor("#dc2626")
RED_BG      = colors.HexColor("#fee2e2")
GRAY_LIGHT  = colors.HexColor("#f1f5f9")
GRAY        = colors.HexColor("#64748b")
GRAY_DARK   = colors.HexColor("#1e293b")
WHITE       = colors.white
BLACK       = colors.HexColor("#0f172a")

URGENCY_PALETTE = {
    "emergency": (RED,    RED_BG),
    "urgent":    (AMBER,  AMBER_BG),
    "routine":   (GREEN,  GREEN_BG),
}


# ── LLM Narrative Generator ───────────────────────────────────────────────────

def generate_narrative(summary: dict) -> str:
    """Ask Groq to write a concise clinical narrative from the structured summary."""
    prompt = f"""You are a medical scribe. Write a concise, professional clinical pre-screening narrative 
(3-5 sentences) based on the following structured summary. 
Use formal medical language. Do NOT include a heading. Do NOT include any metadata.
Just write the narrative paragraph.

Summary:
{json.dumps(summary, indent=2)}"""

    response = get_llm().invoke([HumanMessage(content=prompt)])
    return response.content.strip()


# ── Style Factory ─────────────────────────────────────────────────────────────

def build_styles():
    base = getSampleStyleSheet()
    styles = {}

    styles["clinic_name"] = ParagraphStyle(
        "clinic_name", fontName="Helvetica-Bold", fontSize=18,
        textColor=WHITE, alignment=TA_LEFT, leading=22,
    )
    styles["clinic_sub"] = ParagraphStyle(
        "clinic_sub", fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#93c5fd"), alignment=TA_LEFT, leading=12,
    )
    styles["report_title"] = ParagraphStyle(
        "report_title", fontName="Helvetica-Bold", fontSize=13,
        textColor=WHITE, alignment=TA_RIGHT, leading=16,
    )
    styles["report_meta"] = ParagraphStyle(
        "report_meta", fontName="Helvetica", fontSize=8,
        textColor=colors.HexColor("#bfdbfe"), alignment=TA_RIGHT, leading=11,
    )
    styles["section_header"] = ParagraphStyle(
        "section_header", fontName="Helvetica-Bold", fontSize=10,
        textColor=DARK_BLUE, spaceBefore=4, spaceAfter=4, leading=13,
    )
    styles["label"] = ParagraphStyle(
        "label", fontName="Helvetica-Bold", fontSize=9,
        textColor=GRAY, leading=12,
    )
    styles["value"] = ParagraphStyle(
        "value", fontName="Helvetica", fontSize=10,
        textColor=BLACK, leading=13,
    )
    styles["narrative"] = ParagraphStyle(
        "narrative", fontName="Helvetica", fontSize=10,
        textColor=GRAY_DARK, leading=15, spaceAfter=4,
    )
    styles["pill_text"] = ParagraphStyle(
        "pill_text", fontName="Helvetica-Bold", fontSize=9,
        textColor=ACCENT_BLUE, leading=12,
    )
    styles["red_flag_text"] = ParagraphStyle(
        "red_flag_text", fontName="Helvetica", fontSize=9,
        textColor=RED, leading=12,
    )
    styles["footer"] = ParagraphStyle(
        "footer", fontName="Helvetica", fontSize=8,
        textColor=GRAY, alignment=TA_CENTER, leading=11,
    )
    styles["disclaimer"] = ParagraphStyle(
        "disclaimer", fontName="Helvetica-Oblique", fontSize=8,
        textColor=GRAY, leading=11,
    )
    return styles


# ── Section Builders ──────────────────────────────────────────────────────────

def section_title(text: str, styles: dict) -> list:
    return [
        HRFlowable(width="100%", thickness=1.5, color=DARK_BLUE, spaceAfter=4),
        Paragraph(text.upper(), styles["section_header"]),
        Spacer(1, 2),
    ]


def kv_table(pairs: list[tuple[str, str]], styles: dict, col_widths=(55*mm, 120*mm)) -> Table:
    data = [[Paragraph(k, styles["label"]), Paragraph(str(v), styles["value"])] for k, v in pairs]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def severity_bar(severity: int) -> Table:
    """Render a coloured severity bar (1-10 scale)."""
    segments = []
    for i in range(1, 11):
        if i <= 3:
            filled_color = GREEN
        elif i <= 6:
            filled_color = AMBER
        else:
            filled_color = RED
        bg = filled_color if i <= severity else colors.HexColor("#e2e8f0")
        segments.append(("", bg))

    bar_data = [[s[0] for s in segments]]
    bar = Table(bar_data, colWidths=[14*mm] * 10, rowHeights=[6*mm])
    style_cmds = [
        ("GRID", (0, 0), (-1, -1), 0.5, WHITE),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]
    for i, (_, bg) in enumerate(segments):
        style_cmds.append(("BACKGROUND", (i, 0), (i, 0), bg))
        if i == 0:
            style_cmds.append(("ROUNDEDCORNERS", (i, 0), (i, 0), [3, 0, 0, 3]))
        if i == 9:
            style_cmds.append(("ROUNDEDCORNERS", (i, 0), (i, 0), [0, 3, 3, 0]))
    bar.setStyle(TableStyle(style_cmds))
    return bar


def symptom_tags(symptoms: list[str], styles: dict, page_width: float) -> Table:
    """Lay out symptom tags in rows."""
    TAG_W = 42 * mm
    cols = max(1, int((page_width) / TAG_W))
    rows = []
    row = []
    for s in symptoms:
        cell = Table(
            [[Paragraph(s, styles["pill_text"])]],
            colWidths=[TAG_W - 4*mm],
        )
        cell.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BLUE),
            ("ROUNDEDCORNERS", (0, 0), (-1, -1), [6, 6, 6, 6]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ]))
        row.append(cell)
        if len(row) == cols:
            rows.append(row)
            row = []
    if row:
        row += [""] * (cols - len(row))
        rows.append(row)

    if not rows:
        return Paragraph("None reported", styles["value"])

    t = Table(rows, colWidths=[TAG_W] * cols)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def urgency_badge(urgency: str, styles: dict) -> Table:
    text_color, bg_color = URGENCY_PALETTE.get(urgency.lower(), (GREEN, GREEN_BG))
    badge_style = ParagraphStyle(
        "badge", fontName="Helvetica-Bold", fontSize=11,
        textColor=text_color, alignment=TA_CENTER, leading=14,
    )
    t = Table([[Paragraph(urgency.upper(), badge_style)]], colWidths=[40*mm], rowHeights=[10*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg_color),
        ("ROUNDEDCORNERS", (0, 0), (-1, -1), [8, 8, 8, 8]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


# ── Header / Footer ───────────────────────────────────────────────────────────

def draw_header(canvas, doc, report_id: str, generated_at: str):
    canvas.saveState()
    W, H = A4
    # Full-width dark header bar
    canvas.setFillColor(DARK_BLUE)
    canvas.rect(0, H - 55*mm, W, 55*mm, fill=1, stroke=0)

    # Left: clinic branding
    canvas.setFont("Helvetica-Bold", 18)
    canvas.setFillColor(WHITE)
    canvas.drawString(20*mm, H - 22*mm, "MedScreen AI")
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.HexColor("#93c5fd"))
    canvas.drawString(20*mm, H - 32*mm, "AI-Powered Patient Pre-Screening System")
    canvas.drawString(20*mm, H - 41*mm, "Confidential Medical Document — Not for Clinical Diagnosis")

    # Right: report info
    canvas.setFont("Helvetica-Bold", 13)
    canvas.setFillColor(WHITE)
    canvas.drawRightString(W - 20*mm, H - 22*mm, "Pre-Screening Report")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#bfdbfe"))
    canvas.drawRightString(W - 20*mm, H - 32*mm, f"Report ID: {report_id}")
    canvas.drawRightString(W - 20*mm, H - 41*mm, f"Generated: {generated_at}")

    # Accent bar below header
    canvas.setFillColor(ACCENT_BLUE)
    canvas.rect(0, H - 57*mm, W, 2*mm, fill=1, stroke=0)

    canvas.restoreState()


def draw_footer(canvas, doc):
    canvas.saveState()
    W, _ = A4
    canvas.setFillColor(GRAY_LIGHT)
    canvas.rect(0, 0, W, 16*mm, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.setLineWidth(0.5)
    canvas.line(0, 16*mm, W, 16*mm)

    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY)
    canvas.drawCentredString(W / 2, 10*mm, "This document is AI-generated for pre-screening purposes only.")
    canvas.drawCentredString(W / 2, 6*mm, "It does not constitute a diagnosis or replace professional medical advice.")
    canvas.drawRightString(W - 20*mm, 8*mm, f"Page {doc.page}")
    canvas.restoreState()


# ── Main PDF Builder ──────────────────────────────────────────────────────────

def generate_report(summary: dict, output_dir: str = "reports") -> str:
    """
    Generate a PDF medical pre-screening report.
    Returns the path to the saved PDF.
    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    report_id = datetime.now().strftime("RPT-%Y%m%d-%H%M%S")
    generated_at = datetime.now().strftime("%d %b %Y, %I:%M %p")
    filename = f"{report_id}.pdf"
    filepath = os.path.join(output_dir, filename)

    styles = build_styles()
    W, H = A4
    content_width = W - 40*mm  # 20mm margins each side

    doc = SimpleDocTemplate(
        filepath,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=62*mm,      # leave room for header
        bottomMargin=22*mm,   # leave room for footer
        title=f"Pre-Screening Report — {report_id}",
        author="MedScreen AI",
    )

    # Generate narrative via LLM
    try:
        narrative_text = generate_narrative(summary)
    except Exception as e:
        narrative_text = f"Narrative generation unavailable. Raw summary: {summary.get('chief_complaint', 'N/A')}"

    story = []

    # ── 1. Patient Overview ────────────────────────────────────────────────────
    story += section_title("Patient Overview", styles)

    urgency = summary.get("urgency", "routine")
    text_color, _ = URGENCY_PALETTE.get(urgency.lower(), (GREEN, GREEN_BG))

    overview_data = [
        [
            kv_table([
                ("Chief Complaint", summary.get("chief_complaint", "N/A")),
                ("Duration",        summary.get("duration", "N/A")),
                ("Severity",        f"{summary.get('severity', '—')}/10"),
            ], styles),
            Table(
                [[Paragraph("URGENCY LEVEL", styles["label"])],
                 [urgency_badge(urgency, styles)]],
                colWidths=[55*mm],
            ),
        ]
    ]
    overview_table = Table(overview_data, colWidths=[content_width - 60*mm, 60*mm])
    overview_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (1, 0), (1, 0), 10),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 6))

    # Severity bar
    sev = summary.get("severity", 0)
    try:
        sev = int(sev)
    except (ValueError, TypeError):
        sev = 0
    if 1 <= sev <= 10:
        story.append(Paragraph("Severity Scale", styles["label"]))
        story.append(Spacer(1, 3))
        story.append(severity_bar(sev))
        story.append(Spacer(1, 3))
        story.append(Paragraph(
            f"&nbsp;&nbsp;1 — Minimal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;10 — Unbearable",
            ParagraphStyle("scale_label", fontName="Helvetica", fontSize=7.5, textColor=GRAY, leading=10),
        ))
    story.append(Spacer(1, 10))

    # ── 2. Clinical Narrative ──────────────────────────────────────────────────
    story += section_title("Clinical Narrative", styles)
    story.append(Paragraph(narrative_text, styles["narrative"]))
    story.append(Spacer(1, 10))

    # ── 3. Reported Symptoms ───────────────────────────────────────────────────
    all_symptoms = list(set(
        summary.get("symptoms", []) + summary.get("associated_symptoms", [])
    ))
    if all_symptoms:
        story += section_title("Reported Symptoms", styles)
        story.append(symptom_tags(all_symptoms, styles, content_width))
        story.append(Spacer(1, 10))

    # ── 4. Red Flags ───────────────────────────────────────────────────────────
    red_flags = [f for f in summary.get("red_flags", []) if f.lower() not in ("none", "")]
    if red_flags:
        story += section_title("Red Flags / Urgent Indicators", styles)
        rf_rows = [[
            Paragraph("⚠", ParagraphStyle("icon", fontName="Helvetica-Bold", fontSize=10, textColor=RED, leading=13)),
            Paragraph(flag, styles["red_flag_text"]),
        ] for flag in red_flags]
        rf_table = Table(rf_rows, colWidths=[8*mm, content_width - 8*mm])
        rf_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), RED_BG),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (0, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(KeepTogether(rf_table))
        story.append(Spacer(1, 10))

    # ── 5. Triage & Recommendation ────────────────────────────────────────────
    story += section_title("Triage & Recommendation", styles)
    story.append(kv_table([
        ("Recommended Specialist", summary.get("recommended_specialist", "General Practitioner")),
        ("Patient History Hints",  summary.get("patient_history_hints", "None mentioned")),
    ], styles))
    story.append(Spacer(1, 10))

    # ── 6. Disclaimer ─────────────────────────────────────────────────────────
    story += section_title("Disclaimer", styles)
    story.append(Paragraph(
        "This report was generated by an AI pre-screening assistant and is intended solely "
        "as a preliminary triage aid. It does NOT constitute a clinical diagnosis. "
        "All information must be reviewed and validated by a licensed healthcare professional "
        "before any treatment decisions are made. In case of emergency, please call your local "
        "emergency services immediately.",
        styles["disclaimer"],
    ))

    # ── Build ──────────────────────────────────────────────────────────────────
    doc.build(
        story,
        onFirstPage=lambda c, d: (draw_header(c, d, report_id, generated_at), draw_footer(c, d)),
        onLaterPages=lambda c, d: (draw_header(c, d, report_id, generated_at), draw_footer(c, d)),
    )

    return filepath
