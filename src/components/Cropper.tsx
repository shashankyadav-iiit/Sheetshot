"use client";

import { useCallback, useRef, useState } from "react";
import { clampCropRect, type CropRect } from "@/lib/crop";

type CropperProps = {
  src: string;
  initialCrop: CropRect | null;
  onConfirm: (crop: CropRect) => void;
  onSkip: () => void;
};

export function Cropper({ src, initialCrop, onConfirm, onSkip }: CropperProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(initialCrop);

  const toNorm = useCallback((clientX: number, clientY: number) => {
    const img = imgRef.current;
    if (!img) return { x: 0, y: 0 };
    const r = img.getBoundingClientRect();
    const x = r.width <= 0 ? 0 : (clientX - r.left) / r.width;
    const y = r.height <= 0 ? 0 : (clientY - r.top) / r.height;
    return {
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y)),
    };
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const origin = toNorm(e.clientX, e.clientY);
    dragOrigin.current = origin;
    setCrop({ x: origin.x, y: origin.y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (!origin) return;
    const now = toNorm(e.clientX, e.clientY);
    setCrop(clampCropRect({ x: origin.x, y: origin.y, w: now.x - origin.x, h: now.y - origin.y }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragOrigin.current) return;
    dragOrigin.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setCrop((current) => (current ? clampCropRect(current) : current));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="border-b border-line px-4 py-3 sm:px-5">
        <h2 className="font-display text-2xl text-ink">Crop to the table</h2>
        <p className="mt-1 text-sm text-muted">
          Drag a rectangle around the grid. Skip if the screenshot is already tight — we remember
          the last crop on this browser.
        </p>
      </div>
      <div className="bg-paper p-4 sm:p-5">
        <div
          className="relative mx-auto w-fit max-w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-line"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Screenshot to crop"
            draggable={false}
            className="block max-h-[70vh] w-auto max-w-full bg-surface"
          />
          {crop && crop.w > 0 && crop.h > 0 && (
            <div
              className="pointer-events-none absolute border-2 border-accent"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
                boxShadow: "0 0 0 9999px rgba(23, 20, 17, 0.45)",
              }}
            />
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
        <button
          type="button"
          disabled={!crop || crop.w <= 0 || crop.h <= 0}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => {
            if (!crop) return;
            onConfirm(clampCropRect(crop));
          }}
        >
          Read this crop
        </button>
        <button
          type="button"
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-ink/20"
          onClick={onSkip}
        >
          Skip — use whole image
        </button>
      </div>
    </div>
  );
}
