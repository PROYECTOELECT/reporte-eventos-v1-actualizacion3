import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import 'leaflet.heat'

// Fix de iconos por defecto de Leaflet con Vite
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl
})

const iconSeleccionado = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const iconReporte = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const iconActivo = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const iconHurto = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const iconRonda = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const iconRevista = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const iconInfra = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
})
const iconCorredor = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
})
const iconPerimetro = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
})

const iconQR = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const iconNovedad = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function tipoLower(tipo) {
  return (tipo || '').toLowerCase()
}

function esHurtoORobo(tipo) {
  const t = tipoLower(tipo)
  return t.includes('hurto') || t.includes('robo') || t.includes('atraco') || t.includes('sustracc')
}

function esRonda(tipo) {
  return tipoLower(tipo).includes('ronda')
}

function esRevista(tipo) {
  return tipoLower(tipo).includes('revista')
}

function esNovedad(tipo) {
  const t = tipoLower(tipo)
  return (t.includes('novedad') || t === 'novedad') && !t.includes('qr')
}

function esLectorQR(tipo) {
  const t = tipoLower(tipo)
  return t.includes('lector qr') || (t.includes('qr') && !t.includes('infra'))
}

function esInfraestructura(tipo) {
  const t = tipoLower(tipo)
  return t.includes('infraestructura') || t.includes('planta fisica') || t.includes('planta física')
}

function esCorredores(tipo) {
  return tipoLower(tipo).includes('corredor')
}

function esPerimetro(tipo) {
  const t = tipoLower(tipo)
  return t.includes('perimetro') || t.includes('perímetro')
}

function iconoParaReporte(reporte, seleccionadoId) {
  const tipo = reporte.tipo
  if (esHurtoORobo(tipo)) return iconHurto
  if (esRonda(tipo)) return iconRonda
  if (esRevista(tipo)) return iconRevista
  if (esLectorQR(tipo)) return iconQR
  if (esInfraestructura(tipo)) return iconInfra
  if (esCorredores(tipo)) return iconCorredor
  if (esPerimetro(tipo)) return iconPerimetro
  if (esNovedad(tipo)) return iconNovedad
  if (seleccionadoId && reporte.id === seleccionadoId) return iconActivo
  return iconReporte
}

function ClickHandler({ onSeleccionarUbicacion }) {
  useMapEvents({
    click(e) {
      onSeleccionarUbicacion({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      })
    }
  })
  return null
}

function CentrarMapa({ ubicacion }) {
  const map = useMap()

  useEffect(() => {
    if (ubicacion) {
      map.setView([ubicacion.lat, ubicacion.lng], 17, { animate: true })
    }
  }, [ubicacion, map])

  return null
}

/**
 * Mapa de calor:
 * - Rojo  = zonas con menos registros
 * - Naranja = densidad media
 * - Verde = zonas con más presencia de registros
 */
function CapaCalor({ reportes }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const puntos = (reportes || [])
      .filter(r => r.lat != null && r.lng != null)
      .map(r => [r.lat, r.lng, 0.7])

    // Gradiente invertido respecto al típico: baja densidad → rojo, alta → verde
    const heatLayer = L.heatLayer(puntos, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      max: 1.0,
      minOpacity: 0.35,
      gradient: {
        0.0: '#dc2626', // rojo - menos registros
        0.35: '#f97316', // naranja - medio bajo
        0.55: '#fb923c', // naranja claro
        0.75: '#84cc16', // verde lima
        1.0: '#16a34a'  // verde - más registros
      }
    })

    heatLayer.addTo(map)

    return () => {
      map.removeLayer(heatLayer)
    }
  }, [map, reportes])

  return null
}

function MapaReportes({ reportes, ubicacionSeleccionada, onSeleccionarUbicacion, reporteSeleccionado, usuarioVivo, usuariosVivos = [] }) {
  const centroDefault = [4.7110, -74.0721]

  return (
    <MapContainer
      center={centroDefault}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ClickHandler onSeleccionarUbicacion={onSeleccionarUbicacion} />
      <CentrarMapa ubicacion={ubicacionSeleccionada} />
      <CapaCalor reportes={reportes} />

      {reportes.map(reporte => (
        <Marker
          key={reporte.id}
          position={[reporte.lat, reporte.lng]}
          icon={iconoParaReporte(reporte, reporteSeleccionado?.id)}
        >
          <Popup>
            <strong>{reporte.tipo}</strong><br />
            {reporte.fecha} · {reporte.hora}<br />
            <small>{reporte.reportadoPor || reporte.autorNombre || ''}</small><br />
            <small>{reporte.ubicacionTexto || reporte.novedad?.substring(0, 80)}</small>
          </Popup>
        </Marker>
      ))}

      {ubicacionSeleccionada && (
        <Marker
          position={[ubicacionSeleccionada.lat, ubicacionSeleccionada.lng]}
          icon={iconSeleccionado}
        >
          <Popup>Nueva ubicación seleccionada</Popup>
        </Marker>
      )}

      {(usuariosVivos.length ? usuariosVivos : (usuarioVivo ? [usuarioVivo] : [])).filter(u => u?.lat != null && u?.lng != null).map(u => (
        <Marker
          key={u.id || u.nombre}
          position={[u.lat, u.lng]}
          icon={L.divIcon({
            className: 'marker-usuario-foto',
            html: `<div class="marker-foto-wrap"><img src="${u.foto || ''}" alt="" /></div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 48],
            popupAnchor: [0, -48]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center', minWidth: 170 }}>
              {u.foto ? <img src={u.foto} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px', display: 'block' }} /> : null}
              <strong>{u.nombre || 'Usuario'}</strong>
              {u.cargo ? <div><small>{u.cargo}</small></div> : null}
              <div style={{ marginTop: 6 }}><small><b>Última conexión</b></small></div>
              <div><small>
                {u.ultimaActividad
                  ? new Date(u.ultimaActividad).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                  : 'Sin registro'}
              </small></div>
              <div style={{ marginTop: 4 }}><small><b>Ubicación</b></small></div>
              <div><small>{Number(u.lat).toFixed(6)}, {Number(u.lng).toFixed(6)}</small></div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default MapaReportes
