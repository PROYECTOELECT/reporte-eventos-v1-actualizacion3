import { supabase } from './supabase'

const MSG_KEY = 'mensajes_sistema_v1'
const NOTIF_KEY = 'notifs_desconexion_v1'

export function listarMensajes() {
  try {
    return JSON.parse(localStorage.getItem(MSG_KEY) || '[]')
  } catch {
    return []
  }
}

function guardarMensajes(lista) {
  localStorage.setItem(MSG_KEY, JSON.stringify(lista))
  // Disparar evento para otras pestañas del mismo navegador
  try {
    window.dispatchEvent(new Event('mensajes-actualizados'))
  } catch (_) {}
}

export async function enviarMensaje({ fromId, fromNombre, toId, toNombre, texto }) {
  if (!fromId || !toId || !texto?.trim()) {
    throw new Error('Mensaje incompleto')
  }
  const lista = listarMensajes()
  const msg = {
    id: crypto.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    fromId: String(fromId),
    fromNombre: fromNombre || '',
    toId: String(toId),
    toNombre: toNombre || '',
    texto: texto.trim(),
    fecha: new Date().toISOString(),
    leido: false,
    ocultoPara: []
  }
  lista.unshift(msg)
  guardarMensajes(lista)
  const { error } = await supabase.from('mensajes_app').upsert({
    id: msg.id,
    from_id: msg.fromId,
    from_nombre: msg.fromNombre,
    to_id: msg.toId,
    to_nombre: msg.toNombre,
    texto: msg.texto,
    fecha: msg.fecha,
    leido: false
  })
  if (error) {
    console.warn(error.message)
    throw new Error('No se guardó en la nube: ' + error.message)
  }
  return msg
}

export function mensajesRecibidos(userId) {
  const id = String(userId)
  return listarMensajes().filter(m => String(m.toId) === id && !estaOculto(m, id))
}

function listaOcultos(m) {
  if (Array.isArray(m?.ocultoPara)) return m.ocultoPara.map(String)
  if (typeof m?.ocultoPara === 'string' && m.ocultoPara) return m.ocultoPara.split(',').filter(Boolean)
  return []
}

export function estaOculto(m, userId) {
  return listaOcultos(m).includes(String(userId))
}

export async function borrarMensajeAdmin(msgId) {
  const lista = listarMensajes().filter((m) => String(m.id) !== String(msgId))
  guardarMensajes(lista)
  const { error } = await supabase.from('mensajes_app').delete().eq('id', String(msgId))
  if (error) throw new Error(error.message)
  return lista
}

export async function borrarMensajeParaMi(msgId, userId) {
  const id = String(userId)
  const lista = listarMensajes().map((m) => {
    if (String(m.id) !== String(msgId)) return m
    const ocultoPara = Array.from(new Set([...listaOcultos(m), id]))
    return { ...m, ocultoPara }
  })
  guardarMensajes(lista)
  const actual = lista.find((m) => String(m.id) === String(msgId))
  const { error } = await supabase.from('mensajes_app').update({
    oculto_para: (actual?.ocultoPara || []).join(',')
  }).eq('id', String(msgId))
  if (error) console.warn('borrar mensaje:', error.message)
  return lista
}

export function noLeidos(userId) {
  return mensajesRecibidos(userId).filter(m => !m.leido).length
}

export async function marcarLeidos(userId, fromId = null) {
  const id = String(userId)
  const from = fromId != null ? String(fromId) : null
  const marcados = []
  const lista = listarMensajes().map(m => {
    if (String(m.toId) === id && !m.leido && (!from || String(m.fromId) === from)) {
      const next = { ...m, leido: true }
      marcados.push(next)
      return next
    }
    return m
  })
  guardarMensajes(lista)
  await Promise.all(marcados.map((m) =>
    supabase.from('mensajes_app').update({ leido: true }).eq('id', String(m.id))
  ))
  return lista
}

