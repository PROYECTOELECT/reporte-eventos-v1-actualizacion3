import { useState } from 'react'

// Cambia esta contraseña por la que quieras usar
const MASTER_PASSWORD = 'admin2027.*'

function AccesoMaster({ esMaster, onLogin, onLogout }) {
  const [mostrar, setMostrar] = useState(false)
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (clave === MASTER_PASSWORD) {
      onLogin()
      setClave('')
      setError('')
      setMostrar(false)
    } else {
      setError('Contraseña incorrecta')
    }
  }

  if (esMaster) {
    return (
      <div className="master-bar master-activo">
        <span>🔑 Modo master activo</span>
        <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }} onClick={onLogout}>
          Cerrar sesión master
        </button>
      </div>
    )
  }

  return (
    <div className="master-bar">
      {!mostrar ? (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
          onClick={() => setMostrar(true)}
        >
          Acceso master
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="master-form">
          <input
            type="password"
            value={clave}
            onChange={(e) => { setClave(e.target.value); setError('') }}
            placeholder="Contraseña master"
            autoFocus
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px', width: 'auto' }}>
            Entrar
          </button>
          <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px', width: 'auto' }} onClick={() => { setMostrar(false); setClave(''); setError('') }}>
            Cancelar
          </button>
          {error && <span className="master-error">{error}</span>}
        </form>
      )}
    </div>
  )
}

export default AccesoMaster
export { MASTER_PASSWORD }
