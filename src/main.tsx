import React from 'react'
import { createRoot } from 'react-dom/client'
import { Dashboard } from './components/Dashboard'

function App() {
  return <Dashboard />
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')
createRoot(container).render(<App />)


