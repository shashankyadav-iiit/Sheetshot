export const POLAR_FETCH_TIMEOUT_MS = 8_000;

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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/** Email from Polar checkout/order payloads (snake_case, camelCase, nested customer). */
export function polarEmail(value: unknown): string | null {
  const rec = asRecord(value);
  if (!rec) return null;
  for (const candidate of [rec.customer_email, rec.customerEmail, rec.email]) {
    const email = stringOrNull(candidate);
    if (email) return email;
  }
  return polarEmail(rec.customer);
}

function addProductId(value: unknown, into: Set<string>): void {
  const id = stringOrNull(value);
  if (id) into.add(id);
}

function collectProductLike(value: unknown, into: Set<string>): void {
  if (value == null) return;
  if (typeof value === "string") {
    addProductId(value, into);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectProductLike(item, into);
    return;
  }
  const rec = asRecord(value);
  if (!rec) return;
  addProductId(rec.id, into);
  addProductId(rec.product_id, into);
  addProductId(rec.productId, into);
  if (rec.product) collectProductLike(rec.product, into);
}

/** Product IDs from Polar checkout/order payloads. Does not treat the object `id` as a product. */
export function polarProductIds(value: unknown): string[] {
  const rec = asRecord(value);
  if (!rec) return [];
  const ids = new Set<string>();
  addProductId(rec.product_id, ids);
  addProductId(rec.productId, ids);
  collectProductLike(rec.product, ids);
  collectProductLike(rec.products, ids);
  return [...ids];
}

function hasMatchingProduct(value: unknown, productId: string): boolean {
  const ids = polarProductIds(value);
  return ids.length === 0 || ids.includes(productId);
}

export function checkoutStatusPaid(status: string | null | undefined): boolean {
  const normalized = status?.trim().toLowerCase();
  return normalized === "succeeded" || normalized === "confirmed";
}

export type PolarOrderLike = {
  paid?: boolean;
  status?: string;
  product_id?: string | null;
  productId?: string | null;
  product?: { id?: string | null } | string | null;
  products?: Array<{ id?: string } | string> | null;
  customer?: { email?: string | null } | null;
  customer_email?: string | null;
  customerEmail?: string | null;
};

export function orderGrantsLifetime(order: PolarOrderLike, productId: string): boolean {
  if (!hasMatchingProduct(order, productId)) return false;
  if (order.paid === true) return true;
  const status = order.status?.toLowerCase();
  return status === "paid";
}

export type PolarCheckoutLike = {
  status?: string;
  customer_email?: string | null;
  customerEmail?: string | null;
  customer?: { email?: string | null } | null;
  products?: Array<{ id?: string } | string> | null;
  product_id?: string | null;
  productId?: string | null;
  product?: { id?: string | null } | string | null;
};

export function checkoutLooksPaid(
  checkout: PolarCheckoutLike,
  email: string,
  productId: string,
): boolean {
  if (!checkoutStatusPaid(checkout.status)) return false;
  if (!hasMatchingProduct(checkout, productId)) return false;
  const checkoutEmail = polarEmail(checkout);
  if (!checkoutEmail) return false;
  return emailsMatch(checkoutEmail, email);
}

export function checkoutConfirmedForProduct(
  checkout: PolarCheckoutLike,
  productId: string,
): boolean {
  return checkoutStatusPaid(checkout.status) && hasMatchingProduct(checkout, productId);
}

export function polarListItems<T>(body: unknown): T[] {
  if (!body) return [];
  if (Array.isArray(body)) return body as T[];
  const rec = asRecord(body);
  if (!rec) return [];
  if (Array.isArray(rec.items)) return rec.items as T[];
  if (Array.isArray(rec.data)) return rec.data as T[];
  const result = asRecord(rec.result);
  if (result && Array.isArray(result.items)) return result.items as T[];
  return [];
}

