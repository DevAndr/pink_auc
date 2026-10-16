import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Lot } from '../types'

const LOT_COLORS = [
  '#ff2d95', '#b026ff', '#ff5ec4', '#7a1fff', '#ff1f5a',
  '#e040fb', '#ff6fa8', '#9b30ff', '#ff3dc8', '#c2185b',
  '#d500f9', '#ff4081', '#8e24aa', '#f50057', '#ea80fc',
]

interface Props {
  lots: Lot[]
  onAdd: (lot: Lot) => void
  onUpdate: (lot: Lot) => void
  onDelete: (id: string) => void
  eliminatedIds: Set<string>
}

export default function LotList({ lots, onAdd, onUpdate, onDelete, eliminatedIds }: Props) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    const lot: Lot = {
      id: crypto.randomUUID(),
      name,
      color: LOT_COLORS[lots.length % LOT_COLORS.length],
    }
    onAdd(lot)
    setNewName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const startEdit = (lot: Lot) => {
    setEditingId(lot.id)
    setEditName(lot.name)
  }

  const saveEdit = (lot: Lot) => {
    const name = editName.trim()
    if (name) {
      onUpdate({ ...lot, name })
    }
    setEditingId(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, lot: Lot) => {
    if (e.key === 'Enter') saveEdit(lot)
    if (e.key === 'Escape') setEditingId(null)
  }

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2><span className="h-icon">♥</span> Лоты</h2>

      <div className="lot-form">
        <input
          type="text"
          placeholder="Название лота..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <motion.button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={!newName.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Добавить
        </motion.button>
      </div>

      {lots.length === 0 ? (
        <motion.div
          className="lot-empty"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Добавьте лоты для начала аукциона
        </motion.div>
      ) : (
        <ul className="lot-list">
          <AnimatePresence mode="popLayout">
            {lots.map(lot => (
              <motion.li
                key={lot.id}
                className={`lot-item${eliminatedIds.has(lot.id) ? ' eliminated' : ''}`}
                layout
                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: eliminatedIds.has(lot.id) ? 0.4 : 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 30, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <motion.span
                  className="lot-color"
                  style={{ backgroundColor: lot.color, color: lot.color }}
                  layoutId={`color-${lot.id}`}
                />
                {editingId === lot.id ? (
                  <input
                    className="lot-name-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => handleEditKeyDown(e, lot)}
                    onBlur={() => saveEdit(lot)}
                    autoFocus
                  />
                ) : (
                  <span className="lot-name">{lot.name}</span>
                )}
                <div className="lot-actions">
                  {editingId !== lot.id && (
                    <motion.button
                      className="btn btn-small"
                      onClick={() => startEdit(lot)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      &#9998;
                    </motion.button>
                  )}
                  <motion.button
                    className="btn btn-danger"
                    onClick={() => onDelete(lot.id)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    &times;
                  </motion.button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.div>
  )
}
