import { useRef, useEffect, useCallback, useState } from 'react'
import type { Lot } from '../types'

interface Props {
  lots: Lot[]
  spinning: boolean
  targetAngle: number
  duration: number
  onSpinEnd: (winner: Lot) => void
}

// Geometry of the transparent hole inside public/spin_border.png (1254x1254)
const FRAME = 1254
const HOLE_CX = 624.8 / FRAME
const HOLE_CY = 653.2 / FRAME
// Slightly larger than the hole so the wheel edge tucks under the ring
const WHEEL_R = 488 / FRAME

// Canvas resolution (CSS scales it down)
const SIZE = 1000
const CENTER = SIZE / 2
const RADIUS = SIZE / 2

const FONT = "'Philosopher', 'Segoe UI', system-ui, sans-serif"

// Deterministic sparkles in polar coords so they rotate with the wheel
const SPARKLES = (() => {
  let seed = 7
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  return Array.from({ length: 70 }, () => ({
    r: 0.18 + rnd() * 0.78,
    a: rnd() * Math.PI * 2,
    size: 1 + rnd() * 2.5,
    star: rnd() > 0.82,
  }))
})()

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath()
  ctx.moveTo(x, y - s * 4)
  ctx.quadraticCurveTo(x, y, x + s * 4, y)
  ctx.quadraticCurveTo(x, y, x, y + s * 4)
  ctx.quadraticCurveTo(x, y, x - s * 4, y)
  ctx.quadraticCurveTo(x, y, x, y - s * 4)
  ctx.fill()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  lots: Lot[],
  rotation: number,
  highlightIndex: number | null,
) {
  ctx.clearRect(0, 0, SIZE, SIZE)

  // Dark base
  const base = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, RADIUS)
  base.addColorStop(0, '#3a0620')
  base.addColorStop(0.55, '#1a0310')
  base.addColorStop(1, '#0a0006')
  ctx.fillStyle = base
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2)
  ctx.fill()

  const n = lots.length
  const slice = n > 0 ? (Math.PI * 2) / n : 0

  // Sectors tinted with lot colour
  lots.forEach((lot, i) => {
    const start = rotation + i * slice
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(CENTER, CENTER)
    ctx.arc(CENTER, CENTER, RADIUS, start, start + slice)
    ctx.closePath()
    ctx.clip()

    const tint = ctx.createRadialGradient(CENTER, CENTER, RADIUS * 0.15, CENTER, CENTER, RADIUS)
    const hl = i === highlightIndex
    tint.addColorStop(0, lot.color + (hl ? '55' : '10'))
    tint.addColorStop(1, lot.color + (hl ? 'aa' : '38'))
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, SIZE, SIZE)
    if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(0, 0, SIZE, SIZE)
    }
    ctx.restore()
  })

  // Sparkles
  ctx.save()
  ctx.fillStyle = '#ffd1ea'
  ctx.shadowColor = '#ff3d9a'
  ctx.shadowBlur = 10
  for (const s of SPARKLES) {
    const a = s.a + rotation
    const x = CENTER + Math.cos(a) * s.r * RADIUS
    const y = CENTER + Math.sin(a) * s.r * RADIUS
    if (s.star) {
      drawStar(ctx, x, y, s.size)
    } else {
      ctx.globalAlpha = 0.7
      ctx.beginPath()
      ctx.arc(x, y, s.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
  ctx.restore()

  // Neon dividers
  if (n > 1) {
    ctx.save()
    ctx.lineCap = 'round'
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? 'rgba(255, 30, 130, 0.9)' : 'rgba(255, 190, 225, 0.9)'
      ctx.lineWidth = pass === 0 ? 6 : 1.6
      ctx.shadowColor = '#ff1f8e'
      ctx.shadowBlur = pass === 0 ? 18 : 6
      for (let i = 0; i < n; i++) {
        const a = rotation + i * slice
        ctx.beginPath()
        ctx.moveTo(CENTER + Math.cos(a) * RADIUS * 0.12, CENTER + Math.sin(a) * RADIUS * 0.12)
        ctx.lineTo(CENTER + Math.cos(a) * RADIUS, CENTER + Math.sin(a) * RADIUS)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  // Labels
  if (n > 0) {
    const fontSize = n > 24 ? 22 : n > 16 ? 26 : n > 10 ? 32 : 38
    ctx.font = `700 ${fontSize}px ${FONT}`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const outer = RADIUS * 0.86
    const inner = RADIUS * 0.3
    // Don't let text spill into neighbours on thin slices
    const maxWidth = outer - inner

    lots.forEach((lot, i) => {
      const mid = rotation + i * slice + slice / 2
      ctx.save()
      ctx.translate(CENTER, CENTER)
      ctx.rotate(mid)
      const label = fitText(ctx, lot.name, maxWidth)
      ctx.shadowColor = '#ff2d95'
      ctx.shadowBlur = i === highlightIndex ? 24 : 12
      ctx.fillStyle = i === highlightIndex ? '#ffffff' : '#ffe3f1'
      // Keep labels on the left half upright
      const a = ((mid % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      if (a > Math.PI / 2 && a < Math.PI * 1.5) {
        ctx.rotate(Math.PI)
        ctx.textAlign = 'left'
        ctx.fillText(label, -outer, 0)
        ctx.textAlign = 'right'
      } else {
        ctx.fillText(label, outer, 0)
      }
      ctx.restore()
    })
  } else {
    ctx.save()
    ctx.font = `700 46px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffd1ea'
    ctx.shadowColor = '#ff2d95'
    ctx.shadowBlur = 16
    ctx.fillText('Добавьте лоты', CENTER, CENTER + RADIUS * 0.45)
    ctx.restore()
  }

  // Centre glow (static light, does not rotate)
  const glow = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, RADIUS * 0.6)
  glow.addColorStop(0, 'rgba(255, 40, 140, 0.45)')
  glow.addColorStop(1, 'rgba(255, 40, 140, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // Inner rim shadow so the frame sits on top nicely
  const rim = ctx.createRadialGradient(CENTER, CENTER, RADIUS * 0.85, CENTER, CENTER, RADIUS)
  rim.addColorStop(0, 'rgba(0,0,0,0)')
  rim.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = rim
  ctx.fill()
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export default function Wheel({ lots, spinning, targetAngle, duration, onSpinEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const currentRotation = useRef(0)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const draw = useCallback((rotation: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const idx = highlightId && !spinning ? lots.findIndex(l => l.id === highlightId) : -1
    drawWheel(ctx, lots, rotation, idx >= 0 ? idx : null)
  }, [lots, highlightId, spinning])

  // Draw static wheel
  useEffect(() => {
    if (!spinning) {
      draw(currentRotation.current)
    }
  }, [lots, spinning, draw])

  // Redraw once the web font is ready
  useEffect(() => {
    document.fonts?.ready.then(() => draw(currentRotation.current))
  }, [draw])

  // Spin animation
  useEffect(() => {
    if (!spinning || lots.length === 0) return

    const startRotation = currentRotation.current
    const totalRotation = targetAngle - startRotation
    const startTime = performance.now()
    const durationMs = duration * 1000

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      const eased = easeOutCubic(progress)
      const rotation = startRotation + totalRotation * eased

      currentRotation.current = rotation
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) drawWheel(ctx, lots, rotation, null)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        // Pointer (crystal on the frame) is at the top = -PI/2
        const normalizedAngle = (((-rotation) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        const sliceAngle = (Math.PI * 2) / lots.length
        const pointerAngle = ((normalizedAngle + Math.PI * 1.5) % (Math.PI * 2))
        const winnerIndex = Math.floor(pointerAngle / sliceAngle) % lots.length
        setHighlightId(lots[winnerIndex].id)
        onSpinEnd(lots[winnerIndex])
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [spinning, targetAngle, duration, lots, onSpinEnd])

  const pct = (v: number) => `${v * 100}%`

  return (
    <div className={`wheel-frame${spinning ? ' is-spinning' : ''}`}>
      <canvas
        ref={canvasRef}
        className="wheel-canvas"
        width={SIZE}
        height={SIZE}
        style={{
          left: pct(HOLE_CX - WHEEL_R),
          top: pct(HOLE_CY - WHEEL_R),
          width: pct(WHEEL_R * 2),
          height: pct(WHEEL_R * 2),
        }}
      />
      <img className="wheel-border" src="/spin_border.png" alt="" draggable={false} />
      <img
        className="wheel-center"
        src="/spin_center.png"
        alt=""
        draggable={false}
        style={{ left: pct(HOLE_CX), top: pct(HOLE_CY) }}
      />
    </div>
  )
}
