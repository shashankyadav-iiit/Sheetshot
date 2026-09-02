import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  checkoutLooksPaid,
  emailHasPaidSheetshot,
  emailsMatch,
  orderGrantsLifetime,
  polarEmail,
  polarGet,
  polarListItems,
  polarProductIds,
  polarServer,
} from "./polar";

const envKeys = ["POLAR_ACCESS_TOKEN", "POLAR_PRODUCT_ID", "POLAR_SERVER"] as const;
const env = process.env as Record<string, string | undefined>;
const snapshot = Object.fromEntries(envKeys.map((key) => [key, env[key]]));
const originalFetch = globalThis.fetch;

afterEach(() => {
  for (const key of envKeys) {
    if (snapshot[key] === undefined) delete env[key];
    else env[key] = snapshot[key];
  }
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

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
    orderGrantsLifetime({ paid: true, product: { id: "prod_1" } }, "prod_1"),
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
      { status: "confirmed", customerEmail: "ada@example.com", product: { id: "prod_1" } },
      "ada@example.com",
      "prod_1",
    ),
    true,
  );
  assert.equal(
    checkoutLooksPaid(
      { status: "succeeded", customer: { email: "Ada@example.com" }, productId: "prod_1" },
      "ada@example.com",
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
  assert.equal(
    checkoutLooksPaid(
      { status: "succeeded", product_id: "prod_1" },
      "ada@example.com",
      "prod_1",
    ),
    false,
  );
});

test("polarEmail and polarProductIds read snake_case, camelCase, and nested fields", () => {
  assert.equal(polarEmail({ customer_email: "a@b.com" }), "a@b.com");
  assert.equal(polarEmail({ customerEmail: "a@b.com" }), "a@b.com");
  assert.equal(polarEmail({ customer: { email: "a@b.com" } }), "a@b.com");
  assert.deepEqual(polarProductIds({ product_id: "prod_1" }), ["prod_1"]);
  assert.deepEqual(polarProductIds({ productId: "prod_1" }), ["prod_1"]);
  assert.deepEqual(polarProductIds({ product: { id: "prod_1" } }), ["prod_1"]);
  assert.deepEqual(polarProductIds({ products: ["prod_1"] }), ["prod_1"]);
  assert.equal(polarProductIds({ id: "checkout-not-a-product" }).includes("checkout-not-a-product"), false);
});

test("polarListItems accepts items, data, or a raw array", () => {
  assert.deepEqual(polarListItems({ items: [{ id: 1 }] }), [{ id: 1 }]);
  assert.deepEqual(polarListItems({ data: [{ id: 2 }] }), [{ id: 2 }]);
  assert.deepEqual(polarListItems([{ id: 3 }]), [{ id: 3 }]);
  assert.deepEqual(polarListItems(null), []);
});

test("polarServer stays sandbox unless POLAR_SERVER is production", () => {
  delete env.POLAR_SERVER;
  assert.equal(polarServer(), "sandbox");
  env.POLAR_SERVER = "sandbox";
  assert.equal(polarServer(), "sandbox");
  env.POLAR_SERVER = "production";
  assert.equal(polarServer(), "production");
});

test("polarGet aborts and returns null instead of hanging", async () => {
  env.POLAR_ACCESS_TOKEN = "test-token";
  env.POLAR_PRODUCT_ID = "prod_1";
  env.POLAR_SERVER = "sandbox";

  globalThis.fetch = async () => new Promise(() => {});

  const started = Date.now();
  const result = await polarGet("/v1/checkouts/slow", 40);
  assert.equal(result, null);
  assert.ok(Date.now() - started < 1500);
});

test("emailHasPaidSheetshot treats confirmed checkout without email as paid via matching order", async () => {
  env.POLAR_ACCESS_TOKEN = "test-token";
  env.POLAR_PRODUCT_ID = "prod_1";
  env.POLAR_SERVER = "sandbox";

  const checkoutId = "81a6eed1-66d0-40de-b2c9-0cf44973d20d";
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.match(url, /sandbox-api\.polar\.sh/);
    if (url.includes(`/v1/checkouts/${checkoutId}`)) {
      return jsonResponse({ status: "confirmed", product_id: "prod_1" });
    }
    if (url.includes("/v1/orders?") && url.includes(`checkout_id=${checkoutId}`)) {
      return jsonResponse({
        items: [
          {
            paid: true,
            product: { id: "prod_1" },
            customerEmail: "minimonsterlab@gmail.com",
          },
        ],
      });
    }
    return jsonResponse({ items: [] });
  };

  assert.equal(
    await emailHasPaidSheetshot("MiniMonsterLab@gmail.com", checkoutId),
    true,
  );
});

test("emailHasPaidSheetshot grants access from camelCase succeeded checkout email", async () => {
  env.POLAR_ACCESS_TOKEN = "test-token";
  env.POLAR_PRODUCT_ID = "prod_1";
  env.POLAR_SERVER = "production";

  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.match(url, /https:\/\/api\.polar\.sh/);
    if (url.includes("/v1/checkouts/")) {
      return jsonResponse({
        status: "succeeded",
        customerEmail: "minimonsterlab@gmail.com",
        product: { id: "prod_1" },
      });
    }
    return jsonResponse({ items: [] });
  };

  assert.equal(
    await emailHasPaidSheetshot("minimonsterlab@gmail.com", "chk_1"),
    true,
  );
});

test("emailHasPaidSheetshot does not grant access when checkout email does not match the session", async () => {
  env.POLAR_ACCESS_TOKEN = "test-token";
  env.POLAR_PRODUCT_ID = "prod_1";
  env.POLAR_SERVER = "sandbox";

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("/v1/checkouts/")) {
      return jsonResponse({
        status: "succeeded",
        customer_email: "other@example.com",
        product_id: "prod_1",
      });
    }
    if (url.includes("/v1/orders?")) {
      return jsonResponse({
        items: [
          {
            paid: true,
            product_id: "prod_1",
            customer: { email: "other@example.com" },
          },
        ],
      });
    }
    return jsonResponse({ items: [] });
  };

  assert.equal(await emailHasPaidSheetshot("minimonsterlab@gmail.com", "chk_1"), false);
});

