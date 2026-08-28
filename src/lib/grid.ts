import { assessGrid } from "./cell-quality";
import { joinTokens, looksNumericToken, shouldGlueTokens } from "./numbers";

export type BBox = { x0: number; y0: number; x1: number; y1: number };

export type OcrWord = {
  text: string;
  confidence: number;
  bbox: BBox;
};

export type CellMeta = {
  confidence: number;
  bbox: BBox | null;
  shaky: boolean;
  reasons: string[];
};

export type GridResult = {
  cells: string[][];
  meta: CellMeta[][];
  fillRatio: number;
  medianConfidence: number;
  sparse: boolean;
  empty: boolean;
  singleCell: boolean;
  warning: string | null;
};

type AccCell = {
  text: string;
  confidence: number;
  bbox: BBox | null;
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

function unionBBox(a: BBox | null, b: BBox): BBox {
  if (!a) return { ...b };
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
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

function typicalCharWidth(words: OcrWord[]): number {
  const widths = words
    .map((w) => {
      const letters = w.text.replace(/\s/g, "");
      return letters.length >= 2 ? width(w) / letters.length : 0;
    })
    .filter((n) => n > 0);
  return median(widths) || Math.max(8, median(words.map(width)) / 4);
}

function mergeRowWords(row: OcrWord[], em: number, charW: number): OcrWord[] {
  const sorted = [...row].sort((a, b) => a.bbox.x0 - b.bbox.x0);
  const merged: OcrWord[] = [];
  const cellGap = Math.max(em * 1.3, charW * 2.4, 16);

  for (const word of sorted) {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...word, bbox: { ...word.bbox } });
      continue;
    }
    const gap = word.bbox.x0 - prev.bbox.x1;
    const glue = shouldGlueTokens(prev.text, word.text, gap, em);
    const numericGlue =
      looksNumericToken(prev.text) && looksNumericToken(word.text) && gap <= Math.max(em * 1.4, charW * 3);
    const sameCell = gap <= cellGap || glue || numericGlue;

    if (sameCell) {
      prev.text = joinTokens(prev.text, word.text, glue || gap <= Math.max(4, charW * 0.45));
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
  const freq = new Map<number, number>();
  for (const row of rows) freq.set(row.length, (freq.get(row.length) ?? 0) + 1);
  let bestCount = 0;
  let bestFreq = -1;
  for (const [count, n] of freq) {
    if (n > bestFreq || (n === bestFreq && count > bestCount)) {
      bestCount = count;
      bestFreq = n;
    }
  }
  const template = rows.find((row) => row.length === bestCount) ?? rows[0];
  if (template && template.length >= 2) {
    return template.map(xCenter);
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

function emptyAcc(): AccCell {
  return { text: "", confidence: 100, bbox: null };
}

function assignColumns(rows: OcrWord[][], anchors: number[]): AccCell[][] {
  const nCols = Math.max(1, anchors.length);
  const bounds: number[] = [];
  for (let i = 0; i < nCols; i++) {
    const left = i === 0 ? -Infinity : (anchors[i - 1]! + anchors[i]!) / 2;
    bounds.push(left);
  }

  const grid: AccCell[][] = rows.map(() => Array.from({ length: nCols }, () => emptyAcc()));

  rows.forEach((row, r) => {
    for (const word of row) {
      const x = xCenter(word);
      let col = 0;
      for (let i = 0; i < nCols; i++) {
        if (x >= bounds[i]!) col = i;
      }
      const cell = grid[r]![col]!;
      const existing = cell.text;
      cell.text = existing
        ? joinTokens(existing, word.text, shouldGlueTokens(existing, word.text, 4, 12))
        : word.text;
      cell.confidence = existing ? Math.min(cell.confidence, word.confidence) : word.confidence;
      cell.bbox = unionBBox(cell.bbox, word.bbox);
    }
  });

  return grid;
}

function dropEmptyEdges(grid: AccCell[][]): AccCell[][] {
  if (grid.length === 0) return grid;
  const nCols = grid[0]!.length;

  const colUsed = Array.from({ length: nCols }, (_, c) => grid.some((row) => row[c]?.text.trim()));
  const rowUsed = grid.map((row) => row.some((cell) => cell.text.trim()));

  const keepCols = colUsed.map((u, i) => (u ? i : -1)).filter((i) => i >= 0);
  if (keepCols.length === 0 || !rowUsed.some(Boolean)) return [];

  return grid.filter((_, r) => rowUsed[r]).map((row) => keepCols.map((c) => row[c]!));
}

function accToMeta(grid: AccCell[][]): { cells: string[][]; meta: CellMeta[][] } {
  const cells = grid.map((row) => row.map((cell) => cell.text));
  const confidences = grid.map((row) => row.map((cell) => cell.confidence));
  const bboxes = grid.map((row) => row.map((cell) => cell.bbox));
  return { cells, meta: assessGrid(cells, confidences, bboxes) };
}

export function reconstructGrid(words: OcrWord[]): GridResult {
  const cleaned = words
    .map((w) => ({
      ...w,
      text: w.text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim(),
      confidence: Number.isFinite(w.confidence) ? w.confidence : 0,
    }))
    .filter((w) => w.text.length > 0 && w.confidence >= 20 && !isRuleToken(w));

  if (cleaned.length === 0) {
    return {
      cells: [],
      meta: [],
      fillRatio: 0,
      medianConfidence: 0,
      sparse: false,
      empty: true,
      singleCell: false,
      warning: "Couldn't find a table in this image.",
    };
  }

  const em = median(cleaned.map(height));
  const charW = typicalCharWidth(cleaned);
  const rowThreshold = Math.max(em * 0.62, 12);
  const rows = clusterRows(cleaned, rowThreshold).map((row) => mergeRowWords(row, em, charW));
  const anchors = columnAnchors(rows, em);
  const raw = assignColumns(rows, anchors);
  const acc = dropEmptyEdges(raw);
  const { cells, meta } =
    acc.length === 0
      ? accToMeta([
          [
            {
              text: cleaned.map((w) => w.text).join(" "),
              confidence: median(cleaned.map((w) => w.confidence)),
              bbox: cleaned.reduce<BBox | null>((box, w) => unionBBox(box, w.bbox), null),
            },
          ],
        ])
      : accToMeta(acc);

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
  const shakyCount = meta.flat().filter((cell) => cell.shaky).length;

  let warning: string | null = null;
  if (empty) warning = "Couldn't find a table in this image.";
  else if (singleCell) {
    warning = "This doesn't look like a table — we only recovered one cell. Try a tighter crop.";
  } else if (sparse) {
    warning = "This grid looks sparse — some cells may be missing. Fix anything that's off before you export.";
  } else if (medianConfidence < 62) {
    warning = "OCR wasn't sure about some cells. A closer, flatter crop usually helps.";
  } else if (shakyCount > 0) {
    warning = `${shakyCount} cell${shakyCount === 1 ? "" : "s"} look uncertain. Click a highlighted cell to compare it with the image.`;
  }

  return {
    cells: cells.length ? cells : [[cleaned.map((w) => w.text).join(" ")]],
    meta: meta.length ? meta : assessGrid([[cleaned.map((w) => w.text).join(" ")]], [[medianConfidence]], [[null]]),
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

export function emptyCellMeta(): CellMeta {
  return { confidence: 100, bbox: null, shaky: false, reasons: [] };
}

export function metaGridFor(cells: string[][]): CellMeta[][] {
  return cells.map((row) => row.map(() => emptyCellMeta()));
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

export function addRowMeta(meta: CellMeta[][], at?: number): CellMeta[][] {
  const cols = meta[0]?.length ?? 1;
  const row = Array.from({ length: cols }, () => emptyCellMeta());
  const next = meta.map((r) => [...r]);
  next.splice(at ?? next.length, 0, row);
  return next;
}

export function addColumnMeta(meta: CellMeta[][], at?: number): CellMeta[][] {
  const index = at ?? (meta[0]?.length ?? 0);
  return meta.map((row) => {
    const next = [...row];
    next.splice(index, 0, emptyCellMeta());
    return next;
  });
}

export function deleteRowMeta(meta: CellMeta[][], index: number): CellMeta[][] {
  if (meta.length <= 1) return meta.map((row) => [...row]);
  return meta.filter((_, i) => i !== index).map((row) => [...row]);
}

export function deleteColumnMeta(meta: CellMeta[][], index: number): CellMeta[][] {
  const cols = meta[0]?.length ?? 0;
  if (cols <= 1) return meta.map((row) => [...row]);
  return meta.map((row) => row.filter((_, i) => i !== index));
}

export function markCellReviewed(meta: CellMeta[][], r: number, c: number): CellMeta[][] {
  return meta.map((row, i) =>
    i === r
      ? row.map((cell, j) => (j === c ? { ...cell, shaky: false, reasons: [] } : cell))
      : [...row],
  );
}
