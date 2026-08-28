# Sheetshot

A screenshot of a table should just be a spreadsheet.

Drop a photo of a table. Get CSV.

$9 lifetime. Processing stays in the browser.

## How it works

Sheetshot is a fully client-side web app. When you drop in a photo:

1. [Tesseract.js](https://github.com/naptha/tesseract.js) runs OCR entirely in
   your browser (WebAssembly) — the image never leaves the tab.
2. The recognized word boxes are clustered into rows and columns to rebuild the
   table structure.
3. You get an editable grid you can fix up and export to CSV.

## Tech stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tesseract.js](https://github.com/naptha/tesseract.js) for in-browser OCR

## Development

Requires Node.js 20+.

```bash
npm install      # install dependencies
npm run dev      # start the dev server on http://localhost:5173
npm run build    # type-check and build for production
npm run preview  # preview the production build
npm run lint     # lint the source
npm run typecheck
```
