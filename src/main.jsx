import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { aplicarTema, cargarTema, sincronizarTemaNube } from './lib/tema'

aplicarTema(cargarTema())
sincronizarTemaNube().catch(() => {})
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
