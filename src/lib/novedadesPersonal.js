import { supabase } from './supabase'

const KEY = 'novedades_personal_v1'

try {
  const previo = localStorage.getItem(KEY)
  if (previo && previo.length > 400000) localStorage.removeItem(KEY)
} catch (_) {}

export const TIPOS_NOVEDAD = [
  { key: 'incapacidad', label: 'Incapacidad', color: '#dc2626' },
  { key: 'ausencia', label: 'Ausencia laboral', color: '#ea580c' },
  { key: 'informes', label: 'Informes', color: '#2563eb' },
  { key: 'recomendaciones', label: 'Recomendaciones', color: '#16a34a' },
  { key: 'calamidad', label: 'Calamidad', color: '#7c3aed' },
  { key: 'otros', label: 'Otros', color: '#6b7280' },
  { key: 'observaciones', label: 'Observaciones', color: '#0891b2' }
]

export function listarNovedadesPersonal() {
  try {
    const lista = JSON.parse(localStorage.getItem(KEY) || '[]')
    return lista.map((n) => ({ ...n, foto: '' }))
  } catch {
    return []
  }
}

function guardar(lista) {
  const liviana = aligerar(lista)
  const intentos = [
    () => localStorage.setItem(KEY, JSON.stringify(liviana)),
    () => {
      liberarEspacioNavegador()
      localStorage.setItem(KEY, JSON.stringify(liviana))
    },
    () => {
      liberarEspacioNavegador(true)
      localStorage.setItem(KEY, JSON.stringify(recortarPorUsuario(liviana, 80)))
    },
    () => {
      localStorage.removeItem(KEY)
      localStorage.setItem(KEY, JSON.stringify(recortarPorUsuario(liviana, 20)))
    }
  ]
  for (const intento of intentos) {
    try {
      intento()
      return true
    } catch (_) {}
  }
  return false
}

function aligerar(lista) {
  return (lista || []).map((n) => ({
    id: n.id,
    userId: n.userId,
    nombre: n.nombre,
    cedula: n.cedula,
    cargo: n.cargo || '',
    foto: '',
    masterNombre: n.masterNombre || '',
    tipo: n.tipo,
    texto: String(n.texto || '').slice(0, 2000),
    archivos: (n.archivos || []).slice(0, 3).map((a) => ({ nombre: a.nombre || a.name || 'archivo', tipo: a.tipo || a.type || '' })),
    fecha: n.fecha,
    hora: n.hora || '',
    autorId: n.autorId || null,
    autorNombre: n.autorNombre || '',
    creadoEn: n.creadoEn
  }))
}

function recortarPorUsuario(lista, maxPorUsuario) {
  const cuenta = {}
  const out = []
  for (const n of lista) {
    const id = String(n.userId || 'x')
    cuenta[id] = (cuenta[id] || 0) + 1
    if (cuenta[id] <= maxPorUsuario) out.push(n)
  }
  return out
}

function liberarEspacioNavegador(agresivo = false) {
  const caches = ['reportes_cache_v1', 'gps_live_v1', 'asistencia_equipo_v1']
  caches.forEach((k) => { try { localStorage.removeItem(k) } catch (_) {} })
  try {
    const raw = localStorage.getItem('usuarios_sistema_v1')
    if (raw && (agresivo || raw.length > 180000)) {
      const lista = JSON.parse(raw)
      const liviana = (Array.isArray(lista) ? lista : []).map((u) => ({
        ...u,
        foto: '',
        logoMarca: null,
        fondo: null,
        fondoImagen: null
      }))
      localStorage.setItem('usuarios_sistema_v1', JSON.stringify(liviana))
    }
  } catch (_) {}
  try {
    const tema = localStorage.getItem('tema_plataforma_v1')
    if (tema && (agresivo || tema.length > 120000)) {
      const t = JSON.parse(tema)
      t.fondoImagen = null
      t.icono = null
      localStorage.setItem('tema_plataforma_v1', JSON.stringify(t))
    }
  } catch (_) {}
  if (agresivo) {
    try { localStorage.removeItem(KEY) } catch (_) {}
  }
}


function fechaHoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const MAX_LOCAL_POR_USUARIO = 500

