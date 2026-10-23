import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "gestion.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_connection()
    conn.executescript("""
        PRAGMA journal_mode=WAL;

        CREATE TABLE IF NOT EXISTS areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );
        INSERT OR IGNORE INTO areas (id, name) VALUES (1, 'Trabajo');
        INSERT OR IGNORE INTO areas (id, name) VALUES (2, 'Universidad');
        INSERT OR IGNORE INTO areas (id, name) VALUES (3, 'Personal');

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            area_id INTEGER NOT NULL,
            category TEXT,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            reminder_days INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (area_id) REFERENCES areas(id)
        );

        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ruc TEXT,
            business_name TEXT NOT NULL,
            contact_name TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            series TEXT,
            number TEXT,
            service TEXT,
            payment_type TEXT,
            amount REAL,
            igv REAL,
            total REAL,
            issue_date TEXT,
            due_date TEXT,
            status TEXT DEFAULT 'issued',
            emailed INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (client_id) REFERENCES clients(id)
        );

        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            document_number TEXT,
            phone TEXT,
            email TEXT,
            position TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS employee_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            doc_type TEXT NOT NULL,
            doc_number TEXT,
            issue_date TEXT,
            expiry_date TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );

        CREATE TABLE IF NOT EXISTS reimbursements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date TEXT,
            concept TEXT,
            amount REAL,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );

        CREATE TABLE IF NOT EXISTS overtime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date TEXT,
            days REAL,
            reason TEXT,
            approved INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );

        CREATE TABLE IF NOT EXISTS lindley_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plant TEXT,
            contact_name TEXT,
            email TEXT,
            phone TEXT,
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS lindley_forms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month INTEGER,
            year INTEGER,
            completed_date TEXT,
            notes TEXT,
            status TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            professor TEXT,
            schedule TEXT,
            year INTEGER,
            status TEXT DEFAULT 'current',
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            type TEXT,
            date TEXT,
            time TEXT,
            topic TEXT,
            grade REAL,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        );

        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT,
            grade REAL,
            group_name TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (subject_id) REFERENCES subjects(id)
        );

        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            frequency TEXT DEFAULT 'daily',
            streak INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS habit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            date TEXT,
            completed INTEGER DEFAULT 1,
            FOREIGN KEY (habit_id) REFERENCES habits(id)
        );

        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE IF NOT EXISTS print_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            piece_name TEXT NOT NULL,
            material TEXT,
            color TEXT,
            quantity INTEGER DEFAULT 1,
            price REAL,
            filament_grams REAL,
            print_hours REAL,
            order_date TEXT,
            delivery_date TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS injections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            dose_mg REAL NOT NULL DEFAULT 4.0,
            injection_site TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS body_measurements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            weight REAL,
            bideltoid_cm REAL,
            bust_cm REAL,
            underbust_cm REAL,
            waist_cm REAL,
            iliac_crest_cm REAL,
            hips_cm REAL,
            thigh_cm REAL,
            arm_cm REAL,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS transition_journal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            title TEXT,
            content TEXT,
            entry_type TEXT DEFAULT 'note',
            milestone_type TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS client_sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            codigo_cliente TEXT,
            codigo_sede TEXT,
            codigo_cliente_sede TEXT UNIQUE,
            nombre_cliente TEXT,
            sede_cliente TEXT,
            distrito TEXT,
            is_regular INTEGER DEFAULT 0,
            monthly_fee REAL,
            servicios TEXT,
            contract_start TEXT,
            contract_end TEXT,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (client_id) REFERENCES clients(id)
        );

        CREATE TABLE IF NOT EXISTS service_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            default_price REAL,
            category TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS client_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            service_type_id INTEGER,
            custom_price REAL,
            notes TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (service_type_id) REFERENCES service_types(id)
        );

        CREATE TABLE IF NOT EXISTS service_descriptions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_type_id INTEGER,
            name TEXT NOT NULL,
            description_text TEXT NOT NULL,
            productos TEXT,
            equipos TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (service_type_id) REFERENCES service_types(id)
        );

        CREATE TABLE IF NOT EXISTS quotes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number TEXT NOT NULL,
            client_id INTEGER NOT NULL,
            client_site_id INTEGER,
            issue_date TEXT,
            valid_until TEXT,
            payment_terms TEXT,
            subtotal REAL DEFAULT 0,
            igv REAL DEFAULT 0,
            total REAL DEFAULT 0,
            status TEXT DEFAULT 'borrador',
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (client_site_id) REFERENCES client_sites(id)
        );

        CREATE TABLE IF NOT EXISTS quote_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quote_id INTEGER NOT NULL,
            service_type_id INTEGER,
            description_id INTEGER,
            description_text TEXT,
            productos_text TEXT,
            equipos_text TEXT,
            quantity REAL DEFAULT 1,
            unit_price REAL DEFAULT 0,
            total REAL DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE,
            FOREIGN KEY (service_type_id) REFERENCES service_types(id),
            FOREIGN KEY (description_id) REFERENCES service_descriptions(id)
        );

        CREATE TABLE IF NOT EXISTS service_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT NOT NULL,
            employee_id INTEGER NOT NULL,
            client_site_id INTEGER,
            hora_ingreso TEXT,
            hora_salida TEXT,
            evidencia INTEGER DEFAULT 0,
            observaciones TEXT,
            horas_trabajadas REAL,
            traslado_min REAL DEFAULT 0,
            status TEXT DEFAULT 'active',
            semana INTEGER,
            año INTEGER,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (client_site_id) REFERENCES client_sites(id)
        );

        CREATE TABLE IF NOT EXISTS daily_control (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_revision TEXT NOT NULL,
            employee_id INTEGER NOT NULL,
            sede_operativa TEXT,
            responsable TEXT,
            se_presento INTEGER DEFAULT 1,
            horas_dia REAL DEFAULT 0,
            evidencia_dia INTEGER DEFAULT 0,
            pendientes_sin_salida INTEGER DEFAULT 0,
            observaciones TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (employee_id) REFERENCES employees(id)
        );
    """)

    # Migrations for existing databases
    for stmt in [
        "ALTER TABLE injections ADD COLUMN injection_site TEXT",
        "ALTER TABLE employees ADD COLUMN sede_operativa TEXT",
        "ALTER TABLE employees ADD COLUMN responsable TEXT",
        "ALTER TABLE client_sites ADD COLUMN client_id INTEGER REFERENCES clients(id)",
        "ALTER TABLE service_records ADD COLUMN client_site_id INTEGER REFERENCES client_sites(id)",
        "ALTER TABLE service_records ADD COLUMN status TEXT DEFAULT 'active'",
        "ALTER TABLE daily_control ADD COLUMN observaciones TEXT",
        "ALTER TABLE employee_documents ADD COLUMN file_data BLOB",
        "ALTER TABLE employee_documents ADD COLUMN file_name TEXT",
        "ALTER TABLE employee_documents ADD COLUMN file_type TEXT",
        "ALTER TABLE clients ADD COLUMN is_regular INTEGER DEFAULT 0",
        "ALTER TABLE clients ADD COLUMN monthly_fee REAL",
        "ALTER TABLE clients ADD COLUMN servicios TEXT",
        "ALTER TABLE client_sites ADD COLUMN is_regular INTEGER DEFAULT 0",
        "ALTER TABLE client_sites ADD COLUMN monthly_fee REAL",
        "ALTER TABLE client_sites ADD COLUMN servicios TEXT",
        "ALTER TABLE client_sites ADD COLUMN contract_start TEXT",
        "ALTER TABLE client_sites ADD COLUMN contract_end TEXT",
        "ALTER TABLE client_sites ADD COLUMN is_active INTEGER DEFAULT 1",
        "ALTER TABLE invoices ADD COLUMN client_site_id INTEGER REFERENCES client_sites(id)",
        "ALTER TABLE invoices ADD COLUMN month_billed INTEGER",
        "ALTER TABLE invoices ADD COLUMN year_billed INTEGER",
        "CREATE TABLE IF NOT EXISTS service_descriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, service_type_id INTEGER, name TEXT NOT NULL, description_text TEXT NOT NULL, productos TEXT, equipos TEXT, created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (service_type_id) REFERENCES service_types(id))",
        "CREATE TABLE IF NOT EXISTS quotes (id INTEGER PRIMARY KEY AUTOINCREMENT, number TEXT NOT NULL, client_id INTEGER NOT NULL, client_site_id INTEGER, issue_date TEXT, valid_until TEXT, payment_terms TEXT, subtotal REAL DEFAULT 0, igv REAL DEFAULT 0, total REAL DEFAULT 0, status TEXT DEFAULT 'borrador', created_at TEXT DEFAULT (datetime('now','localtime')), FOREIGN KEY (client_id) REFERENCES clients(id), FOREIGN KEY (client_site_id) REFERENCES client_sites(id))",
        "CREATE TABLE IF NOT EXISTS quote_items (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id INTEGER NOT NULL, service_type_id INTEGER, description_id INTEGER, description_text TEXT, productos_text TEXT, equipos_text TEXT, quantity REAL DEFAULT 1, unit_price REAL DEFAULT 0, total REAL DEFAULT 0, sort_order INTEGER DEFAULT 0, FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE, FOREIGN KEY (service_type_id) REFERENCES service_types(id), FOREIGN KEY (description_id) REFERENCES service_descriptions(id))",
        "ALTER TABLE quote_items ADD COLUMN sort_order INTEGER DEFAULT 0",
        """CREATE TABLE IF NOT EXISTS workout_days (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_number INTEGER,
            name TEXT NOT NULL,
            subtitle TEXT,
            warmup_notes TEXT,
            cooldown_notes TEXT,
            sort_order INTEGER DEFAULT 0
        )""",
        """CREATE TABLE IF NOT EXISTS workout_exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_id INTEGER NOT NULL,
            phase TEXT DEFAULT 'Principal',
            name TEXT NOT NULL,
            sets INTEGER DEFAULT 3,
            reps_text TEXT,
            equipment TEXT,
            default_weight_kg REAL DEFAULT 0,
            rest_seconds INTEGER DEFAULT 60,
            is_trackable INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (day_id) REFERENCES workout_days(id) ON DELETE CASCADE
        )""",
        """CREATE TABLE IF NOT EXISTS workout_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day_id INTEGER,
            day_name TEXT,
            date TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 0,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS workout_set_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            exercise_name TEXT NOT NULL,
            set_number INTEGER DEFAULT 1,
            weight_kg REAL DEFAULT 0,
            reps INTEGER DEFAULT 0,
            duration_sec INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 1,
            date TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
        )""",
        "ALTER TABLE body_measurements ADD COLUMN bideltoid_cm REAL",
        "ALTER TABLE body_measurements ADD COLUMN underbust_cm REAL",
        "ALTER TABLE body_measurements ADD COLUMN iliac_crest_cm REAL",
        """CREATE TABLE IF NOT EXISTS cosplay_projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_name TEXT NOT NULL,
            series_name TEXT,
            client_name TEXT,
            client_contact TEXT,
            project_type TEXT DEFAULT 'Comisión',
            category TEXT DEFAULT 'Traje completo',
            size_measurements TEXT,
            price REAL DEFAULT 0,
            deposit REAL DEFAULT 0,
            materials_cost REAL DEFAULT 0,
            due_date TEXT,
            status TEXT DEFAULT 'cotizado',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS cosplay_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            item_type TEXT DEFAULT 'Material',
            cost REAL DEFAULT 0,
            done INTEGER DEFAULT 0,
            FOREIGN KEY (project_id) REFERENCES cosplay_projects(id) ON DELETE CASCADE
        )""",
        """CREATE TABLE IF NOT EXISTS cosplay_clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            contact TEXT,
            size_measurements TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
    ]:
        try:
            conn.execute(stmt)
        except:
            pass

    conn.commit()
    seed_default_workouts(conn)
    apply_cleanups_and_seeds(conn)
    conn.close()


def apply_cleanups_and_seeds(conn):
    # 1. One-time cleanup of Work, University, and 3D databases
    already_cleaned = conn.execute("SELECT value FROM config WHERE key='wipe_work_uni_3d_v1'").fetchone()
    if not already_cleaned:
        conn.execute("PRAGMA foreign_keys = OFF")
        for tbl in [
            "quote_items", "quotes", "invoices", "service_records", "daily_control",
            "client_services", "client_sites", "clients",
            "employee_documents", "reimbursements", "overtime", "employees",
            "lindley_contacts", "lindley_forms",
            "exams", "assignments", "subjects",
            "print_orders"
        ]:
            try:
                conn.execute(f"DELETE FROM {tbl}")
            except Exception:
                pass
        try:
            conn.execute("DELETE FROM tasks WHERE area_id IN (1, 2)")
        except Exception:
            pass
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('wipe_work_uni_3d_v1', '1')")
        conn.commit()

    # 2. Ensure historical Apple Health weight records are present (for cloud or local)
    apple_weights = [
        ("2022-12-30", 51.0), ("2024-03-04", 51.3), ("2024-08-29", 51.0), ("2024-09-25", 49.0),
        ("2024-10-08", 49.2), ("2024-10-20", 49.1), ("2024-12-16", 49.4), ("2025-02-01", 47.0),
        ("2025-02-21", 48.0), ("2025-03-09", 48.8), ("2025-03-10", 47.5), ("2025-03-11", 49.0),
        ("2025-03-20", 48.0), ("2025-05-03", 50.0), ("2025-06-08", 50.0), ("2025-06-21", 49.5),
        ("2025-07-07", 51.6), ("2025-09-09", 50.0), ("2025-09-23", 51.0), ("2025-09-28", 50.4),
        ("2025-09-29", 51.4), ("2025-09-30", 50.8), ("2025-10-01", 50.6), ("2025-10-02", 50.5),
        ("2025-10-03", 50.4), ("2025-10-04", 50.0), ("2025-10-05", 50.5), ("2025-10-06", 51.5),
        ("2025-10-07", 51.5), ("2025-10-08", 51.8), ("2025-10-12", 52.0), ("2025-10-13", 52.0),
        ("2025-10-20", 52.5), ("2025-10-24", 53.0), ("2025-10-30", 53.6), ("2025-11-11", 54.0),
        ("2025-11-16", 54.5), ("2025-11-18", 55.2), ("2025-11-28", 54.5), ("2025-12-03", 54.2),
        ("2025-12-08", 55.0), ("2025-12-23", 54.2), ("2026-01-01", 55.0), ("2026-01-13", 55.5),
        ("2026-01-23", 53.5), ("2026-02-01", 53.7), ("2026-02-23", 53.8), ("2026-05-12", 53.6),
        ("2026-07-04", 52.4), ("2026-08-29", 51.0), ("2026-09-29", 50.8),
    ]
    for dt, w in apple_weights:
        row = conn.execute("SELECT id, weight FROM body_measurements WHERE date=?", (dt,)).fetchone()
        if not row:
            conn.execute("INSERT INTO body_measurements (date, weight) VALUES (?, ?)", (dt, w))
        elif row["weight"] is None:
            conn.execute("UPDATE body_measurements SET weight=? WHERE id=?", (w, row["id"]))

    # 3. One-time fix for workout sessions & habit logs shifted +1 day due to UTC after 21:00 Argentina time
    fixed_utc = conn.execute("SELECT value FROM config WHERE key='fix_utc_workout_dates_v1'").fetchone()
    if not fixed_utc:
        try:
            shifted = conn.execute("""
                SELECT id, date, date(created_at, '-3 hours') as ar_date
                FROM workout_sessions
                WHERE created_at IS NOT NULL AND date(created_at, '-3 hours') < date
            """).fetchall()
            for s in shifted:
                conn.execute("UPDATE workout_sessions SET date=? WHERE id=?", (s["ar_date"], s["id"]))
                conn.execute("UPDATE workout_set_logs SET date=? WHERE session_id=?", (s["ar_date"], s["id"]))
                conn.execute("UPDATE habit_logs SET date=? WHERE date=?", (s["ar_date"], s["date"]))
        except Exception:
            pass
        conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('fix_utc_workout_dates_v1', '1')")

    # 4. Sync all workout session dates with any exercise habit (e.g. 'Hacer ejercicio')
    try:
        ex_habits = conn.execute("""
            SELECT id FROM habits
            WHERE LOWER(name) LIKE '%ejercicio%' OR LOWER(name) LIKE '%entren%' OR LOWER(name) LIKE '%rutina%' OR LOWER(name) LIKE '%gym%'
        """).fetchall()
        w_dates = [r[0] for r in conn.execute("SELECT DISTINCT date FROM workout_sessions WHERE date IS NOT NULL").fetchall()]
        for h in ex_habits:
            hid = h["id"]
            for wd in w_dates:
                exists = conn.execute("SELECT id FROM habit_logs WHERE habit_id=? AND date=?", (hid, wd)).fetchone()
                if not exists:
                    conn.execute("INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)", (hid, wd))
            streak = conn.execute("SELECT COUNT(DISTINCT date) FROM habit_logs WHERE habit_id=?", (hid,)).fetchone()[0]
            conn.execute("UPDATE habits SET streak=? WHERE id=?", (streak, hid))
    except Exception:
        pass

    conn.commit()


def seed_default_workouts(conn):
    count = conn.execute("SELECT COUNT(*) FROM workout_days").fetchone()[0]
    if count > 0:
        return

    post_stretch = (
        "Estiramientos Post-Entrenamiento (Obligatorio para proteger postura y elongar aductores):\n"
        "• Estiramiento de Mariposa: Sentada con plantas de los pies juntas, empujando suavemente rodillas hacia el piso (45 seg).\n"
        "• Figura de 4 (Pie base en el piso): Acostada boca arriba, cruzando un tobillo sobre la rodilla opuesta (30 seg por pierna).\n"
        "• Estiramiento 90-90: Sentada en el piso con ambas piernas flexionadas a 90°, una rotada hacia afuera y otra hacia adentro (30 seg por lado)."
    )
    warmup_std = "Flow de isquiotibiales + Lunges para el psoas (5 - 10 minutos · Peso corporal)"

    days_data = [
        (1, "Día 1: Ensanchamiento Lateral y Zancadas", "Glúteo medio, abducción y piernas", warmup_std, post_stretch, 1, [
            ("Principal", "Clamshells (Almejas)", 3, "15 (por lado)", "Banda nivel Medio", 0, 45, 1),
            ("Principal", "Abducción Tumbada", 4, "15 (por lado)", "Disco Suelto sobre el muslo", 5.0, 60, 1),
            ("Principal", "Zancadas", 3, "12 (por pierna)", "Par de Mancuernas (4kg totales)", 4.0, 60, 1),
            ("Principal", "Abducción Sentada", 4, "20", "Banda nivel Fuerte", 0, 45, 1),
        ]),
        (2, "Día 2: Abdomen de Corsé (Vacuums 1)", "Core profundo, cintura y estabilidad", None, None, 2, [
            ("Principal", "Levantamiento de piernas", 2, "15", "Peso corporal", 0, 45, 1),
            ("Principal", "Stomach Vacuums", 5, "15 segundos", "Peso corporal", 0, 30, 1),
            ("Principal", "Plancha Frontal (Plank)", 4, "Fallo", "Peso corporal", 0, 60, 1),
            ("Principal", "Plancha Lateral", 3, "30 segundos (por lado)", "Peso corporal", 0, 45, 1),
        ]),
        (3, "Día 3: Proyección", "Fuerza e hipertrofia de glúteo e isquios", warmup_std, post_stretch, 3, [
            ("Principal", "Real Hip Thrust", 3, "12", "Barra Armada (9.5kg)", 9.5, 90, 1),
            ("Principal", "Split Squat (Sentadilla Dividida)", 3, "12 (por pierna)", "Par de Mancuernas (4kg c/u)", 8.0, 75, 1),
            ("Principal", "Peso Muerto Rumano (Normal)", 3, "12", "Par de Mancuernas (4kg c/u)", 8.0, 75, 1),
        ]),
        (4, "Día 4: Bombeo Lateral (Vacuums 2)", "Aislamiento de glúteo con bandas y core", None, post_stretch, 4, [
            ("Principal", "Caminata Lateral (Monster Walks)", 4, "20 pasos totales", "Banda nivel Fuerte", 0, 45, 1),
            ("Principal", "Donkey Kicks (Patadas de burro)", 3, "12 (por pierna)", "Banda nivel Medio", 0, 45, 1),
            ("Principal", "Patada Lateral de Pie", 4, "15 (por lado)", "Banda nivel Fuerte", 0, 45, 1),
            ("Principal", "Stomach Vacuums", 5, "15 segundos", "Peso corporal", 0, 30, 1),
        ]),
        (5, "Día 5: Glúteo Integral", "Trabajo completo de tren inferior", warmup_std, post_stretch, 5, [
            ("Principal", "Hip Thrust Acostada (Puente)", 3, "15", "Mancuerna Pesada (8kg cadera)", 8.0, 60, 1),
            ("Principal", "Sentadilla Copa (Goblet Squat)", 4, "12", "Mancuerna Pesada (en pecho)", 8.0, 75, 1),
            ("Principal", "Zancadas Inversas", 3, "12 (por pierna)", "Par de Mancuernas ligeras", 4.0, 60, 1),
        ]),
        (6, "Día 6: Postura, Flexibilidad y Relax (Circuito Continuo)", "Realizar el circuito principal de 3 a 4 rondas seguidas, fluyendo de un movimiento al otro", None, None, 6, [
            ("Circuito (3-4 Rondas)", "Flow de isquiotibiales", 4, "Fluido", "Peso corporal", 0, 20, 1),
            ("Circuito (3-4 Rondas)", "Lunges para el psoas", 4, "Fluido", "Peso corporal", 0, 20, 1),
            ("Circuito (3-4 Rondas)", "Estiramiento 90-90", 4, "Fluido", "Peso corporal", 0, 20, 1),
            ("Circuito (3-4 Rondas)", "Alcance de pies sentada", 4, "Fluido", "Peso corporal", 0, 20, 1),
            ("Cierre", "Apertura de pecho en marco de puerta", 3, "30 segundos", "Marco de puerta", 0, 30, 1),
            ("Cierre", "Stomach Vacuums", 5, "15 segundos", "Peso corporal", 0, 30, 1),
        ]),
    ]

    for day_num, name, subtitle, warmup, cooldown, sort_ord, exercises in days_data:
        cur = conn.execute("""
            INSERT INTO workout_days (day_number, name, subtitle, warmup_notes, cooldown_notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (day_num, name, subtitle, warmup, cooldown, sort_ord))
        day_id = cur.lastrowid
        for idx, (phase, ex_name, sets, reps_text, equip, weight, rest_s, trackable) in enumerate(exercises, start=1):
            conn.execute("""
                INSERT INTO workout_exercises
                (day_id, phase, name, sets, reps_text, equipment, default_weight_kg, rest_seconds, is_trackable, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (day_id, phase, ex_name, sets, reps_text, equip, weight, rest_s, trackable, idx))
    conn.commit()

