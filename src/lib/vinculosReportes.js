const KEY = 'reportes_vinculo_master_v1'

export function listarVinculos() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function guardarVinculoReporte(reporteId, datos) {
  const mapa = listarVinculos()
  mapa[reporteId] = datos
  localStorage.setItem(KEY, JSON.stringify(mapa))
}

export function vinculoDe(reporteId) {
  return listarVinculos()[reporteId] || null
}

export function enriquecerReporte(reporte, sesion) {
  const extra = vinculoDe(reporte.id) || {}
  return {
    ...reporte,
    autorId: reporte.autorId || extra.autorId || null,
    autorNombre: reporte.autorNombre || extra.autorNombre || reporte.reportadoPor || '',
    masterId: reporte.masterId || extra.masterId || null,
    masterNombre: reporte.masterNombre || extra.masterNombre || '',
    firmaNombre: reporte.firmaNombre || extra.firmaNombre || '',
    firmaCedula: reporte.firmaCedula || extra.firmaCedula || '',
    firmaImg: reporte.firmaImg || extra.firmaImg || ''
  }
}

function normTxt(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function reporteEsDeUsuario(reporte, user) {
  if (!user) return true
  if (String(reporte.autorId || '') === String(user.id)) return true
  const nombre = normTxt(user.nombre)
  const rp = normTxt(reporte.reportadoPor || reporte.autorNombre)
  if (rp && nombre && (rp === nombre || rp.includes(nombre) || nombre.includes(rp))) return true
  const ced = String(user.cedula || '').trim()
  if (ced && (String(reporte.autorCedula || '').includes(ced) || rp.includes(ced))) return true
  const partes = nombre.split(' ').filter((x) => x.length > 2)
  if (partes.length >= 2 && rp.includes(partes[0]) && rp.includes(partes[partes.length - 1])) return true
  return false
}

export function reporteVisiblePara(reporte, sesion, usuarios = []) {
  if (!sesion) return false
  const rol = sesion.rol || (sesion.esAdmin ? 'admin' : sesion.esMaster ? 'master' : 'general')
  if (rol === 'admin' || sesion.esAdmin) return true

  const autorId = String(reporte.autorId || '')
  const nombreRep = String(reporte.reportadoPor || reporte.autorNombre || '').trim().toLowerCase()
  const cedulaSes = String(sesion.cedula || '').trim()
  const nombreSes = String(sesion.nombre || '').trim().toLowerCase()

  const esPropio =
    autorId === String(sesion.id) ||
    (nombreRep && nombreRep === nombreSes) ||
    (cedulaSes && String(reporte.autorCedula || '').trim() === cedulaSes)

  if (rol === 'master') {
    if (esPropio) return true
    const equipoIds = new Set(
      (usuarios || [])
        .filter((u) => String(u.masterId || '') === String(sesion.id))
        .map((u) => String(u.id))
    )
    const equipoNombres = new Set(
      (usuarios || [])
        .filter((u) => String(u.masterId || '') === String(sesion.id) || String(u.id) === String(sesion.id))
        .map((u) => String(u.nombre || '').trim().toLowerCase())
    )
    if (autorId && equipoIds.has(autorId)) return true
    if (nombreRep && equipoNombres.has(nombreRep)) return true
    if (String(reporte.masterId || '') === String(sesion.id)) return true
    return false
  }

  return esPropio
}
