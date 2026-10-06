import { useState } from 'react'
import { listarUsuarios, crearUsuario, actualizarUsuario, aplicarCambiosUsuario, rolDe, eliminarUsuario, cambiarRolUsuario, cambiarPassword, listarMasters, puedeGestionarUsuario, permisosDe, cupoDeMaster, PERMS_MASTER_DEFAULT, PERMS_GENERAL_DEFAULT } from '../lib/usuarios'

function etiquetaRol(u) {
  const r = rolDe(u)
  if (r === 'admin') return 'Administrador'
  if (r === 'master') return 'Master'
  return 'General'
}

function PanelPermisosUsuario({ u, soyAdmin, puedePermisosGenerales, onCambio }) {
  const rol = rolDe(u)
  if (rol === 'admin') return null
  const p = permisosDe(u)
  const guardar = (campo, valor) => {
    onCambio({ ...p, [campo]: valor })
  }
  if (rol === 'master' && !soyAdmin) return null
  if (rol === 'general' && !soyAdmin && !puedePermisosGenerales) return null

  return (
    <div className="permisos-desplegable">
      <div className="permisos-lista">
        {rol === 'master' && (
          <>
            <label><input type="checkbox" checked={p.crearGenerales !== false} onChange={(e) => guardar('crearGenerales', e.target.checked)} /> Crear usuarios generales</label>
            <label><input type="checkbox" checked={p.permisosGenerales !== false} onChange={(e) => guardar('permisosGenerales', e.target.checked)} /> Definir qué ven sus generales</label>
            <label><input type="checkbox" checked={p.borrarReportes !== false} onChange={(e) => guardar('borrarReportes', e.target.checked)} /> Borrar reportes</label>
            <label><input type="checkbox" checked={p.exportar !== false} onChange={(e) => guardar('exportar', e.target.checked)} /> Imprimir informes (mapa, PDF y Excel)</label>
            <label><input type="checkbox" checked={p.comparativoMapa === true} onChange={(e) => guardar('comparativoMapa', e.target.checked)} /> Ver indicador comparativo del mapa</label>
          </>
        )}
        {rol === 'general' && (
          <>
            <label><input type="checkbox" checked={p.reportar !== false} onChange={(e) => guardar('reportar', e.target.checked)} /> Crear reportes</label>
            <label><input type="checkbox" checked={p.verMapa !== false} onChange={(e) => guardar('verMapa', e.target.checked)} /> Ver mapa</label>
            <label><input type="checkbox" checked={p.verHistorial !== false} onChange={(e) => guardar('verHistorial', e.target.checked)} /> Ver historial</label>
            <label><input type="checkbox" checked={p.exportar !== false} onChange={(e) => guardar('exportar', e.target.checked)} /> Imprimir informes (mapa, PDF y Excel)</label>
            <label><input type="checkbox" checked={p.informativo !== false} onChange={(e) => guardar('informativo', e.target.checked)} /> Ver informativo</label>
            <label><input type="checkbox" checked={p.supervision === true} onChange={(e) => guardar('supervision', e.target.checked)} /> Informe de supervisión</label>
            <label><input type="checkbox" checked={p.personalIndicadores === true} onChange={(e) => guardar('personalIndicadores', e.target.checked)} /> Personal e indicadores</label>
            <label><input type="checkbox" checked={p.cambiarFoto === true} onChange={(e) => guardar('cambiarFoto', e.target.checked)} /> Cambiar foto de perfil</label>
            <label><input type="checkbox" checked={p.verAsistenciaEquipo === true} onChange={(e) => guardar('verAsistenciaEquipo', e.target.checked)} /> Ver asistencia del equipo</label>
          </>
        )}
      </div>
    </div>
  )
}

