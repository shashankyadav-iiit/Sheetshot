let pending: Blob | null = null;

export function setPendingImage(blob: Blob) {
  pending = blob;
}

export function takePendingImage(): Blob | null {
  const blob = pending;
  pending = null;
  return blob;
}
