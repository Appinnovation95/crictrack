import React from 'react'

export default function HomePage({ onOpen }) {
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="brand-row">
          <div className="logo-mark">🏏</div>
          <div>
            <h1 className="brand-title">CricTrack</h1>
            <p className="brand-subtitle">Teams • Tournaments • Live Scoring</p>
          </div>
        </div>
      </header>

      <main className="content">
        <h2 className="section-title">Welcome to CricTrack</h2>
        <p className="section-copy">Choose your workspace to continue.</p>

        <div className="grid">
          <button className="card" onClick={() => onOpen('team')}>
            <div className="card-icon">🛡️</div>
            <div className="card-title">Cricket Team</div>
            <div className="card-copy">Team login, players, matches and scoring.</div>
          </button>

          <button className="card" onClick={() => onOpen('tournament')}>
            <div className="card-icon">🏆</div>
            <div className="card-title">Tournaments</div>
            <div className="card-copy">Fixtures, live matches, points and results.</div>
          </button>
        </div>

        <button className="super-admin" onClick={() => onOpen('superadmin')}>
          <span>●</span> Super Admin
        </button>
      </main>

      <footer className="footer">CricTrack v1.0.0 • Premium Cricket Platform</footer>
    </div>
  )
}
