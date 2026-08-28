import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { recognizeTable } from './lib/ocr'
import { wordsToTable } from './lib/table'
import { downloadCsv, tableToCsv } from './lib/csv'

type Status = 'idle' | 'working' | 'done' | 'error'

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [grid, setGrid] = useState<string[][]>([])
  const [error, setError] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const process = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please drop an image file (PNG, JPG, or similar).')
        setStatus('error')
        return
      }
      setError('')
      setStatus('working')
      setProgress(0)
      setGrid([])
      setFileName(file.name)

      const url = URL.createObjectURL(file)
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })

      try {
        const { words } = await recognizeTable(file, setProgress)
        const table = wordsToTable(words)
        if (table.length === 0) {
          setError('No table text found. Try a sharper, higher-contrast photo.')
          setStatus('error')
          return
        }
        setGrid(table)
        setStatus('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
        setStatus('error')
      }
    },
    [],
  )

  const onFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (file) void process(file)
    },
    [process],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith('image/'),
      )
      const file = item?.getAsFile()
      if (file) void process(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [process])

  const csv = useMemo(() => tableToCsv(grid), [grid])

  const updateCell = (r: number, c: number, value: string) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row])
      next[r][c] = value
      return next
    })
  }

  const reset = () => {
    setStatus('idle')
    setGrid([])
    setError('')
    setFileName('')
    setProgress(0)
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  const copyCsv = async () => {
    try {
      await navigator.clipboard.writeText(csv)
    } catch {
      /* clipboard unavailable — download still works */
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Sheetshot</span>
        </div>
        <h1>A screenshot of a table should just be a spreadsheet.</h1>
        <p className="tagline">
          Drop a photo of a table. Get CSV. Processing stays in your browser.
        </p>
      </header>

      <main className="stage">
        {status !== 'done' && (
          <div
            className={`dropzone${dragging ? ' dragging' : ''}${
              status === 'working' ? ' busy' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              onFiles(e.dataTransfer.files)
            }}
            onClick={() => status !== 'working' && inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onFiles(e.target.files)}
            />

            {status === 'working' ? (
              <div className="working">
                <div className="spinner" aria-hidden="true" />
                <p>Reading “{fileName}”…</p>
                <div className="bar">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <span className="pct">{Math.round(progress * 100)}%</span>
              </div>
            ) : (
              <div className="prompt">
                <div className="drop-icon" aria-hidden="true">
                  ⤓
                </div>
                <p className="drop-title">Drop a photo of a table</p>
                <p className="drop-sub">
                  or click to browse · or paste from clipboard
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {status === 'done' && (
          <section className="result">
            <div className="result-head">
              <div>
                <h2>Your spreadsheet</h2>
                <p className="result-sub">
                  {grid.length} rows × {grid[0]?.length ?? 0} columns · click any
                  cell to fix it
                </p>
              </div>
              <div className="actions">
                <button className="ghost" onClick={reset}>
                  New photo
                </button>
                <button className="ghost" onClick={copyCsv}>
                  Copy CSV
                </button>
                <button
                  className="primary"
                  onClick={() =>
                    downloadCsv(
                      csv,
                      (fileName.replace(/\.[^.]+$/, '') || 'sheetshot') + '.csv',
                    )
                  }
                >
                  Download CSV
                </button>
              </div>
            </div>

            <div className="preview">
              {imageUrl && (
                <figure className="source">
                  <img src={imageUrl} alt="Uploaded table" />
                  <figcaption>Source image</figcaption>
                </figure>
              )}
              <div className="grid-wrap">
                <table className="grid">
                  <tbody>
                    {grid.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>
                            <input
                              value={cell}
                              onChange={(e) => updateCell(r, c, e.target.value)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="foot">
        <span>Processing stays in the browser — your photo never leaves this tab.</span>
        <span className="price">$9 lifetime</span>
      </footer>
    </div>
  )
}
