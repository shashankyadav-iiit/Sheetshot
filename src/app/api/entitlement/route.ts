import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { googleAuthConfigured } from "@/lib/auth-env";
import { emailHasPaidSheetshot, polarConfigured } from "@/lib/polar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const checkoutId = new URL(request.url).searchParams.get("checkout_id");
  let paid = false;
  if (email) {
    paid = await emailHasPaidSheetshot(email, checkoutId);
  }
  return NextResponse.json({
    signedIn: Boolean(email),
    email,
    name: session?.user?.name ?? null,
    image: session?.user?.image ?? null,
    paid,
    googleAuth: googleAuthConfigured(),
    polar: polarConfigured(),
  });
}
