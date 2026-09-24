import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ImprovementPlan, ImprovementPlanItem } from '../types/api'

type RGB = [number, number, number]

const VIOLET: RGB = [109, 40, 217]
const INK: RGB = [11, 17, 32]
const GRAY: RGB = [100, 116, 139]
const WHITE: RGB = [255, 255, 255]
const GREEN: RGB = [22, 163, 74]
const AMBER: RGB = [217, 119, 6]
const RED: RGB = [220, 38, 38]

const DIFFICULTY_COLORS: Record<string, RGB> = {
  easy: GREEN,
  moderate: AMBER,
  hard: RED,
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Quick Win',
  moderate: 'Moderate',
  hard: 'Significant',
}

export function generateImprovementPDF(plan: ImprovementPlan, courseName: string, courseId: string): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header
  doc.setFillColor(...VIOLET)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...WHITE)
  doc.text('Improvement Action Plan', 14, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('OLC Quality Scorecard', 14, 21)

  let y = 36

  // Course info
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.text(`Course: ${courseName}`, 14, y)
  y += 5
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text(`Course ID: ${courseId}  |  Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`, 14, y)
  y += 8

  // Summary
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text('Summary', 14, y)
  y += 5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  const summaryLines = doc.splitTextToSize(plan.summary, 180)
  doc.text(summaryLines, 14, y)
  y += summaryLines.length * 4.5 + 6

  // Stats row
  const easyCount = plan.items.filter(i => i.difficulty === 'easy').length
  const modCount = plan.items.filter(i => i.difficulty === 'moderate').length
  const hardCount = plan.items.filter(i => i.difficulty === 'hard').length

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  let xPos = 14
  if (easyCount) {
    doc.setTextColor(...GREEN)
    doc.text(`${easyCount} Quick Win${easyCount > 1 ? 's' : ''}`, xPos, y)
    xPos += doc.getTextWidth(`${easyCount} Quick Win${easyCount > 1 ? 's' : ''}`) + 8
  }
  if (modCount) {
    doc.setTextColor(...AMBER)
    doc.text(`${modCount} Moderate`, xPos, y)
    xPos += doc.getTextWidth(`${modCount} Moderate`) + 8
  }
  if (hardCount) {
    doc.setTextColor(...RED)
    doc.text(`${hardCount} Significant`, xPos, y)
  }
  y += 8

  // Items table
  const tableData = plan.items.map((item, idx) => [
    String(idx + 1),
    item.obj_id,
    item.title,
    DIFFICULTY_LABELS[item.difficulty] || item.difficulty,
    item.effort_hours,
    `${item.current_score} → ${item.target_score}`,
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'ID', 'OBJECTIVE', 'DIFFICULTY', 'EFFORT', 'SCORE']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, right: 3, bottom: 2.5, left: 3 },
      textColor: INK,
      lineColor: [226, 232, 240],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: VIOLET,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: { fillColor: [250, 251, 252] },
    margin: { left: 14, right: 14 },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 3) {
        const diff = plan.items[data.row.index]?.difficulty
        if (diff && DIFFICULTY_COLORS[diff]) {
          data.cell.styles.textColor = DIFFICULTY_COLORS[diff]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = ((doc as any).lastAutoTable?.finalY as number ?? y + 60) + 10

  // Detailed breakdown
  for (const item of plan.items) {
    const itemHeight = getItemHeight(doc, item)
    if (y + itemHeight > 270) {
      doc.addPage()
      y = 20
    }

    drawItemDetail(doc, item, y)
    y += itemHeight + 8
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text('IMPROVEMENT ACTION PLAN', 14, 290)
    doc.text(`${i}`, 196, 290, { align: 'right' })
  }

  doc.save(`Improvement-Plan-${courseId}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

function parseTextToItems(text: string): string[] {
  const lines = text.split(/\n|(?<=\.)\s*(?=\d+[.)]\s)/).filter(l => l.trim())
  const hasList = lines.length > 1 && lines.some(l => /^\d+[.)]\s|^[-•*]\s/.test(l.trim()))
  if (!hasList) return [text]
  return lines.map(l => l.replace(/^\d+[.)]\s*|^[-•*]\s*/, '').trim()).filter(Boolean)
}

function drawItemDetail(doc: jsPDF, item: ImprovementPlanItem, startY: number): void {
  let y = startY
  const color = DIFFICULTY_COLORS[item.difficulty] || GRAY

  // Left color bar
  doc.setFillColor(...color)
  doc.rect(14, y, 1.5, getItemHeight(doc, item) - 2, 'F')

  // Title line
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...INK)
  doc.text(`${item.obj_id} — ${item.title}`, 18, y + 4)

  // Badges
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...color)
  const label = DIFFICULTY_LABELS[item.difficulty] || item.difficulty
  doc.text(`${label}  |  ${item.effort_hours}  |  Score: ${item.current_score} → ${item.target_score}`, 18, y + 9)

  y += 14

  // What to do
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...VIOLET)
  doc.text('WHAT TO DO', 18, y)
  y += 4
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  const whatItems = parseTextToItems(item.what_to_do)
  if (whatItems.length === 1) {
    const whatLines = doc.splitTextToSize(whatItems[0], 170)
    doc.text(whatLines, 18, y)
    y += whatLines.length * 3.8 + 3
  } else {
    for (const wi of whatItems) {
      const wiLines = doc.splitTextToSize(`• ${wi}`, 166)
      doc.text(wiLines, 20, y)
      y += wiLines.length * 3.8 + 1.5
    }
    y += 1.5
  }

  // Why it matters
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('WHY IT MATTERS', 18, y)
  y += 4
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  const whyItems = parseTextToItems(item.why_it_matters)
  if (whyItems.length === 1) {
    const whyLines = doc.splitTextToSize(whyItems[0], 170)
    doc.text(whyLines, 18, y)
    y += whyLines.length * 3.5 + 3
  } else {
    for (const wi of whyItems) {
      const wiLines = doc.splitTextToSize(`• ${wi}`, 166)
      doc.text(wiLines, 20, y)
      y += wiLines.length * 3.5 + 1.5
    }
    y += 1.5
  }

  // Quick wins
  if (item.quick_wins.length > 0) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...VIOLET)
    doc.text('FIRST STEPS', 18, y)
    y += 4
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK)
    for (const win of item.quick_wins) {
      const winLines = doc.splitTextToSize(`• ${win}`, 166)
      doc.text(winLines, 20, y)
      y += winLines.length * 3.5 + 1.5
    }
  }

  // Broken links (E20 only)
  if (item.broken_links && item.broken_links.length > 0) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...RED)
    doc.text('BROKEN LINKS (at time of scan)', 18, y)
    y += 4
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    for (const url of item.broken_links) {
      const urlLines = doc.splitTextToSize(`• ${url}`, 166)
      doc.text(urlLines, 20, y)
      y += urlLines.length * 3.5 + 1.5
    }
  }
}

function getItemHeight(doc: jsPDF, item: ImprovementPlanItem): number {
  let h = 14

  // What to do
  h += 4
  const whatItems = parseTextToItems(item.what_to_do)
  if (whatItems.length === 1) {
    const whatLines = doc.splitTextToSize(whatItems[0], 170)
    h += whatLines.length * 3.8 + 3
  } else {
    for (const wi of whatItems) {
      const wiLines = doc.splitTextToSize(`• ${wi}`, 166)
      h += wiLines.length * 3.8 + 1.5
    }
    h += 1.5
  }

  // Why it matters
  h += 4
  const whyItems = parseTextToItems(item.why_it_matters)
  if (whyItems.length === 1) {
    const whyLines = doc.splitTextToSize(whyItems[0], 170)
    h += whyLines.length * 3.5 + 3
  } else {
    for (const wi of whyItems) {
      const wiLines = doc.splitTextToSize(`• ${wi}`, 166)
      h += wiLines.length * 3.5 + 1.5
    }
    h += 1.5
  }

  if (item.quick_wins.length > 0) {
    h += 4
    for (const win of item.quick_wins) {
      const winLines = doc.splitTextToSize(`• ${win}`, 166)
      h += winLines.length * 3.5 + 1.5
    }
  }
  if (item.broken_links && item.broken_links.length > 0) {
    h += 4
    for (const url of item.broken_links) {
      const urlLines = doc.splitTextToSize(`• ${url}`, 166)
      h += urlLines.length * 3.5 + 1.5
    }
  }
  return h
}
