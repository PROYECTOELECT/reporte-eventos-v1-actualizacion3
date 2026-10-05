import { jsPDF } from 'jspdf'
import { formatoTiempo } from '../lib/asistencia'

export function generarPDFAsistencia({ titulo, registros, trabajador, periodo, logoMarca, grupal }) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 14

  if (logoMarca) {
    try { doc.addImage(logoMarca, 'PNG', margin, y, 18, 12) } catch (_) {}
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(titulo || 'CONTROL DE TIEMPO', pageWidth / 2, y + 7, { align: 'center' })
  y += 18

  if (trabajador) {
    if (trabajador.foto || trabajador.fotoPerfil) {
      try { doc.addImage(trabajador.foto || trabajador.fotoPerfil, 'JPEG', margin, y, 22, 22) } catch (_) {
        try { doc.addImage(trabajador.foto || trabajador.fotoPerfil, 'PNG', margin, y, 22, 22) } catch (__) {}
      }
    }
    doc.setFontSize(10)
    doc.text(trabajador.nombre || '', margin + 26, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`CC ${trabajador.cedula || ''}`, margin + 26, y + 12)
    doc.text(trabajador.cargo || '', margin + 26, y + 17)
    y += 28
  }

  doc.setFontSize(9)
  doc.text(`Periodo: ${periodo || ''}`, margin, y)
  y += 5
  doc.text(`Registros: ${registros.length}`, margin, y)
  y += 8

  const addImg = (src, x, yy, w, h) => {
    if (!src) return
    try { doc.addImage(src, 'JPEG', x, yy, w, h) } catch (_) {
      try { doc.addImage(src, 'PNG', x, yy, w, h) } catch (__) {}
    }
  }

  registros.forEach((r) => {
    const alto = 42
    if (y + alto > 280) {
      doc.addPage()
      y = 16
    }
    doc.setDrawColor(180)
    doc.rect(margin, y, pageWidth - margin * 2, alto)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(grupal ? `${r.nombre}  CC ${r.cedula}` : r.fecha, margin + 3, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.text(`Ingreso ${r.horaIngreso || '--:--'}  Salida ${r.horaSalida || '--:--'}  Tiempo ${r.horaSalida ? formatoTiempo(r.minutosLaborados) : 'turno abierto'}`, margin + 3, y + 12)
    doc.text('Foto llegada', margin + 3, y + 18)
    addImg(r.fotoIngreso, margin + 3, y + 20, 22, 18)
    doc.text('Foto salida', margin + 40, y + 18)
    addImg(r.fotoSalida, margin + 40, y + 20, 22, 18)
    y += alto + 4
  })

  const totalMin = registros.reduce((s, r) => s + (Number(r.minutosLaborados) || 0), 0)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.text(`Tiempo total laborado: ${formatoTiempo(totalMin)}`, margin, y)

  const slug = (trabajador?.cedula || 'grupal') + '_' + (periodo || '').replace(/\s/g, '')
  doc.save(`Asistencia_${slug}.pdf`)
}

export function abrirVistaAsistencia({ titulo, registros, trabajador, periodo, grupal }) {
  const totalMin = registros.reduce((s, r) => s + (Number(r.minutosLaborados) || 0), 0)
  const ficha = trabajador
    ? `<div style="display:flex;gap:12px;align-items:center;margin:16px 0">
        ${trabajador.foto || trabajador.fotoPerfil ? `<img src="${trabajador.foto || trabajador.fotoPerfil}" style="width:64px;height:64px;object-fit:cover;border-radius:8px" />` : ''}
        <div>
          <h2 style="margin:0;font-size:16px">${trabajador.nombre || ''}</h2>
          <p style="margin:2px 0;color:#4b5563">CC ${trabajador.cedula || ''}</p>
          <p style="margin:2px 0;color:#4b5563">${trabajador.cargo || ''}</p>
        </div>
      </div>`
    : ''
  const items = registros.map((r) => `
    <div style="border:1px solid #d1d5db;padding:12px;margin:10px 0;border-radius:8px">
      <strong>${grupal ? (r.nombre || '') + ' · ' : ''}${r.fecha}</strong>
      <p>Ingreso ${r.horaIngreso || '--:--'} · Salida ${r.horaSalida || '--:--'} · ${r.horaSalida ? formatoTiempo(r.minutosLaborados) : 'turno abierto'}</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:8px">
        <div><div style="font-size:12px">Foto llegada</div>${r.fotoIngreso ? `<img src="${r.fotoIngreso}" style="width:120px;height:90px;object-fit:cover;border-radius:6px" />` : '<p>—</p>'}</div>
        <div><div style="font-size:12px">Foto salida</div>${r.fotoSalida ? `<img src="${r.fotoSalida}" style="width:120px;height:90px;object-fit:cover;border-radius:6px" />` : '<p>—</p>'}</div>
      </div>
    </div>`).join('')
  const w = window.open('', '_blank', 'width=820,height=900')
  if (!w) {
    alert('Permite ventanas emergentes para ver el informe')
    return
  }
  w.document.write(`<!DOCTYPE html><html><head><title>${titulo || 'Registro'}</title>
    <style>body{font-family:system-ui,Segoe UI,sans-serif;margin:28px;color:#111;max-width:760px}
    h1{text-align:center;font-size:20px}@media print{.no-print{display:none}}</style></head><body>
    <h1>${titulo || 'REGISTRO DE PERSONAL'}</h1>
    ${ficha}
    <p>Periodo: ${periodo || ''}</p>
    <p>Registros: ${registros.length}</p>
    ${items || '<p>Sin registros.</p>'}
    <p><strong>Tiempo total laborado: ${formatoTiempo(totalMin)}</strong></p>
    <p class="no-print"><button onclick="window.print()">Imprimir / PDF</button> <button onclick="window.close()">Cerrar</button></p>
    </body></html>`)
  w.document.close()
}
