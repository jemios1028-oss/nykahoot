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

      {/* 완료 + 제목 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center mb-8"
      >
        <div className="text-xl font-bold text-gray-800 mb-3">
          테스트 완료
        </div>
        {student && (
          <p className="text-gray-500 text-sm">
            {student.grade}학년 {student.class}반 <span className="font-bold text-gray-800">{student.nickname}</span>님, 수고하셨습니다
          </p>
        )}
      </motion.div>

      {/* 최종 순위 */}
      <div className="w-full max-w-md mb-8">
        <div className="text-xs text-center text-gray-400 mb-4">
          최종 순위
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
                className="flex items-center justify-between px-4 py-3 border rounded"
                style={{
                  borderColor: isMe ? '#2563eb' : '#e5e7eb',
                  background: isMe ? 'rgba(37,99,235,0.06)' : '#fff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{medals[i] ?? `${i + 1}`}</span>
                  <span className="font-bold text-sm" style={{ color: isMe ? '#2563eb' : '#111' }}>
                    {r.grade}학년 {r.class}반
                  </span>
                </div>
                <span className="text-xs tabular-nums font-medium" style={{ color: isMe ? '#2563eb' : '#374151' }}>
                  {Number(r.total_score).toLocaleString()}
                </span>
              </motion.div>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleLeave}
        className="mario-btn px-8 py-3 border border-gray-300 font-medium text-gray-700 rounded"
        style={{ background: '#f9fafb' }}
      >
        <span className="text-sm">처음으로</span>
      </button>
    </div>
  )
}
