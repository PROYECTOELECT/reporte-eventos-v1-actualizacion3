import { useState, useEffect, useMemo, useRef } from 'react'
import { listarUsuarios, contactosBuzon, sincronizarUsuariosNube } from '../lib/usuarios'
import {
  enviarMensaje,
  conversacion,
  marcarLeidos,
  noLeidos,
  mensajesRecibidos,
  listarMensajes,
  sincronizarMensajesNube,
  borrarMensajeParaMi,
  borrarMensajeAdmin
} from '../lib/mensajes'

function formatFecha(iso) {
  try {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function BuzonMensajes({ sesion, abierto, onCerrar, destinatarioInicial, onMensajeRespondido, esAdmin = false }) {
  const [usuarios, setUsuarios] = useState([])
  const [destinatarioId, setDestinatarioId] = useState('')
  const [texto, setTexto] = useState('')
  const [tick, setTick] = useState(0)
  const [error, setError] = useState('')
  const listaRef = useRef(null)

  const recargar = () => {
    setUsuarios(contactosBuzon(sesion))
    setTick(t => t + 1)
    if (typeof onMensajeRespondido === 'function') onMensajeRespondido()
  }

  useEffect(() => {
    if (!abierto) return
    let vivo = true
    const pull = async () => {
      await sincronizarUsuariosNube().catch(() => {})
      await sincronizarMensajesNube().catch(() => {})
      if (!vivo) return
      setUsuarios(contactosBuzon(sesion))
      setTick(t => t + 1)
    }
    pull()
    const id = setInterval(pull, 4000)
    return () => { vivo = false; clearInterval(id) }
  }, [abierto, sesion?.id])

  useEffect(() => {
    if (!abierto) return
    recargar()
    if (destinatarioInicial) setDestinatarioId(destinatarioInicial)

    // Actualizar conversación cada 2s para recibir mensajes nuevos
    const id = setInterval(() => {
      setUsuarios(contactosBuzon(sesion))
      setTick(t => t + 1)
      if (typeof onMensajeRespondido === 'function') onMensajeRespondido()
    }, 2000)

    // Si otra pestaña escribe en localStorage
    const onStorage = (e) => {
      if (e.key === 'mensajes_sistema_v1' || e.key === 'usuarios_sistema_v1') {
        recargar()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(id)
      window.removeEventListener('storage', onStorage)
    }
  }, [abierto, sesion.id, destinatarioInicial])

  const chat = useMemo(() => {
    if (!destinatarioId) return []
    return conversacion(sesion.id, destinatarioId)
  }, [sesion.id, destinatarioId, tick])

  useEffect(() => {
    if (!abierto || !destinatarioId) return
    marcarLeidos(sesion.id, destinatarioId).then(() => {
      setTick(t => t + 1)
      if (typeof onMensajeRespondido === 'function') onMensajeRespondido()
    })
  }, [abierto, destinatarioId, sesion?.id])

  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight
  }, [chat.length, destinatarioId])

  if (!abierto) return null

  const destinatario = usuarios.find(u => u.id === destinatarioId)
  const recibidos = mensajesRecibidos(sesion.id)
  const totalNoLeidos = noLeidos(sesion.id)


  const exportarConversacion = () => {
    if (!destinatarioId) {
      setError('Selecciona una conversación')
      return
    }
    const dest = listarUsuarios().find(u => u.id === destinatarioId) || destinatario
    const msgs = conversacion(sesion.id, destinatarioId)
    if (msgs.length === 0) {
      setError('No hay mensajes para exportar')
      return
    }

    const lineas = []
    lineas.push('========================================')
    lineas.push('  CONVERSACIÓN - BUZÓN DE MENSAJES')
    lineas.push('========================================')
    lineas.push('')
    lineas.push(`Usuario A: ${sesion.nombre}`)
    lineas.push(`  Cédula: ${sesion.cedula || 'N/D'}`)
    lineas.push(`  Cargo: ${sesion.cargo || 'N/D'}`)
    lineas.push(`  Foto: ${sesion.foto ? 'Sí (registrada en el sistema)' : 'No'}`)
    lineas.push('')
    lineas.push(`Usuario B: ${dest?.nombre || 'Usuario'}`)
    lineas.push(`  Cédula: ${dest?.cedula || 'N/D'}`)
    lineas.push(`  Cargo: ${dest?.cargo || 'N/D'}`)
    lineas.push(`  Foto: ${dest?.foto ? 'Sí (registrada en el sistema)' : 'No'}`)
    lineas.push('')
    lineas.push(`Exportado: ${new Date().toLocaleString('es-CO')}`)
    lineas.push(`Total mensajes: ${msgs.length}`)
    lineas.push('')
    lineas.push('---------- MENSAJES ----------')
    lineas.push('')

    msgs.forEach((m, i) => {
      const fecha = formatFecha(m.fecha)
      lineas.push(`[${i + 1}] ${fecha}`)
      lineas.push(`De: ${m.fromNombre}`)
      lineas.push(`Para: ${m.toNombre || (String(m.toId) === String(sesion.id) ? sesion.nombre : dest?.nombre || '')}`)
      lineas.push(`Texto: ${m.texto}`)
      lineas.push(`Estado: ${m.leido ? 'Leído / atendido' : 'Pendiente'}`)
      lineas.push('----------------------------------------')
      lineas.push('')
    })

    lineas.push('Fin de la conversación')
    lineas.push('========================================')

    const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const nombreA = (sesion.nombre || 'usuario').replace(/\s+/g, '_')
    const nombreB = (dest?.nombre || 'chat').replace(/\s+/g, '_')
    a.href = url
    a.download = `conversacion_${nombreA}_${nombreB}_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const enviarTexto = async (valor) => {
    const limpio = String(valor || '').trim()
    if (!destinatarioId) {
      setError('Selecciona un destinatario')
      return
    }
    if (!limpio) return
    const dest = listarUsuarios().find(u => u.id === destinatarioId)
    await enviarMensaje({
      fromId: sesion.id,
      fromNombre: sesion.nombre,
      toId: destinatarioId,
      toNombre: dest?.nombre || destinatario?.nombre || '',
      texto: limpio
    })
    await marcarLeidos(sesion.id, destinatarioId)
    setTexto('')
    setTick(t => t + 1)
    if (typeof onMensajeRespondido === 'function') onMensajeRespondido()
  }

  const handleEnviar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await enviarTexto(texto)
    } catch (err) {
      setError(err.message || 'No se pudo enviar')
    }
  }

  const marcarRecibido = async () => {
    setError('')
    try {
      await marcarLeidos(sesion.id, destinatarioId)
      await enviarTexto('Recibido')
    } catch (err) {
      setError(err.message || 'No se pudo marcar recibido')
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-contenido buzon-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📨 Buzón de mensajes · v4</h2>
          <button type="button" className="modal-cerrar" onClick={onCerrar}>×</button>
        </div>
        <div className="modal-body buzon-body">
          <div className="buzon-sidebar">
            <p className="buzon-label">Usuarios</p>
            {usuarios.length === 0 && (
              <p className="empty-state" style={{ padding: 8 }}>
                No hay otros usuarios. Registra otra cuenta para probar mensajes.
              </p>
            )}
            {usuarios.map(u => {
              const unread = mensajesRecibidos(sesion.id).filter(m => String(m.fromId) === String(u.id) && !m.leido).length
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`buzon-user ${String(destinatarioId) === String(u.id) ? 'activo' : ''}`}
                  onClick={() => {
                    setDestinatarioId(u.id)
                    marcarLeidos(sesion.id, u.id)
                    setTick(t => t + 1)
                    if (typeof onMensajeRespondido === 'function') onMensajeRespondido()
                  }}
                >
                  <img src={u.foto} alt="" className="usuario-foto" style={{ width: 36, height: 36 }} />
                  <span>
                    {u.nombre}
                    {unread > 0 && <em className="badge-msg">{unread}</em>}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="buzon-chat">
            {!destinatarioId ? (
              <p className="empty-state">Selecciona un usuario para ver o enviar mensajes</p>
            ) : (
              <>
                <div className="buzon-chat-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    {destinatario?.foto && (
                      <img src={destinatario.foto} alt="" className="usuario-foto" style={{ width: 32, height: 32 }} />
                    )}
                    <strong>{destinatario?.nombre || 'Usuario'}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 10px', fontSize: '0.78rem' }}
                    onClick={exportarConversacion}
                    title="Exportar conversación en TXT"
                  >
                    📄 Exportar TXT
                  </button>
                </div>
                <div className="buzon-mensajes-lista" ref={listaRef}>
                  {chat.length === 0 && <p className="empty-state">Sin mensajes aún. Escribe el primero.</p>}
                  {chat.map(m => {
                    const esPropio = String(m.fromId) === String(sesion.id)
                    const pendiente = !esPropio && !m.leido
                    return (
                      <div
                        key={m.id}
                        className={`burbuja ${esPropio ? 'propia' : 'ajena'}${pendiente ? ' no-leido' : ''}`}
                      >
                        <p>{m.texto}</p>
                        <small>
                          {formatFecha(m.fecha)} · {m.fromNombre}
                          {esPropio ? (m.leido ? ' · Leído' : ' · Enviado') : (pendiente ? ' · No leído' : ' · Leído')}
                        </small>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm('¿Borrar este mensaje solo de tu buzón?')) return
                            await borrarMensajeParaMi(m.id, sesion.id)
                            setTick(t => t + 1)
                            if (typeof onMensajeRespondido === 'function') onMensajeRespondido()
                          }}
                          style={{ border: 0, background: 'transparent', color: '#b91c1c', fontSize: 12, cursor: 'pointer', padding: 0 }}
                        >
                          Borrar de mi buzón
                        </button>
                        {esAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm('El administrador borrará este mensaje para todos los usuarios. ¿Continuar?')) return
                              try {
                                await borrarMensajeAdmin(m.id)
                                setTick(t => t + 1)
                                if (typeof onMensajeRespondido === 'function') onMensajeRespondido()
                              } catch (err) {
                                setError(err.message || 'No se pudo borrar')
                              }
                            }}
                            style={{ border: 0, background: 'transparent', color: '#7f1d1d', fontSize: 12, cursor: 'pointer', padding: 0, marginLeft: 8 }}
                          >
                            Borrar para todos
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', margin: '8px 0', padding: '8px', background: '#f8fafc', borderRadius: 10 }}>
                  <strong style={{ fontSize: 12 }}>Responder:</strong>
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 10px' }} onClick={marcarRecibido}>Recibido</button>
                  {['👍', '✅', '👀', '🙏', '⚠️', '📍', '😀', '🔥'].map((emo) => (
                    <button key={emo} type="button" className="btn btn-secondary" style={{ width: 40, padding: '6px 0', fontSize: 18 }} onClick={() => enviarTexto(emo).catch((err) => setError(err.message))}>{emo}</button>
                  ))}
                </div>
                <form className="buzon-enviar" onSubmit={handleEnviar}>
                  <input
                    type="text"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escribe un mensaje..."
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>
                    Enviar
                  </button>
                </form>
                {error && <p className="master-error">{error}</p>}
              </>
            )}
          </div>
        </div>
        <div className="buzon-inbox-resumen">
          <strong>Recibidos: {recibidos.length}</strong>
          <span> · No leídos / sin responder: {totalNoLeidos}</span>
          <span> · Total en sistema: {listarMensajes().length}</span>
        </div>
      </div>
    </div>
  )
}

export default BuzonMensajes
