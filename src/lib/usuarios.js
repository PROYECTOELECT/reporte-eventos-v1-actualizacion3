import { supabase } from './supabase'

const USERS_KEY = 'usuarios_sistema_v1'
const SESSION_KEY = 'sesion_usuario_v1'
const LOCK_KEY = 'login_lock_v1'

const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 10
const SESION_MAX_MS = 8 * 60 * 60 * 1000
const INACTIVIDAD_MS = 45 * 60 * 1000

export const ROL_ADMIN = 'admin'
export const ROL_MASTER = 'master'
export const ROL_GENERAL = 'general'

const CUPOS_KEY = 'cupos_master_v1'

export function guardarCupoLocal(id, n) {
  try {
    const m = JSON.parse(localStorage.getItem(CUPOS_KEY) || '{}')
    m[String(id)] = Number(n) || 0
    localStorage.setItem(CUPOS_KEY, JSON.stringify(m))
  } catch (_) {}
}

export function cupoDeMaster(master) {
  const id = master?.id
  const directo = Number(master?.cupoGenerales ?? 0)
  try {
    const m = JSON.parse(localStorage.getItem(CUPOS_KEY) || '{}')
    const extra = Number(m[String(id)] ?? 0)
    return extra > 0 ? extra : directo
  } catch {
    return directo
  }
}

export const PERMS_MASTER_DEFAULT = {
  crearGenerales: true,
  permisosGenerales: true,
  borrarReportes: true,
  exportar: true,
  supervision: true,
  personalIndicadores: true,
  verAsistenciaEquipo: true,
  comparativoMapa: false
}

export const PERMS_GENERAL_DEFAULT = {
  reportar: true,
  verMapa: true,
  verHistorial: true,
  exportar: true,
  informativo: true,
  supervision: false,
  personalIndicadores: false,
  cambiarFoto: false,
  verAsistenciaEquipo: false
}

export function permisosDe(user) {
  if (!user) return { ...PERMS_GENERAL_DEFAULT }
  const rol = rolDe(user)
  if (rol === ROL_ADMIN) {
    return { ...PERMS_MASTER_DEFAULT, ...PERMS_GENERAL_DEFAULT, crearGenerales: true, permisosGenerales: true, borrarReportes: true, exportar: true, informativo: true, supervision: true, personalIndicadores: true, cambiarFoto: true, comparativoMapa: true }
  }
  if (rol === ROL_MASTER) {
    return { ...PERMS_MASTER_DEFAULT, ...(user.permisos || {}) }
  }
  return { ...PERMS_GENERAL_DEFAULT, ...(user.permisos || {}) }
}

export function rolDe(user) {
  if (!user) return ROL_GENERAL
  if (user.rol) return user.rol
  if (user.esMaster) return ROL_MASTER
  return ROL_GENERAL
}

export function esAdmin(user) {
  return rolDe(user) === ROL_ADMIN
}

export function esMaster(user) {
  return rolDe(user) === ROL_MASTER || rolDe(user) === ROL_ADMIN
}

export function listarUsuarios() {
  try {
    const lista = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    return migrarRoles(lista)
  } catch {
    return []
  }
}

function migrarRoles(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return lista
  let changed = false
  const out = lista.map((u, i) => {
    if (u.rol) return u
    changed = true
    const rol = i === 0 ? 'admin' : (u.esMaster ? 'master' : 'general')
    return { ...u, rol, esMaster: rol !== 'general' }
  })
  const hayAdmin = out.some(u => u.rol === 'admin')
  if (!hayAdmin && out.length) {
    out[0] = { ...out[0], rol: 'admin', esMaster: true }
    changed = true
  }
  if (changed) localStorage.setItem(USERS_KEY, JSON.stringify(out))
  return out
}