export async function crearNovedadPersonal(datos = {}) {
  const user = datos.user
  const tipo = datos.tipo
  const texto = datos.texto
  const archivos = datos.archivos || []
  const fechaReg = datos.fechaNovedad || datos.fecha || fechaHoyLocal()
  if (!user) throw new Error('Selecciona un usuario')
  if (!texto?.trim()) throw new Error('Escribe la observación')
  if (!fechaReg) throw new Error('Indica la fecha de la novedad')
  const item = {
    id: crypto.randomUUID?.() || String(Date.now()),
    userId: user.id,
    nombre: user.nombre,
    cedula: user.cedula,
    cargo: user.cargo || '',
    foto: '',
    masterNombre: user.masterNombre || '',
    tipo,
    texto: texto.trim().slice(0, 2000),
    archivos: (archivos || []).slice(0, 3).map((a) => ({ nombre: a.nombre || a.name || 'archivo', tipo: a.tipo || a.type || '' })),
    fecha: fechaReg,
    hora: new Date().toTimeString().slice(0, 5),
    autorId: datos.autorId || null,
    autorNombre: datos.autorNombre || '',
    creadoEn: new Date().toISOString()
  }
  const lista = listarNovedadesPersonal()
  lista.unshift(item)
  const guardoLocal = guardar(recortarPorUsuario(lista, MAX_LOCAL_POR_USUARIO))
  const errorNube = await subirNovedadNube(item)
  if (!guardoLocal && errorNube) {
    throw new Error('No se pudo guardar la novedad. Recarga la página (Ctrl+F5) e intenta de nuevo. Si sigue, avisa: el navegador tiene el almacenamiento lleno y la nube no respondió.')
  }
  return { ...item, soloNube: !guardoLocal }
}

export function eliminarNovedadPersonal(id) {
  guardar(listarNovedadesPersonal().filter((n) => n.id !== id))
}

export function filtrarNovedades({ userId, desde, hasta, masterId } = {}) {
  return listarNovedadesPersonal().filter((n) => {
    if (userId && String(n.userId) !== String(userId)) return false
    if (desde && n.fecha < desde) return false
    if (hasta && n.fecha > hasta) return false
    return true
  })
}

export function contarPorTipo(lista) {
  const base = {}
  TIPOS_NOVEDAD.forEach((t) => { base[t.key] = 0 })
  lista.forEach((n) => {
    if (base[n.tipo] != null) base[n.tipo]++
    else base.otros++
  })
  return base
}

const TABLA = 'novedades_personal'

export async function sincronizarNovedadesNube() {
  try {
    const { data, error } = await supabase.from(TABLA).select('*').order('creado_en', { ascending: false })
    if (error) throw error
    const actuales = listarNovedadesPersonal()
    const porId = new Map(actuales.map((n) => [String(n.id), n]))
    const lista = (data || []).map((r) => {
      const local = porId.get(String(r.id))
      return {
        id: r.id,
        userId: r.user_id,
        nombre: r.nombre,
        cedula: r.cedula,
        cargo: r.cargo || '',
        foto: local?.foto || '',
        masterNombre: r.master_nombre || '',
        tipo: r.tipo,
        texto: r.texto || '',
        archivos: local?.archivos || [],
        fecha: r.fecha,
        hora: r.hora || '',
        autorId: r.autor_id,
        autorNombre: r.autor_nombre || '',
        creadoEn: r.creado_en
      }
    })
    const idsNube = new Set(lista.map((n) => String(n.id)))
    actuales.forEach((n) => { if (!idsNube.has(String(n.id))) lista.push(n) })
    guardar(lista)
    return lista
  } catch (e) {
    console.warn('novedades nube:', e.message)
    return listarNovedadesPersonal()
  }
}

export async function subirNovedadNube(item) {
  const { error } = await supabase.from(TABLA).upsert({
    id: item.id,
    user_id: item.userId,
    nombre: item.nombre,
    cedula: item.cedula,
    cargo: item.cargo,
    master_nombre: item.masterNombre,
    tipo: item.tipo,
    texto: item.texto,
    fecha: item.fecha,
    hora: item.hora,
    autor_id: item.autorId,
    autor_nombre: item.autorNombre,
    creado_en: item.creadoEn
  })
  if (error) {
    console.warn(error.message)
    return error.message
  }
  return ''
}
