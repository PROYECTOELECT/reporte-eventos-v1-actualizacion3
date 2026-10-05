import jsPDF from 'jspdf'

export async function generarInformeGeneral(reportes, fechaInicio, fechaFin, tituloInforme = 'SEGURIDAD PERIMETRAL Y CORREDORES SEGUROS', logoMarca = null, mapaDataUrl = null) {
  if (!reportes || reportes.length === 0) {
    alert('No hay reportes en el rango de fechas seleccionado')
    return
  }

  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14
  let y = 14

  // ========== ENCABEZADO ==========
  let logoDrawn = false
  if (logoMarca && typeof logoMarca === 'string' && logoMarca.startsWith('data:image')) {
    try {
      const props = doc.getImageProperties(logoMarca)
      const maxH = 16
      const maxW = 40
      let w = maxW
      let h = (props.height * w) / props.width
      if (h > maxH) {
        h = maxH
        w = (props.width * h) / props.height
      }
      let fmt = 'JPEG'
      if (logoMarca.includes('image/png')) fmt = 'PNG'
      else if (logoMarca.includes('image/webp')) fmt = 'WEBP'
      else if (logoMarca.includes('image/jpeg') || logoMarca.includes('image/jpg')) fmt = 'JPEG'
      doc.addImage(logoMarca, fmt, margin, y, w, h)
      y += h + 3
      logoDrawn = true
    } catch (e) {
      console.warn('No se pudo agregar logo', e)
    }
  }

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(1.2)
  doc.line(margin, y, pageWidth - margin, y)
  y += 7

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(20, 20, 20)
  doc.text('INFORME GENERAL DE NOVEDADES', pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFontSize(10)
  doc.text(tituloInforme || 'SEGURIDAD PERIMETRAL Y CORREDORES SEGUROS', pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)

  const rangoTexto = fechaInicio && fechaFin
    ? `Período: ${formatearFecha(fechaInicio)}  →  ${formatearFecha(fechaFin)}`
    : 'Período: Todos los reportes'

  doc.text(rangoTexto, pageWidth / 2, y, { align: 'center' })
  y += 5
  doc.text(`Total de reportes: ${reportes.length}`, pageWidth / 2, y, { align: 'center' })
  y += 5

  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.6)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  // ========== RESUMEN POR TIPO ==========
  const conteoTipos = {}
  reportes.forEach(r => {
    const t = r.tipo || 'Sin tipo'
    conteoTipos[t] = (conteoTipos[t] || 0) + 1
  })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)
  doc.text('RESUMEN POR TIPO DE REPORTE', margin, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  Object.entries(conteoTipos).forEach(([tipo, cant]) => {
    doc.text(`• ${tipo}: ${cant}`, margin + 3, y)
    y += 4.5
  })
  y += 7

  // ========== LISTADO DETALLADO CON FOTOS ==========
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DETALLE DE REPORTES', margin, y)
  y += 3
  doc.setDrawColor(30, 64, 175)
  doc.setLineWidth(0.4)
  doc.line(margin, y, margin + 42, y)
  y += 7

  reportes.forEach((reporte, index) => {
    const imagenes = reporte.imagenes || (reporte.imagen ? [reporte.imagen] : [])
    const novedadLines = doc.splitTextToSize(reporte.novedad || '-', 175)
    const procLines = doc.splitTextToSize(reporte.procedimiento || '-', 175)

    // Estimación de altura aproximada
    let estimatedH = 32 + novedadLines.length * 3.6 + procLines.length * 3.6
    if (imagenes.length > 0) {
      estimatedH += 55 // espacio aproximado para fotos
    }

    if (y + Math.min(estimatedH, 80) > pageHeight - 18) {
      doc.addPage()
      y = 16
    }

    // Cabecera del reporte
    doc.setFillColor(30, 64, 175)
    doc.rect(margin, y, 9, 6.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text(String(index + 1), margin + 4.5, y + 4.5, { align: 'center' })

    doc.setTextColor(15, 23, 42)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(reporte.tipo || 'Novedad', margin + 12, y + 4.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(80, 80, 80)
    doc.text(`${formatearFecha(reporte.fecha)}  ·  ${reporte.hora || ''}`, pageWidth - margin, y + 4.5, { align: 'right' })
    y += 9

    // Reportado por / Cargo
    if (reporte.reportadoPor) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(30, 41, 59)
      doc.text('Reportado por:', margin + 2, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      doc.text(reporte.reportadoPor, margin + 28, y)
      y += 5
    }
    if (reporte.cargo) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(30, 41, 59)
      doc.text('Cargo:', margin + 2, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      doc.text(reporte.cargo, margin + 28, y)
      y += 5
    }

    // Ubicación
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 41, 59)
    doc.text('Ubicación:', margin + 2, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    const ubicLines = doc.splitTextToSize(reporte.ubicacionTexto || '-', 155)
    doc.text(ubicLines, margin + 22, y)
    y += ubicLines.length * 3.6 + 2

    // Novedad
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text('Novedad:', margin + 2, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(novedadLines, margin + 20, y)
    y += novedadLines.length * 3.6 + 2

    // Procedimiento
    if (reporte.procedimiento) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('Procedimiento:', margin + 2, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 30, 30)
      doc.text(procLines, margin + 28, y)
      y += procLines.length * 3.6 + 2
    }

    // Coordenadas
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text(
      `Coord: ${reporte.lat?.toFixed(5) || '-'}, ${reporte.lng?.toFixed(5) || '-'}   |   Fotos: ${imagenes.length}`,
      margin + 2,
      y
    )
    y += 6

    // ========== FOTOS DEL REPORTE ==========
    if (imagenes.length > 0) {
      const maxImgW = 58
      const maxImgH = 42
      const gap = 5
      let xPos = margin
      let rowMaxH = 0

      imagenes.forEach((imgBase64, idx) => {
        if (!imgBase64 || (!imgBase64.startsWith("data:") && !imgBase64.startsWith("http"))) return;
        try {
          const props = doc.getImageProperties(imgBase64)
          let w = maxImgW
          let h = (props.height * w) / props.width

          if (h > maxImgH) {
            h = maxImgH
            w = (props.width * h) / props.height
          }

          // Si no cabe en la fila actual
          if (xPos + w > pageWidth - margin) {
            xPos = margin
            y += rowMaxH + gap + 3
            rowMaxH = 0

            if (y + maxImgH > pageHeight - 20) {
              doc.addPage()
              y = 16
            }
          }

          // Si tampoco cabe en altura
          if (y + h > pageHeight - 18) {
            doc.addPage()
            y = 16
            xPos = margin
            rowMaxH = 0
          }

          // Marco
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.25)
          doc.rect(xPos - 0.8, y - 0.8, w + 1.6, h + 1.6)

          doc.addImage(imgBase64, 'JPEG', xPos, y, w, h)

          // Número de foto
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(100, 100, 100)
          doc.text(`Foto ${idx + 1}`, xPos, y + h + 3.5)

          xPos += w + gap
          rowMaxH = Math.max(rowMaxH, h)
        } catch (err) {
          console.warn('Error al agregar imagen en informe general', err)
        }
      })

      y += rowMaxH + 8
    }

    // Separador entre reportes
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.35)
    doc.line(margin, y, pageWidth - margin, y)
    y += 6
  })

  // ========== PIE DE PÁGINA ==========
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(
      `Informe General · Seguridad Perimetral  |  Generado: ${new Date().toLocaleString('es-CO')}`,
      margin,
      pageHeight - 5.5
    )
    doc.text(`Pág. ${i}/${totalPages}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' })
  }

  const nombre = `Informe_General_${fechaInicio || 'inicio'}_${fechaFin || 'fin'}.pdf`
  
  // Página opcional con mapa
  if (mapaDataUrl) {
    doc.addPage()
    let yMap = 16
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(20, 20, 20)
    doc.text('MAPA DE REGISTROS', pageWidth / 2, yMap, { align: 'center' })
    yMap += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    const rangoMapa = [
      fechaInicio ? `Desde: ${fechaInicio}` : null,
      fechaFin ? `Hasta: ${fechaFin}` : null
    ].filter(Boolean).join('  |  ') || 'Todas las fechas'
    doc.text(rangoMapa, pageWidth / 2, yMap, { align: 'center' })
    yMap += 4
    doc.text(`${reportes.length} registro(s)`, pageWidth / 2, yMap, { align: 'center' })
    yMap += 8

    try {
      const props = doc.getImageProperties(mapaDataUrl)
      const maxW = pageWidth - margin * 2
      const maxH = pageHeight - yMap - 20
      let w = maxW
      let h = (props.height * w) / props.width
      if (h > maxH) {
        h = maxH
        w = (props.width * h) / props.height
      }
      const x = (pageWidth - w) / 2
      const fmt = mapaDataUrl.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(mapaDataUrl, fmt, x, yMap, w, h)
    } catch (e) {
      console.warn('Error al agregar mapa al PDF', e)
      doc.setTextColor(180, 40, 40)
      doc.text('No se pudo insertar la imagen del mapa.', margin, yMap + 10)
    }
  }

  doc.save(nombre)
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return ''
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const [year, month, day] = fechaISO.split('-')
  return `${parseInt(day)}/${meses[parseInt(month) - 1]}/${year}`
}
