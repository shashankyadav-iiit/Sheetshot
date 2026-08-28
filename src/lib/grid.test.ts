import assert from "node:assert/strict";
import { test } from "node:test";
import { gridToCsv, gridToTsv } from "./csv";
import {
  addColumn,
  addRow,
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
