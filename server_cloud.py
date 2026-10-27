"""
Servidor Web Cloud para Gestión Nicole (compatible con PythonAnywhere, Render, Railway, Fly.io).
Reemplaza el puente WebSocket de Eel por HTTP/JSON estándar + un shim automático en /eel.js,
para que toda la interfaz funcione idéntico en la nube y en iPhone sin abrir navegador de escritorio.

Variables de entorno relevantes:
  APP_PASSWORD            Contraseña de acceso (OBLIGATORIA salvo ALLOW_NO_PASSWORD=1).
  SECRET_KEY              Clave para firmar cookies de sesión. Si falta, se genera una aleatoria
                          y se guarda en .secret_key (excluido de git).
  GITHUB_WEBHOOK_SECRET   Secreto configurado en el webhook de GitHub. Sin él, /webhook/github
                          queda deshabilitado.
  ALLOW_NO_PASSWORD       Pon "1" sólo si de verdad quieres la app sin contraseña (NO recomendado).
"""
import os
import sys
import glob
import hmac
import html
import time
import hashlib
import secrets
import inspect
import logging
import subprocess
from datetime import timedelta
from functools import wraps
from types import ModuleType
from urllib.parse import urlparse
from flask import Flask, request, jsonify, send_from_directory, Response, session, redirect, url_for

# Asegurar que `import eel` nunca falle en servidores cloud donde eel no está instalado
if "eel" not in sys.modules:
    try:
        import eel  # noqa: F401
    except ImportError:
        dummy_eel = ModuleType("eel")
        dummy_eel.expose = lambda fn: fn
        sys.modules["eel"] = dummy_eel

from database import init_db
import api as api_module

init_db()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("gestion.cloud")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
app = Flask(__name__, static_folder=WEB_DIR, static_url_path="")


def _load_secret_key():
    """Usa SECRET_KEY del entorno o genera/persiste una aleatoria (nunca una clave fija en el código)."""
    env_key = os.environ.get("SECRET_KEY", "").strip()
    if env_key:
        return env_key
    key_file = os.path.join(BASE_DIR, ".secret_key")
    try:
        with open(key_file, "r", encoding="utf-8") as fh:
            key = fh.read().strip()
            if len(key) >= 32:
                return key
    except FileNotFoundError:
        pass
    key = secrets.token_hex(32)
    fd = os.open(key_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(key)
    return key


app.secret_key = _load_secret_key()
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("INSECURE_COOKIES", "").strip() != "1",
    PERMANENT_SESSION_LIFETIME=timedelta(days=30),
    MAX_CONTENT_LENGTH=30 * 1024 * 1024,  # 30 MB (documentos subidos en base64)
)

# Si defines la variable de entorno APP_PASSWORD en el servidor en la nube,
# pedirá esa contraseña antes de mostrar la app.
APP_PASSWORD = os.environ.get("APP_PASSWORD", "").strip()
ALLOW_NO_PASSWORD = os.environ.get("ALLOW_NO_PASSWORD", "").strip() == "1"
AUTH_MISCONFIGURED = not APP_PASSWORD and not ALLOW_NO_PASSWORD
if AUTH_MISCONFIGURED:
    log.error("APP_PASSWORD no está definida: la app quedará bloqueada hasta configurarla.")

GITHUB_WEBHOOK_SECRET = os.environ.get("GITHUB_WEBHOOK_SECRET", "").strip()

# --- Limitador simple de intentos de login (por IP, en memoria) ---
_LOGIN_MAX_ATTEMPTS = 5
_LOGIN_WINDOW_SECONDS = 15 * 60
_login_attempts = {}


def _client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    return (fwd.split(",")[0].strip() if fwd else request.remote_addr) or "unknown"


def _login_blocked(ip):
    now = time.time()
    attempts = [t for t in _login_attempts.get(ip, []) if now - t < _LOGIN_WINDOW_SECONDS]
    _login_attempts[ip] = attempts
    return len(attempts) >= _LOGIN_MAX_ATTEMPTS


