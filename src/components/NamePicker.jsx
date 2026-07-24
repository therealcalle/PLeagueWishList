import { useState } from 'react'

export default function NamePicker({ onSetName }) {
  const [name, setName] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (name.trim()) onSetName(name.trim())
  }

  return (
    <div className="name-picker">
      <div className="name-picker-card">
        <span className="name-picker-gem">⬡</span>
        <h1>PoE League Wishlist</h1>
        <p>Enter your name to get started</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name..."
            className="name-input"
            autoFocus
            maxLength={32}
          />
          <button type="submit" className="btn-primary" disabled={!name.trim()}>
            Enter
          </button>
        </form>
      </div>
    </div>
  )
}
