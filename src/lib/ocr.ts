import { createWorker, type Worker } from 'tesseract.js'

export interface OcrWord {
  text: string
  x0: number
  y0: number
  x1: number
  y1: number
}

let workerPromise: Promise<Worker> | null = null
let progressHandler: ((p: number) => void) | null = null

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && progressHandler) {
          progressHandler(m.progress)
        }
      },
    })
  }
  return workerPromise
}

function toWord(node: Record<string, unknown>): OcrWord | null {
  const text = typeof node.text === 'string' ? node.text.trim() : ''
  const bbox = node.bbox as Record<string, number> | undefined
  if (!text || !bbox) return null
  return { text, x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1 }
}

// tesseract.js returns a nested hierarchy (blocks > paragraphs > lines > words)
// when the `blocks` output is enabled. Walk it and collect the word-level boxes.
function flattenWords(data: unknown): OcrWord[] {
  const out: OcrWord[] = []
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const obj = node as Record<string, unknown>

    // A word node carries `symbols`; treat it as a leaf.
    if (Array.isArray(obj.symbols)) {
      const word = toWord(obj)
      if (word) out.push(word)
      return
    }

    let descended = false
    for (const key of ['blocks', 'paragraphs', 'lines', 'words']) {
      const child = obj[key]
      if (Array.isArray(child)) {
        descended = true
        child.forEach(visit)
      }
    }

    // Fallback for flat shapes that expose words without a `symbols` array.
    if (!descended) {
      const word = toWord(obj)
      if (word) out.push(word)
    }
  }
  visit(data)
  return out
}

export interface RecognizeOutput {
  words: OcrWord[]
  text: string
}

export async function recognizeTable(
  image: File | string,
  onProgress?: (progress: number) => void,
): Promise<RecognizeOutput> {
  progressHandler = onProgress ?? null
  try {
    const worker = await getWorker()
    const { data } = await worker.recognize(image, {}, { blocks: true, text: true })
    return { words: flattenWords(data), text: data.text ?? '' }
  } finally {
    progressHandler = null
  }
}

export async function terminateOcr(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise
    await worker.terminate()
    workerPromise = null
  }
}
