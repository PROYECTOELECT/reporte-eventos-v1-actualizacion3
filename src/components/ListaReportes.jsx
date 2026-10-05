function ListaReportes({ reportes, seleccionado, onSeleccionar, onEliminar, onGenerarPDF, esMaster }) {
  if (reportes.length === 0) {
    return (
      <div className="empty-state">
        Aún no hay reportes.<br />
        Completa el formulario y selecciona una ubicación en el mapa.
      </div>
    )
  }

  return (
    <div className="lista-reportes">
      {reportes.map(reporte => {
        const numFotos = reporte.imagenes?.length || (reporte.imagen ? 1 : 0)

        return (
          <div
            key={reporte.id}
            className={`reporte-item ${seleccionado?.id === reporte.id ? 'selected' : ''}`}
            onClick={() => onSeleccionar(reporte)}
          >
            <div className="reporte-info">
              <h4>{reporte.tipo}</h4>
              <p>
                {reporte.fecha} · {reporte.hora}
                {numFotos > 0 && ` · 📷 ${numFotos}`}
              </p>
              {reporte.reportadoPor && (
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Por: {reporte.reportadoPor}{reporte.cargo ? ` · ${reporte.cargo}` : ''}
                </p>
              )}
              <p style={{ marginTop: '2px', fontSize: '0.78rem' }}>
                {reporte.ubicacionTexto
                  ? (reporte.ubicacionTexto.length > 48
                      ? reporte.ubicacionTexto.substring(0, 48) + '...'
                      : reporte.ubicacionTexto)
                  : (reporte.novedad ? reporte.novedad.substring(0, 48) + '...' : '')}
              </p>
            </div>

            <div className="reporte-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="btn btn-success"
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                onClick={() => onGenerarPDF(reporte)}
                title="Generar PDF"
              >
                PDF
              </button>
              {esMaster && (
                <button
                  className="btn btn-danger"
                  onClick={() => onEliminar(reporte.id)}
                  title="Eliminar (solo administrador)"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ListaReportes
