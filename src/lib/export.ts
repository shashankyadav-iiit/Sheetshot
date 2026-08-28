import { gridToCsv, gridToTsv } from "./csv";
import { gridToXlsx } from "./xlsx";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(cells: string[][], filename = "sheetshot.csv") {
  const csv = `\uFEFF${gridToCsv(cells)}`;
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

export function downloadXlsx(cells: string[][], filename = "sheetshot.xlsx") {
  const bytes = gridToXlsx(cells);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  downloadBlob(
    new Blob([copy.buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export async function copyTsv(cells: string[][]): Promise<void> {
  const tsv = gridToTsv(cells);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(tsv);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = tsv;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}
