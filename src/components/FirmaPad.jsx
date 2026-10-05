import { useEffect, useRef, useState } from 'react'

function FirmaPad({ valor, onChange }) {
  const canvasRef = useRef(null)
  const dibujando = useRef(false)

  const tamaño = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const w = canvas.clientWidth || 320
    const h = 140
    canvas.width = w * ratio
    canvas.height = h * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#111827'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    if (valor) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, w, h)
      img.src = valor
    }
  }

  useEffect(() => {
    tamaño()
    window.addEventListener('resize', tamaño)
    return () => window.removeEventListener('resize', tamaño)
  }, [])

  const pos = (e) => {
    const canvas = canvasRef.current
    const r = canvas.getBoundingClientRect()
    const t = e.touches?.[0]
    const x = (t ? t.clientX : e.clientX) - r.left
    const y = (t ? t.clientY : e.clientY) - r.top
    return { x, y }
  }

  const start = (e) => {
    e.preventDefault()
    dibujando.current = true
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e) => {
    if (!dibujando.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const end = () => {
    if (!dibujando.current) return
    dibujando.current = false
    onChange(canvasRef.current.toDataURL('image/png'))
  }

  const limpiar = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.clientWidth, 140)
    onChange('')
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="firma-canvas"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem', marginTop: 6 }} onClick={limpiar}>
        Limpiar firma
      </button>
    </div>
  )
}

export default FirmaPad
