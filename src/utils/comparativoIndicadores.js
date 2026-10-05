import { jsPDF } from 'jspdf'
import { rolDe } from '../lib/usuarios'
import { reporteEsDeUsuario } from '../lib/vinculosReportes'

export const TIPOS_MAPA = [
  { key: 'hurto', label: 'Hurto / Robo', color: '#dc2626' },
  { key: 'ronda', label: 'Rondas', color: '#16a34a' },
  { key: 'acompanamiento', label: 'Acompañamiento', color: '#0891b2' },
  { key: 'ahorro', label: 'Ahorro y sostenibilidad', color: '#65a30d' },
  { key: 'cierre', label: 'Cierre', color: '#1e3a8a' },
  { key: 'apertura', label: 'Apertura', color: '#22c55e' },
  { key: 'inventario', label: 'Inventario', color: '#92400e' },
  { key: 'llaves', label: 'Llaves', color: '#d97706' },
  { key: 'revista', label: 'Revistas', color: '#2563eb' },
  { key: 'novedad', label: 'Novedad', color: '#eab308' },
  { key: 'basura', label: 'Basuras', color: '#7c3aed' },
  { key: 'qr', label: 'Lector QR', color: '#a21caf' },
  { key: 'infra', label: 'Infraestructura', color: '#6b7280' },
  { key: 'corredor', label: 'Corredores', color: '#ea580c' },
  { key: 'perimetro', label: 'Perímetro', color: '#111827' },
  { key: 'otros', label: 'Otros', color: '#94a3b8' }
]

export function claveTipoReporte(tipo) {
  const t = String(tipo || '').toLowerCase()
  if (t.includes('hurto') || t.includes('robo') || t.includes('atraco') || t.includes('sustracc')) return 'hurto'
  if (t.includes('acompa')) return 'acompanamiento'
  if (t.includes('ahorro') || t.includes('sostenib')) return 'ahorro'
  if (t.includes('cierre')) return 'cierre'
  if (t.includes('apertura')) return 'apertura'
  if (t.includes('inventario')) return 'inventario'
  if (t.includes('llave')) return 'llaves'
  if (t.includes('ronda')) return 'ronda'
  if (t.includes('revista')) return 'revista'
  if (t.includes('novedad')) return 'novedad'
  if (t.includes('basura') || t.includes('residuo') || t.includes('desecho')) return 'basura'
  if (t.includes('qr') || t.includes('lector qr')) return 'qr'
  if (t.includes('infraestructura') || t.includes('planta')) return 'infra'
  if (t.includes('corredor')) return 'corredor'
  if (t.includes('perimetro') || t.includes('perímetro')) return 'perimetro'
  return 'otros'
}

function usuarioDelReporte(reporte, usuarios) {
  const exacto = usuarios.find((u) => reporte.autorId && String(reporte.autorId) === String(u.id))
  if (exacto) return exacto
  return usuarios.find((u) => reporteEsDeUsuario(reporte, u)) || null
}

export function armarComparativo({ usuarios = [], reportes = [], sesion }) {
  const rol = sesion?.rol || (sesion?.esAdmin ? 'admin' : sesion?.esMaster ? 'master' : 'general')
  const esAdmin = rol === 'admin'
  const activos = usuarios.filter((u) => u.activo !== false)
  let base = activos
  if (!esAdmin && rol === 'master') {
    base = activos.filter((u) => String(u.id) === String(sesion.id) || String(u.masterId || '') === String(sesion.id))
  } else if (!esAdmin) {
    base = activos.filter((u) => String(u.id) === String(sesion.id))
  }

  const conteo = new Map(base.map((u) => [String(u.id), Object.fromEntries(TIPOS_MAPA.map((t) => [t.key, 0]))]))
  reportes.forEach((r) => {
    const u = usuarioDelReporte(r, base)
    if (!u) return
    const c = conteo.get(String(u.id))
    if (!c) return
    c[claveTipoReporte(r.tipo)] += 1
  })

  const grupos = new Map()
  base.forEach((u) => {
    const rolU = rolDe(u)
    const esCabeza = rolU === 'master' || rolU === 'admin'
    const masterId = esCabeza ? String(u.id) : String(u.masterId || 'sin-master')
    const masterNombre = esCabeza ? u.nombre : (u.masterNombre || 'Sin master vinculado')
    if (!grupos.has(masterId)) grupos.set(masterId, { masterId, masterNombre, usuarios: [] })
    const counts = conteo.get(String(u.id))
    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    grupos.get(masterId).usuarios.push({
      id: u.id,
      nombre: u.nombre || '',
      cedula: u.cedula || '',
      cargo: u.cargo || '',
      foto: u.foto || '',
      rol: rolU,
      ingreso: String(u.fechaInicioLaboral || u.creadoEn || '').slice(0, 10),
      masterNombre,
      counts,
      total
    })
  })

  return [...grupos.values()].map((g) => {
    const max = {}
    TIPOS_MAPA.forEach((t) => {
      max[t.key] = Math.max(1, ...g.usuarios.map((u) => u.counts[t.key] || 0))
    })
    const maxTotal = Math.max(1, ...g.usuarios.map((u) => u.total))
    return {
      ...g,
      max,
      maxTotal,
      usuarios: g.usuarios.sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))
    }
  }).sort((a, b) => a.masterNombre.localeCompare(b.masterNombre))
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c]))
}

