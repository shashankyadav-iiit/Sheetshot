import assert from "node:assert/strict";
import { test } from "node:test";
import { checkoutLooksPaid, emailsMatch, orderGrantsLifetime } from "./polar";

test("emails match case-insensitively", () => {
  assert.equal(emailsMatch("Ada@Example.com", "ada@example.com"), true);
  assert.equal(emailsMatch("a@b.com", "c@d.com"), false);
  assert.equal(emailsMatch("", "a@b.com"), false);
});

test("paid Polar order for the lifetime product grants access", () => {
  assert.equal(
    orderGrantsLifetime({ paid: true, product_id: "prod_1" }, "prod_1"),
    true,
  );
  assert.equal(
    orderGrantsLifetime({ status: "paid", productId: "prod_1" }, "prod_1"),
    true,
  );
  assert.equal(
    orderGrantsLifetime({ paid: true, product_id: "other" }, "prod_1"),
    false,
  );
  assert.equal(
    orderGrantsLifetime({ paid: false, status: "refunded", product_id: "prod_1" }, "prod_1"),
    false,
  );
});

test("succeeded Polar checkout for the same email grants access", () => {
  assert.equal(
    checkoutLooksPaid(
      { status: "succeeded", customer_email: "ada@example.com", products: [{ id: "prod_1" }] },
      "Ada@example.com",
      "prod_1",
    ),
    true,
  );
  assert.equal(
    checkoutLooksPaid(
      { status: "open", customerEmail: "ada@example.com" },
      "ada@example.com",
      "prod_1",
    ),
    false,
  );
  assert.equal(
    checkoutLooksPaid(
      { status: "succeeded", customer_email: "other@example.com" },
      "ada@example.com",
      "prod_1",
    ),
    false,
  );
});
