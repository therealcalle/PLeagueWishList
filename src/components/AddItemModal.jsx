import { useState, useMemo, useRef, useEffect } from 'react'
import itemsData from '../data/items.json'

export default function AddItemModal({ onClose, onAdd }) {
  const [type, setType] = useState('unique')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const pool = type === 'unique' ? itemsData.uniques : itemsData.gems

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return pool.filter(i => i.name.toLowerCase().includes(q)).slice(0, 25)
  }, [search, pool])

  useEffect(() => {
    inputRef.current?.focus()
  }, [type])

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSearchChange(e) {
    setSearch(e.target.value)
    setSelected(null)
    setShowDropdown(true)
  }

  function handleSelect(item) {
    setSelected(item)
    setSearch(item.name)
    setShowDropdown(false)
  }

  function switchType(newType) {
    setType(newType)
    setSearch('')
    setSelected(null)
    setShowDropdown(false)
  }

  function handleAdd() {
    const name = search.trim()
    if (!name) return
    onAdd({
      type,
      name: selected ? selected.name : name,
      icon: selected?.icon ?? null,
    })
    onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && search.trim()) handleAdd()
    if (e.key === 'ArrowDown' && showDropdown && filtered.length > 0) {
      dropdownRef.current?.querySelector('.dropdown-item')?.focus()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Wishlist Item</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="type-tabs">
          <button
            className={`type-tab ${type === 'unique' ? 'active unique' : ''}`}
            onClick={() => switchType('unique')}
          >
            ◆ Unique
          </button>
          <button
            className={`type-tab ${type === 'gem' ? 'active gem' : ''}`}
            onClick={() => switchType('gem')}
          >
            ⬡ Gem
          </button>
        </div>

        <div className="search-container">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={handleSearchChange}
            onFocus={() => search && setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={
              pool.length > 0
                ? `Search ${type === 'unique' ? 'unique items' : 'gems'}...`
                : `Type item name...`
            }
            className="search-input"
          />
          {showDropdown && filtered.length > 0 && (
            <div className="dropdown" ref={dropdownRef}>
              {filtered.map((item, i) => (
                <div
                  key={i}
                  className="dropdown-item"
                  tabIndex={0}
                  onClick={() => handleSelect(item)}
                  onKeyDown={e => e.key === 'Enter' && handleSelect(item)}
                >
                  {item.icon && (
                    <img src={item.icon} alt="" className="dropdown-icon" />
                  )}
                  <span className={`dropdown-name ${type}`}>{item.name}</span>
                  {item.baseType && (
                    <span className="dropdown-base">{item.baseType}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="selected-preview">
            {selected.icon && (
              <img src={selected.icon} alt={selected.name} />
            )}
            <span className={`selected-name ${type}`}>{selected.name}</span>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={!search.trim()}
          >
            Add to Wishlist
          </button>
        </div>
      </div>
    </div>
  )
}
