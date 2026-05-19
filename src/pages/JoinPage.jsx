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
      <div className="text-center mb-8">
        <div className="text-xl font-bold mb-2" style={{ color: '#111' }}>
          베타테스트
        </div>
        <div className="text-gray-500 text-sm">남양고등학교 교육과정부</div>
      </div>

      {/* 카드 */}
      <div className="mario-panel w-full max-w-sm p-6">
        <div className="text-center text-xs text-gray-400 mb-6">
          접속 정보 입력
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">학년</label>
              <input
                type="number" value={grade} onChange={e => setGrade(e.target.value)}
                min="1" max="6"
                className="mario-input w-full px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">반</label>
              <input
                type="number" value={cls} onChange={e => setCls(e.target.value)}
                min="1" max="20"
                className="mario-input w-full px-3 py-2.5 text-sm"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-600 mb-2">이름</label>
            <input
              type="text" value={nickname} onChange={e => setNickname(e.target.value)}
              maxLength={12}
              className="mario-input w-full px-3 py-2.5 text-sm"
            />
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 border border-red-300 text-red-500 text-xs text-center rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mario-btn w-full py-3 text-white font-bold rounded"
            style={{ backgroundColor: '#374151' }}
          >
            <span className="text-sm">
              {loading ? '접속 중...' : '접속하기'}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
