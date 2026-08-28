import type { OcrWord } from './ocr'

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

interface Cell {
  text: string
  x0: number
  x1: number
}

interface Row {
  cy: number
  count: number
  words: OcrWord[]
}

// Group words into visual rows by clustering their vertical centers.
function groupRows(words: OcrWord[], rowTol: number): OcrWord[][] {
  const rows: Row[] = []
  const byY = [...words].sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2)

  for (const word of byY) {
    const cy = (word.y0 + word.y1) / 2
    let target: Row | undefined
    let best = Infinity
    for (const row of rows) {
      const dist = Math.abs(row.cy - cy)
      if (dist < rowTol && dist < best) {
        best = dist
        target = row
      }
    }
    if (target) {
      target.words.push(word)
      target.count += 1
      target.cy += (cy - target.cy) / target.count
    } else {
      rows.push({ cy, count: 1, words: [word] })
    }
  }

  rows.sort((a, b) => a.cy - b.cy)
  return rows.map((row) => row.words.sort((a, b) => a.x0 - b.x0))
}

// Merge horizontally adjacent words in a row into cells whenever the gap
// between them is small relative to the typical text height.
function rowToCells(rowWords: OcrWord[], gapTol: number): Cell[] {
  const cells: Cell[] = []
  for (const word of rowWords) {
    const last = cells[cells.length - 1]
    if (last && word.x0 - last.x1 <= gapTol) {
      last.text += ' ' + word.text
      last.x1 = Math.max(last.x1, word.x1)
    } else {
      cells.push({ text: word.text, x0: word.x0, x1: word.x1 })
    }
  }
  return cells
}

// Cluster cell left edges from every row into a shared set of column anchors.
function clusterColumns(starts: number[], tol: number): number[] {
  if (starts.length === 0) return []
  const sorted = [...starts].sort((a, b) => a - b)
  const groups: number[][] = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const group = groups[groups.length - 1]
    if (sorted[i] - group[group.length - 1] <= tol) {
      group.push(sorted[i])
    } else {
      groups.push([sorted[i]])
    }
  }
  return groups.map((g) => g.reduce((sum, v) => sum + v, 0) / g.length)
}

function nearestColumn(x: number, anchors: number[]): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < anchors.length; i++) {
    const dist = Math.abs(anchors[i] - x)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

function trimEmpty(grid: string[][]): string[][] {
  let rows = grid.filter((row) => row.some((cell) => cell.trim() !== ''))
  if (rows.length === 0) return []

  const width = Math.max(...rows.map((r) => r.length))
  rows = rows.map((r) => {
    const copy = [...r]
    while (copy.length < width) copy.push('')
    return copy
  })

  const keepCol: boolean[] = []
  for (let c = 0; c < width; c++) {
    keepCol[c] = rows.some((row) => (row[c] ?? '').trim() !== '')
  }
  return rows.map((row) => row.filter((_, c) => keepCol[c]))
}

/**
 * Reconstruct a 2D table from OCR word boxes using simple geometric clustering:
 * words are grouped into rows by vertical position, merged into cells by
 * horizontal proximity, and aligned into columns shared across all rows.
 */
export function wordsToTable(words: OcrWord[]): string[][] {
  if (words.length === 0) return []

  const heights = words.map((w) => w.y1 - w.y0)
  const medHeight = median(heights) || 12
  const rowTol = medHeight * 0.7
  const gapTol = medHeight * 1.1
  const colTol = medHeight * 1.5

  const rows = groupRows(words, rowTol)
  const rowCells = rows.map((rowWords) => rowToCells(rowWords, gapTol))

  const anchors = clusterColumns(
    rowCells.flat().map((cell) => cell.x0),
    colTol,
  )
  if (anchors.length === 0) return []

  const grid: string[][] = rowCells.map((cells) => {
    const line = new Array<string>(anchors.length).fill('')
    for (const cell of cells) {
      const col = nearestColumn(cell.x0, anchors)
      line[col] = line[col] ? `${line[col]} ${cell.text}` : cell.text
    }
    return line
  })

  return trimEmpty(grid)
}
