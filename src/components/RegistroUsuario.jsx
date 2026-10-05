import { useState, useRef } from 'react'

const USER_KEY = 'usuario_operativo_v1'

export function cargarUsuarioGuardado() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function guardarUsuario(usuario) {
  localStorage.setItem(USER_KEY, JSON.stringify(usuario))
}

export function borrarUsuarioGuardado() {
  localStorage.removeItem(USER_KEY)
}

function RegistroUsuario({ usuario, onRegistrado, onCerrarSesion }) {
  const [nombre, setNombre] = useState('')
  const [cargo, setCargo] = useState('')
  const [foto, setFoto] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('La foto no debe superar 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setFoto(ev.target.result)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleRegistro = (e) => {
    e.preventDefault()
    if (!nombre.trim()) {
      setError('Escribe el nombre del usuario')
      return
    }
    if (!foto) {
      setError('Toma o sube una foto del usuario')
      return
    }
    const nuevo = {
      id: crypto.randomUUID?.() || String(Date.now()),
      nombre: nombre.trim(),
      cargo: cargo.trim() || '',
      foto,
      registradoEn: new Date().toISOString()
    }
    guardarUsuario(nuevo)
    onRegistrado(nuevo)
  }

  if (usuario) {
    return (
      <div className="card usuario-card">
        <h2>Usuario en seguimiento</h2>
        <div className="usuario-activo">
          <img src={usuario.foto} alt={usuario.nombre} className="usuario-foto" />
          <div>
            <strong>{usuario.nombre}</strong>
            {usuario.cargo && <p>{usuario.cargo}</p>}
            <p className="usuario-estado">● GPS en tiempo real activo</p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onCerrarSesion}>
          Cerrar sesión de usuario
        </button>
      </div>
    )
  }

  return (
    <div className="card usuario-card">
      <h2>Registro de usuario (foto + GPS)</h2>
      <p className="usuario-hint">
        Registra al operador con foto. Luego el mapa seguirá su ubicación en tiempo real.
      </p>
      <form onSubmit={handleRegistro}>
        <div className="form-group">
          <label>Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del usuario"
            required
          />
        </div>
        <div className="form-group">
          <label>Cargo (opcional)</label>
          <input
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ej: Guardia, Supervisor..."
          />
        </div>
        <div className="form-group">
          <label>Foto del usuario</label>
          <div className="foto-opciones">
            <label className="btn btn-secondary foto-btn">
              📁 Subir foto
              <input type="file" accept="image/*" onChange={handleFoto} hidden />
            </label>
            <label className="btn btn-primary foto-btn">
              📷 Tomar foto
              <input type="file" accept="image/*" capture="user" onChange={handleFoto} hidden />
            </label>
          </div>
          {foto && (
            <img src={foto} alt="Vista previa" className="usuario-foto-preview" />
          )}
        </div>
        {error && <p className="master-error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Registrar y activar GPS
        </button>
      </form>
    </div>
  )
}

export default RegistroUsuario
