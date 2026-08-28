"use client";

import { useEffect, useRef } from "react";
import type { BBox } from "@/lib/grid";

type CellZoomProps = {
  src: string;
  bbox: BBox;
  label: string;
};

export function CellZoom({ src, bbox, label }: CellZoomProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const padX = Math.max(10, (bbox.x1 - bbox.x0) * 0.35);
      const padY = Math.max(8, (bbox.y1 - bbox.y0) * 0.45);
      const sx = Math.max(0, bbox.x0 - padX);
      const sy = Math.max(0, bbox.y0 - padY);
      const sw = Math.max(1, Math.min(img.width - sx, bbox.x1 - bbox.x0 + padX * 2));
      const sh = Math.max(1, Math.min(img.height - sy, bbox.y1 - bbox.y0 + padY * 2));
      const scale = Math.min(4, 320 / sw, 112 / sh);
      const dw = Math.max(1, Math.round(sw * scale));
      const dh = Math.max(1, Math.round(sh * scale));
      canvas.width = dw;
      canvas.height = dh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      ctx.strokeStyle = "#c2410c";
      ctx.lineWidth = Math.max(1, scale * 0.6);
      ctx.strokeRect(
        (bbox.x0 - sx) * scale,
        (bbox.y0 - sy) * scale,
        Math.max(1, (bbox.x1 - bbox.x0) * scale),
        Math.max(1, (bbox.y1 - bbox.y0) * scale),
      );
    };
    img.src = src;
  }, [src, bbox.x0, bbox.y0, bbox.x1, bbox.y1]);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <canvas
        ref={canvasRef}
        className="max-h-28 max-w-full rounded-md border border-line bg-paper"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
