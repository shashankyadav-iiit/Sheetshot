import assert from "node:assert/strict";
import { test } from "node:test";
import {
  beginConfirmRun,
  confirmPolarEntitlement,
  refreshSessionInBackground,
  SUCCESS_POLL_ATTEMPTS,
} from "./confirm-success";

test("confirmPolarEntitlement shows paid on the first entitlement hit without polling", async () => {
  const delays: number[] = [];
  let calls = 0;
  const outcome = await confirmPolarEntitlement({
    checkoutId: "81a6eed1-66d0-40de-b2c9-0cf44973d20d",
    delay: async (ms) => {
      delays.push(ms);
    },
    fetchImpl: async (url) => {
      calls += 1;
      assert.match(url, /checkout_id=81a6eed1-66d0-40de-b2c9-0cf44973d20d/);
      return new Response(JSON.stringify({ paid: true, email: "minimonsterlab@gmail.com" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.deepEqual(outcome, { state: "paid", email: "minimonsterlab@gmail.com" });
  assert.equal(calls, 1);
  assert.deepEqual(delays, []);
});

test("confirmPolarEntitlement retries unpaid Polar lag then returns paid", async () => {
  let calls = 0;
  const outcome = await confirmPolarEntitlement({
    checkoutId: "chk_1",
    delay: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          paid: calls >= 3,
          email: "ada@example.com",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  assert.deepEqual(outcome, { state: "paid", email: "ada@example.com" });
  assert.equal(calls, 3);
});

test("confirmPolarEntitlement ends unpaid after the retry budget", async () => {
  let calls = 0;
  const outcome = await confirmPolarEntitlement({
    delay: async () => {},
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({ paid: false, email: "ada@example.com" }), {
        status: 200,
      });
    },
  });
  assert.deepEqual(outcome, { state: "unpaid", email: "ada@example.com" });
  assert.equal(calls, SUCCESS_POLL_ATTEMPTS);
});

test("confirmPolarEntitlement ends error when entitlement never responds ok", async () => {
  const outcome = await confirmPolarEntitlement({
    delay: async () => {},
    fetchImpl: async () => new Response("nope", { status: 500 }),
  });
  assert.equal(outcome.state, "error");
});

test("refreshSessionInBackground does not wait for a hung session.update", async () => {
  let started = false;
  const finished = { value: false };
  refreshSessionInBackground(() => {
    started = true;
    return new Promise(() => {});
  });
  await Promise.resolve();
  assert.equal(started, true);
  assert.equal(finished.value, false);
});

test("beginConfirmRun remount after cleanup starts a new poll (Strict Mode trap)", async () => {
  const guard = { current: false };
  let started = 0;
  let applied = 0;
  const pending: Array<() => void> = [];

  const firstCleanup = beginConfirmRun(guard, (cancelled) => {
    started += 1;
    void (async () => {
      await new Promise<void>((resolve) => {
        pending.push(resolve);
      });
      if (cancelled()) return;
      applied += 1;
    })();
  });

  assert.equal(started, 1);
  assert.equal(guard.current, true);

  firstCleanup();
  assert.equal(guard.current, false, "cleanup must clear the guard so remount can poll");

  const secondCleanup = beginConfirmRun(guard, (cancelled) => {
    started += 1;
    void (async () => {
      await Promise.resolve();
      if (cancelled()) return;
      applied += 1;
    })();
  });

  assert.equal(started, 2);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(applied, 1, "the remounted run applies; the cancelled first run does not");

  pending[0]?.();
  await Promise.resolve();
  assert.equal(applied, 1);
  secondCleanup();
});

test("beginConfirmRun skips a concurrent start until cleanup clears the guard", () => {
  const guard = { current: false };
  let started = 0;
  const cleanup = beginConfirmRun(guard, () => {
    started += 1;
  });
  beginConfirmRun(guard, () => {
    started += 1;
  });
  assert.equal(started, 1);
  cleanup();
  beginConfirmRun(guard, () => {
    started += 1;
  });
  assert.equal(started, 2);
});
