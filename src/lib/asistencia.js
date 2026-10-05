import { supabase } from './supabase'

const KEY = 'asistencia_equipo_v1'

export function listarAsistencias() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function guardar(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista))
}

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}

function horaAhora() {
  return new Date().toTimeString().slice(0, 5)
}

function minutosEntre(h1, h2) {
  const [a, b] = String(h1 || '00:00').split(':').map(Number)
  const [c, d] = String(h2 || '00:00').split(':').map(Number)
  let min = (c * 60 + d) - (a * 60 + b)
  if (min < 0) min += 24 * 60
  return min
}

export function formatoTiempo(minutos) {
  const m = Math.max(0, Number(minutos) || 0)
  const h = Math.floor(m / 60)
  const r = m % 60
  return `${h} h ${String(r).padStart(2, '0')} min`
}

export function registroDelDia(userId, fecha = hoyISO()) {
  return listarAsistencias().find(
    (r) => String(r.userId) === String(userId) && r.fecha === fecha
  ) || null
}

export function registrarIngreso({ user, foto, autorId, masterId, masterNombre }) {
  if (!user) throw new Error('Selecciona el trabajador')
  if (!foto) throw new Error('La foto de ingreso es obligatoria')
  const fecha = hoyISO()
  const lista = listarAsistencias()
  if (lista.some((r) => String(r.userId) === String(user.id) && r.fecha === fecha && r.horaIngreso)) {
    throw new Error('Este trabajador ya tiene ingreso hoy')
  }
  const item = {
    id: crypto.randomUUID?.() || String(Date.now()),
    userId: user.id,
    nombre: user.nombre,
    cedula: user.cedula,
    cargo: user.cargo || '',
    fotoPerfil: user.foto || '',
    fecha,
    horaIngreso: horaAhora(),
    fotoIngreso: foto,
    horaSalida: '',
    fotoSalida: '',
    minutosLaborados: 0,
    autorId: autorId || null,
    masterId: masterId || user.masterId || null,
    masterNombre: masterNombre || user.masterNombre || '',
    creadoEn: new Date().toISOString()
  }
  lista.unshift(item)
  guardar(lista)
  subirAsistenciaNube(item)
  return item
}

export function registrarSalida({ userId, foto }) {
  if (!foto) throw new Error('La foto de salida es obligatoria')
  const fecha = hoyISO()
  const lista = listarAsistencias()
  const idx = lista.findIndex((r) => String(r.userId) === String(userId) && r.fecha === fecha)
  if (idx < 0 || !lista[idx].horaIngreso) throw new Error('Primero debe registrar el ingreso de hoy')
  if (lista[idx].horaSalida) throw new Error('Este trabajador ya cerró turno hoy')
  const horaSalida = horaAhora()
  const minutos = minutosEntre(lista[idx].horaIngreso, horaSalida)
  lista[idx] = {
    ...lista[idx],
    horaSalida,
    fotoSalida: foto,
    minutosLaborados: minutos
  }
  guardar(lista)
  subirAsistenciaNube(lista[idx])
  return lista[idx]
}

export function filtrarAsistencias({ userId, desde, hasta, masterId } = {}) {
  return listarAsistencias().filter((r) => {
    if (userId && String(r.userId) !== String(userId)) return false
    if (masterId && String(r.masterId) !== String(masterId) && String(r.userId) !== String(masterId)) return false
    if (desde && r.fecha < desde) return false
    if (hasta && r.fecha > hasta) return false
    return true
  })
}

export function rangoSemana(fechaISO) {
  const d = new Date(`${fechaISO}T00:00:00`)
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  const desde = d.toISOString().split('T')[0]
  d.setDate(d.getDate() + 6)
  const hasta = d.toISOString().split('T')[0]
  return { desde, hasta }
}

export function rangoMes(fechaISO) {
  const [y, m] = fechaISO.split('-')
  const desde = `${y}-${m}-01`
  const last = new Date(Number(y), Number(m), 0).getDate()
  const hasta = `${y}-${m}-${String(last).padStart(2, '0')}`
  return { desde, hasta }
}

export function rangoAnio(fechaISO) {
  const y = String(fechaISO || '').slice(0, 4)
  return { desde: `${y}-01-01`, hasta: `${y}-12-31` }
}

export function minutosHastaAhora(horaIngreso) {
  const ahora = new Date().toTimeString().slice(0, 5)
  return minutosEntre(horaIngreso, ahora)
}


const TABLA_ASIS = 'asistencia_app'

export function subirAsistenciaNube(item) {
  if (!item) return
  supabase.from(TABLA_ASIS).upsert({
    id: item.id,
    user_id: item.userId,
    nombre: item.nombre,
    cedula: item.cedula,
    cargo: item.cargo,
    fecha: item.fecha,
    hora_ingreso: item.horaIngreso,
    hora_salida: item.horaSalida || '',
    minutos: item.minutosLaborados || 0,
    autor_id: item.autorId,
    master_id: item.masterId,
    master_nombre: item.masterNombre,
    creado_en: item.creadoEn
  }).then(({ error }) => { if (error) console.warn(error.message) })
}

export async function sincronizarAsistenciaNube() {
  try {
    const { data, error } = await supabase.from(TABLA_ASIS).select('*').order('fecha', { ascending: false })
    if (error) throw error
    const actuales = listarAsistencias()
    const porId = new Map(actuales.map((n) => [String(n.id), n]))
    const lista = (data || []).map((r) => {
      const local = porId.get(String(r.id)) || {}
      return {
        id: r.id,
        userId: r.user_id,
        nombre: r.nombre,
        cedula: r.cedula,
        cargo: r.cargo || '',
        fotoPerfil: local.fotoPerfil || '',
        fecha: r.fecha,
        horaIngreso: r.hora_ingreso,
        fotoIngreso: local.fotoIngreso || '',
        horaSalida: r.hora_salida || '',
        fotoSalida: local.fotoSalida || '',
        minutosLaborados: r.minutos || 0,
        autorId: r.autor_id,
        masterId: r.master_id,
        masterNombre: r.master_nombre || '',
        creadoEn: r.creado_en
      }
    })
    const ids = new Set(lista.map((x) => String(x.id)))
    actuales.forEach((n) => { if (!ids.has(String(n.id))) lista.push(n) })
    localStorage.setItem('asistencia_equipo_v1', JSON.stringify(lista))
    return lista
  } catch (e) {
    console.warn('asistencia nube:', e.message)
    return listarAsistencias()
  }
}
