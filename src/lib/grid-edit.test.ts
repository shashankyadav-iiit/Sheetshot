import assert from "node:assert/strict";
import { test } from "node:test";
import { assessGrid, suggestedHeaderMerges } from "./cell-quality";
import {
  addColumn,
  addColumnMeta,
  addRow,
  addRowMeta,
  cellJoinMetrics,
  deleteColumn,
  deleteColumnMeta,
  mergeCells,
  splitCell,
  unionBBox,
  type BBox,
  type CellMeta,
} from "./grid";
import { joinTokens, shouldGlueTokens } from "./numbers";

function metaFor(cells: string[][], bboxes: (BBox | null)[][] = [], confidence = 90): CellMeta[][] {
  const confidences = cells.map((row) => row.map(() => confidence));
  const boxes = cells.map((row, r) => row.map((_, c) => bboxes[r]?.[c] ?? null));
  return assessGrid(cells, confidences, boxes);
}

function assertAligned(cells: string[][], meta: CellMeta[][]) {
  assert.equal(meta.length, cells.length);
  cells.forEach((row, r) => assert.equal(meta[r]?.length, row.length));
}

test("merge Am + ount uses the same join rule as token joiners", () => {
  const leftBox = { x0: 10, y0: 10, x1: 28, y1: 28 };
  const rightBox = { x0: 29, y0: 10, x1: 70, y1: 28 };
  const { gap, em } = cellJoinMetrics(leftBox, rightBox);
  const expected = joinTokens("Am", "ount", shouldGlueTokens("Am", "ount", gap, em));
  assert.equal(expected, "Amount");

  const cells = [
    ["Am", "ount", "Qty"],
    ["Rice", "white", "12"],
  ];
  const result = mergeCells(
    cells,
    metaFor(cells, [
      [leftBox, rightBox, null],
      [null, null, null],
    ]),
    { r: 0, c: 0 },
    { r: 0, c: 1 },
  );
  assert.ok(result);
  assert.equal(result.cells[0]?.[0], expected);
  assert.equal(result.cells[0]?.[0], joinTokens("Am", "ount", shouldGlueTokens("Am", "ount", gap, em)));
});

test("merge unions bboxes and the kept cell is not shaky", () => {
  const leftBox = { x0: 10, y0: 10, x1: 28, y1: 28 };
  const rightBox = { x0: 29, y0: 10, x1: 70, y1: 28 };
  const cells = [
    ["Am", "ount", "Qty"],
    ["Rice", "white", "12"],
  ];
  const meta = metaFor(cells, [
    [leftBox, rightBox, { x0: 90, y0: 10, x1: 130, y1: 28 }],
    [null, null, null],
  ]);
  assert.equal(meta[0]?.[0]?.shaky, true);

  const result = mergeCells(cells, meta, { r: 0, c: 0 }, { r: 0, c: 1 });
  assert.ok(result);
  assert.equal(result.cells[0]?.[0], "Amount");
  assert.deepEqual(result.meta[0]?.[0]?.bbox, unionBBox(leftBox, rightBox));
  assert.equal(result.meta[0]?.[0]?.shaky, false);
  assertAligned(result.cells, result.meta);
});

test("split 1 400 on space into 1 and 400", () => {
  const box = { x0: 200, y0: 48, x1: 280, y1: 70 };
  const cells = [
    ["Item", "1 400"],
    ["Rice", "12"],
  ];
  const meta = metaFor(cells, [
    [null, box],
    [null, null],
  ]);
  assert.ok(meta[0]?.[1]?.reasons.some((reason) => /space/i.test(reason)));

  const result = splitCell(cells, meta, { r: 0, c: 1 });
  assert.ok(result);
  assert.equal(result.cells[0]?.[1], "1");
  assert.equal(result.cells[0]?.[2], "400");
  assert.equal(result.cells[1]?.[1], "12");
  assert.ok(result.meta[0]?.[1]?.bbox);
  assert.ok(result.meta[0]?.[2]?.bbox);
  assert.equal(result.meta[0]?.[1]?.bbox?.x1, (box.x0 + box.x1) / 2);
  assert.equal(result.meta[0]?.[2]?.bbox?.x0, (box.x0 + box.x1) / 2);
  assert.equal(result.meta[0]?.[1]?.shaky, false);
  assertAligned(result.cells, result.meta);
});

test("merge refuses non-adjacent cells", () => {
  const cells = [
    ["Am", "ount", "Qty"],
    ["Rice", "white", "12"],
  ];
  const meta = metaFor(cells);
  assert.equal(mergeCells(cells, meta, { r: 0, c: 0 }, { r: 0, c: 2 }), null);
  assert.equal(mergeCells(cells, meta, { r: 0, c: 0 }, { r: 1, c: 1 }), null);
});

test("suggested merge nudge clears after merging that header pair", () => {
  const cells = [
    ["Am", "ount", "Qty"],
    ["Rice", "white", "12"],
  ];
  const meta = metaFor(cells);
  const before = suggestedHeaderMerges(meta);
  assert.equal(before.length, 1);
  assert.deepEqual(before[0], { a: { r: 0, c: 0 }, b: { r: 0, c: 1 } });

  const result = mergeCells(cells, meta, before[0]!.a, before[0]!.b);
  assert.ok(result);
  assert.equal(result.cells[0]?.[0], "Amount");
  assert.equal(suggestedHeaderMerges(result.meta).length, 0);
});

test("merge drops an emptied column and row/col edits stay aligned", () => {
  const cells = [
    ["Am", "ount"],
    ["12", ""],
  ];
  const result = mergeCells(cells, metaFor(cells), { r: 0, c: 0 }, { r: 0, c: 1 });
  assert.ok(result);
  assert.deepEqual(result.cells, [["Amount"], ["12"]]);
  assertAligned(result.cells, result.meta);

  const taller = addRow(result.cells);
  const tallerMeta = addRowMeta(result.meta);
  assertAligned(taller, tallerMeta);

  const wider = addColumn(taller);
  const widerMeta = addColumnMeta(tallerMeta);
  assertAligned(wider, widerMeta);

  const slim = deleteColumn(wider, 1);
  const slimMeta = deleteColumnMeta(widerMeta, 1);
  assertAligned(slim, slimMeta);
});

test("split at caret inserts a column when the neighbor is filled", () => {
  const cells = [
    ["Qty", "Rate"],
    ["12", "10"],
  ];
  const result = splitCell(cells, metaFor(cells), { r: 0, c: 0 }, 1);
  assert.ok(result);
  assert.deepEqual(result.cells[0], ["Q", "ty", "Rate"]);
  assert.deepEqual(result.cells[1], ["12", "", "10"]);
  assertAligned(result.cells, result.meta);
});
