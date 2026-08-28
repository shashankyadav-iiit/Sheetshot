# Sheetshot

A screenshot of a table should just be a spreadsheet.

Drop a photo of a table. Get CSV.

$9 lifetime. Processing stays in the browser.

Sheetshot is a tiny paid web product: you drop a screenshot (or phone photo) of a table — bank statement, marks sheet, price list, dashboard, Excel on a monitor — and get an editable grid you can download as CSV or `.xlsx`. OCR and grid reconstruction run entirely in the browser with Tesseract.js. The image never leaves the device.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional until you hook Polar
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

There is no account. Lifetime unlock is a `localStorage` flag on this browser.

## Env vars

| Variable | Purpose |
| --- | --- |
| `POLAR_ACCESS_TOKEN` | Organization access token from Polar |
| `POLAR_PRODUCT_ID` | Product ID for **Sheetshot Lifetime** |
| `SUCCESS_URL` | Absolute URL Polar redirects to after payment, e.g. `https://your-domain.com/success?checkout_id={CHECKOUT_ID}` |
| `POLAR_SERVER` | `sandbox` or `production` |

If these are missing, `/checkout` does not crash. It redirects to `/unlock?reason=not-configured` and explains how to finish setup. In `NODE_ENV=development` a clearly labeled **Local DEV unlock** writes `sheetshot_unlocked=true` so you can test the paid path without Polar.

## Create the Polar product and take $9

1. Create an account at [Polar](https://polar.sh). Use [sandbox.polar.sh](https://sandbox.polar.sh) while testing (`POLAR_SERVER=sandbox`).
2. Create an organization.
3. **Products → New product**
   - Name: `Sheetshot Lifetime`
   - Pricing: **one-time**, **$9 USD** (not a subscription)
4. Copy the product ID (from the product page / URL). That is `POLAR_PRODUCT_ID`.
5. Organization settings → developers / access tokens → create an **organization access token** with checkout permission. That is `POLAR_ACCESS_TOKEN`.
6. Set `SUCCESS_URL` to your deployed origin plus `/success?checkout_id={CHECKOUT_ID}`. Polar substitutes the checkout id. Locally:

   ```
   SUCCESS_URL=http://localhost:3000/success?checkout_id={CHECKOUT_ID}
   ```

7. Restart `npm run dev`. Visit `/checkout` (or click **Unlock**). After payment Polar sends the buyer to `/success`, which sets `sheetshot_unlocked=true`.

Checkout is the Polar Next.js adapter at `/checkout` (`@polar-sh/nextjs`), following [Polar’s Next.js adapter docs](https://polar.sh/docs/integrate/sdk/adapters/nextjs). The route injects `?products=$POLAR_PRODUCT_ID` for you.

## Free tier

Three successful exports (CSV, `.xlsx`, or Copy TSV) per browser, counted in `localStorage` as `sheetshot_export_count`. After that, download/copy lock and a paywall modal points at `/checkout`.

## Out of scope (v1)

Login, teams, history sync, server-side OCR, subscriptions, Chrome extension.
