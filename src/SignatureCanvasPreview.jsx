import { useEffect, useRef } from 'react'

const DISPLAY_MAX_WIDTH = 220
const DISPLAY_MAX_HEIGHT = 70

/**
 * Renders signature pixels on `<canvas>` so Elements does not expose `<img src="...">`.
 * Determined visitors can still grab assets from Network, bundle, or screenshots — this is not secrecy.
 */
export function SignatureCanvasPreview({ src, ariaLabel }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!src) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let cancelled = false
    let transientUrl = null

    ;(async () => {
      try {
        let loadUrl = src
        if (!src.startsWith('blob:')) {
          const response = await fetch(src)
          if (cancelled) return
          const blob = await response.blob()
          if (cancelled) return
          transientUrl = URL.createObjectURL(blob)
          loadUrl = transientUrl
        }

        const img = await new Promise((resolve, reject) => {
          const image = new Image()
          image.onload = () => resolve(image)
          image.onerror = () => reject(new Error('signature image failed to load'))
          image.src = loadUrl
        })

        if (transientUrl) {
          URL.revokeObjectURL(transientUrl)
          transientUrl = null
        }

        if (cancelled) return

        const iw = img.naturalWidth
        const ih = img.naturalHeight
        if (!iw || !ih) return

        const ratio = Math.min(DISPLAY_MAX_WIDTH / iw, DISPLAY_MAX_HEIGHT / ih, 1)
        const w = Math.round(iw * ratio)
        const h = Math.round(ih * ratio)

        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
      } catch {
        if (transientUrl) {
          URL.revokeObjectURL(transientUrl)
          transientUrl = null
        }
      }
    })()

    return () => {
      cancelled = true
      if (transientUrl) URL.revokeObjectURL(transientUrl)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [src])

  return (
    <canvas
      ref={canvasRef}
      className="signature-preview signature-preview-canvas"
      aria-label={ariaLabel}
      draggable={false}
      onContextMenu={(event) => event.preventDefault()}
    />
  )
}
