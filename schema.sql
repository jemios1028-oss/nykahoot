-- =====================================================
-- QuizTime 데이터베이스 설정
-- Supabase SQL Editor에서 전체 복사 후 실행하세요
-- =====================================================

-- 문제 테이블
create table if not exists public.questions (
  id bigserial primary key,
  type text not null default 'multiple_choice' check (type in ('multiple_choice', 'short_answer')),
  content text,
  image_url text,
  options jsonb,
  answer text not null,
  time_limit integer not null default 30,
  order_index integer not null default 0,
  created_at timestamptz default now()
);

-- 학생 테이블
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  grade integer not null,
  class integer not null,
  created_at timestamptz default now()
);

-- 답변 테이블
create table if not exists public.answers (
  id bigserial primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  answer_text text,
  is_correct boolean not null default false,
  response_time_ms integer not null,
  score integer not null default 0,
  submitted_at timestamptz default now(),
  unique(student_id, question_id)
);

-- 게임 상태 테이블 (항상 1개의 행만 존재)
create table if not exists public.game_state (
  id integer primary key default 1,
  phase text not null default 'lobby' check (phase in ('lobby', 'question_active', 'ranking', 'finished')),
  current_question_id bigint references public.questions(id),
  question_started_at timestamptz,
  constraint single_row check (id = 1)
);

-- 게임 상태 초기값 삽입
insert into public.game_state (id, phase)
values (1, 'lobby')
on conflict (id) do nothing;

-- =====================================================
-- 반별 누적 순위를 계산하는 함수
-- =====================================================
create or replace function public.get_class_rankings()
returns table(grade integer, class integer, total_score bigint, student_count bigint)
language sql security definer as $$
  select
    s.grade,
    s.class,
    coalesce(sum(a.score), 0)::bigint as total_score,
    count(distinct s.id)::bigint as student_count
  from public.students s
  left join public.answers a on a.student_id = s.id
  group by s.grade, s.class
  order by total_score desc;
$$;

-- =====================================================
-- 퀴즈 초기화 함수 (관리자 "초기화" 버튼용)
-- =====================================================
create or replace function public.reset_quiz()
returns void language sql security definer as $$
  delete from public.answers;
  delete from public.students;
  update public.game_state
  set phase = 'lobby', current_question_id = null, question_started_at = null
  where id = 1;
$$;

-- =====================================================
-- RLS 비활성화 (학교 내부 도구이므로 단순화)
-- =====================================================
alter table public.questions disable row level security;
alter table public.students disable row level security;
alter table public.answers disable row level security;
alter table public.game_state disable row level security;

-- =====================================================
-- anon 롤 권한 부여
-- =====================================================
grant select, insert, update, delete on public.students to anon;
grant select, insert, update, delete on public.answers to anon;
grant select on public.questions to anon;
grant select, update on public.game_state to anon;
grant usage, select on sequence public.questions_id_seq to anon;
grant usage, select on sequence public.answers_id_seq to anon;

-- =====================================================
-- Realtime 활성화 (아래 테이블의 변경사항을 실시간 전달)
-- =====================================================
alter publication supabase_realtime add table public.game_state;
alter publication supabase_realtime add table public.students;
