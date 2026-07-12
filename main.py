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
        for fname in os.listdir(web_dir):
            fpath = os.path.join(web_dir, fname)
            if not os.path.isfile(fpath):
                continue
            mtime = os.path.getmtime(fpath)
            if fname not in _watched_mtimes:
                _watched_mtimes[fname] = mtime
            elif mtime != _watched_mtimes[fname]:
                _watched_mtimes[fname] = mtime
                _reload_needed = True

if __name__ == "__main__":
    init_db()
    seed_default_config()
    eel.init('web')
    t = threading.Thread(target=watch_web_files, daemon=True)
    t.start()
    eel.start('index.html', size=(1280, 800), position=(100, 50),
              port=0, host='localhost', mode='edge', suppress_error=True)
