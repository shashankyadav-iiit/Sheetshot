import { Checkout } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { auth, signIn } from "@/auth";
import { googleAuthConfigured } from "@/lib/auth-env";

export const dynamic = "force-dynamic";

function polarServer(): "sandbox" | "production" {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

function polarConfigured(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN?.trim() && process.env.POLAR_PRODUCT_ID?.trim());
}

function successUrlFor(request: NextRequest): string {
  const origin = request.nextUrl.origin;
  const configured = process.env.SUCCESS_URL?.trim();
  if (configured) {
    try {
      // Validate absolute URL without re-serializing so {CHECKOUT_ID} stays intact.
      void new URL(configured);
      return configured;
    } catch {
      // fall through to origin-based default
    }
  }
  return `${origin}/success?checkout_id={CHECKOUT_ID}`;
}

function redirectUnlock(request: NextRequest, reason: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = `reason=${encodeURIComponent(reason)}`;
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!polarConfigured()) {
    return redirectUnlock(request, "not-configured");
  }
  if (!googleAuthConfigured()) {
    return redirectUnlock(request, "google-not-configured");
  }

  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email) {
    return signIn("google", { redirectTo: "/checkout" });
  }

  const productId = process.env.POLAR_PRODUCT_ID!.trim();
  const origin = request.nextUrl.origin;
  const rewritten = request.nextUrl.clone();
  if (!rewritten.searchParams.getAll("products").length) {
    rewritten.searchParams.set("products", productId);
  }
  rewritten.searchParams.set("customerEmail", email);
  const name = session?.user?.name?.trim();
  if (name) {
    rewritten.searchParams.set("customerName", name);
  }

  const handler = Checkout({
    accessToken: process.env.POLAR_ACCESS_TOKEN,
    successUrl: successUrlFor(request),
    returnUrl: `${origin}/app`,
    server: polarServer(),
    theme: "light",
    includeCheckoutId: true,
  });

  return handler(new NextRequest(rewritten, { headers: request.headers }));
}
