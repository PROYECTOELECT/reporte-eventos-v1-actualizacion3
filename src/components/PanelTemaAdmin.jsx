import { useState } from 'react'
import { cargarTema, guardarTema, resetTema, aplicarPreset, PRESETS_DISENO } from '../lib/tema'

function PanelTemaAdmin() {
  const [tema, setTema] = useState(() => cargarTema())
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState('')

  const cambiar = (campo, valor) => {
    const next = { ...tema, [campo]: valor }
    setTema(next)
    guardarTema(next)
  }

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

  return (
    <div className="panel-tema-admin">
      <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setAbierto((v) => !v)}>
        {abierto ? 'Cerrar diseño' : 'Cambiar diseño'}
      </button>
      {abierto && (
        <div className="estudio-diseno">
          <strong>Diseño de la plataforma (solo administrador)</strong>
          <p className="filtros-hint">Elige un estilo. Se aplica de inmediato para todos en este navegador.</p>
          <div className="presets-grid">
            {PRESETS_DISENO.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`preset-chip ${tema.preset === p.id ? 'activo' : ''}`}
                style={{ background: `linear-gradient(135deg, ${p.fondo}, ${p.boton})`, color: '#fff' }}
                onClick={() => setTema(aplicarPreset(p.id))}
              >
                {p.nombre}
              </button>
            ))}
          </div>
          <div className="estudio-colores">
            <label>Fondo <input type="color" value={tema.fondo} onChange={(e) => cambiar('fondo', e.target.value)} /></label>
            <label>Banner <input type="color" value={tema.banner} onChange={(e) => cambiar('banner', e.target.value)} /></label>
            <label>Botón <input type="color" value={tema.boton} onChange={(e) => cambiar('boton', e.target.value)} /></label>
            <label>Acento <input type="color" value={tema.acento || '#22d3ee'} onChange={(e) => cambiar('acento', e.target.value)} /></label>
          </div>
          <div className="foto-opciones">
            <label className="btn btn-secondary foto-btn">
              Imagen de fondo
              <input type="file" accept="image/*" hidden onChange={handleImagen} />
            </label>
            {tema.fondoImagen && (
              <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setTema(guardarTema({ ...cargarTema(), fondoImagen: null }))}>
                Quitar imagen
              </button>
            )}
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setTema(resetTema())}>
              Restaurar
            </button>
          </div>
          <div className="foto-opciones" style={{ marginTop: 10 }}>
            <label className="btn btn-secondary foto-btn">
              Cambiar icono de la app
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 800000) { setError('El icono no debe superar 800 KB'); return }
                const reader = new FileReader()
                reader.onload = (ev) => {
                  const next = guardarTema({ ...cargarTema(), icono: ev.target.result })
                  setTema(next)
                  setError('')
                }
                reader.readAsDataURL(file)
              }} />
            </label>
            {tema.icono && (
              <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setTema(guardarTema({ ...cargarTema(), icono: null }))}>
                Icono por defecto
              </button>
            )}
            <img src={tema.icono || '/icon-v2-192.png'} alt="Icono" style={{ width: 42, height: 42, borderRadius: 10 }} />
          </div>
          {error && <span className="master-error">{error}</span>}
        </div>
      )}
    </div>
  )
}

export default PanelTemaAdmin
