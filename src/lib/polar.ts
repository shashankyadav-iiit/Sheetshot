export function polarConfigured(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN?.trim() && process.env.POLAR_PRODUCT_ID?.trim());
}

export function polarServer(): "sandbox" | "production" {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

function polarApiBase(): string {
  return polarServer() === "production" ? "https://api.polar.sh" : "https://sandbox-api.polar.sh";
}

export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function orderGrantsLifetime(
  order: {
    paid?: boolean;
    status?: string;
    product_id?: string | null;
    productId?: string | null;
    product?: { id?: string | null } | null;
  },
  productId: string,
): boolean {
  const pid = order.product_id ?? order.productId ?? order.product?.id ?? null;
  if (pid && pid !== productId) return false;
  if (order.paid === true) return true;
  const status = order.status?.toLowerCase();
  return status === "paid";
}

export function checkoutLooksPaid(
  checkout: {
    status?: string;
    customer_email?: string | null;
    customerEmail?: string | null;
    products?: Array<{ id?: string }> | null;
    product_id?: string | null;
  },
  email: string,
  productId: string,
): boolean {
  const status = checkout.status?.toLowerCase();
  if (status !== "succeeded" && status !== "confirmed") return false;
  const checkoutEmail = checkout.customer_email ?? checkout.customerEmail;
  if (!emailsMatch(checkoutEmail, email)) return false;
  const productIds = [
    checkout.product_id,
    ...(checkout.products ?? []).map((p) => p.id),
  ].filter(Boolean);
  if (productIds.length > 0 && !productIds.includes(productId)) return false;
  return true;
}

type PolarList<T> = { items?: T[] };

async function polarGet<T>(path: string): Promise<T | null> {
  const token = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!token) return null;
  try {
    const res = await fetch(`${polarApiBase()}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function emailHasPaidSheetshot(
  email: string,
  checkoutId?: string | null,
): Promise<boolean> {
  if (!polarConfigured()) return false;
  const productId = process.env.POLAR_PRODUCT_ID!.trim();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;

  if (checkoutId?.trim()) {
    const checkout = await polarGet<{
      status?: string;
      customer_email?: string | null;
      customerEmail?: string | null;
      products?: Array<{ id?: string }>;
      product_id?: string | null;
    }>(`/v1/checkouts/${encodeURIComponent(checkoutId.trim())}`);
    if (checkout && checkoutLooksPaid(checkout, normalized, productId)) return true;

    const byCheckout = await polarGet<PolarList<{
      paid?: boolean;
      status?: string;
      product_id?: string | null;
      productId?: string | null;
      product?: { id?: string | null } | null;
      customer?: { email?: string | null };
    }>>(`/v1/orders/?checkout_id=${encodeURIComponent(checkoutId.trim())}&limit=20`);
    if (
      (byCheckout?.items ?? []).some(
        (order) =>
          orderGrantsLifetime(order, productId) && emailsMatch(order.customer?.email, normalized),
      )
    ) {
      return true;
    }
  }

  const customers = await polarGet<PolarList<{ id?: string; email?: string }>>(
    `/v1/customers/?email=${encodeURIComponent(normalized)}&limit=10`,
  );
  let customer = (customers?.items ?? []).find((item) => emailsMatch(item.email, normalized));
  if (!customer?.id) {
    const searched = await polarGet<PolarList<{ id?: string; email?: string }>>(
      `/v1/customers/?query=${encodeURIComponent(normalized)}&limit=10`,
    );
    customer = (searched?.items ?? []).find((item) => emailsMatch(item.email, normalized));
  }
  if (!customer?.id) return false;

  const orders = await polarGet<PolarList<{
    paid?: boolean;
    status?: string;
    product_id?: string | null;
    productId?: string | null;
    product?: { id?: string | null } | null;
  }>>(
    `/v1/orders/?customer_id=${encodeURIComponent(customer.id)}&product_id=${encodeURIComponent(productId)}&limit=50`,
  );
  return (orders?.items ?? []).some((order) => orderGrantsLifetime(order, productId));
}
