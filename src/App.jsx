import { useState, useEffect, useMemo, useRef } from 'react'
import html2canvas from 'html2canvas'
import FormularioReporte from './components/FormularioReporte'
import MapaReportes from './components/MapaReportes'
import ListaReportes from './components/ListaReportes'
import DetalleReporte from './components/DetalleReporte'
import Login from './components/Login'
import GestionUsuarios from './components/GestionUsuarios'
import CambiarPassword from './components/CambiarPassword'
import CambiarFoto from './components/CambiarFoto'
import PanelTemaAdmin from './components/PanelTemaAdmin'
import ModuloInformativo from './components/ModuloInformativo'
import ModuloSupervision from './components/ModuloSupervision'
import ModuloAsistencia from './components/ModuloAsistencia'
import ModuloPersonalIndicadores from './components/ModuloPersonalIndicadores'
import BuzonMensajes from './components/BuzonMensajes'
import NotificacionesMaster, { noLeidasNotifs } from './components/NotificacionesMaster'
import { generarPDF } from './utils/generarPDF'
import { generarInformeGeneral } from './utils/generarInformeGeneral'
import { exportarExcel } from './utils/exportarExcel'
import { armarComparativo } from './utils/comparativoIndicadores'
import PanelComparativo from './components/PanelComparativo'
import PanelInformeSemanal from './components/PanelInformeSemanal'
import { supabase } from './lib/supabase'
import { sincronizarTemaNube } from './lib/tema'
import { sesionActual, logout, refrescarSesionDesdeStorage, listarUsuarios, actualizarUltimaActividad, tocarSesion, actualizarUsuario, rolDe, sincronizarUsuariosNube, sincronizarPosicionesNube, permisosDe, guardarPosicionUsuario, posicionViva } from './lib/usuarios'
import { reporteVisiblePara, enriquecerReporte, reporteEsDeUsuario } from './lib/vinculosReportes'
import { noLeidos, sincronizarMensajesNube } from './lib/mensajes'

const TITLE_KEY = 'titulo_informe_v1'
const LOGO_KEY = 'logo_marca_v1'
const DEFAULT_TITLE = 'SEGURIDAD PERIMETRAL Y CORREDORES SEGUROS'

function normalizar(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    hora: row.hora,
    reportadoPor: row.reportado_por,
    cargo: row.cargo || '',
    ubicacionTexto: row.ubicacion_texto,
    tipo: row.tipo,
    novedad: row.novedad,
    procedimiento: row.procedimiento || '',
    lat: row.lat,
    lng: row.lng,
    imagenes: row.imagenes || [],
    creadoEn: row.created_at
  }
}

function logoAdminGuardado() {
  return localStorage.getItem(LOGO_KEY) || null
}

function logoSegunRol(sesion) {
  if (!sesion) return null
  const rol = sesion.rol || (sesion.esAdmin ? 'admin' : sesion.esMaster ? 'master' : 'general')
  const usuarios = listarUsuarios()
  const yo = usuarios.find(u => u.id === sesion.id) || sesion
  if (rol === 'admin') return logoAdminGuardado()
  if (rol === 'master') {
    if (!yo || !yo.logoPropio) return null
    return yo.logoMarca || null
  }
  const masterId = yo.masterId || sesion.masterId
  const masterNombre = yo.masterNombre || sesion.masterNombre
  const master = usuarios.find(u => String(u.id) === String(masterId) && rolDe(u) === 'master')
    || usuarios.find(u => (u.nombre || '').trim().toLowerCase() === String(masterNombre || '').trim().toLowerCase() && rolDe(u) === 'master')
  if (!master || !master.logoPropio || !master.logoMarca) return null
  return master.logoMarca
}

