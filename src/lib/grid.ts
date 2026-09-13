import { assessGrid } from "./cell-quality";
import { joinTokens, looksNumericToken, shouldGlueTokens } from "./numbers";

export type BBox = { x0: number; y0: number; x1: number; y1: number };

export type CellPos = { r: number; c: number };

export type GridMutation = {
  cells: string[][];
  meta: CellMeta[][];
  focus: CellPos;
};

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

export function unionBBox(a: BBox | null, b: BBox | null): BBox | null {
  if (!a) return b ? { ...b } : null;
  if (!b) return { ...a };
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

export function reassessGrid(cells: string[][], meta: CellMeta[][]): CellMeta[][] {
  const confidences = cells.map((row, r) =>
    row.map((text, c) => meta[r]?.[c]?.confidence ?? (text.trim() ? 0 : 100)),
  );
  const bboxes = cells.map((row, r) => row.map((_, c) => meta[r]?.[c]?.bbox ?? null));
  return assessGrid(cells, confidences, bboxes);
}

export function areAdjacent(a: CellPos, b: CellPos): boolean {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function orderCells(a: CellPos, b: CellPos): [CellPos, CellPos] {
  if (a.r === b.r) return a.c <= b.c ? [a, b] : [b, a];
  return a.r <= b.r ? [a, b] : [b, a];
}

function cellInBounds(cells: string[][], pos: CellPos): boolean {
  return cells[pos.r]?.[pos.c] !== undefined;
}

function columnIsEmpty(cells: string[][], col: number): boolean {
  return cells.every((row) => !(row[col] ?? "").trim());
}

function rowIsEmpty(cells: string[][], row: number): boolean {
  return !(cells[row] ?? []).some((cell) => cell.trim());
}

/** Gap / em used by shouldGlueTokens, derived from bboxes when both cells have them. */
export function cellJoinMetrics(
  leftBox: BBox | null,
  rightBox: BBox | null,
  vertical = false,
): { gap: number; em: number } {
  if (leftBox && rightBox) {
    const gap = vertical
      ? Math.max(0, rightBox.y0 - leftBox.y1)
      : Math.max(0, rightBox.x0 - leftBox.x1);
    const em = vertical
      ? Math.max(1, (leftBox.x1 - leftBox.x0 + (rightBox.x1 - rightBox.x0)) / 2)
      : Math.max(1, (leftBox.y1 - leftBox.y0 + (rightBox.y1 - rightBox.y0)) / 2);
    return { gap, em };
  }
  // No pixel gap: treat as tightly neighboring OCR fragments.
  return { gap: 0, em: 12 };
}

export function joinAdjacentCellText(
  left: string,
  right: string,
  leftBox: BBox | null,
  rightBox: BBox | null,
  vertical = false,
): string {
  const { gap, em } = cellJoinMetrics(leftBox, rightBox, vertical);
  return joinTokens(left, right, shouldGlueTokens(left, right, gap, em));
}

export function resolveMergePair(
  cells: string[][],
  focus: CellPos | null,
  other?: CellPos | null,
  suggested?: { a: CellPos; b: CellPos }[],
): [CellPos, CellPos] | null {
  if (!focus || !cellInBounds(cells, focus)) return null;
  if (other && cellInBounds(cells, other)) {
    return areAdjacent(focus, other) ? orderCells(focus, other) : null;
  }
  const hit = suggested?.find(
    (pair) =>
      (pair.a.r === focus.r && pair.a.c === focus.c) ||
      (pair.b.r === focus.r && pair.b.c === focus.c),
  );
  if (hit && canMergeCells(cells, hit.a, hit.b)) return [hit.a, hit.b];
  const right = { r: focus.r, c: focus.c + 1 };
  if (cellInBounds(cells, right)) return [focus, right];
  const down = { r: focus.r + 1, c: focus.c };
  if (cellInBounds(cells, down)) return [focus, down];
  return null;
}

export function canMergeCells(cells: string[][], a: CellPos, b: CellPos): boolean {
  if (!areAdjacent(a, b) || !cellInBounds(cells, a) || !cellInBounds(cells, b)) return false;
  return Boolean(cells[a.r]![a.c]!.trim() || cells[b.r]![b.c]!.trim());
}

function splitBBox(bbox: BBox | null, vertical: boolean): [BBox | null, BBox | null] {
  if (!bbox) return [null, null];
  if (vertical) {
    const mid = (bbox.y0 + bbox.y1) / 2;
    return [
      { ...bbox, y1: mid },
      { ...bbox, y0: mid },
    ];
  }
  const mid = (bbox.x0 + bbox.x1) / 2;
  return [
    { ...bbox, x1: mid },
    { ...bbox, x0: mid },
  ];
}

/** Split at caret, or on the first whitespace run when caret is not inside the text. */
export function splitCellText(text: string, caret?: number | null): [string, string] | null {
  if (caret != null && caret > 0 && caret < text.length) {
    const left = text.slice(0, caret).trimEnd();
    const right = text.slice(caret).trimStart();
    if (!left || !right) return null;
    return [left, right];
  }
  const match = /^(\S+)\s+(\S[\s\S]*)$/.exec(text.trim());
  if (!match) return null;
  return [match[1]!, match[2]!.trim()];
}

export function canSplitCell(text: string, caret?: number | null): boolean {
  return splitCellText(text, caret) !== null;
}

export function mergeCells(
  cells: string[][],
  meta: CellMeta[][],
  a: CellPos,
  b: CellPos,
): GridMutation | null {
  if (!canMergeCells(cells, a, b)) return null;

  const [keep, drop] = orderCells(a, b);
  const vertical = keep.c === drop.c;
  const keepMeta = meta[keep.r]?.[keep.c] ?? emptyCellMeta();
  const dropMeta = meta[drop.r]?.[drop.c] ?? emptyCellMeta();
  const text = joinAdjacentCellText(
    cells[keep.r]![keep.c]!,
    cells[drop.r]![drop.c]!,
    keepMeta.bbox,
    dropMeta.bbox,
    vertical,
  );

  let nextCells = setCell(setCell(cells, keep.r, keep.c, text), drop.r, drop.c, "");
  let nextMeta = meta.map((row, r) =>
    row.map((cell, c) => {
      if (r === keep.r && c === keep.c) {
        return {
          ...cell,
          confidence: Math.min(keepMeta.confidence, dropMeta.confidence),
          bbox: unionBBox(keepMeta.bbox, dropMeta.bbox),
        };
      }
      if (r === drop.r && c === drop.c) return emptyCellMeta();
      return cell;
    }),
  );

  if (!vertical && columnIsEmpty(nextCells, drop.c)) {
    nextCells = deleteColumn(nextCells, drop.c);
    nextMeta = deleteColumnMeta(nextMeta, drop.c);
  } else if (vertical && rowIsEmpty(nextCells, drop.r)) {
    nextCells = deleteRow(nextCells, drop.r);
    nextMeta = deleteRowMeta(nextMeta, drop.r);
  }

  return {
    cells: nextCells,
    meta: reassessGrid(nextCells, nextMeta),
    focus: keep,
  };
}

export function splitCell(
  cells: string[][],
  meta: CellMeta[][],
  pos: CellPos,
  caret?: number | null,
): GridMutation | null {
  if (!cellInBounds(cells, pos)) return null;
  const parts = splitCellText(cells[pos.r]![pos.c]!, caret);
  if (!parts) return null;
  const [left, right] = parts;

  const neighborCol = pos.c + 1;
  const neighborText = cells[pos.r]?.[neighborCol];
  const insert = neighborText === undefined || neighborText.trim().length > 0;

  let nextCells = cells;
  let nextMeta = meta;
  if (insert) {
    nextCells = addColumn(nextCells, neighborCol);
    nextMeta = addColumnMeta(nextMeta, neighborCol);
  }

  const dest = { r: pos.r, c: neighborCol };
  nextCells = setCell(setCell(nextCells, pos.r, pos.c, left), dest.r, dest.c, right);

  const srcMeta = meta[pos.r]?.[pos.c] ?? emptyCellMeta();
  const [leftBox, rightBox] = splitBBox(srcMeta.bbox, false);
  nextMeta = nextMeta.map((row, r) =>
    row.map((cell, c) => {
      if (r === pos.r && c === pos.c) {
        return { ...cell, confidence: srcMeta.confidence, bbox: leftBox };
      }
      if (r === dest.r && c === dest.c) {
        return { ...emptyCellMeta(), confidence: srcMeta.confidence, bbox: rightBox };
      }
      return cell;
    }),
  );

  return {
    cells: nextCells,
    meta: reassessGrid(nextCells, nextMeta),
    focus: pos,
  };
}