export function guardarUsuarios(lista) {
  const escribir = (arr) => localStorage.setItem(USERS_KEY, JSON.stringify(arr))
  try {
    escribir(lista)
  } catch (e) {
    const liviana = (lista || []).map((u) => ({
      ...u,
      foto: u.foto && String(u.foto).length > 60000 ? '' : u.foto,
      logoMarca: u.logoMarca && String(u.logoMarca).length > 60000 ? null : u.logoMarca
    }))
    try {
      escribir(liviana)
    } catch (_) {
      throw new Error('El almacenamiento del navegador está lleno. En el navegador borra datos de este sitio (caché / almacenamiento) e ingresa de nuevo.')
    }
  }
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256(texto) {
  const data = new TextEncoder().encode(texto)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return toHex(hash)
}

function saltAleatorio() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

export async function hashearPassword(password) {
  const salt = saltAleatorio()
  const hash = await sha256(`${salt}:${password}`)
  return `v1$${salt}$${hash}`
}

export async function verificarPassword(password, guardado) {
  if (!guardado) return false
  if (String(guardado).startsWith('v1$')) {
    const partes = String(guardado).split('$')
    if (partes.length !== 3) return false
    const salt = partes[1]
    const hash = partes[2]
    const calc = await sha256(`${salt}:${password}`)
    return calc === hash
  }
  return String(guardado) === String(password)
}

function leerLocks() {
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || '{}')
  } catch {
    return {}
  }
}

function guardarLocks(obj) {
  localStorage.setItem(LOCK_KEY, JSON.stringify(obj))
}

export function estadoBloqueo(cedula) {
  const key = String(cedula || '').trim()
  const locks = leerLocks()
  const item = locks[key]
  if (!item) return { bloqueado: false, intentos: 0, restanteMin: 0 }
  if (item.until && Date.now() < item.until) {
    return {
      bloqueado: true,
      intentos: item.fails || 0,
      restanteMin: Math.ceil((item.until - Date.now()) / 60000)
    }
  }
  return { bloqueado: false, intentos: item.fails || 0, restanteMin: 0 }
}

function registrarFallo(cedula) {
  const key = String(cedula || '').trim()
  const locks = leerLocks()
  const prev = locks[key] || { fails: 0 }
  const fails = (prev.fails || 0) + 1
  const item = { fails, until: null }
  if (fails >= MAX_INTENTOS) {
    item.until = Date.now() + BLOQUEO_MINUTOS * 60 * 1000
  }
  locks[key] = item
  guardarLocks(locks)
  return item
}

function limpiarFallos(cedula) {
  const key = String(cedula || '').trim()
  const locks = leerLocks()
  delete locks[key]
  guardarLocks(locks)
}

export function validarPasswordPolitica(password) {
  const p = String(password || '')
  if (p.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) {
    return 'La contraseña debe incluir letras y números'
  }
  return null
}

export function listarMasters() {
  return listarUsuarios().filter((u) => rolDe(u) === ROL_MASTER && u.activo !== false)
}

export function buscarMasterPorNombre(nombre) {
  const q = String(nombre || '').trim().toLowerCase()
  if (!q) return null
  return listarMasters().find((m) => String(m.nombre).trim().toLowerCase() === q) || null
}

