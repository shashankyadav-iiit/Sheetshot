import type { OcrWord } from "./grid";
import { reconstructGrid, type GridResult } from "./grid";
import { prepareImage } from "./preprocess";

export type OcrProgress = {
  phase: string;
  progress: number;
};

export type ExtractResult = GridResult & {
  previewUrl: string;
  wordCount: number;
};

type WordLike = {
  text: string;
  confidence: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

type Recognizer = {
  recognize: (
    image: HTMLCanvasElement,
    options?: Record<string, unknown>,
    output?: Record<string, boolean>,
  ) => Promise<{ data: unknown }>;
};

let progressHandler: (p: OcrProgress) => void = () => {};
let workerPromise: Promise<Recognizer> | null = null;

function friendlyStatus(status: string): string {
  if (status.includes("loading tesseract") || status.includes("initializing tesseract")) {
    return "Loading the OCR engine…";
  }
  if (status.includes("loading language")) return "Loading English trained data…";
  if (status.includes("initializing api")) return "Warming up…";
  if (status.includes("recognizing")) return "Reading the table…";
  return "Working…";
}

function collectWords(data: unknown): OcrWord[] {
  const page = data as {
    words?: WordLike[];
    blocks?: Array<{ paragraphs?: Array<{ lines?: Array<{ words?: WordLike[] }> }> }>;
  };
  const toWord = (w: WordLike): OcrWord => ({
    text: w.text,
    confidence: Number.isFinite(w.confidence) ? w.confidence : 0,
    bbox: w.bbox ?? { x0: 0, y0: 0, x1: 0, y1: 0 },
  });
  if (page.words?.length) {
    return page.words.map(toWord);
  }
  const words: OcrWord[] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const w of line.words ?? []) {
          words.push(toWord(w));
        }
      }
    }
  }
  return words;
}

async function getWorker(): Promise<Recognizer> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const tesseract = await import("tesseract.js");
      // English only. Hindi tessdata is a separate multi-MB download on first OCR
      // (not the JS bundle, but first-run cost) and mixed-script LSTM adds 0/O noise
      // on English tables. Skip unless we lazy-load it behind a language toggle.
      const worker = await tesseract.createWorker("eng", tesseract.OEM.LSTM_ONLY, {
        logger: (m) => {
          progressHandler({
            phase: friendlyStatus(m.status),
            progress: m.status === "recognizing text" ? m.progress : m.progress * 0.35,
          });
        },
      });
      await worker.setParameters({
        tessedit_pageseg_mode: tesseract.PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
        user_defined_dpi: "220",
      });
      return worker;
    })();
  }
  return workerPromise;
}

export async function extractGridFromImage(
  source: Blob,
  onProgress: (p: OcrProgress) => void,
): Promise<ExtractResult> {
  progressHandler = onProgress;
  onProgress({ phase: "Preparing the image…", progress: 0.04 });
  const prepared = await prepareImage(source);
  onProgress({ phase: "Loading the OCR engine…", progress: 0.08 });

  const worker = await getWorker();
  onProgress({ phase: "Reading the table…", progress: 0.4 });
  // Word boxes + confidence are already in the Tesseract result; request both
  // top-level words and nested blocks so collectWords can use either shape.
  const { data } = await worker.recognize(
    prepared.canvas,
    {},
    { text: true, blocks: true, words: true },
  );
  const words = collectWords(data);
  onProgress({ phase: "Building the grid…", progress: 0.96 });
  const grid = reconstructGrid(words);

  return {
    ...grid,
    previewUrl: prepared.previewUrl,
    wordCount: words.length,
  };
}
