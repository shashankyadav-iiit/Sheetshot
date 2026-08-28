import { joinTokens, looksNumericToken, shouldGlueTokens } from "./numbers";

export type OcrWord = {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
};

export type GridResult = {
  cells: string[][];
  fillRatio: number;
  medianConfidence: number;
  sparse: boolean;
  empty: boolean;
  singleCell: boolean;
  warning: string | null;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function yCenter(w: OcrWord): number {
  return (w.bbox.y0 + w.bbox.y1) / 2;
}

function xCenter(w: OcrWord): number {
  return (w.bbox.x0 + w.bbox.x1) / 2;
}

function height(w: OcrWord): number {
  return Math.max(1, w.bbox.y1 - w.bbox.y0);
}

function width(w: OcrWord): number {
  return Math.max(1, w.bbox.x1 - w.bbox.x0);
}

function isRuleToken(w: OcrWord): boolean {
  const t = w.text.trim();
  if (!t) return true;
  if (/^[|Iil!]+$/.test(t) && width(w) < height(w) * 0.5) return true;
  if (/^[-_=─—]+$/.test(t) && width(w) > height(w) * 3) return true;
  return false;
}

function clusterRows(words: OcrWord[], rowThreshold: number): OcrWord[][] {
  const sorted = [...words].sort((a, b) => yCenter(a) - yCenter(b) || a.bbox.x0 - b.bbox.x0);
  const rows: OcrWord[][] = [];
  for (const word of sorted) {
    const last = rows[rows.length - 1];
    if (!last) {
      rows.push([word]);
      continue;
    }
    const lastY = mean(last.map(yCenter));
    if (Math.abs(yCenter(word) - lastY) <= rowThreshold) last.push(word);
    else rows.push([word]);
  }
  return rows;
}

function mergeRowWords(row: OcrWord[], em: number): OcrWord[] {
  const sorted = [...row].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  const merged: OcrWord[] = [];
  const cellGap = Math.max(em * 0.55, 10);

  for (const word of sorted) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...word, bbox: { ...word.bbox } });
      continue;
    }
    const gap = word.bbox.x0 - prev.bbox.x1;
    const glue = shouldGlueTokens(prev.text, word.text, gap, em);
    const sameCell = gap <= cellGap || glue || (looksNumericToken(prev.text) && looksNumericToken(word.text) && gap <= em * 1.4);

    if (sameCell) {
      prev.text = joinTokens(prev.text, word.text, glue || gap <= em * 0.28);
      prev.bbox.x1 = Math.max(prev.bbox.x1, word.bbox.x1);
      prev.bbox.y0 = Math.min(prev.bbox.y0, word.bbox.y0);
      prev.bbox.y1 = Math.max(prev.bbox.y1, word.bbox.y1);
      prev.confidence = Math.min(prev.confidence, word.confidence);
    } else {
      merged.push({ ...word, bbox: { ...word.bbox } });
    }
  }
  return merged;
}

function columnAnchors(rows: OcrWord[][], em: number): number[] {
  const fullest = rows.reduce((best, row) => (row.length > best.length ? row : best), rows[0] ?? []);
  if (fullest.length >= 2) {
    return fullest.map(xCenter);
  }

  const centers = rows.flat().map(xCenter).sort((a, b) => a - b);
  if (centers.length === 0) return [0];

  const threshold = Math.max(em * 1.8, 28);
  const groups: number[][] = [];
  for (const x of centers) {
    const g = groups[groups.length - 1];
    if (!g || x - g[g.length - 1]! > threshold) groups.push([x]);
    else g.push(x);
  }
  return groups.map((g) => mean(g));
}

function assignColumns(rows: OcrWord[][], anchors: number[]): string[][] {
  const nCols = Math.max(1, anchors.length);
  const bounds: number[] = [];
  for (let i = 0; i < nCols; i++) {
    const left = i === 0 ? -Infinity : (anchors[i - 1]! + anchors[i]!) / 2;
    bounds.push(left);
  }

  const grid: string[][] = rows.map(() => Array.from({ length: nCols }, () => ""));

  rows.forEach((row, r) => {
    for (const word of row) {
      const x = xCenter(word);
      let col = 0;
      for (let i = 0; i < nCols; i++) {
        if (x >= bounds[i]!) col = i;
      }
      const existing = grid[r]![col]!;
      grid[r]![col] = existing
        ? joinTokens(existing, word.text, shouldGlueTokens(existing, word.text, 4, 12))
        : word.text;
    }
  });

  return grid;
}

