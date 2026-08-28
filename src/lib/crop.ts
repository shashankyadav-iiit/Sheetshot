export type CropRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const CROP_STORAGE_KEY = "sheetshot_last_crop";
export const MIN_CROP = 0.04;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Normalize a drag rectangle (including inverted drags) into 0–1 image space. */
export function clampCropRect(rect: CropRect): CropRect {
  let { x, y, w, h } = rect;
  if (w < 0) {
    x += w;
    w = -w;
  }
  if (h < 0) {
    y += h;
    h = -h;
  }
  x = clamp(x, 0, 1);
  y = clamp(y, 0, 1);
  w = clamp(w, 0, 1 - x);
  h = clamp(h, 0, 1 - y);
  if (w < MIN_CROP) w = Math.min(MIN_CROP, 1 - x);
  if (h < MIN_CROP) h = Math.min(MIN_CROP, 1 - y);
  return { x, y, w, h };
}

/** Grow a crop slightly so glyphs on the edge are not clipped. */
export function inflateCrop(rect: CropRect, pad = 0.015): CropRect {
  return clampCropRect({
    x: rect.x - pad,
    y: rect.y - pad,
    w: rect.w + pad * 2,
    h: rect.h + pad * 2,
  });
}

export function loadRememberedCrop(): CropRect | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(CROP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CropRect>;
    if (
      typeof parsed.x !== "number" ||
      typeof parsed.y !== "number" ||
      typeof parsed.w !== "number" ||
      typeof parsed.h !== "number"
    ) {
      return null;
    }
    return clampCropRect({ x: parsed.x, y: parsed.y, w: parsed.w, h: parsed.h });
  } catch {
    return null;
  }
}

export function saveRememberedCrop(rect: CropRect): void {
  if (!canUseStorage()) return;
  localStorage.setItem(CROP_STORAGE_KEY, JSON.stringify(clampCropRect(rect)));
}

async function blobToBitmap(source: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(source);
  }
}

export async function cropImageBlob(source: Blob, crop: CropRect): Promise<Blob> {
  const bitmap = await blobToBitmap(source);
  const rect = inflateCrop(clampCropRect(crop));
  const sx = Math.max(0, Math.floor(rect.x * bitmap.width));
  const sy = Math.max(0, Math.floor(rect.y * bitmap.height));
  const sw = Math.max(1, Math.min(bitmap.width - sx, Math.round(rect.w * bitmap.width)));
  const sh = Math.max(1, Math.min(bitmap.height - sy, Math.round(rect.h * bitmap.height)));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("Could not crop this image.");
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), "image/png");
  });
  if (!blob) throw new Error("Could not crop this image.");
  return blob;
}
