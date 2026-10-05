import { useState } from 'react'
import { actualizarUsuario } from '../lib/usuarios'
import { supabase } from '../lib/supabase'

function comprimir(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 480
      const escala = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * escala))
      canvas.height = Math.max(1, Math.round(img.height * escala))
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la foto'))
    }
    img.src = url
  })
}

function CambiarFoto({ sesion, onCerrar, onActualizado }) {
  const [preview, setPreview] = useState(sesion?.foto || '')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const leerFoto = async (file) => {
    if (!file) return
    setError('')
    try {
      const data = await comprimir(file)
      setPreview(data)
    } catch (err) {
      setError(err.message || 'No se pudo leer la foto')
    }
  }

  const guardar = async () => {
    setError('')
    setOk('')
    if (!preview) {
      setError('Selecciona o toma una foto')
      return
    }
    setGuardando(true)
    try {
      try {
        actualizarUsuario(sesion.id, { foto: preview })
      } catch (_) {}
      const { error: cloudError } = await supabase.from('usuarios_app').update({ foto: preview }).eq('id', sesion.id)
      if (cloudError) throw new Error(cloudError.message)
      const raw = sessionStorage.getItem('sesion_usuario_v1')
      const s = raw ? JSON.parse(raw) : { ...sesion }
      s.foto = preview
      sessionStorage.setItem('sesion_usuario_v1', JSON.stringify(s))
      setOk('Foto actualizada')
      onActualizado?.({ ...sesion, ...s, foto: preview })
    } catch (err) {
      setError(err.message || 'No se pudo guardar la foto')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
        <h3>Cambiar foto de perfil</h3>
        {preview && <img src={preview} alt="" className="usuario-foto-preview" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />}
        <div className="foto-opciones">
          <label className="btn btn-secondary foto-btn">
            Subir foto
            <input type="file" accept="image/*" hidden onChange={(e) => leerFoto(e.target.files?.[0])} />
          </label>
          <label className="btn btn-primary foto-btn">
            Tomar foto
            <input type="file" accept="image/*" capture="user" hidden onChange={(e) => leerFoto(e.target.files?.[0])} />
          </label>
        </div>
        {error && <p className="master-error">{error}</p>}
        {ok && <p style={{ color: '#16a34a' }}>{ok}</p>}
        <div className="filtros-botones" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-primary" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Aplicar foto'}</button>
          <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

export default CambiarFoto
