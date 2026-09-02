export const SUCCESS_POLL_ATTEMPTS = 5;
export const SUCCESS_POLL_INTERVAL_MS = 2500;

export type ConfirmOutcome =
  | { state: "paid"; email: string | null }
  | { state: "unpaid"; email: string | null }
  | { state: "error"; email: string | null };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Poll /api/entitlement a few times while Polar may still be finalizing the order.
 * Returns as soon as Polar reports paid.
 */
export async function confirmPolarEntitlement(options: {
  checkoutId?: string | null;
  fetchImpl?: FetchLike;
  delay?: (ms: number) => Promise<void>;
  attempts?: number;
  intervalMs?: number;
  shouldStop?: () => boolean;
}): Promise<ConfirmOutcome> {
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const delay = options.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const attempts = options.attempts ?? SUCCESS_POLL_ATTEMPTS;
  const intervalMs = options.intervalMs ?? SUCCESS_POLL_INTERVAL_MS;
  let last: ConfirmOutcome = { state: "error", email: null };

  for (let i = 0; i < attempts; i++) {
    if (options.shouldStop?.()) return last;
    try {
      const url = options.checkoutId
        ? `/api/entitlement?checkout_id=${encodeURIComponent(options.checkoutId)}`
        : "/api/entitlement";
      const res = await fetchImpl(url, { cache: "no-store" });
      if (!res.ok) {
        last = { state: "error", email: last.state === "unpaid" ? last.email : null };
      } else {
        const data = (await res.json()) as { paid?: boolean; email?: string | null };
        const email = data.email ?? null;
        if (data.paid) return { state: "paid", email };
        last = { state: "unpaid", email };
      }
    } catch {
      if (options.shouldStop?.()) return last;
      last = { state: "error", email: last.state === "unpaid" ? last.email : null };
    }
    if (i < attempts - 1) await delay(intervalMs);
  }

  return last;
}

/** Refresh the JWT paid flag without blocking the Unlocked UI. */
export function refreshSessionInBackground(update: () => Promise<unknown>): void {
  void Promise.resolve()
    .then(() => update())
    .catch(() => {});
}