export async function crearUsuario({
  nombre,
  cedula,
  cargo,
  foto,
  password,
  rol,
  activo,
  esMaster = false,
  masterId,
  masterNombre,
  cupoGenerales,
  permisos,
  fechaInicioLaboral
}) {
  await sincronizarUsuariosNube()
  const usuarios = listarUsuarios()
  const ced = String(cedula).trim()
  if (!nombre?.trim()) throw new Error('El nombre es obligatorio')
  if (!ced) throw new Error('La cédula es obligatoria')
  if (!foto) throw new Error('La foto es obligatoria')
  const pol = validarPasswordPolitica(password)
  if (pol) throw new Error(pol)
  if (usuarios.some((u) => u.cedula === ced)) {
    throw new Error('Ya existe un usuario con esa cédula')
  }
  const passwordHash = await hashearPassword(password)
  const primerUsuario = usuarios.length === 0
  let rolFinal = ROL_GENERAL
  if (primerUsuario) rolFinal = ROL_ADMIN
  else if (rol === ROL_ADMIN || rol === ROL_MASTER || rol === ROL_GENERAL) rolFinal = rol
  else if (esMaster) rolFinal = ROL_MASTER

  let vinculo = { masterId: null, masterNombre: '' }
  if (rolFinal === ROL_GENERAL && !primerUsuario) {
    let master = null
    if (masterId) master = usuarios.find((u) => u.id === masterId && rolDe(u) === ROL_MASTER)
    if (!master && masterNombre) master = buscarMasterPorNombre(masterNombre)
    if (!master) {
      throw new Error('Debes vincular la cuenta con un usuario master existente. Escribe o selecciona el nombre exacto del master.')
    }
    vinculo = { masterId: master.id, masterNombre: master.nombre }
    const cupo = cupoDeMaster(master)
    const usados = usuarios.filter(u => rolDe(u) === ROL_GENERAL && String(u.masterId) === String(master.id)).length
    if (cupo <= 0) {
      throw new Error(`Este master no tiene cupo de generales. Entra como administrador, escribe el número y pulsa Aplicar cupo.`)
    }
    if (usados >= cupo) {
      throw new Error(`Este master ya alcanzó su cupo de ${cupo} usuario(s) general(es). El administrador debe ampliar el permiso.`)
    }
  }

  const activoFinal = primerUsuario ? true : activo === true
  const cupoFinal = rolFinal === ROL_MASTER ? Math.max(0, parseInt(cupoGenerales ?? 0, 10) || 0) : 0

  const nuevo = {
    id: crypto.randomUUID?.() || String(Date.now()),
    nombre: nombre.trim(),
    cedula: ced,
    cargo: (cargo || '').trim(),
    foto,
    passwordHash,
    rol: rolFinal,
    esMaster: rolFinal === ROL_ADMIN || rolFinal === ROL_MASTER,
    activo: activoFinal,
    trackingActivo: true,
    cupoGenerales: cupoFinal,
    tituloInforme: '',
    permisos: permisos
      ? permisos
      : (rolFinal === ROL_MASTER ? { ...PERMS_MASTER_DEFAULT } : (rolFinal === ROL_GENERAL ? { ...PERMS_GENERAL_DEFAULT } : {})),
    creadoEn: new Date().toISOString(),
    fechaInicioLaboral: fechaInicioLaboral || '',
    ...vinculo
  }
  usuarios.push(nuevo)
  guardarUsuarios(usuarios)
  try {
    await guardarUsuarioNube(nuevo)
  } catch (err) {
    throw err
  }
  return { ...nuevo, passwordHash: undefined }
}

export function puedeGestionarUsuario(actor, objetivo) {
  if (!actor || !objetivo) return false
  if (String(actor.id) === String(objetivo.id)) return false
  const ra = rolDe(actor)
  const ro = rolDe(objetivo)
  if (ra === ROL_ADMIN) return true
  if (ra === ROL_MASTER && ro === ROL_GENERAL && String(objetivo.masterId) === String(actor.id)) {
    return true
  }
  return false
}

export function actualizarUsuario(id, cambios) {
  const usuarios = listarUsuarios()
  const idx = usuarios.findIndex((u) => u.id === id)
  if (idx < 0) throw new Error('Usuario no encontrado')
  const seguro = { ...cambios }
  delete seguro.password
  delete seguro.passwordHash
  usuarios[idx] = { ...usuarios[idx], ...seguro }
  guardarUsuarios(usuarios)
  guardarUsuarioNube(usuarios[idx]).catch((err) => console.warn(err.message))
  return usuarios[idx]
}

export async function aplicarCambiosUsuario(id, cambios) {
  const actualizado = actualizarUsuario(id, cambios)
  const parche = {}
  if (cambios.cupoGenerales != null) {
    parche.cupo_generales = Number(cambios.cupoGenerales) || 0
    guardarCupoLocal(id, parche.cupo_generales)
  }
  if (cambios.permisos) parche.permisos = cambios.permisos
  if (Object.keys(parche).length) {
    const { error } = await supabase.from(TABLA_USUARIOS).update(parche).eq('id', id)
    if (error) {
      try {
        await guardarUsuarioNube(actualizado)
      } catch (err) {
        throw new Error(
          'El cupo se guardó en este dispositivo, pero no en la nube. En Supabase crea la columna cupo_generales (int) en usuarios_app. ' +
          (err.message || error.message)
        )
      }
    }
  } else {
    try {
      await guardarUsuarioNube(actualizado)
    } catch (err) {
      throw new Error(err.message || 'No se pudo aplicar en la nube')
    }
  }
  return actualizado
}

