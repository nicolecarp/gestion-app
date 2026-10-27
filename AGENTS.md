# AGENTS.md — AI Agent Guidelines & Project Context
<!--
  TOKEN-OPTIMIZED REFERENCE FOR AI ASSISTANTS (Antigravity, Claude Code, Cursor, Copilot, etc.)
  Read this file first to understand the architecture, conventions, and codebase without reading thousands of lines of code.
-->

## 1. Project Overview & Tech Stack
**Nicole** is a unified personal ERP, academic tracker, enterprise operations management, and health system.
- **Backend**: Python 3.12, SQLite 3 (`WAL` mode, foreign keys enabled).
- **Desktop Runtime**: **Eel** (`main.py`) serving `web/` on `http://0.0.0.0:8080`, launching Chrome in `--app` mode.
- **Cloud Runtime**: **Flask + Gunicorn** (`server_cloud.py`) running on PythonAnywhere / PaaS with password auth & session cookies.
- **Frontend**: Pure Vanilla ES6+ SPA (`web/index.html`, `web/js/app.js`, `web/css/style.css`, `web/js/curriculum_data.js`). **No npm, no bundlers, no build step.**
- **PWA**: Configured with `manifest.json` and `sw.js` for iPhone / mobile homescreen access.

---

## 2. Directory Structure & Key Files
```text
C:\GESTION\
├── AGENTS.md                 # This file: dense context for AI agents (save tokens)
├── CLAUDE.md                 # Entrypoint for Claude Code CLI
├── README.md                 # Human & developer landing page
├── Procfile                  # Gunicorn entrypoint for Cloud PaaS
├── requirements.txt          # Python dependencies (eel, flask, gunicorn, python-docx, openpyxl, pillow, requests)
├── iniciar.bat               # Windows launcher for local Eel desktop app
│
├── .agents/                  # Agent skills & runbooks (Claude Code / Cursor / Antigravity open standard)
│   └── skills/               # systematic-debugging, frontend-design, tdd, docx, xlsx, sqlite, vanilla-spa
│
├── main.py                   # Desktop Eel app entrypoint + hot-reload watcher on web/ + Chrome app launcher
├── server_cloud.py           # Cloud Flask entrypoint + /eel.js shim + auth + auto-deploy webhook
├── api.py                    # All backend business logic (~137 exposed Eel functions)
├── database.py               # SQLite schema (38 tables), init_db(), migrations, connection factory
│
├── gestion.db                # SQLite database file (WAL mode)
├── .secret_key               # Generated secret for Flask session cookie (git-ignored)
├── check_state.py            # Diagnostic script to check tables and quote schemas
├── seed_demo.py              # Demo seeder for tasks, clients, and employees
├── insert_billing_data.py    # Seed data for regular clients (Lindley, Sur Color, etc.) and detracción accounts
│
├── templates/
│   └── cotizacion_base.docx  # Word document template for automated quote generation
│
├── web/                      # Frontend SPA static files
│   ├── index.html            # Main SPA structure with 7 views and navigation
│   ├── manifest.json         # PWA web manifest
│   ├── sw.js                 # Service Worker for offline / mobile caching
│   ├── css/
│   │   └── style.css         # Single stylesheet with modern dark/light CSS variable themes
│   ├── js/
│   │   ├── app.js            # Main application JS (DOM rendering, event handlers, state)
│   │   └── curriculum_data.js# UTN FRA Industrial Engineering Plan 2023 curriculum data
│   └── img/                  # PWA and app icons
│
└── docs/                     # Detailed modular references (read on-demand to save tokens)
    ├── ARCHITECTURE.md       # Local vs Cloud runtime, auth, webhook, and Eel shim mechanics
    ├── DATABASE.md           # Full data dictionary for all 38 SQLite tables
    ├── API_REFERENCE.md      # Alphabetical and domain index of all api.py functions
    └── FRONTEND.md           # Views routing, state management, modal system, styling rules
```

---

## 3. The Dual-Runtime Architecture (Crucial)

The application runs in two distinct environments using the **exact same frontend and backend logic**:

```
+-------------------------------------------------------------+
|                     Shared Frontend (web/)                  |
|          Calls backend via: await api(eel.func_name, ...args)       |
+------------------------------+------------------------------+
                               |
            +------------------+------------------+
            |                                     |
    [ Desktop Mode ]                               [ Cloud Mode ]
    main.py (Eel)                                  server_cloud.py (Flask)
    - Native Eel WebSocket bridge                  - Serves virtual /eel.js shim
    - Port 8080 (0.0.0.0)                          - Proxy translates eel.fn(...)() -> POST /api/fn
    - Spawns Chrome --app                          - Whitelists functions from api.py
    - Local file-change watcher                    - Session auth (APP_PASSWORD) + CSRF protection
    - No authentication required                   - Webhook /webhook/github -> auto git pull
```

### Adding a New Backend Function:
1. Define it in `api.py` with `@eel.expose`.
2. Accept standard Python primitives (`dict`, `list`, `str`, `int`, etc.).
3. Return a JSON-serializable `dict` (typically `{'ok': True, ...}` or `{'ok': False, 'error': str(e)}`).
4. **Auto-exposed in Cloud**: `server_cloud.py` automatically detects all functions declared in `api.py` whose names do not start with `_`. No manual Flask route registration is needed!
5. In `web/js/app.js`, call it with:
   ```javascript
   const res = await api(eel.your_function_name, arg1, arg2);
   ```

---

## 4. Invariants & Rules (Never Violate)

1. **Asset Version Query Param (`?v=XX`)**:
   - Every time `web/js/app.js` or `web/css/style.css` is modified, you **MUST** increment the version query parameter in `web/index.html` (e.g. `app.js?v=18` -> `app.js?v=19`).
   - If omitted, mobile Safari/Chrome and desktop browsers will serve stale cached scripts.
2. **No Build Step**:
   - Do NOT add `package.json`, Webpack, Vite, npm packages, or TypeScript. The codebase is deliberately zero-toolchain vanilla ES6+.
3. **Database Migrations via `init_db()`**:
   - `database.py` handles schema creation and migrations idempotently in `init_db()`.
   - To alter tables, append a new `ALTER TABLE ... ADD COLUMN ...` or `CREATE TABLE IF NOT EXISTS` statement inside the migration list in `database.py:init_db()`, wrapped in the existing `try/except` migration loop.
   - Always keep foreign keys enabled: `PRAGMA foreign_keys = ON;`.
4. **Timezone Rule**:
   - The primary timezone is **Argentina (UTC-3)**: `AR_TZ = timezone(timedelta(hours=-3))`.
   - In `api.py`, use `local_date()` or `today()` instead of raw UTC `datetime.now()` to prevent day-rollover bugs.
5. **Peruvian Invoicing & SUNAT Calculations**:
   - IGV is 18% (`subtotal * 0.18`).
   - Detracciones (Banco de la Nación accounts `00046317769` / `00771005578`):
     - Services over S/ 700.00 are subject to detracción (typically 10% or 12%).
     - `neto_a_pagar = total - detraccion`.
6. **Authentication & Cloud Security**:
   - `APP_PASSWORD` environment variable controls access on cloud deployments.
   - If `APP_PASSWORD` is set, requests require session cookie authentication. `/api/*` returns 401 JSON if unauthenticated.
   - Never commit passwords or production keys to Git.
7. **Mandatory Git Push & Cloud Deployment on Every Task (CRITICAL - NEVER SKIP)**:
   - At the conclusion of ANY request where code, assets, or docs are modified, the assistant **MUST ALWAYS**:
     1. Stage all changes: `git add .`
     2. Commit with a descriptive semantic message: `git commit -m "feat/fix: ..."`
     3. Push directly to GitHub: `git push origin master`
     4. Trigger the PythonAnywhere webhook so production syncs immediately:
        `python -c "import urllib.request; urllib.request.urlopen(urllib.request.Request('https://nicolecarp.pythonanywhere.com/webhook/github', method='POST'))"`
   - NEVER finish a task or answer saying changes are complete without having committed, pushed to GitHub, and updated the cloud deployment.

---

## 5. Domain Modules Overview

| Module | Core Purpose | Key DB Tables |
| :--- | :--- | :--- |
| **Dashboard** | Unified KPIs, today's tasks, approaching deadlines, interactive calendar | `tasks`, `exams`, `assignments`, `habits` |
| **Trabajo (Work)** | Pest control & hygiene enterprise operations, SUNAT billing, OCs, quotes, operative staff | `clients`, `client_sites`, `invoices`, `purchase_orders`, `quotes`, `quote_items`, `service_types`, `employees`, `employee_documents`, `service_records`, `daily_control` |
| **Universidad** | UTN FRA Industrial Engineering (Plan 2023) progress, interactive curriculum mesh, exams | `subjects`, `exams`, `assignments`, `curriculum_status` |
| **Personal** | Unified Personal & Health: workout routine, habits/tasks progress, HRT injections & body measurements | `tasks`, `habits`, `habit_logs`, `injections`, `body_measurements`, `workout_days`, `workout_exercises`, `workout_sessions`, `workout_set_logs` |
| **Finanzas (Finance)** | Personal finance tracker (ARS), multi-account balances, categorized cashflow & Surgery Savings Goal (USD) | `finance_accounts`, `finance_categories`, `finance_goals`, `finance_transactions` |
| **Cosplays** | Cosplay workshop commissions & personal costumes: projects, components, costs, client measurements | `cosplay_projects`, `cosplay_items`, `cosplay_clients` |
| **Ajustes (Settings)** | App config, detracción accounts, hourly/gram rates, theme toggle, backup download/restore, GitHub sync | `config` |

---

## 6. How to Save Tokens When Working on This Repo
- **Need table schemas or column names?** Consult `docs/DATABASE.md` instead of reading `database.py`.
- **Need to check API signatures or inputs?** Consult `docs/API_REFERENCE.md` instead of reading `api.py`.
- **Need to understand views, DOM IDs, or CSS classes?** Consult `docs/FRONTEND.md` instead of parsing `web/js/app.js`.
- **Need to verify deployment, cloud auth, or WSGI?** Consult `docs/ARCHITECTURE.md`.
