---
name: vanilla-spa-engineering
description: Use this skill when building or updating zero-build Vanilla JS single-page applications, Eel/Flask dual-runtime bridges, PWA offline service workers, and DOM-driven view routers.
---

# Vanilla SPA Engineering Skill

This skill enforces best practices for maintaining and extending high-performance, zero-toolchain Single Page Applications (Vanilla ES6+, HTML5, CSS3) operating across dual desktop/cloud runtimes.

---

## 1. Zero Build Toolchain Policy

- **No Node.js, Webpack, Vite, npm, or TypeScript**:
  - The application deliberately runs directly in standard evergreen browsers without bundling or transpilation.
  - All scripts are native ES6+ modules or standard `<script>` tags.

---

## 2. Dual-Runtime Bridge (`api(...)` helper)

The frontend communicates with Python through a unified abstraction:
```javascript
// In web/js/app.js:
const res = await api(eel.function_name, arg1, arg2);
```
- **Desktop Mode (`main.py`)**: Eel exposes functions via WebSocket under the global `window.eel` object.
- **Cloud Mode (`server_cloud.py`)**: A virtual `/eel.js` shim proxies `eel.function_name(...args)()` to `POST /api/function_name` via `fetch()`.
- **Invariants**:
  - Always return JSON-serializable dictionaries from Python backend functions (`{'ok': True, ...}` or `{'ok': False, 'error': str(e)}`).
  - Always check `if (!res.ok) { showError(res.error); return; }` on the client.

---

## 3. DOM & State Management Patterns

1. **Lightweight View Routing**:
   - Navigation switches active views by toggling `.active` classes on `<section class="view">` elements.
   - Update URL hash (e.g. `window.location.hash = '#trabajo'`) to support browser back/forward buttons and direct bookmarking.
2. **Event Delegation**:
   - Instead of attaching individual listeners to hundreds of dynamically generated table rows, bind delegation listeners to container elements:
     ```javascript
     document.getElementById('table-body').addEventListener('click', (e) => {
         const btn = e.target.closest('[data-action]');
         if (!btn) return;
         const action = btn.dataset.action;
         const id = btn.dataset.id;
         handleAction(action, id);
     });
     ```
3. **XSS Prevention**:
   - Always sanitize untrusted user inputs when building innerHTML strings:
     ```javascript
     function escapeHtml(str) {
         if (str === null || str === undefined) return '';
         return String(str)
             .replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;')
             .replace(/"/g, '&quot;')
             .replace(/'/g, '&#039;');
     }
     ```

---

## 4. PWA & Asset Invalidation Invariant

1. **Service Worker (`sw.js`)**:
   - Serves cached assets offline for mobile PWA usage.
2. **Asset Versioning Invariant**:
   - Whenever modifying `web/js/app.js` or `web/css/style.css`, you **MUST increment the version query parameter** in `web/index.html`:
     ```html
     <link rel="stylesheet" href="css/style.css?v=23">
     <script src="js/app.js?v=23"></script>
     ```
   - Incrementing `?v=XX` ensures the browser and PWA service worker bypass stale caches immediately.
