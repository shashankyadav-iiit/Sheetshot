export const PRODUCT_NAME = "Sheetshot Lifetime";
export const PRICE_USD = 9;
export const FREE_EXPORTS = 3;
export const UNLOCKED_KEY = "sheetshot_unlocked";
export const EXPORT_COUNT_KEY = "sheetshot_export_count";
export const TAGLINE = "A screenshot of a table should just be a spreadsheet.";

export const SAMPLES = {
  price: {
    id: "price",
    src: "/samples/price-list.png",
    label: "Price list",
    caption: "Kirana rates with Indian grouping",
  },
  marks: {
    id: "marks",
    src: "/samples/marks-sheet.png",
    label: "Marks sheet",
    caption: "A small class marksheet",
  },
} as const;

export type SampleId = keyof typeof SAMPLES;
