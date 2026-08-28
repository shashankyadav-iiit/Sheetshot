"use client";

import { useEffect, useRef, type ClipboardEvent } from "react";
import { addColumn, addRow, deleteColumn, deleteRow, setCell } from "@/lib/grid";

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
  onChange: (next: string[][]) => void;
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

export function Spreadsheet({ cells, onChange, locked = false }: SpreadsheetProps) {
  const cols = cells[0]?.length ?? 0;
  const rootRef = useRef<HTMLDivElement>(null);

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
              onClick={() => onChange(addRow(cells))}
            >
              + Row
            </button>
            <button
              type="button"
              className="rounded-md border border-line px-2 py-1 hover:bg-paper"
              onClick={() => onChange(addColumn(cells))}
            >
              + Column
            </button>
          </>
        )}
        <span className="ml-auto font-mono text-faint">
          {cells.length} × {cols}
        </span>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full border-collapse font-mono text-[13px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-10 bg-paper-2 text-[11px] font-medium text-faint" />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  className="min-w-[7.5rem] border-l border-line bg-paper-2 px-1 py-1 text-center text-[11px] font-medium text-muted"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{colLabel(c)}</span>
                    {!locked && (
                      <button
                        type="button"
                        title="Delete column"
                        className="rounded px-1 text-faint hover:bg-accent-soft hover:text-accent"
                        onClick={() => onChange(deleteColumn(cells, c))}
                      >
                        ×
                      </button>
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
                      <button
                        type="button"
                        title="Delete row"
                        className="rounded px-1 text-faint hover:bg-accent-soft hover:text-accent"
                        onClick={() => onChange(deleteRow(cells, r))}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </th>
                {row.map((cell, c) => (
                  <td key={c} className="border-l border-t border-line p-0">
                    {locked ? (
                      <span
                        aria-label={`${colLabel(c)}${r + 1}`}
                        className="flex h-9 w-full min-w-[7.5rem] items-center px-2 text-ink select-none"
                      >
                        {cell}
                      </span>
                    ) : (
                      <input
                        value={cell}
                        aria-label={`${colLabel(c)}${r + 1}`}
                        onChange={(e) => onChange(setCell(cells, r, c, e.target.value))}
                        className="h-9 w-full min-w-[7.5rem] bg-transparent px-2 text-ink outline-none focus:bg-accent-soft/40"
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
