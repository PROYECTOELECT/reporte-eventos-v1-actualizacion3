import jsPDF from 'jspdf'

async function urlToBase64(url) {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('No se pudo cargar imagen:', url, e)
    return null
  }
}

export async function generarPDF(reporte, tituloInforme = 'SEGURIDAD PERIMETRAL Y CORREDORES SEGUROS', logoMarca = null) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  let y = 16

  const fechaFormateada = formatearFecha(reporte.fecha)
  const imagenesRaw = reporte.imagenes || (reporte.imagen ? [reporte.imagen] : [])

  // Convertir URLs a base64
  const imagenes = []
  for (const img of imagenesRaw) {
    const b64 = await urlToBase64(img)
    if (b64) imagenes.push(b64)
  }

  // Logo a la izquierda (si existe)
  if (logoMarca && typeof logoMarca === 'string' && logoMarca.startsWith('data:image')) {
    try {
      const props = doc.getImageProperties(logoMarca)
      const maxH = 18
      const maxW = 42
      let w = maxW
      let h = (props.height * w) / props.width
      if (h > maxH) {
        h = maxH
        w = (props.width * h) / props.height
      }
      let fmt = 'JPEG'
      if (logoMarca.includes('image/png')) fmt = 'PNG'
      else if (logoMarca.includes('image/webp')) fmt = 'PNG'
      else if (logoMarca.includes('image/jpeg') || logoMarca.includes('image/jpg')) fmt = 'JPEG'
      doc.addImage(logoMarca, fmt, margin, y, w, h)
      y += h + 5
    } catch (e) {
      console.warn('No se pudo agregar logo al PDF', e)
    }
  }

  // Títulos centrados
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(0, 0, 0)
  doc.text('INFORME TÉCNICO DE NOVEDAD', pageWidth / 2, y, { align: 'center' })
  y += 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  doc.text(tituloInforme || 'SEGURIDAD PERIMETRAL Y CORREDORES SEGUROS', pageWidth / 2, y, { align: 'center' })
  y += 5.5

  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(fechaFormateada, pageWidth / 2, y, { align: 'center' })
  y += 7

  doc.setDrawColor(120, 120, 120)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 8

  const boxX = margin
  const boxStartY = y
  const pad = 6
  const labelW = 38

  y += 5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(0, 0, 0)
  doc.text('REGISTRO DE NOVEDAD', boxX + pad, y)
  y += 4

  doc.setDrawColor(160, 160, 160)
  doc.setLineWidth(0.2)
  doc.line(boxX + pad, y, boxX + contentWidth - pad, y)
  y += 5

  const filas = [
    { label: 'Reportado por', valor: reporte.reportadoPor || 'No especificado' },
    { label: 'Cargo', valor: reporte.cargo || 'No especificado' },
    { label: 'Ubicación', valor: reporte.ubicacionTexto || 'No especificada' },
    { label: 'Fecha y hora', valor: `${fechaFormateada}  ·  ${reporte.hora || '--:--'}` },
    { label: 'Tipo', valor: reporte.tipo || '-' },
    { label: 'Novedad', valor: reporte.novedad || '-' },
    { label: 'Procedimiento', valor: reporte.procedimiento || 'Sin procedimiento registrado' }
  ]

  filas.forEach((fila, index) => {
    const valueW = contentWidth - labelW - pad * 2 - 2
    const lines = doc.splitTextToSize(String(fila.valor), valueW)
    const rowH = Math.max(7, lines.length * 4.3 + 3)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(0, 0, 0)
    doc.text(fila.label, boxX + pad, y + 3.2)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(25, 25, 25)
    doc.text(lines, boxX + labelW + pad - 2, y + 3.2)

    y += rowH

    if (index < filas.length - 1) {
      doc.setDrawColor(210, 210, 210)
      doc.setLineWidth(0.15)
      doc.line(boxX + pad, y - 1, boxX + contentWidth - pad, y - 1)
    }
  })

  if (reporte.lat && reporte.lng) {
    y += 2
    doc.setDrawColor(210, 210, 210)
    doc.setLineWidth(0.15)
    doc.line(boxX + pad, y, boxX + contentWidth - pad, y)
    y += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(70, 70, 70)
    doc.text(`Coordenadas:  Lat ${reporte.lat.toFixed(6)}   ·   Lng ${reporte.lng.toFixed(6)}`, boxX + pad, y + 2)
    y += 6
  }

  if (imagenes.length > 0) {
    y += 1
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.2)
    doc.line(boxX + pad, y, boxX + contentWidth - pad, y)
    y += 5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.text('Evidencias fotográficas', boxX + pad, y)
    y += 5

    const maxImgW = 55
    const maxImgH = 42
    const gap = 5
    let xPos = boxX + pad
    let rowMaxH = 0
    const maxX = boxX + contentWidth - pad

    for (let idx = 0; idx < imagenes.length; idx++) {
      try {
        const imgBase64 = imagenes[idx]
        const props = doc.getImageProperties(imgBase64)
        let w = maxImgW
        let h = (props.height * w) / props.width
        if (h > maxImgH) {
          h = maxImgH
          w = (props.width * h) / props.height
        }

        if (xPos + w > maxX) {
          xPos = boxX + pad
          y += rowMaxH + gap + 3
          rowMaxH = 0
        }

        if (y + h > pageHeight - 28) {
          const boxH = y - boxStartY + 2
          doc.setDrawColor(80, 80, 80)
          doc.setLineWidth(0.3)
          doc.rect(boxX, boxStartY, contentWidth, boxH)
          doc.addPage()
          y = 20
          xPos = boxX + pad
          rowMaxH = 0
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9.5)
          doc.text('REGISTRO DE NOVEDAD (continuación)', boxX + pad, y)
          y += 8
        }

        doc.setDrawColor(140, 140, 140)
        doc.setLineWidth(0.2)
        doc.rect(xPos - 0.5, y - 0.5, w + 1, h + 1)
        doc.addImage(imgBase64, 'JPEG', xPos, y, w, h)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(90, 90, 90)
        doc.text(String(idx + 1), xPos + w / 2, y + h + 3.2, { align: 'center' })

        xPos += w + gap
        rowMaxH = Math.max(rowMaxH, h)
      } catch (e) {
        console.warn('Error imagen', e)
      }
    }
    y += rowMaxH + 7
  } else {
    y += 4
  }

  if (reporte.firmaImg || reporte.firmaNombre) {
    if (y > pageHeight - 70) {
      const boxH0 = y - boxStartY
      doc.setDrawColor(80, 80, 80)
      doc.setLineWidth(0.3)
      doc.rect(boxX, boxStartY, contentWidth, boxH0)
      doc.addPage()
      y = 16
    }
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text('Firma del reporte', margin + 4, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    if (reporte.firmaNombre) doc.text(`Nombre: ${reporte.firmaNombre}`, margin + 4, y)
    y += 4
    if (reporte.firmaCedula) doc.text(`Cédula: ${reporte.firmaCedula}`, margin + 4, y)
    y += 4
    if (reporte.firmaImg) {
      try {
        doc.addImage(reporte.firmaImg, 'PNG', margin + 4, y, 55, 24)
        y += 26
      } catch (e) {
        y += 4
      }
    }
  }

  const boxH = y - boxStartY
  doc.setDrawColor(80, 80, 80)
  doc.setLineWidth(0.3)
  doc.rect(boxX, boxStartY, contentWidth, boxH)

  const footerY = pageHeight - 12
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.2)
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(110, 110, 110)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, margin, footerY)
  doc.text('Sistema de Reportes · Uso interno', pageWidth - margin, footerY, { align: 'right' })

  doc.save(`Informe_${(reporte.tipo || 'Novedad').replace(/\s+/g, '_')}_${reporte.fecha}_${reporte.id}.pdf`)
}

function formatearFecha(fechaISO) {
  if (!fechaISO) return ''
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const [year, month, day] = fechaISO.split('-')
  return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`
}
