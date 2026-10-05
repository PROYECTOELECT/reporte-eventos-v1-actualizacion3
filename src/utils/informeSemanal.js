import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'

const KEY = 'correos_informe_semanal_v1'

export function cargarCorreosInforme() {
  try {
    const lista = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.from({ length: 5 }, (_, i) => lista[i] || '')
  } catch {
    return ['', '', '', '', '']
  }
}

export function guardarCorreosInforme(lista) {
  const limpios = (lista || []).slice(0, 5).map((c) => String(c || '').trim())
  localStorage.setItem(KEY, JSON.stringify(limpios))
  return limpios
}

export function rangoSemanaActual() {
  const hoy = new Date()
  const day = hoy.getDay() || 7
  const desde = new Date(hoy)
  desde.setDate(hoy.getDate() - day + 1)
  const hasta = new Date(desde)
  hasta.setDate(desde.getDate() + 6)
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { desde: iso(desde), hasta: iso(hasta), generado: iso(hoy) }
}

export async function cargarReportesSemana(desde, hasta) {
  const { data, error } = await supabase
    .from('reportes')
    .select('id,fecha,hora,reportado_por,cargo,ubicacion_texto,tipo,novedad,procedimiento,lat,lng,created_at')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
    .limit(2000)
  if (error) throw error
  return data || []
}

export function armarLibroExcel(filas, desde, hasta) {
  const hoja = (filas || []).map((r) => ({
    Fecha: r.fecha || '',
    Hora: r.hora || '',
    Tipo: r.tipo || '',
    'Reportado por': r.reportado_por || '',
    Cargo: r.cargo || '',
    Ubicación: r.ubicacion_texto || '',
    Novedad: r.novedad || '',
    Procedimiento: r.procedimiento || '',
    Lat: r.lat ?? '',
    Lng: r.lng ?? ''
  }))
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(hoja.length ? hoja : [{ Fecha: 'Sin registros en la semana' }])
  XLSX.utils.book_append_sheet(wb, ws, 'Semana')
  const resumen = XLSX.utils.aoa_to_sheet([
    ['Informe semanal de reportes'],
    ['Desde', desde],
    ['Hasta', hasta],
    ['Total registros', filas.length],
    ['Generado', new Date().toLocaleString('es-CO')]
  ])
  XLSX.utils.book_append_sheet(wb, resumen, 'Resumen')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}

export function descargarExcel(bytes, nombre) {
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1500)
}

export function abrirMailto(correos, desde, hasta, total) {
  const dest = correos.filter(Boolean).join(',')
  if (!dest) return
  const asunto = encodeURIComponent(`Informe semanal de reportes ${desde} a ${hasta}`)
  const cuerpo = encodeURIComponent(
    `Adjunto el archivo Excel del informe semanal.\n\nPeriodo: ${desde} a ${hasta}\nRegistros: ${total}\n\n(El archivo se descargó en este dispositivo; adjúntelo al correo.)`
  )
  window.location.href = `mailto:${dest}?subject=${asunto}&body=${cuerpo}`
}
