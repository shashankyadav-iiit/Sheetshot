"use client";

import { useCallback, useRef, useState } from "react";

type DropzoneProps = {
  onFile: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
};

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|tif?f)$/i.test(file.name);
}

export function Dropzone({ onFile, disabled, compact }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = useCallback(
    (file?: File | null) => {
      if (disabled || !file || !isImageFile(file)) return;
      onFile(file);
    },
    [disabled, onFile],
  );

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files[0]);
      }}
      className={[
        "relative border border-dashed transition-colors",
        compact ? "rounded-xl px-4 py-8" : "rounded-2xl px-6 py-12 sm:py-16",
        over ? "border-accent bg-accent-soft/60" : "border-line-strong bg-surface",
        disabled ? "pointer-events-none opacity-60" : "cursor-pointer",
      ].join(" ")}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center text-center">
        <span className={`font-display text-ink ${compact ? "text-base" : "text-xl sm:text-2xl"}`}>
          {compact ? "Replace image" : "Drop a table screenshot"}
        </span>
        {!compact && (
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            PNG, JPEG, WebP. Phone photos of paper or another screen are fine.
            Paste with <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">⌘V</kbd>{" "}
            / <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">Ctrl+V</kbd>.
          </p>
        )}
        <span className={`inline-flex rounded-full bg-ink font-medium text-surface ${compact ? "mt-3 px-3 py-1.5 text-xs" : "mt-5 px-4 py-2 text-sm"}`}>
          Choose image
        </span>
      </div>
    </div>
  );
}
