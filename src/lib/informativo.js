import { supabase } from './supabase'

const KEY = 'informativo_v1'

export function listarAvisos() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function guardar(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista))
}

export async function archivoADataUrl(file, maxMB = 4) {
  if (!file) return null
  if (file.size > maxMB * 1024 * 1024) {
    throw new Error(`El archivo ${file.name} supera ${maxMB} MB`)
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve({
      nombre: file.name,
      tipo: file.type || 'application/octet-stream',
      tamano: file.size,
      dataUrl: e.target.result
    })
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export async function crearAviso({ titulo, texto, autorId, autorNombre, imagenes = [], documentos = [] }) {
  if (!titulo?.trim() && !texto?.trim() && imagenes.length === 0 && documentos.length === 0) {
    throw new Error('Escribe un título o contenido')
  }
  const lista = listarAvisos()
  const aviso = {
    id: crypto.randomUUID?.() || String(Date.now()),
    titulo: (titulo || '').trim() || 'Aviso informativo',
    texto: (texto || '').trim(),
    autorId,
    autorNombre,
    imagenes,
    documentos,
    creadoEn: new Date().toISOString()
  }
  lista.unshift(aviso)
  guardar(lista)
  const { error } = await supabase.from('avisos_app').upsert({
    id: aviso.id,
    titulo: aviso.titulo,
    texto: aviso.texto,
    autor_id: aviso.autorId,
    autor_nombre: aviso.autorNombre,
    imagenes: aviso.imagenes,
    documentos: aviso.documentos,
    created_at: aviso.creadoEn
  })
  if (error) console.warn('aviso nube:', error.message)
  return aviso
}

export function eliminarAviso(id, actor) {
  const lista = listarAvisos()
  const item = lista.find((a) => a.id === id)
  if (!item) throw new Error('Aviso no encontrado')
  const rol = actor?.rol || (actor?.esAdmin ? 'admin' : actor?.esMaster ? 'master' : 'general')
  if (rol === 'admin') {
    // ok
  } else if (rol === 'master' && String(item.autorId) === String(actor.id)) {
    // master solo borra los suyos
  } else {
    throw new Error('No tienes permiso para eliminar este aviso')
  }
  guardar(lista.filter((a) => a.id !== id))
  supabase.from('avisos_app').delete().eq('id', id).then(({ error }) => {
    if (error) console.warn(error.message)
  })
}

export function formatFechaAviso(iso) {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export async function sincronizarAvisosNube() {
  try {
    const { data, error } = await supabase.from('avisos_app').select('*').order('created_at', { ascending: false })
    if (error) throw error
    const lista = (data || []).map((r) => ({
      id: r.id,
      titulo: r.titulo,
      texto: r.texto,
      autorId: r.autor_id,
      autorNombre: r.autor_nombre,
      imagenes: r.imagenes || [],
      documentos: r.documentos || [],
      creadoEn: r.created_at
    }))
    localStorage.setItem(KEY, JSON.stringify(lista))
    return lista
  } catch (e) {
    console.warn('avisos nube:', e.message)
    return listarAvisos()
  }
}
