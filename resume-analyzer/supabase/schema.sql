-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query)
-- before using the app.
--
-- If you already ran an earlier version of this schema (without auth),
-- drop the old table first so it can be recreated with the user_id
-- column and RLS policies below:
--   drop table if exists resumes cascade;

-- 1. Enable the pgvector extension (included free on all Supabase plans)
create extension if not exists vector;

-- 2. Table that stores each uploaded resume + its embedding, scoped to
-- the signed-in user who uploaded it. Gemini's text-embedding-004 model
-- outputs 768-dimension vectors.
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  filename text not null,
  resume_text text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

-- 3. Row Level Security — this is what actually enforces privacy at the
-- database level: a signed-in user can only ever see, insert, or delete
-- their own rows, no matter what the application code does.
alter table resumes enable row level security;

create policy "Users can view their own resumes"
  on resumes for select
  using (auth.uid() = user_id);

create policy "Users can insert their own resumes"
  on resumes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own resumes"
  on resumes for delete
  using (auth.uid() = user_id);

-- 4. Indexes: one for fast similarity search, one for fast per-user filtering.
create index if not exists resumes_embedding_idx
  on resumes using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists resumes_user_id_idx on resumes (user_id);

-- 5. RPC function the app calls to run the similarity search. Filters by
-- the caller's own user_id explicitly (in addition to RLS) so the search
-- stays scoped even if this function is ever called in a context where
-- RLS behaves unexpectedly. Cosine distance (<=>) is converted to a 0-1
-- similarity score, where 1 = identical meaning, 0 = unrelated.
create or replace function match_resumes(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  id uuid,
  filename text,
  resume_text text,
  similarity float
)
language sql stable
as $$
  select
    resumes.id,
    resumes.filename,
    resumes.resume_text,
    1 - (resumes.embedding <=> query_embedding) as similarity
  from resumes
  where resumes.user_id = auth.uid()
  order by resumes.embedding <=> query_embedding
  limit match_count;
$$;

-- Optional cleanup helper used while testing (only deletes YOUR rows,
-- since RLS applies here too):
-- delete from resumes where user_id = auth.uid();

-- ============================================================
-- Fit Check history — scoped per account
-- ============================================================
-- Every "Run Analysis" click creates one row in fit_check_runs (the job
-- title/description used for that run) and one row per resume in
-- fit_check_candidates. Both are scoped to the signed-in user via RLS,
-- so your history page only ever shows runs YOU performed.

create table if not exists fit_check_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  job_title text not null,
  job_description text not null,
  created_at timestamptz not null default now()
);

create table if not exists fit_check_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references fit_check_runs(id) on delete cascade,
  filename text not null,
  candidate_name text not null default 'Unknown Candidate',
  fit_score int not null,
  verdict text not null,
  matched_skills text[] not null default '{}',
  missing_skills text[] not null default '{}',
  strengths text not null default '',
  gaps text not null default '',
  recommendation text not null default '',
  created_at timestamptz not null default now()
);

alter table fit_check_runs enable row level security;
alter table fit_check_candidates enable row level security;

create policy "Users can view their own runs"
  on fit_check_runs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own runs"
  on fit_check_runs for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own runs"
  on fit_check_runs for delete
  using (auth.uid() = user_id);

-- fit_check_candidates has no user_id column of its own — ownership is
-- checked by joining back to the parent run.
create policy "Users can view their own candidates"
  on fit_check_candidates for select
  using (
    exists (
      select 1 from fit_check_runs
      where fit_check_runs.id = fit_check_candidates.run_id
      and fit_check_runs.user_id = auth.uid()
    )
  );

create policy "Users can insert their own candidates"
  on fit_check_candidates for insert
  with check (
    exists (
      select 1 from fit_check_runs
      where fit_check_runs.id = fit_check_candidates.run_id
      and fit_check_runs.user_id = auth.uid()
    )
  );

create index if not exists fit_check_runs_user_id_idx on fit_check_runs (user_id);
create index if not exists fit_check_candidates_run_id_idx on fit_check_candidates (run_id);
