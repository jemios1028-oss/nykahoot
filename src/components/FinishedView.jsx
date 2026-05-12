import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const medals = ['🥇', '🥈', '🥉']

export default function FinishedView({ student }) {
  const [rankings, setRankings] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    supabase.rpc('get_class_rankings').then(({ data }) => setRankings(data || []))
  }, [])

  function handleLeave() {
    localStorage.clear()
    navigate('/')
  }

  return (
    <div className="mario-bg flex flex-col items-center justify-center p-4" style={{ minHeight: '100vh' }}>

      {/* 트로피 + 제목 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center mb-8"
      >
        <div className="text-7xl mb-4">🏆</div>
        <div className="pixel text-lg mb-3" style={{ color: '#fbd000', textShadow: '3px 3px 0 #000' }}>
          GAME CLEAR!
        </div>
        {student && (
          <p className="text-white/60 text-sm">
            {student.grade}학년 {student.class}반 <span style={{ color: '#fbd000' }}>{student.nickname}</span>님, 수고하셨습니다
          </p>
        )}
      </motion.div>

      {/* 최종 순위 */}
      <div className="w-full max-w-md mb-8">
        <div className="pixel text-[10px] text-center mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
          FINAL RANKING
        </div>
        <div className="space-y-2">
          {rankings.map((r, i) => {
            const isMe = student && Number(r.grade) === student.grade && Number(r.class) === student.class
            return (
              <motion.div
                key={`${r.grade}-${r.class}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.07 }}
                className="flex items-center justify-between px-4 py-3 border-2"
                style={{
                  borderColor: isMe ? '#fbd000' : 'white',
                  background: isMe ? 'rgba(251,208,0,0.12)' : '#00146e',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.4)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{medals[i] ?? `${i + 1}`}</span>
                  <span className="font-bold text-sm" style={{ color: isMe ? '#fbd000' : '#fff' }}>
                    {r.grade}학년 {r.class}반
                  </span>
                </div>
                <span className="pixel text-xs tabular-nums" style={{ color: isMe ? '#fbd000' : '#fff' }}>
                  {Number(r.total_score).toLocaleString()}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      <motion.button
        onClick={handleLeave}
        className="mario-btn px-8 py-3 border-2 border-black font-bold"
        style={{ background: '#00146e', borderColor: 'white', color: 'white' }}
        whileHover={{ scale: 1.05 }}
      >
        <span className="pixel text-sm">▶ 처음으로</span>
      </motion.button>
    </div>
  )
}
