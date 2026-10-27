---
name: sqlite-architect
description: Use this skill when designing tables, writing queries, optimizing indexes, performing schema migrations, or debugging concurrency and WAL mode locks in SQLite.
---

# SQLite Architect Skill

This skill enforces high-performance, fault-tolerant SQLite design patterns tailored for embedded and dual-runtime environments (Eel desktop + Flask cloud).

---

## 1. Engine Configuration & Pragmas

SQLite must always be initialized with robust concurrency and data integrity settings:

```python
import sqlite3

def get_connection(db_path="gestion.db"):
    conn = sqlite3.connect(db_path, timeout=10.0)
    conn.row_factory = sqlite3.Row  # Dict-like row access
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode = WAL;")        # Concurrency: readers don't block writers
    cursor.execute("PRAGMA foreign_keys = ON;")        # Referential integrity
    cursor.execute("PRAGMA synchronous = NORMAL;")     # Safe & high-speed WAL syncing
    cursor.execute("PRAGMA busy_timeout = 5000;")      # Wait up to 5s before throwing locked error
    return conn
```

---

## 2. Idempotent Schema Migrations in `database.py`

**Never drop or recreate tables in production.**
Nicole uses idempotent migrations inside `database.py:init_db()`.
To alter existing tables or add columns:
1. Append `ALTER TABLE ... ADD COLUMN ...` statements inside the migration list in `init_db()`.
2. Wrap each migration in a `try/except sqlite3.OperationalError` loop:
   ```python
   migrations = [
       "ALTER TABLE invoices ADD COLUMN credit_note_id INTEGER REFERENCES credit_notes(id);",
       "ALTER TABLE quotes ADD COLUMN validity_days INTEGER DEFAULT 15;",
       "CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);",
       "CREATE INDEX IF NOT EXISTS idx_tasks_status_date ON tasks(status, date);",
   ]
   for migration in migrations:
       try:
           cursor.execute(migration)
       except sqlite3.OperationalError:
           pass  # Column or index already exists, skip safely
   ```

---

## 3. Query Optimization & Indexing Rules

1. **Composite Indexes for Filter & Sort**:
   - Queries filtering by status and sorting by date must have composite indexes:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_tasks_area_status ON tasks(area, status);
     CREATE INDEX IF NOT EXISTS idx_injections_date ON injections(date DESC);
     ```
2. **Explain Query Plan**:
   - For queries joining 3+ tables (e.g. quotes + clients + items + services):
     ```sql
     EXPLAIN QUERY PLAN SELECT ...
     ```
   - Verify that SQLite utilizes `SEARCH TABLE ... USING INDEX` rather than `SCAN TABLE`.
3. **Date & Time Conventions**:
   - Store dates as ISO 8601 strings: `YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS`.
   - In comparisons, always use timezone-aware Argentina dates (`AR_TZ` UTC-3):
     ```python
     # Correct
     today_str = local_date()  # Returns 'YYYY-MM-DD' in UTC-3
     cursor.execute("SELECT * FROM tasks WHERE date = ?", (today_str,))
     ```

---

## 4. Transaction Boundaries & Lock Management
- Always use the context manager pattern to prevent dangling locks:
  ```python
  with get_db() as conn:
      cursor = conn.cursor()
      cursor.execute("INSERT INTO ...", (...))
      conn.commit()
  ```
- Keep transactions short. Do not perform network requests, file disk writes, or heavy computations inside an open SQLite write transaction.
