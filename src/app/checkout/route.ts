import { Checkout } from "@polar-sh/nextjs";
import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  if (!polarConfigured()) {
    const url = request.nextUrl.clone();
    url.pathname = "/unlock";
    url.search = "reason=not-configured";
    return NextResponse.redirect(url);
  }

  const productId = process.env.POLAR_PRODUCT_ID!.trim();
  const origin = request.nextUrl.origin;
  const rewritten = request.nextUrl.clone();
  if (!rewritten.searchParams.getAll("products").length) {
    rewritten.searchParams.set("products", productId);
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
