import { useEffect, useState } from 'react'
import { login, listarUsuarios, crearUsuario, listarMasters, sincronizarUsuariosNube, hayUsuariosEnNube } from '../lib/usuarios'

function CampoClave({ value, onChange, required, minLength }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="clave-fila">
      <input
        type={ver ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        autoComplete="current-password"
      />
      <button
        type="button"
        className="clave-ojo"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Ocultar contraseña' : 'Ver contraseña'}
      >
        {ver ? '🙈' : '👁'}
      </button>
    </div>
  )
}

function Login({ onLogin }) {
  const [modo, setModo] = useState('login') // login | registro
  const [cedula, setCedula] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [reg, setReg] = useState({
    nombre: '',
    cedula: '',
    cargo: '',
    password: '',
    foto: null,
    masterNombre: ''
  })

  const [esPrimerUsuario, setEsPrimerUsuario] = useState(false)
  const [listoNube, setListoNube] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const hay = await hayUsuariosEnNube()
        await sincronizarUsuariosNube()
        if (!vivo) return
        const local = listarUsuarios().length === 0
        setEsPrimerUsuario(!hay && local)
      } catch {
        if (vivo) setEsPrimerUsuario(listarUsuarios().length === 0)
      } finally {
        if (vivo) setListoNube(true)
      }
    })()
    return () => { vivo = false }
  }, [])

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('La foto no debe superar 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setReg(prev => ({ ...prev, foto: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const sesion = await login(cedula, password)
      onLogin(sesion)
    } catch (err) {
      const msg = String(err.message || '')
      setError(/quota|exceeded|almacenamiento/i.test(msg)
        ? 'El navegador está lleno (fotos guardadas). Borra datos de este sitio e intenta de nuevo.'
        : (msg || 'Error al iniciar sesión'))
    }
  }

  const handleRegistro = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    try {
      if (!reg.nombre.trim() || !reg.cedula.trim() || !reg.password || !reg.foto) {
        setError('Completa nombre, cédula, contraseña y foto')
        return
      }
      await crearUsuario({
        nombre: reg.nombre,
        cedula: reg.cedula,
        cargo: reg.cargo,
        foto: reg.foto,
        password: reg.password,
        rol: esPrimerUsuario ? 'admin' : 'general',
        activo: esPrimerUsuario,
        masterNombre: reg.masterNombre
      })
      if (esPrimerUsuario) {
        const sesion = await login(reg.cedula, reg.password)
        onLogin(sesion)
      } else {
        setOk('Registro enviado. Un administrador o master debe habilitar tu cuenta para ingresar.')
        setModo('login')
        setCedula(reg.cedula)
        return
      }
    } catch (err) {
      setError(err.message || 'Error al registrarse')
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card login-card-institucional">
        <div className="login-brand">
          <div className="login-brand-bar" />
          <p className="login-brand-kicker">Plataforma institucional</p>
          <h1>Sistema de Reportes de Eventos</h1>
          <p className="login-brand-sub">Seguridad perimetral · Acceso restringido</p>
        </div>
        <h2 className="login-form-title">{modo === 'login' ? 'Ingreso de usuarios' : 'Registro de usuario'}</h2>
        <p className="login-form-lead">
          {modo === 'login'
            ? 'Identifíquese con cédula y contraseña. Solo personal autorizado.'
            : esPrimerUsuario
              ? 'Primer usuario: se creará como Administrador general de la plataforma.'
              : 'La cuenta quedará pendiente hasta habilitación de un administrador o master.'}
        </p>

        {modo === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Cédula</label>
              <input value={cedula} onChange={(e) => setCedula(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <CampoClave value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="master-error">{error}</p>}
            <button type="submit" className="btn btn-primary">Ingresar</button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 10 }}
              onClick={() => { setModo('registro'); setError('') }}
            >
              Crear cuenta nueva
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegistro}>
            <div className="form-group">
              <label>Nombre completo</label>
              <input value={reg.nombre} onChange={(e) => setReg({ ...reg, nombre: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Cédula</label>
              <input value={reg.cedula} onChange={(e) => setReg({ ...reg, cedula: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Cargo</label>
              <input value={reg.cargo} onChange={(e) => setReg({ ...reg, cargo: e.target.value })} placeholder="Ej: Guardia, Supervisor..." />
            </div>
            {!esPrimerUsuario && (
              <div className="form-group">
                <label>Usuario master al que se vincula la cuenta</label>
                <select
                  value={reg.masterNombre}
                  onChange={(e) => setReg({ ...reg, masterNombre: e.target.value })}
                  required
                >
                  <option value="">Seleccione el master (nombre exacto)</option>
                  {listarMasters().map((m) => (
                    <option key={m.id} value={m.nombre}>{m.nombre}</option>
                  ))}
                </select>
                <small style={{ color: '#4b5563', fontSize: '0.75rem' }}>
                  Debes conocer el nombre del master. Ese master habilitará tu acceso.
                </small>
              </div>
            )}
            <div className="form-group">
              <label>Contraseña</label>
              <CampoClave value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} required minLength={8} />
              <small style={{ color: '#4b5563', fontSize: '0.78rem' }}>Mínimo 8 caracteres, con letras y números</small>
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
              <small style={{ color: '#4b5563', fontSize: '0.78rem' }}>
                Opción 1: subir archivo · Opción 2: tomar foto con la cámara (celular o computador)
              </small>
              {reg.foto && (
                <div style={{ marginTop: 10 }}>
                  <img src={reg.foto} alt="preview" className="usuario-foto-preview" />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', marginTop: 8 }}
                    onClick={() => setReg(prev => ({ ...prev, foto: null }))}
                  >
                    Quitar foto
                  </button>
                </div>
              )}
            </div>
            {error && <p className="master-error">{error}</p>}
            {ok && <p style={{ color: '#16a34a' }}>{ok}</p>}
            <button type="submit" className="btn btn-primary">
              {esPrimerUsuario ? 'Registrarme como administrador' : 'Solicitar registro'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: 10 }}
              onClick={() => { setModo('login'); setError('') }}
            >
              Ya tengo cuenta — Ingresar
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
