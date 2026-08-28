import { createWorker, PSM, type Worker } from 'tesseract.js'

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
    workerPromise = (async () => {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text' && progressHandler) {
            progressHandler(m.progress)
          }
        },
      })
      // Fully automatic page segmentation. The tesseract.js default is
      // SINGLE_BLOCK (PSM 6), which collapses bordered tables into garbage.
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
      return worker
    })()
  }
  return workerPromise
}

function toWord(node: Record<string, unknown>): OcrWord | null {
  const text = typeof node.text === 'string' ? node.text.trim() : ''
  const bbox = node.bbox as Record<string, number> | undefined
  if (!text || !bbox) return null
  return { text, x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1 }
}

// tesseract.js exposes both a flat `words` array and a nested hierarchy
// (blocks > paragraphs > lines > words). The root object also carries a
// `symbols` array, so we descend by container priority — finest first — and
// only treat true leaves (no container children) as words.
function flattenWords(data: unknown): OcrWord[] {
  const out: OcrWord[] = []
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const obj = node as Record<string, unknown>

    for (const key of ['words', 'lines', 'paragraphs', 'blocks']) {
      const child = obj[key]
      if (Array.isArray(child)) {
        child.forEach(visit)
        return
      }
    }

    const word = toWord(obj)
    if (word) out.push(word)
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
