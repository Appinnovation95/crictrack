import React, { useState } from 'react'

const config = {
  team: { title: 'Cricket Team Login', label: 'Team ID', icon: '🛡️', placeholder: 'Enter Team ID' },
  tournament: { title: 'Tournament Login', label: 'Tournament ID', icon: '🏆', placeholder: 'Enter Tournament ID' },
  superadmin: { title: 'Super Admin Login', label: 'Admin ID / Email', icon: '🔐', placeholder: 'Enter Admin ID' },
}

export default function LoginPage({ role, onBack }) {
  const c = config[role] || config.team
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Phase 1 UI is ready. Firebase Authentication will be connected in the next build.')
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="brand-row">
          <div className="logo-mark">🏏</div>
          <div>
            <h1 className="brand-title">CricTrack</h1>
            <p className="brand-subtitle">Secure access portal</p>
          </div>
        </div>
      </header>

      <main className="login-wrap">
        <button className="back" onClick={onBack}>← Back to Home</button>
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-badge">{c.icon} Secure Login</div>
          <h2 className="login-title">{c.title}</h2>
          <p className="login-copy">Enter your CricTrack credentials to continue.</p>

          <div className="field">
            <label>{c.label}</label>
            <input autoComplete="username" placeholder={c.placeholder} required />
          </div>

          <div className="field">
            <label>Password</label>
            <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter Password" required />
          </div>

          <label className="remember">
            <input type="checkbox" onChange={(e) => setShowPassword(e.target.checked)} /> Show password
          </label>

          <button className="login-btn" type="submit">Login</button>
          <div className="note">Authentication is intentionally disabled in this first UI skeleton. Secure Firebase Auth comes next.</div>
        </form>
      </main>
    </div>
  )
}