export async function login(cedula, password) {
  await sincronizarUsuariosNube()
  const ced = String(cedula || '').trim()
  const lock = estadoBloqueo(ced)
  if (lock.bloqueado) {
    throw new Error(`Cuenta bloqueada por intentos fallidos. Intenta en ${lock.restanteMin} minuto(s).`)
  }

  const usuarios = listarUsuarios()
  const user = usuarios.find((u) => u.cedula === ced)
  if (!user) {
    registrarFallo(ced)
    throw new Error('Cédula o contraseña incorrecta')
  }
  if (user.activo === false) {
    throw new Error('Tu cuenta está pendiente de habilitación. Espera aprobación de un administrador o master.')
  }

  const stored = user.passwordHash || user.password
  const ok = await verificarPassword(password, stored)
  if (!ok) {
    const item = registrarFallo(ced)
    if (item.until) {
      throw new Error(`Demasiados intentos. Cuenta bloqueada ${BLOQUEO_MINUTOS} minutos.`)
    }
    const quedan = MAX_INTENTOS - item.fails
    throw new Error(`Cédula o contraseña incorrecta. Intentos restantes: ${quedan}`)
  }

  if (!String(stored || '').startsWith('v1$')) {
    user.passwordHash = await hashearPassword(password)
    delete user.password
    guardarUsuarios(usuarios)
  } else if (user.password) {
    delete user.password
    guardarUsuarios(usuarios)
  }

  limpiarFallos(ced)

  actualizarUsuario(user.id, { trackingActivo: true })
  const userActivo = listarUsuarios().find((u) => u.id === user.id) || user
  const ahora = Date.now()
  const sesion = {
    id: userActivo.id,
    nombre: user.nombre,
    cedula: user.cedula,
    cargo: user.cargo,
    foto: user.foto,
    rol: rolDe(user),
    esMaster: rolDe(user) === ROL_ADMIN || rolDe(user) === ROL_MASTER,
    esAdmin: rolDe(user) === ROL_ADMIN,
    trackingActivo: true,
    masterId: user.masterId || null,
    masterNombre: user.masterNombre || '',
    permisos: permisosDe(user),
    iniciadaEn: ahora,
    ultimaActividadSesion: ahora,
    expiraEn: ahora + SESION_MAX_MS
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
  return sesion
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
}

export function sesionActual() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const sesion = JSON.parse(raw)
    const ahora = Date.now()
    if (sesion.expiraEn && ahora > sesion.expiraEn) {
      logout()
      return null
    }
    if (sesion.ultimaActividadSesion && ahora - sesion.ultimaActividadSesion > INACTIVIDAD_MS) {
      logout()
      return null
    }
    return sesion
  } catch {
    return null
  }
}

export function tocarSesion() {
  const sesion = sesionActual()
  if (!sesion) return null
  sesion.ultimaActividadSesion = Date.now()
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
  return sesion
}

export function refrescarSesionDesdeStorage() {
  const sesion = sesionActual()
  if (!sesion) return null
  const user = listarUsuarios().find((u) => u.id === sesion.id)
  if (!user || !user.activo) {
    logout()
    return null
  }
  const actualizada = {
    ...sesion,
    nombre: user.nombre,
    cedula: user.cedula,
    cargo: user.cargo,
    foto: user.foto,
    rol: rolDe(user),
    esMaster: rolDe(user) === ROL_ADMIN || rolDe(user) === ROL_MASTER,
    esAdmin: rolDe(user) === ROL_ADMIN,
    trackingActivo: user.trackingActivo !== false,
    masterId: user.masterId || null,
    masterNombre: user.masterNombre || '',
    permisos: permisosDe(user),
    ultimaActividadSesion: Date.now()
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(actualizada))
  return actualizada
}

export function actualizarUltimaActividad(userId) {
  const usuarios = listarUsuarios()
  const idx = usuarios.findIndex((u) => u.id === userId)
  if (idx < 0) return
  usuarios[idx] = {
    ...usuarios[idx],
    ultimaActividad: new Date().toISOString()
  }
  guardarUsuarios(usuarios)
}

