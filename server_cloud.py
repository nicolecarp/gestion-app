"""
Servidor Web Cloud para Gestión Nicole (compatible con PythonAnywhere, Render, Railway, Fly.io).
Reemplaza el puente WebSocket de Eel por HTTP/JSON estándar + un shim automático en /eel.js,
para que toda la interfaz funcione idéntico en la nube y en iPhone sin abrir navegador de escritorio.
"""
import os
import inspect
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, Response, session, redirect, url_for

from database import init_db
import api as api_module

init_db()

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
app = Flask(__name__, static_folder=WEB_DIR, static_url_path="")
app.secret_key = os.environ.get("SECRET_KEY", "nicole-gestion-secret-key-2026")

# Si defines la variable de entorno APP_PASSWORD en el servidor en la nube,
# pedirá esa contraseña antes de mostrar la app.
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if APP_PASSWORD and not session.get("authenticated"):
            if request.path.startswith("/api/"):
                return jsonify({"ok": False, "error": "No autorizado"}), 401
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated


@app.route("/login", methods=["GET", "POST"])
def login_page():
    if not APP_PASSWORD:
        return redirect("/")
    error = ""
    if request.method == "POST":
        pwd = request.form.get("password", "")
        if pwd == APP_PASSWORD:
            session["authenticated"] = True
            session.permanent = True
            return redirect("/")
        error = "Contraseña incorrecta"
    return f"""<!DOCTYPE html>
<html lang="es" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nicole · Acceso</title>
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
body {{ background:#151014; color:#F7EAF0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }}
.card {{ background:#211920; border:1px solid #362832; padding:28px 24px; border-radius:18px; width:90%; max-width:340px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.4); }}
img {{ width:72px; height:72px; border-radius:18px; margin-bottom:12px; }}
h2 {{ margin:0 0 6px 0; color:#F28BA8; }}
input {{ width:100%; box-sizing:border-box; padding:11px 14px; border-radius:10px; border:1px solid #362832; background:#151014; color:#F7EAF0; font-size:1rem; margin:14px 0; text-align:center; }}
button {{ width:100%; padding:11px; border-radius:10px; border:none; background:#F28BA8; color:#151014; font-weight:700; font-size:0.95rem; cursor:pointer; }}
.err {{ color:#ff6b8b; font-size:0.85rem; margin-top:8px; }}
</style>
</head>
<body>
<form class="card" method="POST">
    <img src="/apple-touch-icon.png" alt="Nicole">
    <h2>Nicole</h2>
    <div style="font-size:0.82rem;color:#B89CA8">Ingresa tu clave de acceso</div>
    <input type="password" name="password" placeholder="Contraseña..." autofocus required>
    <button type="submit">Entrar</button>
    {f'<div class="err">{error}</div>' if error else ''}
</form>
</body>
</html>"""


@app.route("/eel.js")
def serve_eel_shim():
    """
    Shim ligero compatible con Eel: convierte cualquier llamada `eel.mi_funcion(a, b)()`
    en una petición HTTP POST a `/api/mi_funcion` de forma transparente.
    """
    js = """
window.eel = new Proxy({
    expose: function() {},
    set_host: function() {}
}, {
    get: function(target, prop) {
        if (prop in target) return target[prop];
        return function(...args) {
            return async function(callback) {
                const res = await fetch('/api/' + String(prop), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ args: args })
                });
                if (!res.ok) throw new Error('API Error: ' + res.status);
                const data = await res.json();
                if (typeof callback === 'function') callback(data.result);
                return data.result;
            };
        };
    }
});
"""
    return Response(js, mimetype="application/javascript")


@app.route("/api/<func_name>", methods=["POST"])
@login_required
def call_api(func_name):
    if func_name.startswith("_") or not hasattr(api_module, func_name):
        return jsonify({"ok": False, "error": f"Función no encontrada: {func_name}"}), 404
    fn = getattr(api_module, func_name)
    if not callable(fn):
        return jsonify({"ok": False, "error": f"{func_name} no es invocable"}), 400
    payload = request.get_json(silent=True) or {}
    args = payload.get("args", [])
    try:
        result = fn(*args)
        return jsonify({"ok": True, "result": result})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/")
@login_required
def index():
    return send_from_directory(WEB_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    # Permitir iconos públicos para que iOS cargue el apple-touch-icon en la pantalla de login
    if APP_PASSWORD and not session.get("authenticated"):
        allowed_public = {"apple-touch-icon.png", "apple-touch-icon-precomposed.png", "favicon.png", "favicon.ico", "manifest.json"}
        if path not in allowed_public:
            return redirect(url_for("login_page"))
    return send_from_directory(WEB_DIR, path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"Servidor Cloud iniciado en http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
