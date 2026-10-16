import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Lot, AuctionMode } from './types'
import LotList from './components/LotList'
import Wheel from './components/Wheel'
import Settings from './components/Settings'
import './App.css'

function App() {
  const [lots, setLots] = useState<Lot[]>([])
  const [duration, setDuration] = useState(5)
  const [mode, setMode] = useState<AuctionMode>('first-winner')
  const [spinning, setSpinning] = useState(false)
  const [targetAngle, setTargetAngle] = useState(0)
  const [winner, setWinner] = useState<Lot | null>(null)
  const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set())
  const [eliminatedLots, setEliminatedLots] = useState<Lot[]>([])

  const activeLots = lots.filter(l => !eliminatedIds.has(l.id))

  const handleAdd = (lot: Lot) => {
    setLots(prev => [...prev, lot])
  }

  const handleUpdate = (updated: Lot) => {
    setLots(prev => prev.map(l => l.id === updated.id ? updated : l))
  }

  const handleDelete = (id: string) => {
    setLots(prev => prev.filter(l => l.id !== id))
    setEliminatedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const handleSpin = () => {
    if (activeLots.length < 2) return
    setWinner(null)
    setSpinning(true)
    const extraRotations = (5 + Math.random() * 5) * Math.PI * 2
    setTargetAngle(prev => prev + extraRotations + Math.random() * Math.PI * 2)
  }

  const handleSpinEnd = useCallback((winnerLot: Lot) => {
    setSpinning(false)
    setWinner(winnerLot)

    if (mode === 'elimination') {
      setEliminatedIds(prev => new Set(prev).add(winnerLot.id))
      setEliminatedLots(prev => [...prev, winnerLot])
    }
  }, [mode])

  const handleReset = () => {
    setEliminatedIds(new Set())
    setEliminatedLots([])
    setWinner(null)
    setSpinning(false)
  }

  const isGameOver = mode === 'elimination' && activeLots.length <= 1 && eliminatedLots.length > 0
  const finalWinner = isGameOver ? activeLots[0] : null

  return (
    <div className="app">
      <motion.header
        className="app-header"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
      >
        <h1>Pink Auction</h1>
        <p>
          {mode === 'first-winner' ? 'Первый победитель' : 'На выбывание'}
          {' '}&mdash; {lots.length} лот(ов)
        </p>
      </motion.header>

      <div className="app-body">
        <div>
          <LotList
            lots={lots}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            eliminatedIds={eliminatedIds}
          />
          <Settings
            duration={duration}
            onDurationChange={setDuration}
            mode={mode}
            onModeChange={setMode}
          />
        </div>

        <motion.div
          className="wheel-area"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Wheel
            lots={activeLots}
            spinning={spinning}
            targetAngle={targetAngle}
            duration={duration}
            onSpinEnd={handleSpinEnd}
          />

          <div className="wheel-controls">
            <motion.button
              className="btn-spin"
              onClick={handleSpin}
              disabled={spinning || activeLots.length < 2}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
            >
              {spinning ? 'Крутится...' : 'Крутить!'}
            </motion.button>
            <AnimatePresence>
              {(eliminatedLots.length > 0 || winner) && (
                <motion.button
                  className="btn-reset"
                  onClick={handleReset}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Сбросить
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            {winner && !isGameOver && (
              <motion.div
                key={`winner-${winner.id}`}
                className="winner-banner"
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <h3>{mode === 'elimination' ? 'Выбывает' : 'Победитель'}</h3>
                <motion.div
                  className="winner-name"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 1.1, 1] }}
                  transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                >
                  {winner.name}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {finalWinner && (
              <motion.div
                className="winner-banner"
                initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <h3>Финальный победитель</h3>
                <motion.div
                  className="winner-name"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {finalWinner.name}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {eliminatedLots.length > 0 && (
              <motion.div
                className="eliminated-list"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <h3>Выбывшие:</h3>
                <div className="eliminated-items">
                  <AnimatePresence>
                    {eliminatedLots.map((l, i) => (
                      <motion.span
                        key={l.id}
                        className="eliminated-tag"
                        initial={{ opacity: 0, scale: 0, x: -20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        {l.name}
                      </motion.span>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

export default App