export function usuariosDesconectados(horasLimite = 4) {
  const ahora = Date.now()
  return listarUsuarios()
    .filter((u) => u.activo !== false)
    .map((u) => {
      const ultima = u.ultimaActividad ? new Date(u.ultimaActividad).getTime() : null
      const horas = ultima ? (ahora - ultima) / (1000 * 60 * 60) : null
      return { ...u, horasDesconectado: horas, sinActividad: ultima == null }
    })
    .filter((u) => u.sinActividad || (u.horasDesconectado != null && u.horasDesconectado >= horasLimite))
}

export function eliminarUsuario(id, actor) {
  const usuarios = listarUsuarios()
  const objetivo = usuarios.find((u) => u.id === id)
  if (!objetivo) throw new Error('Usuario no encontrado')
  if (actor?.id && String(actor.id) === String(id)) {
    throw new Error('No puedes eliminar tu propia cuenta')
  }
  const rolActor = rolDe(actor)
  const rolObj = rolDe(objetivo)
  if (rolActor === ROL_ADMIN) {
    // admin puede borrar cualquiera excepto a sí mismo
  } else if (rolActor === ROL_MASTER) {
    if (rolObj !== ROL_GENERAL || String(objetivo.masterId) !== String(actor.id)) {
      throw new Error('Un master solo puede eliminar usuarios generales vinculados a su cuenta')
    }
  } else {
    throw new Error('No tienes permiso para eliminar usuarios')
  }
  guardarUsuarios(usuarios.filter((u) => u.id !== id))
  supabase.from(TABLA_USUARIOS).delete().eq('id', id).then(({ error }) => {
    if (error) console.warn('No se pudo borrar en la nube:', error.message)
  })
  return true
}

export function contactosBuzon(sesion) {
  if (!sesion) return []
  const todos = listarUsuarios().filter((u) => u.activo !== false && String(u.id) !== String(sesion.id))
  const rol = rolDe(sesion)
  if (rol === ROL_ADMIN) return todos
  if (rol === ROL_MASTER) {
    return todos.filter((u) => {
      const r = rolDe(u)
      if (r === ROL_ADMIN) return true
      if (r === ROL_GENERAL && String(u.masterId) === String(sesion.id)) return true
      if (r === ROL_GENERAL && (u.masterNombre || '').trim().toLowerCase() === (sesion.nombre || '').trim().toLowerCase()) return true
      return false
    })
  }
  const mid = sesion.masterId
  const mn = (sesion.masterNombre || '').trim().toLowerCase()
  return todos.filter((u) => {
    if (mid && String(u.id) === String(mid)) return true
    if (mn && rolDe(u) === ROL_MASTER && (u.nombre || '').trim().toLowerCase() === mn) return true
    if (rolDe(u) === ROL_GENERAL && mid && String(u.masterId) === String(mid)) return true
    if (rolDe(u) === ROL_GENERAL && mn && (u.masterNombre || '').trim().toLowerCase() === mn) return true
    return false
  })
}

export function cambiarRolUsuario(id, nuevoRol, actor) {
  if (rolDe(actor) !== ROL_ADMIN) {
    throw new Error('Solo el administrador puede cambiar el tipo de usuario')
  }
  if (![ROL_ADMIN, ROL_MASTER, ROL_GENERAL].includes(nuevoRol)) {
    throw new Error('Tipo de usuario no válido')
  }
  const usuarios = listarUsuarios()
  const idx = usuarios.findIndex((u) => u.id === id)
  if (idx < 0) throw new Error('Usuario no encontrado')
  if (String(usuarios[idx].id) === String(actor?.id) && nuevoRol !== ROL_ADMIN) {
    const otrosAdmin = usuarios.filter((u) => u.id !== id && rolDe(u) === ROL_ADMIN)
    if (otrosAdmin.length === 0) {
      throw new Error('Debe existir al menos un administrador')
    }
  }
  usuarios[idx] = {
    ...usuarios[idx],
    rol: nuevoRol,
    esMaster: nuevoRol === ROL_ADMIN || nuevoRol === ROL_MASTER
  }
  guardarUsuarios(usuarios)
  return usuarios[idx]
}

