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

        CREATE TABLE IF NOT EXISTS purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            client_site_id INTEGER,
            year INTEGER NOT NULL,
            month INTEGER NOT NULL,
            oc_number TEXT NOT NULL,
            amount REAL,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (client_site_id) REFERENCES client_sites(id)
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

        CREATE TABLE IF NOT EXISTS curriculum_status (
            subject_id INTEGER PRIMARY KEY,
            status TEXT NOT NULL,
            grade REAL,
            note TEXT,
            updated_at TEXT DEFAULT (datetime('now','localtime'))
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
        INSERT OR IGNORE INTO config (key, value) VALUES ('daily_notif_time', '09:00');
        INSERT OR IGNORE INTO config (key, value) VALUES ('weather_city', 'Avellaneda, Buenos Aires');

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
        "ALTER TABLE invoices ADD COLUMN purchase_order TEXT",
        "ALTER TABLE invoices ADD COLUMN detraccion REAL DEFAULT 0",
        "ALTER TABLE invoices ADD COLUMN credito REAL DEFAULT 0",
        "ALTER TABLE invoices ADD COLUMN location_code TEXT",
        "ALTER TABLE invoices ADD COLUMN items_json TEXT",
        "ALTER TABLE client_sites ADD COLUMN location_code TEXT",
        "ALTER TABLE purchase_orders ADD COLUMN periodicity TEXT DEFAULT 'mensual'",
        "ALTER TABLE purchase_orders ADD COLUMN issue_date TEXT",
        "ALTER TABLE purchase_orders ADD COLUMN centro_logistico TEXT",
        "ALTER TABLE purchase_orders ADD COLUMN id_centro_logistico TEXT",
        "ALTER TABLE purchase_orders ADD COLUMN sociedad_code TEXT",
        "ALTER TABLE purchase_orders ADD COLUMN sociedad_name TEXT",
        "ALTER TABLE purchase_orders ADD COLUMN items_json TEXT",
        "ALTER TABLE client_sites ADD COLUMN periodicity TEXT DEFAULT 'mensual'",
        "ALTER TABLE client_sites ADD COLUMN centro_logistico TEXT",
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
        "INSERT OR IGNORE INTO config (key, value) VALUES ('daily_notif_time', '09:00')",
        "INSERT OR IGNORE INTO config (key, value) VALUES ('weather_city', 'Avellaneda, Buenos Aires')",
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
        """CREATE TABLE IF NOT EXISTS finance_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            account_type TEXT DEFAULT 'wallet',
            currency TEXT DEFAULT 'ARS',
            initial_balance REAL DEFAULT 0.0,
            color TEXT DEFAULT '#8b5cf6',
            icon TEXT DEFAULT '💳',
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS finance_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            icon TEXT DEFAULT '🏷️',
            color TEXT DEFAULT '#f43f5e',
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS finance_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT 'Meta Operación',
            target_amount REAL NOT NULL DEFAULT 5000.0,
            current_amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'USD',
            target_date TEXT,
            usd_exchange_rate REAL DEFAULT 1200.0,
            notes TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS finance_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
            category_id INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'ARS',
            date TEXT NOT NULL,
            description TEXT,
            destination_account_id INTEGER REFERENCES finance_accounts(id) ON DELETE SET NULL,
            goal_id INTEGER REFERENCES finance_goals(id) ON DELETE SET NULL,
            goal_amount_usd REAL DEFAULT 0.0,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        "CREATE INDEX IF NOT EXISTS idx_finance_tx_date ON finance_transactions(date)",
        "CREATE INDEX IF NOT EXISTS idx_finance_tx_account ON finance_transactions(account_id)",
        "CREATE INDEX IF NOT EXISTS idx_finance_tx_category ON finance_transactions(category_id)",
        "CREATE INDEX IF NOT EXISTS idx_finance_tx_goal ON finance_transactions(goal_id)",
        """CREATE TABLE IF NOT EXISTS finance_debts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            creditor TEXT,
            total_amount REAL NOT NULL,
            initial_paid REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'ARS',
            due_date TEXT,
            installments_total INTEGER DEFAULT 1,
            installments_paid INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS finance_debt_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            debt_id INTEGER NOT NULL REFERENCES finance_debts(id) ON DELETE CASCADE,
            transaction_id INTEGER REFERENCES finance_transactions(id) ON DELETE SET NULL,
            account_id INTEGER REFERENCES finance_accounts(id) ON DELETE SET NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            installment_number INTEGER,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS finance_recurring_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category_id INTEGER REFERENCES finance_categories(id) ON DELETE SET NULL,
            account_id INTEGER REFERENCES finance_accounts(id) ON DELETE SET NULL,
            amount REAL NOT NULL,
            currency TEXT DEFAULT 'ARS',
            due_day INTEGER DEFAULT 10,
            auto_debit INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime'))
        )""",
        """CREATE TABLE IF NOT EXISTS finance_recurring_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recurring_id INTEGER NOT NULL REFERENCES finance_recurring_expenses(id) ON DELETE CASCADE,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            paid_amount REAL NOT NULL,
            paid_date TEXT NOT NULL,
            transaction_id INTEGER REFERENCES finance_transactions(id) ON DELETE SET NULL,
            is_paid INTEGER DEFAULT 1,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            UNIQUE(recurring_id, month, year)
        )""",
        """CREATE TABLE IF NOT EXISTS finance_salaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            expected_amount REAL NOT NULL,
            received_amount REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'ARS',
            payment_date TEXT,
            account_id INTEGER REFERENCES finance_accounts(id) ON DELETE SET NULL,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            transaction_id INTEGER REFERENCES finance_transactions(id) ON DELETE SET NULL,
            created_at TEXT DEFAULT (datetime('now','localtime')),
            UNIQUE(month, year)
        )""",
        "CREATE INDEX IF NOT EXISTS idx_finance_debts_status ON finance_debts(status)",
        "CREATE INDEX IF NOT EXISTS idx_finance_debt_payments_debt ON finance_debt_payments(debt_id)",
        "CREATE INDEX IF NOT EXISTS idx_finance_recurring_due ON finance_recurring_expenses(due_day)",
        "CREATE INDEX IF NOT EXISTS idx_finance_salaries_my ON finance_salaries(month, year)",
        "ALTER TABLE employee_documents ADD COLUMN external_url TEXT",
        "ALTER TABLE employees ADD COLUMN onedrive_folder_url TEXT",
        "UPDATE config SET value = 'Avellaneda, Buenos Aires' WHERE key = 'weather_city' AND value = 'Buenos Aires'",
    ]:
        try:
            conn.execute(stmt)
        except:
            pass

    # Ensure extra columns exist on subjects
    existing_cols = {r[1] for r in conn.execute("PRAGMA table_info(subjects)").fetchall()}
    subject_cols = [
        ("commission", "TEXT"),
        ("classroom", "TEXT"),
        ("virtual_link", "TEXT"),
        ("zoom_id", "TEXT"),
        ("subject_code", "TEXT"),
        ("current_status_note", "TEXT"),
        ("day_of_week", "TEXT"),
        ("start_time", "TEXT"),
        ("end_time", "TEXT"),
        ("shift", "TEXT"),
    ]
    for col_name, col_type in subject_cols:
        if col_name not in existing_cols:
            try:
                conn.execute(f"ALTER TABLE subjects ADD COLUMN {col_name} {col_type}")
            except Exception:
                pass

    conn.commit()
    seed_default_workouts(conn)
    seed_default_finance(conn)
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

    # 5. One-time update of warmup_notes and cooldown_notes with full step-by-step guides
    updated_guides = conn.execute("SELECT value FROM config WHERE key='update_warmup_cooldown_guides_v1'").fetchone()
    if not updated_guides:
        warmup_full = (
            "Flow de Isquiotibiales (Repetir 5 a 8 veces)\n"
            "• Párate con los pies separados al ancho de tus hombros.\n"
            "• Agáchate en una sentadilla profunda y sujeta las puntas de tus pies (o tus tobillos si no llegas).\n"
            "• Manteniendo las manos en tus pies, levanta la cadera hacia el techo e intenta estirar las rodillas lo máximo posible. Mantén la cabeza hacia abajo. Sentirás el estirón en la parte trasera de los muslos.\n"
            "• Sostén esa posición estirada por 2 segundos.\n"
            "• Vuelve a bajar la cadera hacia la posición de sentadilla profunda, levanta el pecho y mira hacia adelante.\n\n"
            "Lunges para el Psoas (Repetir 5 a 8 veces por pierna)\n"
            "• Apoya una rodilla en el piso y pisa con el otro pie hacia adelante (como si te estuvieras arrodillando para pedir matrimonio). Ambas rodillas deben formar un ángulo de 90 grados.\n"
            "• Mantén la espalda completamente recta y contrae el abdomen.\n"
            "• Empuja tu cadera suavemente hacia adelante, sin arquear la espalda baja ni inclinar el torso. Debes sentir el estiramiento en la parte frontal de la cadera de la pierna que está apoyada en el piso.\n"
            "• Sostén la máxima tensión por 2 segundos.\n"
            "• Retrocede suavemente la cadera a la posición inicial.\n\n"
            "⏱ Realiza estos dos movimientos de forma continua, alternando entre ellos, hasta cumplir entre 5 y 10 minutos en total antes de tocar las pesas."
        )
        cooldown_full = (
            "Estiramiento de Mariposa (45 segundos)\n"
            "• Siéntate en el piso, junta las plantas de tus pies y acerca los talones hacia tu pelvis.\n"
            "• Sujeta tus pies con las manos, mantén la espalda derecha y empuja suavemente las rodillas hacia el piso para elongar los aductores.\n\n"
            "Figura de 4 con pie base en el piso (30 segundos por pierna)\n"
            "• Acuéstate boca arriba con las rodillas flexionadas y los pies apoyados en el piso.\n"
            "• Cruza un tobillo sobre la rodilla opuesta formando un 4 y empuja suavemente la rodilla cruzada o acerca el muslo base hacia el pecho para estirar el glúteo profundo y piriforme.\n\n"
            "Estiramiento 90-90 (30 segundos por lado)\n"
            "• Siéntate en el piso con la pierna delantera flexionada a 90° frente a ti (rotación externa) y la pierna trasera flexionada a 90° hacia el costado (rotación interna).\n"
            "• Mantén la espalda larga e inclina suavemente el torso hacia la pierna delantera, luego cambia de lado."
        )
        conn.execute("UPDATE workout_days SET warmup_notes=? WHERE warmup_notes IS NOT NULL AND TRIM(warmup_notes) != ''", (warmup_full,))
        conn.execute("UPDATE workout_days SET cooldown_notes=? WHERE cooldown_notes IS NOT NULL AND TRIM(cooldown_notes) != ''", (cooldown_full,))
        conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('update_warmup_cooldown_guides_v1', '1')")

    # 6. Seed UTN Industrial 2026 courses, exams, assignments and curriculum status
    seed_utn = conn.execute("SELECT value FROM config WHERE key='seed_utn_industrial_2026_v2'").fetchone()
    if not seed_utn:
        courses = [
            {
                "name": "Informática II",
                "commission": "2-51-N",
                "day_of_week": "Lunes",
                "start_time": "18:15",
                "end_time": "20:30",
                "shift": "NOCHE",
                "classroom": "Sede Villa Domínico (Lab. PC)",
                "virtual_link": "https://utn.zoom.us/j/6241424085?omn=83018473600",
                "zoom_id": "624 142 4085",
                "professor": "Arq. Ricardo Filipič / Lic. David Fernández / Ing. Mariano Esains",
                "schedule": "Lunes 18:15 a 20:30 hs",
                "year": 2026,
                "status": "current",
                "subject_code": "15",
                "current_status_note": "Debe 1° Parcial (Temario: Bases de Datos/Access/SQL y CATIA V5)"
            },
            {
                "name": "Física I",
                "commission": "1-11-R (Lab Grupo 6)",
                "day_of_week": "Martes",
                "start_time": "18:15",
                "end_time": "22:15",
                "shift": "NOCHE",
                "classroom": "Sede Villa Domínico (Aula turno noche y Lab. de Física)",
                "virtual_link": None,
                "zoom_id": None,
                "professor": "Mg. Sonia Páez / Ing. Juan Carlos Ruiz / Ing. Gastón Acerbi",
                "schedule": "Martes 18:15 a 22:15 hs",
                "year": 2026,
                "status": "current",
                "subject_code": "6",
                "current_status_note": "Debe 1° Parcial. Lab Grupo 6: 7/7 presentes, regularizar TPs 2-5 y 7"
            },
            {
                "name": "Álgebra y Geometría Analítica",
                "commission": "1-103",
                "day_of_week": "Miércoles",
                "start_time": "08:45",
                "end_time": "12:45",
                "shift": "MANANA",
                "classroom": "Aula F102 (1° Piso Edificio Industrial, Sede Villa Domínico)",
                "virtual_link": "https://utn.zoom.us/j/9833843504",
                "zoom_id": "983 384 3504",
                "professor": "Prof. Gabriela Frankel / Prof. María Cristina La Marca",
                "schedule": "Miércoles 08:45 a 12:45 hs",
                "year": 2026,
                "status": "current",
                "subject_code": "7",
                "current_status_note": "Debe 1° Parcial (U1 a U6). Se aprueba con 60%"
            },
            {
                "name": "Química General",
                "commission": "1-1-S (1°1° Noche)",
                "day_of_week": "Jueves",
                "start_time": "18:15",
                "end_time": "22:15",
                "shift": "NOCHE",
                "classroom": "Sede Villa Domínico (Aula turno noche y Lab. de Química 19:00 hs)",
                "virtual_link": None,
                "zoom_id": None,
                "professor": "Prof. Ricardo Krotki / Lic. Eduardo R. Godoy / Ing. Rubén Fernández",
                "schedule": "Jueves 18:15 a 22:15 hs",
                "year": 2026,
                "status": "current",
                "subject_code": "2",
                "current_status_note": "Cursando en com. 1°1° Jueves Noche. TPs de Lab hasta TP 8 Electroquímica"
            },
            {
                "name": "Análisis Matemático I",
                "commission": "1-1-S (1°1° Noche)",
                "day_of_week": "Viernes",
                "start_time": "18:15",
                "end_time": "22:15",
                "shift": "NOCHE",
                "classroom": "Sede Villa Domínico (Aula turno noche asignada por Bedelía)",
                "virtual_link": None,
                "zoom_id": None,
                "professor": "UDB Matemática FRA / Prof. Stella Boutet",
                "schedule": "Viernes 18:15 a 22:15 hs",
                "year": 2026,
                "status": "current",
                "subject_code": "1",
                "current_status_note": "Debe 1° Parcial (TPs 1 a 6). Examen Bloque AND (Regularidad) y AD"
            },
            {
                "name": "Sistemas de Representación",
                "commission": "1-32-O / [1-8, 1-9, 1-57]",
                "day_of_week": "Sábado",
                "start_time": "08:00",
                "end_time": "10:15",
                "shift": "MANANA",
                "classroom": "Sede Villa Domínico",
                "virtual_link": "https://utn.zoom.us/j/4540223852?pwd=b0FRRUZaT2wwZDNiT0YreG50ZHd1UT09",
                "zoom_id": "454 022 3852 (Código: 15ASN)",
                "professor": "Ing. Diego E. Valdez / Ing. Ariel Martín Garijo",
                "schedule": "Sábados 08:00 a 10:15 hs",
                "year": 2026,
                "status": "current",
                "subject_code": "3",
                "current_status_note": "SolidWorks + Plano Final impreso físicamente en hoja A4/A3"
            },
            {
                "name": "Inglés I / II",
                "commission": "2°73° / Final Libre",
                "day_of_week": "Libre",
                "start_time": None,
                "end_time": None,
                "shift": "LIBRE",
                "classroom": "Mesa de Examen Final (Sede Villa Domínico)",
                "virtual_link": None,
                "zoom_id": None,
                "professor": "Dra. Karina Cecilia Ferrando (UDB Cultura e Idiomas)",
                "schedule": "Examen Final Libre / Suficiencia",
                "year": 2026,
                "status": "current",
                "subject_code": "16",
                "current_status_note": "Habilitada para rendir Examen Final Libre / Suficiencia"
            },
            {
                "name": "Informática I",
                "commission": "1°54 (2025)",
                "day_of_week": None,
                "start_time": None,
                "end_time": None,
                "shift": None,
                "classroom": "UTN FRA",
                "virtual_link": None,
                "zoom_id": None,
                "professor": "Lic. David Fernández / Arq. Ricardo Filipič",
                "schedule": "Cursada en 2025 (Promocionada)",
                "year": 2025,
                "status": "passed",
                "subject_code": "4",
                "current_status_note": "Aprobada / Promocionada en 2025 con nota 9"
            },
            {
                "name": "Pensamiento Sistémico (Integradora I)",
                "commission": "1°54 (2025)",
                "day_of_week": None,
                "start_time": None,
                "end_time": None,
                "shift": None,
                "classroom": "UTN FRA",
                "virtual_link": None,
                "zoom_id": None,
                "professor": "Ing. Fernando Cacciavillani / Ing. José Antonio Folino / Ing. Fernando Mieites",
                "schedule": "Cursada en 2025 (Promocionada)",
                "year": 2025,
                "status": "passed",
                "subject_code": "5",
                "current_status_note": "Aprobada / Promocionada en 2025 con nota 8"
            },
            {
                "name": "Ingeniería y Sociedad",
                "commission": "1°103 (2025)",
                "day_of_week": None,
                "start_time": None,
                "end_time": None,
                "shift": None,
                "classroom": "UTN FRA",
                "virtual_link": None,
                "zoom_id": None,
                "professor": "Dra. Karina Cecilia Ferrando / Prof. Olga Páez",
                "schedule": "Cursada en 2025 (Final aprobado)",
                "year": 2025,
                "status": "passed",
                "subject_code": "8",
                "current_status_note": "Aprobada con final en 2025 con nota 8"
            }
        ]

        subj_id_map = {}
        for c in courses:
            row = conn.execute("SELECT id FROM subjects WHERE name=?", (c["name"],)).fetchone()
            if not row:
                cur = conn.execute("""
                    INSERT INTO subjects (name, commission, day_of_week, start_time, end_time, shift,
                        classroom, virtual_link, zoom_id, professor, schedule, year, status, subject_code, current_status_note)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (c["name"], c["commission"], c["day_of_week"], c["start_time"], c["end_time"], c["shift"],
                      c["classroom"], c["virtual_link"], c["zoom_id"], c["professor"], c["schedule"], c["year"], c["status"], c["subject_code"], c["current_status_note"]))
                subj_id_map[c["name"]] = cur.lastrowid
            else:
                subj_id_map[c["name"]] = row[0]
                conn.execute("""
                    UPDATE subjects SET commission=?, day_of_week=?, start_time=?, end_time=?, shift=?,
                        classroom=?, virtual_link=?, zoom_id=?, professor=?, schedule=?, year=?, status=?, subject_code=?, current_status_note=?
                    WHERE id=?
                """, (c["commission"], c["day_of_week"], c["start_time"], c["end_time"], c["shift"],
                      c["classroom"], c["virtual_link"], c["zoom_id"], c["professor"], c["schedule"], c["year"], c["status"], c["subject_code"], c["current_status_note"], row[0]))

        # Exams seeding
        exams_data = [
            ("Física I", "Laboratorio", "2026-11-03", None, "Cierre de Actas Lab Grupo 6 (TPs 2-5, Cuestionario TP7 y TP8 Arquímedes)"),
            ("Sistemas de Representación", "Entrega TP", "2026-11-14", "08:00", "Entrega TPs SolidWorks + Plano Final impreso físico A4/A3"),
            ("Informática II", "2° Parcial", "2026-11-16", "18:15", "2° Parcial + Entrega TPs (CATIA V5 / Access-SQL)"),
            ("Física I", "2° Parcial", "2026-11-17", "18:15", "2° Parcial por Bloques (Cuerpo Rígido, MOA y Fluidos)"),
            ("Álgebra y Geometría Analítica", "Repaso", "2026-11-18", "08:45", "Clase de Repaso 2° Parcial (U7, U8, U9)"),
            ("Química General", "2° Parcial", "2026-11-19", "18:15", "2° Parcial / Globalizador y Cierre de Laboratorio (incl. Electroquímica)"),
            ("Análisis Matemático I", "2° Parcial", "2026-11-20", "18:15", "2° Parcial Bloque AND (TPs 7-12 Derivadas, Integrales, Series)"),
            ("Álgebra y Geometría Analítica", "2° Parcial", "2026-11-25", "08:45", "2° Parcial Confirmado (U7 EV, U8 TL, U9 Autovalores/Diagonalización)"),
            ("Álgebra y Geometría Analítica", "Revisión", "2026-12-02", "08:45", "Revisión de Examen 2° Parcial"),
            ("Informática II", "Recuperatorio", "2026-12-07", "18:15", "Recuperatorio 1° Parcial (DER, Normalización, SQL / CATIA V5)"),
            ("Álgebra y Geometría Analítica", "Recuperatorio", "2026-12-09", "08:45", "1° Recup. 1° Parcial (U1-U6 Matrices, SEL, Vectores, Cónicas, Cuádricas)"),
            ("Álgebra y Geometría Analítica", "Recuperatorio", "2026-12-16", "08:45", "1° Recup. 2° Parcial (U7-U9)"),
            ("Física I", "Recuperatorio", "2027-02-16", "18:15", "Recuperatorio 1° Parcial (Cinemática, Dinámica, Energía, Óptica)"),
            ("Álgebra y Geometría Analítica", "Recuperatorio", "2027-02-17", "08:45", "2° Recup. P1 / Final (U1-U6)"),
            ("Análisis Matemático I", "Recuperatorio", "2027-02-19", "18:15", "Recuperatorio 1° Parcial Bloque AND (TPs 1-6 Límites, Bolzano, Continuidad)"),
            ("Inglés I / II", "Final Libre", "2027-02-22", None, "Examen Final Libre / Suficiencia (Lectura e interpretación técnica en español)"),
            ("Álgebra y Geometría Analítica", "Recuperatorio", "2027-02-24", "08:45", "2° Recup. P2 / Final (U7-U9)"),
        ]

        for s_name, e_type, e_date, e_time, e_topic in exams_data:
            s_id = subj_id_map.get(s_name)
            if s_id:
                ex_exists = conn.execute("SELECT id FROM exams WHERE subject_id=? AND date=? AND type=?", (s_id, e_date, e_type)).fetchone()
                if not ex_exists:
                    conn.execute("""
                        INSERT INTO exams (subject_id, type, date, time, topic, status)
                        VALUES (?, ?, ?, ?, ?, 'pending')
                    """, (s_id, e_type, e_date, e_time, e_topic))

        # Assignments seeding
        assignments_data = [
            ("Física I", "Cuestionario Online TP 7 (Péndulo Balístico)", "Entrega de cuestionario de péndulo balístico y regularización de informes TPs 2 a 5 con Ings. Ruiz y Acerbi", "2026-11-03", "Lab Grupo 6"),
            ("Sistemas de Representación", "Plano Final impreso A4/A3 + Modelado SolidWorks", "Entrega de piezas modeladas en SolidWorks y plano final de ensamble impreso físicamente en papel", "2026-11-14", "Individual"),
            ("Informática II", "Entrega de Proyecto y TPs CATIA V5 / Bases de Datos", "Modelado paramétrico 3D / Ensamble iso-restringido en CATIA V5 o consultas Access / SQL", "2026-11-16", "Individual/Grupo"),
        ]
        for s_name, a_title, a_desc, a_due, a_group in assignments_data:
            s_id = subj_id_map.get(s_name)
            if s_id:
                as_exists = conn.execute("SELECT id FROM assignments WHERE subject_id=? AND title=?", (s_id, a_title)).fetchone()
                if not as_exists:
                    conn.execute("""
                        INSERT INTO assignments (subject_id, title, description, due_date, group_name, status)
                        VALUES (?, ?, ?, ?, ?, 'pending')
                    """, (s_id, a_title, a_desc, a_due, a_group))

        # Initial curriculum statuses for the curriculum grid:
        initial_curriculum = [
            (1, "CURSANDO", None, "Cursando 2026"),
            (2, "CURSANDO", None, "Cursando 2026"),
            (3, "CURSANDO", None, "Cursando 2026"),
            (4, "APROBADA", 9.0, "Promocionada en 2025 con nota 9"),
            (5, "APROBADA", 8.0, "Promocionada en 2025 con nota 8"),
            (6, "CURSANDO", None, "Cursando 2026"),
            (7, "CURSANDO", None, "Cursando 2026"),
            (8, "APROBADA", 8.0, "Aprobada con final en 2025 con nota 8"),
            (15, "CURSANDO", None, "Cursando 2026"),
            (16, "LIBRE_DISPONIBLE", None, "Habilitada para rendir final libre"),
            (33, "LIBRE_DISPONIBLE", None, "Habilitada para rendir final libre"),
        ]
        for sid, st, gr, nt in initial_curriculum:
            conn.execute("""
                INSERT OR REPLACE INTO curriculum_status (subject_id, status, grade, note)
                VALUES (?, ?, ?, ?)
            """, (sid, st, gr, nt))

        conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('seed_utn_industrial_2026_v2', '1')")

    conn.commit()



    # 7. Seed initial billing clients, sites, and invoices (v1)
    seed_billing = conn.execute("SELECT value FROM config WHERE key='seed_billing_v1'").fetchone()
    if not seed_billing:
        try:
            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('cta_detraccion_1', '00046317769')")
            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('cta_detraccion_2', '00771005578')")

            clients_seed = [
                (9, '20516702649', 'SUR COLOR STAR S.A.', 1, 800.00, 'Control Aviar', 'Servicio mensual S/ 800.00 sin IGV. OC Septiembre: 8600033006'),
                (10, '20100047056', 'TOPY TOP S.A.', 1, 750.00, 'Control Aviar', 'Servicio mensual S/ 750.00 sin IGV. OC Septiembre: 8600033002'),
                (11, '20101024645', 'ARCA CONTINENTAL LINDLEY S.A.', 1, 40500.00, 'SERV CONTROL DE PLAGAS', 'Grupo Lindley - Plantas Industriales Embotelladoras'),
                (12, '20610033033', 'AC CORPORATIVO DEL PERU S.A.C.', 1, 1200.00, 'SERV CONTROL DE PLAGAS', 'Grupo Lindley - Oficinas Administrativas y Sedes'),
                (13, '20605957375', 'AC LOGISTICA DEL PERU S.A.C.', 1, 12550.00, 'SERV CONTROL DE PLAGAS', 'Grupo Lindley - Centros de Distribución (CEDI)'),
                (14, '20114050025', 'EMBOTELLADORA LA SELVA S.A.C.', 1, 5475.00, 'SERV CONTROL DE PLAGAS', 'Grupo Lindley - Planta y CEDI Iquitos (Inca Kola)'),
            ]
            for cid, ruc, name, reg, fee, srv, notes in clients_seed:
                conn.execute("""
                    INSERT OR REPLACE INTO clients (id, ruc, business_name, is_regular, monthly_fee, servicios, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (cid, ruc, name, reg, fee, srv, notes))

            sites_seed = [
                (1, 9, 'SCS', 'PRIN', 'SCS-PRIN', 'SUR COLOR STAR - SEDE PRINCIPAL', 'SEDE PRINCIPAL', '', '', 1, 800.00, 'Control Aviar'),
                (2, 10, 'TOP', 'PRIN', 'TOP-PRIN', 'TOPY TOP - SEDE PRINCIPAL', 'SEDE PRINCIPAL', '', '', 1, 750.00, 'Control Aviar'),
                (3, 11, 'ACL', 'PUC', 'ACL-PUC', 'ARCA CONTINENTAL LINDLEY - PLANTA PUCUSANA', 'PLANTA PUCUSANA', '84', 'Pucusana', 1, 14700.00, 'SERV CONTROL DE PLAGAS'),
                (4, 11, 'ACL', 'ZAR', 'ACL-ZAR', 'ARCA CONTINENTAL LINDLEY - PLANTA ZARATE', 'PLANTA ZARATE', '1', 'San Juan de Lurigancho', 1, 7140.00, 'SERV CONTROL DE PLAGAS'),
                (5, 11, 'ACL', 'TRU', 'ACL-TRU', 'ARCA CONTINENTAL LINDLEY - PLANTA TRUJILLO', 'PLANTA TRUJILLO', '74', 'Trujillo', 1, 8510.00, 'SERV CONTROL DE PLAGAS'),
                (6, 11, 'ACL', 'AQP', 'ACL-AQP', 'ARCA CONTINENTAL LINDLEY - PLANTA AREQUIPA', 'PLANTA AREQUIPA', '31', 'Arequipa', 1, 5150.00, 'SERV CONTROL DE PLAGAS'),
                (7, 11, 'ACL', 'CUZ', 'ACL-CUZ', 'ARCA CONTINENTAL LINDLEY - PLANTA CUSCO', 'PLANTA CUSCO', '32', 'Cusco', 1, 5000.00, 'SERV CONTROL DE PLAGAS'),
                (8, 12, 'ACC', 'RIM', 'ACC-RIM', 'AC CORPORATIVO - RIMAC', 'RIMAC', '2', 'Rimac', 1, 600.00, 'SERV CONTROL DE PLAGAS'),
                (9, 12, 'ACC', 'MOL', 'ACC-MOL', 'AC CORPORATIVO - LA MOLINA', 'LA MOLINA', '', 'La Molina', 1, 600.00, 'SERV CONTROL DE PLAGAS'),
                (10, 13, 'ALD', 'HUA', 'ALD-HUA', 'AC LOGISTICA - CEDI HUACHIPA', 'CEDI HUACHIPA', '1', 'Huachipa', 1, 3680.00, 'SERV CONTROL DE PLAGAS'),
                (11, 13, 'ALD', 'DUE', 'ALD-DUE', 'AC LOGISTICA - CEDI DUEÑAS', 'CEDI DUEÑAS', '3', 'Dueñas / Lima', 1, 2940.00, 'SERV CONTROL DE PLAGAS'),
                (12, 13, 'ALD', 'VES', 'ALD-VES', 'AC LOGISTICA - CEDI VES', 'CEDI VES', '2', 'Villa El Salvador', 1, 3680.00, 'SERV CONTROL DE PLAGAS'),
                (13, 13, 'ALD', 'TRU', 'ALD-CTRU', 'AC LOGISTICA - CEDI TRUJILLO', 'CEDI TRUJILLO', '1', 'Trujillo', 1, 960.00, 'SERV CONTROL DE PLAGAS'),
                (14, 13, 'ALD', 'PUC', 'ALD-CPUC', 'AC LOGISTICA - CEDI PUCUSANA', 'CEDI PUCUSANA', '', 'Pucusana', 1, 1290.00, 'SERV CONTROL DE PLAGAS'),
                (15, 14, 'ELS', 'IQT', 'ELS-IQT', 'EMBOTELLADORA LA SELVA - IQUITOS', 'IQUITOS', '1', 'Iquitos', 1, 4225.00, 'SERV CONTROL DE PLAGAS'),
                (16, 14, 'ELS', 'CIQ', 'ELS-CIQ', 'EMBOTELLADORA LA SELVA - CEDI IQUITOS', 'CEDI IQUITOS', '9', 'Iquitos', 1, 1250.00, 'SERV CONTROL DE PLAGAS'),
                (17, 14, 'ELS', 'ADI', 'ELS-ADI', 'EMBOTELLADORA LA SELVA - ADICIONALES', 'ADICIONALES', '1', 'Iquitos', 0, 0.00, 'SERV CONTROL DE PLAGAS (ADICIONAL)'),
            ]
            for sid, cid, cc, cs, ccs, nom, sed, loc, dis, reg, fee, srv in sites_seed:
                conn.execute("""
                    INSERT OR REPLACE INTO client_sites (id, client_id, codigo_cliente, codigo_sede, codigo_cliente_sede,
                        nombre_cliente, sede_cliente, location_code, distrito, is_regular, monthly_fee, servicios)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (sid, cid, cc, cs, ccs, nom, sed, loc, dis, reg, fee, srv))

            invoices_seed = [
                (1, 9, 1, 'E001', '', 'Control Aviar', 'credito', 800.00, 144.00, 944.00, 113.28, 830.72, '8600033006', '', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (2, 10, 2, 'E001', '', 'Control Aviar', 'credito', 750.00, 135.00, 885.00, 106.20, 778.80, '8600033002', '', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (3, 11, 3, 'E001', '1845', 'SERV CONTROL DE PLAGAS', 'credito', 14700.00, 2646.00, 17346.00, 2081.52, 15264.48, '4501201335', '84', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (4, 11, 4, 'E001', '9570', 'SERV CONTROL DE PLAGAS', 'credito', 7140.00, 1285.20, 8425.20, 1011.02, 7414.18, '4501203340', '1', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (5, 11, 5, 'E001', '1850', 'SERV CONTROL DE PLAGAS', 'credito', 8510.00, 1531.80, 10041.80, 1205.02, 8836.78, '4501201100', '74', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (6, 11, 6, 'E001', '1851', 'SERV CONTROL DE PLAGAS', 'credito', 5150.00, 927.00, 6077.00, 729.24, 5347.76, '4501201057', '31', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (7, 11, 7, 'E001', '1852', 'SERV CONTROL DE PLAGAS', 'credito', 5000.00, 900.00, 5900.00, 708.00, 5192.00, '4501200921', '32', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (8, 12, 8, 'E001', '', 'SERV CONTROL DE PLAGAS', 'credito', 600.00, 108.00, 708.00, 84.96, 623.04, '', '2', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (9, 12, 9, 'E001', '', 'SERV CONTROL DE PLAGAS', 'credito', 600.00, 108.00, 708.00, 84.96, 623.04, '', '', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (10, 13, 10, 'E001', '9573', 'SERV CONTROL DE PLAGAS', 'credito', 3680.00, 662.40, 4342.40, 521.09, 3821.31, '4501201113', '1', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (11, 13, 11, 'E001', '9571', 'SERV CONTROL DE PLAGAS', 'credito', 2940.00, 529.20, 3469.20, 416.30, 3052.90, '4501203465', '3', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (12, 13, 12, 'E001', '9572', 'SERV CONTROL DE PLAGAS', 'credito', 3680.00, 662.40, 4342.40, 521.09, 3821.31, '4501203463', '2', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (13, 13, 13, 'E001', '1853', 'SERV CONTROL DE PLAGAS', 'credito', 960.00, 172.80, 1132.80, 135.94, 996.86, '4501203073', '1', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (14, 13, 14, 'E001', '', 'SERV CONTROL DE PLAGAS', 'credito', 1290.00, 232.20, 1522.20, 182.66, 1339.54, '', '', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (15, 14, 15, 'E001', '1847', 'SERV CONTROL DE PLAGAS', 'credito', 4225.00, 760.50, 4985.50, 598.26, 4387.24, '6300011728', '1', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (16, 14, 16, 'E001', '1848', 'SERV CONTROL DE PLAGAS', 'credito', 1250.00, 225.00, 1475.00, 177.00, 1298.00, '6300011729', '9', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
                (17, 14, 17, 'E001', '1849', 'SERV CONTROL DE PLAGAS (ADICIONAL)', 'credito', 1420.00, 255.60, 1675.60, 201.07, 1474.53, '6300011730', '1', '2026-09-30', '2026-10-30', 9, 2026, 'issued'),
            ]
            for iid, cid, sid, ser, num, srv, pt, am, igv, tot, detr, cred, oc, loc, idt, ddt, mb, yb, st in invoices_seed:
                conn.execute("""
                    INSERT OR REPLACE INTO invoices (id, client_id, client_site_id, series, number, service, payment_type,
                        amount, igv, total, detraccion, credito, purchase_order, location_code,
                        issue_date, due_date, month_billed, year_billed, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (iid, cid, sid, ser, num, srv, pt, am, igv, tot, detr, cred, oc, loc, idt, ddt, mb, yb, st))

            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('seed_billing_v1', '1')")
        except Exception as e:
            pass

    
    # 8. Seed initial purchase orders (v1)
    seed_po = conn.execute("SELECT value FROM config WHERE key='seed_po_v1'").fetchone()
    if not seed_po:
        try:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS purchase_orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id INTEGER NOT NULL,
                    client_site_id INTEGER,
                    year INTEGER NOT NULL,
                    month INTEGER NOT NULL,
                    oc_number TEXT NOT NULL,
                    amount REAL,
                    status TEXT DEFAULT 'pending',
                    notes TEXT,
                    created_at TEXT DEFAULT (datetime('now','localtime')),
                    FOREIGN KEY (client_id) REFERENCES clients(id),
                    FOREIGN KEY (client_site_id) REFERENCES client_sites(id)
                )
            """)
            # Populate OCs from September for each regular site
            po_seed_list = [
                (9, 1, 2026, 9, '8600033006', 800.00, 'invoiced', 'OC Septiembre Sur Color Star'),
                (10, 2, 2026, 9, '8600033002', 750.00, 'invoiced', 'OC Septiembre Topy Top'),
                (11, 3, 2026, 9, '4501201335', 14700.00, 'invoiced', 'Planta Pucusana (OC 4501201335)'),
                (11, 4, 2026, 9, '4501203340', 7140.00, 'invoiced', 'Planta Zárate (OC 4501203340)'),
                (11, 5, 2026, 9, '4501201100', 8510.00, 'invoiced', 'Planta Trujillo (OC 4501201100)'),
                (11, 6, 2026, 9, '4501201057', 5150.00, 'invoiced', 'Planta Arequipa (OC 4501201057)'),
                (11, 7, 2026, 9, '4501200921', 5000.00, 'invoiced', 'Planta Cusco (OC 4501200921)'),
                (13, 10, 2026, 9, '4501201113', 3680.00, 'invoiced', 'CEDI Huachipa (OC 4501201113)'),
                (13, 11, 2026, 9, '4501203465', 2940.00, 'invoiced', 'CEDI Dueñas (OC 4501203465)'),
                (13, 12, 2026, 9, '4501203463', 3680.00, 'invoiced', 'CEDI VES (OC 4501203463)'),
                (13, 13, 2026, 9, '4501203073', 960.00, 'invoiced', 'CEDI Trujillo (OC 4501203073)'),
                (14, 15, 2026, 9, '6300011728', 4225.00, 'invoiced', 'Iquitos (OC 6300011728)'),
                (14, 16, 2026, 9, '6300011729', 1250.00, 'invoiced', 'CEDI Iquitos (OC 6300011729)'),
                (14, 17, 2026, 9, '6300011730', 1420.00, 'invoiced', 'Adicionales Iquitos (OC 6300011730)'),
            ]
            for cid, sid, y, m, oc, am, st, nt in po_seed_list:
                conn.execute("""
                    INSERT INTO purchase_orders (client_id, client_site_id, year, month, oc_number, amount, status, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (cid, sid, y, m, oc, am, st, nt))
            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('seed_po_v1', '1')")
            conn.commit()
        except Exception as e:
            pass

    # 9. Seed full purchase orders and clients v2 (seed_po_v2)
    seed_po2 = conn.execute("SELECT value FROM config WHERE key='seed_po_v2'").fetchone()
    if not seed_po2:
        try:
            # 1. New clients
            conn.execute("""
                INSERT OR REPLACE INTO clients (id, ruc, business_name, is_regular, monthly_fee, servicios, notes)
                VALUES (15, '20168805072', 'VEND S.A.C.', 1, 5244.0, 'FUMIGACION Y CONTROL DE PLAGAS', 'Grupo Arca Continental - Vendomática Vending')
            """)
            conn.execute("""
                INSERT OR REPLACE INTO clients (id, ruc, business_name, is_regular, monthly_fee, servicios, notes)
                VALUES (16, '20615549887', 'AC EQUIPOS DE FRIO DEL PERU S.A.C.', 1, 1700.0, 'SERV DESINSECTACION', 'Grupo Arca Continental - Equipos de Frío')
            """)

            # 2. Update existing sites fees & periodicity
            conn.execute("UPDATE client_sites SET monthly_fee=5800.0, periodicity='mensual' WHERE id=7")
            conn.execute("UPDATE client_sites SET periodicity='mensual' WHERE id IN (1,2,3,4,5,6,10,11,12,13,14,15,16)")
            conn.execute("UPDATE client_sites SET periodicity='eventual' WHERE id IN (8,9,17)")

            # 3. New sites for VEND S.A.C. and AC EQUIPOS DE FRIO
            new_sites = [
                (18, 15, 'VEND S.A.C. - CEDI CALLAO (CAMIONES)', 'VCAM', 1, 2024.0, 'FUMIGACION DE CAMIONES', 'mensual', '7602'),
                (19, 15, 'VEND S.A.C. - CEDI CALLAO (SEDE & ALMACENES)', 'VSED', 1, 3220.0, 'DESRATIZACION, FUMIGACION OFICINAS Y CONTROL AVIAR', 'mensual', '7602'),
                (20, 15, 'VEND S.A.C. - CEDI CALLAO (EQUIPOS VENDING)', 'VEQU', 0, 6500.0, 'FUMIGACION EQUIPOS VENDING', 'eventual', '7602'),
                (21, 15, 'VEND S.A.C. - AREQUIPA (SEDE)', 'VAQP', 1, 1030.0, 'DESINFECCION, DESINSECTACION Y DESRATIZACION', 'bimensual', '7606'),
                (22, 15, 'VEND S.A.C. - CHICLAYO (SEDE)', 'VCIX', 1, 1180.0, 'DESINSECTACION, DESINFECCION Y DESRATIZACION', 'bimensual', '7612'),
                (23, 15, 'VEND S.A.C. - PIURA (SEDE)', 'VPIU', 1, 1180.0, 'DESINFECCION, DESINSECTACION Y DESRATIZACION', 'bimensual', '7613'),
                (24, 15, 'VEND S.A.C. - ICA (SEDE)', 'VICA', 1, 1310.0, 'DESINSECTACION, DESINFECCION, DESRATIZACION Y CONTROL AVIAR', 'bimensual', '7609'),
                (25, 15, 'VEND S.A.C. - TRUJILLO (SEDE)', 'VTRU', 1, 1610.0, 'DESINSECTACION, DESINFECCION, DESRATIZACION Y CONTROL AVIAR', 'bimensual', '7611'),
                (26, 15, 'VEND S.A.C. - CAMIONES PROVINCIAS', 'VCAMP', 0, 0, 'FUMIGACION CAMIONES PROVINCIAS', 'eventual', ''),
                (27, 16, 'AC EQUIPOS DE FRIO - CALLAO', 'FCAL', 1, 900.0, 'SERV DESINSECTACION', 'bimensual', '5101'),
                (28, 16, 'AC EQUIPOS DE FRIO - TRUJILLO', 'FTRU', 1, 800.0, 'SERV DESINSECTACION', 'bimensual', '5109'),
            ]
            for sid, cid, nom, cod, reg, fee, srv, per, loc in new_sites:
                conn.execute("""
                    INSERT OR REPLACE INTO client_sites (id, client_id, nombre_cliente, codigo_sede, is_regular, monthly_fee, servicios, periodicity, location_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (sid, cid, nom, cod, reg, fee, srv, per, loc))

            # 4. Insert / replace all 63 OCs + Sur Color + Topy Top
            conn.execute("DELETE FROM purchase_orders")

            conn.execute("""
                INSERT INTO purchase_orders (client_id, client_site_id, year, month, oc_number, amount, status, notes, periodicity, issue_date, centro_logistico, sociedad_name)
                VALUES (9, 1, 2026, 9, '8600033006', 800.00, 'invoiced', 'Control Aviar mensual', 'mensual', '2026-09-01', 'Sur Color Star', 'SUR COLOR STAR S.A.')
            """)
            conn.execute("""
                INSERT INTO purchase_orders (client_id, client_site_id, year, month, oc_number, amount, status, notes, periodicity, issue_date, centro_logistico, sociedad_name)
                VALUES (10, 2, 2026, 9, '8600033002', 750.00, 'invoiced', 'Control Aviar mensual', 'mensual', '2026-09-01', 'Topy Top', 'TOPY TOP S.A.')
            """)

            raw_ocs = [(13, 12, 2026, 10, '4501209368', 3680.0, 'pending', 'SERV DESINSECTACION - CEDI SUR - AC LOGISTICA (5 posiciones)', 'mensual', '2026-10-19', 'CEDI SUR - AC LOGISTICA', '4803', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1000.0}, {"pos": "20", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 800.0}, {"pos": "30", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}, {"pos": "40", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 240.0}, {"pos": "50", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}]'), (13, 11, 2026, 10, '4501208743', 2940.0, 'pending', 'SERV DESRATIZACION - CEDI CENTRO - AC LOGISTICA (5 posiciones)', 'mensual', '2026-10-14', 'CEDI CENTRO - AC LOGISTICA', '4801', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 600.0}, {"pos": "20", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}, {"pos": "30", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 600.0}, {"pos": "40", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 100.0}, {"pos": "50", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 200.0}]'), (11, 4, 2026, 10, '4501207946', 7140.0, 'pending', 'SERV DESINSECTACION - PLANTA LINDLEY - ZARATE (5 posiciones)', 'mensual', '2026-10-09', 'PLANTA LINDLEY - ZARATE', '2000', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2600.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 300.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1600.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}]'), (13, 10, 2026, 10, '4501207987', 3680.0, 'pending', 'SERV DESINSECTACION - CEDI ESTE- AC LOGISTICA (5 posiciones)', 'mensual', '2026-10-09', 'CEDI ESTE- AC LOGISTICA', '4802', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1000.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 240.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 800.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}]'), (13, 12, 2026, 9, '4501203463', 3680.0, 'invoiced', 'SERV DESINSECTACION - CEDI SUR - AC LOGISTICA (5 posiciones)', 'mensual', '2026-09-18', 'CEDI SUR - AC LOGISTICA', '4803', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1000.0}, {"pos": "20", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 800.0}, {"pos": "30", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}, {"pos": "40", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 240.0}, {"pos": "50", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}]'), (13, 11, 2026, 9, '4501203465', 2940.0, 'invoiced', 'SERV DESRATIZACION - CEDI CENTRO - AC LOGISTICA (5 posiciones)', 'mensual', '2026-09-18', 'CEDI CENTRO - AC LOGISTICA', '4801', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 600.0}, {"pos": "20", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}, {"pos": "30", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 600.0}, {"pos": "40", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 100.0}, {"pos": "50", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 200.0}]'), (11, 4, 2026, 9, '4501203340', 7140.0, 'invoiced', 'SERV DESINSECTACION - PLANTA LINDLEY - ZARATE (5 posiciones)', 'mensual', '2026-09-17', 'PLANTA LINDLEY - ZARATE', '2000', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2600.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 300.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1600.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}]'), (13, 10, 2026, 9, '4501201113', 3680.0, 'invoiced', 'SERV DESINSECTACION - CEDI ESTE- AC LOGISTICA (5 posiciones)', 'mensual', '2026-09-07', 'CEDI ESTE- AC LOGISTICA', '4802', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1000.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 240.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 800.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}]'), (13, 12, 2026, 8, '4501198798', 3680.0, 'invoiced', 'SERV DESINSECTACION - CEDI SUR - AC LOGISTICA (5 posiciones)', 'mensual', '2026-08-26', 'CEDI SUR - AC LOGISTICA', '4803', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1000.0}, {"pos": "20", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 800.0}, {"pos": "30", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}, {"pos": "40", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 240.0}, {"pos": "50", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}]'), (13, 10, 2026, 8, '4501198354', 3680.0, 'invoiced', 'SERV DESINSECTACION - CEDI ESTE- AC LOGISTICA (5 posiciones)', 'mensual', '2026-08-25', 'CEDI ESTE- AC LOGISTICA', '4802', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1000.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 240.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 800.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}]'), (13, 11, 2026, 8, '4501198416', 2940.0, 'invoiced', 'SERV DESRATIZACION - CEDI CENTRO - AC LOGISTICA (5 posiciones)', 'mensual', '2026-08-25', 'CEDI CENTRO - AC LOGISTICA', '4801', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 4.0, "un": "UN", "pu": 600.0}, {"pos": "20", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 12.0, "un": "UN", "pu": 1440.0}, {"pos": "30", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 600.0}, {"pos": "40", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 100.0}, {"pos": "50", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 2.0, "un": "UN", "pu": 200.0}]'), (11, 4, 2026, 8, '4501196134', 7140.0, 'invoiced', 'SERV DESINSECTACION - PLANTA LINDLEY - ZARATE (5 posiciones)', 'mensual', '2026-08-12', 'PLANTA LINDLEY - ZARATE', '2000', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2600.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 300.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1600.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}]'), (11, 3, 2026, 10, '4501210207', 14700.0, 'pending', 'SERV CONTROL DE PLAGAS - Centro Planta Pucusana', 'mensual', '2026-10-22', 'Centro Planta Pucusana', '1040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000450989", "desc": "SERV CONTROL DE PLAGAS", "cant": 1.0, "un": "UN", "pu": 14700.0}]'), (11, 5, 2026, 10, '4501208817', 1400.0, 'pending', 'SERV MANTENIMIENTO INSTALACIONES PLANTA - Planta Santa Rosa JRL', 'eventual', '2026-10-15', 'Planta Santa Rosa JRL', '5040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000450505", "desc": "SERV MANTENIMIENTO INSTALACIONES PLANTA", "cant": 1.0, "un": "UN", "pu": 1400.0}]'), (14, 17, 2026, 10, '6300011958', 1420.0, 'pending', 'SERV DESINSECTACION - Planta Iquitos JR3', 'mensual', '2026-10-07', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1420.0}]'), (14, 16, 2026, 10, '6300011957', 1250.0, 'pending', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-10-07', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 600.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 100.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 50.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 400.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 100.0}]'), (14, 15, 2026, 10, '6300011956', 4225.0, 'pending', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-10-07', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1100.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1600.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 125.0}]'), (11, 7, 2026, 10, '4501207299', 5800.0, 'pending', 'SERV DESINSECTACION - Planta Cusco (5 posiciones)', 'mensual', '2026-10-06', 'Planta Cusco', '7010', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2400.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 900.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 2000.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 300.0}]'), (11, 6, 2026, 10, '4501207197', 5150.0, 'pending', 'SERV DESINSECTACION - Planta Arequipa (5 posiciones)', 'mensual', '2026-10-05', 'Planta Arequipa', '7000', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2400.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 750.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 600.0}]'), (11, 5, 2026, 10, '4501207202', 3280.0, 'pending', 'SERV CONTROL DE AVES - Planta Santa Rosa JRL (2 posiciones)', 'eventual', '2026-10-05', 'Planta Santa Rosa JRL', '5040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}, {"pos": "20", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1840.0}]'), (11, 5, 2026, 10, '4501206751', 8510.0, 'pending', 'SERV DESINSECTACION - Planta Santa Rosa JRL (6 posiciones)', 'mensual', '2026-10-02', 'Planta Santa Rosa JRL', '5040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 4000.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 350.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1320.0}, {"pos": "50", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "60", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}]'), (16, 28, 2026, 10, '4501206831', 800.0, 'pending', 'SERV DESINSECTACION - Trujillo', 'bimensual', '2026-10-02', 'Trujillo', '5109', 'JR10', 'AC Equipos de Frío del Perú', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 800.0}]'), (13, 13, 2026, 9, '4501203073', 960.0, 'invoiced', 'SERV DESRATIZACION - MEGA AC LOGISTICA – TRUJILLO (2 posiciones)', 'mensual', '2026-09-16', 'MEGA AC LOGISTICA – TRUJILLO', '4807', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 360.0}, {"pos": "20", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 600.0}]'), (11, 3, 2026, 9, '4501201335', 14700.0, 'invoiced', 'SERV CONTROL DE PLAGAS - Centro Planta Pucusana', 'mensual', '2026-09-08', 'Centro Planta Pucusana', '1040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000450989", "desc": "SERV CONTROL DE PLAGAS", "cant": 1.0, "un": "UN", "pu": 14700.0}]'), (11, 5, 2026, 9, '4501201100', 7390.0, 'invoiced', 'SERV DESINSECTACION - Planta Santa Rosa JRL (7 posiciones)', 'mensual', '2026-09-07', 'Planta Santa Rosa JRL', '5040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 350.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1320.0}, {"pos": "50", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "60", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}, {"pos": "70", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}, {"pos": "80", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}]'), (11, 6, 2026, 9, '4501201057', 5150.0, 'invoiced', 'SERV DESINSECTACION - Planta Arequipa (5 posiciones)', 'mensual', '2026-09-07', 'Planta Arequipa', '7000', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2400.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 750.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 600.0}]'), (14, 17, 2026, 9, '6300011730', 1420.0, 'invoiced', 'SERV DESINSECTACION - Planta Iquitos JR3', 'mensual', '2026-09-07', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1420.0}]'), (14, 16, 2026, 9, '6300011729', 1250.0, 'invoiced', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-09-07', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 600.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 100.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 50.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 400.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 100.0}]'), (14, 15, 2026, 9, '6300011728', 4225.0, 'invoiced', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-09-07', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1100.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1600.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 125.0}]'), (11, 7, 2026, 9, '4501200921', 5800.0, 'invoiced', 'SERV DESINSECTACION - Planta Cusco (5 posiciones)', 'mensual', '2026-09-04', 'Planta Cusco', '7010', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2400.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 900.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 2000.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 300.0}]'), (12, 9, 2026, 8, '4501200117', 508.4800109863281, 'invoiced', 'SERV DESINSECTACION - Centro AC Corporativo (Oficin)', 'eventual', '2026-08-31', 'Centro AC Corporativo (Oficin)', '4901', 'JR9', 'AC Corporativo del Perú S.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 508.48}]'), (13, 13, 2026, 8, '4501198187', 960.0, 'invoiced', 'SERV DESRATIZACION - MEGA AC LOGISTICA – TRUJILLO (2 posiciones)', 'mensual', '2026-08-24', 'MEGA AC LOGISTICA – TRUJILLO', '4807', 'JR8', 'AC Logística del Perú S.A.C.', '[{"pos": "10", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 360.0}, {"pos": "20", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 600.0}]'), (16, 27, 2026, 8, '4501197291', 900.0, 'invoiced', 'SERV DESINSECTACION - Callao', 'bimensual', '2026-08-18', 'Callao', '5101', 'JR10', 'AC Equipos de Frío del Perú', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 900.0}]'), (11, 3, 2026, 8, '4501196996', 14700.0, 'invoiced', 'SERV CONTROL DE PLAGAS - Centro Planta Pucusana', 'mensual', '2026-08-18', 'Centro Planta Pucusana', '1040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000450989", "desc": "SERV CONTROL DE PLAGAS", "cant": 1.0, "un": "UN", "pu": 14700.0}]'), (14, 17, 2026, 8, '6300011553', 1420.0, 'invoiced', 'SERV DESINSECTACION - Planta Iquitos JR3', 'mensual', '2026-08-10', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1420.0}]'), (14, 16, 2026, 8, '6300011549', 1250.0, 'invoiced', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-08-10', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 600.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 100.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 50.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 400.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 100.0}]'), (14, 15, 2026, 8, '6300011548', 4225.0, 'invoiced', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-08-10', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1100.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1600.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 125.0}]'), (11, 7, 2026, 8, '4501195411', 5800.0, 'invoiced', 'SERV DESINSECTACION - Planta Cusco (5 posiciones)', 'mensual', '2026-08-10', 'Planta Cusco', '7010', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2400.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 900.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 2000.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 300.0}]'), (11, 6, 2026, 8, '4501195014', 5150.0, 'invoiced', 'SERV DESINSECTACION - Planta Arequipa (5 posiciones)', 'mensual', '2026-08-07', 'Planta Arequipa', '7000', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 2400.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 750.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 600.0}]'), (11, 5, 2026, 8, '4501195077', 15390.0, 'invoiced', 'SERV DESINSECTACION - Planta Santa Rosa JRL (9 posiciones)', 'mensual', '2026-08-07', 'Planta Santa Rosa JRL', '5040', 'JRL', 'Arca Continenal Lindley , S.A.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 4000.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 350.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1320.0}, {"pos": "50", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "60", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}, {"pos": "70", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 4000.0}, {"pos": "80", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}, {"pos": "90", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 1440.0}]'), (15, 26, 2026, 10, '4500085905', 120.0, 'pending', 'FUMIGACION DE CAMIONES POR DESINSECTACIO - CUZCO', 'eventual', '2026-10-22', 'CUZCO', '7610', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION DE CAMIONES POR DESINSECTACIO", "cant": 1.0, "un": "SER", "pu": 120.0}]'), (15, 26, 2026, 10, '4500085904', 300.0, 'pending', 'FUMIGACION DE CAMIONES POR DESINSECTACIO - Arequipa (2 posiciones)', 'eventual', '2026-10-22', 'Arequipa', '7606', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION DE CAMIONES POR DESINSECTACIO", "cant": 1.0, "un": "SER", "pu": 270.0}, {"pos": "20", "mat": "", "desc": "FUMIGACION DE CAMIONES POR DESINSECTACIO", "cant": 1.0, "un": "SER", "pu": 30.0}]'), (15, 26, 2026, 10, '4500085902', 560.0, 'pending', 'FUMIGACION 08 CAMIONES - ICA', 'eventual', '2026-10-22', 'ICA', '7609', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION 08 CAMIONES", "cant": 1.0, "un": "SER", "pu": 560.0}]'), (15, 26, 2026, 10, '4500085901', 120.0, 'pending', 'FUMIGACION DE CHIMBOTE CAMIONES - CHIMBOTE', 'eventual', '2026-10-22', 'CHIMBOTE', '7616', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION DE CHIMBOTE CAMIONES", "cant": 1.0, "un": "SER", "pu": 120.0}]'), (15, 26, 2026, 10, '4500085900', 300.0, 'pending', 'FUMIGACION DE TRUJILLO CAMIONES - Trujillo (2 posiciones)', 'eventual', '2026-10-22', 'Trujillo', '7611', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION DE TRUJILLO CAMIONES", "cant": 1.0, "un": "SER", "pu": 180.0}, {"pos": "20", "mat": "", "desc": "FUMIGACION DE CAJAMARCA", "cant": 1.0, "un": "SER", "pu": 120.0}]'), (15, 26, 2026, 10, '4500085898', 360.0, 'pending', 'FUMIGACION 12 CAMIONES - Chiclayo', 'eventual', '2026-10-22', 'Chiclayo', '7612', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION 12 CAMIONES", "cant": 1.0, "un": "SER", "pu": 360.0}]'), (15, 26, 2026, 10, '4500085897', 540.0, 'pending', 'FUMIGACION DE CAMIONES POR DESINSECTACIO - Piura (2 posiciones)', 'eventual', '2026-10-22', 'Piura', '7613', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION DE CAMIONES POR DESINSECTACIO", "cant": 1.0, "un": "SER", "pu": 480.0}, {"pos": "20", "mat": "", "desc": "FUMIGACION DE CAMIONES POR DESINSECTACIO", "cant": 1.0, "un": "SER", "pu": 60.0}]'), (15, 18, 2026, 10, '4500085896', 2024.0, 'pending', 'FUMIGACION 02 CAMIONES HUACHO - CEDI CALLAO ACV (4 posiciones)', 'mensual', '2026-10-22', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION 02 CAMIONES HUACHO", "cant": 1.0, "un": "SER", "pu": 44.0}, {"pos": "20", "mat": "", "desc": "FUMIGACION 10 CAMIONES MICROMERCADO", "cant": 1.0, "un": "SER", "pu": 220.0}, {"pos": "30", "mat": "", "desc": "FUMIGACION 01 CAMIONES C/A", "cant": 1.0, "un": "SER", "pu": 22.0}, {"pos": "40", "mat": "", "desc": "FUMIGACION 79 CAMIONES VENDING", "cant": 1.0, "un": "SER", "pu": 1738.0}]'), (15, 19, 2026, 10, '4500085548', 3220.0, 'pending', 'DESRATIZACION ALMACEN PT - CEDI CALLAO ACV (4 posiciones)', 'mensual', '2026-10-12', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "DESRATIZACION ALMACEN PT", "cant": 1.0, "un": "SER", "pu": 300.0}, {"pos": "20", "mat": "", "desc": "DESRATIZACION ALMACEN EQUIPOS Y REPUESTO", "cant": 1.0, "un": "SER", "pu": 120.0}, {"pos": "30", "mat": "", "desc": "FUMIGACION OFICINAS ALMACENES Y TALLER", "cant": 1.0, "un": "SER", "pu": 1600.0}, {"pos": "40", "mat": "", "desc": "CONTROL AVIAR", "cant": 1.0, "un": "SER", "pu": 1200.0}]'), (15, 25, 2026, 10, '4500085547', 1610.0, 'pending', 'SERVICIO DE DESINSECTACIÓN Y DESINFECCIÓ - Trujillo (4 posiciones)', 'bimensual', '2026-10-12', 'Trujillo', '7611', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "SERVICIO DE DESINSECTACI\\u00d3N Y DESINFECCI\\u00d3", "cant": 1.0, "un": "SER", "pu": 375.0}, {"pos": "20", "mat": "", "desc": "SERVICIO DE DESINFECCI\\u00d3N", "cant": 1.0, "un": "SER", "pu": 375.0}, {"pos": "30", "mat": "", "desc": "SERVICIO DE DESRATIZACI\\u00d3N", "cant": 1.0, "un": "SER", "pu": 480.0}, {"pos": "40", "mat": "", "desc": "SERVICIO DE CONTROLAVIAR", "cant": 1.0, "un": "SER", "pu": 380.0}]'), (15, 24, 2026, 9, '4500085036', 1310.0, 'invoiced', 'DESINSECTACION Y DESINFECCION  SET - ICA (3 posiciones)', 'bimensual', '2026-09-24', 'ICA', '7609', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "DESINSECTACION Y DESINFECCION  SET", "cant": 1.0, "un": "SER", "pu": 650.0}, {"pos": "20", "mat": "", "desc": "DESRATIZACION SET", "cant": 1.0, "un": "SER", "pu": 280.0}, {"pos": "30", "mat": "", "desc": "CONTROL AVIAR SET", "cant": 1.0, "un": "SER", "pu": 380.0}]'), (15, 19, 2026, 9, '4500085011', 2020.0, 'invoiced', 'DESRATIZACION ALMACEN PT - CEDI CALLAO ACV (3 posiciones)', 'mensual', '2026-09-23', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "DESRATIZACION ALMACEN PT", "cant": 1.0, "un": "SER", "pu": 300.0}, {"pos": "20", "mat": "", "desc": "DESRATIZACION ALMACEN EQUIPOS Y REPUESTO", "cant": 1.0, "un": "SER", "pu": 120.0}, {"pos": "30", "mat": "", "desc": "FUMIGACION OFICINAS ALMACENES Y TALLER", "cant": 1.0, "un": "SER", "pu": 1600.0}]'), (15, 21, 2026, 9, '4500084967', 1030.0, 'invoiced', 'SERV. DE DESNFECCION Y DESINSECTACION - Arequipa (2 posiciones)', 'bimensual', '2026-09-22', 'Arequipa', '7606', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "SERV. DE DESNFECCION Y DESINSECTACION", "cant": 1.0, "un": "SER", "pu": 750.0}, {"pos": "20", "mat": "", "desc": "DESRATIZACION SET  AQP", "cant": 1.0, "un": "SER", "pu": 280.0}]'), (15, 22, 2026, 9, '4500084940', 1180.0, 'invoiced', 'SERVICIO DE DESINSECTACION Y DESINFECCIO - Chiclayo (2 posiciones)', 'bimensual', '2026-09-21', 'Chiclayo', '7612', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "SERVICIO DE DESINSECTACION Y DESINFECCIO", "cant": 1.0, "un": "SER", "pu": 800.0}, {"pos": "20", "mat": "", "desc": "SERVICIO DE DESRATIZACION", "cant": 1.0, "un": "SER", "pu": 380.0}]'), (15, 23, 2026, 9, '4500084810', 380.0, 'invoiced', 'DESRATIZACION SETIEMBRE PIURA - Piura', 'bimensual', '2026-09-17', 'Piura', '7613', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "DESRATIZACION SETIEMBRE PIURA", "cant": 1.0, "un": "SER", "pu": 380.0}]'), (15, 23, 2026, 9, '4500084809', 800.0, 'invoiced', 'DESNFECCION Y DESINSECTACION SET26 PIU - Piura', 'bimensual', '2026-09-17', 'Piura', '7613', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "DESNFECCION Y DESINSECTACION SET26 PIU", "cant": 1.0, "un": "SER", "pu": 800.0}]'), (15, 18, 2026, 9, '4500084802', 2024.0, 'invoiced', 'FUMIGACION 02 CAMIONES HUACHO - CEDI CALLAO ACV (4 posiciones)', 'mensual', '2026-09-17', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION 02 CAMIONES HUACHO", "cant": 1.0, "un": "SER", "pu": 44.0}, {"pos": "20", "mat": "", "desc": "FUMIGACION 10 CAMIONES MICROMERCADO", "cant": 1.0, "un": "SER", "pu": 220.0}, {"pos": "30", "mat": "", "desc": "FUMIGACION 01 CAMIONES C/A", "cant": 1.0, "un": "SER", "pu": 22.0}, {"pos": "40", "mat": "", "desc": "FUMIGACION 79 CAMIONES VENDING", "cant": 1.0, "un": "SER", "pu": 1738.0}]'), (15, 20, 2026, 9, '4500084711', 7675.0, 'invoiced', 'FUMIGACION EQUIPOS VENDING - CEDI CALLAO ACV', 'eventual', '2026-09-15', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION EQUIPOS VENDING", "cant": 1.0, "un": "SER", "pu": 7675.0}]'), (15, 25, 2026, 8, '4500084312', 240.0, 'invoiced', 'SERVICIO DE DESRATIZACION - Trujillo', 'eventual', '2026-08-31', 'Trujillo', '7611', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "SERVICIO DE DESRATIZACION", "cant": 1.0, "un": "SER", "pu": 240.0}]'), (15, 18, 2026, 8, '4500084004', 2024.0, 'invoiced', 'FUMIGACION 02 CAMIONES HUACHO - CEDI CALLAO ACV (4 posiciones)', 'mensual', '2026-08-21', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACION 02 CAMIONES HUACHO", "cant": 1.0, "un": "SER", "pu": 44.0}, {"pos": "20", "mat": "", "desc": "FUMIGACION 10 CAMIONES MICROMERCADO", "cant": 1.0, "un": "SER", "pu": 220.0}, {"pos": "30", "mat": "", "desc": "FUMIGACION 03 CAMIONES C/A", "cant": 1.0, "un": "SER", "pu": 66.0}, {"pos": "40", "mat": "", "desc": "FUMIGACION 77 CAMIONES VENDING", "cant": 1.0, "un": "SER", "pu": 1694.0}]'), (15, 19, 2026, 8, '4500084003', 3220.0, 'invoiced', 'DESRATIZACION ALMACEN PT - CEDI CALLAO ACV (4 posiciones)', 'mensual', '2026-08-21', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "DESRATIZACION ALMACEN PT", "cant": 1.0, "un": "SER", "pu": 300.0}, {"pos": "20", "mat": "", "desc": "DESRATIZACION ALMACEN EQUIPOS Y REPUESTO", "cant": 1.0, "un": "SER", "pu": 120.0}, {"pos": "30", "mat": "", "desc": "FUMIGACION OFICINAS ALMACENES Y TALLER", "cant": 1.0, "un": "SER", "pu": 1600.0}, {"pos": "40", "mat": "", "desc": "CONTROL AVIAR", "cant": 1.0, "un": "SER", "pu": 1200.0}]'), (15, 20, 2026, 8, '4500084006', 6500.0, 'invoiced', 'FUMIGACIÓN EQUIPOS MES DE AGOSTO - CEDI CALLAO ACV', 'eventual', '2026-08-21', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "FUMIGACI\\u00d3N EQUIPOS MES DE AGOSTO", "cant": 1.0, "un": "SER", "pu": 6500.0}]'), (15, 19, 2026, 7, '4500083462', 140.0, 'invoiced', 'DESRATIZACIÓN - 02 CEBADEROS - CEDI CALLAO ACV', 'eventual', '2026-07-31', 'CEDI CALLAO ACV', '7602', '1476', 'Vend, SAC', '[{"pos": "10", "mat": "", "desc": "DESRATIZACI\\u00d3N - 02 CEBADEROS", "cant": 1.0, "un": "SER", "pu": 140.0}]')]
            for cid, sid, y, m, oc, am, st, nt, per, dt, cloc, idcloc, idsoc, soc, items_str in raw_ocs:
                conn.execute("""
                    INSERT INTO purchase_orders (
                        client_id, client_site_id, year, month, oc_number, amount, status, notes,
                        periodicity, issue_date, centro_logistico, id_centro_logistico, sociedad_code, sociedad_name, items_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (cid, sid, y, m, oc, am, st, nt, per, dt, cloc, idcloc, idsoc, soc, items_str))

            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('seed_po_v2', '1')")
            conn.commit()
        except Exception as e:
            print("[seed_po_v2] Error:", e)

    # 10. Seed SUNAT SIRE RVIE Invoices 2026 (seed_sunat_invoices_2026_v1)
    seed_sunat = conn.execute("SELECT value FROM config WHERE key='seed_sunat_invoices_2026_v2'").fetchone()
    if not seed_sunat:
        try:
            import json
            from collections import defaultdict
            try:
                import data_sunat_2026 as ds
            except ImportError:
                from . import data_sunat_2026 as ds

            # 1. Clean up placeholder / empty invoices
            conn.execute("DELETE FROM invoices WHERE number = '' OR number LIKE '957%' OR id IN (44, 46, 47, 48, 54, 56, 57, 58)")

            # 2. Insert or update clients
            for c in ds.CLIENTS:
                ruc = c['ruc']
                bname = c['business_name']
                is_reg = c['is_regular']
                row = conn.execute("SELECT id FROM clients WHERE ruc = ?", (ruc,)).fetchone()
                if row:
                    if is_reg:
                        conn.execute("UPDATE clients SET is_regular = 1 WHERE id = ?", (row[0],))
                else:
                    conn.execute("""
                        INSERT INTO clients (ruc, business_name, is_regular, created_at)
                        VALUES (?, ?, ?, datetime('now','localtime'))
                    """, (ruc, bname, is_reg))

            # Build client lookup
            client_id_by_ruc = {r[0]: r[1] for r in conn.execute("SELECT ruc, id FROM clients WHERE ruc IS NOT NULL").fetchall()}

            # 3. Regular sites
            for ruc, sede, fee, per, srv in ds.REGULAR_SITES:
                cid = client_id_by_ruc.get(ruc)
                if cid:
                    exists = conn.execute("SELECT id FROM client_sites WHERE client_id=? AND ROUND(monthly_fee,2)=?", (cid, round(fee, 2))).fetchone()
                    if not exists:
                        conn.execute("""
                            INSERT INTO client_sites (client_id, nombre_cliente, sede_cliente, monthly_fee, periodicity, is_regular, is_active, servicios)
                            VALUES (?, ?, ?, ?, ?, 1, 1, ?)
                        """, (cid, sede, sede, fee, per, srv))

            # Build site lookups: (client_id, round(fee, 2)) -> site_id
            site_lookup = {}
            for r in conn.execute("SELECT id, client_id, ROUND(monthly_fee, 2) FROM client_sites WHERE monthly_fee IS NOT NULL").fetchall():
                site_lookup[(r[1], round(r[2], 2))] = r[0]

            # 4. Purchase orders lookup
            pos = conn.execute("SELECT * FROM purchase_orders").fetchall()
            po_by_match = defaultdict(list)
            for p in pos:
                po_by_match[(p['client_id'], p['month'])].append(p)

            # 5. Insert or update invoices
            for d in ds.INVOICES:
                cid = client_id_by_ruc.get(d['ruc'])
                if not cid:
                    continue
                bi = round(d['amount'], 2)
                sid = site_lookup.get((cid, bi))
                if not sid:
                    any_s = conn.execute("SELECT id FROM client_sites WHERE client_id=?", (cid,)).fetchone()
                    if any_s:
                        sid = any_s[0]

                # Match PO
                matched_po = None
                candidates = po_by_match.get((cid, d['month_billed']), [])
                if not candidates:
                    candidates = po_by_match.get((cid, d['month_billed'] - 1), [])
                for p in candidates:
                    if abs(p['amount'] - bi) < 0.05 or abs(p['amount'] - d['total']) < 0.05:
                        matched_po = p['oc_number']
                        conn.execute("UPDATE purchase_orders SET status='invoiced' WHERE id=?", (p['id'],))
                        break

                meta = {
                    'car': d['car'],
                    'periodicity': d['periodicity'],
                    'moneda': d['moneda']
                }
                if d['nc']:
                    meta['nc'] = d['nc']

                srv_title = "Control Aviar" if "TOPY" in d['cliente'].upper() or "SUR COLOR" in d['cliente'].upper() else "Servicio de Saneamiento y Manejo Integrado de Plagas"

                existing = conn.execute("SELECT id FROM invoices WHERE series=? AND number=?", (d['serie'], d['number'])).fetchone()
                if existing:
                    conn.execute("""
                        UPDATE invoices SET
                            client_id=?, client_site_id=?, service=?, amount=?, igv=?, total=?,
                            issue_date=?, due_date=?, status=?, month_billed=?, year_billed=?,
                            purchase_order=COALESCE(?, purchase_order), detraccion=?, credito=?, items_json=?
                        WHERE id=?
                    """, (cid, sid, srv_title, d['amount'], d['igv'], d['total'],
                          d['issue_date'], d['due_date'], d['status'], d['month_billed'], d['year_billed'],
                          matched_po, d['detraccion'], d['credito'], json.dumps(meta), existing[0]))
                else:
                    conn.execute("""
                        INSERT INTO invoices (
                            client_id, client_site_id, series, number, service, payment_type,
                            amount, igv, total, issue_date, due_date, status, month_billed, year_billed,
                            purchase_order, detraccion, credito, items_json
                        ) VALUES (?, ?, ?, ?, ?, 'credito', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (cid, sid, d['serie'], d['number'], srv_title,
                          d['amount'], d['igv'], d['total'], d['issue_date'], d['due_date'], d['status'],
                          d['month_billed'], d['year_billed'], matched_po, d['detraccion'], d['credito'], json.dumps(meta)))

            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('seed_sunat_invoices_2026_v2', '1')")
            conn.commit()
            print("[seed_sunat_invoices_2026_v1] Successfully populated 556 SUNAT invoices.")
        except Exception as e:
            print("[seed_sunat_invoices_2026_v1] Error:", e)

    # 11. Seed sites and PO breakdown v3
    seed_po3 = conn.execute("SELECT value FROM config WHERE key='seed_po_v3'").fetchone()
    if not seed_po3:
        try:
            conn.execute("UPDATE client_sites SET nombre_cliente='ARCA CONTINENTAL LINDLEY - PLANTA SANTA ROSA (MIP / DESINSECTACIÓN)', monthly_fee=8510.0, periodicity='mensual', location_code='5040', servicios='SERV DESINSECTACION, DESINFECCION, DESRATIZACION, MONITOREO' WHERE id=5")
            sites_to_insert = [
                (50, 11, 'ARCA CONTINENTAL LINDLEY - PLANTA SANTA ROSA (CONTROL DE AVES)', 'SR-AV', 1, 3280.0, 'SERV CONTROL DE AVES', 'mensual', '5040'),
                (51, 11, 'ARCA CONTINENTAL LINDLEY - PLANTA SANTA ROSA (MANTENIMIENTO PLANTA)', 'SR-MT', 0, 1400.0, 'SERV MANTENIMIENTO INSTALACIONES PLANTA', 'eventual', '5040'),
                (52, 15, 'VEND S.A.C. - PIURA (DESRATIZACION)', 'VPIU-DR', 1, 380.0, 'DESRATIZACION', 'bimensual', '7613'),
                (53, 15, 'VEND S.A.C. - AREQUIPA (CAMIONES)', 'VAQP-CAM', 0, 300.0, 'FUMIGACION DE CAMIONES POR DESINSECTACION', 'eventual', '7606'),
                (54, 15, 'VEND S.A.C. - PIURA (CAMIONES)', 'VPIU-CAM', 0, 540.0, 'FUMIGACION DE CAMIONES POR DESINSECTACION', 'eventual', '7613'),
                (55, 15, 'VEND S.A.C. - CHICLAYO (CAMIONES)', 'VCIX-CAM', 0, 360.0, 'FUMIGACION 12 CAMIONES', 'eventual', '7612'),
                (56, 15, 'VEND S.A.C. - TRUJILLO / CAJAMARCA (CAMIONES)', 'VTRU-CAM', 0, 300.0, 'FUMIGACION TRUJILLO Y CAJAMARCA CAMIONES', 'eventual', '7611'),
                (57, 15, 'VEND S.A.C. - ICA (CAMIONES)', 'VICA-CAM', 0, 560.0, 'FUMIGACION 08 CAMIONES', 'eventual', '7609'),
                (58, 15, 'VEND S.A.C. - CUZCO (CAMIONES)', 'VCUZ-CAM', 0, 120.0, 'FUMIGACION DE CAMIONES POR DESINSECTACION', 'eventual', '7610'),
                (59, 15, 'VEND S.A.C. - CHIMBOTE (CAMIONES)', 'VCHM-CAM', 0, 120.0, 'FUMIGACION DE CHIMBOTE CAMIONES', 'eventual', '7616'),
            ]
            for s in sites_to_insert:
                conn.execute('''
                    INSERT OR REPLACE INTO client_sites (id, client_id, nombre_cliente, codigo_sede, is_regular, monthly_fee, servicios, periodicity, location_code, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ''', s)

            po_updates = [
                (50, '4501207202'),
                (51, '4501208817'),
                (52, '4500084810'),
                (53, '4500085904'),
                (54, '4500085897'),
                (55, '4500085898'),
                (56, '4500085900'),
                (57, '4500085902'),
                (58, '4500085905'),
                (59, '4500085901'),
            ]
            for site_id, oc_num in po_updates:
                conn.execute("UPDATE purchase_orders SET client_site_id = ? WHERE oc_number = ?", (site_id, oc_num))

            conn.execute("UPDATE purchase_orders SET client_site_id = 19 WHERE oc_number = '4500085548'")
            conn.execute("UPDATE client_sites SET nombre_cliente='VEND S.A.C. - PIURA (DESINSECTACION Y DESINFECCION)', monthly_fee=800.0 WHERE id=23")
            conn.execute("UPDATE client_sites SET is_active=0 WHERE id=26")
            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('seed_po_v3', '1')")
            conn.commit()
            print("[seed_po_v3] Successfully updated sites and PO breakdown.")
        except Exception as e:
            print("[seed_po_v3] Error:", e)

    # 12. Seed October 2026 OCs for Embotelladora La Selva (seed_po_v4_oct2026)
    seed_po4 = conn.execute("SELECT value FROM config WHERE key='seed_po_v4_oct2026'").fetchone()
    if not seed_po4:
        try:
            conn.execute("""
                INSERT OR REPLACE INTO client_sites (
                    id, client_id, codigo_cliente, codigo_sede, codigo_cliente_sede,
                    nombre_cliente, sede_cliente, distrito, is_regular, monthly_fee,
                    servicios, location_code, periodicity, is_active
                ) VALUES (
                    60, 14, 'ELS', 'LAM', 'ELS-LAM',
                    'EMBOTELLADORA LA SELVA - PLANTA IQUITOS (CAMBIO DE LAMINAS)', 'CAMBIO DE LAMINAS',
                    'Iquitos', 0, 3840.00, 'SERVICIO DE CAMBIO DE LAMINAS DE INSECTOCUTORES', '1', 'eventual', 1
                )
            """)
            new_selva_ocs = [
                (14, 15, 2026, 10, '6300012092', 4225.0, 'pending', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-10-28', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1200.0}, {"pos": "20", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 200.0}, {"pos": "30", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 1100.0}, {"pos": "40", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 1600.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 125.0}]'),
                (14, 16, 2026, 10, '6300012093', 1250.0, 'pending', 'SERV DESINSECTACION - Planta Iquitos JR3 (5 posiciones)', 'mensual', '2026-10-28', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 600.0}, {"pos": "20", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 100.0}, {"pos": "30", "mat": "000000000000451109", "desc": "SERV DESINFECCION", "cant": 1.0, "un": "UN", "pu": 50.0}, {"pos": "40", "mat": "000000000000451110", "desc": "SERV DESRATIZACION", "cant": 1.0, "un": "UN", "pu": 400.0}, {"pos": "50", "mat": "000000000000451112", "desc": "SERV CONTROL DE AVES", "cant": 1.0, "un": "UN", "pu": 100.0}]'),
                (14, 17, 2026, 10, '6300012094', 1420.0, 'pending', 'SERV DESINSECTACION - Planta Iquitos JR3', 'mensual', '2026-10-28', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451108", "desc": "SERV DESINSECTACION", "cant": 1.0, "un": "UN", "pu": 1420.0}]'),
                (14, 60, 2026, 10, '6300012096', 3840.0, 'pending', 'CAMBIO DE LAMINAS DE INSECTOCUTORES - Planta Iquitos JR3', 'eventual', '2026-10-28', 'Planta Iquitos JR3', '6300', 'JR3', 'Embotelladora La Selva S.A.C.', '[{"pos": "10", "mat": "000000000000451111", "desc": "SERV MONITOREO INSECTOCUTORES", "cant": 1.0, "un": "UN", "pu": 3840.0}]')
            ]
            for cid, sid, y, m, oc, am, st, nt, per, dt, cloc, idcloc, idsoc, soc, items_str in new_selva_ocs:
                existing_po = conn.execute("SELECT id FROM purchase_orders WHERE oc_number = ?", (oc,)).fetchone()
                if not existing_po:
                    conn.execute("""
                        INSERT INTO purchase_orders (
                            client_id, client_site_id, year, month, oc_number, amount, status, notes,
                            periodicity, issue_date, centro_logistico, id_centro_logistico, sociedad_code, sociedad_name, items_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (cid, sid, y, m, oc, am, st, nt, per, dt, cloc, idcloc, idsoc, soc, items_str))

            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('seed_po_v4_oct2026', '1')")
            conn.commit()
            print("[seed_po_v4_oct2026] Successfully updated October 2026 OCs.")
        except Exception as e:
            print("[seed_po_v4_oct2026] Error:", e)

    # 13. Synchronize 2026 OCs and Invoices per master Excel (sync_excel_2026_v1)
    sync_2026 = conn.execute("SELECT value FROM config WHERE key='sync_excel_2026_v1'").fetchone()
    if not sync_2026:
        try:
            # 1. Delete phantom invoice E001-9311-MAR
            conn.execute("DELETE FROM invoices WHERE number = '9311-MAR'")

            # 2. Clean artificial suffixes
            conn.execute("UPDATE invoices SET number = '9248' WHERE number = '9248-CEDI'")
            conn.execute("UPDATE invoices SET number = '9353' WHERE number = '9353-ADIC'")

            # 3. Fix client_site_id & client_id for misassigned invoices
            reassignments = [
                (579, '1372', 7, 11),  # Planta Cusco instead of Planta Pucusana
                (357, '1744', 17, 14), # La Selva Adicionales instead of Iquitos
                (409, '1796', 17, 14), # La Selva Adicionales instead of Iquitos
                (17, '1849', 17, 14),  # La Selva Adicionales instead of Iquitos
            ]
            for inv_id, num, site_id, cl_id in reassignments:
                conn.execute("UPDATE invoices SET client_site_id = ?, client_id = ? WHERE id = ? AND number = ?", (site_id, cl_id, inv_id, num))

            # 4. Correct month_billed for invoices issued early in following month
            month_corrections = [
                ('1436', 1, 2026), ('1455', 1, 2026), ('1475', 1, 2026),
                ('1447', 2, 2026), ('1448', 2, 2026), ('1456', 2, 2026), ('1457', 2, 2026),
                ('1502', 3, 2026), ('1503', 3, 2026), ('1506', 3, 2026), ('1507', 3, 2026), ('1526', 3, 2026), ('1532', 3, 2026),
                ('1571', 4, 2026), ('1572', 4, 2026), ('1578', 4, 2026), ('1579', 4, 2026),
                ('1762', 5, 2026), ('1763', 6, 2026), ('1741', 7, 2026), ('1790', 8, 2026),
                ('1703', 5, 2026), ('1714', 6, 2026), ('1742', 7, 2026),
                ('1704', 6, 2026), ('1689', 6, 2026), ('1700', 6, 2026),
            ]
            for num, m, yr in month_corrections:
                conn.execute("UPDATE invoices SET month_billed = ? WHERE number = ? AND year_billed = ?", (m, num, yr))

            # 5. Ensure Annulled Invoices
            annulled_nums = [
                '1449', '1530', '9270', '9298', '1525', '1606', '1611', '1612', '1619', '1738', '1793',
                '1400', '1423', '1427', '1428', '1430', '1431', '1437', '1439', '1444', '1450', '1459',
                '1492', '1505', '1509', '1520', '1589', '1601', '1878', '1634', '1635', '1636', '1637',
                '1660', '1662', '1340', '1342', '1343', '1344', '1345', '1356', '1359', '1360', '1368',
                '1369', '1378', '1387', '1388', '1395'
            ]
            q_placeholders = ','.join(['?'] * len(annulled_nums))
            conn.execute(f"UPDATE invoices SET status = 'annulled' WHERE number IN ({q_placeholders}) AND year_billed = 2026", annulled_nums)

            # 6. Check and update replacement invoices
            conn.execute("UPDATE invoices SET status = 'paid', month_billed = 2, purchase_order = '4501164544', client_site_id = 14, client_id = 13 WHERE number = '9313' AND year_billed = 2026")
            conn.execute("UPDATE invoices SET status = 'paid', month_billed = 3, purchase_order = '4501164449', client_site_id = 14, client_id = 13 WHERE number = '9327' AND year_billed = 2026")
            conn.execute("UPDATE invoices SET status = 'paid', month_billed = 2, purchase_order = '6300010348', client_site_id = 16, client_id = 14 WHERE number = '9312' AND year_billed = 2026")
            conn.execute("UPDATE invoices SET status = 'paid', month_billed = 2, purchase_order = '4501166570', client_site_id = 3, client_id = 11 WHERE number = '9271' AND year_billed = 2026")

            # 7. Purchase orders corrections
            conn.execute("UPDATE purchase_orders SET status = 'pending' WHERE id = 74")
            conn.execute("UPDATE purchase_orders SET month = 9 WHERE oc_number = '4500084312' AND year = 2026")

            # 8. Sync PO status with invoices
            conn.execute('''
                UPDATE purchase_orders 
                SET status = 'invoiced'
                WHERE year = 2026 AND status = 'pending' AND id IN (
                    SELECT po.id 
                    FROM purchase_orders po
                    JOIN invoices i ON (
                        (i.purchase_order IS NOT NULL AND i.purchase_order != '' AND (i.purchase_order = po.oc_number OR po.oc_number LIKE '%' || i.purchase_order || '%'))
                        OR (i.client_site_id = po.client_site_id AND i.month_billed = po.month AND i.year_billed = po.year)
                    )
                    WHERE (i.status != 'annulled' OR i.status IS NULL)
                )
            ''')
            conn.execute('''
                UPDATE purchase_orders 
                SET status = 'pending'
                WHERE year = 2026 AND status = 'invoiced' AND id NOT IN (
                    SELECT po.id 
                    FROM purchase_orders po
                    JOIN invoices i ON (
                        (i.purchase_order IS NOT NULL AND i.purchase_order != '' AND (i.purchase_order = po.oc_number OR po.oc_number LIKE '%' || i.purchase_order || '%'))
                        OR (i.client_site_id = po.client_site_id AND i.month_billed = po.month AND i.year_billed = po.year)
                    )
                    WHERE (i.status != 'annulled' OR i.status IS NULL)
                )
            ''')

            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('sync_excel_2026_v1', '1')")
            conn.commit()
            print("[sync_excel_2026_v1] Successfully synchronized 2026 OCs and Invoices per master Excel.")
        except Exception as e:
            print("[sync_excel_2026_v1] Error:", e)

    # 14. Synchronize billing lag for regular clients (sync_desfase_regular_2026_v1)
    sync_lag = conn.execute("SELECT value FROM config WHERE key='sync_desfase_regular_2026_v1'").fetchone()
    if not sync_lag:
        try:
            shifts = [
                # SUR COLOR STAR (Cuota 800)
                ('1404', 1, 2026),
                ('1473', 2, 2026),
                ('1536', 3, 2026),
                ('1775', 4, 2026),
                ('1829', 5, 2026),
                ('1833', 6, 2026),
                ('1834', 7, 2026),
                ('1835', 8, 2026),
                ('1841', 9, 2026),
                ('1897', 10, 2026),

                # TOPY TOP (Cuota 750)
                ('1405', 1, 2026),
                ('1472', 2, 2026),
                ('1535', 3, 2026),
                ('1774', 4, 2026),
                ('1831', 5, 2026),
                ('1832', 6, 2026),
                ('1836', 7, 2026),
                ('1840', 8, 2026),
                ('1898', 9, 2026),

                # HELATONY'S (Sites 29 & 30)
                ('1401', 1, 2026),
                ('1411', 1, 2026),
                ('1453', 2, 2026),
                ('1454', 2, 2026),
                ('1513', 3, 2026),
                ('1514', 3, 2026),
                ('1574', 4, 2026),
                ('1575', 4, 2026),
                ('1639', 5, 2026),
                ('1640', 5, 2026),
                ('1663', 6, 2026),
                ('1664', 6, 2026),
                ('1757', 7, 2026),
                ('1758', 7, 2026),
                ('1813', 8, 2026),
                ('1814', 8, 2026),
                ('1872', 9, 2026),
                ('1873', 9, 2026),

                # PERUVIAN CHOCOLATES
                ('1402', 1, 2026),
                ('1403', 1, 2026),
                ('1451', 2, 2026),
                ('1452', 2, 2026),
                ('1515', 3, 2026),
                ('1516', 3, 2026),
                ('1576', 4, 2026),
                ('1577', 4, 2026),
                ('1641', 5, 2026),
                ('1642', 5, 2026),
                ('1665', 6, 2026),
                ('1666', 6, 2026),
                ('1759', 7, 2026),
                ('1760', 7, 2026),
                ('1815', 8, 2026),
                ('1816', 8, 2026),
                ('1874', 9, 2026),
                ('1875', 9, 2026),

                # SEW EURODRIVE (Site 31)
                ('1511', 3, 2026),
                ('1569', 4, 2026),
                ('1629', 5, 2026),
                ('1678', 6, 2026),
                ('1679', 6, 2026),
                ('1754', 7, 2026),
                ('1806', 8, 2026),
                ('1892', 9, 2026),

                # ASCENSORES S A (Site 33, Fee 1450)
                ('1466', 1, 2026),
                ('1470', 2, 2026),
                ('1471', 3, 2026),
                ('1547', 4, 2026),
                ('1633', 5, 2026),
                ('1717', 6, 2026),
                ('1755', 7, 2026),
                ('1805', 8, 2026),
                ('1876', 9, 2026),

                # PACCU S A (Sites 48 & 49)
                ('1438', 2, 2026),
                ('1441', 2, 2026),
                ('1747', 7, 2026),

                # F Y D INVERSIONES (Sites 44 & 45)
                ('1681', 6, 2026),
                ('1682', 6, 2026),
                ('1768', 7, 2026),
                ('1769', 7, 2026),
                ('1809', 8, 2026),
                ('1890', 9, 2026),
                ('1889', 9, 2026),

                # VEND S.A.C. CEDI CALLAO ALMACENES (Site 19)
                ('1893', 9, 2026),
            ]

            for num, m, yr in shifts:
                conn.execute("UPDATE invoices SET month_billed = ? WHERE number = ? AND year_billed = ?", (m, num, yr))

            # Sync PO statuses based on updated invoice month_billed
            conn.execute('''
                UPDATE purchase_orders 
                SET status = 'invoiced'
                WHERE year = 2026 AND status = 'pending' AND id IN (
                    SELECT po.id 
                    FROM purchase_orders po
                    JOIN invoices i ON (
                        (i.purchase_order IS NOT NULL AND i.purchase_order != '' AND (i.purchase_order = po.oc_number OR po.oc_number LIKE '%' || i.purchase_order || '%'))
                        OR (i.client_site_id = po.client_site_id AND i.month_billed = po.month AND i.year_billed = po.year)
                    )
                    WHERE (i.status != 'annulled' OR i.status IS NULL)
                )
            ''')
            conn.execute('''
                UPDATE purchase_orders 
                SET status = 'pending'
                WHERE year = 2026 AND status = 'invoiced' AND id NOT IN (
                    SELECT po.id 
                    FROM purchase_orders po
                    JOIN invoices i ON (
                        (i.purchase_order IS NOT NULL AND i.purchase_order != '' AND (i.purchase_order = po.oc_number OR po.oc_number LIKE '%' || i.purchase_order || '%'))
                        OR (i.client_site_id = po.client_site_id AND i.month_billed = po.month AND i.year_billed = po.year)
                    )
                    WHERE (i.status != 'annulled' OR i.status IS NULL)
                )
            ''')

            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('sync_desfase_regular_2026_v1', '1')")
            conn.commit()
            print("[sync_desfase_regular_2026_v1] Successfully synchronized billing lag for regular clients.")
        except Exception as e:
            print("[sync_desfase_regular_2026_v1] Error:", e)



def seed_default_workouts(conn):
    count = conn.execute("SELECT COUNT(*) FROM workout_days").fetchone()[0]
    if count > 0:
        return

    post_stretch = (
        "Estiramiento de Mariposa (45 segundos)\n"
        "• Siéntate en el piso, junta las plantas de tus pies y acerca los talones hacia tu pelvis.\n"
        "• Sujeta tus pies con las manos, mantén la espalda derecha y empuja suavemente las rodillas hacia el piso para elongar los aductores.\n\n"
        "Figura de 4 con pie base en el piso (30 segundos por pierna)\n"
        "• Acuéstate boca arriba con las rodillas flexionadas y los pies apoyados en el piso.\n"
        "• Cruza un tobillo sobre la rodilla opuesta formando un 4 y empuja suavemente la rodilla cruzada o acerca el muslo base hacia el pecho para estirar el glúteo profundo y piriforme.\n\n"
        "Estiramiento 90-90 (30 segundos por lado)\n"
        "• Siéntate en el piso con la pierna delantera flexionada a 90° frente a ti (rotación externa) y la pierna trasera flexionada a 90° hacia el costado (rotación interna).\n"
        "• Mantén la espalda larga e inclina suavemente el torso hacia la pierna delantera, luego cambia de lado."
    )
    warmup_std = (
        "Flow de Isquiotibiales (Repetir 5 a 8 veces)\n"
        "• Párate con los pies separados al ancho de tus hombros.\n"
        "• Agáchate en una sentadilla profunda y sujeta las puntas de tus pies (o tus tobillos si no llegas).\n"
        "• Manteniendo las manos en tus pies, levanta la cadera hacia el techo e intenta estirar las rodillas lo máximo posible. Mantén la cabeza hacia abajo. Sentirás el estirón en la parte trasera de los muslos.\n"
        "• Sostén esa posición estirada por 2 segundos.\n"
        "• Vuelve a bajar la cadera hacia la posición de sentadilla profunda, levanta el pecho y mira hacia adelante.\n\n"
        "Lunges para el Psoas (Repetir 5 a 8 veces por pierna)\n"
        "• Apoya una rodilla en el piso y pisa con el otro pie hacia adelante (como si te estuvieras arrodillando para pedir matrimonio). Ambas rodillas deben formar un ángulo de 90 grados.\n"
        "• Mantén la espalda completamente recta y contrae el abdomen.\n"
        "• Empuja tu cadera suavemente hacia adelante, sin arquear la espalda baja ni inclinar el torso. Debes sentir el estiramiento en la parte frontal de la cadera de la pierna que está apoyada en el piso.\n"
        "• Sostén la máxima tensión por 2 segundos.\n"
        "• Retrocede suavemente la cadera a la posición inicial.\n\n"
        "⏱ Realiza estos dos movimientos de forma continua, alternando entre ellos, hasta cumplir entre 5 y 10 minutos en total antes de tocar las pesas."
    )

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


def seed_default_finance(conn):
    # Seed default accounts if empty
    acc_count = conn.execute("SELECT COUNT(*) FROM finance_accounts").fetchone()[0]
    if acc_count == 0:
        default_accounts = [
            ("Mercado Pago", "wallet", "ARS", 0.0, "#009EE3", "📱"),
            ("Efectivo", "cash", "ARS", 0.0, "#10B981", "💵"),
            ("Banco", "bank", "ARS", 0.0, "#6366F1", "🏦"),
            ("Ahorros Operación (USD)", "savings", "USD", 0.0, "#EC4899", "🗽"),
        ]
        for name, acc_type, curr, init_bal, color, icon in default_accounts:
            conn.execute("""
                INSERT INTO finance_accounts (name, account_type, currency, initial_balance, color, icon)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (name, acc_type, curr, init_bal, color, icon))

    # Seed default categories if empty
    cat_count = conn.execute("SELECT COUNT(*) FROM finance_categories").fetchone()[0]
    if cat_count == 0:
        default_categories = [
            # Gastos
            ("Comida y Supermercado", "expense", "🛒", "#F59E0B", 1),
            ("Salud y TRH / Farmacia", "expense", "💊", "#EC4899", 2),
            ("Alquiler y Servicios", "expense", "🏠", "#6366F1", 3),
            ("Transporte", "expense", "🚌", "#3B82F6", 4),
            ("Universidad y Estudio", "expense", "📚", "#8B5CF6", 5),
            ("Salidas y Cafés", "expense", "☕", "#F97316", 6),
            ("Ropa y Cuidado Personal", "expense", "🛍️", "#D946EF", 7),
            ("Aporte Meta Operación", "expense", "🏥", "#E11D48", 8),
            ("Varios y Otros", "expense", "📦", "#6B7280", 9),
            # Ingresos
            ("Sueldo / Trabajo", "income", "💼", "#10B981", 10),
            ("Extras / Freelance", "income", "🪙", "#059669", 11),
            ("Transferencia / Regalo", "income", "🎁", "#14B8A6", 12),
            ("Rendimientos / Inversión", "income", "📈", "#06B6D4", 13),
        ]
        for name, ctype, icon, color, sorder in default_categories:
            conn.execute("""
                INSERT INTO finance_categories (name, type, icon, color, sort_order)
                VALUES (?, ?, ?, ?, ?)
            """, (name, ctype, icon, color, sorder))

    # Seed default goal if empty
    goal_count = conn.execute("SELECT COUNT(*) FROM finance_goals").fetchone()[0]
    if goal_count == 0:
        conn.execute("""
            INSERT INTO finance_goals (title, target_amount, current_amount, currency, usd_exchange_rate, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            "Mi Operación",
            5000.0,
            0.0,
            "USD",
            1200.0,
            "Fondo de ahorro para la intervención quirúrgica"
        ))

    # Seed debt category if missing
    debt_cat = conn.execute("SELECT id FROM finance_categories WHERE name LIKE '%Deuda%'").fetchone()
    if not debt_cat:
        conn.execute("""
            INSERT INTO finance_categories (name, type, icon, color, sort_order)
            VALUES (?, 'expense', '💳', '#DC2626', 14)
        """, ('Pago de Deuda / Tarjeta',))

    # Seed default recurring expenses if empty
    rec_count = conn.execute("SELECT COUNT(*) FROM finance_recurring_expenses").fetchone()[0]
    if rec_count == 0:
        default_recurring = [
            ("Alquiler y Expensas", 0.0, 10),
            ("Servicios (Luz / Gas / Agua)", 0.0, 15),
            ("Internet / Wi-Fi", 0.0, 12),
            ("Telefonía Celular", 0.0, 20),
            ("Gimnasio", 0.0, 5),
            ("Suscripciones (Streaming/Música)", 0.0, 8),
        ]
        for name, amt, dday in default_recurring:
            c_row = conn.execute("SELECT id FROM finance_categories WHERE name LIKE ? LIMIT 1", (f"%{name[:4]}%",)).fetchone()
            cid = c_row['id'] if c_row else None
            conn.execute("""
                INSERT INTO finance_recurring_expenses (name, amount, due_day, category_id)
                VALUES (?, ?, ?, ?)
            """, (name, amt, dday, cid))

    conn.commit()


