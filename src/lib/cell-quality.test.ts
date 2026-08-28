import assert from "node:assert/strict";
import { test } from "node:test";
import { assessGrid, LOW_CONFIDENCE } from "./cell-quality";

test("low Tesseract confidence flags a cell", () => {
  const meta = assessGrid(
    [
      ["Item", "Qty"],
      ["Rice", "12"],
    ],
    [
      [90, 91],
      [88, LOW_CONFIDENCE - 10],
    ],
    [
      [null, null],
      [null, { x0: 0, y0: 0, x1: 10, y1: 10 }],
    ],
  );
  assert.equal(meta[1]?.[1]?.shaky, true);
  assert.equal(meta[0]?.[0]?.shaky, false);
});

test("spaces in numbers and 0/O in a numeric column are flagged even at high confidence", () => {
  const meta = assessGrid(
    [
      ["Item", "Amount"],
      ["Salt", "1 400"],
      ["Rice", "15O00"],
    ],
    [
      [95, 95],
      [94, 93],
      [94, 92],
    ],
    [
      [null, null],
      [null, null],
      [null, null],
    ],
  );
  assert.equal(meta[1]?.[1]?.shaky, true);
  assert.ok(meta[1]?.[1]?.reasons.some((r) => /space/i.test(r)));
  assert.equal(meta[2]?.[1]?.shaky, true);
  assert.ok(meta[2]?.[1]?.reasons.some((r) => /0\/O/i.test(r)));
});

test("split header fragments are flagged; intact headers are not", () => {
  const split = assessGrid(
    [
      ["Am", "ount", "Qty"],
      ["Rice", "white", "12"],
    ],
    [
      [90, 90, 90],
      [90, 90, 90],
    ],
    [
      [null, null, null],
      [null, null, null],
    ],
  );
  assert.equal(split[0]?.[0]?.shaky, true);
  assert.equal(split[0]?.[1]?.shaky, true);
  assert.ok(split[0]?.[0]?.reasons.some((r) => /split/i.test(r)));

  const intact = assessGrid(
    [
      ["Qty", "Rate", "Amount"],
      ["12", "10", "120"],
    ],
    [
      [90, 90, 90],
      [90, 90, 90],
    ],
    [
      [null, null, null],
      [null, null, null],
    ],
  );
  assert.equal(intact[0]?.[0]?.shaky, false);
  assert.equal(intact[0]?.[1]?.shaky, false);
});

test("clean numeric cells are not flagged", () => {
  const meta = assessGrid(
    [
      ["Item", "Amount"],
      ["Rice", "15,000"],
    ],
    [
      [92, 93],
      [91, 94],
    ],
    [
      [null, null],
      [null, null],
    ],
  );
  assert.equal(meta[1]?.[1]?.shaky, false);
  assert.equal(meta[0]?.[0]?.shaky, false);
});
