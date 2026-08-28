const MAX_SIDE = 1800;

export type PreparedImage = {
  canvas: HTMLCanvasElement;
  previewUrl: string;
  width: number;
  height: number;
  inverted: boolean;
  skewDegrees: number;
};

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

function removeRuleLines(image: ImageData) {
  const { data, width, height } = image;
  const luminance = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
  };
  const rowDark = new Array<number>(height).fill(0);
  const colDark = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (luminance(x, y) < 90) {
        rowDark[y]! += 1;
        colDark[x]! += 1;
      }
    }
  }
  const lineRows = rowDark.map((d) => d / width > 0.42);
  const lineCols = colDark.map((d) => d / height > 0.42);
  for (let y = 0; y < height; y++) {
    const hitRow = lineRows[y] || lineRows[y - 1] || lineRows[y + 1];
    for (let x = 0; x < width; x++) {
      const hitCol = lineCols[x] || lineCols[x - 1] || lineCols[x + 1];
      if (hitRow || hitCol) {
        const i = (y * width + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
    }
  }
}

function stretchAndMaybeInvert(image: ImageData): boolean {
  const { data } = image;
  const { mean, p2, p98 } = grayscaleStats(data);
  const invert = mean < 108;
  const range = Math.max(1, p98 - p2);

  for (let i = 0; i < data.length; i += 4) {
    let y = 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
    y = ((y - p2) / range) * 255;
    y = Math.max(0, Math.min(255, y));
    if (invert) y = 255 - y;
    const v = y > 210 ? 255 : y < 28 ? 0 : y;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  return invert;
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
  const inverted = stretchAndMaybeInvert(imageData);
  removeRuleLines(imageData);
  ctx.putImageData(imageData, 0, 0);

  const skewDegrees = estimateSkew(canvas);
  const finalCanvas = skewDegrees ? rotateCanvas(canvas, -skewDegrees) : canvas;

  return {
    canvas: finalCanvas,
    previewUrl: finalCanvas.toDataURL("image/jpeg", 0.86),
    width: finalCanvas.width,
    height: finalCanvas.height,
    inverted,
    skewDegrees,
  };
}
