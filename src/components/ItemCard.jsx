import { useState } from 'react'

export default function ItemCard({ item, playerName, onClaim, onUnclaim, onUpdateStashNote, onDelete }) {
  const [editingNote, setEditingNote] = useState(false)
  const [noteValue, setNoteValue] = useState(item.stash_note || '')

  const isOwner = item.player_name === playerName
  const isClaimedByMe = item.claimed_by === playerName
  const isClaimed = !!item.claimed_by

  function handleSaveNote() {
    onUpdateStashNote(item.id, noteValue.trim())
    setEditingNote(false)
  }

  function handleNoteKeyDown(e) {
    if (e.key === 'Enter') handleSaveNote()
    if (e.key === 'Escape') setEditingNote(false)
  }

  return (
    <div className={`item-card ${item.type}`}>
      <div className="item-main">
        {item.icon_url ? (
          <img src={item.icon_url} alt={item.item_name} className="item-icon" />
        ) : (
          <div className="item-icon-placeholder">
            {item.type === 'unique' ? '◆' : '⬡'}
          </div>
        )}

        <div className="item-info">
          <span className={`item-name ${item.type}`}>{item.item_name}</span>
          <span className={`item-type-badge ${item.type}`}>
            {item.type === 'unique' ? 'Unique' : 'Gem'}
          </span>
        </div>

        <div className="item-actions">
          {!isClaimed && !isOwner && (
            <button className="btn-claim" onClick={() => onClaim(item.id)}>
              Claim
            </button>
          )}
          {isClaimedByMe && (
            <button className="btn-unclaim" onClick={() => onUnclaim(item.id)}>
              Unclaim
            </button>
          )}
          {isOwner && (            <button
              className="btn-delete"
              onClick={() => onDelete(item.id)}
              title="Remove item"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {isClaimed && (
        <div className="claim-info">
          <span className="claimed-by">
            {isClaimedByMe ? '✓ Claimed by you' : `✓ ${item.claimed_by} has this`}
          </span>

          {isClaimedByMe && (
            <div className="stash-note-area">
              {editingNote ? (
                <div className="note-edit">
                  <input
                    value={noteValue}
                    onChange={e => setNoteValue(e.target.value)}
                    onKeyDown={handleNoteKeyDown}
                    placeholder="Which stash tab?"
                    className="note-input"
                    autoFocus
                    maxLength={64}
                  />
                  <button className="btn-save" onClick={handleSaveNote}>Save</button>
                </div>
              ) : (
                <span
                  className="stash-note"
                  onClick={() => { setNoteValue(item.stash_note || ''); setEditingNote(true) }}
                  title="Click to edit stash tab"
                >
                  {item.stash_note ? `📦 ${item.stash_note}` : '+ stash tab'}
                </span>
              )}
            </div>
          )}

          {!isClaimedByMe && item.stash_note && (
            <span className="stash-note-readonly">📦 {item.stash_note}</span>
          )}
        </div>
      )}
    </div>
  )
}