/** Polar list endpoints use a trailing slash (`/v1/orders/`, `/v1/customers/`). */
export function polarCollectionPath(
  collection: "orders" | "customers",
  query: Record<string, string | number | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `/v1/${collection}/?${qs}` : `/v1/${collection}/`;
}

/** Polar HTTP GET. AbortSignal timeout (~8s); returns null instead of hanging. */
export async function polarGet<T>(
  path: string,
  timeoutMs = POLAR_FETCH_TIMEOUT_MS,
): Promise<T | null> {
  const token = process.env.POLAR_ACCESS_TOKEN?.trim();
  if (!token) return null;

  const controller = new AbortController();
  const signal =
    typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(timeoutMs) : controller.signal;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await Promise.race([
      fetch(`${polarApiBase()}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
        signal,
      }),
      new Promise<never>((_, reject) => {
        const onAbort = () => reject(new Error("polar-timeout"));
        if (controller.signal.aborted) onAbort();
        else controller.signal.addEventListener("abort", onAbort, { once: true });
      }),
    ]);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function orderPaidForEmail(order: PolarOrderLike, email: string, productId: string): boolean {
  return orderGrantsLifetime(order, productId) && emailsMatch(polarEmail(order), email);
}

async function paidProductOrdersForEmail(email: string, productId: string): Promise<boolean> {
  const byProduct = await polarGet<unknown>(
    polarCollectionPath("orders", {
      product_id: productId,
      limit: 100,
      sorting: "-created_at",
    }),
  );
  const productItems = polarListItems<PolarOrderLike>(byProduct);
  if (productItems.some((order) => orderPaidForEmail(order, email, productId))) return true;

  // Filter shape may 401/404 or return empty; scan recent org orders with orders:read only.
  if (byProduct == null || productItems.length === 0) {
    const recent = await polarGet<unknown>(
      polarCollectionPath("orders", { limit: 100, sorting: "-created_at" }),
    );
    return polarListItems<PolarOrderLike>(recent).some((order) =>
      orderPaidForEmail(order, email, productId),
    );
  }
  return false;
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
    const id = checkoutId.trim();
    const [checkout, byCheckout] = await Promise.all([
      polarGet<PolarCheckoutLike>(`/v1/checkouts/${encodeURIComponent(id)}`),
      polarGet<unknown>(polarCollectionPath("orders", { checkout_id: id, limit: 20 })),
    ]);

    if (checkout && checkoutLooksPaid(checkout, normalized, productId)) return true;

    const checkoutOrders = polarListItems<PolarOrderLike>(byCheckout);
    const paidOrderForSession = checkoutOrders.some((order) =>
      orderPaidForEmail(order, normalized, productId),
    );

    // Confirmed/succeeded checkout for our product: emails match (handled above),
    // or checkout has no email and a paid order for this checkout_id matches the session.
    if (
      checkout &&
      checkoutConfirmedForProduct(checkout, productId) &&
      !polarEmail(checkout) &&
      paidOrderForSession
    ) {
      return true;
    }
    if (paidOrderForSession) return true;
  }

  const [customers, searched] = await Promise.all([
    polarGet<unknown>(polarCollectionPath("customers", { email: normalized, limit: 10 })),
    polarGet<unknown>(polarCollectionPath("customers", { query: normalized, limit: 10 })),
  ]);
  const customer = [
    ...polarListItems<{ id?: string; email?: string }>(customers),
    ...polarListItems<{ id?: string; email?: string }>(searched),
  ].find((item) => emailsMatch(item.email, normalized));
  if (customer?.id) {
    const byCustomer = await polarGet<unknown>(
      polarCollectionPath("orders", {
        customer_id: customer.id,
        product_id: productId,
        limit: 50,
      }),
    );
    if (polarListItems<PolarOrderLike>(byCustomer).some((order) => orderGrantsLifetime(order, productId))) {
      return true;
    }
  }

  return paidProductOrdersForEmail(normalized, productId);
}