function App() {
  const [sesion, setSesion] = useState(() => sesionActual())
  const [reportes, setReportes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(null)
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null)
  const [detalleAbierto, setDetalleAbierto] = useState(null)
  const [tituloInforme, setTituloInforme] = useState(DEFAULT_TITLE)
  const [logoMarca, setLogoMarca] = useState(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [busquedaTipo, setBusquedaTipo] = useState('')
  const [tipoExport, setTipoExport] = useState('')
  const [tipoExportOtro, setTipoExportOtro] = useState('')
  const [mapaFechaInicio, setMapaFechaInicio] = useState('')
  const [mapaFechaFin, setMapaFechaFin] = useState('')
  const [mapaTipoFiltro, setMapaTipoFiltro] = useState('')
  const [mapaUsuarioId, setMapaUsuarioId] = useState('')
  const [verComparativo, setVerComparativo] = useState(false)
  const [usuarioExport, setUsuarioExport] = useState('')
  const [incluirMapaPDF, setIncluirMapaPDF] = useState(false)
  const [exportandoMapa, setExportandoMapa] = useState(false)
  const [posicionUsuario, setPosicionUsuario] = useState(null)
  const [tickUsuarios, setTickUsuarios] = useState(0)
  const [moduloActivo, setModuloActivo] = useState('')
  const [buzonAbierto, setBuzonAbierto] = useState(false)
  const [notifsAbiertas, setNotifsAbiertas] = useState(false)
  const [msgBadge, setMsgBadge] = useState(0)
  const [notifBadge, setNotifBadge] = useState(0)
  const [passAbierta, setPassAbierta] = useState(false)
  const [fotoAbierta, setFotoAbierta] = useState(false)
  const [pendientesCount, setPendientesCount] = useState(0)
  const mapaRef = useRef(null)

  const rol = sesion?.rol || (sesion?.esAdmin ? 'admin' : sesion?.esMaster ? 'master' : 'general')
  const esAdmin = rol === 'admin'
  const esMaster = rol === 'master' || esAdmin
  const esGeneral = rol === 'general'
  const puedeGestionarUsuarios = esAdmin || rol === 'master'
  const perms = permisosDe(listarUsuarios().find(u => u.id === sesion?.id) || sesion)
  const puedeCrearGenerales = esAdmin || (rol === 'master' && perms.crearGenerales !== false)
  const puedePermisosGenerales = esAdmin || (rol === 'master' && perms.permisosGenerales !== false)
  const puedeBorrarReportes = esAdmin
  const puedeExportar = esAdmin || rol === 'master' || perms.exportar === true
  const puedeVerMapa = esAdmin || perms.verMapa !== false || rol === 'master'
  const puedeVerHistorial = esAdmin || perms.verHistorial !== false || rol === 'master'
  const puedeVerInformativo = esAdmin || perms.informativo !== false || rol === 'master'
  const puedeSupervision = esAdmin || rol === 'master' || perms.supervision === true
  const puedeCambiarFoto = esAdmin || rol === 'master' || perms.cambiarFoto === true
  const puedePersonalIndicadores = esAdmin || perms.personalIndicadores === true
  const puedeComparativo = esAdmin || (rol === 'master' && perms.comparativoMapa === true)
  const puedeReportar = esAdmin || perms.reportar !== false || rol === 'master'

  useEffect(() => {
    const iniciar = async () => {
    const s0 = sesionActual()
    const tituloGuardado = (s0 && (listarUsuarios().find(u => u.id === s0.id)?.tituloInforme || localStorage.getItem(TITLE_KEY + '_' + s0.id))) || localStorage.getItem(TITLE_KEY)
    if (tituloGuardado) setTituloInforme(tituloGuardado)
    await sincronizarUsuariosNube().catch(() => {})
    const s = refrescarSesionDesdeStorage()
    if (s && (s.rol === 'master' || (s.esMaster && !s.esAdmin && s.rol !== 'admin'))) {
      const yo = listarUsuarios().find(u => u.id === s.id)
      if (yo && yo.logoMarca && !yo.logoPropio) {
        actualizarUsuario(s.id, { logoMarca: null, logoPropio: false })
      }
    }
    setSesion(s)
    setLogoMarca(logoSegunRol(refrescarSesionDesdeStorage() || s))
    if (s) cargarReportes()
    else setCargando(false)
    }
    iniciar()
  }, [])

  useEffect(() => {
    if (!sesion?.id) return
    localStorage.setItem(TITLE_KEY + '_' + sesion.id, tituloInforme)
    const yo = listarUsuarios().find(u => u.id === sesion.id)
    if (yo && (yo.tituloInforme || '') !== tituloInforme) {
      actualizarUsuario(sesion.id, { tituloInforme })
    }
  }, [tituloInforme, sesion?.id])

  useEffect(() => {
    setLogoMarca(logoSegunRol(sesion))
    if (sesion?.id) {
      const yo = listarUsuarios().find(u => u.id === sesion.id)
      let titu = yo?.tituloInforme || localStorage.getItem(TITLE_KEY + '_' + sesion.id)
      if ((sesion.rol === 'general' || (!sesion.esMaster && !sesion.esAdmin)) && (yo?.masterId || sesion.masterId)) {
        const master = listarUsuarios().find(u => u.id === (yo?.masterId || sesion.masterId))
        if (master?.tituloInforme) titu = master.tituloInforme
      }
      setTituloInforme(titu || DEFAULT_TITLE)
    }
  }, [sesion?.id])

  // Vigilancia de sesión: caducidad e inactividad
  useEffect(() => {
    if (!sesion) return
    const tick = () => {
      const viva = sesionActual()
      if (!viva) {
        logout()
        setSesion(null)
        alert('Sesión cerrada por seguridad (tiempo o inactividad).')
        return
      }
      tocarSesion()
    }
    const id = setInterval(tick, 30000)
    const onActividad = () => tocarSesion()
    window.addEventListener('click', onActividad)
    window.addEventListener('keydown', onActividad)
    return () => {
      clearInterval(id)
      window.removeEventListener('click', onActividad)
      window.removeEventListener('keydown', onActividad)
    }
  }, [sesion?.id])


  useEffect(() => {
    if (!sesion) return
    const refreshBadges = () => {
      sincronizarMensajesNube().then(() => setMsgBadge(noLeidos(sesion.id))).catch(() => setMsgBadge(noLeidos(sesion.id)))
      if (sesion.esMaster || sesion.esAdmin || sesion.rol === 'admin' || sesion.rol === 'master') {
        setNotifBadge(noLeidasNotifs())
        setPendientesCount(listarUsuarios().filter(u => u.activo === false).length)
      }
    }
    refreshBadges()
    const id = setInterval(refreshBadges, 3000)
    const onMsg = () => setMsgBadge(noLeidos(sesion.id))
    window.addEventListener('mensajes-actualizados', onMsg)
    const canal = supabase
      .channel('buzon-vivo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_app' }, () => {
        sincronizarMensajesNube().then(() => setMsgBadge(noLeidos(sesion.id))).catch(() => {})
      })
      .subscribe()
    return () => {
      clearInterval(id)
      window.removeEventListener('mensajes-actualizados', onMsg)
      supabase.removeChannel(canal)
    }
  }, [sesion?.id, sesion?.esMaster, buzonAbierto, notifsAbiertas])


  // GPS en tiempo real solo si el usuario tiene tracking activo
  useEffect(() => {
    if (!sesion) {
      setPosicionUsuario(null)
      return
    }
    if (!navigator.geolocation) return

    let cancelled = false
    let ultimoEnvio = 0
    const actualizar = (pos) => {
      if (cancelled) return
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setPosicionUsuario({
        lat,
        lng,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp
      })
      if (sesion?.id) {
        actualizarUltimaActividad(sesion.id)
        const ahora = Date.now()
        if (ahora - ultimoEnvio > 2000) {
          ultimoEnvio = ahora
          guardarPosicionUsuario(sesion.id, lat, lng)
        }
      }
    }

    const watchId = navigator.geolocation.watchPosition(
      actualizar,
      (err) => console.warn('GPS:', err.message),
      { enableHighAccuracy: true, maximumAge: 8000, timeout: 20000 }
    )

    return () => {
      cancelled = true
      navigator.geolocation.clearWatch(watchId)
    }
  }, [sesion?.id])

  useEffect(() => {
    if (!sesion) return
    sincronizarPosicionesNube().then(() => setTickUsuarios(n => n + 1)).catch(() => {})
    const id = setInterval(() => {
      sincronizarPosicionesNube().then(() => setTickUsuarios(n => n + 1)).catch(() => {})
      sincronizarTemaNube().catch(() => {})
    }, 5000)
    const canal = supabase
      .channel('gps-usuarios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios_app' }, () => {
        sincronizarPosicionesNube().then(() => {
          setTickUsuarios(n => n + 1)
          const s = refrescarSesionDesdeStorage()
          if (s) setSesion(s)
        }).catch(() => {})
      })
      .subscribe()
    return () => {
      clearInterval(id)
      supabase.removeChannel(canal)
    }
  }, [sesion?.id])

  useEffect(() => {
    if (!sesion) return
    const canal = supabase
      .channel('reportes-vivo-' + sesion.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, () => {
        cargarReportes()
      })
      .subscribe()
    const id = setInterval(() => { if (verComparativo) cargarReportes() }, 12000)
    return () => {
      clearInterval(id)
      supabase.removeChannel(canal)
    }
  }, [sesion?.id, verComparativo])

  const cargarReportes = async () => {
    setCargando(true)
    const intentar = async () => {
      const { data, error } = await supabase
        .from('reportes')
        .select('id,fecha,hora,reportado_por,cargo,ubicacion_texto,tipo,novedad,procedimiento,lat,lng,imagenes,created_at')
        .order('created_at', { ascending: false })
        .limit(800)
      if (error) throw error
      return data
    }
    try {
      let data
      try {
        data = await intentar()
      } catch (err) {
        await new Promise((r) => setTimeout(r, 1200))
        data = await intentar()
      }
      const lista = (data || []).map(row => enriquecerReporte(normalizar(row), sesion))
      setReportes(lista)
      try { localStorage.setItem('reportes_cache_v1', JSON.stringify(lista.slice(0, 200).map((r) => ({ ...r, imagenes: [] })))) } catch (_) {}
    } catch (err) {
      console.warn('reportes:', err.message)
      try {
        const cache = JSON.parse(localStorage.getItem('reportes_cache_v1') || '[]')
        if (cache.length) setReportes(cache)
      } catch (_) {}
    } finally {
      setCargando(false)
    }
  }

  const reportesDelEquipo = useMemo(() => {
    const usuarios = listarUsuarios()
    return reportes.filter(r => reporteVisiblePara(r, sesion, usuarios))
  }, [reportes, sesion])

  const reportesFiltrados = useMemo(() => {
    return reportesDelEquipo.filter(r => {
      if (fechaInicio && r.fecha < fechaInicio) return false
      if (fechaFin && r.fecha > fechaFin) return false
      if (mapaFechaInicio && r.fecha < mapaFechaInicio) return false
      if (mapaFechaFin && r.fecha > mapaFechaFin) return false
      if (busquedaTipo.trim()) {
        const q = busquedaTipo.trim().toLowerCase()
        if (!(r.tipo || '').toLowerCase().includes(q)) return false
      }
      if (mapaUsuarioId) {
        const user = listarUsuarios().find(u => u.id === mapaUsuarioId)
        if (!reporteEsDeUsuario(r, user)) return false
      }
      if (mapaTipoFiltro) {
        const tipo = (r.tipo || '').toLowerCase()
        const f = mapaTipoFiltro.toLowerCase()
        if (f === 'hurto' && !(tipo.includes('hurto') || tipo.includes('robo') || tipo.includes('atraco') || tipo.includes('sustracc'))) return false
        else if (f === 'ronda' && !tipo.includes('ronda')) return false
        else if (f === 'revista' && !tipo.includes('revista')) return false
        else if (f === 'novedad' && !tipo.includes('novedad')) return false
        else if (f === 'basura' && !(tipo.includes('basura') || tipo.includes('residuo') || tipo.includes('desecho'))) return false
        else if (f === 'qr' && !(tipo.includes('qr') || tipo.includes('lector qr'))) return false
        else if (f === 'infra' && !(tipo.includes('infraestructura') || tipo.includes('planta'))) return false
        else if (f === 'corredor' && !tipo.includes('corredor')) return false
        else if (f === 'perimetro' && !(tipo.includes('perimetro') || tipo.includes('perímetro'))) return false
        else if (f === 'acompanamiento' && !tipo.includes('acompa')) return false
        else if (f === 'ahorro' && !(tipo.includes('ahorro') || tipo.includes('sostenib'))) return false
        else if (f === 'cierre' && !tipo.includes('cierre')) return false
        else if (f === 'apertura' && !tipo.includes('apertura')) return false
        else if (f === 'inventario' && !tipo.includes('inventario')) return false
        else if (f === 'llaves' && !tipo.includes('llave')) return false
      }
      return true
    })
  }, [reportesDelEquipo, fechaInicio, fechaFin, busquedaTipo, mapaUsuarioId, mapaTipoFiltro, mapaFechaInicio, mapaFechaFin])

  const reportesParaExportar = useMemo(() => {
    return reportesDelEquipo.filter(r => {
      if (fechaInicio && r.fecha < fechaInicio) return false
      if (fechaFin && r.fecha > fechaFin) return false
      if (usuarioExport) {
        const user = listarUsuarios().find(u => u.id === usuarioExport)
        if (!reporteEsDeUsuario(r, user)) return false
      }
      if (tipoExport && tipoExport !== 'Todos') {
        if (tipoExport === 'Otro') {
          const q = tipoExportOtro.trim().toLowerCase()
          const tiposFijos = ['novedad', 'incidente', 'accidente', 'habitante de calle', 'arma blanca / amenaza', 'emergencia']
          if (q) {
            if (!(r.tipo || '').toLowerCase().includes(q)) return false
            if (tiposFijos.includes((r.tipo || '').toLowerCase())) return false
          } else if (tiposFijos.includes((r.tipo || '').toLowerCase())) {
            return false
          }
        } else if ((r.tipo || '').toLowerCase() !== tipoExport.toLowerCase()) {
          return false
        }
      }
      return true
    })
  }, [reportesDelEquipo, fechaInicio, fechaFin, tipoExport, tipoExportOtro, usuarioExport])

  const reportesParaMapa = useMemo(() => {
    return reportesDelEquipo.filter(r => {
      if (mapaFechaInicio && r.fecha < mapaFechaInicio) return false
      if (mapaFechaFin && r.fecha > mapaFechaFin) return false
      if (mapaUsuarioId) {
        const user = listarUsuarios().find(u => u.id === mapaUsuarioId)
        if (!reporteEsDeUsuario(r, user)) return false
      }
      if (mapaTipoFiltro) {
        const tipo = (r.tipo || '').toLowerCase()
        const f = mapaTipoFiltro.toLowerCase()
        if (f === 'hurto') {
          if (!(tipo.includes('hurto') || tipo.includes('robo') || tipo.includes('atraco') || tipo.includes('sustracc'))) return false
        } else if (f === 'ronda') {
          if (!tipo.includes('ronda')) return false
        } else if (f === 'revista') {
          if (!tipo.includes('revista')) return false
        } else if (f === 'novedad') {
          if (!tipo.includes('novedad')) return false
        } else if (f === 'basura') {
          if (!(tipo.includes('basura') || tipo.includes('residuo') || tipo.includes('desecho'))) return false
        } else if (f === 'qr') {
          if (!(tipo.includes('qr') || tipo.includes('lector qr'))) return false
        } else if (f === 'infra') {
          if (!(tipo.includes('infraestructura') || tipo.includes('planta'))) return false
        } else if (f === 'corredor') {
          if (!tipo.includes('corredor')) return false
        } else if (f === 'perimetro') {
          if (!(tipo.includes('perimetro') || tipo.includes('perímetro'))) return false
        } else if (f === 'acompanamiento') {
          if (!tipo.includes('acompa')) return false
        } else if (f === 'ahorro') {
          if (!(tipo.includes('ahorro') || tipo.includes('sostenib'))) return false
        } else if (f === 'cierre') {
          if (!tipo.includes('cierre')) return false
        } else if (f === 'apertura') {
          if (!tipo.includes('apertura')) return false
        } else if (f === 'inventario') {
          if (!tipo.includes('inventario')) return false
        } else if (f === 'llaves') {
          if (!tipo.includes('llave')) return false
        }
      }
      return true
    })
  }, [reportesDelEquipo, mapaFechaInicio, mapaFechaFin, mapaTipoFiltro, mapaUsuarioId])

  const indicadoresMapa = useMemo(() => {
    const contadores = {
      hurto: 0,
      ronda: 0,
      acompanamiento: 0,
      ahorro: 0,
      cierre: 0,
      apertura: 0,
      inventario: 0,
      llaves: 0,
      revista: 0,
      novedad: 0,
      basura: 0,
      qr: 0,
      infra: 0,
      corredor: 0,
      perimetro: 0,
      otros: 0
    }
    reportesParaMapa.forEach(r => {
      const t = (r.tipo || '').toLowerCase()
      if (t.includes('hurto') || t.includes('robo') || t.includes('atraco') || t.includes('sustracc')) contadores.hurto++
      else if (t.includes('acompa')) contadores.acompanamiento++
      else if (t.includes('ahorro') || t.includes('sostenib')) contadores.ahorro++
      else if (t.includes('cierre')) contadores.cierre++
      else if (t.includes('apertura')) contadores.apertura++
      else if (t.includes('inventario')) contadores.inventario++
      else if (t.includes('llave')) contadores.llaves++
      else if (t.includes('ronda')) contadores.ronda++
      else if (t.includes('revista')) contadores.revista++
      else if (t.includes('novedad')) contadores.novedad++
      else if (t.includes('basura') || t.includes('residuo') || t.includes('desecho')) contadores.basura++
      else if (t.includes('qr') || t.includes('lector qr')) contadores.qr++
      else if (t.includes('infraestructura') || t.includes('planta')) contadores.infra++
      else if (t.includes('corredor')) contadores.corredor++
      else if (t.includes('perimetro') || t.includes('perímetro')) contadores.perimetro++
      else contadores.otros++
    })
    const total = reportesParaMapa.length || 1
    const items = [
      { key: 'hurto', label: 'Hurto / Robo', color: '#dc2626', valor: contadores.hurto },
      { key: 'ronda', label: 'Rondas', color: '#16a34a', valor: contadores.ronda },
      { key: 'acompanamiento', label: 'Acompañamiento', color: '#0891b2', valor: contadores.acompanamiento },
      { key: 'ahorro', label: 'Ahorro y sostenibilidad', color: '#65a30d', valor: contadores.ahorro },
      { key: 'cierre', label: 'Cierre', color: '#1e3a8a', valor: contadores.cierre },
      { key: 'apertura', label: 'Apertura', color: '#22c55e', valor: contadores.apertura },
      { key: 'inventario', label: 'Inventario', color: '#92400e', valor: contadores.inventario },
      { key: 'llaves', label: 'Llaves', color: '#d97706', valor: contadores.llaves },
      { key: 'revista', label: 'Revistas', color: '#2563eb', valor: contadores.revista },
      { key: 'novedad', label: 'Novedad', color: '#eab308', valor: contadores.novedad },
      { key: 'basura', label: 'Basuras', color: '#7c3aed', valor: contadores.basura },
      { key: 'qr', label: 'Lector QR', color: '#a21caf', valor: contadores.qr },
      { key: 'infra', label: 'Infraestructura', color: '#6b7280', valor: contadores.infra },
      { key: 'corredor', label: 'Corredores', color: '#ea580c', valor: contadores.corredor },
      { key: 'perimetro', label: 'Perímetro', color: '#111827', valor: contadores.perimetro },
      { key: 'otros', label: 'Otros', color: '#94a3b8', valor: contadores.otros }
    ].map(i => ({ ...i, pct: Math.round((i.valor / total) * 100) }))
    return { items, total: reportesParaMapa.length, contadores }
  }, [reportesParaMapa])

  const gruposComparativo = useMemo(() => {
    if (!verComparativo) return []
    return armarComparativo({
      usuarios: listarUsuarios(),
      reportes: reportesDelEquipo.filter((r) => {
        if (mapaFechaInicio && r.fecha < mapaFechaInicio) return false
        if (mapaFechaFin && r.fecha > mapaFechaFin) return false
        return true
      }),
      sesion
    })
  }, [verComparativo, reportesDelEquipo, mapaFechaInicio, mapaFechaFin, sesion, tickUsuarios])

  const indicadores = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    return {
      total: reportesDelEquipo.length,
      hoy: reportesDelEquipo.filter(r => r.fecha === hoy).length,
      conFotos: reportesDelEquipo.filter(r => r.imagenes?.length > 0).length,
      filtrados: reportesFiltrados.length
    }
  }, [reportesDelEquipo, reportesFiltrados])

  const agregarReporte = (reporte) => {
    setReportes(prev => [reporte, ...prev])
    setUbicacionSeleccionada(null)
    setReporteSeleccionado(reporte)
  }

  const eliminarReporte = async (id) => {
    if (!puedeBorrarReportes) {
      alert('No tienes permiso para eliminar reportes')
      return
    }
    if (!window.confirm('¿Eliminar este reporte?')) return
    try {
      const { error } = await supabase.from('reportes').delete().eq('id', id)
      if (error) throw error
      setReportes(prev => prev.filter(r => r.id !== id))
      if (reporteSeleccionado?.id === id) setReporteSeleccionado(null)
      if (detalleAbierto?.id === id) setDetalleAbierto(null)
    } catch (err) {
      alert('Error al eliminar: ' + (err.message || ''))
    }
  }

  const handleSeleccionar = (reporte) => {
    setReporteSeleccionado(reporte)
    setDetalleAbierto(reporte)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) {
      alert('El logo no debe superar 1.5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target.result
      if (esAdmin) {
        localStorage.setItem(LOGO_KEY, data)
        setLogoMarca(data)
      } else if (rol === 'master') {
        actualizarUsuario(sesion.id, { logoMarca: data, logoPropio: true })
        setLogoMarca(data)
      }
    }
    reader.readAsDataURL(file)
  }

  const quitarLogo = () => {
    if (!esAdmin) return
    localStorage.removeItem(LOGO_KEY)
    setLogoMarca(null)
  }

  const handleGenerarPDF = async (reporte) => {
    if (!puedeExportar) {
      alert('No tienes autorización para imprimir informes')
      return
    }
    await generarPDF(reporte, tituloInforme, logoMarca)
  }

  const handleInformeGeneralPDF = async () => {
    let mapaDataUrl = null
    if (incluirMapaPDF && mapaRef.current) {
      try {
        await new Promise(r => setTimeout(r, 250))
        const canvas = await html2canvas(mapaRef.current, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          scale: 1.5,
          logging: false
        })
        mapaDataUrl = canvas.toDataURL('image/jpeg', 0.85)
      } catch (err) {
        console.warn(err)
        alert('No se pudo capturar el mapa. El PDF se generará sin él.')
      }
    }
    await generarInformeGeneral(reportesParaExportar, fechaInicio, fechaFin, tituloInforme, logoMarca, mapaDataUrl)
  }

  const handleExportarExcel = () => {
    exportarExcel(reportesParaExportar, fechaInicio, fechaFin, tituloInforme, logoMarca)
  }

  const handleImprimirMapa = async () => {
    if (!puedeExportar) {
      alert('No tienes autorización para imprimir el mapa')
      return
    }
    if (!mapaRef.current) return
    setExportandoMapa(true)
    try {
      await new Promise(r => setTimeout(r, 300))
      const canvas = await html2canvas(mapaRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      })
      const dataUrl = canvas.toDataURL('image/png')
      const uSel = mapaUsuarioId ? listarUsuarios().find(u => u.id === mapaUsuarioId) : null
      const desde = mapaFechaInicio || 'inicio'
      const hasta = mapaFechaFin || 'hoy'
      const masterTxt = uSel
        ? (uSel.masterNombre || (rolDe(uSel) === 'master' ? 'Es master' : (rolDe(uSel) === 'admin' ? 'Administrador' : 'N/D')))
        : ''
      const ficha = uSel
        ? `<div class="ficha-user">
            <img src="${uSel.foto || ''}" alt="" />
            <div>
              <h2>${uSel.nombre || ''}</h2>
              <p>CC ${uSel.cedula || ''} · ${uSel.cargo || 'Sin cargo'}</p>
              <p>${rolDe(uSel) === 'general' ? 'General' : rolDe(uSel) === 'master' ? 'Master' : 'Administrador'} · Master: ${masterTxt}</p>
              <p>Periodo: ${desde} a ${hasta} · ${reportesParaMapa.length} registro(s)</p>
            </div>
          </div>`
        : `<div class="ficha">
            <p><strong>Periodo del informe:</strong> ${desde} a ${hasta}</p>
            <p><strong>Registros en mapa:</strong> ${reportesParaMapa.length}</p>
          </div>`
      const ventana = window.open('', '_blank')
      if (!ventana) {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `mapa_reportes_${new Date().toISOString().slice(0, 10)}.png`
        a.click()
        return
      }
      ventana.document.write(`<!DOCTYPE html><html><head><title>Mapa</title>
        <style>
          body{font-family:system-ui,Segoe UI,sans-serif;margin:24px;color:#111}
          h1{text-align:center;font-size:18px;margin-bottom:12px}
          .ficha-user{max-width:760px;margin:0 auto 16px;display:flex;gap:14px;align-items:center;border:1px solid #bfdbfe;border-radius:14px;padding:12px 16px;text-align:left;background:#f8fbff}
          .ficha-user img{width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #93c5fd;flex-shrink:0}
          .ficha-user h2{margin:0 0 4px;font-size:16px}
          .ficha-user p{margin:2px 0;font-size:13px;color:#4b5563}
          .ficha{max-width:720px;margin:12px auto 16px;border:1px solid #ccc;padding:12px 16px;text-align:left;font-size:13px}
          .mapa-img{max-width:100%;display:block;margin:0 auto}
          @media print{.acciones{display:none}}
        </style>
        </head><body>
        <h1>${tituloInforme || 'Mapa'}</h1>
        ${ficha}
        <img class="mapa-img" src="${dataUrl}" />
        <div class="acciones"><button onclick="window.print()">Imprimir</button></div>
        </body></html>`)
      ventana.document.close()
    } catch (err) {
      alert('No se pudo generar la imagen del mapa')
    } finally {
      setExportandoMapa(false)
    }
  }

  const handleLogout = () => {
    logout()
    setSesion(null)
    setPosicionUsuario(null)
  }

  const usuariosEquipo = useMemo(() => {
    if (!sesion) return []
    const todos = listarUsuarios().filter(u => u.activo !== false)
    if (esAdmin) return todos
    if (rol === 'master') {
      return todos.filter((u) => {
        if (String(u.id) === String(sesion.id)) return true
        return rolDe(u) === 'general' && String(u.masterId || '') === String(sesion.id)
      })
    }
    return todos.filter((u) => String(u.id) === String(sesion.id))
  }, [sesion?.id, esAdmin, rol, tickUsuarios])

  const usuarioVivo = posicionUsuario
    ? {
        id: sesion.id,
        nombre: sesion.nombre,
        cargo: sesion.cargo,
        foto: sesion.foto,
        lat: posicionUsuario.lat,
        lng: posicionUsuario.lng
      }
    : null

  const puedeVerUsuariosMapa = esAdmin || rol === 'master'

  const usuariosEnMapa = useMemo(() => {
    if (!sesion) return []
    if (!puedeVerUsuariosMapa) {
      return []
    }
    const lista = usuariosEquipo.map(u => {
      if (u.id === sesion.id && posicionUsuario) {
        return { ...u, lat: posicionUsuario.lat, lng: posicionUsuario.lng }
      }
      const p = posicionViva(u)
      return { ...u, lat: p.lat, lng: p.lng }
    }).filter(u => u.lat != null && u.lng != null)
    return lista
  }, [usuariosEquipo, posicionUsuario, sesion?.id, puedeVerUsuariosMapa, usuarioVivo])

  if (!sesion) {
    return (
      <Login
        onLogin={(s) => {
          setSesion(s)
          cargarReportes()
        }}
      />
    )
  }

  return (
    <div className="app-container">
      {esAdmin && <PanelTemaAdmin />}

      <header className="header">
        <div className="header-inner">
          {logoMarca && <img src={logoMarca} alt="Logo" className="logo-banner" />}
          <div className="header-text">
            <h1>📋 Sistema de Reportes de Eventos</h1>
            <p>Versión en la nube · Supabase · Multi-dispositivo</p>
          </div>
        </div>
      </header>

      <div className="barra-modulos">
        {puedeSupervision && (
          <button type="button" className={moduloActivo === 'supervision' ? 'btn-mod activo' : 'btn-mod'} onClick={() => setModuloActivo((m) => m === 'supervision' ? '' : 'supervision')}>Supervisión</button>
        )}
        <button type="button" className={moduloActivo === 'asistencia' ? 'btn-mod activo' : 'btn-mod'} onClick={() => setModuloActivo((m) => m === 'asistencia' ? '' : 'asistencia')}>Registro personal</button>
        {puedePersonalIndicadores && (
          <button type="button" className={moduloActivo === 'personal' ? 'btn-mod activo' : 'btn-mod'} onClick={() => setModuloActivo((m) => m === 'personal' ? '' : 'personal')}>Indicadores</button>
        )}
        {puedeVerInformativo && (
          <button type="button" className={moduloActivo === 'informativo' ? 'btn-mod activo' : 'btn-mod'} onClick={() => setModuloActivo((m) => m === 'informativo' ? '' : 'informativo')}>Informativo</button>
        )}
      </div>
      {moduloActivo === 'supervision' && puedeSupervision && (
        <ModuloSupervision sesion={sesion} logoMarca={logoMarca} puedeCrear={puedeSupervision} puedeBorrar={esAdmin || rol === 'master'} forzarAbierto />
      )}
      {moduloActivo === 'asistencia' && (
        <ModuloAsistencia sesion={sesion} logoMarca={logoMarca} forzarAbierto />
      )}
      {moduloActivo === 'personal' && puedePersonalIndicadores && (
        <ModuloPersonalIndicadores sesion={sesion} logoMarca={logoMarca} forzarAbierto />
      )}
      {moduloActivo === 'informativo' && puedeVerInformativo && (
        <ModuloInformativo sesion={sesion} forzarAbierto />
      )}

      <div className="sesion-bar">
        <div className="sesion-user">
          {sesion.foto && (
            <button
              type="button"
              className="foto-click-buzon"
              title="Abrir buzón de mensajes"
              onClick={() => setBuzonAbierto(true)}
            >
              <img src={sesion.foto} alt="" className="usuario-foto" />
              {msgBadge > 0 && <span className="badge-float">{msgBadge}</span>}
            </button>
          )}
          <div>
            <strong>{sesion.nombre}</strong>
            <p>{sesion.cargo || 'Usuario'} · CC {sesion.cedula} · {esAdmin ? 'Administrador' : rol === 'master' ? 'Master' : 'Usuario general'}</p>
            <p className="usuario-estado">● GPS activo en esta sesión</p>
            <button type="button" className="link-buzon" onClick={() => setBuzonAbierto(true)}>
              📨 Buzón de mensajes {msgBadge > 0 ? `(${msgBadge})` : ''}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {puedeGestionarUsuarios && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: 'auto', background: pendientesCount > 0 ? '#d97706' : '#3b82f6' }}
              onClick={() => {
                const el = document.getElementById('gestion-usuarios')
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            >
              ⏳ Pendientes ({pendientesCount})
            </button>
          )}
          {esMaster && (
            <button type="button" className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setNotifsAbiertas(true)}>
              🔔 Desconexiones {notifBadge > 0 ? `(${notifBadge})` : ''}
            </button>
          )}
          {puedeCambiarFoto && (
            <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setFotoAbierta(true)}>
              Cambiar foto
            </button>
          )}
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={() => setPassAbierta(true)}>
            Cambiar contraseña
          </button>
          <button type="button" className="btn btn-secondary" style={{ width: 'auto' }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="indicadores-grid">
        <div className="indicador-card">
          <div className="indicador-valor">{indicadores.total}</div>
          <div className="indicador-label">Total reportes</div>
        </div>
        <div className="indicador-card destacado">
          <div className="indicador-valor">{indicadores.hoy}</div>
          <div className="indicador-label">Hoy</div>
        </div>
        <div className="indicador-card">
          <div className="indicador-valor">{indicadores.conFotos}</div>
          <div className="indicador-label">Con evidencias</div>
        </div>
        <div className="indicador-card">
          <div className="indicador-valor">{indicadores.filtrados}</div>
          <div className="indicador-label">En rango actual</div>
        </div>
      </div>

      {!esGeneral && (
      <div className="card filtros-card">
        <h2>Informes y exportación</h2>
        {!puedeExportar && <p style={{ color: '#b45309', fontSize: '0.85rem' }}>No tienes autorización para imprimir informes. Pídela a tu master o al administrador.</p>}
        <div className="form-group">
          <label>Título del informe {esAdmin || rol === 'master' ? '(solo el tuyo; no cambia el de otros masters)' : '(definido por tu master)'}</label>
          <input
            type="text"
            value={tituloInforme}
            onChange={(e) => setTituloInforme(e.target.value)}
            readOnly={esGeneral}
            disabled={esGeneral}
          />
        </div>
        {esAdmin && (
          <div className="form-group">
            <label>Logo de marca del administrador (sale en sus PDF)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input type="file" accept="image/*" onChange={handleLogoChange} />
              {logoMarca && (
                <>
                  <img src={logoMarca} alt="Logo" style={{ height: 48, objectFit: 'contain' }} />
                  <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '6px 12px' }} onClick={quitarLogo}>Quitar logo</button>
                </>
              )}
            </div>
          </div>
        )}
        {rol === 'master' && !esAdmin && (
          <div className="form-group">
            <label>Logo de marca del master (sale en tus PDF)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input type="file" accept="image/*" onChange={handleLogoChange} />
              {listarUsuarios().find(u => u.id === sesion.id)?.logoPropio && listarUsuarios().find(u => u.id === sesion.id)?.logoMarca && (
                <img src={listarUsuarios().find(u => u.id === sesion.id).logoMarca} alt="Logo" style={{ height: 48, objectFit: 'contain' }} />
              )}
            </div>
            <small style={{ color: '#4b5563', fontSize: '0.75rem' }}>
              Puedes cargar o reemplazar tu logo. Solo el administrador puede quitarlo.
            </small>
          </div>
        )}
        {esGeneral && (
          <div className="form-group">
            <label>Logo de tu master</label>
            {logoMarca ? (
              <img src={logoMarca} alt="Logo master" style={{ height: 48, objectFit: 'contain' }} />
            ) : (
              <small style={{ color: '#4b5563' }}>Tu master aún no ha cargado un logo propio.</small>
            )}
          </div>
        )}

        <div className="filtros-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fecha inicial</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fecha final</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tipo de reporte a exportar</label>
            <select value={tipoExport} onChange={(e) => { setTipoExport(e.target.value); if (e.target.value !== 'Otro') setTipoExportOtro('') }}>
              <option value="">Todos</option>
              <option value="Novedad">Novedad</option>
              <option value="Incidente">Incidente</option>
              <option value="Accidente">Accidente</option>
              <option value="Habitante de calle">Habitante de calle</option>
              <option value="Arma blanca / Amenaza">Arma blanca / Amenaza</option>
              <option value="Emergencia">Emergencia</option>
              <option value="Rondas">Rondas</option>
              <option value="Revistas">Revistas</option>
              <option value="Acompañamiento">Acompañamiento</option>
              <option value="Ahorro y sostenibilidad">Ahorro y sostenibilidad</option>
              <option value="Hurto y robo">Hurto y robo</option>
              <option value="Cierre">Cierre</option>
              <option value="Apertura">Apertura</option>
              <option value="Inventario">Inventario</option>
              <option value="Llaves">Llaves</option>
              <option value="Lector QR">Lector QR</option>
              <option value="Infraestructura y planta física">Infraestructura y planta física</option>
              <option value="Corredores seguros">Corredores seguros</option>
              <option value="Perímetro">Perímetro</option>
              <option value="Otro">Otros (personalizados)</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Informe por usuario</label>
            <select value={usuarioExport} onChange={(e) => setUsuarioExport(e.target.value)}>
              <option value="">Todos los usuarios</option>
              {usuariosEquipo.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>
          {tipoExport === 'Otro' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nombre del tipo personalizado</label>
              <input type="text" value={tipoExportOtro} onChange={(e) => setTipoExportOtro(e.target.value)} placeholder="Ej: Robo de cable..." />
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 8, width: '100%' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
              <input type="checkbox" checked={incluirMapaPDF} onChange={(e) => setIncluirMapaPDF(e.target.checked)} style={{ width: 16, height: 16 }} />
              Incluir mapa al final del PDF (opcional)
            </label>
          </div>
          <div className="filtros-botones">
            <button className="btn btn-primary" onClick={handleInformeGeneralPDF} disabled={!puedeExportar}>📄 Informe PDF</button>
            <button className="btn btn-success" onClick={handleExportarExcel} disabled={!puedeExportar}>📊 Excel</button>
            {(fechaInicio || fechaFin || tipoExport) && (
              <button className="btn btn-secondary" onClick={() => { setFechaInicio(''); setFechaFin(''); setTipoExport(''); setTipoExportOtro('') }}>Limpiar filtro</button>
            )}
          </div>
        </div>
        <p className="filtros-hint">Se exportarán {reportesParaExportar.length} reporte(s) según fechas y tipo seleccionado.</p>
        <PanelInformeSemanal habilitado={puedeExportar} />
      </div>
      )}

      {puedeGestionarUsuarios && (
        <div id="gestion-usuarios" style={{ marginBottom: 16 }}>
          <GestionUsuarios sesion={sesion} puedeCrearGenerales={puedeCrearGenerales} puedePermisosGenerales={puedePermisosGenerales} onUsuariosChange={() => {
            setTickUsuarios(x => x + 1)
            setPendientesCount(listarUsuarios().filter(u => u.activo === false).length)
          }} />
        </div>
      )}

      <div className="layout">
        <div className="col-form">
          {puedeReportar ? (
            <FormularioReporte
              sesion={sesion}
              onAgregar={agregarReporte}
              ubicacionSeleccionada={ubicacionSeleccionada}
              onSeleccionarUbicacion={setUbicacionSeleccionada}
              onLimpiarUbicacion={() => setUbicacionSeleccionada(null)}
            />
          ) : (
            <div className="card"><p>No tienes permiso para crear reportes.</p></div>
          )}
          {puedeVerHistorial && (
          <div className="card" style={{ marginTop: 20 }}>
            <h2>Historial de reportes {cargando && <span style={{ fontSize: '0.8rem', fontWeight: 400 }}> · Cargando...</span>}</h2>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label>Buscar por tipo de reporte</label>
              <input type="text" value={busquedaTipo} onChange={(e) => setBusquedaTipo(e.target.value)} placeholder="Ej: Novedad, hurto..." />
            </div>
            <ListaReportes
              reportes={reportesFiltrados}
              seleccionado={reporteSeleccionado}
              onSeleccionar={handleSeleccionar}
              onEliminar={eliminarReporte}
              onGenerarPDF={puedeExportar ? handleGenerarPDF : undefined}
              esMaster={puedeBorrarReportes}
            />
          </div>
          )}
        </div>

        {puedeVerMapa ? (
        <div className="card col-mapa">
          <h2>Mapa en tiempo real</h2>
          <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: 8 }}>
            Los reportes se guardan en la nube · GPS de usuario en vivo
          </p>
          <div className="mapa-fechas">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Fecha inicial (mapa)</label>
              <input type="date" value={mapaFechaInicio} onChange={(e) => setMapaFechaInicio(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Fecha final (mapa)</label>
              <input type="date" value={mapaFechaFin} onChange={(e) => setMapaFechaFin(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tipo en el mapa</label>
              <select value={mapaTipoFiltro} onChange={(e) => setMapaTipoFiltro(e.target.value)}>
                <option value="">Todos</option>
                <option value="hurto">Hurto y robo</option>
                <option value="ronda">Rondas</option>
                <option value="acompanamiento">Acompañamiento</option>
                <option value="ahorro">Ahorro y sostenibilidad</option>
                <option value="cierre">Cierre</option>
                <option value="apertura">Apertura</option>
                <option value="inventario">Inventario</option>
                <option value="llaves">Llaves</option>
                <option value="revista">Revistas</option>
                <option value="novedad">Novedad</option>
                <option value="basura">Basuras</option>
                <option value="qr">Lector QR</option>
                <option value="infra">Infraestructura y planta física</option>
                <option value="corredor">Corredores seguros</option>
                <option value="perimetro">Perímetro</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Usuario (reportes en mapa)</label>
              <select value={mapaUsuarioId} onChange={(e) => setMapaUsuarioId(e.target.value)}>
                <option value="">{esGeneral ? (sesion?.nombre || 'Mis reportes') : 'Todos los usuarios'}</option>
                {usuariosEquipo.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
            {(mapaFechaInicio || mapaFechaFin || mapaTipoFiltro || mapaUsuarioId) && (
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '10px 14px' }} onClick={() => { setMapaFechaInicio(''); setMapaFechaFin(''); setMapaTipoFiltro(''); setMapaUsuarioId('') }}>
                Limpiar filtros
              </button>
            )}
          </div>
          <p className="filtros-hint" style={{ marginTop: 6, marginBottom: 8 }}>
            Mostrando {reportesParaMapa.length} registro(s) en el mapa
            {mapaFechaInicio || mapaFechaFin ? ` · Periodo: ${mapaFechaInicio || 'inicio'} a ${mapaFechaFin || 'hoy'}` : ''}
          </p>
          {mapaUsuarioId && (() => {
            const uSel = listarUsuarios().find(u => u.id === mapaUsuarioId)
            if (!uSel) return null
            return (
              <div className="ficha-usuario-mapa ficha-usuario-card">
                <img src={uSel.foto} alt={uSel.nombre} className="usuario-foto" />
                <div>
                  <strong>{uSel.nombre}</strong>
                  <p>CC {uSel.cedula} · {uSel.cargo || 'Sin cargo'}</p>
                  <p>Ingreso: {(uSel.fechaInicioLaboral || uSel.creadoEn || '').toString().slice(0, 10) || 'N/D'}</p>
                  <p>{rolDe(uSel) === 'general' ? 'General' : rolDe(uSel) === 'master' ? 'Master' : 'Administrador'} · Master: {uSel.masterNombre || (rolDe(uSel) === 'master' ? 'Es master' : (rolDe(uSel) === 'admin' ? 'Administrador' : 'N/D'))}</p>
                  <p>Periodo: {mapaFechaInicio || 'inicio'} a {mapaFechaFin || 'hoy'}</p>
                </div>
              </div>
            )
          })()}
          <div className="mapa-acciones">
            <div className="leyenda-calor" style={{ marginBottom: 0 }}>
              <span className="leyenda-item"><i className="dot verde"></i> Calor: más</span>
              <span className="leyenda-item"><i className="dot naranja"></i> Media</span>
              <span className="leyenda-item"><i className="dot rojo"></i> Menos</span>
              <span className="leyenda-item"><i className="dot rojo"></i> Hurto/robo</span>
              <span className="leyenda-item"><i className="dot verde"></i> Ronda</span>
              <span className="leyenda-item"><i className="dot azul"></i> Revista</span>
              <span className="leyenda-item"><i className="dot amarillo"></i> Novedad</span>
              <span className="leyenda-item"><i className="dot violeta"></i> Lector QR</span>
              <span className="leyenda-item"><i className="dot gris"></i> Infraestructura</span>
              <span className="leyenda-item"><i className="dot naranja"></i> Corredores</span>
              <span className="leyenda-item"><i className="dot negro"></i> Perímetro</span>
            </div>
            {puedeExportar ? (
            <button type="button" className="btn btn-primary" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }} onClick={handleImprimirMapa} disabled={exportandoMapa}>
              {exportandoMapa ? 'Generando...' : '🖨️ Imprimir mapa'}
            </button>
            ) : (
              <span style={{ fontSize: '0.82rem', color: '#b45309' }}>Sin permiso para imprimir mapa</span>
            )}
            {puedeComparativo && (
              <button type="button" className="btn btn-secondary" style={{ width: 'auto', padding: '8px 14px', fontSize: '0.85rem' }} onClick={() => setVerComparativo((v) => !v)}>
                {verComparativo ? 'Ocultar comparativo' : 'Ver rendimiento del equipo'}
              </button>
            )}
          </div>

          <div ref={mapaRef} className="mapa-export-area">
            <div className="indicadores-barras">
              <div className="indicadores-barras-titulo">
                Indicadores por tipo · {indicadoresMapa.total} registro(s)
              </div>
              {indicadoresMapa.items.map(item => (
                <div key={item.key} className="barra-item">
                  <div className="barra-label">
                    <span>{item.label}</span>
                    <strong>{item.valor} ({item.pct}%)</strong>
                  </div>
                  <div className="barra-track">
                    <div
                      className="barra-fill"
                      style={{
                        width: `${indicadoresMapa.total === 0 ? 0 : item.pct}%`,
                        background: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {verComparativo && puedeComparativo && (
              <PanelComparativo
                grupos={gruposComparativo}
                titulo={tituloInforme || 'Rendimiento comparativo'}
                periodo={`Periodo: ${mapaFechaInicio || 'inicio'} a ${mapaFechaFin || 'hoy'} · se actualiza con los reportes en vivo`}
                logoMarca={logoMarca}
                onCerrar={() => setVerComparativo(false)}
              />
            )}
            <div className="mapa-container">
              <MapaReportes
                reportes={reportesParaMapa}
                ubicacionSeleccionada={ubicacionSeleccionada}
                onSeleccionarUbicacion={setUbicacionSeleccionada}
                reporteSeleccionado={reporteSeleccionado}
                usuarioVivo={puedeVerUsuariosMapa ? usuarioVivo : null}
                usuariosVivos={puedeVerUsuariosMapa ? usuariosEnMapa : []}
              />
            </div>
          </div>
        </div>
        ) : (
          <div className="card col-mapa"><p>No tienes permiso para ver el mapa.</p></div>
        )}
      </div>

      {detalleAbierto && (
        <DetalleReporte
          reporte={detalleAbierto}
          onCerrar={() => setDetalleAbierto(null)}
          onGenerarPDF={handleGenerarPDF}
        />
      )}

      <BuzonMensajes
        sesion={sesion}
        abierto={buzonAbierto}
        onCerrar={() => setBuzonAbierto(false)}
        esAdmin={esAdmin}
        onMensajeRespondido={() => setMsgBadge(noLeidos(sesion.id))}
      />

      {esMaster && (
        <NotificacionesMaster
          abierto={notifsAbiertas}
          onCerrar={() => setNotifsAbiertas(false)}
        />
      )}

      <CambiarPassword
        sesion={sesion}
        abierto={passAbierta}
        onCerrar={() => setPassAbierta(false)}
      />
      {fotoAbierta && puedeCambiarFoto && (
        <CambiarFoto
          sesion={sesion}
          onCerrar={() => setFotoAbierta(false)}
          onActualizado={(s) => setSesion(s)}
        />
      )}
    </div>
  )
}

export default App