export async function cambiarPassword({ userId, passwordNueva, passwordActual, actor }) {
  const pol = validarPasswordPolitica(passwordNueva)
  if (pol) throw new Error(pol)

  const usuarios = listarUsuarios()
  const idx = usuarios.findIndex((u) => u.id === userId)
  if (idx < 0) throw new Error('Usuario no encontrado')
  const objetivo = usuarios[idx]
  const rolActor = rolDe(actor)
  const rolObj = rolDe(objetivo)
  const esPropia = String(actor?.id) === String(userId)

  if (esPropia) {
    if (passwordActual) {
      const stored = objetivo.passwordHash || objetivo.password
      const ok = await verificarPassword(passwordActual, stored)
      if (!ok) throw new Error('La contraseña actual no es correcta')
    }
  } else if (rolActor === ROL_ADMIN) {
    // admin puede cambiar cualquier contraseña
  } else if (rolActor === ROL_MASTER) {
    if (rolObj !== ROL_GENERAL) {
      throw new Error('Un master solo puede cambiar contraseñas de usuarios generales')
    }
  } else {
    throw new Error('No tienes permiso para cambiar esta contraseña')
  }

  usuarios[idx] = {
    ...objetivo,
    passwordHash: await hashearPassword(passwordNueva)
  }
  delete usuarios[idx].password
  guardarUsuarios(usuarios)
  return true
}


const TABLA_USUARIOS = 'usuarios_app'

function filaAUsuario(row) {
  if (!row) return null
  return {
    id: row.id,
    nombre: row.nombre,
    cedula: row.cedula,
    cargo: row.cargo || '',
    foto: row.foto,
    passwordHash: row.password_hash,
    rol: row.rol || 'general',
    esMaster: row.rol === 'admin' || row.rol === 'master',
    activo: row.activo !== false,
    trackingActivo: row.tracking_activo !== false,
    masterId: row.master_id || null,
    masterNombre: row.master_nombre || '',
    logoMarca: row.logo_marca || null,
    logoPropio: !!row.logo_propio,
    ultimaActividad: row.ultima_actividad || null,
    cupoGenerales: row.cupo_generales ?? 0,
    tituloInforme: row.titulo_informe || '',
    permisos: (() => {
      try {
        if (!row.permisos) return {}
        return typeof row.permisos === 'string' ? JSON.parse(row.permisos) : row.permisos
      } catch {
        return {}
      }
    })(),
    ultimaLat: row.ultima_lat,
    ultimaLng: row.ultima_lng,
    fechaInicioLaboral: row.fecha_inicio_laboral || '',
    creadoEn: row.created_at
  }
}

function usuarioAFila(u) {
  return {
    id: u.id,
    nombre: u.nombre,
    cedula: u.cedula,
    cargo: u.cargo || '',
    foto: u.foto || null,
    password_hash: u.passwordHash || u.password_hash || null,
    rol: rolDe(u),
    activo: u.activo !== false,
    tracking_activo: u.trackingActivo !== false,
    master_id: u.masterId || null,
    master_nombre: u.masterNombre || '',
    logo_marca: u.logoMarca || null,
    logo_propio: !!u.logoPropio,
    ultima_actividad: u.ultimaActividad || null,
    cupo_generales: u.cupoGenerales ?? 0,
    titulo_informe: u.tituloInforme || '',
    permisos: u.permisos || {},
    ultima_lat: u.ultimaLat ?? u.ultima_lat ?? null,
    ultima_lng: u.ultimaLng ?? u.ultima_lng ?? null,
    fecha_inicio_laboral: u.fechaInicioLaboral || null
  }
}

export function fechaIngresoDe(u) {
  const v = (u?.fechaInicioLaboral || u?.creadoEn || '').toString().slice(0, 10)
  return v || 'N/D'
}

export async function sincronizarUsuariosNube() {
  const { data, error } = await supabase.from(TABLA_USUARIOS).select('*').order('created_at', { ascending: true })
  if (error) {
    console.warn('No se pudieron leer usuarios de la nube:', error.message)
    return listarUsuarios()
  }
  const locales = listarUsuarios()
  const porId = new Map(locales.map((u) => [String(u.id), u]))
  const lista = (data || []).map((row) => {
    const nube = filaAUsuario(row)
    const local = porId.get(String(nube.id))
    if (!local) return nube
    const cupoNube = Number(nube.cupoGenerales ?? 0)
    const cupoLocal = Number(local.cupoGenerales ?? 0)
    return {
      ...nube,
      cupoGenerales: cupoNube > 0 ? cupoNube : cupoLocal,
      permisos: (nube.permisos && Object.keys(nube.permisos).length) ? nube.permisos : (local.permisos || {}),
      tituloInforme: nube.tituloInforme || local.tituloInforme || '',
      foto: nube.foto || local.foto,
      logoMarca: nube.logoMarca || local.logoMarca
    }
  })
  if (lista.length > 0) {
    guardarUsuarios(lista)
  }
  return lista
}

