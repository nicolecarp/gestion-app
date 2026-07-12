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
            bust_cm REAL,
            waist_cm REAL,
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
    ]:
        try:
            conn.execute(stmt)
        except:
            pass

    conn.commit()
    conn.close()
