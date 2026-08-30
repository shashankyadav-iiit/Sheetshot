import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  GOOGLE_SIGNIN_ACTION,
  googleSignInForm,
  resetGoogleSignInForTests,
  startGoogleSignIn,
  submitGoogleSignInForm,
} from "./start-google-sign-in";

afterEach(() => {
  resetGoogleSignInForTests();
});

test("Google sign-in form is a same-origin POST without X-Auth-Return-Redirect JSON mode", () => {
  const spec = googleSignInForm("/app", "csrf-token");
  assert.equal(spec.action, GOOGLE_SIGNIN_ACTION);
  assert.equal(spec.method, "POST");
  assert.deepEqual(spec.fields, { csrfToken: "csrf-token", callbackUrl: "/app" });
  assert.equal("json" in spec.fields, false);
});

test("submitGoogleSignInForm posts hidden csrf and callback fields", () => {
  const submitted: Array<{ action: string; method: string; fields: Record<string, string> }> = [];
  const inputs: Array<{ name: string; value: string }> = [];

  const form = {
    method: "",
    action: "",
    style: { display: "" },
    appendChild(node: { name: string; value: string }) {
      inputs.push({ name: node.name, value: node.value });
      return node;
    },
    submit() {
      submitted.push({
        action: this.action,
        method: this.method,
        fields: Object.fromEntries(inputs.map((input) => [input.name, input.value])),
      });
    },
  };

  const previousDocument = globalThis.document;
  (globalThis as { document?: unknown }).document = {
    createElement(tag: string) {
      if (tag === "form") return form;
      return { type: "", name: "", value: "" };
    },
    body: { appendChild() {} },
  };

  try {
    submitGoogleSignInForm("/checkout", "tok");
  } finally {
    if (previousDocument === undefined) delete (globalThis as { document?: unknown }).document;
    else (globalThis as { document: unknown }).document = previousDocument;
  }

  assert.deepEqual(submitted, [
    {
      action: GOOGLE_SIGNIN_ACTION,
      method: "POST",
      fields: { csrfToken: "tok", callbackUrl: "/checkout" },
    },
  ]);
});

test("startGoogleSignIn coalesces overlapping clicks onto one CSRF + form POST", async () => {
  const fetches: string[] = [];
  let submits = 0;
  let releaseEntitlement: (() => void) | undefined;
  const entitlementGate = new Promise<void>((resolve) => {
    releaseEntitlement = resolve;
  });

  const previous = {
    fetch: globalThis.fetch,
    document: globalThis.document,
    location: (globalThis as { window?: { location?: { href: string } } }).window,
  };

  (globalThis as { fetch: typeof fetch }).fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    fetches.push(url);
    if (url.includes("/api/entitlement")) {
      await entitlementGate;
      return new Response(JSON.stringify({ googleAuth: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/api/auth/csrf")) {
      return new Response(JSON.stringify({ csrfToken: "csrf-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  (globalThis as { document?: unknown }).document = {
    createElement(tag: string) {
      if (tag === "form") {
        return {
          method: "",
          action: "",
          style: { display: "" },
          appendChild() {},
          submit() {
            submits += 1;
          },
        };
      }
      return { type: "", name: "", value: "" };
    },
    body: { appendChild() {} },
  };

  try {
    const first = startGoogleSignIn("/app");
    const second = startGoogleSignIn("/app");
    assert.equal(first, second);
    releaseEntitlement?.();
    await first;
    await second;
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = previous.fetch;
    if (previous.document === undefined) delete (globalThis as { document?: unknown }).document;
    else (globalThis as { document: unknown }).document = previous.document;
    void previous.location;
  }

  assert.equal(fetches.filter((url) => url.includes("/api/entitlement")).length, 1);
  assert.equal(fetches.filter((url) => url.includes("/api/auth/csrf")).length, 1);
  assert.equal(submits, 1);
});

test("startGoogleSignIn sends users to unlock when Google is not configured", async () => {
  const hrefs: string[] = [];
  const previous = {
    fetch: globalThis.fetch,
    window: (globalThis as { window?: { location: { href: string } } }).window,
  };

  (globalThis as { fetch: typeof fetch }).fetch = async () =>
    new Response(JSON.stringify({ googleAuth: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  (globalThis as { window: { location: { href: string } } }).window = {
    location: {
      get href() {
        return hrefs.at(-1) ?? "";
      },
      set href(value: string) {
        hrefs.push(value);
      },
    },
  };

  try {
    await startGoogleSignIn("/app");
  } finally {
    (globalThis as { fetch: typeof fetch }).fetch = previous.fetch;
    if (previous.window === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window: unknown }).window = previous.window;
  }

  assert.deepEqual(hrefs, ["/unlock?reason=google-not-configured"]);
});
