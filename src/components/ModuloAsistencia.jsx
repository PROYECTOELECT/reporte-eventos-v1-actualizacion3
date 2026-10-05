import { useEffect, useMemo, useState } from 'react'
import { listarUsuarios, permisosDe } from '../lib/usuarios'
import { sincronizarAsistenciaNube } from '../lib/asistencia'
import {
  listarAsistencias,
  registrarIngreso,
  registrarSalida,
  registroDelDia,
  formatoTiempo,
  rangoSemana,
  rangoMes,
  rangoAnio,
  minutosHastaAhora
} from '../lib/asistencia'
import { generarPDFAsistencia, abrirVistaAsistencia } from '../utils/generarPDFAsistencia'

function leerFoto(file, cb, setError) {
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    setError('La foto no debe superar 2 MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => cb(e.target.result)
  reader.readAsDataURL(file)
}

function ModuloAsistencia({ sesion, logoMarca, forzarAbierto = false }) {
  const [abiertoInt, setAbierto] = useState(false)
  const abierto = forzarAbierto || abiertoInt
  const [verEquipo, setVerEquipo] = useState(false)
  const [tick, setTick] = useState(0)
  const [ahora, setAhora] = useState(Date.now())
  const [trabajadorId, setTrabajadorId] = useState(sesion?.id || '')
  const [foto, setFoto] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [modoPeriodo, setModoPeriodo] = useState('dia')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0])
  const [informeUserId, setInformeUserId] = useState(sesion?.id || '')

  const esAdmin = sesion?.rol === 'admin' || sesion?.esAdmin
  const esMaster = sesion?.rol === 'master'
  const perms = permisosDe(sesion)
  const veEquipoAsist = esAdmin || perms.verAsistenciaEquipo === true

  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    sincronizarAsistenciaNube().then(() => setTick((n) => n + 1)).catch(() => {})
  }, [])

  const equipo = useMemo(() => {
    const todos = listarUsuarios().filter((u) => u.activo !== false)
    if (!veEquipoAsist) return todos.filter((u) => u.id === sesion.id)
    if (esAdmin) return todos
    const mid = esMaster ? sesion.id : sesion.masterId
    return todos.filter((u) => String(u.id) === String(sesion.id) || String(u.masterId) === String(mid) || String(u.id) === String(mid))
  }, [sesion?.id, esAdmin, esMaster, tick])

  const trabajador = equipo.find((u) => u.id === trabajadorId) || equipo[0]
  const hoy = trabajador ? registroDelDia(trabajador.id) : null

  const registros = useMemo(() => {
    void tick
    void ahora
    return listarAsistencias()
      .filter((r) => {
        if (r.fecha < fechaInicio || r.fecha > fechaFin) return false
        if (veEquipoAsist) {
          if (esAdmin) return true
          const mid = esMaster ? sesion.id : sesion.masterId
          return String(r.masterId) === String(mid) || String(r.userId) === String(sesion.id) || String(r.userId) === String(mid)
        }
        return r.userId === sesion.id
      })
      .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
  }, [tick, fechaInicio, fechaFin, esAdmin, esMaster, sesion?.id, ahora])

  const aplicarPeriodo = (modo) => {
    setModoPeriodo(modo)
    const ref = new Date().toISOString().split('T')[0]
    if (modo === 'dia') {
      setFechaInicio(ref)
      setFechaFin(ref)
    } else if (modo === 'semana') {
      const r = rangoSemana(ref)
      setFechaInicio(r.desde)
      setFechaFin(r.hasta)
    } else if (modo === 'mes') {
      const r = rangoMes(ref)
      setFechaInicio(r.desde)
      setFechaFin(r.hasta)
    } else if (modo === 'anio') {
      const r = rangoAnio(ref)
      setFechaInicio(r.desde)
      setFechaFin(r.hasta)
    }
  }

  const minutosUsuario = useMemo(() => {
    if (!trabajador) return 0
    void ahora
    const lista = listarAsistencias().filter((r) => String(r.userId) === String(trabajador.id) && r.fecha >= fechaInicio && r.fecha <= fechaFin)
    let total = lista.reduce((s, r) => s + (Number(r.minutosLaborados) || 0), 0)
    const abiertoHoy = registroDelDia(trabajador.id)
    if (abiertoHoy?.horaIngreso && !abiertoHoy.horaSalida) {
      total += minutosHastaAhora(abiertoHoy.horaIngreso)
    }
    return total
  }, [trabajador?.id, fechaInicio, fechaFin, tick, ahora])

  const handleIngreso = () => {
    setError('')
    setOk('')
    try {
      registrarIngreso({
        user: trabajador,
        foto,
        autorId: sesion.id,
        masterId: sesion.rol === 'master' ? sesion.id : (trabajador?.masterId || sesion.masterId),
        masterNombre: sesion.rol === 'master' ? sesion.nombre : (trabajador?.masterNombre || sesion.masterNombre)
      })
      setFoto('')
      setOk('Hora de llegada registrada')
      setTick((n) => n + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleSalida = () => {
    setError('')
    setOk('')
    try {
      registrarSalida({ userId: trabajador.id, foto })
      setFoto('')
      setOk('Hora de salida registrada')
      setTick((n) => n + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  const periodoTxt = `${fechaInicio} a ${fechaFin}`

  const pdfIndividual = () => {
    const uid = informeUserId || trabajador?.id
    const persona = equipo.find((u) => u.id === uid)
    const regs = registros.filter((r) => r.userId === uid)
    if (!persona) {
      setError('Selecciona un trabajador')
      return
    }
    generarPDFAsistencia({
      titulo: 'REGISTRO DE PERSONAL · INFORME INDIVIDUAL',
      registros: regs,
      trabajador: persona,
      periodo: periodoTxt,
      logoMarca,
      grupal: false
    })
  }

  const pdfGrupal = () => {
    generarPDFAsistencia({
      titulo: 'REGISTRO DE PERSONAL · INFORME GRUPAL',
      registros,
      periodo: periodoTxt,
      logoMarca,
      grupal: true
    })
  }

  const vistaIndividual = () => {
    const uid = informeUserId || trabajador?.id
    const persona = equipo.find((u) => u.id === uid)
    const regs = registros.filter((r) => r.userId === uid)
    if (!persona) {
      setError('Selecciona un trabajador')
      return
    }
    abrirVistaAsistencia({
      titulo: 'REGISTRO DE PERSONAL · INFORME INDIVIDUAL',
      registros: regs,
      trabajador: persona,
      periodo: periodoTxt,
      grupal: false
    })
  }

  return (
    <div className="card modulo-asistencia">
      {!forzarAbierto && (
      <button type="button" className="info-toggle" onClick={() => setAbierto((v) => !v)}>
        <span style={{ width: '100%', textAlign: 'center' }}>REGISTRO DE PERSONAL</span>
        <span>{abierto ? '▲' : '▼'}</span>
      </button>
      )}
      {abierto && (
        <div className="info-cuerpo">
          <h2 className="titulo-registro-personal">REGISTRO DE PERSONAL</h2>

          {(esAdmin || esMaster) && (
            <div className="form-group">
              <label>Trabajador</label>
              <select value={trabajador?.id || ''} onChange={(e) => { setTrabajadorId(e.target.value); setInformeUserId(e.target.value); setFoto(''); setError(''); setOk('') }}>
                {equipo.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre} · CC {u.cedula}</option>
                ))}
              </select>
            </div>
          )}

          {trabajador && (
            <div className="ficha-usuario-card ficha-usuario-mapa">
              <img src={trabajador.foto} alt="" className="usuario-foto" />
              <div>
                <strong style={{ color: '#1d4ed8' }}>{trabajador.nombre}</strong>
                <p>CC {trabajador.cedula} · {trabajador.cargo || 'Sin cargo'}</p>
                <p>{trabajador.rol === 'general' || (!trabajador.esMaster && trabajador.rol !== 'admin') ? 'General' : (trabajador.rol === 'admin' ? 'Administrador' : 'Master')}{trabajador.masterNombre ? ` · Master: ${trabajador.masterNombre}` : ''}</p>
                <p>Llegada: {hoy?.horaIngreso || '--:--'} · Salida: {hoy?.horaSalida || '--:--'}</p>
              </div>
            </div>
          )}

          <div className="contador-laborado">
            Tiempo laborado en el periodo: <strong>{formatoTiempo(minutosUsuario)}</strong>
          </div>

          <div className="form-group">
            <label>{hoy?.horaIngreso && !hoy?.horaSalida ? 'Foto de salida' : 'Foto de llegada'}</label>
            <div className="foto-acciones">
              <label className="btn btn-secondary foto-btn">
                Subir foto
                <input type="file" accept="image/*" hidden onChange={(e) => leerFoto(e.target.files?.[0], setFoto, setError)} />
              </label>
              <label className="btn btn-primary foto-btn">
                Tomar foto
                <input type="file" accept="image/*" capture="user" hidden onChange={(e) => leerFoto(e.target.files?.[0], setFoto, setError)} />
              </label>
            </div>
            {foto && <img src={foto} alt="evidencia" className="usuario-foto-preview" style={{ marginTop: 8 }} />}
          </div>

          <div className="filtros-botones">
            <button type="button" className="btn btn-primary" onClick={handleIngreso} disabled={!trabajador || !!hoy?.horaIngreso}>Registrar llegada</button>
            <button type="button" className="btn btn-secondary" onClick={handleSalida} disabled={!trabajador || !hoy?.horaIngreso || !!hoy?.horaSalida}>Registrar salida</button>
          </div>
          {error && <p className="master-error">{error}</p>}
          {ok && <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>{ok}</p>}

          {(esAdmin || esMaster) && (
            <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setVerEquipo((v) => !v)}>
              {verEquipo ? 'Ocultar personal' : 'Ver todos los usuarios registrados'}
            </button>
          )}
          {verEquipo && (
            <div className="lista-usuarios" style={{ marginTop: 10 }}>
              {equipo.map((u) => {
                const d = registroDelDia(u.id)
                return (
                  <div key={u.id} className="ficha-usuario-card ficha-usuario-mapa">
                    <img src={u.foto} alt="" className="usuario-foto" />
                    <div>
                      <strong>{u.nombre}</strong>
                      <p>CC {u.cedula} · {u.cargo || 'Sin cargo'}</p>
                      <p>Hoy: {d?.horaIngreso || 'sin llegada'} → {d?.horaSalida || 'en turno / sin salida'}{d?.horaSalida ? ` · ${formatoTiempo(d.minutosLaborados)}` : ''}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <h3 style={{ margin: '16px 0 8px', color: '#1d4ed8', fontSize: '0.95rem', textAlign: 'center' }}>Informes de asistencia</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Periodo rápido</label>
              <select value={modoPeriodo} onChange={(e) => aplicarPeriodo(e.target.value)}>
                <option value="dia">Día</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes</option>
                <option value="anio">Año</option>
                <option value="rango">Rango personalizado</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha inicial</label>
              <input type="date" value={fechaInicio} onChange={(e) => { setFechaInicio(e.target.value); setModoPeriodo('rango') }} />
            </div>
            <div className="form-group">
              <label>Fecha final</label>
              <input type="date" value={fechaFin} onChange={(e) => { setFechaFin(e.target.value); setModoPeriodo('rango') }} />
            </div>
            <div className="form-group">
              <label>Trabajador (individual)</label>
              <select value={informeUserId} onChange={(e) => setInformeUserId(e.target.value)}>
                {equipo.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="filtros-hint">{registros.length} registro(s) · {periodoTxt}</p>
          <div className="filtros-botones">
            <button type="button" className="btn btn-secondary" onClick={vistaIndividual}>Ver individual</button>
            <button type="button" className="btn btn-primary" onClick={pdfIndividual}>PDF individual</button>
            {(esAdmin || esMaster) && <button type="button" className="btn btn-success" onClick={pdfGrupal}>PDF grupal</button>}
          </div>

          <h3 style={{ margin: '16px 0 8px', fontSize: '0.95rem' }}>Registro día a día</h3>
          <div className="lista-asistencia">
            {registros.length === 0 && <p className="empty-state">No hay registros en este periodo.</p>}
            {registros.map((r) => (
              <div key={r.id} className="ficha-usuario-card ficha-usuario-mapa">
                <img src={r.fotoPerfil || r.fotoIngreso} alt="" className="usuario-foto" />
                <div>
                  <strong>{r.nombre}</strong>
                  <p>CC {r.cedula} · {r.cargo || 'Sin cargo'} · {r.fecha}</p>
                  <p>Llegada {r.horaIngreso || '--'} · Salida {r.horaSalida || 'abierto'} · {r.horaSalida ? formatoTiempo(r.minutosLaborados) : formatoTiempo(minutosHastaAhora(r.horaIngreso))}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModuloAsistencia
