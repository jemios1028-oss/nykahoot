import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import Timer from '../../components/Timer'

const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD

const PHASE_LABEL = {
  lobby:           { text: 'LOBBY',    color: '#aaa',    bg: 'rgba(170,170,170,0.15)' },
  question_active: { text: 'LIVE',     color: '#43b047', bg: 'rgba(67,176,71,0.15)' },
  ranking:         { text: 'RESULT',   color: '#fbd000', bg: 'rgba(251,208,0,0.15)' },
  finished:        { text: 'FINISHED', color: '#e52521', bg: 'rgba(229,37,33,0.15)' },
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(sessionStorage.getItem('adminAuth') === '1')
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const [gameState, setGameState] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questions, setQuestions] = useState([])
  const [studentCount, setStudentCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState('multiple_choice')
  const [formContent, setFormContent] = useState('')
  const [formOptions, setFormOptions] = useState(['', '', '', ''])
  const [formAnswerIdx, setFormAnswerIdx] = useState(null)
  const [formAnswer, setFormAnswer] = useState('')
  const [formTimeLimit, setFormTimeLimit] = useState(30)
  const [formImage, setFormImage] = useState(null)
  const [formImagePreview, setFormImagePreview] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const fileRef = useRef()

  const fetchQuestions = useCallback(async () => {
    const { data } = await supabase.from('questions').select('*').order('order_index', { ascending: true })
    setQuestions(data || [])
  }, [])

  const fetchStudentCount = useCallback(async () => {
    const { count } = await supabase.from('students').select('*', { count: 'exact', head: true })
    setStudentCount(count || 0)
  }, [])

  const fetchCurrentQuestion = useCallback(async (id) => {
    if (!id) { setCurrentQuestion(null); return }
    const { data } = await supabase.from('questions').select('*').eq('id', id).single()
    setCurrentQuestion(data)
  }, [])

  const fetchRankings = useCallback(async () => {
    const { data } = await supabase.rpc('get_class_rankings')
    setRankings(data || [])
  }, [])

  useEffect(() => {
    if (!authed) return

    async function init() {
      const [{ data: gs }] = await Promise.all([
        supabase.from('game_state').select('*').single(),
        fetchQuestions(),
        fetchStudentCount(),
      ])
      if (gs) {
        setGameState(gs)
        await fetchCurrentQuestion(gs.current_question_id)
      }
      setLoading(false)
    }
    init()

    const channel = supabase
      .channel('admin-game-state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' },
        async (payload) => {
          setGameState(payload.new)
          await fetchCurrentQuestion(payload.new.current_question_id)
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students' }, fetchStudentCount)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [authed, fetchQuestions, fetchStudentCount, fetchCurrentQuestion])

  useEffect(() => {
    if (gameState?.phase === 'ranking') {
      fetchRankings()
    } else {
      setRankings([])
    }
  }, [gameState?.phase, fetchRankings])

  useEffect(() => {
    const questionId = currentQuestion?.id
    if (gameState?.phase !== 'question_active' || !questionId) {
      setAnsweredCount(0)
      return
    }
    const poll = async () => {
      const { count } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', questionId)
      setAnsweredCount(count || 0)
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [gameState?.phase, currentQuestion?.id])

  async function handleStart() {
    const first = questions[0]
    if (!first) { alert('등록된 문제가 없습니다.'); return }
    await supabase.from('game_state').update({
      phase: 'question_active',
      current_question_id: first.id,
      question_started_at: new Date().toISOString(),
    }).eq('id', 1)
  }

  async function handleNext() {
    if (!currentQuestion) return
    const nextQ = questions.find(q => q.order_index > currentQuestion.order_index)
    if (!nextQ) {
      await supabase.from('game_state').update({ phase: 'finished' }).eq('id', 1)
      return
    }
    await supabase.from('game_state').update({
      phase: 'question_active',
      current_question_id: nextQ.id,
      question_started_at: new Date().toISOString(),
    }).eq('id', 1)
  }

  const handleTimerExpire = useCallback(async () => {
    await supabase
      .from('game_state')
      .update({ phase: 'ranking' })
      .eq('id', 1)
      .eq('phase', 'question_active')
  }, [])

  async function resetGame() {
    await supabase.from('answers').delete().not('student_id', 'is', null)
    await supabase.from('students').delete().not('id', 'is', null)
    await supabase.from('game_state').update({
      phase: 'lobby',
      current_question_id: null,
      question_started_at: null,
    }).eq('id', 1)
    setStudentCount(0)
  }

  async function handleReset() {
    if (!confirm('모든 학생 정보와 답변이 초기화됩니다. 계속하시겠습니까?')) return
    await resetGame()
  }

  async function handleNewGame() {
    if (!confirm('모든 참가자를 내보내고 새 게임을 시작합니다. 계속하시겠습니까?')) return
    await resetGame()
  }

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFormImage(file)
    setFormImagePreview(URL.createObjectURL(file))
  }

  function resetForm() {
    setFormType('multiple_choice')
    setFormContent('')
    setFormOptions(['', '', '', ''])
    setFormAnswerIdx(null)
    setFormAnswer('')
    setFormTimeLimit(30)
    setFormImage(null)
    setFormImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleAddQuestion(e) {
    e.preventDefault()
    setFormLoading(true)

    let imageUrl = null
    if (formImage) {
      const ext = formImage.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(path, formImage)
      if (uploadError) { alert('이미지 업로드 실패: ' + uploadError.message); setFormLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('question-images').getPublicUrl(uploadData.path)
      imageUrl = publicUrl
    }

    const answer = formType === 'multiple_choice'
      ? (formAnswerIdx !== null ? formOptions[formAnswerIdx] : '')
      : formAnswer.trim()

    if (!answer) { alert('정답을 설정해주세요.'); setFormLoading(false); return }
    if (!formContent.trim() && !imageUrl) { alert('문제 내용 또는 이미지를 입력해주세요.'); setFormLoading(false); return }

    const maxIdx = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) : -1

    await supabase.from('questions').insert({
      type: formType,
      content: formContent.trim() || null,
      image_url: imageUrl,
      options: formType === 'multiple_choice' ? formOptions.filter(o => o.trim()) : null,
      answer,
      time_limit: formTimeLimit,
      order_index: maxIdx + 1,
    })

    await fetchQuestions()
    resetForm()
    setShowForm(false)
    setFormLoading(false)
  }

  async function handleDeleteQuestion(id) {
    if (!confirm('이 문제를 삭제하시겠습니까?')) return
    await supabase.from('questions').delete().eq('id', id)
    await fetchQuestions()
  }

  function handleLogin(e) {
    e.preventDefault()
    if (pwInput === ADMIN_PW) {
      sessionStorage.setItem('adminAuth', '1')
      setAuthed(true)
    } else {
      setPwError('비밀번호가 올바르지 않습니다.')
    }
  }

  // ── 로그인 화면 ─────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="mario-bg flex flex-col items-center justify-center p-4" style={{ minHeight: '100vh' }}>
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <div className="pixel text-sm mb-1" style={{ color: '#fbd000', textShadow: '2px 2px 0 #000' }}>
            ADMIN ROOM
          </div>
        </div>
        <div className="mario-panel w-full max-w-xs p-6">
          <div className="pixel text-[10px] mb-5 text-center" style={{ color: '#fbd000' }}>
            PASSWORD
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password" value={pwInput} onChange={e => setPwInput(e.target.value)}
              placeholder="관리자 비밀번호" autoFocus
              className="mario-input w-full px-3 py-2.5 text-sm"
            />
            {pwError && (
              <p className="text-xs text-center" style={{ color: '#e52521' }}>{pwError}</p>
            )}
            <button
              type="submit"
              className="mario-btn w-full py-3 border-2 border-black text-white"
              style={{ backgroundColor: '#e52521' }}
            >
              <span className="pixel text-xs">▶ LOGIN</span>
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="mario-bg flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="pixel text-white text-xs">LOADING...</div>
    </div>
  )

  const phase = gameState?.phase || 'lobby'
  const phaseInfo = PHASE_LABEL[phase] || PHASE_LABEL.lobby
  const currentIdx = currentQuestion ? questions.findIndex(q => q.id === currentQuestion.id) : -1
  const answerPct = studentCount > 0 ? Math.min(100, (answeredCount / studentCount) * 100) : 0

  return (
    <div className="mario-bg" style={{ minHeight: '100vh' }}>

      {/* 헤더 */}
      <div style={{ background: '#000820', borderBottom: '3px solid white' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="pixel text-xs" style={{ color: '#fbd000' }}>⭐ QUIZ TIME</span>
            <span className="pixel text-[8px]" style={{ color: 'rgba(255,255,255,0.4)' }}>ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 border-2 border-white" style={{ background: 'rgba(67,176,71,0.15)' }}>
              <span className="pixel text-lg tabular-nums" style={{ color: '#43b047' }}>{studentCount}</span>
              <span className="text-white/70 text-sm font-bold">명 접속</span>
            </div>
            <button
              onClick={() => { sessionStorage.removeItem('adminAuth'); setAuthed(false) }}
              className="pixel text-[9px] text-white/40 hover:text-white transition"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* 게임 현황 패널 */}
        <div className="mario-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="pixel text-xs text-white">GAME STATUS</span>
            <span
              className="pixel text-[9px] px-3 py-1 border-2 border-current"
              style={{ color: phaseInfo.color, background: phaseInfo.bg }}
            >
              {phaseInfo.text}
            </span>
          </div>

          {/* 현재 문제 정보 */}
          {currentQuestion && (
            <div className="mb-4 p-3 border-2 border-white/20" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2 text-white/50 text-xs mb-1">
                <span className="pixel text-[8px]">Q{currentIdx + 1}/{questions.length}</span>
                <span>·</span>
                <span>{currentQuestion.type === 'multiple_choice' ? '객관식' : '주관식'}</span>
                <span>·</span>
                <span>{currentQuestion.time_limit}초</span>
              </div>
              {currentQuestion.content && (
                <p className="text-white text-sm truncate">{currentQuestion.content}</p>
              )}
              {currentQuestion.image_url && !currentQuestion.content && (
                <p className="text-white/50 text-sm">[이미지 문제]</p>
              )}
            </div>
          )}

          {/* 타이머 */}
          {phase === 'question_active' && currentQuestion && gameState?.question_started_at && (
            <div className="mb-4">
              <Timer
                startedAt={gameState.question_started_at}
                timeLimit={currentQuestion.time_limit}
                onExpire={handleTimerExpire}
              />
            </div>
          )}

          {/* 컨트롤 버튼 */}
          <div className="flex gap-3 flex-wrap items-center">
            {phase === 'lobby' && (
              <button
                onClick={handleStart}
                disabled={questions.length === 0}
                className="mario-btn px-6 py-2.5 border-2 border-black text-black font-bold"
                style={{ backgroundColor: '#43b047' }}
              >
                <span className="pixel text-[10px]">▶ 퀴즈 시작</span>
              </button>
            )}

            {phase === 'ranking' && (
              <button
                onClick={handleNext}
                className="mario-btn px-6 py-2.5 border-2 border-black font-bold"
                style={{ backgroundColor: '#fbd000', color: '#111' }}
              >
                <span className="pixel text-[10px]">다음 문제 ▶</span>
              </button>
            )}

            {phase === 'ranking' && rankings.length > 0 && (
              <div className="w-full mt-1 pt-4" style={{ borderTop: '2px solid rgba(255,255,255,0.12)' }}>
                <div className="pixel text-[9px] mb-3" style={{ color: '#fbd000' }}>⭐ 중간 결과</div>
                {(() => {
                  const maxScore = Math.max(...rankings.map(r => Number(r.total_score)), 1)
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div className="space-y-2">
                      {rankings.map((r, i) => (
                        <div key={`${r.grade}-${r.class}`} className="flex items-center gap-2">
                          <span className="text-base w-6 text-center shrink-0">{medals[i] ?? i + 1}</span>
                          <span className="text-white text-xs w-20 shrink-0">{r.grade}학년 {r.class}반</span>
                          <div className="flex-1 h-3 border border-white/20 overflow-hidden" style={{ background: 'black' }}>
                            <div
                              className="h-full transition-[width] duration-700"
                              style={{ width: `${Math.max(Number(r.total_score) / maxScore * 100, 2)}%`, backgroundColor: '#fbd000' }}
                            />
                          </div>
                          <span className="pixel text-[8px] w-16 text-right shrink-0 tabular-nums" style={{ color: '#fbd000' }}>
                            {Number(r.total_score).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}

            {phase === 'question_active' && (
              <div className="flex-1 min-w-[200px]">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-white/50">답변 현황</span>
                  <span>
                    <span className="pixel text-[10px]" style={{ color: '#43b047' }}>{answeredCount}</span>
                    <span className="text-white/40"> / {studentCount}명</span>
                  </span>
                </div>
                <div className="w-full h-4 border-2 border-white overflow-hidden" style={{ background: 'black' }}>
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{ width: `${answerPct}%`, backgroundColor: '#43b047' }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 gap-3">
                  <div className="text-[10px] text-white/30">시간 종료 전 수동으로 결과 화면으로 넘길 수 있습니다</div>
                  <button
                    onClick={handleTimerExpire}
                    className="mario-btn px-4 py-1.5 border-2 border-black font-bold text-black shrink-0"
                    style={{ backgroundColor: '#fbd000' }}
                  >
                    <span className="pixel text-[9px]">결과 보기 ▶</span>
                  </button>
                </div>
              </div>
            )}

            {phase === 'finished' && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="pixel text-xs" style={{ color: '#e52521' }}>GAME OVER</div>
                <button
                  onClick={handleNewGame}
                  className="mario-btn px-6 py-2.5 border-2 border-black font-bold"
                  style={{ backgroundColor: '#049cd8' }}
                >
                  <span className="pixel text-xs">▶ 새 게임 시작</span>
                </button>
              </div>
            )}

            <button
              onClick={handleReset}
              className="mario-btn px-4 py-2 border-2 border-white text-white ml-auto"
              style={{ background: '#00146e' }}
            >
              <span className="pixel text-xs">초기화</span>
            </button>
          </div>
        </div>

        {/* 문제 목록 패널 */}
        <div className="mario-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="pixel text-xs text-white">
              QUESTIONS
              <span className="pixel text-[8px] ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>({questions.length})</span>
            </span>
            <button
              onClick={() => { setShowForm(v => !v); resetForm() }}
              className="mario-btn px-4 py-1.5 border-2 border-black text-black font-bold"
              style={{ backgroundColor: showForm ? '#aaa' : '#fbd000' }}
            >
              <span className="pixel text-xs">{showForm ? '✕ 취소' : '+ 추가'}</span>
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">등록된 문제가 없습니다</div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="flex items-center gap-3 px-3 py-2.5 border-2"
                  style={{
                    borderColor: currentQuestion?.id === q.id ? '#43b047' : 'rgba(255,255,255,0.2)',
                    background: currentQuestion?.id === q.id ? 'rgba(67,176,71,0.1)' : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <span className="pixel text-[9px] w-6 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>Q{i + 1}</span>
                  <span
                    className="pixel text-[8px] px-2 py-0.5 border shrink-0"
                    style={q.type === 'multiple_choice'
                      ? { borderColor: '#049cd8', color: '#049cd8' }
                      : { borderColor: '#8b5cf6', color: '#8b5cf6' }}
                  >
                    {q.type === 'multiple_choice' ? '객관식' : '주관식'}
                  </span>
                  <span className="text-white/80 text-sm flex-1 truncate">
                    {q.content || (q.image_url ? '[이미지 문제]' : '-')}
                  </span>
                  <span className="text-white/30 text-xs shrink-0">{q.time_limit}s</span>
                  <span className="text-xs shrink-0 max-w-[90px] truncate" style={{ color: '#43b047' }}>
                    정답: {q.answer}
                  </span>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="text-white/30 hover:text-red-400 transition text-sm shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 문제 추가 폼 */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 pt-5"
              style={{ borderTop: '2px solid rgba(255,255,255,0.15)' }}
            >
              <div className="pixel text-[10px] mb-4" style={{ color: '#fbd000' }}>NEW QUESTION</div>
              <form onSubmit={handleAddQuestion} className="space-y-4">

                {/* 유형 선택 */}
                <div className="flex gap-2">
                  {['multiple_choice', 'short_answer'].map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => { setFormType(t); setFormAnswerIdx(null); setFormAnswer('') }}
                      className="mario-btn px-4 py-1.5 border-2 border-black text-xs font-bold"
                      style={formType === t
                        ? { backgroundColor: '#fbd000', color: '#111' }
                        : { backgroundColor: '#00146e', color: 'white', borderColor: 'white' }}
                    >
                      <span className="pixel text-[9px]">{t === 'multiple_choice' ? '객관식' : '주관식'}</span>
                    </button>
                  ))}
                </div>

                {/* 문제 내용 */}
                <div>
                  <label className="pixel block text-[8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>CONTENT (선택)</label>
                  <textarea
                    value={formContent} onChange={e => setFormContent(e.target.value)}
                    placeholder="문제 텍스트를 입력하세요..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm resize-none"
                    style={{ background: 'white', color: '#111', border: '3px solid #111', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {/* 이미지 업로드 */}
                <div>
                  <label className="pixel block text-[8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>IMAGE (선택)</label>
                  <input type="file" ref={fileRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                  <button
                    type="button" onClick={() => fileRef.current?.click()}
                    className="mario-btn px-4 py-2 border-2 text-sm font-bold"
                    style={{ background: '#00146e', borderColor: 'white', color: 'white' }}
                  >
                    {formImage ? `📎 ${formImage.name}` : '이미지 선택'}
                  </button>
                  {formImagePreview && (
                    <img src={formImagePreview} alt="미리보기"
                      className="mt-2 max-h-32 object-contain"
                      style={{ border: '2px solid white' }}
                    />
                  )}
                </div>

                {/* 객관식 선택지 */}
                {formType === 'multiple_choice' && (
                  <div>
                    <label className="pixel block text-[8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>OPTIONS (정답에 ● 선택)</label>
                    <div className="space-y-2">
                      {formOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="radio" name="correct" checked={formAnswerIdx === i}
                            onChange={() => setFormAnswerIdx(i)}
                            className="w-4 h-4 shrink-0 accent-yellow-400"
                          />
                          <input
                            type="text" value={opt}
                            onChange={e => {
                              const next = [...formOptions]
                              next[i] = e.target.value
                              setFormOptions(next)
                            }}
                            placeholder={`선택지 ${i + 1}`}
                            className="flex-1 px-3 py-1.5 text-sm"
                            style={{ background: 'white', color: '#111', border: '3px solid #111', outline: 'none', fontFamily: 'inherit' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 주관식 정답 */}
                {formType === 'short_answer' && (
                  <div>
                    <label className="pixel block text-[8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>ANSWER</label>
                    <input
                      type="text" value={formAnswer} onChange={e => setFormAnswer(e.target.value)}
                      placeholder="정답을 입력하세요"
                      className="w-full px-3 py-2 text-sm"
                      style={{ background: 'white', color: '#111', border: '3px solid #111', outline: 'none', fontFamily: 'inherit' }}
                    />
                    <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>띄어쓰기·대소문자 자동 무시</p>
                  </div>
                )}

                {/* 제한시간 */}
                <div>
                  <label className="pixel block text-[8px] mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    TIME: <span style={{ color: '#fbd000' }}>{formTimeLimit}s</span>
                  </label>
                  <input
                    type="range" min={10} max={120} step={5}
                    value={formTimeLimit} onChange={e => setFormTimeLimit(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between pixel text-[8px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <span>10s</span><span>120s</span>
                  </div>
                </div>

                <button
                  type="submit" disabled={formLoading}
                  className="mario-btn w-full py-3 border-2 border-black font-bold text-black"
                  style={{ backgroundColor: '#43b047' }}
                >
                  <span className="pixel text-[10px]">{formLoading ? 'SAVING...' : '▶ 문제 추가'}</span>
                </button>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
