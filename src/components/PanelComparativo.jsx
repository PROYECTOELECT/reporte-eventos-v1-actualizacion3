import { TIPOS_MAPA, generarPDFComparativo } from '../utils/comparativoIndicadores'

export default function PanelComparativo({ grupos, periodo, titulo, logoMarca, onCerrar }) {
  return (
    <section className="comparativo-panel">
      <div className="comparativo-head">
        <div>
          <h3>{titulo || 'Rendimiento comparativo'}</h3>
          <p>{periodo}</p>
        </div>
        <div className="comparativo-acciones">
          <button
            type="button"
            className="btn btn-success"
            onClick={() => generarPDFComparativo({ grupos, periodo, titulo, logoMarca })}
          >
            PDF comparativo
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
      {grupos.length === 0 && <p>No hay usuarios para comparar.</p>}
      {grupos.map((g) => (
        <div key={g.masterId} className="comparativo-grupo">
          <h4>Equipo de {g.masterNombre}</h4>
          <p className="comparativo-meta">{g.usuarios.length} usuario(s). La barra compara contra el mayor del equipo en ese indicador.</p>
          <div className="comparativo-grid">
            {g.usuarios.map((u) => (
              <article key={u.id} className="comparativo-card">
                <div className="comparativo-ficha">
                  {u.foto ? <img src={u.foto} alt="" /> : <div className="comparativo-sinfoto">Sin foto</div>}
                  <div>
                    <strong style={{ color: '#0f172a', fontSize: '0.95rem', fontWeight: 800, lineHeight: 1.25, display: 'block' }}>{u.nombre}</strong>
                    <p>CC {u.cedula} · {u.cargo || 'Sin cargo'}</p>
                    <p>{u.rol === 'master' ? 'Master' : u.rol === 'admin' ? 'Administrador' : 'General'} · Ingreso: {u.ingreso || 'N/D'}</p>
                    <p>Master: {u.masterNombre}</p>
                    <p className="comparativo-total">{u.total} reporte(s) en el periodo</p>
                  </div>
                </div>
                <div className="barra-label">
                  <span>Avance total</span>
                  <strong>{Math.round((u.total / g.maxTotal) * 100)}%</strong>
                </div>
                <div className="barra-track">
                  <div className="barra-fill" style={{ width: `${Math.round((u.total / g.maxTotal) * 100)}%`, background: '#1d4ed8' }} />
                </div>
                {TIPOS_MAPA.map((t) => {
                  const valor = u.counts[t.key] || 0
                  const pct = Math.round((valor / g.max[t.key]) * 100)
                  return (
                    <div key={t.key}>
                      <div className="barra-label">
                        <span>{t.label}</span>
                        <strong>{valor}</strong>
                      </div>
                      <div className="barra-track">
                        <div className="barra-fill" style={{ width: `${pct}%`, background: t.color }} />
                      </div>
                    </div>
                  )
                })}
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
