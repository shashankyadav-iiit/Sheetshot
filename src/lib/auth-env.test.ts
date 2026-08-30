import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { authSecret, googleAuthConfigured, useSecureAuthCookies } from "./auth-env";

const keys = [
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "AUTH_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "VERCEL",
  "NODE_ENV",
] as const;

const env = process.env as Record<string, string | undefined>;
const snapshot = Object.fromEntries(keys.map((key) => [key, env[key]]));

afterEach(() => {
  for (const key of keys) {
    if (snapshot[key] === undefined) delete env[key];
    else env[key] = snapshot[key];
  }
});

test("google auth is configured only when both Google env vars are non-empty", () => {
  env.AUTH_GOOGLE_ID = " id ";
  env.AUTH_GOOGLE_SECRET = " secret ";
  assert.equal(googleAuthConfigured(), true);

  env.AUTH_GOOGLE_SECRET = "   ";
  assert.equal(googleAuthConfigured(), false);
});

test("auth secret prefers AUTH_SECRET and never prints it", () => {
  env.AUTH_SECRET = "  real-secret  ";
  assert.equal(authSecret(), "real-secret");
  delete env.AUTH_SECRET;
  assert.equal(authSecret().includes("placeholder"), true);
});

test("secure cookies follow AUTH_URL / NEXTAUTH_URL protocol, then Vercel/production", () => {
  env.AUTH_URL = "https://sheetshot-five.vercel.app";
  env.NODE_ENV = "development";
  delete env.VERCEL;
  assert.equal(useSecureAuthCookies(), true);

  env.AUTH_URL = "http://localhost:3000";
  assert.equal(useSecureAuthCookies(), false);

  delete env.AUTH_URL;
  env.NEXTAUTH_URL = "https://example.com";
  assert.equal(useSecureAuthCookies(), true);

  delete env.NEXTAUTH_URL;
  env.VERCEL = "1";
  env.NODE_ENV = "development";
  assert.equal(useSecureAuthCookies(), true);

  delete env.VERCEL;
  env.NODE_ENV = "development";
  assert.equal(useSecureAuthCookies(), false);
});
