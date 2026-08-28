/** Tokens that are digits, grouping commas, and optional decimals. */
export function looksNumericToken(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return /^[+-]?[\d,]+(\.\d+)?$/.test(t) || /^[.,]$/.test(t);
}

/**
 * Whether two neighboring OCR tokens should be concatenated without a space.
 * Covers split Indian grouping such as 1 + ,00 + ,000 → 1,00,000.
 */
export function shouldGlueTokens(
  left: string,
  right: string,
  gapPx: number,
  emPx: number,
): boolean {
  const a = left.trim();
  const b = right.trim();
  if (!a || !b) return false;

  if (/[,$]$/.test(a) || /^[,.]/.test(b)) return true;

  const close = gapPx <= Math.max(3, emPx * 0.55);
  if (looksNumericToken(a) && looksNumericToken(b) && gapPx <= emPx * 1.05) {
    return true;
  }

  // OCR often splits a word with almost no gap and no space intended.
  if (close && /[A-Za-z0-9]$/.test(a) && /^[A-Za-z0-9]/.test(b)) {
    // still prefer a space between letters unless the gap is tiny
    return gapPx <= emPx * 0.22;
  }

  return close && !/[A-Za-z]/.test(a) && !/[A-Za-z]/.test(b);
}

export function joinTokens(left: string, right: string, glue: boolean): string {
  if (!left) return right;
  if (!right) return left;
  return glue ? `${left}${right}` : `${left} ${right}`;
}
