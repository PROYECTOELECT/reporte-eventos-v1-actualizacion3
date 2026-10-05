import { supabase } from './supabase'

const TEMA_KEY = 'tema_plataforma_v1'

export const TEMA_DEFAULT = {
  preset: 'institucional',
  fondo: '#9ca3af',
  banner: '#eff6ff',
  boton: '#3b82f6',
  botonTexto: '#ffffff',
  acento: '#22d3ee',
  fondoImagen: null,
  icono: null,
  estilo: 'solido'
}

export const PRESETS_DISENO = [
  {
    id: 'institucional',
    nombre: 'Institucional',
    fondo: '#9ca3af',
    banner: '#eff6ff',
    boton: '#3b82f6',
    botonTexto: '#ffffff',
    acento: '#60a5fa',
    estilo: 'solido'
  },
  {
    id: 'cristal',
    nombre: 'Cristal (glass)',
    fondo: '#0f172a',
    banner: '#0b1220',
    boton: '#22d3ee',
    botonTexto: '#082f49',
    acento: '#67e8f9',
    estilo: 'cristal'
  },
  {
    id: 'neonnoche',
    nombre: 'Neón noche',
    fondo: '#020617',
    banner: '#020617',
    boton: '#a78bfa',
    botonTexto: '#0f172a',
    acento: '#22d3ee',
    estilo: 'cristal'
  },
  {
    id: 'aurora',
    nombre: 'Aurora',
    fondo: '#042f2e',
    banner: '#064e3b',
    boton: '#34d399',
    botonTexto: '#022c22',
    acento: '#5eead4',
    estilo: 'cristal'
  },
  {
    id: 'carbono',
    nombre: 'Carbono',
    fondo: '#111827',
    banner: '#1f2937',
    boton: '#f59e0b',
    botonTexto: '#111827',
    acento: '#fbbf24',
    estilo: 'solido'
  },
  {
    id: 'oceano',
    nombre: 'Océano',
    fondo: '#0c4a6e',
    banner: '#075985',
    boton: '#38bdf8',
    botonTexto: '#082f49',
    acento: '#7dd3fc',
    estilo: 'cristal'
  },
  {
    id: 'violeta',
    nombre: 'Violeta futurista',
    fondo: '#2e1065',
    banner: '#4c1d95',
    boton: '#c084fc',
    botonTexto: '#2e1065',
    acento: '#e879f9',
    estilo: 'cristal'
  }
]

export function cargarTema() {
  try {
    return { ...TEMA_DEFAULT, ...(JSON.parse(localStorage.getItem(TEMA_KEY) || '{}')) }
  } catch {
    return { ...TEMA_DEFAULT }
  }
}

export function guardarTema(tema) {
  const t = { ...TEMA_DEFAULT, ...tema }
  localStorage.setItem(TEMA_KEY, JSON.stringify(t))
  aplicarTema(t)
  subirTemaNube(t)
  return t
}

export async function sincronizarTemaNube() {
  try {
    const { data, error } = await supabase.from('tema_app').select('*').eq('id', 'global').maybeSingle()
    if (error || !data) return cargarTema()
    const remoto = {
      preset: data.preset || TEMA_DEFAULT.preset,
      fondo: data.fondo || TEMA_DEFAULT.fondo,
      banner: data.banner || TEMA_DEFAULT.banner,
      boton: data.boton || TEMA_DEFAULT.boton,
      botonTexto: data.boton_texto || TEMA_DEFAULT.botonTexto,
      acento: data.acento || TEMA_DEFAULT.acento,
      estilo: data.estilo || TEMA_DEFAULT.estilo,
      fondoImagen: data.fondo_imagen || null,
      icono: data.icono || null
    }
    localStorage.setItem(TEMA_KEY, JSON.stringify(remoto))
    aplicarTema(remoto)
    return remoto
  } catch {
    return cargarTema()
  }
}

function subirTemaNube(t) {
  const fila = {
    id: 'global',
    preset: t.preset,
    fondo: t.fondo,
    banner: t.banner,
    boton: t.boton,
    boton_texto: t.botonTexto,
    acento: t.acento,
    estilo: t.estilo,
    fondo_imagen: t.fondoImagen && String(t.fondoImagen).length < 400000 ? t.fondoImagen : null,
    icono: t.icono && String(t.icono).length < 400000 ? t.icono : null,
    updated_at: new Date().toISOString()
  }
  supabase.from('tema_app').upsert(fila).then(({ error }) => {
    if (error) console.warn('tema nube:', error.message)
  })
}

export function aplicarPreset(id) {
  const p = PRESETS_DISENO.find((x) => x.id === id) || PRESETS_DISENO[0]
  const actual = cargarTema()
  return guardarTema({
    ...actual,
    preset: p.id,
    fondo: p.fondo,
    banner: p.banner,
    boton: p.boton,
    botonTexto: p.botonTexto,
    acento: p.acento,
    estilo: p.estilo
  })
}

export function aplicarTema(tema) {
  const t = { ...TEMA_DEFAULT, ...tema }
  const root = document.documentElement
  root.style.setProperty('--color-fondo', t.fondo)
  root.style.setProperty('--color-banner', t.banner)
  root.style.setProperty('--color-boton', t.boton)
  root.style.setProperty('--color-boton-texto', t.botonTexto || '#ffffff')
  root.style.setProperty('--color-acento', t.acento || '#22d3ee')
  document.body.dataset.estilo = t.estilo || 'solido'
  document.body.dataset.preset = t.preset || 'institucional'
  if (t.fondoImagen) {
    root.style.setProperty('--fondo-imagen', `url("${t.fondoImagen}")`)
    document.body.style.backgroundImage = `linear-gradient(rgba(2,6,23,0.45), rgba(2,6,23,0.35)), url("${t.fondoImagen}")`
    document.body.style.backgroundSize = 'cover'
    document.body.style.backgroundAttachment = 'fixed'
    document.body.style.backgroundPosition = 'center'
  } else {
    root.style.setProperty('--fondo-imagen', 'none')
    document.body.style.backgroundImage = ''
    document.body.style.backgroundSize = ''
    document.body.style.backgroundAttachment = ''
    document.body.style.backgroundPosition = ''
  }
  aplicarIcono(t.icono)
}

export function aplicarIcono(src) {
  const href = src || '/icon-v2-192.png'
  let link = document.querySelector("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = href
  let apple = document.querySelector("link[rel='apple-touch-icon']")
  if (!apple) {
    apple = document.createElement('link')
    apple.rel = 'apple-touch-icon'
    document.head.appendChild(apple)
  }
  apple.href = href
  const meta = document.querySelector("meta[name='theme-color']")
  if (meta) meta.setAttribute('content', '#0f2a24')
}

export function resetTema() {
  document.body.removeAttribute('data-estilo')
  document.body.removeAttribute('data-preset')
  return guardarTema({ ...TEMA_DEFAULT, fondoImagen: null })
}
