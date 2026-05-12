import { useState, useEffect, useRef } from 'react'

export default function Timer({ startedAt, timeLimit, onExpire }) {
  const [remaining, setRemaining] = useState(timeLimit)
  const onExpireRef = useRef(onExpire)
  const firedRef = useRef(false)
  onExpireRef.current = onExpire

  useEffect(() => {
    firedRef.current = false
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
      const rem = Math.max(0, timeLimit - elapsed)
      setRemaining(rem)
      if (rem <= 0 && !firedRef.current) {
        firedRef.current = true
        onExpireRef.current?.()
      }
    }
    tick()
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [startedAt, timeLimit])

  const pct = Math.max(0, (remaining / timeLimit) * 100)
  const secs = Math.ceil(remaining)
  const urgent = remaining <= 5
  const barColor = urgent ? '#e52521' : pct > 50 ? '#43b047' : '#fbd000'

  return (
    <div className="flex items-center gap-3 w-full">
      <div
        className="pixel tabular-nums w-12 text-right shrink-0 text-xl"
        style={{ color: urgent ? '#e52521' : '#fbd000' }}
      >
        {secs}
      </div>
      <div className="flex-1 h-5 bg-black border-2 border-white overflow-hidden" style={{ boxShadow: '0 3px 0 rgba(0,0,0,0.5)' }}>
        <div
          className="h-full transition-[width] duration-200"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}
