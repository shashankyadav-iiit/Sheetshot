import assert from "node:assert/strict";
import { test } from "node:test";
import { gridToCsv, gridToTsv } from "./csv";
import {
  addColumn,
  addColumnMeta,
  addRow,
  addRowMeta,
  deleteColumn,
  reconstructGrid,
  type OcrWord,
} from "./grid";
import { shouldGlueTokens } from "./numbers";

function word(text: string, x0: number, y0: number, x1: number, y1: number, confidence = 90): OcrWord {
  return { text, confidence, bbox: { x0, y0, x1, y1 } };
}

test("reconstructs a 3x3 table from bounding boxes", () => {
  const words: OcrWord[] = [
    word("Name", 10, 10, 80, 32),
    word("Qty", 200, 10, 250, 32),
    word("Total", 360, 10, 440, 32),
    word("Rice", 10, 50, 70, 72),
    word("12", 210, 50, 240, 72),
    word("15000", 370, 50, 440, 72),
    word("Salt", 10, 90, 70, 112),
    word("50", 210, 90, 240, 112),
    word("1400", 380, 90, 430, 112),
  ];
  const result = reconstructGrid(words);
  assert.equal(result.empty, false);
  assert.equal(result.cells.length, 3);
  assert.equal(result.cells[0]?.length, 3);
  assert.equal(result.cells[0]?.[0], "Name");
  assert.equal(result.cells[1]?.[0], "Rice");
  assert.equal(result.cells[2]?.[2], "1400");
});

test("glues split Indian-grouped amounts into one cell", () => {
  assert.equal(shouldGlueTokens("1", ",", 2, 14), true);
  assert.equal(shouldGlueTokens("1,", "00", 3, 14), true);
  assert.equal(shouldGlueTokens("1,00", ",000", 2, 14), true);

  const words: OcrWord[] = [
    word("Item", 10, 8, 70, 30),
    word("Amount", 300, 8, 390, 30),
    word("Cashew", 10, 48, 90, 70),
    word("1", 300, 48, 312, 70),
    word(",", 312, 48, 318, 70),
    word("00", 318, 48, 342, 70),
    word(",", 342, 48, 348, 70),
    word("000", 348, 48, 392, 70),
  ];
  const result = reconstructGrid(words);
  assert.equal(result.cells[1]?.[1], "1,00,000");
});

test("quotes Indian grouping in CSV so it stays one column", () => {
  const csv = gridToCsv([
    ["Item", "Amount"],
    ["Cashew", "1,00,000"],
    ["Salt", "1400"],
  ]);
  assert.match(csv, /"1,00,000"/);
  assert.equal(gridToTsv([["a", "b"]])[0], "a");
});

test("add and delete columns keep a usable grid", () => {
  const grid = [
    ["A", "B"],
    ["1", "2"],
  ];
  const wider = addColumn(grid);
  assert.equal(wider[0]?.length, 3);
  const taller = addRow(wider);
  assert.equal(taller.length, 3);
  const slim = deleteColumn(taller, 2);
  assert.equal(slim[0]?.length, 2);

  const meta = addColumnMeta(addRowMeta([[{ confidence: 90, bbox: null, shaky: false, reasons: [] }]]));
  assert.equal(meta.length, 2);
  assert.equal(meta[0]?.length, 2);
});

test("carries per-cell confidence and flags a 0/O mix-up", () => {
  const words: OcrWord[] = [
    word("Item", 10, 10, 80, 32, 92),
    word("Amt", 200, 10, 250, 32, 91),
    word("Rice", 10, 50, 70, 72, 90),
    word("15O0", 210, 50, 250, 72, 88),
    word("Salt", 10, 90, 70, 112, 90),
    word("1400", 210, 90, 250, 112, 93),
  ];
  const result = reconstructGrid(words);
  assert.equal(result.cells[1]?.[1], "15O0");
  assert.equal(result.meta.length, result.cells.length);
  assert.equal(result.meta[1]?.[1]?.shaky, true);
  assert.ok(result.meta[1]?.[1]?.bbox);
  assert.equal(result.meta[2]?.[1]?.shaky, false);
  assert.ok(result.warning);
});

test("keeps multi-word item names in one cell when columns are far apart", () => {
  const words: OcrWord[] = [
    word("Item", 102, 90, 156, 120),
    word("Qty", 466, 90, 511, 120),
    word("Rate", 639, 90, 697, 120),
    word("Amount", 802, 90, 906, 120),
    word("Basmati", 102, 165, 199, 195),
    word("Rice", 211, 165, 263, 195),
    word("5kg", 274, 165, 316, 195),
    word("12", 483, 165, 511, 195),
    word("1,250", 630, 165, 698, 195),
    word("15,000", 823, 165, 906, 195),
    word("Wholesale", 100, 520, 229, 550),
    word("Cashew", 240, 520, 339, 550),
    word("2", 497, 520, 510, 550),
    word("50,000", 613, 520, 697, 550),
    word("1,00,000", 800, 520, 906, 550),
  ];
  const result = reconstructGrid(words);
  assert.equal(result.cells[0]?.length, 4);
  assert.equal(result.cells[1]?.[0], "Basmati Rice 5kg");
  assert.equal(result.cells[1]?.[1], "12");
  assert.equal(result.cells[2]?.[0], "Wholesale Cashew");
  assert.equal(result.cells[2]?.[3], "1,00,000");
});

