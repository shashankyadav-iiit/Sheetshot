export type LandingFaq = { q: string; a: string };

export type LandingPage = {
  slug: string;
  /** <title> text (the layout template appends " · Sheetshot"). */
  title: string;
  description: string;
  kicker: string;
  h1: string;
  h1Accent: string;
  intro: string;
  /** Short label used in cross-links and the footer. */
  linkLabel: string;
  steps: [string, string][];
  useCases: string[];
  tips: string[];
  bodyHeading: string;
  body: string[];
  faqs: LandingFaq[];
  related: string[];
};

const PRIVACY_FAQ: LandingFaq = {
  q: "Is my image uploaded anywhere?",
  a: "No. Sheetshot runs the OCR engine (Tesseract, compiled to WebAssembly) inside your browser tab. The picture is read on your device and never sent to a server, so it works for statements, marks and invoices you would not paste into an online converter.",
};

const PRICE_FAQ: LandingFaq = {
  q: "Is it free?",
  a: "Your first 3 successful exports are free on each browser, with no sign-up. After that, a one-time $9 payment unlocks unlimited exports on your Google account. There is no subscription and no per-image credit.",
};

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "jpg-to-excel",
    title: "JPG to Excel converter — turn a JPG/JPEG table into .xlsx",
    description:
      "Convert a JPG or JPEG image of a table into an editable Excel sheet. Private, in-browser OCR, fix cells before export, download .xlsx or CSV. 3 free exports.",
    kicker: "JPG / JPEG to Excel",
    h1: "Convert a JPG table",
    h1Accent: " into an Excel sheet.",
    intro:
      "Drop a .jpg or .jpeg of a table — a WhatsApp forward, a scanned page, a photo from your phone — and get real rows and columns you can edit and download as .xlsx.",
    linkLabel: "JPG to Excel",
    steps: [
      ["Drop the JPG", "Drag it in, pick it from your files, or paste it with Ctrl+V / ⌘V."],
      ["Crop and check", "Crop to the table, then fix any cell the OCR was unsure about in the grid."],
      ["Download .xlsx", "Download an Excel file, a CSV, or copy the grid as TSV."],
    ],
    useCases: [
      "Price lists and rate cards shared as JPGs in WhatsApp groups",
      "Scanned pages from a report or a register",
      "A JPG attachment someone sent instead of the spreadsheet",
      "Phone photos of printed tables",
    ],
    tips: [
      "JPG compression smears thin text. Use the original file, not a re-forwarded copy.",
      "Crop out headers, logos and page margins so only the grid is read.",
      "Straight-on shots beat angled ones. Sheetshot fixes EXIF rotation and a few degrees of skew.",
    ],
    bodyHeading: "Why JPGs are harder than screenshots — and what Sheetshot does about it",
    body: [
      "JPEG is lossy: every save and every chat forward adds blocky artefacts around letters. Before OCR, Sheetshot downscales huge photos, corrects EXIF rotation, inverts dark-mode images and straightens slight skew, so the text engine sees cleaner characters.",
      "Instead of dumping one blob of text, OCR returns each word with its position. Sheetshot groups words into rows by their vertical position and into columns by their horizontal position, then shows you the grid so you can merge, split or retype a cell before you export.",
    ],
    faqs: [
      {
        q: "Is JPG to Excel different from JPEG to Excel?",
        a: "No. .jpg and .jpeg are the same format with two file extensions. Both work the same way in Sheetshot.",
      },
      {
        q: "Will amounts with commas split into extra columns?",
        a: "No. OCR often breaks 1,00,000 or 12,500.00 into pieces; Sheetshot glues those pieces back into one cell, so Indian and international digit grouping stay intact.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["png-to-excel", "photo-to-excel", "image-to-excel", "screenshot-to-excel"],
  },
  {
    slug: "png-to-excel",
    title: "PNG to Excel — convert a PNG table screenshot to .xlsx",
    description:
      "Turn a PNG screenshot of a table into an editable Excel spreadsheet. Crisp PNG text gives the most accurate OCR. Runs in your browser; nothing is uploaded.",
    kicker: "PNG to Excel",
    h1: "PNG table in,",
    h1Accent: " Excel sheet out.",
    intro:
      "PNG screenshots are the best-case input for table OCR: sharp edges, no compression noise. Drop one in and download an .xlsx in seconds — the image never leaves your device.",
    linkLabel: "PNG to Excel",
    steps: [
      ["Paste or drop the PNG", "Snipping Tool, Win+Shift+S, ⌘⇧4 — paste straight from the clipboard."],
      ["Review the grid", "Rows and columns are rebuilt from word positions. Fix anything odd."],
      ["Export", "Download .xlsx or CSV, or copy as TSV into an open sheet."],
    ],
    useCases: [
      "Tables in a web dashboard that won’t let you export",
      "Charts-with-tables in slides someone sent as images",
      "Tables inside a PDF you screenshotted",
      "Dark-mode app screens (Sheetshot inverts them before reading)",
    ],
    tips: [
      "Zoom the source to 125–150% before taking the screenshot — bigger text reads better.",
      "Include the header row so your columns come out labelled.",
      "One table per image. Crop multiple tables into separate runs.",
    ],
    bodyHeading: "Why PNG screenshots convert so well",
    body: [
      "PNG is lossless, so the letters in a screenshot keep hard edges. That matters for OCR: the fewer artefacts around digits, the fewer 8-versus-B or 0-versus-O mistakes you have to fix.",
      "Sheetshot reads the PNG with an in-browser OCR engine, clusters the recognised words into a grid and lets you correct cells before export. For dashboards that block copy-paste or CSV export, a screenshot plus Sheetshot is often the fastest way to get the numbers into Excel.",
    ],
    faqs: [
      {
        q: "Can I paste a screenshot instead of saving a file?",
        a: "Yes. Press Ctrl+V (or ⌘V on a Mac) on the Sheetshot page and the clipboard image is loaded directly.",
      },
      {
        q: "Does it work with dark-mode screenshots?",
        a: "Yes. Dark backgrounds with light text are detected and inverted before OCR, which usually improves accuracy.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["screenshot-to-excel", "png-to-csv", "jpg-to-excel", "copy-table-from-image"],
  },
  {
    slug: "image-to-excel",
    title: "Image to Excel converter — private, in-browser table OCR",
    description:
      "Convert any image of a table (JPG, PNG, WebP, phone photo, screenshot) into an editable Excel spreadsheet. OCR runs on your device. 3 free exports, then $9 lifetime.",
    kicker: "Image to Excel",
    h1: "Any image of a table,",
    h1Accent: " as an Excel file.",
    intro:
      "Screenshots, scans, phone photos — if it’s a picture of rows and columns, Sheetshot rebuilds the grid so you can edit it and download .xlsx or CSV. No upload, no account for your first exports.",
    linkLabel: "Image to Excel",
    steps: [
      ["Add an image", "PNG, JPEG or WebP. Drop, browse, or paste from the clipboard."],
      ["Let it read", "In-browser OCR finds each word and where it sits on the page."],
      ["Edit and export", "Fix cells in the grid, then download Excel or CSV."],
    ],
    useCases: [
      "Bank and card statements you only have as screenshots",
      "School marks sheets and attendance registers",
      "Supplier price lists and stock sheets",
      "Tables in slides, PDFs and web pages that won’t copy cleanly",
    ],
    tips: [
      "Crop tight to the table — surrounding text becomes junk rows.",
      "Printed text works far better than handwriting.",
      "Currently tuned for English/Latin text and numbers.",
    ],
    bodyHeading: "How an image becomes a spreadsheet",
    body: [
      "Most “image to Excel” sites upload your file to a server and send back a file. Sheetshot does the whole job in your browser: preprocessing (rotation, contrast, deskew), OCR with word bounding boxes, then clustering the words into rows and columns.",
      "Because OCR is never perfect, the result opens as an editable grid first. You can merge or split cells where the column guess was off, retype a digit, then export exactly what you checked — not a surprise file.",
    ],
    faqs: [
      {
        q: "Which image formats are supported?",
        a: "PNG, JPEG/JPG and WebP work best. Screenshots and phone photos are both fine.",
      },
      {
        q: "Does it handle handwriting?",
        a: "Not reliably. Sheetshot is built for printed or on-screen text. Handwritten tables will need a lot of manual correction.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["jpg-to-excel", "png-to-excel", "image-to-csv", "image-to-google-sheets"],
  },
  {
    slug: "screenshot-to-excel",
    title: "Screenshot to Excel — paste a table screenshot, get .xlsx",
    description:
      "Paste a screenshot of any table and get an editable Excel sheet. Works with dashboards, PDFs, web pages and apps that block export. Private in-browser OCR.",
    kicker: "Screenshot to Excel",
    h1: "Paste a screenshot.",
    h1Accent: " Get the spreadsheet.",
    intro:
      "Win+Shift+S or ⌘⇧4, then Ctrl+V here. Sheetshot turns the table in your screenshot into rows and columns you can fix and download as Excel — without uploading the screenshot anywhere.",
    linkLabel: "Screenshot to Excel",
    steps: [
      ["Snip the table", "Use your OS screenshot tool and copy it to the clipboard."],
      ["Paste into Sheetshot", "Ctrl+V / ⌘V anywhere on the page loads it instantly."],
      ["Fix and download", "Correct any cell, then download .xlsx or CSV."],
    ],
    useCases: [
      "SaaS dashboards and admin panels with no export button",
      "Tables inside PDFs that paste as a jumbled mess",
      "Reports shared over Zoom or Teams screen-share",
      "Banking and broker apps that only show data on screen",
    ],
    tips: [
      "Screenshot at 100% zoom or larger; tiny text is the main cause of errors.",
      "Avoid capturing tooltips, cursors or overlapping popups.",
      "For long tables, take several screenshots and export each one.",
    ],
    bodyHeading: "Why not just copy-paste?",
    body: [
      "Copying from many dashboards, PDFs and apps gives you a single column of text, merged cells, or nothing at all. A screenshot captures exactly what you see, and Sheetshot turns what you see back into cells.",
      "It’s also private by construction: the screenshot is processed by OCR running inside your browser, so internal dashboards and financial screens are never uploaded to a third-party converter.",
    ],
    faqs: [
      {
        q: "Do I need to save the screenshot as a file first?",
        a: "No. Copy it to the clipboard and paste it on the page with Ctrl+V or ⌘V.",
      },
      {
        q: "Can I screenshot a table from a PDF?",
        a: "Yes — screenshot the page area with the table and paste it in. Sheetshot works on images, so a screenshot of the PDF is the way in.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["png-to-excel", "copy-table-from-image", "image-to-google-sheets", "excel-data-from-picture-alternative"],
  },
  {
    slug: "photo-to-excel",
    title: "Photo to Excel — convert a phone photo of a table to a spreadsheet",
    description:
      "Snap a photo of a printed table or a table on a screen and turn it into an editable Excel file. Fixes rotation and skew. OCR runs on your phone or laptop.",
    kicker: "Photo to Excel",
    h1: "Photograph the table.",
    h1Accent: " Keep the data.",
    intro:
      "Took a photo of a printout, a notice board or a monitor? Open Sheetshot on your phone or laptop, drop the photo in, and download the table as .xlsx. The photo stays on your device.",
    linkLabel: "Photo to Excel",
    steps: [
      ["Take a straight photo", "Fill the frame with the table, in good light."],
      ["Drop it in", "Sheetshot fixes EXIF rotation and small tilts automatically."],
      ["Correct and export", "Review the grid, then download Excel or CSV."],
    ],
    useCases: [
      "Printed price lists at a wholesaler or shop",
      "Notice-board results and timetables",
      "An Excel sheet on a colleague’s monitor",
      "Pages from a printed report or register",
    ],
    tips: [
      "Shoot straight on, not at an angle; skew over a few degrees hurts accuracy.",
      "Avoid glare and shadows across the numbers.",
      "Photos of monitors: step back slightly and zoom to reduce moiré lines.",
    ],
    bodyHeading: "Phone photos need more cleanup than screenshots",
    body: [
      "Photos come in sideways, slightly rotated, unevenly lit and huge. Sheetshot downsizes them, applies the EXIF orientation your camera recorded, and deskews a few degrees before OCR so rows line up horizontally.",
      "You then get an editable grid rather than a finished file, because a photo of paper is never perfect. Fixing a couple of cells in the browser beats retyping the whole table.",
    ],
    faqs: [
      {
        q: "Does it work on my phone?",
        a: "Yes. Sheetshot is a web app — open it in your mobile browser, pick the photo from your gallery, and download the file.",
      },
      {
        q: "Can I photograph a table on a computer screen?",
        a: "Yes, though a real screenshot is always cleaner. If you can’t take one, a steady, straight photo of the screen works.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["jpg-to-excel", "marksheet-to-excel", "image-to-excel", "bank-statement-screenshot-to-excel"],
  },
  {
    slug: "image-to-csv",
    title: "Image to CSV converter — extract a table from a picture as CSV",
    description:
      "Extract a table from a JPG, PNG or screenshot as clean CSV. Edit cells before export. In-browser OCR, nothing uploaded. Ideal for importing into databases and scripts.",
    kicker: "Image to CSV",
    h1: "Pull a table out of an image",
    h1Accent: " as clean CSV.",
    intro:
      "Need the data, not the formatting? Sheetshot reads the table in your image, lets you fix the grid, and downloads a plain CSV ready for Python, SQL imports, Airtable or Notion.",
    linkLabel: "Image to CSV",
    steps: [
      ["Load the image", "Screenshot, scan or photo — PNG, JPEG or WebP."],
      ["Check columns", "Merge or split cells where OCR guessed the column boundary wrong."],
      ["Download CSV", "Properly quoted CSV, so commas inside cells don’t break rows."],
    ],
    useCases: [
      "Seeding a database from a table in a paper or report",
      "Importing a price list into Shopify, Airtable or Notion",
      "Feeding a screenshot table into a pandas notebook",
      "Moving data out of a tool that only shows it on screen",
    ],
    tips: [
      "Keep the header row — it becomes your CSV column names.",
      "Amounts with thousands separators are kept together in one field.",
      "Open the CSV via Data → From Text in Excel if you need to keep leading zeros (IDs, PIN codes).",
    ],
    bodyHeading: "CSV that doesn’t break on the first comma",
    body: [
      "A table from an image often has commas inside values — amounts like 1,250.00 or names like “Sharma, R.”. Sheetshot quotes fields properly, so each cell lands in its own column when you import the CSV.",
      "Everything happens locally: OCR, grid building and CSV generation all run in the browser tab, which also makes it fast — there is no upload or server queue.",
    ],
    faqs: [
      {
        q: "CSV or Excel — which should I pick?",
        a: "CSV for imports into other tools and code; .xlsx if you’re going to open it in Excel and share it. Sheetshot gives you both from the same grid.",
      },
      {
        q: "Can I copy the table instead of downloading?",
        a: "Yes. “Copy TSV” puts tab-separated rows on your clipboard, which paste cleanly into Excel or Google Sheets.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["png-to-csv", "image-to-excel", "image-to-google-sheets", "copy-table-from-image"],
  },
  {
    slug: "png-to-csv",
    title: "PNG to CSV — convert a PNG table screenshot to CSV",
    description:
      "Convert a PNG screenshot of a table into a CSV file in your browser. Lossless PNG text gives accurate OCR. Fix cells, then download properly quoted CSV.",
    kicker: "PNG to CSV",
    h1: "From PNG screenshot",
    h1Accent: " to CSV rows.",
    intro:
      "Got a PNG of a table from a doc, dashboard or chat? Sheetshot turns it into a CSV you can import anywhere, after you’ve had a chance to check every cell.",
    linkLabel: "PNG to CSV",
    steps: [
      ["Drop or paste the PNG", "Clipboard paste works — no need to save a file."],
      ["Review the grid", "Rows and columns are inferred from word positions."],
      ["Download CSV", "Or grab an .xlsx from the same grid."],
    ],
    useCases: [
      "Tables from Figma mocks or design specs",
      "Screenshots of leaderboards and ranking tables",
      "Exported chart images that include a data table",
      "Docs and wikis that render tables as images",
    ],
    tips: [
      "PNG screenshots at 2× (Retina) resolution give the best results.",
      "Crop away sidebars and navigation before running OCR.",
      "Check columns with right-aligned numbers — merge cells if a value split.",
    ],
    bodyHeading: "Why PNG is the ideal input for CSV extraction",
    body: [
      "CSV is unforgiving: a single stray comma or shifted cell breaks the import. Starting from a lossless PNG keeps OCR errors low, and Sheetshot’s editable grid lets you catch the rest before you download.",
      "Because the whole pipeline runs in the browser, you can convert internal or sensitive tables without handing them to an upload-based converter.",
    ],
    faqs: [
      {
        q: "What’s the difference between this and Image to CSV?",
        a: "Nothing technically — PNG is just the format that tends to give the cleanest results. JPG, JPEG and WebP images work too.",
      },
      {
        q: "Is there a row limit?",
        a: "No fixed limit, but very large tables read better when split into several screenshots of 30–50 rows each.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["image-to-csv", "png-to-excel", "screenshot-to-excel", "copy-table-from-image"],
  },
  {
    slug: "image-to-google-sheets",
    title: "Image to Google Sheets — paste a table picture into Sheets",
    description:
      "Turn a picture of a table into rows you can paste straight into Google Sheets. Copy as TSV or download CSV. OCR runs privately in your browser.",
    kicker: "Image to Google Sheets",
    h1: "Get a table from a picture",
    h1Accent: " into Google Sheets.",
    intro:
      "Google Sheets has no built-in “data from picture”. Sheetshot fills the gap: read the table in your image, then click Copy TSV and paste into any Sheet — every value lands in its own cell.",
    linkLabel: "Image to Google Sheets",
    steps: [
      ["Load the image", "Screenshot, photo or saved image of a table."],
      ["Fix the grid", "Correct any cell the OCR flagged or misread."],
      ["Copy TSV → paste", "Click a cell in Google Sheets and press Ctrl+V / ⌘V."],
    ],
    useCases: [
      "Shared team trackers fed from screenshots",
      "Class lists and marks pasted into a school Sheet",
      "Expense tables from receipts or statements",
      "Prices from a competitor’s screenshot into a comparison Sheet",
    ],
    tips: [
      "Copy TSV is the fastest route — tab-separated rows paste into separate columns.",
      "For big tables, download CSV and use File → Import in Sheets.",
      "Paste into cell A1 of an empty tab to avoid overwriting data.",
    ],
    bodyHeading: "Why TSV pastes perfectly into Sheets",
    body: [
      "When you paste tab-separated text into Google Sheets, it splits on tabs and newlines automatically, so each value goes into its own cell. Sheetshot’s Copy TSV button puts exactly that on your clipboard.",
      "Sheetshot never asks for access to your Google Drive or Sheets — it only puts text on your clipboard or a file on your disk. Google sign-in is used only if you buy lifetime access, to remember the purchase.",
    ],
    faqs: [
      {
        q: "Does Sheetshot need access to my Google Drive?",
        a: "No. It never touches your Drive or Sheets. You paste or import the data yourself.",
      },
      {
        q: "Can I import a CSV instead?",
        a: "Yes. Download the CSV and use File → Import → Upload in Google Sheets.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["image-to-csv", "copy-table-from-image", "screenshot-to-excel", "image-to-excel"],
  },
  {
    slug: "bank-statement-screenshot-to-excel",
    title: "Bank statement screenshot to Excel — private, nothing uploaded",
    description:
      "Convert a screenshot or photo of a bank or card statement into an Excel sheet without uploading it. In-browser OCR keeps your financial data on your device.",
    kicker: "Bank statement to Excel",
    h1: "Bank statement screenshot",
    h1Accent: " to Excel — without uploading it.",
    intro:
      "Your statement is the last thing you should upload to a random converter. Sheetshot reads the transaction table inside your browser, lets you check every amount, and downloads .xlsx or CSV.",
    linkLabel: "Bank statement to Excel",
    steps: [
      ["Screenshot the transactions", "From net banking, the bank app, or a PDF statement."],
      ["Check amounts", "Review debit/credit columns and fix any misread digit."],
      ["Download", "Excel or CSV for budgeting, ITR prep or reconciliation."],
    ],
    useCases: [
      "Banking apps that only show transactions on screen",
      "Password-protected PDF statements you can view but not export",
      "Card statements for expense reports",
      "Monthly budgeting and tax-time reconciliation",
    ],
    tips: [
      "Screenshot one page of transactions at a time and include the header row.",
      "Always spot-check totals against the statement before relying on the sheet.",
      "Indian amounts like 1,25,000.00 stay in one cell.",
    ],
    bodyHeading: "Privacy is the architecture, not a policy page",
    body: [
      "Upload-based converters receive your account numbers, balances and transactions on their servers. Sheetshot’s OCR runs as WebAssembly in your browser tab: the screenshot is never sent anywhere, and there’s nothing stored on a server to leak.",
      "Statements are dense with numbers, so Sheetshot shows the extracted grid before export. Check the debit and credit columns, fix any digit that looks off, then download — you stay in control of every figure.",
    ],
    faqs: [
      {
        q: "Is it safe to use with my bank statement?",
        a: "The image is processed entirely on your device and never uploaded — the only things downloaded are the app and the OCR engine itself. Nothing about your statement is stored on a server.",
      },
      {
        q: "Can it read a PDF statement directly?",
        a: "Sheetshot works on images. Open the PDF, screenshot the transaction table, and paste it in.",
      },
      {
        q: "Will it get every number right?",
        a: "OCR is good but not perfect, especially on low-resolution screenshots. That’s why you review and edit the grid before exporting — always verify totals.",
      },
      PRICE_FAQ,
    ],
    related: ["screenshot-to-excel", "image-to-excel", "image-to-csv", "photo-to-excel"],
  },
  {
    slug: "marksheet-to-excel",
    title: "Marksheet to Excel — convert a photo of a marks sheet or result list",
    description:
      "Turn a photo or screenshot of a class marks sheet, result list or attendance register into Excel. Keep roll numbers and marks in columns. Runs in your browser.",
    kicker: "Marks sheet to Excel",
    h1: "Marks sheet photo",
    h1Accent: " to an Excel register.",
    intro:
      "Teachers and coordinators get results as photos and screenshots all the time. Drop one into Sheetshot and get roll numbers, names and marks in proper columns — then sort, total and share.",
    linkLabel: "Marksheet to Excel",
    steps: [
      ["Photo or screenshot", "A printed marks list, a result portal screen, or a WhatsApp image."],
      ["Check names and marks", "Fix misread names or digits in the grid."],
      ["Export", "Download .xlsx to compute totals, ranks and averages."],
    ],
    useCases: [
      "Class result sheets shared on WhatsApp",
      "Internal-assessment registers on paper",
      "Result portal pages that can’t be exported",
      "Attendance and fee lists from printouts",
    ],
    tips: [
      "Printed sheets work well; handwritten marks usually don’t.",
      "Photograph one page at a time, straight on, in good light.",
      "Keep the column headings (Roll No, Name, subjects) in the frame.",
    ],
    bodyHeading: "Student data stays on your device",
    body: [
      "Marks and names are personal data. Because Sheetshot runs OCR inside the browser, the photo of the sheet is never uploaded to a server — useful when school policy discourages online converters.",
      "Once in Excel, you can total marks, compute percentages and ranks, and share a clean file instead of a blurry photo.",
    ],
    faqs: [
      {
        q: "Does it read handwritten marks?",
        a: "Not reliably. It’s designed for printed or typed sheets and on-screen tables.",
      },
      {
        q: "Can I use it on my phone?",
        a: "Yes. Open Sheetshot in your phone browser, pick the photo and download the Excel file.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["photo-to-excel", "jpg-to-excel", "image-to-google-sheets", "image-to-excel"],
  },
  {
    slug: "copy-table-from-image",
    title: "Copy a table from an image — rows and columns, not a text blob",
    description:
      "Copy a table out of an image with its rows and columns intact, then paste into Excel or Google Sheets. Free to try, private in-browser OCR.",
    kicker: "Copy table from image",
    h1: "Copy a table from an image",
    h1Accent: " with the columns intact.",
    intro:
      "Built-in “copy text from image” features give you one long block of text. Sheetshot keeps the structure: each value goes to its own cell, so the table pastes into a spreadsheet the way it looked.",
    linkLabel: "Copy table from image",
    steps: [
      ["Load the image", "Paste a screenshot or drop an image file."],
      ["Check the grid", "The table is rebuilt cell by cell — fix anything off."],
      ["Copy TSV", "Paste into Excel, Google Sheets, Numbers or LibreOffice."],
    ],
    useCases: [
      "Tables in images on web pages and docs",
      "Screenshots shared in Slack, Teams or WhatsApp",
      "Tables inside slides and scanned handouts",
      "Anywhere text-only OCR gives you a jumbled paragraph",
    ],
    tips: [
      "Crop to just the table before copying.",
      "Download .xlsx or CSV if you want a file instead of the clipboard.",
      "Split very wide tables into two screenshots.",
    ],
    bodyHeading: "Why text OCR scrambles tables",
    body: [
      "Phone and OS text-recognition features read text line by line. On a table, that interleaves columns or collapses them into one. Sheetshot uses word positions to rebuild rows and columns, so the structure survives the copy.",
      "The result pastes as tab-separated rows, which every spreadsheet app splits into cells automatically.",
    ],
    faqs: [
      {
        q: "How is this different from Live Text or Google Lens?",
        a: "Those copy text. Sheetshot copies a table — rows and columns — and lets you correct cells before you paste.",
      },
      {
        q: "Which apps can I paste into?",
        a: "Excel, Google Sheets, Apple Numbers, LibreOffice Calc, Airtable and most tools that accept tab-separated text.",
      },
      PRIVACY_FAQ,
      PRICE_FAQ,
    ],
    related: ["image-to-google-sheets", "screenshot-to-excel", "image-to-csv", "png-to-excel"],
  },
  {
    slug: "excel-data-from-picture-alternative",
    title: "Excel “Data from Picture” not available? A browser alternative",
    description:
      "Excel’s Data from Picture needs a recent Microsoft 365 build and isn’t in Office 2019/2021. Sheetshot converts table images to .xlsx in any browser, privately.",
    kicker: "Data from Picture alternative",
    h1: "No “Data from Picture” in your Excel?",
    h1Accent: " Use this instead.",
    intro:
      "Microsoft’s Data from Picture is handy — if your Excel has it. Sheetshot does the same job in any modern browser: image of a table in, editable grid and .xlsx out, with no upload.",
    linkLabel: "Excel Data from Picture alternative",
    steps: [
      ["Open Sheetshot", "Any browser on Windows, Mac, Linux, Android or iPhone."],
      ["Drop the picture", "Screenshot, scan or photo of a table."],
      ["Download .xlsx", "Open it in whichever Excel version you have."],
    ],
    useCases: [
      "Office 2016, 2019 or 2021 perpetual licences",
      "Managed work PCs on slower update channels",
      "Macs and Chromebooks where you just need an .xlsx",
      "Anyone who’d rather not send images to a cloud OCR service",
    ],
    tips: [
      "Open the downloaded .xlsx in any Excel version — no add-in needed.",
      "Crop to the table before converting for cleaner columns.",
      "Use Copy TSV to paste directly into an open workbook.",
    ],
    bodyHeading: "When Excel’s built-in feature isn’t there",
    body: [
      "According to Microsoft’s documentation, Insert Data from Picture on Windows requires Microsoft 365 Excel version 2210 or later, and it isn’t part of the one-time Office 2019 or 2021 releases. Many work machines and older licences simply don’t have the button.",
      "Sheetshot doesn’t depend on your Office version. It runs in the browser, rebuilds the table from the image locally, and gives you a standard .xlsx that opens in any Excel.",
    ],
    faqs: [
      {
        q: "Why can’t I see Data from Picture in Excel?",
        a: "It needs a recent Microsoft 365 build (version 2210+ on Windows) and isn’t included in Office 2019/2021. Some enterprise update channels get it later. Check File → Account for your version.",
      },
      {
        q: "Does Sheetshot send my image to Microsoft or anyone else?",
        a: "No. OCR runs in your browser; the image never leaves your device.",
      },
      PRICE_FAQ,
    ],
    related: ["screenshot-to-excel", "image-to-excel", "jpg-to-excel", "copy-table-from-image"],
  },
];

export const LANDING_SLUGS = LANDING_PAGES.map((p) => p.slug);

export function getLandingPage(slug: string): LandingPage | undefined {
  return LANDING_PAGES.find((p) => p.slug === slug);
}
