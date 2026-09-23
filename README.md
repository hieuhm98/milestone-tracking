# IT Learning Platform (milestone-tracking)

A free, open, **bilingual (Vietnamese + English) website for learning IT**. No login needed — anyone can open it and start reading, taking quizzes, and practising. An optional account (approved by an admin) syncs progress across devices and sends a daily learning update on Telegram.

> **New here? Read the first two sections.** They explain the whole project in plain language.
> **Developer or AI agent?** Jump to [For Developers & AI Agents](#for-developers--ai-agents) for the technical map.

---

## 1. What is this, in plain words?

Think of it as a **small online school for IT beginners**, with two "courses":

| Course | Who it's for | What's inside |
|--------|--------------|---------------|
| **BA · PO · PM** | Business Analysts, Product Owners, Project Managers | 31 beginner IT topics (how computers, networks, databases, APIs, Agile, Git, etc. work) |
| **Developer · AWS** | People studying cloud computing | A 24-lesson course to prepare for the **AWS Solutions Architect – Associate** certification exam |

Every topic is like a **chapter in a textbook**: a written lesson you can read in **Vietnamese or English** (switch anytime with one click), followed by a **multiple-choice quiz** to test yourself.

On top of the lessons there are three practice tools:
- **Daily Quick Test** — press one button and get a short random quiz to warm up.
- **Design Exercises** — real-world "how would you design this?" questions (databases, APIs, AWS) with model answers hidden until you're ready to check.
- **SQL Practice** — a mini playground where you type real database queries and see live results, using a built-in dictionary of ~23,000 English words.

**There is no user data.** Nothing you do is saved to a server, there are no passwords, and there is no personal database. All the lessons are just files that ship with the website.

---

## 2. How to run it (for anyone)

You need [Node.js **version 22**](https://nodejs.org) installed (version 22 specifically — one part of the app needs it).

```bash
yarn install     # download the building blocks (do this once)
yarn dev         # start the website locally
```

Then open **http://localhost:3000** in your browser. That's it — no configuration, no `.env` file, no database setup required. Accounts and Telegram are optional: copy `.env.example` to `.env.local`, fill in the Supabase and Telegram values, and run `supabase/schema.sql` in your Supabase project's SQL editor.

To build the finished version for hosting:
```bash
yarn build       # create the production version
yarn start       # run that production version
```

---

## 3. How the content is organised (plain version)

All lessons live in a folder called **`knowledge-content/`**. Each lesson is its own sub-folder containing four simple files:

| File | What it holds |
|------|---------------|
| `meta.json` | The title and short description (in both languages) |
| `article.md` | The lesson text in **Vietnamese** |
| `article.en.md` | The same lesson in **English** |
| `questions.json` | The quiz questions (both languages, with the correct answers) |

**To add a new lesson**, you just create a new folder with these four files. Folders are numbered (`01-…`, `02-…`, `aws-01-…`) so they show up in the right order. No coding required to add content.

---

## For Developers & AI Agents

Technical reference for anyone (human or AI) extending or maintaining the codebase.

### Tech stack
- **Next.js 14** (App Router) · **React 18** · **TypeScript** · **Tailwind CSS** (dark theme).
- **better-sqlite3** — used **read-only, server-side** to serve a committed word bank for the SQL playground. This native module requires **Node 22** at runtime.
- `react-markdown` + `remark-gfm` for rendering lessons/answers · `recharts` · `date-fns` · `lucide-react`.
- Package manager: **yarn**. Content is file-based. **Supabase** (optional) holds accounts (`profiles`: status `draft`/`active`/`disabled`, role `admin`/`teacher`/`learner`) and synced progress (`user_progress`); progress always stays in localStorage too.
- **Telegram Bot API** (optional) — account linking via webhook and a daily digest (`/api/cron/daily-digest`, scheduled in `vercel.json`).

### Project layout
```
app/
  page.tsx                       → redirects "/" to "/dashboard"
  (app)/
    layout.tsx                   → mounts LanguageProvider + Sidebar (no auth)
    dashboard/                   → "Home hub" of section cards
    knowledge/                   → topic list
    knowledge/[slug]/            → one topic (lesson + quiz)
    knowledge-review/            → Daily Quick Test / random review
    practice/                    → practice hub
    practice/questions/          → Design Exercises (accordion)
    practice/sql/                → SQL Practice playground
  api/
    knowledge/route.ts           → lists topics from knowledge-content/
    knowledge/[slug]/route.ts    → returns one topic (VI + EN + questions)
    sql-playground/route.ts      → GET = schema, POST {sql} = run query

knowledge-content/<slug>/        → file-based lessons (see below)
data/word-bank.db                → committed read-only SQLite (NOT git-ignored)
lib/groups.ts                    → course/group definitions (id, order, labels, color)
lib/i18n.ts + context/lang.tsx   → UI dictionary + useLang() (lang, setLang, t, pick)
lib/server/wordBankDb.ts         → read-only SQLite clone-per-query engine
scripts/                         → word-bank seeding & dictionary import scripts
```

### Content model
Each `knowledge-content/<slug>/` folder holds exactly four files:
- **`meta.json`** — `{ group, title, titleEn, description, descriptionEn }`
- **`article.md`** — Vietnamese body · **`article.en.md`** — English body
- **`questions.json`** — array of `{ id, question, questionEn, options[], optionsEn[], answer, explanation, explanationEn }`

Conventions:
- **Bilingual is mandatory.** Vietnamese is the base; every field/file has an English counterpart. `answer` is a **0-based index** shared by `options` and `optionsEn` (same length and order).
- **Ordering** is by folder name (`localeCompare`), so keep the `NN-` / `aws-NN-` numeric prefixes. To insert between two topics without renumbering, use the `NNb-` trick (e.g. `08b-json-co-ban` sits between `08-` and `09-`).
- **Groups:** `ba-po-pm` (31 topics, `01-…30-` + `08b-`) and `dev` (24 topics, `aws-01-…aws-24-`). Defined in `lib/groups.ts`; `DEFAULT_GROUP = "ba-po-pm"`. **887 questions total**, 411 of them across the AWS track.
- Pages are client components (`"use client"`) that fetch from the file-based `/api/knowledge` API.
- Language switching is global: `useLang().pick(vi, en)` for content, `t("key")` for UI chrome. Persisted to `localStorage` key `lang`, default **vi**.

### SQL Practice playground
- Data is a **committed** SQLite file at **`data/word-bank.db`** (~23k English words + mock review history). Tables: `words`, `parts_of_speech`, `word_reviews`.
- `lib/server/wordBankDb.ts` opens the file **read-only**, serialises it to a cached Buffer, and builds a **fresh in-memory clone per query** — so *any* SQL (SELECT/INSERT/UPDATE/CREATE/DELETE) is safe and the committed file is never mutated. Results cap at 1000 rows.
- Rebuilding the word bank (needs Node 22): `node scripts/seed-word-bank.mjs` rebuilds from scratch, then `python scripts/import_dictionary.py` re-appends ~18k bulk words from free open datasets (token-free — no LLM). **Re-run the importer after any re-seed.**

### Side-by-side bilingual reading
The **⇹ Side-by-side EN | VI** button in the sidebar shows learning content in both languages at once — **English on the left, Vietnamese on the right** — across articles, mini-lessons and every quiz (question, options and explanation). The preference is remembered in `localStorage` under `lang:dual`.

Articles are aligned **per `##` section** rather than as two long columns, so each heading's English and Vietnamese always start on the same line however differently they wrap. On narrow screens the two columns stack. The single-language VI/EN switch still controls the interface chrome, and the column order never changes with it.

### Mini-lessons (`/learn`)
The 24 AWS topics are split into **143 mini-lessons** of 5–10 minutes, for studying in small daily batches. Each one runs **warm-up → read → check**:

1. **Warm-up** — a couple of recall questions from mini-lessons you've already finished, plus a preview of the one you're about to read. Diagnostic only; it never fails you.
2. **Read** — just that lesson's slice of the article (median ~300 words).
3. **Check** — the lesson's own questions plus more review from earlier. Score **70%** to complete it.

Both tests deliberately mix the current lesson with everything before it, so older material keeps resurfacing. Review questions are chosen by per-question recall: never-tested first, then weakest, then stalest.

The split lives in **`knowledge-content/<slug>/lessons.json`** — a list of mini-lessons, each mapping a contiguous run of the article's `## ` sections plus the question ids that belong to it. **The articles are never modified**; they are sliced at render time. Constraints: section ranges must tile `1..N` exactly, every question id must be used exactly once, and the VI and EN articles must keep identical `## ` counts (they do in all 24 topics). Any topic without a `lessons.json` simply has no study mode — the BA/PO/PM track still works as a full article + quiz, and can be split later by adding the file.

### Learning progress
There are no accounts, so progress is stored in three cooperating layers:

1. **`localStorage` (key `progress:v1`)** — the live source of truth in the browser. Quiz answers are saved as you click and restored when you reopen a topic; finished review sessions feed the daily streak.
2. **`data/progress.json`** — a **committed snapshot**. `scripts/sync-progress.mjs` copies it to `public/progress.json` on every `yarn dev` / `yarn build`, so the file travels into each new build and seeds a browser that has no stored progress. `public/progress.json` is generated and git-ignored; `data/progress.json` is the one you commit.
3. **`PUT /api/progress`** — write-back to `data/progress.json`, debounced 1.5s. **Enabled only where the filesystem is writable**: local dev, Railway/Render/Fly, a VPS, Docker. It is automatically off on Vercel (read-only runtime FS) and can be forced off anywhere with `PROGRESS_FILE_WRITES=off`.

On mount the three sources are merged — newest `updatedAt` wins per topic, best scores are never lowered, and review sessions are unioned by timestamp. `/progress` shows the streak, per-topic scores and session history, plus **Export / Import JSON** for moving progress between browsers or devices.

> **Deploying to Vercel:** progress stays in each visitor's browser. To carry your own progress forward, run locally (which writes `data/progress.json`), commit that file, and push — the next build ships it as the seed. For real server-side persistence, deploy somewhere with a disk, or swap `/api/progress` for a hosted store (Turso, Vercel KV, Postgres).

### Commands
| Task | Command |
|------|---------|
| Install | `yarn install` |
| Dev server | `yarn dev` (http://localhost:3000) |
| Production build | `yarn build` |
| Run production | `yarn start` |
| Lint | `yarn lint` |
| Typecheck | `node_modules/.bin/tsc --noEmit` |
| Refresh the progress seed | `yarn progress:sync` |

### Gotchas
- **Node 22 is required** for `better-sqlite3` (the native module fails to load on older Node). `next.config.mjs` lists it in `experimental.serverComponentsExternalPackages` so it isn't bundled.
- `ReviewSession` reads the `?quick=1` query param via `window.location.search` (**not** `useSearchParams`) to avoid a build-time Suspense boundary. The sidebar ⚡ link (`/knowledge-review?quick=1`) auto-starts a 5-question test.
- `next.config.mjs` permanently redirects the old `/sql-practice` → `/practice/sql`.
- **Historical note:** this project began as a personal study tracker with login/Supabase/dev-mode. All of that was removed on 2026-07-10 to go **fully public**. On 2026-09-22 optional accounts came back with a new Supabase schema (`supabase/schema.sql`) built around this app's progress model; everything still works without one.

---

*This project is a fully public, file-based learning site. To contribute content, add a folder under `knowledge-content/` — no backend or database changes needed.*
