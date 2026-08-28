import { signIn } from "next-auth/react";

export async function startGoogleSignIn(callbackUrl: string): Promise<void> {
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
  await signIn("google", { callbackUrl });
}
