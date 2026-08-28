import assert from "node:assert/strict";
import { test } from "node:test";
import { clampCropRect, inflateCrop, MIN_CROP } from "./crop";

test("clampCropRect flips inverted drags and stays in 0–1", () => {
  const rect = clampCropRect({ x: 0.8, y: 0.7, w: -0.5, h: -0.4 });
  assert.ok(rect.x >= 0 && rect.y >= 0);
  assert.ok(rect.x + rect.w <= 1 + 1e-9);
  assert.ok(rect.y + rect.h <= 1 + 1e-9);
  assert.ok(rect.w >= MIN_CROP);
  assert.ok(rect.h >= MIN_CROP);
  assert.ok(Math.abs(rect.x - 0.3) < 1e-9);
  assert.ok(Math.abs(rect.y - 0.3) < 1e-9);
});

test("inflateCrop adds padding without leaving the image", () => {
  const inflated = inflateCrop({ x: 0, y: 0.2, w: 0.2, h: 0.2 }, 0.05);
  assert.equal(inflated.x, 0);
  assert.ok(inflated.w > 0.2);
  assert.ok(inflated.x + inflated.w <= 1 + 1e-9);
});
