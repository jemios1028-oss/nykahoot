import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

const BAR_COLORS = ['#fbd000', '#C0C0C0', '#CD7F32', '#049cd8', '#43b047', '#e52521', '#8b5cf6', '#f59e0b']
const CHART_H = 180

function CountUp({ target }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = null
    const duration = 1200
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target])
  return val.toLocaleString()
}

export default function RankingView({ student }) {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_class_rankings').then(({ data }) => {
      setRankings(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="mario-bg flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="text-gray-400 text-sm">로딩 중...</div>
    </div>
  )

  const maxScore = Math.max(...rankings.map(r => Number(r.total_score)), 1)
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="mario-bg flex flex-col" style={{ minHeight: '100vh' }}>
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex flex-col gap-6">

        {/* 제목 */}
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="text-base font-bold text-gray-800 mb-1">
            순위 현황
          </div>
          <p className="text-gray-400 text-xs mt-2">다음 문제를 기다리는 중...</p>
        </motion.div>

        {/* 막대 그래프 */}
        <div className="mario-panel p-5 overflow-x-auto">
          <div
            className="flex items-end justify-center gap-4 min-w-fit"
            style={{ height: CHART_H }}
          >
            {rankings.map((r, i) => {
              const score = Number(r.total_score)
              const barH = Math.max(score / maxScore * (CHART_H - 48), 6)
              const color = BAR_COLORS[i % BAR_COLORS.length]
              const isMe = student && Number(r.grade) === student.grade && Number(r.class) === student.class

              return (
                <motion.div
                  key={`${r.grade}-${r.class}`}
                  className="flex flex-col items-center"
                  style={{ width: 52 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="text-[10px] mb-1.5 tabular-nums font-bold" style={{ color }}>
                    <CountUp target={score} />
                  </div>
                  <motion.div
                    style={{
                      backgroundColor: color,
                      width: 36,
                      border: `2px solid ${isMe ? 'white' : 'rgba(0,0,0,0.3)'}`,
                      boxShadow: isMe ? `0 0 12px ${color}` : 'none',
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: barH }}
                    transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: i * 0.08 }}
                  />
                </motion.div>
              )
            })}
          </div>

          <div className="flex items-start justify-center gap-4 mt-2 min-w-fit">
            {rankings.map((r, i) => (
              <div
                key={`${r.grade}-${r.class}`}
                className="text-[10px] text-center leading-tight font-medium"
                style={{ width: 52, color: BAR_COLORS[i % BAR_COLORS.length] }}
              >
                {r.grade}-{r.class}
              </div>
            ))}
          </div>
        </div>

        {/* 순위 리스트 */}
        <div className="space-y-2">
          {rankings.map((r, i) => {
            const isMe = student && Number(r.grade) === student.grade && Number(r.class) === student.class
            const medal = medals[i] ?? `${i + 1}`

            return (
              <motion.div
                key={`${r.grade}-${r.class}`}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                className="flex items-center justify-between px-4 py-3 border rounded"
                style={{
                  borderColor: isMe ? '#2563eb' : '#e5e7eb',
                  background: isMe ? 'rgba(37,99,235,0.06)' : '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{medal}</span>
                  <span className="font-bold text-sm" style={{ color: isMe ? '#2563eb' : '#111' }}>
                    {r.grade}학년 {r.class}반
                  </span>
                  <span className="text-gray-400 text-xs">{r.student_count}명</span>
                </div>
                <span className="text-xs tabular-nums font-medium" style={{ color: isMe ? '#2563eb' : '#374151' }}>
                  {Number(r.total_score).toLocaleString()}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
