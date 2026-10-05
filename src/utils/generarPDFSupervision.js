import { jsPDF } from 'jspdf'

export function generarPDFSupervision(inf, logoMarca = null) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 16
  let y = 16

  if (logoMarca) {
    try {
      doc.addImage(logoMarca, 'PNG', margin, y, 22, 14)
    } catch (_) {}
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('INFORME DE SUPERVISIÓN', pageWidth / 2, y + 8, { align: 'center' })
  y += 22

  doc.setDrawColor(80)
  doc.setLineWidth(0.3)
  const boxY = y
  y += 8

  const lineas = [
    ['Motivo', inf.motivo || 'INFORME SUPERVISION'],
    ['Fecha', `${inf.fecha || ''}  ${inf.hora || ''}`],
    ['Elaborado por', `${inf.autorNombre || ''}  CC ${inf.autorCedula || ''}`],
    ['Cargo', inf.autorCargo || ''],
    ['Informe dirigido a', `${inf.destinatarioNombre || ''}  CC ${inf.destinatarioCedula || ''}`]
  ]
  doc.setFontSize(9)
  lineas.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${k}:`, margin + 4, y)
    doc.setFont('helvetica', 'normal')
    const txt = doc.splitTextToSize(String(v || ''), pageWidth - margin * 2 - 40)
    doc.text(txt, margin + 42, y)
    y += Math.max(7, txt.length * 4.5)
  })

  y += 2
  doc.setFont('helvetica', 'bold')
  doc.text('Detalle de la novedad', margin + 4, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const nov = doc.splitTextToSize(inf.novedad || '', pageWidth - margin * 2 - 8)
  doc.text(nov, margin + 4, y)
  y += nov.length * 4.5 + 4

  doc.setFont('helvetica', 'bold')
  doc.text('Procedimiento', margin + 4, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const pr = doc.splitTextToSize(inf.procedimiento || 'Sin procedimiento', pageWidth - margin * 2 - 8)
  doc.text(pr, margin + 4, y)
  y += pr.length * 4.5 + 10

  const firmaW = 70
  const drawFirma = (x, nombre, cedula, img, titulo) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(titulo, x, y)
    if (img) {
      try { doc.addImage(img, 'PNG', x, y + 2, 50, 20) } catch (_) {}
    }
    doc.setDrawColor(120)
    doc.line(x, y + 24, x + 55, y + 24)
    doc.setFont('helvetica', 'normal')
    doc.text(nombre || '', x, y + 28)
    doc.text(cedula ? `CC ${cedula}` : '', x, y + 32)
  }
  drawFirma(margin + 4, inf.firma1Nombre, inf.firma1Cedula, inf.firma1Img, 'Firma 1')
  drawFirma(margin + 90, inf.firma2Nombre, inf.firma2Cedula, inf.firma2Img, 'Firma 2')
  y += 38

  doc.setDrawColor(80)
  doc.rect(margin, boxY, pageWidth - margin * 2, y - boxY)

  doc.save(`Informe_Supervision_${inf.fecha}_${(inf.autorCedula || 'doc')}.pdf`)
}
