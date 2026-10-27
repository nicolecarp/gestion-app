# Claude Code Instructions

Please refer to [AGENTS.md](./AGENTS.md) as the authoritative reference for this project.

### Core Quick Rules:
1. **Zero build tools**: Frontend is pure vanilla ES6+, HTML5, and CSS. Do not add npm or webpack.
2. **Asset versioning**: Always increment `?v=XX` query params in `web/index.html` when editing `web/js/app.js` or `web/css/style.css`.
3. **Dual runtime**: Backend functions exposed via `@eel.expose` in `api.py` work seamlessly in both local Eel desktop mode (`main.py`) and cloud Flask mode (`server_cloud.py`).
4. **Token saving**: For database tables, consult `docs/DATABASE.md`. For API signatures, consult `docs/API_REFERENCE.md`.