export function conversacion(userId, otroId) {
  const a = String(userId)
  const b = String(otroId)
  return listarMensajes()
    .filter(m => {
      const f = String(m.fromId)
      const t = String(m.toId)
      return (f === a && t === b) || (f === b && t === a)
    })
    .filter(m => !estaOculto(m, a))
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
}

export function listarNotifsDesconexion() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]')
  } catch {
    return []
  }
}

function guardarNotifs(lista) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(lista))
}

export function registrarNotifDesconexion(notif) {
  const lista = listarNotifsDesconexion()
  const clave = `${notif.userId}_${notif.fechaAlerta?.slice(0, 10)}_${notif.horas}`
  if (lista.some(n => n.clave === clave)) return null
  const item = {
    id: crypto.randomUUID?.() || String(Date.now()),
    clave,
    ...notif,
    leida: false,
    creadaEn: new Date().toISOString()
  }
  lista.unshift(item)
  guardarNotifs(lista.slice(0, 100))
  return item
}

export function marcarNotifLeida(id) {
  const lista = listarNotifsDesconexion().map(n =>
    n.id === id ? { ...n, leida: true } : n
  )
  guardarNotifs(lista)
}

export function noLeidasNotifs() {
  return listarNotifsDesconexion().filter(n => !n.leida).length
}

const TABLA_MSG = 'mensajes_app'
const TABLA_NOTIF = 'notifs_app'

export async function sincronizarMensajesNube() {
  try {
    const { data, error } = await supabase.from(TABLA_MSG).select('*').order('fecha', { ascending: false }).limit(500)
    if (error) throw error
    const nube = (data || []).map((r) => ({
      id: String(r.id),
      fromId: String(r.from_id || ''),
      fromNombre: r.from_nombre || '',
      toId: String(r.to_id || ''),
      toNombre: r.to_nombre || '',
      texto: r.texto || '',
      fecha: r.fecha,
      leido: !!r.leido,
      ocultoPara: String(r.oculto_para || '').split(',').filter(Boolean)
    }))
    const local = listarMensajes()
    const localMap = Object.fromEntries(local.map((m) => [String(m.id), m]))
    const ids = new Set(nube.map((m) => m.id))
    const soloLocal = local.filter((m) => !ids.has(String(m.id)))
    for (const m of soloLocal.slice(0, 30)) {
      await supabase.from(TABLA_MSG).upsert({
        id: String(m.id),
        from_id: String(m.fromId),
        from_nombre: m.fromNombre || '',
        to_id: String(m.toId),
        to_nombre: m.toNombre || '',
        texto: m.texto || '',
        fecha: m.fecha || new Date().toISOString(),
        leido: !!m.leido
      })
    }
    const lista = [...soloLocal, ...nube.map((m) => {
      const prev = localMap[m.id]
      if (prev?.leido && !m.leido) {
        supabase.from(TABLA_MSG).update({ leido: true }).eq('id', m.id)
        m = { ...m, leido: true }
      }
      const ocultoPara = Array.from(new Set([...listaOcultos(m), ...listaOcultos(prev || {})]))
      if (ocultoPara.join(',') !== listaOcultos(m).join(',')) {
        supabase.from(TABLA_MSG).update({ oculto_para: ocultoPara.join(',') }).eq('id', m.id)
      }
      return { ...m, ocultoPara }
    })]
      .filter((m, i, arr) => arr.findIndex((x) => String(x.id) === String(m.id)) === i)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    localStorage.setItem(MSG_KEY, JSON.stringify(lista))
    window.dispatchEvent(new Event('mensajes-actualizados'))
    return lista
  } catch (e) {
    console.warn('mensajes nube:', e.message)
    return listarMensajes()
  }
}

async function upsertMensajeNube(msg) {
  try {
    await supabase.from(TABLA_MSG).upsert({
      id: msg.id,
      from_id: msg.fromId,
      from_nombre: msg.fromNombre,
      to_id: msg.toId,
      to_nombre: msg.toNombre,
      texto: msg.texto,
      fecha: msg.fecha,
      leido: !!msg.leido
    })
  } catch (e) {
    console.warn('upsert mensaje:', e.message)
  }
}