/** Solo coordenadas y flags: liviano para celular */
export async function sincronizarPosicionesNube() {
  const { data, error } = await supabase
    .from(TABLA_USUARIOS)
    .select('id,ultima_lat,ultima_lng,ultima_actividad,activo,tracking_activo')
  if (error || !data) return listarUsuarios()
  const actuales = listarUsuarios()
  let cambio = false
  const mapa = Object.fromEntries(data.map((r) => [String(r.id), r]))
  const mezclados = actuales.map((u) => {
    const row = mapa[String(u.id)]
    if (!row) return u
    const lat = row.ultima_lat
    const lng = row.ultima_lng
    if (u.ultimaLat === lat && u.ultimaLng === lng && u.activo === (row.activo !== false)) return u
    cambio = true
    return {
      ...u,
      ultimaLat: lat,
      ultimaLng: lng,
      ultimaActividad: row.ultima_actividad || u.ultimaActividad,
      activo: row.activo !== false,
      trackingActivo: row.tracking_activo !== false
    }
  })
  if (cambio) guardarUsuarios(mezclados)
  return mezclados
}

export async function hayUsuariosEnNube() {
  const { count, error } = await supabase
    .from(TABLA_USUARIOS)
    .select('id', { count: 'exact', head: true })
  if (error) {
    console.warn(error.message)
    return listarUsuarios().length > 0
  }
  return (count || 0) > 0
}

export async function guardarUsuarioNube(usuario) {
  const fila = usuarioAFila(usuario)
  let { error } = await supabase.from(TABLA_USUARIOS).upsert(fila, { onConflict: 'id' })
  if (error && /titulo_informe|cupo_generales|permisos|ultima_lat|ultima_lng|column/i.test(error.message || '')) {
    const { titulo_informe, cupo_generales, permisos, ultima_lat, ultima_lng, ...basica } = fila
    const retry = await supabase.from(TABLA_USUARIOS).upsert(basica, { onConflict: 'id' })
    error = retry.error
  }
  if (error) {
    throw new Error('No se pudo guardar el usuario en la nube: ' + error.message)
  }
}

export function guardarPosicionUsuario(id, lat, lng) {
  if (id == null || lat == null || lng == null) return
  const usuarios = listarUsuarios()
  const idx = usuarios.findIndex((u) => String(u.id) === String(id))
  if (idx < 0) return
  usuarios[idx] = {
    ...usuarios[idx],
    ultimaLat: lat,
    ultimaLng: lng,
    ultimaActividad: new Date().toISOString()
  }
  try {
    const vivo = JSON.parse(localStorage.getItem('gps_live_v1') || '{}')
    vivo[String(id)] = { lat, lng, t: Date.now() }
    localStorage.setItem('gps_live_v1', JSON.stringify(vivo))
  } catch (_) {}
  supabase
    .from(TABLA_USUARIOS)
    .update({
      ultima_lat: lat,
      ultima_lng: lng,
      ultima_actividad: new Date().toISOString()
    })
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('GPS nube:', error.message)
    })
}

export function posicionViva(user) {
  if (!user) return { lat: null, lng: null }
  const lat = user.ultimaLat ?? user.ultima_lat ?? null
  const lng = user.ultimaLng ?? user.ultima_lng ?? null
  if (lat != null && lng != null) return { lat: Number(lat), lng: Number(lng) }
  try {
    const vivo = JSON.parse(localStorage.getItem('gps_live_v1') || '{}')
    const p = vivo[String(user.id)]
    if (p && Date.now() - (p.t || 0) < 30 * 60 * 1000) {
      return { lat: p.lat, lng: p.lng }
    }
  } catch (_) {}
  return { lat: null, lng: null }
}
