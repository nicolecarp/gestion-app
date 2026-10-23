import eel
import api
import threading
import time
import os
from database import init_db, get_connection

_reload_needed = False
_watched_mtimes = {}

def seed_default_config():
    conn = get_connection()
    defaults = [
        ('print3d_price_per_gram', '1.5'),
        ('print3d_price_per_hour', '5.0'),
        ('tt_tope_traslado', '60'),
        ('tt_semana_tipo', '2'),
        ('tt_meta_semanal', '48'),
        ('tt_peso_horas', '0.7'),
        ('tt_peso_evidencia', '0.3'),
    ]
    for key, value in defaults:
        conn.execute("INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

@eel.expose
def check_reload():
    global _reload_needed
    if _reload_needed:
        _reload_needed = False
        return True
    return False

def watch_web_files():
    global _reload_needed, _watched_mtimes
    web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'web')
    while True:
        time.sleep(1)
        for root, _, files in os.walk(web_dir):
            for fname in files:
                fpath = os.path.join(root, fname)
                if not os.path.isfile(fpath):
                    continue
                mtime = os.path.getmtime(fpath)
                if fpath not in _watched_mtimes:
                    _watched_mtimes[fpath] = mtime
                elif mtime != _watched_mtimes[fpath]:
                    _watched_mtimes[fpath] = mtime
                    _reload_needed = True

@eel.expose
def get_lan_info():
    import socket
    ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass
    return {
        "ip": ip,
        "port": 8080,
        "url": f"http://{ip}:8080/index.html"
    }

def on_close(page, sockets):
    # No cerramos el proceso al cerrar una pestaña para que siga disponible desde el iPhone
    pass

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(base_dir)
    init_db()
    seed_default_config()
    eel.init(os.path.join(base_dir, 'web'))
    t = threading.Thread(target=watch_web_files, daemon=True)
    t.start()

    # Si ya está corriendo en el puerto 8080, solo abrimos la ventana y salimos
    import socket, subprocess
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex(('localhost', 8080)) == 0:
            chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
            if os.path.exists(chrome_path):
                subprocess.Popen([chrome_path, "--app=http://localhost:8080/index.html"])
            else:
                import webbrowser
                webbrowser.open("http://localhost:8080/index.html")
            raise SystemExit(0)

    try:
        eel.start('index.html', size=(1280, 800), position=(100, 50),
                  port=8080, host='0.0.0.0', mode='chrome', close_callback=on_close, suppress_error=True)
    except Exception:
        eel.start('index.html', size=(1280, 800), position=(100, 50),
                  port=8080, host='0.0.0.0', mode='default', close_callback=on_close, suppress_error=True)



