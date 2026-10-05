import { useState } from 'react'
import {
  cargarCorreosInforme,
  guardarCorreosInforme,
  rangoSemanaActual,
  cargarReportesSemana,
  armarLibroExcel,
  descargarExcel,
  abrirMailto
} from '../utils/informeSemanal'

function PanelInformeSemanal({ habilitado = true }) {
  const rango = rangoSemanaActual()
  const [correos, setCorreos] = useState(() => cargarCorreosInforme())
  const [ok, setOk] = useState('')
  const [error, setError] = useState('')
  const [trabajando, setTrabajando] = useState(false)

  const cambiar = (i, valor) => {
    const next = [...correos]
    next[i] = valor
    setCorreos(next)
  }

  const guardar = () => {
    guardarCorreosInforme(correos)
    setOk('Correos guardados')
    setError('')
  }

  const generarYEnviar = async () => {
    if (!habilitado) return
    setError('')
    setOk('')
    setTrabajando(true)
    try {
      guardarCorreosInforme(correos)
      const filas = await cargarReportesSemana(rango.desde, rango.hasta)
      const bytes = armarLibroExcel(filas, rango.desde, rango.hasta)
      const nombre = `Informe_semanal_${rango.desde}_${rango.hasta}.xlsx`
      descargarExcel(bytes, nombre)
      const dest = correos.filter((c) => c.includes('@'))
      if (dest.length) abrirMailto(dest, rango.desde, rango.hasta, filas.length)
      setOk(`Excel listo (${filas.length} registros). ${dest.length ? 'Se abrió el correo para enviarlo.' : 'Guarda al menos un correo para enviarlo.'}`)
    } catch (err) {
      setError(err.message || 'No se pudo armar el informe')
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ color: '#1d4ed8', marginBottom: 8 }}>Informe semanal por correo</h3>
      <p className="filtros-hint">
        Semana automática: {rango.desde} a {rango.hasta}. Solo datos (sin fotos). Hasta 5 correos.
      </p>
      {correos.map((c, i) => (
        <div className="form-group" key={i}>
          <label>Correo {i + 1}</label>
          <input type="email" value={c} onChange={(e) => cambiar(i, e.target.value)} placeholder="correo@empresa.com" />
        </div>
      ))}
      {error && <p className="master-error">{error}</p>}
      {ok && <p style={{ color: '#16a34a' }}>{ok}</p>}
      <div className="filtros-botones">
        <button type="button" className="btn btn-secondary" onClick={guardar}>Guardar correos</button>
        <button type="button" className="btn btn-success" onClick={generarYEnviar} disabled={!habilitado || trabajando}>
          {trabajando ? 'Generando…' : 'Excel semanal y enviar'}
        </button>
      </div>
    </div>
  )
}

export default PanelInformeSemanal
