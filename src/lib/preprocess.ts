const MAX_SIDE = 1800;

export type PreparedImage = {
  canvas: HTMLCanvasElement;
  previewUrl: string;
  width: number;
  height: number;
  inverted: boolean;
  skewDegrees: number;
  rules: RuleLines;
};

export type PixelImage = { data: Uint8ClampedArray; width: number; height: number };

async function blobToBitmap(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(source);
  }
}

function grayscaleStats(data: Uint8ClampedArray): { mean: number; p2: number; p98: number } {
  const hist = new Array<number>(256).fill(0);
  let sum = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const y = Math.round(0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!);
    hist[y]! += 1;
    sum += y;
  }
  const mean = sum / Math.max(1, pixels);
  const cutLow = pixels * 0.02;
  const cutHigh = pixels * 0.98;
  let acc = 0;
  let p2 = 0;
  let p98 = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v]!;
    if (acc >= cutLow && p2 === 0) p2 = v;
    if (acc >= cutHigh) {
      p98 = v;
      break;
    }
  }
  if (p98 <= p2) p98 = Math.min(255, p2 + 1);
  return { mean, p2, p98 };
}

export type RuleLines = {
  /** y centers of horizontal table rules (canvas px), top to bottom. */
  rows: number[];
  /** x centers of vertical table rules (canvas px), left to right. */
  cols: number[];
};

/** Anything darker than this counts as ink when looking for rule lines (catches light-gray gridlines). */
const RULE_INK = 235;

/**
 * Mark pixels that belong to long, thin straight runs: table rules.
 *
 * The old detector wiped any pixel row whose dark-pixel share passed 42% across the
 * whole width. Bold header text in a tight crop passes that bar, so the middle of the
 * letters was erased (the white horizontal bar users saw, "type" → "iype", header
 * cells dropped). A real rule is one long unbroken run that is only a few px thick;
 * text is many short runs. Only those run pixels are cleared, never the full row.
 */
function markRuns(
  ink: Uint8Array,
  width: number,
  height: number,
  horizontal: boolean,
): Uint8Array {
  const along = horizontal ? width : height;
  const across = horizontal ? height : width;
  const minRun = Math.max(40, Math.round(along * 0.3));
  const maxThick = Math.max(6, Math.ceil(Math.min(width, height) * 0.006));
  const idx = horizontal ? (a: number, c: number) => c * width + a : (a: number, c: number) => a * width + c;

  const run = new Uint8Array(width * height);
  for (let c = 0; c < across; c++) {
    let a = 0;
    while (a < along) {
      if (!ink[idx(a, c)]) {
        a++;
        continue;
      }
      let end = a;
      while (end < along && ink[idx(end, c)]) end++;
      if (end - a >= minRun) for (let k = a; k < end; k++) run[idx(k, c)] = 1;
      a = end;
    }
  }

  // Thickness filter: a band of runs thicker than maxThick is a filled area
  // (header shading, zebra stripe), not a rule. Leave it alone.
  const line = new Uint8Array(width * height);
  for (let a = 0; a < along; a++) {
    let c = 0;
    while (c < across) {
      if (!run[idx(a, c)]) {
        c++;
        continue;
      }
      let end = c;
      while (end < across && run[idx(a, end)]) end++;
      if (end - c <= maxThick) for (let k = c; k < end; k++) line[idx(a, k)] = 1;
      c = end;
    }
  }
  return line;
}

function linePositions(line: Uint8Array, width: number, height: number, horizontal: boolean): number[] {
  const across = horizontal ? height : width;
  const along = horizontal ? width : height;
  const counts = new Array<number>(across).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (line[y * width + x]) counts[horizontal ? y : x]! += 1;
    }
  }
  const longest = Math.max(0, ...counts);
  if (longest < Math.max(40, along * 0.3)) return [];
  const keep = counts.map((n) => n >= longest * 0.5);
  const out: number[] = [];
  let i = 0;
  while (i < across) {
    if (!keep[i]) {
      i++;
      continue;
    }
    let end = i;
    while (end < across && keep[end]) end++;
    out.push((i + end - 1) / 2);
    i = end;
  }
  return out;
}

export function removeRuleLines(image: PixelImage, gray?: Uint8Array): RuleLines {
  const { data, width, height } = image;
  const ink = new Uint8Array(width * height);
  for (let p = 0, i = 0; p < ink.length; p++, i += 4) {
    ink[p] = (gray ? gray[p]! : data[i]!) < RULE_INK ? 1 : 0;
  }
  const hLine = markRuns(ink, width, height, true);
  const vLine = markRuns(ink, width, height, false);

  const clear = (p: number) => {
    const i = p * 4;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!hLine[p] && !vLine[p]) continue;
      clear(p);
      // Soft anti-aliased edge next to the rule; dark text touching it is kept.
      const neighbors = hLine[p]
        ? [y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]
        : [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1];
      for (const q of neighbors) {
        if (q >= 0 && !hLine[q] && !vLine[q] && data[q * 4]! >= 90) clear(q);
      }
    }
  }

  const rows = linePositions(hLine, width, height, true);
  const cols = linePositions(vLine, width, height, false);
  if (gray) clearCornerMarkers(image, gray, rows, cols);
  return { rows, cols };
}

