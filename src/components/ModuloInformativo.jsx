import { useEffect, useMemo, useState } from 'react'
import {
  listarAvisos,
  crearAviso,
  eliminarAviso,
  archivoADataUrl,
  formatFechaAviso,
  sincronizarAvisosNube
} from '../lib/informativo'

function ModuloInformativo({ sesion, forzarAbierto = false }) {
  const puedePublicar = sesion?.rol === 'admin' || sesion?.rol === 'master' || sesion?.esAdmin || sesion?.esMaster
  const [abiertoInt, setAbierto] = useState(false)
  const abierto = forzarAbierto || abiertoInt
  const [avisos, setAvisos] = useState(() => listarAvisos())
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [imagenes, setImagenes] = useState([])
  const [documentos, setDocumentos] = useState([])
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [cargando, setCargando] = useState(false)

  const recargar = () => setAvisos(listarAvisos())

  useEffect(() => {
    sincronizarAvisosNube().then((lista) => setAvisos(lista || listarAvisos()))
  }, [])

  const handleImagenes = async (e) => {
    setError('')
    try {
      const files = Array.from(e.target.files || [])
      const loaded = []
      for (const f of files) loaded.push(await archivoADataUrl(f, 3))
      setImagenes((prev) => [...prev, ...loaded])
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  const handleDocs = async (e) => {
    setError('')
    try {
      const files = Array.from(e.target.files || [])
      const loaded = []
      for (const f of files) loaded.push(await archivoADataUrl(f, 4))
      setDocumentos((prev) => [...prev, ...loaded])
    } catch (err) {
      setError(err.message)
    }
    e.target.value = ''
  }

  const handlePublicar = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    setCargando(true)
    try {
      await crearAviso({
        titulo,
        texto,
        autorId: sesion.id,
        autorNombre: sesion.nombre,
        imagenes,
        documentos
      })
      setTitulo('')
      setTexto('')
      setImagenes([])
      setDocumentos([])
      setOk('Aviso publicado')
      recargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  const handleEliminar = (id) => {
    if (!window.confirm('¿Eliminar este aviso?')) return
    try {
      eliminarAviso(id, sesion)
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  const pendientesLeer = useMemo(() => avisos.length, [avisos])

  return (
    <div className="card modulo-informativo">
      <div className="informativo-header">
        <div>
          <h2>INFORMATIVO</h2>
          <p className="informativo-sub">
            {puedePublicar
              ? 'Publica avisos con texto, imágenes, PDF o Excel para tu equipo'
              : 'Consulta avisos, imágenes y documentos publicados por tu master'}
          </p>
        </div>
        {!forzarAbierto && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: 'auto' }}
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? 'Cerrar' : `Ver informativo (${pendientesLeer})`}
        </button>
        )}
      </div>

      {abierto && (
        <div className="informativo-cuerpo">
          {puedePublicar && (
            <form className="informativo-form" onSubmit={handlePublicar}>
              <div className="form-group">
                <label>Título</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Circular de turno" />
              </div>
              <div className="form-group">
                <label>Contenido</label>
                <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe el aviso..." />
              </div>
              <div className="foto-opciones">
                <label className="btn btn-secondary foto-btn">
                  🖼️ Imágenes
                  <input type="file" accept="image/*" multiple hidden onChange={handleImagenes} />
                </label>
                <label className="btn btn-secondary foto-btn">
                  📄 PDF / Excel
                  <input type="file" accept=".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple hidden onChange={handleDocs} />
                </label>
              </div>
              {(imagenes.length > 0 || documentos.length > 0) && (
                <p style={{ fontSize: '0.8rem', color: '#4b5563', margin: '8px 0' }}>
                  {imagenes.length} imagen(es) · {documentos.length} documento(s)
                </p>
              )}
              {error && <p className="master-error">{error}</p>}
              {ok && <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>{ok}</p>}
              <button type="submit" className="btn btn-primary" disabled={cargando} style={{ width: 'auto', marginTop: 8 }}>
                {cargando ? 'Publicando...' : 'Publicar aviso'}
              </button>
            </form>
          )}

          <div className="informativo-lista">
            {avisos.length === 0 && (
              <p className="empty-state">No hay avisos publicados todavía.</p>
            )}
            {avisos.map((a) => (
              <article key={a.id} className="aviso-item">
                <div className="aviso-meta">
                  <strong>{a.titulo}</strong>
                  <span>{formatFechaAviso(a.creadoEn)} · {a.autorNombre}</span>
                </div>
                {a.texto && <p className="aviso-texto">{a.texto}</p>}
                {a.imagenes?.length > 0 && (
                  <div className="aviso-fotos">
                    {a.imagenes.map((img, i) => (
                      <a key={i} href={img.dataUrl} target="_blank" rel="noreferrer">
                        <img src={img.dataUrl} alt={img.nombre} />
                      </a>
                    ))}
                  </div>
                )}
                {a.documentos?.length > 0 && (
                  <div className="aviso-docs">
                    {a.documentos.map((doc, i) => (
                      <a key={i} href={doc.dataUrl} download={doc.nombre} className="aviso-doc-link">
                        {doc.nombre}
                      </a>
                    ))}
                  </div>
                )}
                {puedePublicar && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem', marginTop: 8 }}
                    onClick={() => handleEliminar(a.id)}
                  >
                    Eliminar
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ModuloInformativo
