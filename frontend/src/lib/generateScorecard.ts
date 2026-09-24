import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ExportData, ExportSection } from '../types/api'

type RGB = [number, number, number]

const ROYAL: RGB = [0, 53, 148]
const GOLD: RGB = [255, 184, 28]
const INK: RGB = [11, 17, 32]
const GRAY: RGB = [100, 116, 139]
const LIGHT_GRAY: RGB = [241, 245, 249]
const WHITE: RGB = [255, 255, 255]

function drawHeader(doc: jsPDF, y: number): number {
  doc.setFillColor(...ROYAL)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...WHITE)
  doc.text('Course Review Scorecard', 14, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Online Learning Consortium', 14, 21)

  return y + 28
}

function drawSectionTable(
  doc: jsPDF,
  title: string,
  section: ExportSection,
  startY: number,
  startIndex: number
): number {
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(title, 14, startY)

  const legendY = startY + 5
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text('0 = Developing     1 = Accomplished     2 = Exemplary', 14, legendY)

  const tableStartY = legendY + 3

  const tableData = section.objectives.map((obj, i) => [
    String(startIndex + i),
    obj.title,
    obj.score != null ? String(obj.score) : '-',
  ])

  autoTable(doc, {
    startY: tableStartY,
    head: [['#', 'OBJECTIVE', 'SCORE']],
    body: tableData,
    foot: [[
      '',
      `SUBTOTAL (out of ${section.max})`,
      String(section.subtotal),
    ]],
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      textColor: INK,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: ROYAL,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8,
    },
    footStyles: {
      fillColor: LIGHT_GRAY,
      textColor: INK,
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18, halign: 'center', fontStyle: 'bold', fontSize: 11 },
    },
    alternateRowStyles: {
      fillColor: [250, 251, 252],
    },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((doc as any).lastAutoTable?.finalY as number) ?? tableStartY + 50
}

function drawStrengthsAndImprovements(
  doc: jsPDF,
  section: ExportSection,
  y: number,
  title: string
): number {
  let currentY = y + 8

  if (currentY > 250) {
    doc.addPage()
    currentY = 20
  }

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(`${title} — Strengths & Areas for Improvement`, 14, currentY)
  currentY += 7

  // Strengths
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...ROYAL)
  doc.text('STRENGTHS', 14, currentY)
  currentY += 5

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.setFontSize(8.5)

  const strengths = section.objectives
    .filter((o) => o.score === 2)
    .map((o) => o.title)

  if (strengths.length > 0) {
    for (const s of strengths) {
      const lines = doc.splitTextToSize(`• ${s}`, 180)
      if (currentY + lines.length * 4 > 275) {
        doc.addPage()
        currentY = 20
      }
      doc.text(lines, 16, currentY)
      currentY += lines.length * 4 + 1
    }
  } else {
    doc.setTextColor(...GRAY)
    doc.text('No objectives scored at Exemplary level.', 16, currentY)
    currentY += 5
  }

  currentY += 4

  // Areas for improvement
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(204, 59, 43)
  doc.text('AREAS FOR IMPROVEMENT', 14, currentY)
  currentY += 5

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.setFontSize(8.5)

  const improvements = section.objectives
    .filter((o) => o.score === 0)
    .map((o) => ({ title: o.title, suggestion: o.improvement_suggestions }))

  if (improvements.length > 0) {
    for (const item of improvements) {
      const titleLines = doc.splitTextToSize(`• ${item.title}`, 180)
      if (currentY + titleLines.length * 4 + 6 > 275) {
        doc.addPage()
        currentY = 20
      }
      doc.setFont('helvetica', 'normal')
      doc.text(titleLines, 16, currentY)
      currentY += titleLines.length * 4

      if (item.suggestion) {
        doc.setTextColor(...GRAY)
        const suggLines = doc.splitTextToSize(item.suggestion, 172)
        doc.text(suggLines, 20, currentY)
        currentY += suggLines.length * 3.5 + 2
        doc.setTextColor(...INK)
      }
      currentY += 1
    }
  } else {
    doc.setTextColor(...GRAY)
    doc.text('No objectives scored at Developing level.', 16, currentY)
    currentY += 5
  }

  return currentY
}

