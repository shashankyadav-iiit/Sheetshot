import assert from "node:assert/strict";
import { test } from "node:test";
import { preprocessPixels, removeRuleLines, type PixelImage } from "./preprocess";

function blank(width: number, height: number): PixelImage {
  return { data: new Uint8ClampedArray(width * height * 4).fill(255), width, height };
}

function paint(img: PixelImage, x0: number, y0: number, x1: number, y1: number, v = 0) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.width + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
    }
  }
}

const at = (img: PixelImage, x: number, y: number) => img.data[(y * img.width + x) * 4]!;

test("keeps a dense row of bold text instead of wiping it as a rule", () => {
  // Narrow crop of a bold header: 60% of the row is ink, but in 7px glyph strokes
  // with gaps. The old >42%-of-row detector erased this row (the white bar).
  const img = blank(200, 40);
  for (let x = 10; x < 190; x += 10) paint(img, x, 12, x + 7, 28);
  const rules = removeRuleLines(img);
  assert.equal(at(img, 12, 20), 0);
  assert.deepEqual(rules.rows, []);
});

test("removes thin full-width and full-height rules and reports where they were", () => {
  const img = blank(300, 120);
  paint(img, 0, 59, 300, 61); // horizontal rule
  paint(img, 149, 0, 151, 120); // vertical rule
  paint(img, 20, 20, 30, 40); // a glyph
  const rules = removeRuleLines(img);
  assert.equal(at(img, 100, 60), 255);
  assert.equal(at(img, 150, 30), 255);
  assert.equal(at(img, 25, 30), 0);
  assert.deepEqual(rules.rows, [59.5]);
  assert.deepEqual(rules.cols, [149.5]);
});

test("leaves a shaded header band alone (thick fill is not a rule)", () => {
  const img = blank(300, 120);
  paint(img, 0, 0, 300, 30, 200);
  removeRuleLines(img);
  assert.equal(at(img, 100, 15), 200);
});

test("finds faint gridlines that the contrast snap turns white", () => {
  const img = blank(300, 120);
  paint(img, 20, 10, 60, 40, 0); // a block of text ink so the stretch has a dark end
  paint(img, 0, 79, 300, 80, 225); // light-gray gridline
  const { rules } = preprocessPixels(img);
  assert.equal(at(img, 150, 79), 255); // snapped white either way
  assert.deepEqual(rules.rows, [79]); // but still found as a row boundary
});
