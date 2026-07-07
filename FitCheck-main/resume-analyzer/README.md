# Fit Check — Resume × Job Description Analyzer

An AI-powered resume analyzer with two modes, sitting behind an account:

1. **Fit Check** (`/`) — upload up to 5 resumes (PDF) + one job description,
   get each candidate's fit score (0–100%), matched/missing skills, and a
   written breakdown, ranked best-fit first. Every run is saved to your
   account's history workspace (grouped by the job title you give each
   run) — history is per-account, stored in Supabase, not the browser.
2. **Candidate Search** (`/search`) — index a batch of resumes, then search
   them with a plain-language description ("frontend engineer with cloud
   deployment experience"). Results are ranked by semantic similarity using
   vector embeddings, not keyword matching.

Everything runs on free tiers: **Google Gemini** for the LLM analysis and
embeddings, **Supabase** (Postgres + pgvector + Auth) for accounts and
storage, and **Vercel** for hosting.

## Tech stack

- **Next.js 14** (App Router) — frontend + backend API routes in one project
- **Tailwind CSS** — styling
- **Google Gemini** (`gemini-3.1-flash-lite`) — resume-vs-JD analysis (reads
  PDFs natively)
- **Gemini `text-embedding-004`** — 768-dim embeddings for semantic search
- **Supabase Auth** — email + password
- **Supabase + pgvector + Row Level Security** — stores each user's Fit
  Check history and indexed resumes, scoped so nobody can see another
  user's data
- **pdf-parse** — extracts resume text for embeddings

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Create a key (no credit card required)

## 2. Set up Supabase (free)

1. Create a project at https://supabase.com (no credit card required)
2. Open **SQL Editor** > **New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates
   all the tables (resumes, Fit Check runs/candidates) with Row Level
   Security, plus the `pgvector` search function.
3. Go to **Authentication > Providers > Email** and **turn OFF "Confirm
   email"**. This is the important step — with it off, creating an account
   works instantly with no email sent at all, which avoids Supabase's free
   email-sending rate limit entirely. (Trade-off: anyone can sign up with
   any email address without proving they own it — fine for a portfolio
   demo, not something you'd want on a real production app with sensitive
   data.)
4. Go to **Project Settings > API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Free Supabase projects pause after 7 days of inactivity. If a demo link
> feels slow to load for the first time in a while, that's why — it wakes
> back up automatically within a few seconds.

## 3. Local setup

```bash
git clone <this-repo>
cd resume-analyzer
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
```

Then run it:

```bash
npm run dev
```

Visit http://localhost:3000 — you'll land on `/login`. Click **Create
account**, enter any email + a password, and you're in immediately (no
email needed, per step 2.3 above).

**Before you deploy anywhere:** always run `npm run build` locally first.
`next dev` is lenient about type errors; `next build` (which is what
Vercel runs) does a full strict TypeScript check and will fail on errors
`dev` never surfaced. Catching that locally is faster than debugging it
from a failed Vercel deploy log.

## 4. Deploy to Vercel (free)

1. Push this project to a GitHub repo
2. Go to https://vercel.com/new and import the repo
3. Add the same env vars in the Vercel project settings
4. Deploy

## Project structure

```
resume-analyzer/
├── middleware.ts                   # protects all routes except /login, /auth
├── app/
│   ├── login/page.tsx               # email + password sign in / sign up
│   ├── auth/callback/route.ts       # only used if you re-enable email confirmation
│   ├── api/
│   │   ├── analyze/route.ts        # Fit Check: resumes[] + JD → ranked scores, saved to your history
│   │   ├── history/
│   │   │   ├── route.ts             # GET: list your past runs + candidates
│   │   │   └── [runId]/route.ts     # DELETE: remove one run
│   │   └── resumes/
│   │       ├── upload/route.ts     # Bulk index resumes → embeddings (per-user)
│   │       └── search/route.ts     # Semantic search over YOUR indexed resumes
│   ├── search/page.tsx             # Candidate Search UI
│   ├── layout.tsx
│   ├── page.tsx                    # Fit Check UI + account-based history
│   └── globals.css
├── components/
│   ├── JobDescriptionInput.tsx     # JD textarea (Fit Check)
│   ├── ScoreMeter.tsx              # circular fit-score gauge
│   ├── ResultPanel.tsx             # one candidate's Fit Check result
│   ├── BulkUpload.tsx              # multi-file PDF dropzone (Candidate Search)
│   ├── CandidateResultCard.tsx     # single ranked result (Candidate Search)
│   ├── UploadSummary.tsx           # indexing success/failure summary
│   └── NavHeader.tsx               # nav + signed-in email + sign out
├── lib/
│   ├── gemini.ts                   # Gemini analysis call (structured JSON)
│   ├── embeddings.ts               # Gemini embedding call
│   ├── extractText.ts              # PDF → plain text (for embeddings)
│   └── supabase/
│       ├── client.ts                # browser client (Client Components)
│       └── server.ts                # request-scoped client (Route Handlers)
├── types/
│   ├── analysis.ts
│   ├── candidate.ts
│   └── pdf-parse-lib.d.ts          # type declaration pdf-parse doesn't ship itself
├── supabase/
│   └── schema.sql                  # run this in Supabase's SQL editor
└── .env.local.example
```

## Notes on design choices

- **Auth is email + password**, with email confirmation off (see setup
  step 2.3) so account creation never depends on sending an email —
  avoids Supabase's free-tier email rate limit entirely. `middleware.ts`
  protects every route except `/login` and `/auth/callback`.
- **Privacy is enforced at the database level, not just in application
  code.** Every table that holds user data (`resumes`, `fit_check_runs`,
  `fit_check_candidates`) has Row Level Security policies that only allow
  a user to see/insert/delete their own rows, and every API route uses a
  session-bound Supabase client (never a service-role admin client) so
  those policies actually apply.
- **Fit Check history is per-account, stored in Supabase** — every "Run
  Analysis" creates one `fit_check_runs` row and one `fit_check_candidates`
  row per resume. This replaced an earlier version that used the browser's
  `localStorage`, which meant history was per-browser and wouldn't follow
  you between devices or account logins.
- Resumes are restricted to **PDF only**, everywhere in the app.
- The Fit Check route sends PDFs directly to Gemini as inline file data
  (Gemini reads PDFs natively, layout included) rather than extracting text
  first. The Candidate Search route *does* extract plain text (via
  `pdf-parse`) before embedding, since the embedding model takes text input.
- **On the `pdf-parse` type error:** `pdf-parse` doesn't ship type
  declarations for its internal `lib/pdf-parse.js` path (only for its main
  entry point). `next dev` doesn't care, but `next build`'s strict
  TypeScript check does. `types/pdf-parse-lib.d.ts` fixes this with a
  one-line `declare module` — the general pattern for "third-party package
  works fine but TypeScript can't find its types" in any Node/Next project.
- Gemini is prompted with a strict JSON response schema for Fit Check
  analysis (including extracting the candidate's name), so the frontend
  never has to regex-parse free text out of a model response. Every field
  in `required` must also be declared in `properties` — a required field
  missing from `properties` is an invalid schema and silently breaks
  analysis.
