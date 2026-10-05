import { useEffect, useState } from 'react'
import { usuariosDesconectados } from '../lib/usuarios'
import {
  listarNotifsDesconexion,
  registrarNotifDesconexion,
  marcarNotifLeida,
  noLeidasNotifs
} from '../lib/mensajes'

const HORAS_LIMITE = 4 // horas sin actividad para alertar

function formatFecha(iso) {
  if (!iso) return 'Sin registro de actividad'
  try {
    return new Date(iso).toLocaleString('es-CO', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return iso
  }
}

function NotificacionesMaster({ abierto, onCerrar }) {
  const [notifs, setNotifs] = useState([])
  const [desconectados, setDesconectados] = useState([])

  useEffect(() => {
    if (!abierto) return
    // Generar alertas nuevas
    const lista = usuariosDesconectados(HORAS_LIMITE)
    setDesconectados(lista)
    lista.forEach(u => {
      const horas = u.sinActividad ? HORAS_LIMITE : Math.floor(u.horasDesconectado)
      registrarNotifDesconexion({
        userId: u.id,
        nombre: u.nombre,
        cedula: u.cedula,
        cargo: u.cargo,
        ultimaActividad: u.ultimaActividad || null,
        horas: u.sinActividad ? 'sin actividad registrada' : horas,
        fechaAlerta: new Date().toISOString(),
        detalle: u.sinActividad
          ? `El usuario ${u.nombre} (CC ${u.cedula}) no tiene registro de actividad en el sistema.`
          : `El usuario ${u.nombre} (CC ${u.cedula}, ${u.cargo || 'sin cargo'}) lleva aproximadamente ${horas} hora(s) desconectado. Última actividad: ${formatFecha(u.ultimaActividad)}.`
      })
    })
    setNotifs(listarNotifsDesconexion())
  }, [abierto])

  if (!abierto) return null

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-contenido" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>🔔 Notificaciones de desconexión</h2>
          <button type="button" className="modal-cerrar" onClick={onCerrar}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: 12 }}>
            Se alerta cuando un usuario lleva <strong>{HORAS_LIMITE} horas o más</strong> sin actividad (GPS/sesión).
          </p>
          {notifs.length === 0 ? (
            <p className="empty-state">No hay notificaciones</p>
          ) : (
            notifs.map(n => (
              <div
                key={n.id}
                className="notif-item"
                style={{ opacity: n.leida ? 0.65 : 1 }}
              >
                <strong>{n.nombre}</strong>
                <p style={{ fontSize: '0.82rem', color: '#4b5563' }}>
                  CC {n.cedula} · {n.cargo || 'Sin cargo'}
                </p>
                <p style={{ fontSize: '0.9rem', marginTop: 6 }}>{n.detalle}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6 }}>
                  Alerta generada: {formatFecha(n.creadaEn)}
                </p>
                {!n.leida && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.78rem', marginTop: 8 }}
                    onClick={() => {
                      marcarNotifLeida(n.id)
                      setNotifs(listarNotifsDesconexion())
                    }}
                  >
                    Marcar como leída
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export { noLeidasNotifs, HORAS_LIMITE }
export default NotificacionesMaster
