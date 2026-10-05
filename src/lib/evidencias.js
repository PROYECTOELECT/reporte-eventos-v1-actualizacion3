import { supabase } from './supabase'

function nombreArchivo(file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  return `reportes/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
}

async function subirR2(file) {
  const worker = import.meta.env.VITE_R2_WORKER_URL
  if (!worker) return null
  const fd = new FormData()
  fd.append('file', file)
  fd.append('path', nombreArchivo(file))
  const res = await fetch(worker, { method: 'POST', body: fd })
  if (!res.ok) throw new Error('No se pudo subir la foto a R2')
  const data = await res.json()
  return data.url || null
}

async function subirSupabase(file) {
  const path = nombreArchivo(file)
  const { error } = await supabase.storage.from('evidencias').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw new Error('Error al subir una imagen: ' + error.message)
  const { data } = supabase.storage.from('evidencias').getPublicUrl(path)
  return data.publicUrl
}

export async function subirEvidencias(files) {
  const lista = Array.from(files || [])
  const urls = []
  for (const file of lista) {
    let url = null
    try {
      url = await subirR2(file)
    } catch (err) {
      console.warn('R2:', err.message)
    }
    if (!url) url = await subirSupabase(file)
    urls.push(url)
  }
  return urls
}
