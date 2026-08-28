import type { BBox, CellMeta } from "./grid";
import { looksNumericToken } from "./numbers";

export const LOW_CONFIDENCE = 70;

function looksLikeOcrNumber(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (looksNumericToken(t)) return true;
  return /^[+-]?[\d,.\sOolI|]{1,}$/.test(t) && /\d/.test(t);
}

function columnIsNumeric(cells: string[][], col: number): boolean {
  const body = cells.length > 1 ? cells.slice(1) : cells;
  const values = body.map((row) => row[col]?.trim() ?? "").filter(Boolean);
  if (values.length === 0) return false;
  const numeric = values.filter(looksLikeOcrNumber).length;
  return numeric / values.length >= 0.6;
}

function rowFillRatio(row: string[]): number {
  if (row.length === 0) return 0;
  return row.filter((cell) => cell.trim()).length / row.length;
}

function hasSpacesInNumber(text: string): boolean {
  const t = text.trim();
  if (!/\d/.test(t)) return false;
  if (/\d\s+\d/.test(t)) return true;
  return /^[+-]?[\d,.\s]+$/.test(t) && /\s/.test(t);
}

function hasZeroOhConfusion(text: string, numericCol: boolean): boolean {
  const t = text.trim();
  if (!t) return false;
  if (numericCol) {
    if (/[Oo]/.test(t)) return true;
    if (/^[Il|]$/.test(t)) return true;
    if (/\d/.test(t) && /[Il]/.test(t)) return true;
  }
  if (/\d/.test(t) && /[Oo]/.test(t)) return true;
  if (/[A-Za-z]0[A-Za-z]/.test(t)) return true;
  return false;
}

function looksSplitHeaderPair(left: string, right: string): boolean {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return false;
  if (/\d/.test(a) || /\d/.test(b)) return false;
  if (!/^[A-Za-z]+$/.test(a) || !/^[A-Za-z]+$/.test(b)) return false;
  // "Am"+"ount" (second fragment lowercase) or "Q"+"ty". Leave "Qty"+"Rate" alone.
  const camelSplit = /^[A-Z][a-z]*$/.test(a) && /^[a-z]+$/.test(b);
  const tiny = a.length <= 2 && b.length <= 4;
  return camelSplit || tiny;
}

function assessCell(
  text: string,
  confidence: number,
  row: number,
  col: number,
  cells: string[][],
  numericCols: boolean[],
): string[] {
  const reasons: string[] = [];
  const trimmed = text.trim();
  const numericCol = numericCols[col] === true;
  const rowFill = rowFillRatio(cells[row] ?? []);

  if (trimmed && confidence < LOW_CONFIDENCE) {
    reasons.push(`OCR confidence ${Math.round(confidence)}%`);
  }
  if (hasSpacesInNumber(text)) {
    reasons.push("Spaces inside a number");
  }
  if (hasZeroOhConfusion(text, numericCol)) {
    reasons.push("Possible 0/O or 1/l mix-up");
  }
  if (!trimmed && numericCol && rowFill >= 0.6 && (cells[row]?.length ?? 0) >= 3) {
    reasons.push("Possible missing value");
  }
  if (row === 0 && cells.length > 1) {
    const prev = cells[0]?.[col - 1];
    const next = cells[0]?.[col + 1];
    if (
      (prev && looksSplitHeaderPair(prev, text)) ||
      (next && looksSplitHeaderPair(text, next))
    ) {
      reasons.push("Header may be split across cells");
    }
  }

  return reasons;
}

export function assessGrid(
  cells: string[][],
  confidences: number[][],
  bboxes: (BBox | null)[][],
): CellMeta[][] {
  const numericCols = (cells[0] ?? []).map((_, c) => columnIsNumeric(cells, c));
  return cells.map((row, r) =>
    row.map((text, c) => {
      const confidence = confidences[r]?.[c] ?? (text.trim() ? 0 : 100);
      const bbox = bboxes[r]?.[c] ?? null;
      const reasons = assessCell(text, confidence, r, c, cells, numericCols);
      return {
        confidence,
        bbox,
        shaky: reasons.length > 0,
        reasons,
      };
    }),
  );
}
