# GhostQA Submission Demo

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd ghostqa

# Install dependencies
npm install

# Set up environment variables
# Copy .env.local as a template and fill in your values
cp .env.local.example .env.local

# Required environment variables in .env.local:
# DATABASE_URL=postgresql://user@127.0.0.1:5432/ghostqa
# GHOSTQA_CREDENTIAL_KEY=<64-char-hex-key>
# GEMINI_MODEL=gemini-3.5-flash-lite  # or your configured model
# GEMINI_API_KEY=<your-gemini-api-key>

# Ensure PostgreSQL is running
#   pg_ctl start -D /usr/local/var/postgres  (macOS Homebrew)
#   or start your PostgreSQL service

# Run database migrations
npm run db:migrate

# Build the engine bundle
npm run build:engine
```

## Environment

The application requires the following environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GHOSTQA_CREDENTIAL_KEY` | 64-char hex key for credential encryption |
| `GEMINI_MODEL` | Gemini model name (e.g. `gemini-3.5-flash-lite`) |
| `GEMINI_API_KEY` | Gemini API key |

The demo uses reduced limits (`DEMO_LIMITS`):
- 60 target requests per run
- 480,000ms (8 min) wall-clock deadline
- 10 journeys
- 10 steps per journey
- 10s request timeout
- 30s model timeout

## Fixtures

Three local API fixtures are available (read-only, allowlisted):

| Fixture ID | Name | Tagline |
|---|---|---|
| `order-lifecycle` | Order Lifecycle | Cancelled orders must not be fulfilled. |
| `inventory` | Inventory Allocation | Unavailable items must not be allocated. |
| `workflow` | Document Workflow | Archived documents must not be published. |

Each fixture has an approved invariant that GhostQA will test against.

## Web Application

Start the development server:

```bash
npm run dev
```

Open: http://localhost:3000

The application has these pages:

1. **Dashboard** (`/`): Overview of runs, budget, and confirmed violations. Polls `/api/runs` every 2s.

2. **New Test Run** (`/runs/new`): Fixture selection with cards for Order Lifecycle, Inventory, and Workflow. Click "Run autonomous test" to start.

3. **Run Progress** (`/runs/{id}`): Real-time status polling from `/api/runs/{id}` showing stage pipeline, budget consumption, and finding state.

4. **Result** (`/runs/{id}`): Final view showing CONFIRMED VIOLATION or NO CONFIRMED VIOLATION, with finding details, minimal reproduction sequence, evidence, and report.

5. **Recorded Runs** (`/recorded`): Historical Gate 5 acceptance evidence committed to the repository. Clearly labeled as "Previously generated GhostQA evidence".

## Live Run

From the dashboard:

1. Click **[ New test run ]**
2. Select a fixture card (Order Lifecycle recommended for submission)
3. Click **[ Run autonomous test ]**
4. The run progresses through stages: ADMITTING RUN → PLANNING JOURNEY → RESETTING TARGET → VERIFYING BASELINE → EXECUTING JOURNEY → CONFIRMING FROM FRESH STATE → MINIMIZING → LOADING EVIDENCE → GENERATING REPORT → VERIFYING ARTIFACT → PACKAGING ARTIFACT → COMPLETE
5. Status updates poll from `/api/runs`
6. On completion, view the result page with the finding, minimal reproduction, and evidence

The engine enforces the full authority path:
`RunSupervisor → BudgetManager → frozen scope/operation policy → cancellation authorization → deterministic HTTP executor`

Gemini proposes only; deterministic code controls all dispatch, scoping, budgeting, and classification.

## Recorded Run (Fallback)

For presentation fallback when live execution is unavailable:

1. Navigate to **Recorded runs** (`/recorded`)
2. Browse historical Gate 5 acceptance evidence
3. Each entry is clearly labeled:
   - **Recorded evidence** badge
   - Discovery status (OBSERVED VIOLATION / NOT OBSERVED)
   - Confirmation status (CONFIRMED / NOT CONFIRMED)
   - Variant (faulty / repaired)
   - Stop reason, request count, model call count
   - Minimized sequence length

Recorded runs use real previously generated GhostQA evidence from `tests/acceptance/`. The page explicitly states: "Previously generated GhostQA evidence. Nothing on this page was executed for this visit."

## T048 Status

**T048 formal Gate 5 reliability acceptance remains unresolved.** This submission demonstrates the core engine workflow but does not complete the formal Gate 5 acceptance requirements.

## Commands Summary

```bash
# Install
npm install

# Environment
# Set .env.local with required vars

# Build engine
npm run build:engine

# Start app
npm run dev

# View dashboard
open http://localhost:3000

# Start live run: Dashboard → New Test Run → Select fixture → Run autonomous test

# View recorded runs: Dashboard → Recorded runs

# Stop server
Ctrl+C
```