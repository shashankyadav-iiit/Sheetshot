"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cropper } from "./Cropper";
import { Dropzone } from "./Dropzone";
import { Paywall } from "./Paywall";
import { Spreadsheet } from "./Spreadsheet";
import { SAMPLES, type SampleId } from "@/lib/constants";
import { cropImageBlob, loadRememberedCrop, saveRememberedCrop, type CropRect } from "@/lib/crop";
import { recordExport, remainingFreeExports } from "@/lib/entitlement";
import { copyTsv, downloadCsv, downloadXlsx } from "@/lib/export";
import { type CellMeta, metaGridFor } from "@/lib/grid";
import { extractGridFromImage, type OcrProgress } from "@/lib/ocr";
import { takePendingImage } from "@/lib/pending-image";
import { useEntitlementState } from "@/lib/use-entitlement";

type Status = "idle" | "cropping" | "processing" | "ready" | "error";

function isSampleId(value: string | null): value is SampleId {
  return value === "price" || value === "marks";
}

function fileFromClipboard(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.type.startsWith("image/")) return item.getAsFile();
  }
  return null;
}

export function AppClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<OcrProgress>({ phase: "", progress: 0 });
  const [cells, setCells] = useState<string[][]>([]);
  const [meta, setMeta] = useState<CellMeta[][]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [rememberedCrop, setRememberedCrop] = useState<CropRect | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [copied, setCopied] = useState(false);
  const { canExport: entitled, unlocked, accountPaid } = useEntitlementState();
  const locked = !entitled;
  const busy = useRef(false);
  const bootstrapped = useRef(false);
  const originalBlob = useRef<Blob | null>(null);

  const requireAccess = useCallback(() => {
    if (entitled) return true;
    setPaywall(true);
    return false;
  }, [entitled]);

  const beginCrop = useCallback(
    (source: Blob) => {
      if (!requireAccess()) return;
      originalBlob.current = source;
      setSourceUrl(URL.createObjectURL(source));
      setPreviewUrl(null);
      setCells([]);
      setMeta([]);
      setError(null);
      setWarning(null);
      setCopied(false);
      setRememberedCrop(loadRememberedCrop());
      setStatus("cropping");
    },
    [requireAccess],
  );

  const run = useCallback(
    async (source: Blob) => {
      if (!requireAccess()) return;
      if (busy.current) return;
      busy.current = true;
      setStatus("processing");
      setError(null);
      setWarning(null);
      setCopied(false);
      setPreviewUrl(URL.createObjectURL(source));
      try {
        const result = await extractGridFromImage(source, setProgress);
        setPreviewUrl(result.previewUrl);
        if (result.empty || result.cells.length === 0) {
          setCells([]);
          setMeta([]);
          setError(result.warning || "Couldn't find a table in this image.");
          setStatus("error");
          return;
        }
        setCells(result.cells);
        setMeta(result.meta.length ? result.meta : metaGridFor(result.cells));
        setWarning(result.warning);
        setStatus("ready");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong while reading the image.";
        setError(
          /decode|image|bitmap|canvas/i.test(message)
            ? "Couldn't read that file. Use a JPEG, PNG, or WebP — iPhone HEIC often needs an export."
            : message,
        );
        setStatus("error");
      } finally {
        busy.current = false;
      }
    },
    [requireAccess],
  );

  const confirmCrop = useCallback(
    async (crop: CropRect) => {
      const source = originalBlob.current;
      if (!source) return;
      saveRememberedCrop(crop);
      setRememberedCrop(crop);
      try {
        const cropped = await cropImageBlob(source, crop);
        await run(cropped);
      } catch {
        setError("Couldn't crop that image. Try skip, or pick another file.");
        setStatus("error");
      }
    },
    [run],
  );

  const skipCrop = useCallback(() => {
    const source = originalBlob.current;
    if (!source) return;
    void run(source);
  }, [run]);

  const loadSample = useCallback(
    async (id: SampleId) => {
      if (!requireAccess()) return;
      const res = await fetch(SAMPLES[id].src);
      if (!res.ok) {
        setError("Sample image failed to load.");
        setStatus("error");
        return;
      }
      beginCrop(await res.blob());
    },
    [beginCrop, requireAccess],
  );

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const pending = takePendingImage();
    if (pending) {
      queueMicrotask(() => {
        beginCrop(pending);
      });
      return;
    }
    const sample = searchParams.get("sample");
    if (isSampleId(sample)) {
      queueMicrotask(() => {
        void loadSample(sample);
      });
    }
  }, [beginCrop, loadSample, searchParams]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const file = fileFromClipboard(e);
      if (!file) return;
      e.preventDefault();
      beginCrop(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [beginCrop]);

  const afterExport = useCallback(() => {
    recordExport(accountPaid);
    window.dispatchEvent(new Event("sheetshot-entitlement"));
    if (!unlocked && remainingFreeExports(accountPaid) <= 0) setPaywall(true);
  }, [accountPaid, unlocked]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">From pixels to a grid.</h1>
          <p className="mt-1 text-sm text-muted">
            The image never leaves this device. Fix cells, then download.
          </p>
        </div>
        {status === "ready" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink/90"
              onClick={() => {
                if (!requireAccess()) return;
                downloadCsv(cells);
                afterExport();
              }}
            >
              Download CSV
            </button>
            <button
              type="button"
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-ink/20"
              onClick={() => {
                if (!requireAccess()) return;
                downloadXlsx(cells);
                afterExport();
              }}
            >
              Download .xlsx
            </button>
            <button
              type="button"
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-ink/20"
              onClick={async () => {
                if (!requireAccess()) return;
                await copyTsv(cells);
                afterExport();
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1600);
              }}
            >
              {copied ? "Copied" : "Copy TSV"}
            </button>
          </div>
        )}
      </div>

      {status === "idle" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div onClick={locked ? () => setPaywall(true) : undefined}>
            <Dropzone disabled={locked} onFile={(file) => beginCrop(file)} />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Or try a sample
            </p>
            <div className="mt-3 grid gap-3">
              {Object.values(SAMPLES).map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => void loadSample(sample.id)}
                  className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3 text-left hover:border-ink/20"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sample.src}
                    alt=""
                    className="h-14 w-20 rounded-md border border-line object-cover object-left"
                  />
                  <span>
                    <span className="block font-medium">{sample.label}</span>
                    <span className="block text-sm text-muted">{sample.caption}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {status === "cropping" && sourceUrl && (
        <Cropper
          key={sourceUrl}
          src={sourceUrl}
          initialCrop={rememberedCrop}
          onConfirm={(crop) => void confirmCrop(crop)}
          onSkip={skipCrop}
        />
      )}

      {status === "processing" && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="border-b border-line bg-paper p-4 lg:border-b-0 lg:border-r">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Source" className="w-full rounded-lg border border-line" />
              ) : (
                <div className="aspect-[4/3] rounded-lg bg-paper-2" />
              )}
            </div>
            <div className="flex flex-col justify-center p-6">
              <p className="font-display text-2xl text-ink">{progress.phase || "Working…"}</p>
              <p className="mt-1 text-sm text-muted">
                First run downloads the OCR engine into this browser. After that it&apos;s cached.
              </p>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-paper-2">
                <div
                  className="h-full bg-accent transition-[width] duration-300"
                  style={{
                    width: `${Math.round(Math.min(1, Math.max(0.05, progress.progress)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {(status === "ready" || status === "error") && (
        <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Source" className="w-full rounded-xl border border-line bg-surface" />
            )}
            <div onClick={locked ? () => setPaywall(true) : undefined}>
              <Dropzone compact disabled={locked} onFile={(file) => beginCrop(file)} />
            </div>
            {sourceUrl && (
              <button
                type="button"
                className="text-left text-sm text-muted hover:text-ink"
                onClick={() => {
                  if (!requireAccess()) return;
                  const blob = originalBlob.current;
                  if (blob) beginCrop(blob);
                }}
              >
                Crop again →
              </button>
            )}
            <div className="flex flex-col gap-2">
              {Object.values(SAMPLES).map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="text-left text-sm text-muted hover:text-ink"
                  onClick={() => void loadSample(sample.id)}
                >
                  Try {sample.label.toLowerCase()} →
                </button>
              ))}
            </div>
          </aside>
          <div className="space-y-3">
            {warning && status === "ready" && (
              <div className="rounded-xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm text-warn">
                {warning}
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-sm text-accent-hover">
                {error}
              </div>
            )}
            {status === "ready" && (
              <Spreadsheet
                cells={cells}
                meta={meta}
                previewUrl={previewUrl}
                onChange={(nextCells, nextMeta) => {
                  setCells(nextCells);
                  setMeta(nextMeta);
                }}
                locked={locked}
              />
            )}
            {status === "error" && (
              <p className="text-sm text-muted">
                Crop tighter to the table, shoot straighter, or start from a sample.
              </p>
            )}
          </div>
        </div>
      )}

      <Paywall open={paywall} onClose={() => setPaywall(false)} onUnlocked={() => setPaywall(false)} />
    </div>
  );
}
