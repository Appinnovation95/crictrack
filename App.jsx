import React, { useState } from 'react'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'

export default function App() {
  const [view, setView] = useState({ page: 'home', role: null })

  if (view.page === 'login') {
    return <LoginPage role={view.role} onBack={() => setView({ page: 'home', role: null })} />
  }

  return <HomePage onOpen={(role) => setView({ page: 'login', role })} />
}