/**
 * Spreadsheet apps draw a small colored triangle in the top-left corner of some
 * cells (Excel's "number stored as text" flag). It touches the first digit and
 * OCR reads 439 as 239 or 124 as M24. Clear mid-gray (colored, not black text)
 * pixels in a small box just inside each ruled cell's top-left corner.
 */
function clearCornerMarkers(image: PixelImage, gray: Uint8Array, rows: number[], cols: number[]) {
  if (rows.length < 2 || cols.length < 2) return;
  const gaps = rows.slice(1).map((y, i) => y - rows[i]!).sort((a, b) => a - b);
  const pitch = gaps[Math.floor(gaps.length / 2)]!;
  const box = Math.max(6, Math.min(24, Math.round(pitch * 0.42)));
  const { data, width, height } = image;
  for (const ry of rows) {
    for (const cx of cols) {
      const y0 = Math.ceil(ry);
      const x0 = Math.ceil(cx);
      for (let y = y0; y < Math.min(height, y0 + box); y++) {
        for (let x = x0; x < Math.min(width, x0 + box); x++) {
          const p = y * width + x;
          const g = gray[p]!;
          if (g >= 45 && g <= 205) {
            data[p * 4] = 255;
            data[p * 4 + 1] = 255;
            data[p * 4 + 2] = 255;
          }
        }
      }
    }
  }
}

/**
 * Contrast-stretch to grayscale, invert dark-mode shots, and snap near-white/near-black.
 * Returns the stretched gray *before* the snap: faint gridlines (luminance ~210–235)
 * are snapped to white, so rule detection has to look at this copy instead.
 */
function stretchAndMaybeInvert(image: PixelImage): { invert: boolean; gray: Uint8Array } {
  const { data } = image;
  const { mean, p2, p98 } = grayscaleStats(data);
  const invert = mean < 108;
  const range = Math.max(1, p98 - p2);
  const gray = new Uint8Array(data.length / 4);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let y = 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
    y = ((y - p2) / range) * 255;
    y = Math.max(0, Math.min(255, y));
    if (invert) y = 255 - y;
    gray[p] = Math.round(y);
    const v = y > 210 ? 255 : y < 28 ? 0 : y;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  return { invert, gray };
}

/** Pure pixel pass (no DOM): contrast stretch, optional invert, rule-line removal. */
export function preprocessPixels(image: PixelImage): { inverted: boolean; rules: RuleLines } {
  const { invert, gray } = stretchAndMaybeInvert(image);
  const rules = removeRuleLines(image, gray);
  return { inverted: invert, rules };
}

function rowProjectionVariance(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const rows = new Float64Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      sum += data[i]! < 128 ? 1 : 0;
    }
    rows[y] = sum;
  }
  const mean = rows.reduce((a, b) => a + b, 0) / height;
  let varSum = 0;
  for (const v of rows) varSum += (v - mean) ** 2;
  return varSum / height;
}

function estimateSkew(source: HTMLCanvasElement): number {
  const targetW = 360;
  const scale = targetW / source.width;
  const w = Math.max(32, Math.round(source.width * scale));
  const h = Math.max(32, Math.round(source.height * scale));
  const probe = document.createElement("canvas");
  probe.width = w;
  probe.height = h;
  const ctx = probe.getContext("2d");
  if (!ctx) return 0;

  let bestAngle = 0;
  let bestVar = -1;
  for (let angle = -6; angle <= 6; angle += 0.5) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(source, -w / 2, -h / 2, w, h);
    ctx.restore();
    const v = rowProjectionVariance(probe);
    if (v > bestVar) {
      bestVar = v;
      bestAngle = angle;
    }
  }
  return Math.abs(bestAngle) < 0.4 ? 0 : bestAngle;
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const rad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const w = Math.round(source.width * cos + source.height * sin);
  const h = Math.round(source.width * sin + source.height * cos);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

export async function prepareImage(source: Blob): Promise<PreparedImage> {
  const bitmap = await blobToBitmap(source);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read this image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const imageData = ctx.getImageData(0, 0, width, height);
  const { inverted, rules: rawRules } = preprocessPixels(imageData);
  ctx.putImageData(imageData, 0, 0);

  const skewDegrees = estimateSkew(canvas);
  const finalCanvas = skewDegrees ? rotateCanvas(canvas, -skewDegrees) : canvas;

  return {
    canvas: finalCanvas,
    // Rule positions are in pre-rotation coordinates; drop them if we deskewed.
    rules: skewDegrees ? { rows: [], cols: [] } : rawRules,
    previewUrl: finalCanvas.toDataURL("image/jpeg", 0.86),
    width: finalCanvas.width,
    height: finalCanvas.height,
    inverted,
    skewDegrees,
  };
}
