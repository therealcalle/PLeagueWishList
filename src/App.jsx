import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import NamePicker from './components/NamePicker'
import AddItemModal from './components/AddItemModal'
import ItemCard from './components/ItemCard'

export default function App() {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('poe_player_name') || '')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    if (!playerName) { setLoading(false); return }

    fetchItems()

    const channel = supabase
      .channel('wishlist_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wishlist_items' }, (payload) => {
        setItems(prev => [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wishlist_items' }, (payload) => {
        setItems(prev => prev.map(item => item.id === payload.new.id ? payload.new : item))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'wishlist_items' }, (payload) => {
        setItems(prev => prev.filter(item => item.id !== payload.old.id))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [playerName])

  async function fetchItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error) setItems(data || [])
    setLoading(false)
  }

  function handleSetName(name) {
    localStorage.setItem('poe_player_name', name)
    setPlayerName(name)
  }

  async function handleAddItem(item) {
    await supabase.from('wishlist_items').insert({
      player_name: playerName,
      type: item.type,
      item_name: item.name,
      icon_url: item.icon || null,
    })
  }

  async function handleClaim(itemId) {
    await supabase.from('wishlist_items').update({ claimed_by: playerName }).eq('id', itemId)
  }

  async function handleUnclaim(itemId) {
    await supabase.from('wishlist_items').update({ claimed_by: null, stash_note: null }).eq('id', itemId)
  }

  async function handleUpdateStashNote(itemId, note) {
    await supabase.from('wishlist_items').update({ stash_note: note || null }).eq('id', itemId)
  }

  async function handleDelete(itemId) {
    await supabase.from('wishlist_items').delete().eq('id', itemId)
  }

  async function handleLeagueReset() {
    const input = prompt('Type "reset" to wipe all wishlists for the new league. This cannot be undone.')
    if (input?.toLowerCase().trim() !== 'reset') return
    await supabase.from('wishlist_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }

  if (!playerName) return <NamePicker onSetName={handleSetName} />

  const myItems = items.filter(i => i.player_name === playerName)
  const allPlayers = [...new Set(items.map(i => i.player_name))]
  const unclaimedCount = items.filter(i => !i.claimed_by).length

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="header-title">Wishlist</h1>
          {!loading && items.length > 0 && (
            <span className="header-stats">{items.length} items · {unclaimedCount} unclaimed</span>
          )}
        </div>
        <div className="header-right">
          <span className="header-player">{playerName}</span>
          <button className="btn-ghost btn-sm" onClick={() => handleSetName('')}>Change name</button>
          {import.meta.env.VITE_ADMIN_NAME && playerName === import.meta.env.VITE_ADMIN_NAME && (
            <button className="btn-danger btn-sm" onClick={handleLeagueReset}>New league</button>
          )}
        </div>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-btn ${tab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
          {!loading && items.length > 0 && <span className="tab-count">{items.length}</span>}
        </button>
        <button
          className={`tab-btn ${tab === 'my-list' ? 'active' : ''}`}
          onClick={() => setTab('my-list')}
        >
          My Wishlist
          {myItems.length > 0 && <span className="tab-count">{myItems.length}</span>}
        </button>
      </nav>

      {tab === 'overview' ? (
        <OverviewTab
          items={items}
          players={allPlayers}
          playerName={playerName}
          loading={loading}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onUpdateStashNote={handleUpdateStashNote}
        />
      ) : (
        <MyListTab
          items={myItems}
          playerName={playerName}
          loading={loading}
          onAdd={() => setShowAddModal(true)}
          onClaim={handleClaim}
          onUnclaim={handleUnclaim}
          onUpdateStashNote={handleUpdateStashNote}
          onDelete={handleDelete}
        />
      )}

      {showAddModal && (
        <AddItemModal onClose={() => setShowAddModal(false)} onAdd={handleAddItem} />
      )}
    </div>
  )
}

// ─── Overview tab: compact grid of player cards ──────────────────────────────

function OverviewTab({ items, players, playerName, loading, onClaim, onUnclaim, onUpdateStashNote }) {
  if (loading) return <p className="state-msg">Loading...</p>
  if (players.length === 0) return (
    <p className="state-msg">No items yet — go to My Wishlist and add what you're hunting!</p>
  )

  return (
    <div className="overview-grid">
      {players.map(player => {
        const playerItems = items.filter(i => i.player_name === player)
        const unclaimed = playerItems.filter(i => !i.claimed_by).length
        const isMe = player === playerName
        return (
          <div key={player} className={`ov-card ${isMe ? 'ov-card-me' : ''}`}>
            <div className="ov-card-header">
              <span className="ov-player-name">{player}{isMe && <span className="ov-you-tag">you</span>}</span>
            </div>
            <div className="ov-items">
              {playerItems.map(item => (
                <OverviewRow
                  key={item.id}
                  item={item}
                  playerName={playerName}
                  onClaim={onClaim}
                  onUnclaim={onUnclaim}
                  onUpdateStashNote={onUpdateStashNote}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OverviewRow({ item, playerName, onClaim, onUnclaim, onUpdateStashNote }) {
  const [claiming, setClaiming] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteValue, setNoteValue] = useState('')

  const isClaimed = !!item.claimed_by
  const isClaimedByMe = item.claimed_by === playerName
  const isOwn = item.player_name === playerName

  function handleClaim() {
    onClaim(item.id)
    setNoteValue('')
    setClaiming(true)
  }

  function handleNoteDone() {
    if (noteValue.trim()) onUpdateStashNote(item.id, noteValue.trim())
    setClaiming(false)
  }

  function handleNoteKeyDown(e) {
    if (e.key === 'Enter') handleNoteDone()
    if (e.key === 'Escape') setClaiming(false)
  }

  // Show stash input immediately after clicking Claim
  if (claiming) {
    return (
      <div className="ov-row ov-row-claiming">
        {item.icon_url
          ? <img src={item.icon_url} alt="" className="ov-icon" />
          : <span className="ov-icon-ph">{item.type === 'unique' ? '◆' : '⬡'}</span>
        }
        <span className="ov-claiming-label">Guild stash tab:</span>
        <input
          value={noteValue}
          onChange={e => setNoteValue(e.target.value)}
          onKeyDown={handleNoteKeyDown}
          placeholder="e.g. Tab 3, Gems..."
          className="ov-note-input"
          autoFocus
          maxLength={64}
        />
        <button className="ov-note-save" onClick={handleNoteDone}>Done</button>
        <button className="ov-skip-btn" onClick={() => setClaiming(false)}>Skip</button>
      </div>
    )
  }

  // Show edit input when clicking the stash note
  if (isClaimedByMe && editingNote) {
    return (
      <div className="ov-row ov-row-claiming">
        {item.icon_url
          ? <img src={item.icon_url} alt="" className="ov-icon" />
          : <span className="ov-icon-ph">{item.type === 'unique' ? '◆' : '⬡'}</span>
        }
        <span className="ov-claiming-label">Guild stash tab:</span>
        <input
          value={noteValue}
          onChange={e => setNoteValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onUpdateStashNote(item.id, noteValue.trim()); setEditingNote(false) }
            if (e.key === 'Escape') setEditingNote(false)
          }}
          placeholder="e.g. Tab 3, Gems..."
          className="ov-note-input"
          autoFocus
          maxLength={64}
        />
        <button className="ov-note-save" onClick={() => { onUpdateStashNote(item.id, noteValue.trim()); setEditingNote(false) }}>Done</button>
        <button className="ov-skip-btn" onClick={() => setEditingNote(false)}>Cancel</button>
      </div>
    )
  }

  return (
    <div className={`ov-row ${isClaimed ? 'ov-row-claimed' : ''}`}>
      {item.icon_url
        ? <img src={item.icon_url} alt="" className="ov-icon" />
        : <span className="ov-icon-ph">{item.type === 'unique' ? '◆' : '⬡'}</span>
      }
      <span className={`ov-name ${item.type}`}>{item.item_name}</span>
      <div className="ov-action">
        {!isClaimed && !isOwn && (
          <button className="ov-btn-claim" onClick={handleClaim}>Claim</button>
        )}
        {isClaimed && (
          <span className="ov-claimed-by">
            <span className="ov-check">✓</span>
            {isClaimedByMe ? (
              <span
                className="ov-note-label"
                onClick={() => { setNoteValue(item.stash_note || ''); setEditingNote(true) }}
                title="Click to edit stash tab"
              >
                {item.stash_note ? `you · ${item.stash_note}` : 'you · + stash tab'}
              </span>
            ) : (
              <span>{item.claimed_by}{item.stash_note ? ` · ${item.stash_note}` : ''}</span>
            )}
            {isClaimedByMe && (
              <button className="ov-btn-unclaim" onClick={() => onUnclaim(item.id)} title="Unclaim">×</button>
            )}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── My wishlist tab ──────────────────────────────────────────────────────────

function MyListTab({ items, playerName, loading, onAdd, onClaim, onUnclaim, onUpdateStashNote, onDelete }) {
  return (
    <div className="my-list-view">
      <div className="my-list-header">
        <h2>My Wishlist</h2>
        <button className="btn-primary" onClick={onAdd}>+ Add item</button>
      </div>
      {loading ? (
        <p className="state-msg">Loading...</p>
      ) : items.length === 0 ? (
        <p className="state-msg">Nothing here yet. Add the items you're hunting for this league!</p>
      ) : (
        <div className="item-list">
          {items.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              playerName={playerName}
              onClaim={onClaim}
              onUnclaim={onUnclaim}
              onUpdateStashNote={onUpdateStashNote}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
