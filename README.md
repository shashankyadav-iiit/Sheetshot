# Sheetshot

A screenshot of a table should just be a spreadsheet.

Drop a photo of a table. Get CSV.

$9 lifetime. Processing stays in the browser.

Sheetshot is a tiny paid web product: you drop a screenshot (or phone photo) of a table — bank statement, marks sheet, price list, dashboard, Excel on a monitor — and get an editable grid you can download as CSV or `.xlsx`. OCR and grid reconstruction run entirely in the browser with Tesseract.js. The image never leaves the device.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional until you hook Google + Polar
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page has a live dropzone; the app lives at `/app`. Click **Try a sample** to run the pipeline without uploading a file.

```bash
npm run build
npm start
npm test
```

Sample table images are generated with:

```bash
python3 scripts/generate-samples.py
```

(`pillow` is required for that script: `pip install pillow`.)

## How it works

1. The image is downscaled, EXIF-rotated, contrast-stretched, inverted if it looks like a dark screenshot, and lightly deskewed.
2. Tesseract.js (WebAssembly) returns words plus bounding boxes.
3. Rows are clustered by Y, columns by X. Nearby numeric fragments such as `1` `,00` `,000` are glued into `1,00,000`.
4. You edit cells, then download CSV / `.xlsx` or copy TSV.

The first three exports need no account. Lifetime unlock is a Polar order on the Google account you sign in with.

## Env vars

| Variable | Purpose |
| --- | --- |
| `POLAR_ACCESS_TOKEN` | Organization access token from Polar (`checkouts:write`, `orders:read`, `customers:read`) |
| `POLAR_PRODUCT_ID` | Product ID for **Sheetshot Lifetime** |
| `SUCCESS_URL` | Absolute URL Polar redirects to after payment, e.g. `https://your-domain.com/success?checkout_id={CHECKOUT_ID}` |
| `POLAR_SERVER` | `sandbox` or `production` |
| `AUTH_SECRET` | Auth.js secret (`npx auth secret`). Required for real sign-in |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `AUTH_URL` | Canonical site URL. Production: `https://sheetshot-five.vercel.app`. Local: `http://localhost:3000` |

If Polar vars are missing, `/checkout` does not crash. It redirects to `/unlock?reason=not-configured`. If Google vars are missing, **Sign in** and Unlock go to `/unlock?reason=google-not-configured` instead of crashing. In `NODE_ENV=development` a clearly labeled **Local DEV unlock** writes `sheetshot_unlocked=true` so you can test the paid UI without Polar.

## Google OAuth (Auth.js)

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (Web application).
2. Authorized JavaScript origins: `https://sheetshot-five.vercel.app` and `http://localhost:3000`.
3. Authorized redirect URIs:
   - `https://sheetshot-five.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
4. Copy the client ID and secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`. Set `AUTH_SECRET`. Set `AUTH_URL` to the origin you are running.

Sign-in is Auth.js / NextAuth with the Google provider (`next-auth`). The header shows **Sign in**, then avatar + **Sign out**.

## Create the Polar product and take $9

1. Create an account at [Polar](https://polar.sh). Use [sandbox.polar.sh](https://sandbox.polar.sh) while testing (`POLAR_SERVER=sandbox`).
2. Create an organization.
3. **Products → New product**
   - Name: `Sheetshot Lifetime`
   - Pricing: **one-time**, **$9 USD** (not a subscription)
4. Copy the product ID (from the product page / URL). That is `POLAR_PRODUCT_ID`.
5. Organization settings → developers / access tokens → create an **organization access token** with checkout, orders read, and customers read. That is `POLAR_ACCESS_TOKEN`.
6. Set `SUCCESS_URL` to your deployed origin plus `/success?checkout_id={CHECKOUT_ID}`. Polar substitutes the checkout id. Locally:

   ```
   SUCCESS_URL=http://localhost:3000/success?checkout_id={CHECKOUT_ID}
   ```

7. Restart `npm run dev`. Sign in with Google, then visit `/checkout` (or click **Unlock**). Checkout sends Polar `customerEmail` (and name) from the Google session. After payment Polar sends the buyer to `/success`, which **does not** set a localStorage paid flag. It verifies the signed-in email against Polar orders/customers. Visiting `/success` logged out prompts Google sign-in, then the same Polar lookup.

On any later device: **Sign in with Google** → Sheetshot looks up Polar by that email → if there is a paid Sheetshot Lifetime order, the session is unlocked (`paid` JWT claim).

Checkout is the Polar Next.js adapter at `/checkout` (`@polar-sh/nextjs`), following [Polar’s Next.js adapter docs](https://polar.sh/docs/integrate/sdk/adapters/nextjs). The route injects `?products=$POLAR_PRODUCT_ID` plus the signed-in email.

## Free tier

Three successful exports (CSV, `.xlsx`, or Copy TSV) per browser, counted in `localStorage` as `sheetshot_export_count`. No login required for those three. After that, this browser cannot start a new OCR run, edit or copy the last grid, or download until the Google account is unlocked via Polar. A paywall modal points at `/checkout`. Closing it with **Not now** leaves those locks in place.

## Out of scope (v1)

Teams, history sync, server-side OCR, subscriptions, Chrome extension.
