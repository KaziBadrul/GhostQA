# GhostQA Demo Script

**Duration:** 2-4 minutes  
**Audience:** Developer tooling / QA engineering stakeholders  

## Script

### 1. Open the Dashboard (0:00-0:10)

> "I'm going to open GhostQA and show the dashboard."

> *Click to open http://localhost:3000*

>The dashboard shows the current state of GhostQA runs, budget consumption, and confirmed findings. I can see 2 local runs and 1 confirmed violation so far.

### 2. Start a New Test Run (0:10-0:20)

> "To start a new test run, I click 'New test run', which takes me to the fixture selection page."

> *Clicks through: Dashboard → New test run → selects 'Order Lifecycle' fixture*

>The Order Lifecycle fixture: "Cancelled orders must not be fulfilled." The invariant is: an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial. The planner may explore these operations: POST /api/orders, GET /api/orders/{orderId}, POST /api/orders/{orderId}/cancel, POST /api/orders/{orderId}/fulfill.

### 3. Run the Autonomous Test (0:20-1:00)

> "I'll click 'Run autonomous test' to start the engine."

> *Clicks the Run autonomous test button*

>The run begins and progresses through the stage pipeline. I'm polling the API every 2 seconds for status updates. The stages are: ADMITTING RUN → PLANNING JOURNEY → RESETTING TARGET → VERIFYING BASELINE → EXECUTING JOURNEY → CONFIRMING FROM FRESH STATE → MINIMIZING → LOADING EVIDENCE → GENERATING REPORT → VERIFYING ARTIFACT → PACKAGING ARTIFACT → COMPLETE.

> *Points to the stage progress indicator on screen*

> The engine respects the frozen scope and operation policy — Gemini only proposes journeys; deterministic code controls dispatch, scoping, and budgeting. The budget is 60 target requests with an 8-minute deadline.

> *If the run takes some time, points to the live timer/elapsed indicators*

### 4. Result: Confirmed Violation (1:00-1:30)

> "The run completed. Let me navigate to the result page."

> *Clicks to /runs/{id}*

> "Here we have a **CONFIRMED VIOLATION**. This means:

> 1. Gemini proposed a valid but unusual workflow
> 2. The approved invariant was observed violated during initial execution
> 3. The run was independently replayed from a fresh state — the same violation occurred
> 4. The sequence was minimized to the shortest verified sequence

> The finding: 'an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial.' The classification is CONFIRMED, the invariant is satisfied, and the artifact has been verified."

### 5. Minimal Reproduction & Evidence (1:30-2:00)

> "Below the finding, I can see the minimal reproduction sequence — the shortest sequence of API calls that triggers the violation. In this case, it's 3 steps: create an order, cancel it, then attempt to fulfill it."

> *Points to sequence length and steps*

> "The evidence panel shows the predicate under test, the original and minimized sequence lengths, and the finding state machine tracking transitions from exploration → violation observed → independent replay → confirmed."

> "There's also a full markdown report and a regression artifact that can be verified independently."

### 6. Recorded Runs Fallback (2:00-2:30)

> "If live execution isn't available, I can show recorded evidence from the repository."

> *Navigates to /recorded*

>"These are real Gate 5 acceptance tests committed to the repository. This one shows an OBSERVED VIOLATION that was confirmed independently. Each entry is clearly labeled as 'Previously generated GhostQA evidence — nothing on this page was executed for this visit.'"

### 7. Key Points Summary (2:30-2:45)

> "What GhostQA demonstrates:

> 1. **Engine-first**: Real deterministic execution through the authoritative path
> 2. **Fresh-state lifecycle**: Reset → baseline verify → trial → independent replay
> 3. **Finding state machine**: OBSERVED VIOLATION → CONFIRMED / NON-REPRODUCED / INCONCLUSIVE
> 4. **Minimization**: Shortest verified sequence, not claimed global minimality
> 5. **Regression artifacts**: Verified reproducible evidence
> 6. **One run at a time**: Supervisor enforces single active run

> **Important**: T048 formal Gate 5 reliability acceptance remains unresolved. This demo shows the core workflow but doesn't complete the formal acceptance gate."

### 8. Wrap-up (2:45-3:00)

> "That's GhostQA — autonomous API regression testing that discovers bugs by fuzzing sequences of valid user actions. The tool is ready for a developer to import an OpenAPI spec, propose unusual but valid workflows, and reproduce invariant violations from fresh state."

> Questions?