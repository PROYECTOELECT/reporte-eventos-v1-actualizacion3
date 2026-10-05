import { useState } from 'react'
import FirmaPad from './FirmaPad'
import { listarInformesSupervision, crearInformeSupervision, eliminarInformeSupervision } from '../lib/supervision'
import { generarPDFSupervision } from '../utils/generarPDFSupervision'

function ModuloSupervision({ sesion, logoMarca, puedeCrear, puedeBorrar, forzarAbierto = false }) {
  const [abiertoInt, setAbierto] = useState(false)
  const abierto = forzarAbierto || abiertoInt
  const [lista, setLista] = useState(() => listarInformesSupervision())
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [form, setForm] = useState({
    autorNombre: sesion?.nombre || '',
    autorCedula: sesion?.cedula || '',
    autorCargo: sesion?.cargo || '',
    novedad: '',
    procedimiento: '',
    destinatarioNombre: '',
    destinatarioCedula: '',
    firma1Nombre: '',
    firma1Cedula: '',
    firma1Img: '',
    firma2Nombre: '',
    firma2Cedula: '',
    firma2Img: ''
  })

  const recargar = () => setLista(listarInformesSupervision())

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    try {
      crearInformeSupervision({
        ...form,
        autorId: sesion?.id,
        masterId: sesion?.masterId || (sesion?.rol === 'master' ? sesion.id : null),
        masterNombre: sesion?.rol === 'master' ? sesion.nombre : (sesion?.masterNombre || '')
      })
      setOk('Informe de supervisión guardado')
      setForm((prev) => ({
        ...prev,
        novedad: '',
        procedimiento: '',
        destinatarioNombre: '',
        destinatarioCedula: '',
        firma1Img: '',
        firma2Img: ''
      }))
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="card modulo-supervision">
      {!forzarAbierto && (
      <button type="button" className="info-toggle" onClick={() => setAbierto((v) => !v)}>
        <span>INFORME SUPERVISIÓN</span>
        <span>{abierto ? '▲' : '▼'}</span>
      </button>
      )}
      {abierto && (
        <div className="info-cuerpo">
          {puedeCrear && (
            <form onSubmit={handleSubmit} className="form-supervision">
              <p className="filtros-hint">Motivo fijo: INFORME SUPERVISION</p>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombres de quien reporta</label>
                  <input value={form.autorNombre} onChange={(e) => setForm({ ...form, autorNombre: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Cédula</label>
                  <input value={form.autorCedula} onChange={(e) => setForm({ ...form, autorCedula: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Cargo</label>
                  <input value={form.autorCargo} onChange={(e) => setForm({ ...form, autorCargo: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Motivo</label>
                <input value="INFORME SUPERVISION" readOnly />
              </div>
              <div className="form-group">
                <label>Detalle de la novedad</label>
                <textarea value={form.novedad} onChange={(e) => setForm({ ...form, novedad: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Procedimiento</label>
                <textarea value={form.procedimiento} onChange={(e) => setForm({ ...form, procedimiento: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre a quien se hace el informe</label>
                  <input value={form.destinatarioNombre} onChange={(e) => setForm({ ...form, destinatarioNombre: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Cédula del destinatario</label>
                  <input value={form.destinatarioCedula} onChange={(e) => setForm({ ...form, destinatarioCedula: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Firma 1 — nombre</label>
                  <input value={form.firma1Nombre} onChange={(e) => setForm({ ...form, firma1Nombre: e.target.value })} />
                  <label>Cédula firma 1</label>
                  <input value={form.firma1Cedula} onChange={(e) => setForm({ ...form, firma1Cedula: e.target.value })} />
                  <FirmaPad valor={form.firma1Img} onChange={(v) => setForm({ ...form, firma1Img: v })} />
                </div>
                <div className="form-group">
                  <label>Firma 2 — nombre</label>
                  <input value={form.firma2Nombre} onChange={(e) => setForm({ ...form, firma2Nombre: e.target.value })} />
                  <label>Cédula firma 2</label>
                  <input value={form.firma2Cedula} onChange={(e) => setForm({ ...form, firma2Cedula: e.target.value })} />
                  <FirmaPad valor={form.firma2Img} onChange={(v) => setForm({ ...form, firma2Img: v })} />
                </div>
              </div>
              {error && <p className="master-error">{error}</p>}
              {ok && <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>{ok}</p>}
              <button type="submit" className="btn btn-primary">Guardar informe de supervisión</button>
            </form>
          )}
          {!puedeCrear && <p className="filtros-hint">No tienes autorización para crear informes de supervisión.</p>}

          <h3 style={{ margin: '16px 0 8px', fontSize: '0.95rem', color: '#1d4ed8' }}>Informes guardados</h3>
          {lista.length === 0 && <p className="empty-state">Aún no hay informes de supervisión.</p>}
          {lista.map((inf) => (
            <div key={inf.id} className="aviso-item">
              <strong>{inf.motivo}</strong>
              <p>{inf.fecha} {inf.hora} · {inf.autorNombre} (CC {inf.autorCedula})</p>
              <p>Dirigido a: {inf.destinatarioNombre} CC {inf.destinatarioCedula}</p>
              <p>{inf.novedad}</p>
              <div className="filtros-botones">
                <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => generarPDFSupervision(inf, logoMarca)}>PDF</button>
                {puedeBorrar && (
                  <button type="button" className="btn btn-danger" style={{ width: 'auto' }} onClick={() => { eliminarInformeSupervision(inf.id); recargar() }}>Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ModuloSupervision
