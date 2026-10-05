import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { guardarVinculoReporte } from '../lib/vinculosReportes'
import LectorQR from './LectorQR'
import FirmaPad from './FirmaPad'

const TIPOS_REPORTE = [
  'Novedad',
  'Incidente',
  'Accidente',
  'Habitante de calle',
  'Arma blanca / Amenaza',
  'Emergencia',
  'Rondas',
  'Revistas',
  'Acompañamiento',
  'Ahorro y sostenibilidad',
  'Hurto y robo',
  'Cierre',
  'Apertura',
  'Inventario',
  'Llaves',
  'Infraestructura y planta física',
  'Corredores seguros',
  'Perímetro',
  'Lector QR',
  'Otro'
]

function fechaLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function horaLocal() {
  return new Date().toTimeString().slice(0, 5)
}

function FormularioReporte({ onAgregar, ubicacionSeleccionada, onSeleccionarUbicacion, onLimpiarUbicacion, sesion }) {
  const [form, setForm] = useState({
    fecha: fechaLocal(),
    hora: horaLocal(),
    reportadoPor: sesion?.nombre || '',
    cargo: sesion?.cargo || '',
    ubicacionTexto: '',
    tipo: 'Novedad',
    tipoOtro: '',
    novedad: '',
    procedimiento: '',
    archivos: []
  })
  const [previews, setPreviews] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [obteniendoGps, setObteniendoGps] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [escaneandoQR, setEscaneandoQR] = useState(false)
  const [quiereFirmar, setQuiereFirmar] = useState(false)
  const [firmaNombre, setFirmaNombre] = useState('')
  const [firmaCedula, setFirmaCedula] = useState('')
  const [firmaImg, setFirmaImg] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    const tick = () => {
      setForm((prev) => ({ ...prev, fecha: fechaLocal(), hora: horaLocal() }))
    }
    tick()
    const id = setInterval(tick, 15000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => aplicarPosicionGps(pos),
      () => {},
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
    )
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const buscarDireccion = async () => {
    if (!form.ubicacionTexto.trim()) {
      alert('Escribe una dirección o descripción de ubicación')
      return
    }
    setBuscando(true)
    try {
      const query = encodeURIComponent(form.ubicacionTexto + ', Bogotá, Colombia')
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': 'ReporteEventosApp/2.0' } }
      )
      const data = await res.json()
      if (data && data.length > 0) {
        onSeleccionarUbicacion({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        })
      } else {
        alert('No se encontró la dirección. Selecciona manualmente en el mapa.')
      }
    } catch (err) {
      console.error(err)
      alert('Error al buscar la dirección.')
    } finally {
      setBuscando(false)
    }
  }


  const armarDireccion = (data, lat, lng, accuracy) => {
    const a = data?.address || {}
    const partes = [
      [a.road, a.house_number].filter(Boolean).join(' '),
      a.neighbourhood || a.quarter || a.residential,
      a.suburb || a.city_district || a.municipality,
      a.village || a.town || a.city || a.county,
      a.state,
      a.postcode
    ].map((p) => (p || '').trim()).filter(Boolean)
    const detalle = partes.length ? partes.join(', ') : (data?.display_name || '')
    const prec = accuracy != null && Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)} m)` : ''
    return detalle
      ? `${detalle}${prec}`
      : `GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}${prec}`
  }

  const aplicarPosicionGps = async (position) => {
    const lat = position.coords.latitude
    const lng = position.coords.longitude
    const accuracy = position.coords.accuracy
    onSeleccionarUbicacion({ lat, lng, accuracy })
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&namedetails=1`,
        { headers: { Accept: 'application/json', 'Accept-Language': 'es' } }
      )
      const data = await res.json()
      setForm((prev) => ({
        ...prev,
        ubicacionTexto: armarDireccion(data, lat, lng, accuracy)
      }))
    } catch {
      setForm((prev) => ({
        ...prev,
        ubicacionTexto: armarDireccion(null, lat, lng, accuracy)
      }))
    }
  }

  const obtenerUbicacionGPS = () => {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalización. Usa Buscar o haz clic en el mapa.')
      return
    }

    setObteniendoGps(true)
    let mejor = null
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!mejor || (position.coords.accuracy || 9999) < (mejor.coords.accuracy || 9999)) {
          mejor = position
          aplicarPosicionGps(position)
        }
        if ((position.coords.accuracy || 9999) <= 25) {
          navigator.geolocation.clearWatch(watchId)
          setObteniendoGps(false)
        }
      },
      (error) => {
        navigator.geolocation.clearWatch(watchId)
        setObteniendoGps(false)
        if (mejor) return
        let msg = 'No se pudo obtener la ubicación GPS.'
        if (error.code === 1) msg = 'Permiso de ubicación denegado. Actívalo en el navegador o usa Buscar / mapa.'
        if (error.code === 2) msg = 'Ubicación no disponible. Intenta de nuevo o usa el mapa.'
        if (error.code === 3) msg = 'Tiempo de espera agotado al obtener GPS.'
        alert(msg)
      },
      {
        enableHighAccuracy: true,
        timeout: 25000,
        maximumAge: 0
      }
    )
    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId)
      setObteniendoGps(false)
    }, 12000)
  }

  const handleImagenes = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (form.archivos.length + files.length > 5) {
      alert('Máximo 5 imágenes por reporte')
      return
    }

    const validos = files.filter(f => {
      if (f.size > 3 * 1024 * 1024) {
        alert(`"${f.name}" supera 3 MB y se omitió`)
        return false
      }
      return true
    })

    setForm(prev => ({ ...prev, archivos: [...prev.archivos, ...validos] }))
    validos.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPreviews(prev => [...prev, ev.target.result])
      }
      reader.readAsDataURL(file)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const eliminarImagen = (index) => {
    setForm(prev => ({
      ...prev,
      archivos: prev.archivos.filter((_, i) => i !== index)
    }))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const subirImagenes = async () => {
    const { subirEvidencias } = await import('../lib/evidencias')
    return subirEvidencias(form.archivos)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!ubicacionSeleccionada) {
      alert('Selecciona una ubicación en el mapa o usa Buscar')
      return
    }
    if (!form.reportadoPor.trim()) {
      alert('Escribe el nombre de quien reporta')
      return
    }
    if (!form.ubicacionTexto.trim()) {
      alert('Escribe la ubicación')
      return
    }
    if (!form.novedad.trim()) {
      alert('Escribe la novedad')
      return
    }
    if (form.tipo === 'Otro' && !form.tipoOtro.trim()) {
      alert('Escribe el nombre del tipo de reporte')
      return
    }

    const tipoFinal = form.tipo === 'Otro' ? form.tipoOtro.trim() : form.tipo

    setGuardando(true)
    try {
      const urlsImagenes = await subirImagenes()

      const { data, error } = await supabase
        .from('reportes')
        .insert([{
          fecha: fechaLocal(),
          hora: horaLocal(),
          reportado_por: (sesion?.nombre || form.reportadoPor).trim(),
          cargo: (sesion?.cargo || form.cargo).trim() || null,
          ubicacion_texto: form.ubicacionTexto.trim(),
          tipo: tipoFinal,
          novedad: form.novedad.trim(),
          procedimiento: form.procedimiento.trim() || null,
          lat: ubicacionSeleccionada.lat,
          lng: ubicacionSeleccionada.lng,
          imagenes: urlsImagenes.length > 0 ? urlsImagenes : null
        }])
        .select()
        .single()

      if (error) throw error

      const vinculo = {
        autorId: sesion?.id || null,
        autorNombre: sesion?.nombre || data.reportado_por,
        masterId: sesion?.rol === 'master' || sesion?.esAdmin ? (sesion?.rol === 'admin' ? null : sesion?.id) : (sesion?.masterId || null),
        masterNombre: sesion?.rol === 'master' ? sesion?.nombre : (sesion?.masterNombre || ''),
        firmaNombre: quiereFirmar ? firmaNombre.trim() : '',
        firmaCedula: quiereFirmar ? firmaCedula.trim() : '',
        firmaImg: quiereFirmar ? firmaImg : ''
      }
      if (sesion?.rol === 'master' || (!sesion?.esAdmin && sesion?.esMaster && sesion?.rol !== 'admin')) {
        vinculo.masterId = sesion.id
        vinculo.masterNombre = sesion.nombre
      }
      guardarVinculoReporte(data.id, vinculo)

      const reporteNormalizado = {
        id: data.id,
        fecha: data.fecha,
        hora: data.hora,
        reportadoPor: data.reportado_por,
        cargo: data.cargo || '',
        ubicacionTexto: data.ubicacion_texto,
        tipo: data.tipo,
        novedad: data.novedad,
        procedimiento: data.procedimiento || '',
        lat: data.lat,
        lng: data.lng,
        imagenes: data.imagenes || [],
        creadoEn: data.created_at,
        firmaNombre: vinculo.firmaNombre,
        firmaCedula: vinculo.firmaCedula,
        firmaImg: vinculo.firmaImg,
        ...vinculo
      }

      onAgregar(reporteNormalizado)

      setForm({
        fecha: fechaLocal(),
        hora: horaLocal(),
        reportadoPor: '',
        cargo: '',
        ubicacionTexto: '',
        tipo: 'Novedad',
        tipoOtro: '',
        novedad: '',
        procedimiento: '',
        archivos: []
      })
      setPreviews([])
      setQuiereFirmar(false)
      setFirmaNombre('')
      setFirmaCedula('')
      setFirmaImg('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error(err)
      alert('Error al guardar el reporte: ' + (err.message || 'Intenta de nuevo'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="card">
      <h2>Nuevo reporte</h2>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Reportado por</label>
            <input
              type="text"
              name="reportadoPor"
              value={form.reportadoPor || sesion?.nombre || ''}
              onChange={handleChange}
              readOnly={!!sesion?.nombre}
              placeholder="Nombre de quien reporta"
              required
            />
          </div>
          <div className="form-group">
            <label>Cargo</label>
            <input
              type="text"
              name="cargo"
              value={form.cargo}
              onChange={handleChange}
              placeholder="Ej: Supervisor, Guardia, Coordinador..."
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" name="fecha" value={form.fecha} readOnly required />
          </div>
          <div className="form-group">
            <label>Hora del celular</label>
            <input type="time" name="hora" value={form.hora} readOnly required />
          </div>
        </div>

        <div className="form-group">
          <label>Ubicación (dirección o descripción)</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              name="ubicacionTexto"
              value={form.ubicacionTexto}
              onChange={handleChange}
              placeholder="Ej: Calle 14 con calle 71..."
              required
              style={{ flex: 1, minWidth: '160px' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={buscarDireccion}
              disabled={buscando || obteniendoGps}
              style={{ whiteSpace: 'nowrap', padding: '10px 14px' }}
            >
              {buscando ? '...' : '📍 Buscar'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={obtenerUbicacionGPS}
              disabled={buscando || obteniendoGps}
              style={{ whiteSpace: 'nowrap', padding: '10px 14px', width: 'auto' }}
            >
              {obteniendoGps ? 'Obteniendo...' : '📡 Mi ubicación'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setForm(prev => ({ ...prev, ubicacionTexto: '' }))
                onLimpiarUbicacion()
              }}
              disabled={buscando || obteniendoGps}
              style={{ whiteSpace: 'nowrap', padding: '10px 14px', width: 'auto' }}
              title="Borrar ubicación"
            >
              🗑️ Borrar ubicación
            </button>
          </div>
          <small style={{ color: '#64748b', fontSize: '0.78rem' }}>
            Usa GPS de alta precisión (celular, tablet o PC). La dirección se arma con calle, barrio y ciudad.
          </small>
        </div>

        <div className="form-group">
          <label>Tipo de reporte</label>
          <select name="tipo" value={form.tipo} onChange={handleChange}>
            {TIPOS_REPORTE.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {form.tipo === 'Lector QR' && (
          <div className="form-group">
            <label>Lectura QR</label>
            {!escaneandoQR ? (
              <button type="button" className="btn btn-primary" onClick={() => setEscaneandoQR(true)}>
                📷 Abrir lector QR
              </button>
            ) : (
              <LectorQR
                onLeido={(valor) => {
                  setForm(prev => ({
                    ...prev,
                    tipo: 'Lector QR',
                    novedad: valor,
                    fecha: fechaLocal(),
                    hora: horaLocal(),
                    reportadoPor: prev.reportadoPor || sesion?.nombre || '',
                    cargo: prev.cargo || sesion?.cargo || '',
                    procedimiento: prev.procedimiento || `Lectura QR ${new Date().toLocaleString('es-CO')}`
                  }))
                  setEscaneandoQR(false)
                  obtenerUbicacionGPS()
                }}
                onCerrar={() => setEscaneandoQR(false)}
              />
            )}
            <small style={{ color: '#4b5563', fontSize: '0.78rem' }}>
              El contenido del QR se guarda como novedad del reporte y queda vinculado a tu master/administrador.
            </small>
          </div>
        )}

        {form.tipo === 'Otro' && (
          <div className="form-group">
            <label>Nombre del tipo de reporte</label>
            <input
              type="text"
              name="tipoOtro"
              value={form.tipoOtro}
              onChange={handleChange}
              placeholder="Escribe el nombre del reporte..."
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>{form.tipo === 'Lector QR' ? 'Contenido del QR / Novedad' : 'Novedad'}</label>
          <textarea name="novedad" value={form.novedad} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>Procedimiento</label>
          <textarea name="procedimiento" value={form.procedimiento} onChange={handleChange} />
        </div>

        <div className="form-group firma-modulo">
          <label>
            <input type="checkbox" checked={quiereFirmar} onChange={(e) => setQuiereFirmar(e.target.checked)} />
            {' '}Firmar el reporte (opcional)
          </label>
          {quiereFirmar && (
            <div className="firma-campos">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre de quien firma</label>
                  <input value={firmaNombre} onChange={(e) => setFirmaNombre(e.target.value)} placeholder="Nombre completo" />
                </div>
                <div className="form-group">
                  <label>Cédula de quien firma</label>
                  <input value={firmaCedula} onChange={(e) => setFirmaCedula(e.target.value)} placeholder="Número de cédula" />
                </div>
              </div>
              <label>Firma en pantalla</label>
              <FirmaPad valor={firmaImg} onChange={setFirmaImg} />
              <small style={{ color: '#4b5563', fontSize: '0.75rem' }}>
                Dibuja la firma con el dedo o el mouse. No se permite cargar imagen.
              </small>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Imágenes (máximo 5)</label>
          <input type="file" accept="image/*" multiple onChange={handleImagenes} ref={fileInputRef} />
          {previews.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {previews.map((src, index) => (
                <div key={index} style={{ position: 'relative' }}>
                  <img src={src} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #cbd5e1' }} />
                  <button type="button" onClick={() => eliminarImagen(index)} style={{
                    position: 'absolute', top: -6, right: -6, background: '#dc2626', color: 'white',
                    border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 12, cursor: 'pointer'
                  }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {ubicacionSeleccionada ? (
          <div className="location-info">
            📍 {ubicacionSeleccionada.lat.toFixed(6)}, {ubicacionSeleccionada.lng.toFixed(6)}
            <br />
            <button type="button" className="btn btn-secondary" style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.8rem' }} onClick={onLimpiarUbicacion}>
              Cambiar ubicación
            </button>
          </div>
        ) : (
          <div className="location-info" style={{ background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>
            ⚠️ Usa "Mi ubicación", "Buscar" o haz clic en el mapa
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar reporte'}
        </button>
      </form>
    </div>
  )
}

export default FormularioReporte
