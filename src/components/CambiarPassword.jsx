import { useState } from 'react'
import { cambiarPassword } from '../lib/usuarios'

function CambiarPassword({ sesion, abierto, onCerrar }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  if (!abierto) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (nueva !== confirm) {
      setError('La confirmación no coincide')
      return
    }
    try {
      await cambiarPassword({
        userId: sesion.id,
        passwordNueva: nueva,
        passwordActual: actual,
        actor: sesion
      })
      setOk('Contraseña actualizada')
      setActual('')
      setNueva('')
      setConfirm('')
    } catch (err) {
      setError(err.message || 'No se pudo cambiar')
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-contenido" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cambiar mi contraseña</h2>
          <button type="button" className="modal-cerrar" onClick={onCerrar}>×</button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Contraseña actual</label>
            <input type="password" value={actual} onChange={(e) => setActual(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Nueva contraseña</label>
            <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={8} />
            <small style={{ color: '#4b5563', fontSize: '0.75rem' }}>Mínimo 8 caracteres, letras y números</small>
          </div>
          <div className="form-group">
            <label>Confirmar nueva contraseña</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="master-error">{error}</p>}
          {ok && <p style={{ color: '#16a34a', fontSize: '0.85rem' }}>{ok}</p>}
          <button type="submit" className="btn btn-primary">Guardar contraseña</button>
        </form>
      </div>
    </div>
  )
}

export default CambiarPassword
