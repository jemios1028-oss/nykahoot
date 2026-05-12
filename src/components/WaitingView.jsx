import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function WaitingView({ student }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true })
      setCount(count || 0)
    }
    fetchCount()

    const ch = supabase
      .channel('students-lobby')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, fetchCount)
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [])

  return (
    <div className="mario-bg flex flex-col items-center justify-center p-4" style={{ minHeight: '100vh' }}>

      {/* 코인 바운스 애니메이션 */}
      <div className="flex gap-6 mb-8">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="pixel text-2xl"
            style={{ color: '#fbd000', textShadow: '2px 2px 0 #000' }}
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
          >
            ●
          </motion.div>
        ))}
      </div>

      <div className="pixel text-white text-sm mb-2 text-center" style={{ textShadow: '2px 2px 0 #000' }}>
        STAND BY...
      </div>
      <p className="text-white/60 text-sm mb-10 text-center leading-relaxed">
        선생님이 퀴즈를 시작할 때까지<br />기다려주세요
      </p>

      {/* 플레이어 카운터 */}
      <motion.div
        className="mario-panel px-14 py-7 text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          key={count}
          className="pixel tabular-nums mb-2"
          style={{ color: '#fbd000', fontSize: '3rem', textShadow: '3px 3px 0 #000' }}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          {count}
        </motion.div>
        <div className="pixel text-white text-[10px]">PLAYERS</div>
      </motion.div>

      {student && (
        <motion.div
          className="mario-panel-sm mt-8 px-5 py-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-white/70 text-sm">
            {student.grade}학년 {student.class}반 ·{' '}
            <span style={{ color: '#fbd000' }}>{student.nickname}</span>
          </span>
        </motion.div>
      )}

      <div className="mt-10 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>
        ⭐  꿈든벨  ⭐
      </div>
    </div>
  )
}