function drawSummaryPage(doc: jsPDF, data: ExportData): void {
  doc.addPage()
  let y = 20

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text('Scorecard Summary', 14, y)
  y += 10

  autoTable(doc, {
    startY: y,
    head: [['SECTION', 'SCORE', 'POSSIBLE']],
    body: [
      ['Essential Design', String(data.scorecard.essential_design.subtotal), '40'],
      ['Advanced Design', String(data.scorecard.advanced_design.subtotal), '30'],
      ['Course Delivery', String(data.scorecard.course_delivery.subtotal), '30'],
    ],
    foot: [['TOTAL', String(data.scorecard.total_score), String(data.scorecard.total_max)]],
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: { top: 5, right: 8, bottom: 5, left: 8 },
      textColor: INK,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: ROYAL,
      textColor: WHITE,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: GOLD,
      textColor: INK,
      fontStyle: 'bold',
      fontSize: 11,
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 30, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY as number ?? y + 40) + 12

  const pct = Math.round(data.scorecard.percentage)
  const tierLabel = pct >= 85 ? 'Exemplary' : pct >= 60 ? 'Accomplished' : 'Developing'

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(`Overall: ${pct}% — ${tierLabel}`, 14, y)
  y += 10

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Course: ${data.course_name}`, 14, y)
  y += 5
  doc.text(`Course ID: ${data.course_id}`, 14, y)
  y += 5
  doc.text(`Reviewer: ${data.reviewer}`, 14, y)
  y += 5
  doc.text(`Review Date: ${data.review_date}`, 14, y)
  y += 5
  doc.text(`Generated: ${data.generated_at}`, 14, y)
  y += 12

  // Improvement plan
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text('Improvement Plan', 14, y)
  y += 7

  const developing = [
    ...data.scorecard.essential_design.objectives,
    ...data.scorecard.advanced_design.objectives,
    ...data.scorecard.course_delivery.objectives,
  ].filter((o) => o.score === 0)

  if (developing.length > 0) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)

    for (const obj of developing) {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      const lines = doc.splitTextToSize(`• ${obj.title}`, 175)
      doc.text(lines, 16, y)
      y += lines.length * 4

      if (obj.improvement_suggestions) {
        doc.setTextColor(...GRAY)
        const sugLines = doc.splitTextToSize(obj.improvement_suggestions, 168)
        doc.text(sugLines, 22, y)
        y += sugLines.length * 3.5 + 2
        doc.setTextColor(...INK)
      }
      y += 2
    }
  } else {
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    doc.text('No developing objectives — course meets all standards.', 16, y)
  }
}

export function generateScorecardPDF(data: ExportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Page 1: Header + Essential Design
  let y = drawHeader(doc, 0)
  y += 6

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text(`Course: ${data.course_name}`, 14, y)
  y += 5
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text(`Course ID: ${data.course_id}  |  Reviewer: ${data.reviewer}  |  Date: ${data.review_date}`, 14, y)
  y += 8

  // Essential Design
  y = drawSectionTable(doc, 'Essential Design', data.scorecard.essential_design, y, 1)
  y = drawStrengthsAndImprovements(doc, data.scorecard.essential_design, y, 'Essential Design')

  // Advanced Design
  doc.addPage()
  y = 20
  y = drawSectionTable(doc, 'Advanced Design', data.scorecard.advanced_design, y, 1)
  y = drawStrengthsAndImprovements(doc, data.scorecard.advanced_design, y, 'Advanced Design')

  // Course Delivery
  doc.addPage()
  y = 20
  y = drawSectionTable(doc, 'Course Delivery', data.scorecard.course_delivery, y, 1)
  y = drawStrengthsAndImprovements(doc, data.scorecard.course_delivery, y, 'Course Delivery')

  // Summary
  drawSummaryPage(doc, data)

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('COURSE REVIEW SCORECARD', 14, 290)
    doc.text(`${i}`, 196, 290, { align: 'right' })
  }

  doc.save(`OLC-Scorecard-${data.course_id}-${data.review_date}.pdf`)
}
