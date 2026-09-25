import { useState } from 'react'
import './App.css'

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/+$/, '')

function App() {
  const [status, setStatus] = useState('Conexión pendiente de comprobar.')
  const [loading, setLoading] = useState(false)

  async function checkConnection() {
    setLoading(true)
    setStatus('Comprobando conexión…')
    try {
      const response = await fetch(apiUrl + '/health/ready', {
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Servicio no disponible')
      setStatus('El servicio está disponible.')
    } catch {
      setStatus('No se pudo conectar. Comprueba que el backend esté iniciado y vuelve a intentarlo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header><a className="brand" href="/">Superkanes<span>+</span></a><span>Gestión veterinaria</span></header>
      <main>
        <section className="welcome">
          <p className="eyebrow">UN ESPACIO PARA CUIDAR MEJOR</p>
          <h1>El cuidado empieza<br />con una buena conexión.</h1>
          <p className="intro">Bienvenido a Superkanes. Estamos preparando tu espacio de trabajo para acompañar cada etapa del cuidado de tus pacientes.</p>
          <span className="badge">Versión inicial · En desarrollo</span>
        </section>
        <section className="connection" aria-labelledby="connection-title">
          <div>
            <p className="eyebrow">CONEXIÓN DEL SISTEMA</p>
            <h2 id="connection-title">Todo comienza aquí</h2>
            <p role="status" aria-live="polite">{status}</p>
          </div>
          <button onClick={checkConnection} disabled={loading}>{loading ? 'Comprobando…' : 'Comprobar conexión'}</button>
        </section>
        <section className="modules" aria-label="Módulos previstos">
          {[
            ['01', 'Tutores y pacientes', 'La información de cada mascota y de quienes la cuidan, en un solo lugar.'],
            ['02', 'Historia clínica', 'Un seguimiento organizado de consultas, tratamientos y evolución.'],
            ['03', 'Agenda', 'Un espacio para organizar las citas y los próximos cuidados.'],
          ].map(([number, title, description]) => (
            <article key={number}><span className="number">{number}</span><h2>{title}</h2><p>{description}</p><small>Próximamente</small></article>
          ))}
        </section>
      </main>
      <footer>Superkanes <span>Cerca de quienes cuidan.</span></footer>
    </div>
  )
}

export default App
