"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent } from "react";
import { CellZoom } from "./CellZoom";
import {
  addColumn,
  addColumnMeta,
  addRow,
  addRowMeta,
  deleteColumn,
  deleteColumnMeta,
  deleteRow,
  deleteRowMeta,
  markCellReviewed,
  metaGridFor,
  setCell,
  type CellMeta,
} from "@/lib/grid";

function colLabel(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

type SpreadsheetProps = {
  cells: string[][];
  meta: CellMeta[][];
  previewUrl: string | null;
  onChange: (cells: string[][], meta: CellMeta[][]) => void;
  locked?: boolean;
};

function blockClipboard(e: ClipboardEvent) {
  e.preventDefault();
}

function selectionTouches(root: Node): boolean {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  for (let i = 0; i < selection.rangeCount; i++) {
    if (selection.getRangeAt(i).intersectsNode(root)) return true;
  }
  return false;
}

function alignedMeta(cells: string[][], meta: CellMeta[][]): CellMeta[][] {
  if (meta.length === cells.length && meta.every((row, r) => row.length === (cells[r]?.length ?? 0))) {
    return meta;
  }
  return metaGridFor(cells);
}

export function Spreadsheet({
  cells,
  meta: metaProp,
  previewUrl,
  onChange,
  locked = false,
}: SpreadsheetProps) {
  const cols = cells[0]?.length ?? 0;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const meta = alignedMeta(cells, metaProp);
  const [focus, setFocus] = useState<{ r: number; c: number } | null>(null);

  const flagged = useMemo(() => {
    const list: { r: number; c: number }[] = [];
    meta.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell.shaky) list.push({ r, c });
      });
    });
    return list;
  }, [meta]);

  const focusedMeta = focus ? meta[focus.r]?.[focus.c] : undefined;
  const focusedLabel = focus ? `${colLabel(focus.c)}${focus.r + 1}` : "";

  useEffect(() => {
    if (!locked) return;
    const root = rootRef.current;
    if (!root) return;

    const block = (e: Event) => {
      const target = e.target as Node | null;
      if ((target && root.contains(target)) || selectionTouches(root)) {
        e.preventDefault();
      }
    };

    document.addEventListener("copy", block, true);
    document.addEventListener("cut", block, true);
    return () => {
      document.removeEventListener("copy", block, true);
      document.removeEventListener("cut", block, true);
    };
  }, [locked]);

  const jumpFlagged = (delta: number) => {
    if (flagged.length === 0) return;
    const current = focus
      ? flagged.findIndex((cell) => cell.r === focus.r && cell.c === focus.c)
      : -1;
    const next = flagged[(current + delta + flagged.length) % flagged.length]!;
    setFocus(next);
    const key = `${next.r}:${next.c}`;
    inputRefs.current.get(key)?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={[
        "overflow-hidden rounded-xl border border-line bg-surface",
        locked ? "select-none [-webkit-touch-callout:none]" : "",
      ].join(" ")}
      onCopy={locked ? blockClipboard : undefined}
      onCut={locked ? blockClipboard : undefined}
      onCopyCapture={locked ? blockClipboard : undefined}
      onCutCapture={locked ? blockClipboard : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs">
        {locked ? (
          <span className="text-muted">Unlock to edit or export this grid</span>
        ) : (
          <>
            <button
              type="button"
              className="rounded-md border border-line px-2 py-1 hover:bg-paper"
              onClick={() => onChange(addRow(cells), addRowMeta(meta))}
            >
              + Row
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-2 py-1 hover:bg-paper"
              onClick={() => onChange(addColumn(cells), addColumnMeta(meta))}
            >
              + Column
            </button>
          </>
        )}
        {flagged.length > 0 && (
          <span className="flex items-center gap-2 text-warn">
            <span>
              {flagged.length} cell{flagged.length === 1 ? "" : "s"} to check
            </span>
            <button
              type="button"
              className="rounded-md border border-warn/30 px-2 py-1 hover:bg-warn-soft"
              onClick={() => jumpFlagged(1)}
            >
              Next
            </button>
          </span>
        )}
        <span className="ml-auto font-mono text-faint">
          {cells.length} × {cols}
        </span>
      </div>
      {focus && previewUrl && (
        <div className="flex flex-wrap items-start gap-4 border-b border-line bg-paper px-3 py-3">
          {focusedMeta?.bbox ? (
            <CellZoom
              src={previewUrl}
              bbox={focusedMeta.bbox}
              label={`Source for ${focusedLabel}`}
            />
          ) : (
            <p className="text-sm text-muted">
              No source pixels for {focusedLabel} — this cell was inserted or empty in the OCR grid.
            </p>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">
              {focusedMeta?.shaky
                ? focusedMeta.reasons[0] ?? "OCR wasn't sure about this cell."
                : "Compare the text with the pixels, then fix anything that's off."}
            </p>
            {focusedMeta?.reasons && focusedMeta.reasons.length > 1 && (
              <p className="mt-1 text-xs text-muted">{focusedMeta.reasons.slice(1).join(" · ")}</p>
            )}
          </div>
        </div>
      )}
      <div className="overflow-auto">
        <table className="min-w-full border-collapse font-mono text-[13px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-14 bg-paper-2 text-[11px] font-medium text-faint" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className="min-w-[7.5rem] border-l border-line bg-paper-2 px-1 py-1 text-center text-[11px] font-medium text-muted"
                >
                  <div className="flex items-center justify-center gap-0.5">
                    <span>{colLabel(c)}</span>
                    {!locked && (
                      <>
                        <button
                          type="button"
                          title="Insert column after"
                          className="rounded px-1 text-faint hover:bg-paper hover:text-ink"
                          onClick={() =>
                            onChange(addColumn(cells, c + 1), addColumnMeta(meta, c + 1))
                          }
                        >
                          +
                        </button>
                        <button
                          type="button"
                          title="Delete column"
                          className="rounded px-1 text-faint hover:bg-accent-soft hover:text-accent"
                          onClick={() => onChange(deleteColumn(cells, c), deleteColumnMeta(meta, c))}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, r) => (
              <tr key={r} className="odd:bg-surface even:bg-[#fbf7f0]">
                <th className="sticky left-0 z-10 border-t border-line bg-paper-2 px-1 py-0 text-center text-[11px] font-medium text-muted">
                  <div className="flex items-center justify-center gap-0.5">
                    <span>{r + 1}</span>
                    {!locked && (
                      <>
                        <button
                          type="button"
                          title="Insert row below"
                          className="rounded px-1 text-faint hover:bg-paper hover:text-ink"
                          onClick={() => onChange(addRow(cells, r + 1), addRowMeta(meta, r + 1))}
                        >
                          +
                        </button>
                        <button
                          type="button"
                          title="Delete row"
                          className="rounded px-1 text-faint hover:bg-accent-soft hover:text-accent"
                          onClick={() => onChange(deleteRow(cells, r), deleteRowMeta(meta, r))}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                </th>
                {row.map((cell, c) => {
                  const info = meta[r]?.[c];
                  const shaky = Boolean(info?.shaky);
                  const selected = focus?.r === r && focus?.c === c;
                  return (
                    <td
                      key={c}
                      className={[
                        "border-l border-t border-line p-0",
                        shaky ? "bg-warn-soft" : "",
                        selected ? "ring-1 ring-inset ring-accent" : "",
                      ].join(" ")}
                    >
                      {locked ? (
                        <button
                          type="button"
                          aria-label={`${colLabel(c)}${r + 1}`}
                          title={info?.reasons.join(" · ") || undefined}
                          className="flex h-9 w-full min-w-[7.5rem] items-center px-2 text-left text-ink select-none"
                          onClick={() => setFocus({ r, c })}
                        >
                          {cell}
                        </button>
                      ) : (
                        <input
                          ref={(el) => {
                            const key = `${r}:${c}`;
                            if (el) inputRefs.current.set(key, el);
                            else inputRefs.current.delete(key);
                          }}
                          value={cell}
                          aria-label={`${colLabel(c)}${r + 1}`}
                          aria-invalid={shaky || undefined}
                          title={info?.reasons.join(" · ") || undefined}
                          onFocus={() => setFocus({ r, c })}
                          onChange={(e) =>
                            onChange(setCell(cells, r, c, e.target.value), markCellReviewed(meta, r, c))
                          }
                          className="h-9 w-full min-w-[7.5rem] bg-transparent px-2 text-ink outline-none focus:bg-accent-soft/40"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