function barrasHtml(usuario, grupo) {
  return TIPOS_MAPA.map((t) => {
    const valor = usuario.counts[t.key] || 0
    const pct = Math.round((valor / grupo.max[t.key]) * 100)
    return `<div class="barra">
      <div class="lbl"><span>${esc(t.label)}</span><strong>${valor}</strong></div>
      <div class="track"><div class="fill" style="width:${pct}%;background:${t.color}"></div></div>
    </div>`
  }).join('')
}

export function abrirVentanaComparativa({ grupos, periodo, titulo }) {
  const cuerpo = grupos.map((g) => `
    <section>
      <h2>Equipo de ${esc(g.masterNombre)}</h2>
      <p class="meta">${g.usuarios.length} usuario(s) · la barra compara contra el mayor del equipo en ese indicador</p>
      <div class="grid">
        ${g.usuarios.map((u) => `
          <article class="card">
            <div class="ficha">
              ${u.foto ? `<img src="${u.foto}" alt="" />` : '<div class="sin-foto">Sin foto</div>'}
              <div>
                <h3>${esc(u.nombre)}</h3>
                <p>CC ${esc(u.cedula)} · ${esc(u.cargo || 'Sin cargo')}</p>
                <p>${u.rol === 'master' ? 'Master' : u.rol === 'admin' ? 'Administrador' : 'General'} · Ingreso: ${esc(u.ingreso || 'N/D')}</p>
                <p>Master: ${esc(u.masterNombre)}</p>
                <p class="total">${u.total} reporte(s) en el periodo</p>
              </div>
            </div>
            <div class="avance"><span>Avance total</span><strong>${Math.round((u.total / g.maxTotal) * 100)}%</strong></div>
            <div class="track total"><div class="fill" style="width:${Math.round((u.total / g.maxTotal) * 100)}%;background:#1d4ed8"></div></div>
            ${barrasHtml(u, g)}
          </article>
        `).join('')}
      </div>
    </section>
  `).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(titulo || 'Comparativo de indicadores')}</title>
    <style>
      body{font-family:system-ui,Segoe UI,sans-serif;margin:0;background:#f8fafc;color:#111}
      header{position:sticky;top:0;background:#fff;border-bottom:1px solid #dbeafe;padding:14px 20px;display:flex;justify-content:space-between;gap:12px;align-items:center}
      h1{margin:0;font-size:18px;color:#1d4ed8}
      .periodo{margin:4px 0 0;color:#4b5563;font-size:13px}
      button{background:#f97316;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer}
      main{padding:16px 20px 32px}
      h2{margin:18px 0 4px;color:#1e3a8a}
      .meta{margin:0 0 10px;color:#6b7280;font-size:13px}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}
      .card{background:#fff;border:1px solid #dbeafe;border-radius:14px;padding:12px}
      .ficha{display:flex;gap:10px;align-items:center;margin-bottom:8px}
      .ficha img,.sin-foto{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #93c5fd;flex-shrink:0}
      .sin-foto{display:flex;align-items:center;justify-content:center;font-size:10px;color:#6b7280;background:#eff6ff}
      h3{margin:0 0 2px;font-size:15px;color:#1d4ed8}
      p{margin:1px 0;font-size:12px;color:#4b5563}
      .total{color:#166534;font-weight:700}
      .avance{display:flex;justify-content:space-between;font-size:12px;margin-top:6px}
      .track{background:#e5e7eb;height:8px;border-radius:6px;overflow:hidden;margin:3px 0 7px}
      .track.total{height:10px}
      .fill{height:100%}
      .lbl{display:flex;justify-content:space-between;font-size:12px}
      @media print{header button{display:none}header{position:static}body{background:#fff}.card{break-inside:avoid}}
    </style></head><body>
    <header>
      <div><h1>${esc(titulo || 'Rendimiento comparativo')}</h1><p class="periodo">${esc(periodo || '')}</p></div>
      <button onclick="window.print()">Imprimir / guardar PDF</button>
    </header>
    <main>${cuerpo || '<p>No hay usuarios para comparar.</p>'}</main>
    </body></html>`

  const ventana = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=800')
  if (!ventana) {
    alert('El navegador bloqueó la ventana. Permite ventanas emergentes para ver el comparativo.')
    return false
  }
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  return true
}

function hex(color) {
  const rgb = String(color || '#64748b').replace('#', '')
  return [parseInt(rgb.slice(0, 2), 16), parseInt(rgb.slice(2, 4), 16), parseInt(rgb.slice(4, 6), 16)]
}

export function generarPDFComparativo({ grupos, periodo, titulo, logoMarca }) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 12
  let y = 14

  const nueva = () => {
    doc.addPage()
    y = 14
  }
  const asegurar = (alto) => {
    if (y + alto > 284) nueva()
  }

  if (logoMarca) {
    try { doc.addImage(logoMarca, 'PNG', margin, y, 16, 10) } catch (_) {}
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(29, 78, 216)
  doc.text(titulo || 'RENDIMIENTO COMPARATIVO', pageW / 2, y + 6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70)
  doc.text(periodo || '', pageW / 2, y + 12, { align: 'center' })
  y += 20

  grupos.forEach((g) => {
    asegurar(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 58, 138)
    doc.text(`Equipo de ${g.masterNombre}`, margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(90)
    doc.text(`${g.usuarios.length} usuario(s). La barra compara contra el mayor del equipo.`, margin, y)
    y += 6

    g.usuarios.forEach((u) => {
      asegurar(62)
      doc.setDrawColor(191, 219, 254)
      doc.setFillColor(248, 251, 255)
      doc.roundedRect(margin, y, pageW - margin * 2, 58, 2, 2, 'FD')
      if (u.foto) {
        try { doc.addImage(u.foto, 'JPEG', margin + 2, y + 2, 16, 16) } catch (_) {
          try { doc.addImage(u.foto, 'PNG', margin + 2, y + 2, 16, 16) } catch (__) {}
        }
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(29, 78, 216)
      doc.text(u.nombre || '', margin + 20, y + 6)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(55)
      doc.text(`CC ${u.cedula || ''} · ${u.cargo || 'Sin cargo'} · ${u.total} reporte(s)`, margin + 20, y + 11)
      doc.text(`Master: ${u.masterNombre || ''} · Ingreso: ${u.ingreso || 'N/D'}`, margin + 20, y + 15)

      let by = y + 22
      const colW = (pageW - margin * 2 - 8) / 2
      TIPOS_MAPA.forEach((t, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = margin + 3 + col * (colW + 2)
        const yy = by + row * 4.4
        const valor = u.counts[t.key] || 0
        const pct = valor / g.max[t.key]
        doc.setFontSize(6.5)
        doc.setTextColor(40)
        doc.text(`${t.label}  ${valor}`, x, yy)
        doc.setFillColor(229, 231, 235)
        doc.rect(x + 38, yy - 2.2, colW - 42, 2.4, 'F')
        const [r, gch, b] = hex(t.color)
        doc.setFillColor(r, gch, b)
        doc.rect(x + 38, yy - 2.2, Math.max(0.4, (colW - 42) * pct), 2.4, 'F')
      })
      y += 62
    })
    y += 2
  })

  doc.save(`Comparativo_indicadores_${new Date().toISOString().slice(0, 10)}.pdf`)
}
