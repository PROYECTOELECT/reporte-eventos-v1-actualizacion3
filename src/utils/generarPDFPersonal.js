import { jsPDF } from 'jspdf'
import { TIPOS_NOVEDAD } from '../lib/novedadesPersonal'

export function generarPDFPersonal({ titulo, usuario, registros, periodo, logoMarca, grupal }) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 14

  if (logoMarca) {
    try { doc.addImage(logoMarca, 'PNG', margin, y, 18, 12) } catch (_) {}
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(titulo || 'INFORME DE PERSONAL', pageWidth / 2, y + 7, { align: 'center' })
  y += 18

  if (usuario) {
    if (usuario.foto) {
      try { doc.addImage(usuario.foto, 'JPEG', margin, y, 22, 22) } catch (_) {
        try { doc.addImage(usuario.foto, 'PNG', margin, y, 22, 22) } catch (__) {}
      }
    }
    doc.setFontSize(10)
    doc.text(usuario.nombre || '', margin + 26, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`CC ${usuario.cedula || ''} · ${usuario.cargo || ''}`, margin + 26, y + 12)
    doc.text(`Master: ${usuario.masterNombre || 'N/D'}`, margin + 26, y + 17)
    y += 28
  }

  doc.setFontSize(9)
  doc.text(`Periodo: ${periodo || ''} · Registros: ${registros.length}`, margin, y)
  y += 8

  const conteo = {}
  TIPOS_NOVEDAD.forEach((t) => { conteo[t.key] = 0 })
  registros.forEach((n) => {
    if (conteo[n.tipo] != null) conteo[n.tipo]++
    else conteo.otros++
  })
  const total = registros.length || 1
  const barW = pageWidth - margin * 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Indicadores', margin, y)
  y += 5
  TIPOS_NOVEDAD.forEach((t) => {
    const valor = conteo[t.key] || 0
    const pct = registros.length ? valor / total : 0
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`${t.label}  ${valor} (${Math.round(pct * 100)}%)`, margin, y)
    y += 3
    doc.setDrawColor(220)
    doc.setFillColor(235, 235, 235)
    doc.rect(margin, y, barW, 3.2, 'F')
    const rgb = t.color.replace('#', '')
    const r = parseInt(rgb.slice(0, 2), 16)
    const g = parseInt(rgb.slice(2, 4), 16)
    const b = parseInt(rgb.slice(4, 6), 16)
    doc.setFillColor(r, g, b)
    doc.rect(margin, y, Math.max(0.5, barW * pct), 3.2, 'F')
    y += 6
  })
  y += 3

  registros.forEach((n) => {
    if (y > 270) { doc.addPage(); y = 16 }
    const label = TIPOS_NOVEDAD.find((t) => t.key === n.tipo)?.label || n.tipo
    doc.setFont('helvetica', 'bold')
    doc.text(`${n.fecha} ${n.hora} · ${label}${grupal ? ` · ${n.nombre}` : ''}`, margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(n.texto || '', pageWidth - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * 4.5 + 3
    if (n.archivos?.length) {
      doc.text(`Archivos: ${n.archivos.map((a) => a.nombre).join(', ')}`, margin, y)
      y += 5
    }
  })

  doc.save(`Personal_${usuario?.cedula || 'grupal'}_${(periodo || '').replace(/\s/g, '_')}.pdf`)
}

export function abrirVistaInformePersonal({ titulo, usuario, registros, periodo, grupal }) {
  const conteo = {}
  TIPOS_NOVEDAD.forEach((t) => { conteo[t.key] = 0 })
  registros.forEach((n) => {
    if (conteo[n.tipo] != null) conteo[n.tipo]++
    else conteo.otros++
  })
  const total = registros.length || 1
  const barras = TIPOS_NOVEDAD.map((t) => {
    const valor = conteo[t.key] || 0
    const pct = registros.length ? Math.round((valor / total) * 100) : 0
    return `<div style="margin:6px 0;font-size:13px">
      <div style="display:flex;justify-content:space-between"><span>${t.label}</span><strong>${valor} (${pct}%)</strong></div>
      <div style="background:#e5e7eb;height:8px;border-radius:6px;overflow:hidden">
        <div style="width:${pct}%;height:8px;background:${t.color}"></div>
      </div>
    </div>`
  }).join('')
  const ficha = usuario
    ? `<div style="display:flex;gap:12px;align-items:center;margin:16px 0">
        ${usuario.foto ? `<img src="${usuario.foto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover" />` : ''}
        <div>
          <h2 style="margin:0;font-size:16px">${usuario.nombre || ''}</h2>
          <p style="margin:2px 0;color:#4b5563">CC ${usuario.cedula || ''} · ${usuario.cargo || ''}</p>
          <p style="margin:2px 0;color:#4b5563">Master: ${usuario.masterNombre || 'N/D'}</p>
        </div>
      </div>`
    : ''
  let bloquesUsuario = ''
  if (grupal) {
    const porUser = {}
    registros.forEach((n) => {
      const k = n.userId || n.nombre
      if (!porUser[k]) porUser[k] = { nombre: n.nombre, cedula: n.cedula, cargo: n.cargo, foto: n.foto, items: [] }
      porUser[k].items.push(n)
    })
    bloquesUsuario = Object.values(porUser).map((u) => {
      const c = {}
      TIPOS_NOVEDAD.forEach((t) => { c[t.key] = 0 })
      u.items.forEach((n) => { if (c[n.tipo] != null) c[n.tipo]++; else c.otros++ })
      const tot = u.items.length || 1
      const b = TIPOS_NOVEDAD.map((t) => {
        const valor = c[t.key] || 0
        const pct = u.items.length ? Math.round((valor / tot) * 100) : 0
        return `<div style="margin:4px 0;font-size:12px"><div style="display:flex;justify-content:space-between"><span>${t.label}</span><strong>${valor}</strong></div>
          <div style="background:#e5e7eb;height:7px;border-radius:6px"><div style="width:${pct}%;height:7px;background:${t.color}"></div></div></div>`
      }).join('')
      return `<div style="border:1px solid #bfdbfe;border-radius:12px;padding:10px;margin:12px 0">
        <strong>${u.nombre || ''}</strong> · CC ${u.cedula || ''} · ${u.cargo || ''}<div>${b}</div></div>`
    }).join('')
  }

  const items = registros.map((n) => {
    const label = TIPOS_NOVEDAD.find((t) => t.key === n.tipo)?.label || n.tipo
    return `<p><strong>${n.fecha} ${n.hora} · ${label}${grupal ? ' · ' + (n.nombre || '') : ''}</strong><br/>${n.texto || ''}${n.archivos?.length ? '<br/>Archivos: ' + n.archivos.map((a) => a.nombre).join(', ') : ''}</p>`
  }).join('')
  const w = window.open('', '_blank', 'width=820,height=900')
  if (!w) {
    alert('Permite ventanas emergentes para ver el informe')
    return
  }
  w.document.write(`<!DOCTYPE html><html><head><title>${titulo || 'Informe'}</title>
    <style>body{font-family:system-ui,Segoe UI,sans-serif;margin:28px;color:#111;max-width:760px}
    h1{text-align:center;font-size:20px}@media print{.no-print{display:none}}</style>
    </head><body>
    <h1>${titulo || 'INFORME DE PERSONAL'}</h1>
    ${ficha}
    <p>Periodo: ${periodo || ''} · Registros: ${registros.length}</p>
    <h3>Indicadores</h3>
    ${barras}
    ${bloquesUsuario}
    <h3>Registros</h3>
    ${items || '<p>Sin registros en el periodo.</p>'}
    <p class="no-print"><button onclick="window.print()">Imprimir / PDF</button>
    <button onclick="window.close()">Cerrar</button></p>
    </body></html>`)
  w.document.close()
}
