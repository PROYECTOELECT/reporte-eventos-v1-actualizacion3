import * as XLSX from 'xlsx'

export function exportarExcel(reportes, fechaInicio, fechaFin, tituloInforme = '', logoMarca = null) {
  if (!reportes || reportes.length === 0) {
    alert('No hay reportes en el rango de fechas seleccionado')
    return
  }

  const datos = reportes.map((r, index) => {
    const numFotos = r.imagenes?.length || (r.imagen ? 1 : 0)

    return {
      'N°': index + 1,
      'ID': r.id,
      'Reportado por': r.reportadoPor,
      'Cargo': r.cargo || '',
      'Fecha': r.fecha,
      'Hora': r.hora,
      'Tipo': r.tipo || '',
      'Ubicación': r.ubicacionTexto || '',
      'Novedad': r.novedad || '',
      'Procedimiento': r.procedimiento || '',
      'Latitud': r.lat ? r.lat.toFixed(6) : '',
      'Longitud': r.lng ? r.lng.toFixed(6) : '',
      'Cantidad de fotos': numFotos,
      'Fecha de registro': r.creadoEn ? new Date(r.creadoEn).toLocaleString('es-CO') : ''
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(datos)

  ws['!cols'] = [
    { wch: 5 },
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 8 },
    { wch: 18 },
    { wch: 45 },
    { wch: 50 },
    { wch: 50 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 }
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Reportes')

  // Resumen
  const conteoTipos = {}
  reportes.forEach(r => {
    const t = r.tipo || 'Sin tipo'
    conteoTipos[t] = (conteoTipos[t] || 0) + 1
  })

  const resumenData = [
    { Indicador: 'Título del informe', Valor: tituloInforme || '' },
    { Indicador: 'Logo de marca', Valor: logoMarca ? 'Sí (configurado en la app)' : 'No' },
    { Indicador: 'Total de reportes', Valor: reportes.length },
    { Indicador: 'Fecha inicio filtro', Valor: fechaInicio || 'Todos' },
    { Indicador: 'Fecha fin filtro', Valor: fechaFin || 'Todos' },
    { Indicador: 'Reportes con fotos', Valor: reportes.filter(r => (r.imagenes?.length || r.imagen)).length },
    { Indicador: '', Valor: '' },
    { Indicador: '--- Por tipo ---', Valor: '' },
    ...Object.entries(conteoTipos).map(([tipo, cant]) => ({
      Indicador: tipo,
      Valor: cant
    }))
  ]

  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  const nombre = `Reportes_${fechaInicio || 'inicio'}_${fechaFin || 'fin'}.xlsx`
  XLSX.writeFile(wb, nombre)
}
