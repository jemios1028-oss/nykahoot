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

      <div className="text-gray-700 text-sm font-bold mb-2 text-center">
        대기 중
      </div>
      <p className="text-gray-500 text-sm mb-10 text-center leading-relaxed">
        담당자가 시작할 때까지<br />기다려주세요
      </p>

      {/* 접속자 카운터 */}
      <div className="mario-panel px-14 py-7 text-center">
        <div className="tabular-nums mb-2 font-bold text-gray-900" style={{ fontSize: '3rem' }}>
          {count}
        </div>
        <div className="text-gray-400 text-xs">접속자</div>
      </div>

      {student && (
        <div className="mario-panel-sm mt-8 px-5 py-2.5">
          <span className="text-gray-600 text-sm">
            {student.grade}학년 {student.class}반 ·{' '}
            <span className="font-bold text-gray-900">{student.nickname}</span>
          </span>
        </div>
      )}
    </div>
  )
}