function GestionUsuarios({ sesion, onUsuariosChange, puedeCrearGenerales = true, puedePermisosGenerales = true }) {
  const miRol = sesion?.rol || (sesion?.esAdmin ? 'admin' : sesion?.esMaster ? 'master' : 'general')
  const soyAdmin = miRol === 'admin'
  const [usuarios, setUsuarios] = useState(() => listarUsuarios())
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    cargo: '',
    password: '',
    foto: null,
    rol: 'general',
    habilitarAhora: true,
    masterId: '',
    cupoGenerales: 5
  })
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [permisosUserId, setPermisosUserId] = useState(null)
  const [cuposEdit, setCuposEdit] = useState({})

  const refresh = () => {
    const lista = listarUsuarios()
    setUsuarios(lista)
    onUsuariosChange?.(lista)
  }

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('La foto no debe superar 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setForm(prev => ({ ...prev, foto: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    try {
      if (!form.nombre.trim() || !form.cedula.trim() || !form.password || !form.foto) {
        setError('Completa nombre, cédula, contraseña y foto')
        return
      }
      let rol = form.rol
      if (rol === 'admin' && !soyAdmin) {
        setError('Solo el administrador puede crear otro administrador')
        return
      }
      if (rol === 'master' && !soyAdmin) {
        setError('Solo el administrador puede crear usuarios master')
        return
      }
      if (!soyAdmin && rol !== 'general') rol = 'general'

      let masterId = form.masterId
      if (rol === 'general') {
        if (!soyAdmin) masterId = sesion.id
        if (!masterId) {
          setError('Selecciona el usuario master al que se vincula esta cuenta')
          return
        }
      }

      await crearUsuario({
        nombre: form.nombre,
        cedula: form.cedula,
        cargo: form.cargo,
        fechaInicioLaboral: form.fechaInicioLaboral || '',
        foto: form.foto,
        password: form.password,
        rol,
        activo: form.habilitarAhora,
        masterId: rol === 'general' ? masterId : null,
        cupoGenerales: rol === 'master' ? form.cupoGenerales : undefined,
        permisos: rol === 'master' ? {
          crearGenerales: form.permCrearGenerales !== false,
          permisosGenerales: form.permPermisosGenerales !== false,
          borrarReportes: form.permBorrarReportes !== false,
          exportar: form.permExportar !== false,
          personalIndicadores: form.permPersonalMaster !== false,
          verAsistenciaEquipo: form.permAsistEquipoMaster !== false
        } : rol === 'general' ? {
          reportar: form.permReportar !== false,
          verMapa: form.permVerMapa !== false,
          verHistorial: form.permVerHistorial !== false,
          exportar: form.permExportarG !== false,
          informativo: form.permInformativo !== false,
          supervision: !!form.permSupervision,
          personalIndicadores: !!form.permPersonal,
          cambiarFoto: !!form.permCambiarFoto,
          verAsistenciaEquipo: !!form.permVerAsistencia
        } : undefined
      })
      setForm({ nombre: '', cedula: '', cargo: '', password: '', foto: null, rol: 'general', habilitarAhora: true, masterId: soyAdmin ? '' : sesion.id, cupoGenerales: 5 })
      setOk('Usuario creado. Permisos aplicados en local y en la nube.')
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const puedeGestionar = (u) => puedeGestionarUsuario(sesion, u)

  const toggleTracking = (u) => {
    if (!puedeGestionar(u)) return
    actualizarUsuario(u.id, { trackingActivo: !u.trackingActivo })
    refresh()
  }

  const toggleActivo = (u) => {
    if (!puedeGestionar(u)) return
    actualizarUsuario(u.id, { activo: !u.activo })
    refresh()
  }

  const handleEliminar = (u) => {
    if (!window.confirm(`¿Eliminar al usuario ${u.nombre}? Esta acción no se puede deshacer.`)) return
    try {
      eliminarUsuario(u.id, sesion)
      setOk(`${u.nombre} eliminado. Cambio aplicado en la web.`)
      setError('')
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleResetPass = async (u) => {
    const nueva = window.prompt(`Nueva contraseña para ${u.nombre} (mín. 8, letras y números):`)
    if (!nueva) return
    try {
      await cambiarPassword({ userId: u.id, passwordNueva: nueva, actor: sesion })
      setOk(`Contraseña de ${u.nombre} actualizada`)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCambioRol = (u, nuevoRol) => {
    try {
      cambiarRolUsuario(u.id, nuevoRol, sesion)
      setOk(`Rol de ${u.nombre} actualizado a ${nuevoRol}`)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  const visibles = soyAdmin
    ? usuarios
    : usuarios.filter(u => u.id === sesion?.id || (rolDe(u) === 'general' && u.masterId === sesion?.id))
  const pendientes = visibles.filter(u => u.activo === false)
  const habilitados = visibles.filter(u => u.activo !== false)

  return (
    <div className="card">
      <h2>Gestión de usuarios ({soyAdmin ? 'Administrador' : 'Master'})</h2>
      {(soyAdmin || puedeCrearGenerales) ? (
        <form onSubmit={handleCrear}>
        <div className="form-row">
          <div className="form-group">
            <label>Nombre</label>
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Cédula</label>
            <input value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Cargo</label>
            <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Fecha de ingreso (opcional)</label>
            <input type="date" value={form.fechaInicioLaboral || ''} onChange={(e) => setForm({ ...form, fechaInicioLaboral: e.target.value })} />
            <small style={{ color: '#4b5563', fontSize: '0.75rem' }}>Si se deja vacío, se usa la fecha de registro.</small>
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            <small style={{ color: '#4b5563', fontSize: '0.75rem' }}>Mínimo 8 caracteres, letras y números</small>
          </div>
        </div>
        <div className="form-group">
          <label>Tipo de usuario</label>
          <select
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
          >
            <option value="general">Usuario general (solo reportar)</option>
            {soyAdmin && <option value="master">Master (supervisión)</option>}
            {soyAdmin && <option value="admin">Administrador general</option>}
          </select>
        </div>
        {form.rol === 'general' && soyAdmin && (
          <div className="form-group">
            <label>Vincular a usuario master</label>
            <select value={form.masterId} onChange={(e) => setForm({ ...form, masterId: e.target.value })} required>
              <option value="">Seleccione master</option>
              {listarMasters().map(m => (
                <option key={m.id} value={m.id}>{m.nombre} · CC {m.cedula}</option>
              ))}
            </select>
          </div>
        )}
        {form.rol === 'master' && soyAdmin && (
          <div className="form-group">
            <label>Permisos del master (solo administrador)</label>
            <label><input type="checkbox" checked={form.permCrearGenerales !== false} onChange={(e) => setForm({ ...form, permCrearGenerales: e.target.checked })} /> Crear usuarios generales y dar permisos</label>
            <label><input type="checkbox" checked={form.permPermisosGenerales !== false} onChange={(e) => setForm({ ...form, permPermisosGenerales: e.target.checked })} /> Definir qué pueden ver sus usuarios generales</label>
            <label><input type="checkbox" checked={form.permBorrarReportes !== false} onChange={(e) => setForm({ ...form, permBorrarReportes: e.target.checked })} /> Borrar reportes</label>
            <label><input type="checkbox" checked={form.permExportar !== false} onChange={(e) => setForm({ ...form, permExportar: e.target.checked })} /> Imprimir informes (mapa, PDF y Excel)</label>
            <label><input type="checkbox" checked={form.permPersonalMaster !== false} onChange={(e) => setForm({ ...form, permPersonalMaster: e.target.checked })} /> Personal e indicadores</label>
            <label><input type="checkbox" checked={form.permAsistEquipoMaster !== false} onChange={(e) => setForm({ ...form, permAsistEquipoMaster: e.target.checked })} /> Ver asistencia del equipo</label>
          </div>
        )}
        {form.rol === 'master' && soyAdmin && (
          <div className="form-group">
            <label>Cupo de usuarios generales (solo lo define el administrador)</label>
            <input
              type="number"
              min="0"
              value={form.cupoGenerales}
              onChange={(e) => setForm({ ...form, cupoGenerales: e.target.value })}
            />
            <small style={{ color: '#4b5563', fontSize: '0.75rem' }}>
              Cantidad máxima de usuarios generales que este master podrá tener a cargo.
            </small>
          </div>
        )}
        {form.rol === 'general' && (soyAdmin || puedePermisosGenerales) && (
          <div className="form-group">
            <label>Qué podrá ver este usuario general</label>
            <label><input type="checkbox" checked={form.permReportar !== false} onChange={(e) => setForm({ ...form, permReportar: e.target.checked })} /> Crear reportes</label>
            <label><input type="checkbox" checked={form.permVerMapa !== false} onChange={(e) => setForm({ ...form, permVerMapa: e.target.checked })} /> Ver mapa</label>
            <label><input type="checkbox" checked={form.permVerHistorial !== false} onChange={(e) => setForm({ ...form, permVerHistorial: e.target.checked })} /> Ver historial</label>
            <label><input type="checkbox" checked={form.permExportarG !== false} onChange={(e) => setForm({ ...form, permExportarG: e.target.checked })} /> Imprimir informes (mapa, PDF y Excel)</label>
            <label><input type="checkbox" checked={form.permInformativo !== false} onChange={(e) => setForm({ ...form, permInformativo: e.target.checked })} /> Ver informativo</label>
            <label><input type="checkbox" checked={!!form.permSupervision} onChange={(e) => setForm({ ...form, permSupervision: e.target.checked })} /> Informe de supervisión</label>
            <label><input type="checkbox" checked={!!form.permPersonal} onChange={(e) => setForm({ ...form, permPersonal: e.target.checked })} /> Personal e indicadores (llenar y ver datos)</label>
            <label><input type="checkbox" checked={!!form.permCambiarFoto} onChange={(e) => setForm({ ...form, permCambiarFoto: e.target.checked })} /> Cambiar foto de perfil</label>
          </div>
        )}
        {form.rol === 'general' && !soyAdmin && (
          <p style={{ fontSize: '0.82rem', color: '#4b5563', marginBottom: 10 }}>
            Este usuario general quedará vinculado a tu cuenta master ({sesion?.nombre}).
          </p>
        )}
        <div className="form-group">
          <label>Foto</label>
          <div className="foto-opciones">
            <label className="btn btn-secondary foto-btn">
              📁 Subir foto
              <input type="file" accept="image/*" onChange={handleFoto} hidden />
            </label>
            <label className="btn btn-primary foto-btn">
              📷 Tomar foto
              <input type="file" accept="image/*" capture="user" onChange={handleFoto} hidden />
            </label>
          </div>
          {form.foto && (
            <div style={{ marginTop: 10 }}>
              <img src={form.foto} alt="preview" className="usuario-foto-preview" />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', marginTop: 8 }}
                onClick={() => setForm(prev => ({ ...prev, foto: null }))}
              >
                Quitar foto
              </button>
            </div>
          )}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={form.habilitarAhora}
            onChange={(e) => setForm({ ...form, habilitarAhora: e.target.checked })}
          />
          Habilitar de inmediato (si no, queda pendiente de aprobación)
        </label>
        {error && <p className="master-error">{error}</p>}
        {ok && <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>{ok}</p>}
        <button type="submit" className="btn btn-primary">Crear usuario</button>
      </form>
      ) : (
        <p style={{ color: '#b45309' }}>El administrador no te habilitó crear usuarios generales.</p>
      )}

      <div className="pendientes-box">
        <h3>
          ⏳ Pendientes de habilitación ({pendientes.length})
        </h3>
        {pendientes.length === 0 ? (
          <p className="empty-state" style={{ padding: '8px 0' }}>
            No hay solicitudes nuevas. Cuando un usuario general se registre, aparecerá aquí para habilitarlo.
          </p>
        ) : (
          <div className="lista-usuarios">
            {pendientes.map(u => (
              <div key={u.id} className="usuario-item" style={{ borderColor: '#f59e0b', background: '#fffbeb' }}>
                {u.foto ? <img src={u.foto} alt="" className="usuario-foto" /> : <span className="usuario-foto usuario-foto-vacia">{(u.nombre || '?').slice(0, 1)}</span>}
                <div className="usuario-item-info">
                  <strong>{u.nombre}</strong>
                  <p>CC {u.cedula} · {u.cargo || 'Sin cargo'}</p>
                  <p>{etiquetaRol(u)} · Pendiente · Master: {u.masterNombre || 'N/D'}</p>
                </div>
                {puedeGestionar(u) && (
                  <div className="usuario-item-acciones">
                    <button type="button" className="btn btn-success" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => toggleActivo(u)}>
                      Habilitar
                    </button>
                    <button type="button" className="btn btn-danger" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => handleEliminar(u)}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 style={{ marginTop: 20, marginBottom: 10, color: '#1d4ed8', fontSize: '1rem' }}>Usuarios habilitados</h3>
      <div className="lista-usuarios">
        {habilitados.map(u => (
          <div key={u.id} className="usuario-item usuario-item-col">
            <div className="usuario-item-fila">
            {u.foto ? <img src={u.foto} alt="" className="usuario-foto" /> : <span className="usuario-foto usuario-foto-vacia">{(u.nombre || '?').slice(0, 1)}</span>}
            <div className="usuario-item-info">
              <strong>{u.nombre}</strong>
              <p>CC {u.cedula} · {u.cargo || 'Sin cargo'}</p>
              <p>
                {etiquetaRol(u)}{u.masterNombre ? ` · Master: ${u.masterNombre}` : ''}{rolDe(u) === 'master' ? ` · Cupo generales: ${cupoDeMaster(u)}` : ''} · Habilitado · GPS {u.trackingActivo !== false ? 'ON' : 'OFF'}
              </p>
            </div>
            {puedeGestionar(u) && (
              <div className="usuario-item-acciones">
                {soyAdmin && u.id !== sesion?.id && (
                  <select
                    value={rolDe(u)}
                    onChange={(e) => handleCambioRol(u, e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid #93c5fd', fontSize: '0.78rem' }}
                  >
                    <option value="general">General</option>
                    <option value="master">Master</option>
                    <option value="admin">Administrador</option>
                  </select>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => setPermisosUserId(permisosUserId === u.id ? null : u.id)}
                >
                  {permisosUserId === u.id ? 'Cerrar permisos' : 'Permisos'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => toggleTracking(u)}>
                  {u.trackingActivo !== false ? 'Desactivar GPS' : 'Activar GPS'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => toggleActivo(u)}>
                  Deshabilitar
                </button>
                {soyAdmin && rolDe(u) === 'master' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min="0"
                      title="Cupo de generales"
                      value={cuposEdit[u.id] ?? u.cupoGenerales ?? 0}
                      style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: '1px solid #93c5fd', fontSize: '0.78rem' }}
                      onChange={(e) => setCuposEdit((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }}
                      onClick={() => {
                        const n = Math.max(0, parseInt(cuposEdit[u.id] ?? u.cupoGenerales ?? 0, 10) || 0)
                        aplicarCambiosUsuario(u.id, { cupoGenerales: n })
                          .then(() => {
                            setCuposEdit((prev) => ({ ...prev, [u.id]: n }))
                            setOk(`Cupo de ${u.nombre} aplicado en la web: ${n} usuario(s) general(es)`)
                            refresh()
                          })
                          .catch((err) => setError(err.message))
                      }}
                    >
                      Aplicar cupo
                    </button>
                  </span>
                )}
                {soyAdmin && rolDe(u) === 'master' && u.logoMarca && (
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => {
                    actualizarUsuario(u.id, { logoMarca: null })
                    setOk(`Logo de ${u.nombre} eliminado`)
                    refresh()
                  }}>
                    Quitar logo
                  </button>
                )}
                {(soyAdmin || rolDe(u) === 'general') && u.id !== sesion?.id && (
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => handleResetPass(u)}>
                    Cambiar clave
                  </button>
                )}
                <button type="button" className="btn btn-danger" style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => handleEliminar(u)}>
                  Eliminar
                </button>
              </div>
            )}
            </div>
            {puedeGestionar(u) && permisosUserId === u.id && (
              <PanelPermisosUsuario
                u={u}
                soyAdmin={soyAdmin}
                puedePermisosGenerales={puedePermisosGenerales}
                onCambio={(permisos) => {
                  aplicarCambiosUsuario(u.id, { permisos })
                    .then(() => {
                      setOk(`Permisos de ${u.nombre} aplicados en la web`)
                      refresh()
                    })
                    .catch((err) => setError(err.message))
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default GestionUsuarios
