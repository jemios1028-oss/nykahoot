import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function JoinPage() {
  const navigate = useNavigate()
  const [grade, setGrade] = useState('')
  const [cls, setCls] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('studentId')
    if (!id) return
    // 새 게임 후 삭제된 학생일 수 있으므로 DB에서 실제 존재 여부 확인
    supabase.from('students').select('id').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) navigate('/play')
      else localStorage.clear()
    })
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    const g = parseInt(grade)
    const c = parseInt(cls)
    const nick = nickname.trim()

    if (!g || g < 1 || g > 6) return setError('학년은 1~6 사이로 입력해주세요.')
    if (!c || c < 1 || c > 20) return setError('반은 1~20 사이로 입력해주세요.')
    if (!nick) return setError('닉네임을 입력해주세요.')
    if (nick.length > 12) return setError('닉네임은 12자 이하로 입력해주세요.')

    setLoading(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('students')
      .insert({ nickname: nick, grade: g, class: c })
      .select()
      .single()

    if (dbError) {
      setError('접속 중 오류가 발생했습니다. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    localStorage.setItem('studentId', data.id)
    localStorage.setItem('studentGrade', String(g))
    localStorage.setItem('studentClass', String(c))
    localStorage.setItem('studentNickname', nick)
    navigate('/play')
  }

  return (
    <div className="mario-bg flex flex-col items-center justify-center p-4" style={{ minHeight: '100vh' }}>

      {/* 로고 */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-2xl font-bold mb-3" style={{ color: '#fbd000', textShadow: '3px 3px 0 #000', fontFamily: "'Malgun Gothic', sans-serif" }}>
          ⭐ 남양고 꿈든벨 ⭐
        </div>
        <div className="text-white/60 text-sm">26-1 학기단위 프로젝트 [꿈:틀]</div>
      </motion.div>

      {/* 카드 */}
      <motion.div
        className="mario-panel w-full max-w-sm p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <div className="pixel text-center text-xs mb-6" style={{ color: '#fbd000' }}>
          PLAYER SETUP
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="pixel block text-xs mb-2" style={{ color: '#fbd000' }}>학년</label>
              <input
                type="number" value={grade} onChange={e => setGrade(e.target.value)}
                min="1" max="6"
                className="mario-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="pixel block text-xs mb-2" style={{ color: '#fbd000' }}>반</label>
              <input
                type="number" value={cls} onChange={e => setCls(e.target.value)}
                min="1" max="20"
                className="mario-input w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="pixel block text-xs mb-2" style={{ color: '#fbd000' }}>이름</label>
            <input
              type="text" value={nickname} onChange={e => setNickname(e.target.value)}
              maxLength={12}
              className="mario-input w-full px-3 py-2.5 text-sm"
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 border-2 border-[#e52521] text-[#e52521] text-xs text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mario-btn w-full py-3 text-white font-bold border-2 border-black"
            style={{ backgroundColor: '#e52521' }}
          >
            <span className="pixel text-xs">
              {loading ? 'LOADING...' : '▶  START!'}
            </span>
          </button>
        </form>
      </motion.div>

      <motion.div
        className="pixel mt-8 text-sm"
        style={{ color: '#fbd000' }}
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      >
        INSERT COIN
      </motion.div>
    </div>
  )
}
