"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { SAMPLES } from "@/lib/constants";
import { setPendingImage } from "@/lib/pending-image";
import { Dropzone } from "./Dropzone";

function fileFromClipboard(e: ClipboardEvent): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

export function LandingHero() {
  const router = useRouter();

  const startWithFile = useCallback(
    (file: File) => {
      setPendingImage(file);
      router.push("/app");
    },
    [router],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = fileFromClipboard(e);
      if (!file) return;
      e.preventDefault();
      startWithFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [startWithFile]);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <Dropzone onFile={startWithFile} />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Try a sample</p>
        <p className="mt-1 text-sm text-muted">No upload. These live in the repo.</p>
        <div className="mt-4 grid gap-3">
          {Object.values(SAMPLES).map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => router.push(`/app?sample=${sample.id}`)}
              className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3 text-left hover:border-ink/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.src}
                alt=""
                className="h-16 w-24 rounded-md border border-line object-cover object-left"
              />
              <span>
                <span className="block font-medium text-ink">{sample.label}</span>
                <span className="block text-sm text-muted">{sample.caption}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
