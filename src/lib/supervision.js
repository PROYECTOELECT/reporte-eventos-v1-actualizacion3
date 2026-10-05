const KEY = 'informes_supervision_v1'

export function listarInformesSupervision() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

function guardar(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista))
}

export function crearInformeSupervision(datos) {
  const lista = listarInformesSupervision()
  const item = {
    id: crypto.randomUUID?.() || String(Date.now()),
    motivo: 'INFORME SUPERVISION',
    fecha: datos.fecha || new Date().toISOString().split('T')[0],
    hora: datos.hora || new Date().toTimeString().slice(0, 5),
    autorNombre: (datos.autorNombre || '').trim(),
    autorCedula: (datos.autorCedula || '').trim(),
    autorCargo: (datos.autorCargo || '').trim(),
    novedad: (datos.novedad || '').trim(),
    procedimiento: (datos.procedimiento || '').trim(),
    destinatarioNombre: (datos.destinatarioNombre || '').trim(),
    destinatarioCedula: (datos.destinatarioCedula || '').trim(),
    firma1Nombre: (datos.firma1Nombre || '').trim(),
    firma1Cedula: (datos.firma1Cedula || '').trim(),
    firma1Img: datos.firma1Img || '',
    firma2Nombre: (datos.firma2Nombre || '').trim(),
    firma2Cedula: (datos.firma2Cedula || '').trim(),
    firma2Img: datos.firma2Img || '',
    autorId: datos.autorId || null,
    masterId: datos.masterId || null,
    masterNombre: datos.masterNombre || '',
    creadoEn: new Date().toISOString()
  }
  if (!item.autorNombre || !item.autorCedula) throw new Error('Nombre y cédula de quien reporta son obligatorios')
  if (!item.novedad) throw new Error('Escribe el detalle de la novedad')
  if (!item.destinatarioNombre || !item.destinatarioCedula) throw new Error('Indica a quién se hace el informe (nombre y cédula)')
  lista.unshift(item)
  guardar(lista)
  return item
}

export function eliminarInformeSupervision(id) {
  guardar(listarInformesSupervision().filter((x) => x.id !== id))
}