def _register_failed_login(ip):
    _login_attempts.setdefault(ip, []).append(time.time())


def _is_authenticated():
    if AUTH_MISCONFIGURED:
        return False
    if not APP_PASSWORD:  # ALLOW_NO_PASSWORD=1 explícito
        return True
    return bool(session.get("authenticated"))


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _is_authenticated():
            if request.path.startswith("/api/"):
                return jsonify({"ok": False, "error": "No autorizado"}), 401
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated


def _same_origin_request():
    """Protección CSRF: si el navegador envía Origin/Referer, debe coincidir con este host."""
    origin = request.headers.get("Origin") or request.headers.get("Referer")
    if not origin:
        return True
    return urlparse(origin).netloc == request.host


@app.after_request
def _security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "same-origin")
    resp.headers.setdefault("Content-Security-Policy", "frame-ancestors 'none'; object-src 'none'; base-uri 'self'")
    if request.is_secure or request.headers.get("X-Forwarded-Proto") == "https":
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


def _pull_and_reload():
    """Hace git pull del repositorio y toca el archivo WSGI de PythonAnywhere para recargar."""
    try:
        proc = subprocess.run(
            ["git", "pull", "origin", "master"],
            cwd=BASE_DIR,
            capture_output=True,
            text=True,
            timeout=25
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        # Tocar el archivo WSGI en PythonAnywhere para que recargue solo sin entrar al panel
        for wsgi_file in glob.glob("/var/www/*_wsgi.py"):
            try:
                os.utime(wsgi_file, None)
            except Exception:
                pass
        return {"ok": proc.returncode == 0, "output": output.strip()}
    except Exception as e:
        return {"ok": False, "output": str(e)}


# Exponer también como función de api_module para poder llamarla desde Ajustes en la app
api_module.sync_cloud_from_github = _pull_and_reload
api_module.check_reload = lambda: False
api_module.get_lan_info = lambda: {"ip": "cloud", "port": 443, "url": "https://nicolecarp.pythonanywhere.com"}

# Lista blanca de funciones invocables vía /api/<nombre>: sólo las definidas en api.py
# (no módulos ni funciones importadas como get_connection) + las inyectadas arriba.
_INJECTED_API = {"sync_cloud_from_github", "check_reload", "get_lan_info"}
ALLOWED_API = {
    name for name, obj in vars(api_module).items()
    if not name.startswith("_")
    and inspect.isfunction(obj)
    and obj.__module__ == api_module.__name__
} | _INJECTED_API


@app.route("/webhook/github", methods=["GET", "POST"])
def github_webhook():
    """Endpoint para que GitHub (o PowerShell/curl) actualice y recargue PythonAnywhere."""
    if GITHUB_WEBHOOK_SECRET:
        signature = request.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(
            GITHUB_WEBHOOK_SECRET.encode(), request.get_data(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return jsonify({"ok": False, "error": "Firma inválida"}), 403
    res = _pull_and_reload()
    return jsonify(res)


@app.route("/login", methods=["GET", "POST"])
def login_page():
    if AUTH_MISCONFIGURED:
        return Response(
            "Servidor no configurado: define la variable de entorno APP_PASSWORD.",
            status=503, mimetype="text/plain; charset=utf-8"
        )
    if not APP_PASSWORD:
        return redirect("/")
    error = ""
    if request.method == "POST":
        ip = _client_ip()
        if not _same_origin_request():
            error = "Solicitud inválida"
        elif _login_blocked(ip):
            error = "Demasiados intentos. Espera unos minutos."
        else:
            pwd = request.form.get("password", "")
            if hmac.compare_digest(pwd.encode("utf-8"), APP_PASSWORD.encode("utf-8")):
                _login_attempts.pop(ip, None)
                session.clear()
                session["authenticated"] = True
                session.permanent = True
                return redirect("/")
            _register_failed_login(ip)
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
    {f'<div class="err">{html.escape(error)}</div>' if error else ''}
</form>
</body>
</html>"""


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect(url_for("login_page"))


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
                const res = await fetch('/api/' + encodeURIComponent(String(prop)), {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ args: args })
                });
                if (res.status === 401) { window.location.href = '/login'; return; }
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


def _validate_shortcut_token():
    auth_header = request.headers.get("Authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "X-Shortcut-Token" in request.headers:
        token = request.headers.get("X-Shortcut-Token", "").strip()
    else:
        token = request.args.get("token", "").strip()
        if not token and request.is_json:
            token = (request.get_json(silent=True) or {}).get("token", "").strip()

    if not token:
        return False

    valid_token = api_module.get_or_create_shortcut_token()
    return hmac.compare_digest(token, valid_token)


@app.route("/api/shortcut/<action>", methods=["GET", "POST"])
@app.route("/api/shortcut", methods=["GET", "POST"])
def shortcut_endpoint(action=None):
    """
    Endpoint dedicado para Atajos de Siri (Apple Shortcuts).
    Permite autenticación por token Bearer, X-Shortcut-Token o ?token= sin requerir cookies ni CSRF.
    """
    if not _validate_shortcut_token():
        return jsonify({
            "ok": False,
            "error": "No autorizado: token de atajo inválido o ausente",
            "message": "Token de Atajo de Nicole incorrecto o no configurado."
        }), 401

    if request.is_json:
        payload = request.get_json(silent=True) or {}
    elif request.form:
        payload = request.form.to_dict()
    else:
        payload = request.args.to_dict()

    target_action = action or payload.get("action")
    if not target_action:
        return jsonify({
            "ok": False,
            "error": "Falta especificar la acción",
            "message": "Debes especificar la acción a realizar."
        }), 400

    try:
        result = api_module.handle_shortcut_action(target_action, payload)
        status_code = 200 if result.get("ok") else 400
        return jsonify(result), status_code
    except Exception as e:
        log.exception("Error en /api/shortcut/%s", target_action)
        return jsonify({
            "ok": False,
            "error": str(e),
            "message": f"Ocurrió un error en Nicole: {str(e)}"
        }), 500


@app.route("/api/<func_name>", methods=["POST"])
@login_required
def call_api(func_name):
    # Exigir JSON + mismo origen: un formulario de otro sitio no puede invocar la API (CSRF)
    if not request.is_json or not _same_origin_request():
        return jsonify({"ok": False, "error": "Solicitud inválida"}), 400
    if func_name not in ALLOWED_API:
        return jsonify({"ok": False, "error": "Función no encontrada"}), 404
    fn = getattr(api_module, func_name, None)
    if not callable(fn):
        return jsonify({"ok": False, "error": "Función no encontrada"}), 404
    payload = request.get_json(silent=True) or {}
    args = payload.get("args", []) if isinstance(payload, dict) else []
    if not isinstance(args, list):
        return jsonify({"ok": False, "error": "Argumentos inválidos"}), 400
    try:
        result = fn(*args)
        return jsonify({"ok": True, "result": result})
    except Exception:
        log.exception("Error en /api/%s", func_name)
        return jsonify({"ok": False, "error": "Error interno del servidor"}), 500


@app.route("/")
@login_required
def index():
    return send_from_directory(WEB_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    if not _is_authenticated():
        allowed_public = {"apple-touch-icon.png", "apple-touch-icon-precomposed.png", "favicon.png", "favicon.ico", "manifest.json", "sw.js"}
        if path not in allowed_public:
            return redirect(url_for("login_page"))
    resp = send_from_directory(WEB_DIR, path)
    if path == "sw.js":
        resp.headers["Cache-Control"] = "no-cache"
        resp.headers["Service-Worker-Allowed"] = "/"
    return resp


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"Servidor Cloud iniciado en http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
