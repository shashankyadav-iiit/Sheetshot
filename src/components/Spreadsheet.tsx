"use client";

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
};

export function Spreadsheet({ cells, onChange }: SpreadsheetProps) {
  const cols = cells[0]?.length ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2 text-xs">
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
                    <button
                      type="button"
                      title="Delete column"
                      className="rounded px-1 text-faint hover:bg-accent-soft hover:text-accent"
                      onClick={() => onChange(deleteColumn(cells, c))}
                    >
                      ×
                    </button>
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
                    <button
                      type="button"
                      title="Delete row"
                      className="rounded px-1 text-faint hover:bg-accent-soft hover:text-accent"
                      onClick={() => onChange(deleteRow(cells, r))}
                    >
                      ×
                    </button>
                  </div>
                </th>
                {row.map((cell, c) => (
                  <td key={c} className="border-l border-t border-line p-0">
                    <input
                      value={cell}
                      aria-label={`${colLabel(c)}${r + 1}`}
                      onChange={(e) => onChange(setCell(cells, r, c, e.target.value))}
                      className="h-9 w-full min-w-[7.5rem] bg-transparent px-2 text-ink outline-none focus:bg-accent-soft/40"
                    />
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
