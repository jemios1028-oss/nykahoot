import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import WaitingView from '../components/WaitingView'
import QuestionView from '../components/QuestionView'
import RankingView from '../components/RankingView'
import FinishedView from '../components/FinishedView'

export default function GamePage() {
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [gameState, setGameState] = useState(null)
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastAnswerResult, setLastAnswerResult] = useState(null)

  useEffect(() => {
    const id = localStorage.getItem('studentId')
    if (!id) { navigate('/'); return }
    setStudent({
      id,
      grade: parseInt(localStorage.getItem('studentGrade')),
      class: parseInt(localStorage.getItem('studentClass')),
      nickname: localStorage.getItem('studentNickname'),
    })
  }, [navigate])

  useEffect(() => {
    async function init() {
      // 새 게임 리셋 후 남아있는 stale localStorage 감지 → 퇴장
      const studentId = localStorage.getItem('studentId')
      if (studentId) {
        const { data: exists } = await supabase
          .from('students').select('id').eq('id', studentId).maybeSingle()
        if (!exists) {
          localStorage.clear()
          navigate('/')
          return
        }
      }

      const { data } = await supabase.from('game_state').select('*').single()
      if (data) {
        setGameState(data)
        if (data.current_question_id) {
          const { data: q } = await supabase.from('questions').select('*').eq('id', data.current_question_id).single()
          setQuestion(q)
        }
      }
      setLoading(false)
    }
    init()

    const id = localStorage.getItem('studentId')

    const channel = supabase
      .channel('game-state-student')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' },
        async (payload) => {
          const next = payload.new

          // 게임이 lobby로 리셋됐을 때 학생 레코드가 삭제됐으면 퇴장
          if (next.phase === 'lobby' && id) {
            const { data: stillExists } = await supabase
              .from('students').select('id').eq('id', id).maybeSingle()
            if (!stillExists) {
              localStorage.clear()
              navigate('/')
              return
            }
          }

          if (next.phase === 'question_active') setLastAnswerResult(null)
          setGameState(next)
          if (next.current_question_id) {
            const { data: q } = await supabase.from('questions').select('*').eq('id', next.current_question_id).single()
            setQuestion(q)
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-zinc-500">로딩 중...</div>
      </div>
    )
  }

  const phase = gameState?.phase || 'lobby'

  return (
    <>
      {phase === 'lobby' && <WaitingView student={student} />}
      {phase === 'question_active' && (
        <QuestionView
          gameState={gameState}
          question={question}
          student={student}
          onAnswerSubmit={setLastAnswerResult}
        />
      )}
      {phase === 'ranking' && <RankingView student={student} lastAnswerResult={lastAnswerResult} question={question} />}
      {phase === 'finished' && <FinishedView student={student} />}
    </>
  )
}
