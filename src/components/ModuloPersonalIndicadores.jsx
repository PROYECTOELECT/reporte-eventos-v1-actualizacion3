import { useEffect, useMemo, useState } from 'react'
import { listarUsuarios, rolDe, permisosDe, fechaIngresoDe } from '../lib/usuarios'
import { sincronizarNovedadesNube } from '../lib/novedadesPersonal'
import {
  TIPOS_NOVEDAD,
  crearNovedadPersonal,
  eliminarNovedadPersonal,
  filtrarNovedades,
  contarPorTipo
} from '../lib/novedadesPersonal'
import { generarPDFPersonal, abrirVistaInformePersonal } from '../utils/generarPDFPersonal'

function leerArchivos(files, setError) {
  const arr = Array.from(files || [])
  return Promise.all(arr.slice(0, 3).map((file) => new Promise((resolve) => {
    if (file.size > 3 * 1024 * 1024) {
      setError(`"${file.name}" supera 3 MB`)
      resolve(null)
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => resolve({ nombre: file.name, tipo: file.type, dataUrl: e.target.result })
    reader.readAsDataURL(file)
  }))).then((xs) => xs.filter(Boolean))
}

function ModuloPersonalIndicadores({ sesion, logoMarca, forzarAbierto = false }) {
  const [abiertoInt, setAbierto] = useState(false)
  const abierto = forzarAbierto || abiertoInt
  const [tick, setTick] = useState(0)
  const [userId, setUserId] = useState('')
  const [tipo, setTipo] = useState('observaciones')
  const [texto, setTexto] = useState('')
  const [fechaNovedad, setFechaNovedad] = useState(() => new Date().toISOString().split('T')[0])
  const [archivos, setArchivos] = useState([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [informeUserId, setInformeUserId] = useState('')

  useEffect(() => {
    sincronizarNovedadesNube().then(() => setTick((n) => n + 1)).catch(() => {})
  }, [])

  const esAdmin = sesion?.rol === 'admin' || sesion?.esAdmin
  const esMaster = sesion?.rol === 'master'
  const perms = permisosDe(sesion)
  const veEquipo = esAdmin || perms.personalIndicadores === true

  const equipo = useMemo(() => {
    const todos = listarUsuarios().filter((u) => u.activo !== false)
    if (!veEquipo) return todos.filter((u) => u.id === sesion.id)
    if (esAdmin) return todos
    const mid = esMaster ? sesion.id : sesion.masterId
    return todos.filter((u) => String(u.id) === String(sesion.id) || String(u.masterId) === String(mid) || String(u.id) === String(mid))
  }, [sesion?.id, sesion?.masterId, esAdmin, esMaster, veEquipo, tick])

  const registros = useMemo(() => {
    void tick
    let lista = filtrarNovedades({ desde: desde || undefined, hasta: hasta || undefined })
    const ids = new Set(equipo.map((u) => u.id))
    return lista.filter((n) => ids.has(n.userId))
  }, [tick, desde, hasta, esAdmin, esMaster, sesion?.id, equipo])

  const seleccion = userId ? equipo.find((u) => u.id === userId) : null
  const regsSel = seleccion ? registros.filter((n) => n.userId === seleccion.id) : registros
  const conteo = contarPorTipo(regsSel)
  const total = regsSel.length || 1

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    try {
      const destino = seleccion || equipo.find((u) => u.id === userId) || (veEquipo ? null : equipo[0])
      const resultado = await crearNovedadPersonal({
        user: destino,
        tipo,
        texto,
        archivos,
        fecha: fechaNovedad || '',
        fechaNovedad: fechaNovedad || '',
        autorId: sesion.id,
        autorNombre: sesion.nombre
      })
      setTexto('')
      setArchivos([])
      setOk(resultado?.soloNube
        ? 'Novedad registrada en la nube. El navegador tenía el almacenamiento lleno; recarga con Ctrl+F5 para ver el historial completo.'
        : 'Novedad registrada')
      setTick((n) => n + 1)
    } catch (err) {
      const msg = String(err?.message || '')
      setError(/quota/i.test(msg)
        ? 'El almacenamiento del navegador está lleno. Recarga con Ctrl+F5 e intenta de nuevo; la novedad se guarda en la nube.'
        : msg)
    }
  }

  const pdfIndividual = () => {
    const u = equipo.find((x) => x.id === (informeUserId || userId || sesion.id))
    const regs = registros.filter((n) => n.userId === u?.id)
    if (!u) return
    generarPDFPersonal({
      titulo: 'INFORME DE PERSONAL · INDIVIDUAL',
      usuario: u,
      registros: regs,
      periodo: `${desde || 'inicio'} a ${hasta || 'hoy'}`,
      logoMarca,
      grupal: false
    })
  }

  const pdfGrupal = () => {
    generarPDFPersonal({
      titulo: 'INFORME DE PERSONAL · GRUPAL',
      registros,
      periodo: `${desde || 'inicio'} a ${hasta || 'hoy'}`,
      logoMarca,
      grupal: true
    })
  }

  const vistaIndividual = () => {
    const u = equipo.find((x) => x.id === (informeUserId || userId || sesion.id))
    const regs = registros.filter((n) => n.userId === u?.id)
    if (!u) return
    abrirVistaInformePersonal({
      titulo: 'INFORME DE PERSONAL · INDIVIDUAL',
      usuario: u,
      registros: regs,
      periodo: `${desde || 'inicio'} a ${hasta || 'hoy'}`,
      grupal: false
    })
  }

  const vistaGrupal = () => {
    abrirVistaInformePersonal({
      titulo: 'INFORME DE PERSONAL · GRUPAL',
      registros,
      periodo: `${desde || 'inicio'} a ${hasta || 'hoy'}`,
      grupal: true
    })
  }

  return (
    <div className="card">
      {!forzarAbierto && (
      <button type="button" className="info-toggle" onClick={() => setAbierto((v) => !v)}>
        <span style={{ width: '100%', textAlign: 'center' }}>PERSONAL E INDICADORES</span>
        <span>{abierto ? '▲' : '▼'}</span>
      </button>
      )}
      {abierto && (
        <div className="info-cuerpo">
          <h2 className="titulo-registro-personal">PERSONAL REGISTRADO</h2>

          {veEquipo && (
            <div className="form-group">
              <label>Usuario general (obligatorio para registrar)</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                <option value="">Seleccione el usuario</option>
                {equipo.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} · CC {u.cedula}</option>
                ))}
              </select>
            </div>
          )}

          <h3 className="titulo-registro-personal" style={{ fontSize: '1rem' }}>Visualizador general de novedades</h3>
          <div className="grid-personal-indicadores">
            {equipo.map((u) => {
              const regsU = registros.filter((n) => String(n.userId) === String(u.id))
              const c = contarPorTipo(regsU)
              const tot = regsU.length || 1
              return (
                <div key={u.id} className="tarjeta-personal-ind" style={{ cursor: 'pointer', outline: userId === u.id ? '2px solid #2563eb' : undefined }} onClick={() => setUserId(u.id)}>
                  <div className="ficha-usuario-card ficha-usuario-mapa" style={{ marginBottom: 8 }}>
                    <img src={u.foto} alt="" className="usuario-foto" />
                    <div>
                      <strong style={{ color: '#1d4ed8' }}>{u.nombre}</strong>
                      <p>CC {u.cedula} · {u.cargo || 'Sin cargo'}</p>
                      <p>Inicio: {fechaIngresoDe(u)}</p>
                      <p>Master: {u.masterNombre || (rolDe(u) === 'master' ? 'Es master' : (rolDe(u) === 'admin' ? 'Administrador' : 'N/D'))}</p>
                      <p>{regsU.length} novedad(es)</p>
                    </div>
                  </div>
                  {TIPOS_NOVEDAD.map((t) => {
                    const valor = c[t.key] || 0
                    const pct = regsU.length ? Math.round((valor / tot) * 100) : 0
                    return (
                      <div key={t.key} className="barra-item">
                        <div className="barra-label">
                          <span>{t.label}</span>
                          <strong>{valor}</strong>
                        </div>
                        <div className="barra-track">
                          <div className="barra-fill" style={{ width: `${pct}%`, background: t.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div className="indicadores-barras" style={{ marginTop: 14 }}>
            <div className="indicadores-barras-titulo">
              Indicadores · {regsSel.length} registro(s)
            </div>
            {TIPOS_NOVEDAD.map((t) => {
              const valor = conteo[t.key] || 0
              const pct = Math.round((valor / total) * 100)
              return (
                <div key={t.key} className="barra-item">
                  <div className="barra-label">
                    <span>{t.label}</span>
                    <strong>{valor} ({regsSel.length ? pct : 0}%)</strong>
                  </div>
                  <div className="barra-track">
                    <div className="barra-fill" style={{ width: `${regsSel.length ? pct : 0}%`, background: t.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={guardar} style={{ marginTop: 14 }}>
            <div className="form-group">
              <label>Seleccionar usuario a quien se carga la novedad</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">— Elegir nombre —</option>
                {equipo.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} · CC {u.cedula} · {u.cargo || ''}</option>
                ))}
              </select>
              {seleccion && (
                <small style={{ color: '#16a34a' }}>Se cargará a: {seleccion.nombre}</small>
              )}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha de la novedad</label>
                <input type="date" value={fechaNovedad} onChange={(e) => setFechaNovedad(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Módulo / indicador</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  {TIPOS_NOVEDAD.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Observación / detalle</label>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Adjuntar archivos (opcional, máx. 3)</label>
              <input
                type="file"
                multiple
                onChange={async (e) => {
                  setError('')
                  setArchivos(await leerArchivos(e.target.files, setError))
                }}
              />
              {archivos.length > 0 && <small>{archivos.map((a) => a.nombre).join(', ')}</small>}
            </div>
            {error && <p className="master-error">{error}</p>}
            {ok && <p style={{ color: '#16a34a' }}>{ok}</p>}
            <button type="submit" className="btn btn-primary">Registrar novedad v5</button>
          </form>

          <h3 style={{ margin: '18px 0 8px', color: '#1d4ed8', textAlign: 'center' }}>Generar informe</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha inicial</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Fecha final</label>
              <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Usuario (individual)</label>
              <select value={informeUserId} onChange={(e) => setInformeUserId(e.target.value)}>
                {equipo.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="filtros-botones">
            <button type="button" className="btn btn-secondary" onClick={vistaIndividual}>Ver individual</button>
            <button type="button" className="btn btn-primary" onClick={pdfIndividual}>PDF individual</button>
            {(esAdmin || esMaster) && (
              <>
                <button type="button" className="btn btn-secondary" onClick={vistaGrupal}>Ver grupal</button>
                <button type="button" className="btn btn-success" onClick={pdfGrupal}>PDF grupal</button>
              </>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {regsSel.map((n) => (
              <div key={n.id} className="aviso-item">
                <strong>{TIPOS_NOVEDAD.find((t) => t.key === n.tipo)?.label} · {n.nombre}</strong>
                <p>{n.fecha} {n.hora} · {n.texto}</p>
                {n.archivos?.length > 0 && <p>Archivos: {n.archivos.map((a) => a.nombre).join(', ')}</p>}
                {(esAdmin || esMaster) && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ width: 'auto', marginTop: 6 }}
                    onClick={() => {
                      if (!confirm('¿Borrar esta novedad?')) return
                      eliminarNovedadPersonal(n.id)
                      setTick((x) => x + 1)
                    }}
                  >
                    Borrar novedad
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModuloPersonalIndicadores
