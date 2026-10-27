# Claude Code Instructions

Please refer to [AGENTS.md](./AGENTS.md) as the authoritative reference for this project.

### Specialized Agent Skills (`.agents/skills/`):
This repository contains adapted, high-discipline skills (compatible with Claude Code, Cursor, and Antigravity):
- `systematic-debugging`: Root-cause first debugging, evidence gathering, preventing premature patches.
- `frontend-design`: High-craft visual design, dark/light theme tokens, dense enterprise layouts.
- `test-driven-development`: Red-Green-Refactor verification before implementing business logic.
- `docx-architect`: OpenXML and python-docx template manipulation for quotes and certificates.
- `xlsx-architect`: Financial-grade Excel workbooks and openpyxl formatting.
- `sqlite-architect`: WAL mode concurrency, idempotent schema migrations, and indexing.
- `vanilla-spa-engineering`: Zero-build Vanilla ES6+ SPA architecture, Eel/Flask dual runtime bridge, PWA caching.

### Core Quick Rules:
1. **Zero build tools**: Frontend is pure vanilla ES6+, HTML5, and CSS. Do not add npm or webpack.
2. **Asset versioning**: Always increment `?v=XX` query params in `web/index.html` when editing `web/js/app.js` or `web/css/style.css`.
3. **Dual runtime**: Backend functions exposed via `@eel.expose` in `api.py` work seamlessly in both local Eel desktop mode (`main.py`) and cloud Flask mode (`server_cloud.py`).
4. **Token saving**: For database tables, consult `docs/DATABASE.md`. For API signatures, consult `docs/API_REFERENCE.md`.