function dropEmptyEdges(grid: string[][]): string[][] {
  if (grid.length === 0) return grid;
  const nCols = grid[0]!.length;

  const colUsed = Array.from({ length: nCols }, (_, c) => grid.some((row) => row[c]?.trim()));
  const rowUsed = grid.map((row) => row.some((cell) => cell.trim()));

  const keepCols = colUsed.map((u, i) => (u ? i : -1)).filter((i) => i >= 0);
  if (keepCols.length === 0 || !rowUsed.some(Boolean)) return [];

  return grid.filter((_, r) => rowUsed[r]).map((row) => keepCols.map((c) => row[c]!));
}

export function reconstructGrid(words: OcrWord[]): GridResult {
  const cleaned = words
    .map((w) => ({
      ...w,
      text: w.text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim(),
    }))
    .filter((w) => w.text.length > 0 && w.confidence >= 20 && !isRuleToken(w));

  if (cleaned.length === 0) {
    return {
      cells: [],
      fillRatio: 0,
      medianConfidence: 0,
      sparse: false,
      empty: true,
      singleCell: false,
      warning: "Couldn't find a table in this image.",
    };
  }

  const em = median(cleaned.map(height));
  const rowThreshold = Math.max(em * 0.62, 12);
  const rows = clusterRows(cleaned, rowThreshold).map((row) => mergeRowWords(row, em));
  const anchors = columnAnchors(rows, em);
  const raw = assignColumns(rows, anchors);
  const cells = dropEmptyEdges(raw);

  const total = cells.reduce((n, row) => n + row.length, 0);
  const filled = cells.reduce(
    (n, row) => n + row.filter((c) => c.trim().length > 0).length,
    0,
  );
  const fillRatio = total === 0 ? 0 : filled / total;
  const medianConfidence = median(cleaned.map((w) => w.confidence));
  const empty = filled === 0;
  const singleCell = cells.length === 1 && (cells[0]?.length ?? 0) === 1;
  const sparse = !empty && total >= 6 && fillRatio < 0.45;

  let warning: string | null = null;
  if (empty) warning = "Couldn't find a table in this image.";
  else if (singleCell) {
    warning = "This doesn't look like a table — we only recovered one cell. Try a tighter crop.";
  } else if (sparse) {
    warning = "This grid looks sparse — some cells may be missing. Fix anything that's off before you export.";
  } else if (medianConfidence < 62) {
    warning = "OCR wasn't sure about some cells. A closer, flatter crop usually helps.";
  }

  return {
    cells: cells.length ? cells : [[cleaned.map((w) => w.text).join(" ")]],
    fillRatio,
    medianConfidence,
    sparse,
    empty,
    singleCell,
    warning,
  };
}

export function emptyGrid(rows = 4, cols = 4): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => ""));
}

export function addRow(grid: string[][], at?: number): string[][] {
  const cols = grid[0]?.length ?? 1;
  const row = Array.from({ length: cols }, () => "");
  const next = grid.map((r) => [...r]);
  const index = at ?? next.length;
  next.splice(index, 0, row);
  return next;
}

export function addColumn(grid: string[][], at?: number): string[][] {
  const index = at ?? (grid[0]?.length ?? 0);
  return grid.map((row) => {
    const next = [...row];
    next.splice(index, 0, "");
    return next;
  });
}

export function deleteRow(grid: string[][], index: number): string[][] {
  if (grid.length <= 1) return grid.map((row) => [...row]);
  return grid.filter((_, i) => i !== index).map((row) => [...row]);
}

export function deleteColumn(grid: string[][], index: number): string[][] {
  const cols = grid[0]?.length ?? 0;
  if (cols <= 1) return grid.map((row) => [...row]);
  return grid.map((row) => row.filter((_, i) => i !== index));
}

export function setCell(grid: string[][], r: number, c: number, value: string): string[][] {
  return grid.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : [...row]));
}
