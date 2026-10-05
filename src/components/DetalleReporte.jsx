function DetalleReporte({ reporte, onCerrar, onGenerarPDF }) {
  if (!reporte) return null

  const imagenes = reporte.imagenes || (reporte.imagen ? [reporte.imagen] : [])

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return ''
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ]
    const [year, month, day] = fechaISO.split('-')
    return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{reporte.tipo || 'Reporte'}</h2>
          <button className="modal-cerrar" onClick={onCerrar} title="Cerrar">×</button>
        </div>

        <div className="modal-body">
          <div className="detalle-campo">
            <span className="detalle-label">Reportado por</span>
            <span className="detalle-valor">{reporte.reportadoPor || '—'}</span>
          </div>

          <div className="detalle-campo">
            <span className="detalle-label">Cargo</span>
            <span className="detalle-valor">{reporte.cargo || '—'}</span>
          </div>

          <div className="detalle-campo">
            <span className="detalle-label">Fecha y hora</span>
            <span className="detalle-valor">
              {formatearFecha(reporte.fecha)} · {reporte.hora || '—'}
            </span>
          </div>

          <div className="detalle-campo">
            <span className="detalle-label">Ubicación</span>
            <span className="detalle-valor">{reporte.ubicacionTexto || '—'}</span>
          </div>

          <div className="detalle-campo">
            <span className="detalle-label">Tipo</span>
            <span className="detalle-valor">{reporte.tipo || '—'}</span>
          </div>

          <div className="detalle-campo">
            <span className="detalle-label">Novedad</span>
            <span className="detalle-valor detalle-texto">{reporte.novedad || '—'}</span>
          </div>

          <div className="detalle-campo">
            <span className="detalle-label">Procedimiento</span>
            <span className="detalle-valor detalle-texto">
              {reporte.procedimiento || 'Sin procedimiento registrado'}
            </span>
          </div>

          {(reporte.lat && reporte.lng) && (
            <div className="detalle-campo">
              <span className="detalle-label">Coordenadas</span>
              <span className="detalle-valor">
                {reporte.lat.toFixed(6)}, {reporte.lng.toFixed(6)}
              </span>
            </div>
          )}

          {imagenes.length > 0 && (
            <div className="detalle-fotos">
              <span className="detalle-label">Evidencias fotográficas ({imagenes.length})</span>
              <div className="detalle-fotos-grid">
                {imagenes.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                    <img src={src} alt={`Evidencia ${i + 1}`} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-success" onClick={() => onGenerarPDF(reporte)}>
            Generar PDF
          </button>
          <button className="btn btn-secondary" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default DetalleReporte
