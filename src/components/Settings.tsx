import type { AuctionMode } from '../types'

interface Props {
  duration: number
  onDurationChange: (d: number) => void
  mode: AuctionMode
  onModeChange: (m: AuctionMode) => void
}

export default function Settings({ duration, onDurationChange, mode, onModeChange }: Props) {
  return (
    <div className="card settings">
      <div className="setting-row">
        <label>Режим</label>
        <select value={mode} onChange={e => onModeChange(e.target.value as AuctionMode)}>
          <option value="first-winner">Первый победитель</option>
          <option value="elimination">На выбывание</option>
        </select>
      </div>
      <div className="setting-row">
        <label>Длительность</label>
        <input
          type="range"
          min={2}
          max={15}
          step={1}
          value={duration}
          onChange={e => onDurationChange(Number(e.target.value))}
        />
        <span className="duration-value">{duration}с</span>
      </div>
    </div>
  )
}
