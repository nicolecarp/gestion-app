---
name: systematic-debugging
description: Use this skill whenever investigating bugs, runtime exceptions, unexpected UI or backend behavior, or test failures. Enforces evidence-based root cause analysis before making code changes.
---

# Systematic Debugging Skill

This skill enforces a disciplined, evidence-based methodology for diagnosing and resolving software defects. It prevents speculative code modifications, premature patching, and recurring regressions.

## The Iron Rule of Debugging
**Never write a fix before you can prove the root cause.**
Do not guess. Do not apply trial-and-error workarounds. Do not wrap suspected code in generic `try/except: pass` blocks to silence symptoms.

---

## 4-Phase Debugging Workflow

### Phase 1: Evidence Collection & Reproduction
1. **Capture Exact State & Trace**:
   - Obtain the full traceback, console output, network status code, and HTTP response body.
   - Note the exact inputs, database state, and environment (Eel local desktop vs. Flask cloud).
2. **Isolate Reproduction**:
   - Write a minimal script or direct function call in Python (e.g. `python -c "..."`) or console snippet to reproduce the issue in isolation.
   - If it cannot be reproduced reliably, identify the missing state variable (session, database row, timezone, caching).
3. **Check Dual-Runtime Factors**:
   - In Eel (`main.py`): Calls execute via WebSocket bridge.
   - In Cloud (`server_cloud.py`): Calls proxy via `POST /api/<fn>` with session auth and JSON serialization.
   - Verify if serialization (dates, bytes, non-dict objects) causes disparity between runtimes.
4. **Check Timezone Invariants**:
   - Nicole operates under **Argentina Time (UTC-3)**: `AR_TZ = timezone(timedelta(hours=-3))`.
   - Never rely on raw `datetime.utcnow()` or local machine dates without explicit timezone handling.

### Phase 2: Root-Cause Tracing
1. **Trace Data Back to the Source**:
   - Follow the data pipeline backward:
     `UI View (DOM) -> await api(eel.fn, args) -> api.py handler -> database.py SQL query -> SQLite WAL file`.
   - Identify the exact point where data diverges from expected state.
2. **Compare with Working Patterns**:
   - Look at an adjacent, functioning feature in `api.py` or `web/js/app.js`.
   - Contrast SQL queries, parameters, return schemas, and DOM element identifiers.
3. **Formulate a Testable Hypothesis**:
   - State clearly: *"Function X fails when input Y is provided because condition Z evaluates incorrectly."*

### Phase 3: Targeted Root-Cause Fix
1. **Minimal Intervention**:
   - Address the fundamental flaw at its source, not at the display layer.
   - If a database query returns `NULL` because of a faulty `LEFT JOIN`, fix the SQL query; do not add empty string fallbacks across ten JS rendering functions.
2. **Preserve Existing Signatures**:
   - Keep function signatures backwards-compatible with both desktop Eel and cloud Flask callers.

### Phase 4: Verification & Anti-Regression
1. **Verify the Fix**:
   - Run the reproduction script from Phase 1 to verify the defect is resolved.
2. **Check Invariants**:
   - If `web/js/app.js` or `web/css/style.css` was touched, verify `?v=XX` was incremented in `web/index.html`.
   - Test both happy path and boundary conditions (empty lists, null values, special characters).