test("sparse tables get a warning instead of failing", () => {
  const words: OcrWord[] = [
    word("A", 10, 10, 30, 28),
    word("B", 120, 10, 140, 28),
    word("C", 230, 10, 250, 28),
    word("D", 340, 10, 360, 28),
    word("E", 450, 10, 470, 28),
    word("F", 560, 10, 580, 28),
    word("1", 10, 50, 24, 68),
    word("z", 10, 90, 24, 108),
  ];
  const result = reconstructGrid(words);
  assert.equal(result.empty, false);
  assert.equal(result.sparse, true);
  assert.ok(result.warning);
});

test("splits CSV-looking text on commas instead of visual gaps", () => {
  // "id, name, city" with single spaces: visually it is one run of text.
  const lines = [
    ["id,", "name,", "city"],
    ["1,", "Asha", "Rao,", "Pune"],
    ["2,", "Ben,", "Leeds"],
  ];
  const words: OcrWord[] = [];
  lines.forEach((parts, r) => {
    let x = 10;
    for (const p of parts) {
      words.push(word(p, x, 10 + r * 30, x + p.length * 10, 30 + r * 30));
      x += p.length * 10 + 8;
    }
  });
  const result = reconstructGrid(words);
  assert.deepEqual(result.cells, [
    ["id", "name", "city"],
    ["1", "Asha Rao", "Pune"],
    ["2", "Ben", "Leeds"],
  ]);
});

test("does not treat thousands separators as CSV", () => {
  const words: OcrWord[] = [
    word("Item", 10, 10, 60, 30),
    word("Amount", 300, 10, 380, 30),
    word("Rice", 10, 50, 60, 70),
    word("15,000", 300, 50, 370, 70),
    word("Dal", 10, 90, 50, 110),
    word("7,560", 300, 90, 360, 110),
  ];
  const result = reconstructGrid(words);
  assert.deepEqual(result.cells, [
    ["Item", "Amount"],
    ["Rice", "15,000"],
    ["Dal", "7,560"],
  ]);
});

test("uses gridlines as cell walls: split tight columns, keep wrapped cells in their row", () => {
  // Right-aligned id right next to left-aligned text, then a two-line wrapped cell.
  const words: OcrWord[] = [
    word("id", 60, 8, 80, 28),
    word("station", 100, 8, 170, 28),
    word("4050430", 10, 48, 88, 68),
    word("6th/West", 96, 48, 180, 68),
    word("Pfluger", 96, 86, 160, 106),
    word("Bridge", 166, 86, 220, 106),
    word("13857913", 4, 118, 88, 138),
    word("Street", 96, 118, 150, 138),
  ];
  const rules = { rows: [2, 38, 78, 146], cols: [0, 92, 240] };
  const result = reconstructGrid(words, { rules });
  assert.deepEqual(result.cells, [
    ["id", "station"],
    ["4050430", "6th/West"],
    ["13857913", "Pfluger Bridge Street"],
  ]);
});

test("keeps lone em-dash placeholder cells instead of treating them as rules", () => {
  // Word boxes from a SemTab (MammoTab) table: "—" marks empty stats.
  const words: OcrWord[] = [];
  for (const [i, y] of [31, 79].entries()) {
    words.push(word(i ? "Luján" : "Comunicaciones", 31, y, 215, y + 19));
    words.push(word("1", 717, y + 1, 722, y + 19));
    words.push(word("—", 873, y + 10, 894, y + 12));
    words.push(word("—", 960, y + 10, 981, y + 12));
    words.push(word("0", 1060, y + 1, 1072, y + 19));
  }
  const grid = reconstructGrid(words);
  assert.deepEqual(grid.cells[0], ["Comunicaciones", "1", "—", "—", "0"]);
  assert.equal(grid.cells[1]?.length, 5);
});

test("does not glue numbers from neighbouring columns", () => {
  // "2732 | 16.9" sat ~40px apart and came out as "273216.9".
  const words: OcrWord[] = [
    word("Estonians", 42, 35, 166, 56),
    word("8856", 444, 35, 509, 56),
    word("88.9", 554, 35, 610, 56),
    word("12667", 653, 35, 730, 56),
    word("Russians", 42, 89, 160, 110),
    word("746", 450, 89, 500, 110),
    word("7.49", 554, 89, 610, 110),
    word("2732", 663, 89, 722, 110),
  ];
  const grid = reconstructGrid(words);
  assert.deepEqual(grid.cells, [
    ["Estonians", "8856", "88.9", "12667"],
    ["Russians", "746", "7.49", "2732"],
  ]);
});

test("keeps the space after a comma in dates and lists", () => {
  assert.equal(shouldGlueTokens("28,", "2009", 8, 21), false);
  assert.equal(shouldGlueTokens("1st(1991,", "1993,", 8, 21), false);
  assert.equal(shouldGlueTokens("1,", "00,000", 1, 21), true);
});

test("keeps low-confidence words that look like text", () => {
  const words: OcrWord[] = [
    word("22", 10, 10, 40, 32),
    word("('Path", 200, 10, 262, 32),
    word("Traversal')", 270, 10, 383, 32, 13),
    word("59", 10, 50, 40, 72),
    word("Draft", 200, 50, 260, 72),
  ];
  const grid = reconstructGrid(words);
  assert.equal(grid.cells[0]?.[1], "('Path Traversal')");
});
