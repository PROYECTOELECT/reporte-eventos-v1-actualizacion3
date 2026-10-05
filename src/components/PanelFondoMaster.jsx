import { useState } from 'react'
import { cargarTema, guardarTema } from '../lib/tema'

function PanelFondoMaster() {
  const [tema, setTema] = useState(() => cargarTema())
  const [error, setError] = useState('')

  const handleImagen = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2.5 * 1024 * 1024) {
      setError('La imagen no debe superar 2.5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const next = guardarTema({ ...cargarTema(), fondoImagen: ev.target.result })
      setTema(next)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const quitar = () => {
    const next = guardarTema({ ...cargarTema(), fondoImagen: null })
    setTema(next)
  }

  return (
    <div className="panel-tema-admin">
      <strong style={{ fontSize: '0.8rem', color: '#1d4ed8' }}>Fondo de la plataforma</strong>
      <label className="btn btn-secondary foto-btn" style={{ margin: 0 }}>
        🖼️ Subir imagen de fondo
        <input type="file" accept="image/*" hidden onChange={handleImagen} />
      </label>
      {tema.fondoImagen && (
        <>
          <img src={tema.fondoImagen} alt="Fondo" style={{ height: 36, width: 56, objectFit: 'cover', borderRadius: 6, border: '1px solid #93c5fd' }} />
          <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={quitar}>
            Quitar fondo
          </button>
        </>
      )}
      {error && <span className="master-error">{error}</span>}
    </div>
  )
}

export default PanelFondoMaster
