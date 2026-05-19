import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Timer from './Timer'

const OPTION_STYLES = [
  { bg: '#e52521', hover: '#c41e1b', label: '①' },
  { bg: '#049cd8', hover: '#0380b4', label: '②' },
  { bg: '#fbd000', hover: '#d4af00', label: '③', dark: true },
  { bg: '#43b047', hover: '#368f39', label: '④' },
]

function normalize(str) {
  return str.toLowerCase().replace(/\s+/g, '')
}

export default function QuestionView({ gameState, question, student }) {
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(null)
  const [earnedScore, setEarnedScore] = useState(0)
  const [shortInput, setShortInput] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    setSubmitted(false)
    setIsCorrect(null)
    setEarnedScore(0)
    setShortInput('')
    setExpired(false)
  }, [question?.id])

  const submit = useCallback(async (answerText) => {
    if (submitted || !question || !student) return
    setSubmitted(true)

    const responseMs = Date.now() - new Date(gameState.question_started_at).getTime()
    const correct = normalize(answerText) === normalize(question.answer)
    const timeLimitMs = question.time_limit * 1000
    const score = correct
      ? Math.max(500, Math.round(1000 * (1 - 0.5 * (responseMs / timeLimitMs))))
      : 0

    setIsCorrect(correct)
    setEarnedScore(score)

    await supabase.from('answers').upsert({
      student_id: student.id,
      question_id: question.id,
      answer_text: answerText,
      is_correct: correct,
      response_time_ms: responseMs,
      score,
    }, { onConflict: 'student_id,question_id' })
  }, [submitted, question, student, gameState?.question_started_at])

  const handleExpire = useCallback(() => setExpired(true), [])

  if (!question) return (
    <div className="mario-bg flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="text-gray-400 text-sm">로딩 중...</div>
    </div>
  )

  return (
    <div className="mario-bg flex flex-col" style={{ minHeight: '100vh' }}>

      {/* 타이머 헤더 */}
      <div className="px-4 py-3" style={{ background: '#000820', borderBottom: '3px solid white' }}>
        <div className="max-w-xl mx-auto">
          <Timer
            startedAt={gameState.question_started_at}
            timeLimit={question.time_limit}
            onExpire={handleExpire}
          />
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-5 flex flex-col gap-4">

        {/* 문제 카드 */}
        <div className="mario-panel p-5">
          {question.content && (
            <p className="text-white text-base font-bold leading-relaxed mb-3">{question.content}</p>
          )}
          {question.image_url && (
            <img
              src={question.image_url} alt="문제 이미지"
              className="w-full object-contain max-h-64"
              style={{ border: '2px solid white' }}
            />
          )}
        </div>

        {/* 보기 / 입력 */}
        {!expired && !submitted && (
          <>
            {question.type === 'multiple_choice' && Array.isArray(question.options) && (
              <div className="grid grid-cols-2 gap-3">
                {question.options.map((opt, i) => {
                  const style = OPTION_STYLES[i % 4]
                  return (
                    <button
                      key={i}
                      onClick={() => submit(opt)}
                      className="mario-btn border border-gray-300 text-left p-4 flex items-start gap-2 rounded"
                      style={{
                        backgroundColor: style.bg,
                        color: style.dark ? '#111' : '#fff',
                      }}
                    >
                      <span className="text-xs shrink-0 opacity-80 mt-0.5">{style.label}</span>
                      <span className="text-sm font-bold leading-snug">{opt}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {question.type === 'short_answer' && (
              <form
                onSubmit={e => { e.preventDefault(); if (shortInput.trim()) submit(shortInput.trim()) }}
                className="flex gap-2"
              >
                <input
                  type="text" value={shortInput} onChange={e => setShortInput(e.target.value)}
                  placeholder="정답 입력..." autoFocus
                  className="mario-input flex-1 px-4 py-3 text-sm"
                />
                <button
                  type="submit"
                  disabled={!shortInput.trim()}
                  className="mario-btn px-5 border border-gray-300 text-gray-700 font-bold text-sm rounded"
                  style={{ backgroundColor: '#e5e7eb' }}
                >
                  제출
                </button>
              </form>
            )}
          </>
        )}

        {/* 결과 피드백 */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mario-panel p-6 text-center"
              style={{ borderColor: isCorrect ? '#86efac' : '#fca5a5' }}
            >
              <div className="text-4xl mb-3">{isCorrect ? '✓' : '✗'}</div>
              <div className="text-base font-bold mb-2" style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>
                {isCorrect ? '정답!' : '오답'}
              </div>
              {isCorrect && (
                <div className="text-sm text-gray-500 mb-3">
                  +{earnedScore.toLocaleString()} 점
                </div>
              )}
              <div className="text-gray-400 text-xs mt-2">순위 발표를 기다리는 중...</div>
            </motion.div>
          )}

          {expired && !submitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mario-panel p-6 text-center"
              style={{ borderColor: '#fca5a5' }}
            >
              <div className="text-3xl mb-3">⏰</div>
              <div className="text-sm font-bold text-red-500">
                시간 초과
              </div>
              <div className="text-gray-400 text-xs mt-3">순위 발표를 기다리는 중...</div>
            </motion.div>
          )}
        </AnimatePresence>

        {student && (
          <div className="text-xs text-center mt-auto pt-2 text-gray-300">
            {student.grade}-{student.class}반 · {student.nickname}
          </div>
        )}
      </div>
    </div>
  )
}
