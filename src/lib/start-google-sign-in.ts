export const GOOGLE_SIGNIN_ACTION = "/api/auth/signin/google";

export type GoogleSignInForm = {
  action: string;
  method: "POST";
  fields: { csrfToken: string; callbackUrl: string };
};

/**
 * Top-level form POST so Set-Cookie (PKCE + state) and the 302 to Google happen
 * on one navigation. next-auth/react signIn() uses fetch + X-Auth-Return-Redirect
 * and then assigns window.location; a second click (or a dropped fetch cookie)
 * leaves a verifier that does not match the code_challenge Google redeemed —
 * production logs that as invalid_grant / "Invalid code verifier."
 */
export function googleSignInForm(callbackUrl: string, csrfToken: string): GoogleSignInForm {
  return {
    action: GOOGLE_SIGNIN_ACTION,
    method: "POST",
    fields: { csrfToken, callbackUrl },
  };
}

export function submitGoogleSignInForm(callbackUrl: string, csrfToken: string): void {
  const spec = googleSignInForm(callbackUrl, csrfToken);
  const form = document.createElement("form");
  form.method = spec.method;
  form.action = spec.action;
  form.style.display = "none";
  for (const [name, value] of Object.entries(spec.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

let inFlight: Promise<void> | null = null;

export function resetGoogleSignInForTests(): void {
  inFlight = null;
}

export function startGoogleSignIn(callbackUrl: string): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = beginGoogleSignIn(callbackUrl).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function beginGoogleSignIn(callbackUrl: string): Promise<void> {
  try {
    const res = await fetch("/api/entitlement", { cache: "no-store" });
    const data = (await res.json()) as { googleAuth?: boolean };
    if (!data.googleAuth) {
      window.location.href = "/unlock?reason=google-not-configured";
      return;
    }
  } catch {
    window.location.href = "/unlock?reason=google-not-configured";
    return;
  }

  const csrfRes = await fetch("/api/auth/csrf", { cache: "no-store" });
  const csrfData = (await csrfRes.json()) as { csrfToken?: string };
  if (!csrfRes.ok || !csrfData.csrfToken) {
    window.location.href = "/unlock?reason=google-not-configured";
    return;
  }

  submitGoogleSignInForm(callbackUrl, csrfData.csrfToken);
}
