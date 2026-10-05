import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function LectorQR({ onLeido, onCerrar }) {
  const [error, setError] = useState('')
  const [estado, setEstado] = useState('Abriendo cámara...')
  const scannerRef = useRef(null)
  const activoRef = useRef(true)
  const leidoRef = useRef(false)
  const onLeidoRef = useRef(onLeido)
  onLeidoRef.current = onLeido

  useEffect(() => {
    const regionId = 'qr-reader-region'
    const scanner = new Html5Qrcode(regionId)
    scannerRef.current = scanner
    activoRef.current = true
    leidoRef.current = false

    const detener = async () => {
      try {
        if (scannerRef.current?.isScanning) {
          await scannerRef.current.stop()
        }
      } catch (_) {}
    }

    const alLeer = (texto) => {
      if (!activoRef.current || leidoRef.current) return
      if (!texto || !String(texto).trim()) return
      leidoRef.current = true
      activoRef.current = false
      setEstado('QR leído')
      detener().then(() => onLeidoRef.current(String(texto).trim()))
    }

    const config = {
      fps: 16,
      qrbox: (viewW, viewH) => {
        const lado = Math.floor(Math.min(viewW, viewH) * 0.72)
        return { width: Math.max(180, lado), height: Math.max(180, lado) }
      },
      aspectRatio: 1,
      disableFlip: false
    }

    const iniciar = async () => {
      try {
        await scanner.start({ facingMode: 'environment' }, config, alLeer, () => {})
        if (activoRef.current) setEstado('Enfoca el código QR con buena luz')
        return
      } catch (_) {}

      try {
        const cams = await Html5Qrcode.getCameras()
        if (!activoRef.current) return
        if (!cams?.length) {
          setError('No se encontró cámara. Puedes cargar una foto del QR.')
          setEstado('')
          return
        }
        const trasera =
          cams.find((c) => /back|rear|trasera|environment|posterior/i.test(c.label || '')) ||
          cams[cams.length - 1]
        await scanner.start(trasera.id, config, alLeer, () => {})
        if (activoRef.current) setEstado('Enfoca el código QR con buena luz')
      } catch (err) {
        const perm = err?.name === 'NotAllowedError' || /permission|notallowed/i.test(err?.message || '')
        setError(
          perm
            ? 'Debes permitir la cámara en el navegador.'
            : 'No se pudo iniciar el lector. Usa HTTPS, permite la cámara o toma una foto del QR.'
        )
        setEstado('')
      }
    }

    iniciar()

    return () => {
      activoRef.current = false
      detener()
    }
  }, [])

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setEstado('Leyendo foto...')
    try {
      const scanner = scannerRef.current || new Html5Qrcode('qr-reader-region')
      const texto = await scanner.scanFile(file, true)
      leidoRef.current = true
      activoRef.current = false
      try {
        if (scannerRef.current?.isScanning) await scannerRef.current.stop()
      } catch (_) {}
      onLeidoRef.current(String(texto).trim())
    } catch (_) {
      setEstado('Enfoca el código QR con buena luz')
      setError('No se encontró un QR. Toma la foto de frente, cerca y con buena luz.')
    }
  }

  return (
    <div className="qr-box">
      <div id="qr-reader-region" className="qr-region" />
      {estado && <p className="qr-estado">{estado}</p>}
      {error && <p className="master-error">{error}</p>}
      <div className="foto-opciones">
        <label className="btn btn-secondary foto-btn">
          Foto del QR
          <input type="file" accept="image/*" capture="environment" hidden onChange={handleFoto} />
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: 'auto' }}
          onClick={async () => {
            activoRef.current = false
            try {
              if (scannerRef.current?.isScanning) await scannerRef.current.stop()
            } catch (_) {}
            onCerrar()
          }}
        >
          Cerrar cámara
        </button>
      </div>
    </div>
  )
}

export default LectorQR
