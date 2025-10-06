import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', padding: 24 }}>
      <h1>Hello World</h1>
      <p>Your React app is up and running.</p>
    </div>
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')
createRoot(container).render(<App />)


