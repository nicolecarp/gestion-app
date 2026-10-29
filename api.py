try:
    import eel
except ImportError:
    class _DummyEel:
        @staticmethod
        def expose(fn):
            return fn
    eel = _DummyEel()

from datetime import date, datetime, timedelta, timezone
from database import get_connection

AR_TZ = timezone(timedelta(hours=-3))

def local_date():
    return datetime.now(AR_TZ).date()

def today():
    return local_date().isoformat()

# ===================== TASKS =====================

@eel.expose
def get_tasks(area_id=None):
    conn = get_connection()
    try:
        if area_id:
            rows = conn.execute("""
                SELECT t.*, a.name as area_name
                FROM tasks t JOIN areas a ON t.area_id=a.id
                WHERE t.area_id=? ORDER BY t.due_date ASC
            """, (area_id,)).fetchall()
        else:
            rows = conn.execute("""
                SELECT t.*, a.name as area_name
                FROM tasks t JOIN areas a ON t.area_id=a.id
                ORDER BY t.due_date ASC
            """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_task(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO tasks (area_id, category, title, description, due_date, priority, reminder_days)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data.get('area_id', 1), data.get('category'), data['title'],
              data.get('description'), data.get('due_date'), data.get('priority', 'medium'),
              data.get('reminder_days', 1)))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_task(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE tasks SET title=?, category=?, description=?, due_date=?,
                priority=?, reminder_days=?
            WHERE id=?
        """, (data.get('title'), data.get('category'), data.get('description'),
              data.get('due_date'), data.get('priority'), data.get('reminder_days'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def complete_task(id):
    conn = get_connection()
    try:
        conn.execute("UPDATE tasks SET status='completed' WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_task(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM tasks WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== CLIENTS =====================

@eel.expose
def get_clients():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM clients ORDER BY business_name ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_client(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO clients (ruc, business_name, contact_name, phone, email, address, notes, is_regular, monthly_fee, servicios)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data.get('ruc'), data['business_name'], data.get('contact_name'),
              data.get('phone'), data.get('email'), data.get('address'), data.get('notes'),
              1 if data.get('is_regular') else 0, data.get('monthly_fee'), data.get('servicios')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_client(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE clients SET ruc=?, business_name=?, contact_name=?, phone=?,
                email=?, address=?, notes=?, is_regular=?, monthly_fee=?, servicios=?
            WHERE id=?
        """, (data.get('ruc'), data['business_name'], data.get('contact_name'),
              data.get('phone'), data.get('email'), data.get('address'),
              data.get('notes'), 1 if data.get('is_regular') else 0,
              data.get('monthly_fee'), data.get('servicios'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_client(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM clients WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== INVOICES =====================

@eel.expose
def get_invoices():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT i.*, c.business_name, c.ruc, cs.nombre_cliente as site_name, cs.sede_cliente, cs.location_code as site_location
            FROM invoices i
            JOIN clients c ON i.client_id=c.id
            LEFT JOIN client_sites cs ON i.client_site_id = cs.id
            ORDER BY i.series DESC, CAST(i.number AS INTEGER) DESC, i.number DESC, i.id DESC
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_invoice(data):
    conn = get_connection()
    try:
        # Auto-calculate month/year billed from issue_date
        issue = data.get('issue_date', '')
        mb = data.get('month_billed')
        yb = data.get('year_billed')
        if not mb and issue:
            try: mb = int(issue.split('-')[1])
            except: pass
        if not yb and issue:
            try: yb = int(issue.split('-')[0])
            except: pass

        amount = float(data.get('amount') or 0)
        igv = float(data.get('igv') if data.get('igv') is not None else round(amount * 0.18, 2))
        total = float(data.get('total') if data.get('total') is not None else round(amount + igv, 2))
        detraccion = float(data.get('detraccion') if data.get('detraccion') is not None else (round(total * 0.12, 2) if total > 700 else 0))
        credito = float(data.get('credito') if data.get('credito') is not None else round(total - detraccion, 2))

        cur = conn.execute("""
            INSERT INTO invoices (client_id, client_site_id, series, number, service, payment_type,
                amount, igv, total, issue_date, due_date, month_billed, year_billed,
                purchase_order, detraccion, credito, location_code, items_json, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data['client_id'], data.get('client_site_id'), data.get('series'), data.get('number'),
              data.get('service'), data.get('payment_type', 'credito'), amount,
              igv, total, data.get('issue_date'),
              data.get('due_date'), mb, yb,
              data.get('purchase_order'), detraccion, credito,
              data.get('location_code'), data.get('items_json'), data.get('status', 'issued')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_invoice(id, data):
    conn = get_connection()
    try:
        issue = data.get('issue_date', '')
        mb = data.get('month_billed')
        yb = data.get('year_billed')
        if not mb and issue:
            try: mb = int(issue.split('-')[1])
            except: pass
        if not yb and issue:
            try: yb = int(issue.split('-')[0])
            except: pass

        amount = float(data.get('amount') or 0)
        igv = float(data.get('igv') if data.get('igv') is not None else round(amount * 0.18, 2))
        total = float(data.get('total') if data.get('total') is not None else round(amount + igv, 2))
        detraccion = float(data.get('detraccion') if data.get('detraccion') is not None else (round(total * 0.12, 2) if total > 700 else 0))
        credito = float(data.get('credito') if data.get('credito') is not None else round(total - detraccion, 2))

        conn.execute("""
            UPDATE invoices SET client_id=?, client_site_id=?, series=?, number=?, service=?,
                payment_type=?, amount=?, igv=?, total=?, issue_date=?, due_date=?, status=?,
                month_billed=?, year_billed=?, purchase_order=?, detraccion=?, credito=?,
                location_code=?, items_json=?
            WHERE id=?
        """, (data['client_id'], data.get('client_site_id'), data.get('series'), data.get('number'),
              data.get('service'), data.get('payment_type', 'credito'), amount,
              igv, total, data.get('issue_date'),
              data.get('due_date'), data.get('status', 'issued'), mb, yb,
              data.get('purchase_order'), detraccion, credito,
              data.get('location_code'), data.get('items_json'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_invoice(id):
    conn = get_connection()
    try:
        inv = conn.execute("SELECT purchase_order, client_site_id, month_billed, year_billed FROM invoices WHERE id=?", (id,)).fetchone()
        po_num = inv['purchase_order'] if inv else None

        conn.execute("DELETE FROM invoices WHERE id=?", (id,))
        conn.commit()

        if po_num:
            other = conn.execute("SELECT COUNT(id) FROM invoices WHERE purchase_order=? AND status != 'annulled'", (po_num,)).fetchone()[0]
            if other == 0:
                conn.execute("UPDATE purchase_orders SET status='pending' WHERE oc_number=?", (po_num,))
                conn.commit()

        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== EMPLOYEES =====================

@eel.expose
def get_employees(active_only=True):
    conn = get_connection()
    try:
        if active_only:
            rows = conn.execute("SELECT * FROM employees WHERE is_active=1 ORDER BY full_name ASC").fetchall()
        else:
            rows = conn.execute("SELECT * FROM employees ORDER BY full_name ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_employee(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO employees (full_name, document_number, phone, email, position, sede_operativa, responsable)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data['full_name'], data.get('document_number'), data.get('phone'),
              data.get('email'), data.get('position'), data.get('sede_operativa'), data.get('responsable')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_employee(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE employees SET full_name=?, document_number=?, phone=?, email=?, position=?, sede_operativa=?, responsable=?
            WHERE id=?
        """, (data['full_name'], data.get('document_number'), data.get('phone'),
              data.get('email'), data.get('position'), data.get('sede_operativa'), data.get('responsable'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def toggle_employee_active(id):
    conn = get_connection()
    try:
        emp = conn.execute("SELECT is_active FROM employees WHERE id=?", (id,)).fetchone()
        if emp:
            conn.execute("UPDATE employees SET is_active=? WHERE id=?",
                        (0 if emp['is_active'] else 1, id))
            conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_employee(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM employees WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== EMPLOYEE DOCUMENTS =====================

@eel.expose
def get_employee_documents(employee_id=None):
    conn = get_connection()
    try:
        if employee_id:
            rows = conn.execute("""
                SELECT ed.*, e.full_name
                FROM employee_documents ed JOIN employees e ON ed.employee_id=e.id
                WHERE ed.employee_id=? ORDER BY ed.expiry_date ASC
            """, (employee_id,)).fetchall()
        else:
            rows = conn.execute("""
                SELECT ed.*, e.full_name
                FROM employee_documents ed JOIN employees e ON ed.employee_id=e.id
                ORDER BY ed.expiry_date ASC
            """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_employee_document(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO employee_documents (employee_id, doc_type, doc_number, issue_date, expiry_date, notes, external_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (data['employee_id'], data['doc_type'], data.get('doc_number'),
              data.get('issue_date'), data.get('expiry_date'), data.get('notes'), data.get('external_url')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_employee_document(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE employee_documents SET doc_type=?, doc_number=?, issue_date=?, expiry_date=?, notes=?, external_url=?
            WHERE id=?
        """, (data['doc_type'], data.get('doc_number'), data.get('issue_date'),
              data.get('expiry_date'), data.get('notes'), data.get('external_url'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_employee_document(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM employee_documents WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def upload_employee_document_file(id, file_b64, file_name, file_type):
    """Guarda un archivo en employee_documents como BLOB."""
    conn = get_connection()
    try:
        import base64
        file_data = base64.b64decode(file_b64)
        conn.execute("""
            UPDATE employee_documents SET file_data=?, file_name=?, file_type=?
            WHERE id=?
        """, (file_data, file_name, file_type, id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_employee_document_file(id):
    """Retorna el archivo de un documento como base64."""
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT file_data, file_name, file_type FROM employee_documents WHERE id=?
        """, (id,)).fetchone()
        if row and row['file_data']:
            import base64
            return {
                'ok': True,
                'file_b64': base64.b64encode(row['file_data']).decode('ascii'),
                'file_name': row['file_name'],
                'file_type': row['file_type'],
            }
        return {'ok': False, 'error': 'No file'}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== SERVICE TYPES =====================

@eel.expose
def get_service_types():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM service_types ORDER BY name ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_service_type(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO service_types (name, description, default_price, category)
            VALUES (?, ?, ?, ?)
        """, (data['name'], data.get('description'), data.get('default_price'), data.get('category')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_service_type(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE service_types SET name=?, description=?, default_price=?, category=?
            WHERE id=?
        """, (data['name'], data.get('description'), data.get('default_price'), data.get('category'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_service_type(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM service_types WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== CLIENT SERVICES =====================

@eel.expose
def get_client_services(client_id):
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT cs.*, st.name as service_name, st.default_price, st.category
            FROM client_services cs
            LEFT JOIN service_types st ON cs.service_type_id = st.id
            WHERE cs.client_id=?
            ORDER BY st.name ASC
        """, (client_id,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def set_client_services(client_id, services):
    """Reemplaza todos los servicios de un cliente. services = lista de {service_type_id, custom_price, notes}"""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM client_services WHERE client_id=?", (client_id,))
        for s in services:
            conn.execute("""
                INSERT INTO client_services (client_id, service_type_id, custom_price, notes)
                VALUES (?, ?, ?, ?)
            """, (client_id, s.get('service_type_id'), s.get('custom_price'), s.get('notes')))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== REIMBURSEMENTS =====================

@eel.expose
def get_reimbursements():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT r.*, e.full_name
            FROM reimbursements r JOIN employees e ON r.employee_id=e.id
            ORDER BY r.created_at DESC LIMIT 50
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_reimbursement(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO reimbursements (employee_id, date, concept, amount)
            VALUES (?, ?, ?, ?)
        """, (data['employee_id'], data.get('date', today()), data.get('concept'), data['amount']))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_reimbursement(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE reimbursements SET employee_id=?, date=?, concept=?, amount=?, status=?
            WHERE id=?
        """, (data['employee_id'], data.get('date'), data.get('concept'),
              data['amount'], data.get('status'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_reimbursement(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM reimbursements WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== OVERTIME =====================

@eel.expose
def get_overtime():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT o.*, e.full_name
            FROM overtime o JOIN employees e ON o.employee_id=e.id
            ORDER BY o.date DESC LIMIT 50
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_overtime(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO overtime (employee_id, date, days, reason)
            VALUES (?, ?, ?, ?)
        """, (data['employee_id'], data.get('date', today()), data['days'], data.get('reason')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_overtime(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE overtime SET employee_id=?, date=?, days=?, reason=?, approved=?
            WHERE id=?
        """, (data['employee_id'], data.get('date'), data['days'],
              data.get('reason'), data.get('approved', 0), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_overtime(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM overtime WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== LINDLEY =====================

@eel.expose
def get_lindley_contacts():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM lindley_contacts ORDER BY plant ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_lindley_contact(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO lindley_contacts (plant, contact_name, email, phone, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (data['plant'], data.get('contact_name'), data.get('email'),
              data.get('phone'), data.get('notes')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_lindley_contact(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE lindley_contacts SET plant=?, contact_name=?, email=?, phone=?, notes=?
            WHERE id=?
        """, (data['plant'], data.get('contact_name'), data.get('email'),
              data.get('phone'), data.get('notes'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_lindley_contact(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM lindley_contacts WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_lindley_forms():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM lindley_forms ORDER BY year DESC, month DESC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_lindley_form(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO lindley_forms (month, year, completed_date, notes, status)
            VALUES (?, ?, ?, ?, ?)
        """, (data['month'], data['year'], data.get('completed_date', today()),
              data.get('notes'), data.get('status', 'completed')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_lindley_form(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE lindley_forms SET month=?, year=?, completed_date=?, notes=?, status=?
            WHERE id=?
        """, (data['month'], data['year'], data.get('completed_date'),
              data.get('notes'), data.get('status'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== UNIVERSITY =====================

@eel.expose
def get_subjects():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT * FROM subjects
            ORDER BY
                CASE WHEN status='current' THEN 0 WHEN status='passed' THEN 1 ELSE 2 END,
                CASE day_of_week
                    WHEN 'Lunes' THEN 1
                    WHEN 'Martes' THEN 2
                    WHEN 'Miércoles' THEN 3
                    WHEN 'Jueves' THEN 4
                    WHEN 'Viernes' THEN 5
                    WHEN 'Sábado' THEN 6
                    ELSE 7
                END,
                start_time ASC,
                name ASC
        """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_subject(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO subjects (name, professor, schedule, year, status,
                commission, classroom, virtual_link, zoom_id, subject_code, current_status_note, day_of_week, start_time, end_time, shift)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data['name'], data.get('professor'), data.get('schedule'),
              data.get('year', 2026), data.get('status', 'current'),
              data.get('commission'), data.get('classroom'), data.get('virtual_link'), data.get('zoom_id'),
              data.get('subject_code'), data.get('current_status_note'), data.get('day_of_week'),
              data.get('start_time'), data.get('end_time'), data.get('shift')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_subject(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE subjects SET name=?, professor=?, schedule=?, year=?, status=?,
                commission=?, classroom=?, virtual_link=?, zoom_id=?, subject_code=?, current_status_note=?, day_of_week=?, start_time=?, end_time=?, shift=?
            WHERE id=?
        """, (data['name'], data.get('professor'), data.get('schedule'),
              data.get('year'), data.get('status'),
              data.get('commission'), data.get('classroom'), data.get('virtual_link'), data.get('zoom_id'),
              data.get('subject_code'), data.get('current_status_note'), data.get('day_of_week'),
              data.get('start_time'), data.get('end_time'), data.get('shift'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_curriculum_status():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM curriculum_status").fetchall()
        result = {}
        for r in rows:
            result[r["subject_id"]] = {
                "subject_id": r["subject_id"],
                "status": r["status"],
                "grade": r["grade"],
                "note": r["note"],
                "updated_at": r["updated_at"]
            }
        return result
    finally:
        conn.close()

@eel.expose
def update_curriculum_status(subject_id, status, grade=None, note=None):
    conn = get_connection()
    try:
        conn.execute("""
            INSERT INTO curriculum_status (subject_id, status, grade, note, updated_at)
            VALUES (?, ?, ?, ?, datetime('now','localtime'))
            ON CONFLICT(subject_id) DO UPDATE SET
                status=excluded.status,
                grade=COALESCE(excluded.grade, curriculum_status.grade),
                note=COALESCE(excluded.note, curriculum_status.note),
                updated_at=excluded.updated_at
        """, (int(subject_id), status, grade, note))

        # Synchronize status with enrolled subjects if exists
        subj_status = 'passed' if status == 'APROBADA' else ('current' if status in ('CURSANDO', 'REGULAR', 'LIBRE_DISPONIBLE') else 'current')
        conn.execute("""
            UPDATE subjects SET status=? WHERE subject_code=?
        """, (subj_status, str(subject_id)))

        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_subject(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM exams WHERE subject_id=?", (id,))
        conn.execute("DELETE FROM assignments WHERE subject_id=?", (id,))
        conn.execute("DELETE FROM subjects WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_exams(subject_id=None):
    conn = get_connection()
    try:
        if subject_id:
            rows = conn.execute("""
                SELECT e.*, s.name as subject_name
                FROM exams e JOIN subjects s ON e.subject_id=s.id
                WHERE e.subject_id=? ORDER BY e.date ASC
            """, (subject_id,)).fetchall()
        else:
            rows = conn.execute("""
                SELECT e.*, s.name as subject_name
                FROM exams e JOIN subjects s ON e.subject_id=s.id
                ORDER BY e.date ASC
            """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_exam(data):
    conn = get_connection()
    try:
        subj_id = data.get('subject_id')
        if not subj_id:
            return {'ok': False, 'error': 'subject_id es obligatorio'}
        cur = conn.execute("""
            INSERT INTO exams (subject_id, type, date, time, topic, grade, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (subj_id, data.get('type'), data.get('date'),
              data.get('time'), data.get('topic'), data.get('grade'),
              data.get('status', 'pending')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_exam(id, data):
    conn = get_connection()
    try:
        subj_id = data.get('subject_id')
        if not subj_id:
            cur_subj = conn.execute("SELECT subject_id FROM exams WHERE id=?", (id,)).fetchone()
            if cur_subj:
                subj_id = cur_subj[0]
            else:
                return {'ok': False, 'error': 'Examen no encontrado'}
        conn.execute("""
            UPDATE exams SET subject_id=?, type=?, date=?, time=?, topic=?, grade=?, status=?
            WHERE id=?
        """, (subj_id, data.get('type'), data.get('date'),
              data.get('time'), data.get('topic'), data.get('grade'),
              data.get('status'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_exam(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM exams WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_assignments(subject_id=None):
    conn = get_connection()
    try:
        if subject_id:
            rows = conn.execute("""
                SELECT a.*, s.name as subject_name
                FROM assignments a JOIN subjects s ON a.subject_id=s.id
                WHERE a.subject_id=? ORDER BY a.due_date ASC
            """, (subject_id,)).fetchall()
        else:
            rows = conn.execute("""
                SELECT a.*, s.name as subject_name
                FROM assignments a JOIN subjects s ON a.subject_id=s.id
                ORDER BY a.due_date ASC
            """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_assignment(data):
    conn = get_connection()
    try:
        subj_id = data.get('subject_id')
        if not subj_id:
            return {'ok': False, 'error': 'subject_id es obligatorio'}
        cur = conn.execute("""
            INSERT INTO assignments (subject_id, title, description, due_date, grade, group_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (subj_id, data.get('title'), data.get('description'),
              data.get('due_date'), data.get('grade'), data.get('group_name'),
              data.get('status', 'pending')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_assignment(id, data):
    conn = get_connection()
    try:
        subj_id = data.get('subject_id')
        if not subj_id:
            cur_subj = conn.execute("SELECT subject_id FROM assignments WHERE id=?", (id,)).fetchone()
            if cur_subj:
                subj_id = cur_subj[0]
            else:
                return {'ok': False, 'error': 'TP no encontrado'}
        conn.execute("""
            UPDATE assignments SET subject_id=?, title=?, description=?, due_date=?,
                grade=?, group_name=?, status=?
            WHERE id=?
        """, (subj_id, data.get('title'), data.get('description'),
              data.get('due_date'), data.get('grade'), data.get('group_name'),
              data.get('status'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_assignment(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM assignments WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== HABITS =====================

@eel.expose
def get_habits():
    conn = get_connection()
    try:
        t = today()
        rows = conn.execute("""
            SELECT h.*,
                   CASE WHEN EXISTS (
                       SELECT 1 FROM habit_logs hl WHERE hl.habit_id = h.id AND hl.date = ?
                   ) THEN 1 ELSE 0 END as done_today
            FROM habits h
            ORDER BY h.name ASC
        """, (t,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_habit(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO habits (name, frequency)
            VALUES (?, ?)
        """, (data['name'], data.get('frequency', 'daily')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_habit(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM habits WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def toggle_habit_today(habit_id):
    conn = get_connection()
    try:
        existing = conn.execute("""
            SELECT id FROM habit_logs WHERE habit_id=? AND date=?
        """, (habit_id, today())).fetchone()
        if existing:
            conn.execute("DELETE FROM habit_logs WHERE id=?", (existing['id'],))
        else:
            conn.execute("""
                INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)
            """, (habit_id, today()))
            streak = conn.execute("""
                SELECT COUNT(DISTINCT date) as c FROM habit_logs WHERE habit_id=?
            """, (habit_id,)).fetchone()['c']
            conn.execute("UPDATE habits SET streak=? WHERE id=?", (streak, habit_id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_habit_status(habit_id):
    conn = get_connection()
    try:
        done = conn.execute("""
            SELECT COUNT(*) as c FROM habit_logs WHERE habit_id=? AND date=?
        """, (habit_id, today())).fetchone()['c']
        return {'done': bool(done)}
    finally:
        conn.close()

# ===================== DASHBOARD =====================

@eel.expose
def get_dashboard_stats():
    conn = get_connection()
    try:
        overdue = conn.execute("""
            SELECT COUNT(*) as c FROM tasks WHERE status='pending' AND due_date<?
        """, (today(),)).fetchone()['c']
        pending = conn.execute("""
            SELECT COUNT(*) as c FROM tasks WHERE status='pending'
        """).fetchone()['c']
        exams = conn.execute("""
            SELECT COUNT(*) as c FROM exams WHERE status='pending'
        """).fetchone()['c']
        docs_expired = conn.execute("""
            SELECT COUNT(*) as c FROM employee_documents WHERE expiry_date<?
        """, (today(),)).fetchone()['c']
        docs_soon = conn.execute("""
            SELECT COUNT(*) as c FROM employee_documents
            WHERE expiry_date>=? AND expiry_date<=?
        """, (today(), (local_date() + timedelta(days=30)).isoformat())).fetchone()['c']

        # Injection stats
        last_inj = conn.execute("""
            SELECT date FROM injections ORDER BY date DESC LIMIT 1
        """).fetchone()
        overdue_injection = False
        next_injection_date = None
        next_injection_days = None
        if last_inj:
            last_date = date.fromisoformat(last_inj['date'])
            next_due = last_date + timedelta(days=7)
            next_injection_days = (next_due - local_date()).days
            next_injection_date = next_due.isoformat()
            overdue_injection = next_injection_days < 0

        # Workout stats
        now_month = today()[:7]
        workouts_month = conn.execute(
            "SELECT COUNT(*) as c FROM workout_sessions WHERE date LIKE ? || '%'", (now_month,)
        ).fetchone()['c']
        last_session = conn.execute(
            "SELECT day_id, day_name, date FROM workout_sessions ORDER BY date DESC, id DESC LIMIT 1"
        ).fetchone()
        days_rows = conn.execute(
            "SELECT id, day_number, name FROM workout_days ORDER BY sort_order ASC, day_number ASC"
        ).fetchall()
        next_workout_name = days_rows[0]['name'] if days_rows else None
        next_workout_id = days_rows[0]['id'] if days_rows else None
        if last_session and days_rows:
            ids = [r['id'] for r in days_rows]
            if last_session['day_id'] in ids:
                nxt_idx = (ids.index(last_session['day_id']) + 1) % len(days_rows)
                next_workout_name = days_rows[nxt_idx]['name']
                next_workout_id = days_rows[nxt_idx]['id']

        # Latest weight
        last_weight_row = conn.execute(
            "SELECT weight, date FROM body_measurements WHERE weight IS NOT NULL ORDER BY date DESC LIMIT 1"
        ).fetchone()

        # Cosplay stats
        active_cosplays = conn.execute(
            "SELECT COUNT(*) as c FROM cosplay_projects WHERE status NOT IN ('entregado')"
        ).fetchone()['c']
        next_cosplay = conn.execute(
            "SELECT character_name, due_date FROM cosplay_projects WHERE status NOT IN ('entregado') AND due_date IS NOT NULL AND due_date != '' ORDER BY due_date ASC LIMIT 1"
        ).fetchone()

        # Estradiol stock & next lab date
        stock_row = conn.execute("SELECT value FROM config WHERE key='estradiol_stock'").fetchone()
        lab_row = conn.execute("SELECT value FROM config WHERE key='next_lab_date'").fetchone()
        estradiol_stock = int(stock_row['value']) if (stock_row and stock_row['value'] and str(stock_row['value']).lstrip('-').isdigit()) else None
        next_lab_date = lab_row['value'] if (lab_row and lab_row['value']) else None

        return {
            'overdue_tasks': overdue,
            'pending_tasks': pending,
            'pending_exams': exams,
            'expired_docs': docs_expired,
            'expiring_soon_docs': docs_soon,
            'overdue_injection': overdue_injection,
            'next_injection_date': next_injection_date,
            'next_injection_days': next_injection_days,
            'estradiol_stock': estradiol_stock,
            'next_lab_date': next_lab_date,
            'workouts_month': workouts_month,
            'last_workout_date': last_session['date'] if last_session else None,
            'next_workout_name': next_workout_name,
            'next_workout_id': next_workout_id,
            'latest_weight': last_weight_row['weight'] if last_weight_row else None,
            'latest_weight_date': last_weight_row['date'] if last_weight_row else None,
            'active_cosplays': active_cosplays,
            'next_cosplay_name': next_cosplay['character_name'] if next_cosplay else None,
            'next_cosplay_date': next_cosplay['due_date'] if next_cosplay else None,
        }
    finally:
        conn.close()

@eel.expose
def get_calendar_events(year, month):
    conn = get_connection()
    try:
        start = f"{year}-{month:02d}-01"
        if month == 12:
            end = f"{year+1}-01-01"
        else:
            end = f"{year}-{month+1:02d}-01"

        tasks = conn.execute("""
            SELECT due_date, title, 'task' as type FROM tasks
            WHERE due_date>=? AND due_date<? AND status='pending'
        """, (start, end)).fetchall()

        exams = conn.execute("""
            SELECT e.id, e.subject_id, e.date as due_date, s.name || ' (' || COALESCE(e.type, 'Examen') || ')' as title, 'exam' as type
            FROM exams e JOIN subjects s ON e.subject_id=s.id
            WHERE e.date>=? AND e.date<? AND e.status='pending'
        """, (start, end)).fetchall()

        docs = conn.execute("""
            SELECT ed.expiry_date as due_date, ed.doc_type || ' - ' || e.full_name as title, 'doc' as type
            FROM employee_documents ed JOIN employees e ON ed.employee_id=e.id
            WHERE ed.expiry_date>=? AND ed.expiry_date<?
        """, (start, end)).fetchall()

        assignments = conn.execute("""
            SELECT a.id, a.subject_id, a.due_date, 'TP: ' || a.title as title, 'assignment' as type
            FROM assignments a WHERE a.due_date>=? AND a.due_date<? AND a.status='pending'
        """, (start, end)).fetchall()

        injections = conn.execute("""
            SELECT date as due_date, '💉 Inyección: ' || dose_mg || ' mg' as title, 'injection' as type
            FROM injections WHERE date>=? AND date<?
        """, (start, end)).fetchall()

        cosplays = conn.execute("""
            SELECT due_date, '🎭 Entrega: ' || character_name as title, 'cosplay' as type
            FROM cosplay_projects WHERE due_date>=? AND due_date<? AND status!='entregado'
        """, (start, end)).fetchall()

        workouts = conn.execute("""
            SELECT date as due_date, '🏋️‍♀️ ' || COALESCE(day_name, 'Entrenamiento') as title, 'workout' as type
            FROM workout_sessions WHERE date>=? AND date<?
        """, (start, end)).fetchall()

        # Project future doses (up to 2 ahead) based on last injection
        last_inj = conn.execute("""
            SELECT date, dose_mg FROM injections ORDER BY date DESC LIMIT 1
        """).fetchone()
        projected = []
        if last_inj:
            dose_mg = last_inj['dose_mg']
            next_date = date.fromisoformat(last_inj['date']) + timedelta(days=7)
            for _ in range(2):
                ns = next_date.isoformat()
                if ns >= start and ns < end:
                    projected.append({'due_date': ns, 'title': f'💉 Próxima: {dose_mg} mg', 'type': 'injection'})
                next_date += timedelta(days=7)

        events = tasks + exams + docs + assignments + injections + cosplays + workouts + projected
        result = {}
        for ev in events:
            if ev['due_date']:
                day = int(ev['due_date'].split('-')[2])
                if day not in result:
                    result[day] = []
                result[day].append({
                    'title': ev['title'],
                    'type': ev['type'],
                })
        return result
    finally:
        conn.close()

@eel.expose
def get_today_tasks():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT t.*, a.name as area_name
            FROM tasks t JOIN areas a ON t.area_id=a.id
            WHERE t.status='pending' AND (t.due_date=? OR t.due_date IS NULL)
            ORDER BY t.due_date ASC LIMIT 10
        """, (today(),)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def get_soon_deadlines():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT t.*, a.name as area_name
            FROM tasks t JOIN areas a ON t.area_id=a.id
            WHERE t.status='pending' AND t.due_date>=? AND t.due_date<=?
            ORDER BY t.due_date ASC LIMIT 10
        """, (today(), (local_date() + timedelta(days=7)).isoformat())).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# ===================== COSPLAY ENTREPRENEURSHIP =====================

@eel.expose
def get_cosplay_projects():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT * FROM cosplay_projects
            ORDER BY CASE status
                WHEN 'en_proceso' THEN 1
                WHEN 'con_sena' THEN 2
                WHEN 'cotizado' THEN 3
                WHEN 'listo' THEN 4
                WHEN 'entregado' THEN 5
                ELSE 6
            END, COALESCE(due_date, '9999-12-31') ASC, id DESC
        """).fetchall()
    except Exception:
        rows = conn.execute("SELECT * FROM cosplay_projects ORDER BY id DESC").fetchall()
    try:
        projects = []
        for r in rows:
            p = dict(r)
            items = conn.execute(
                "SELECT * FROM cosplay_items WHERE project_id=? ORDER BY id ASC", (p['id'],)
            ).fetchall()
            p['items'] = [dict(it) for it in items]
            items_cost = sum(float(it['cost'] or 0) for it in p['items'])
            p['total_cost'] = round(float(p.get('materials_cost') or 0) + items_cost, 2)
            p['profit'] = round(float(p.get('price') or 0) - p['total_cost'], 2)
            p['balance_due'] = round(max(0.0, float(p.get('price') or 0) - float(p.get('deposit') or 0)), 2)
            projects.append(p)
        return projects
    finally:
        conn.close()

@eel.expose
def save_cosplay_project(data):
    conn = get_connection()
    try:
        pid = data.get('id')
        cname = (data.get('client_name') or '').strip()
        if cname and cname.lower() not in ('propio', 'stock', 'propio / stock'):
            try:
                conn.execute("""
                    INSERT INTO cosplay_clients (name, contact, size_measurements)
                    VALUES (?, ?, ?)
                    ON CONFLICT(name) DO UPDATE SET
                        contact = COALESCE(NULLIF(excluded.contact, ''), cosplay_clients.contact),
                        size_measurements = COALESCE(NULLIF(excluded.size_measurements, ''), cosplay_clients.size_measurements)
                """, (cname, data.get('client_contact') or '', data.get('size_measurements') or ''))
            except Exception:
                pass

        if pid:
            conn.execute("""
                UPDATE cosplay_projects
                SET character_name=?, series_name=?, client_name=?, client_contact=?,
                    project_type=?, category=?, size_measurements=?, price=?, deposit=?,
                    materials_cost=?, due_date=?, status=?, notes=?
                WHERE id=?
            """, (
                data.get('character_name'), data.get('series_name'), data.get('client_name'),
                data.get('client_contact'), data.get('project_type', 'Comisión'),
                data.get('category', 'Traje completo'), data.get('size_measurements'),
                float(data.get('price') or 0), float(data.get('deposit') or 0),
                float(data.get('materials_cost') or 0), data.get('due_date'),
                data.get('status', 'cotizado'), data.get('notes'), pid
            ))
            conn.commit()
            return {'ok': True, 'id': pid}
        else:
            cur = conn.execute("""
                INSERT INTO cosplay_projects
                (character_name, series_name, client_name, client_contact, project_type, category,
                 size_measurements, price, deposit, materials_cost, due_date, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('character_name'), data.get('series_name'), data.get('client_name'),
                data.get('client_contact'), data.get('project_type', 'Comisión'),
                data.get('category', 'Traje completo'), data.get('size_measurements'),
                float(data.get('price') or 0), float(data.get('deposit') or 0),
                float(data.get('materials_cost') or 0), data.get('due_date'),
                data.get('status', 'cotizado'), data.get('notes')
            ))
            conn.commit()
            return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_cosplay_clients():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM cosplay_clients ORDER BY name ASC").fetchall()
        clients = [dict(r) for r in rows]
        # Also include any distinct clients from cosplay_projects not yet in cosplay_clients
        known = {c['name'].lower() for c in clients}
        proj_rows = conn.execute("""
            SELECT client_name, client_contact, size_measurements
            FROM cosplay_projects
            WHERE client_name IS NOT NULL AND TRIM(client_name) != ''
            ORDER BY id DESC
        """).fetchall()
        for pr in proj_rows:
            nm = (pr['client_name'] or '').strip()
            if nm and nm.lower() not in known and nm.lower() not in ('propio', 'stock', 'propio / stock'):
                known.add(nm.lower())
                clients.append({
                    'id': None,
                    'name': nm,
                    'contact': pr['client_contact'] or '',
                    'size_measurements': pr['size_measurements'] or '',
                    'notes': ''
                })
        return clients
    finally:
        conn.close()

@eel.expose
def save_cosplay_client(data):
    conn = get_connection()
    try:
        cid = data.get('id')
        name = (data.get('name') or '').strip()
        if not name:
            return {'ok': False, 'error': 'Nombre obligatorio'}
        if cid:
            conn.execute("""
                UPDATE cosplay_clients SET name=?, contact=?, size_measurements=?, notes=? WHERE id=?
            """, (name, data.get('contact') or '', data.get('size_measurements') or '', data.get('notes') or '', cid))
        else:
            conn.execute("""
                INSERT INTO cosplay_clients (name, contact, size_measurements, notes)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    contact=excluded.contact,
                    size_measurements=excluded.size_measurements,
                    notes=excluded.notes
            """, (name, data.get('contact') or '', data.get('size_measurements') or '', data.get('notes') or ''))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_cosplay_client(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM cosplay_clients WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_cosplay_project(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM cosplay_items WHERE project_id=?", (id,))
        conn.execute("DELETE FROM cosplay_projects WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def add_cosplay_item(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO cosplay_items (project_id, name, item_type, cost, done)
            VALUES (?, ?, ?, ?, 0)
        """, (
            data['project_id'], data['name'],
            data.get('item_type', 'Material'), float(data.get('cost') or 0)
        ))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def toggle_cosplay_item(item_id):
    conn = get_connection()
    try:
        conn.execute("UPDATE cosplay_items SET done = CASE WHEN done=1 THEN 0 ELSE 1 END WHERE id=?", (item_id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_cosplay_item(item_id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM cosplay_items WHERE id=?", (item_id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== CONFIG =====================

@eel.expose
def get_config(key):
    conn = get_connection()
    try:
        row = conn.execute("SELECT value FROM config WHERE key=?", (key,)).fetchone()
        return row['value'] if row else None
    finally:
        conn.close()

@eel.expose
def set_config(key, value):
    conn = get_connection()
    try:
        conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", (key, str(value)))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_all_config():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM config").fetchall()
        result = {}
        for r in rows:
            result[r['key']] = r['value']
        return result
    finally:
        conn.close()

# ===================== COMPLETED TASKS =====================

@eel.expose
def get_completed_tasks(area_id=None):
    conn = get_connection()
    try:
        if area_id:
            rows = conn.execute("""
                SELECT t.*, a.name as area_name
                FROM tasks t JOIN areas a ON t.area_id=a.id
                WHERE t.status='completed' AND t.area_id=?
                ORDER BY t.created_at DESC LIMIT 50
            """, (area_id,)).fetchall()
        else:
            rows = conn.execute("""
                SELECT t.*, a.name as area_name
                FROM tasks t JOIN areas a ON t.area_id=a.id
                WHERE t.status='completed'
                ORDER BY t.created_at DESC LIMIT 50
            """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# ===================== HABIT LOGS =====================

@eel.expose
def get_habit_logs(year, habit_id=None):
    conn = get_connection()
    try:
        start = f"{year}-01-01"
        end = f"{year+1}-01-01"
        if habit_id:
            rows = conn.execute("""
                SELECT hl.*, h.name as habit_name
                FROM habit_logs hl JOIN habits h ON hl.habit_id=h.id
                WHERE hl.date>=? AND hl.date<? AND hl.habit_id=?
                ORDER BY hl.date ASC
            """, (start, end, habit_id)).fetchall()
        else:
            rows = conn.execute("""
                SELECT hl.*, h.name as habit_name
                FROM habit_logs hl JOIN habits h ON hl.habit_id=h.id
                WHERE hl.date>=? AND hl.date<? AND hl.habit_id IN (
                    SELECT id FROM habits
                )
                ORDER BY hl.date ASC
            """, (start, end)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

# ===================== INJECTIONS =====================

@eel.expose
def get_injections():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM injections ORDER BY date DESC LIMIT 100").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_injection(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO injections (date, dose_mg, injection_site, notes)
            VALUES (?, ?, ?, ?)
        """, (data['date'], data.get('dose_mg', 4.0), data.get('injection_site'), data.get('notes')))
        # Auto-decrement estradiol_stock if configured
        stock_row = conn.execute("SELECT value FROM config WHERE key='estradiol_stock'").fetchone()
        if stock_row and stock_row['value'] and str(stock_row['value']).lstrip('-').isdigit():
            new_stock = max(0, int(stock_row['value']) - 1)
            conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('estradiol_stock', ?)", (str(new_stock),))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_injection(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM injections WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== BODY MEASUREMENTS =====================

@eel.expose
def get_body_measurements():
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM body_measurements ORDER BY date ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_body_measurement(data):
    conn = get_connection()
    try:
        fields = [
            'weight', 'bideltoid_cm', 'bust_cm', 'underbust_cm',
            'waist_cm', 'iliac_crest_cm', 'hips_cm', 'thigh_cm', 'arm_cm'
        ]
        rec_id = data.get('id')
        dt = data['date']

        if rec_id:
            # Explicit edit of an existing row
            conn.execute("""
                UPDATE body_measurements
                SET date=?, weight=?, bideltoid_cm=?, bust_cm=?, underbust_cm=?,
                    waist_cm=?, iliac_crest_cm=?, hips_cm=?, thigh_cm=?, arm_cm=?, notes=?
                WHERE id=?
            """, (
                dt, data.get('weight'), data.get('bideltoid_cm'), data.get('bust_cm'),
                data.get('underbust_cm'), data.get('waist_cm'), data.get('iliac_crest_cm'),
                data.get('hips_cm'), data.get('thigh_cm'), data.get('arm_cm'),
                data.get('notes'), rec_id
            ))
            conn.commit()
            return {'ok': True, 'id': rec_id}

        # Check if a row for this date already exists to merge non-null fields
        existing = conn.execute("SELECT * FROM body_measurements WHERE date=?", (dt,)).fetchone()
        if existing:
            ex = dict(existing)
            merged = {}
            for f in fields:
                val = data.get(f)
                merged[f] = val if (val is not None and val != '') else ex.get(f)
            notes = data.get('notes') if data.get('notes') else ex.get('notes')
            conn.execute("""
                UPDATE body_measurements
                SET weight=?, bideltoid_cm=?, bust_cm=?, underbust_cm=?,
                    waist_cm=?, iliac_crest_cm=?, hips_cm=?, thigh_cm=?, arm_cm=?, notes=?
                WHERE id=?
            """, (
                merged['weight'], merged['bideltoid_cm'], merged['bust_cm'], merged['underbust_cm'],
                merged['waist_cm'], merged['iliac_crest_cm'], merged['hips_cm'],
                merged['thigh_cm'], merged['arm_cm'], notes, ex['id']
            ))
            conn.commit()
            return {'ok': True, 'id': ex['id'], 'merged': True}

        cur = conn.execute("""
            INSERT INTO body_measurements
            (date, weight, bideltoid_cm, bust_cm, underbust_cm, waist_cm, iliac_crest_cm, hips_cm, thigh_cm, arm_cm, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            dt, data.get('weight'), data.get('bideltoid_cm'), data.get('bust_cm'),
            data.get('underbust_cm'), data.get('waist_cm'), data.get('iliac_crest_cm'),
            data.get('hips_cm'), data.get('thigh_cm'), data.get('arm_cm'), data.get('notes')
        ))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_measurement_goals():
    import json
    conn = get_connection()
    try:
        row = conn.execute("SELECT value FROM config WHERE key='measurement_goals'").fetchone()
        if row and row['value']:
            try:
                return json.loads(row['value'])
            except Exception:
                return {}
        return {}
    finally:
        conn.close()

@eel.expose
def save_measurement_goals(goals):
    import json
    conn = get_connection()
    try:
        clean = {}
        for k, v in (goals or {}).items():
            if v is not None and str(v).strip() != '':
                try:
                    clean[k] = float(v)
                except ValueError:
                    pass
        conn.execute(
            "INSERT OR REPLACE INTO config (key, value) VALUES ('measurement_goals', ?)",
            (json.dumps(clean),)
        )
        conn.commit()
        return {'ok': True, 'goals': clean}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_body_measurement(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM body_measurements WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== CLIENT SITES =====================

@eel.expose
def get_client_sites(only_active=False):
    conn = get_connection()
    try:
        sql = """
            SELECT cs.*, c.business_name, c.ruc, c.contact_name, c.phone
            FROM client_sites cs
            LEFT JOIN clients c ON cs.client_id = c.id
        """
        params = []
        if only_active:
            sql += " WHERE cs.is_active=1 OR cs.is_active IS NULL"
        sql += " ORDER BY c.business_name ASC, cs.nombre_cliente ASC"
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def get_client_sites_grouped():
    """Retorna client_sites agrupados por empresa padre."""
    conn = get_connection()
    try:
        sites = conn.execute("""
            SELECT cs.*, c.business_name as empresa, c.ruc, c.contact_name, c.phone, c.id as parent_client_id
            FROM client_sites cs
            LEFT JOIN clients c ON cs.client_id = c.id
            WHERE cs.is_active=1 OR cs.is_active IS NULL
            ORDER BY COALESCE(c.business_name, cs.nombre_cliente) ASC, cs.nombre_cliente ASC
        """).fetchall()
        return [dict(r) for r in sites]
    finally:
        conn.close()

@eel.expose
def get_client_site(id):
    conn = get_connection()
    try:
        row = conn.execute("""
            SELECT cs.*, c.business_name, c.ruc, c.contact_name, c.phone
            FROM client_sites cs
            LEFT JOIN clients c ON cs.client_id = c.id
            WHERE cs.id = ?
        """, (id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

@eel.expose
def create_client_site(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO client_sites (client_id, codigo_cliente, codigo_sede, codigo_cliente_sede,
                nombre_cliente, sede_cliente, distrito, is_regular, monthly_fee, servicios,
                contract_start, contract_end, location_code, periodicity, centro_logistico)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (data.get('client_id'), data.get('codigo_cliente'), data.get('codigo_sede'), data.get('codigo_cliente_sede'),
              data.get('nombre_cliente'), data.get('sede_cliente'), data.get('distrito'),
              1 if data.get('is_regular') else 0, data.get('monthly_fee'), data.get('servicios'),
              data.get('contract_start'), data.get('contract_end'), data.get('location_code'),
              data.get('periodicity', 'mensual'), data.get('centro_logistico')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_client_site(id, data):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM client_sites WHERE id = ?", (id,))
        row = cur.fetchone()
        if not row:
            return {'ok': False, 'error': f'Sede {id} no encontrada'}
        curr = dict(row)

        client_id = data['client_id'] if 'client_id' in data else curr.get('client_id')
        codigo_cliente = data['codigo_cliente'] if 'codigo_cliente' in data else curr.get('codigo_cliente')
        codigo_sede = data['codigo_sede'] if 'codigo_sede' in data else curr.get('codigo_sede')
        codigo_cliente_sede = data['codigo_cliente_sede'] if 'codigo_cliente_sede' in data else curr.get('codigo_cliente_sede')
        nombre_cliente = data['nombre_cliente'] if 'nombre_cliente' in data else curr.get('nombre_cliente')
        sede_cliente = data['sede_cliente'] if 'sede_cliente' in data else curr.get('sede_cliente')
        distrito = data['distrito'] if 'distrito' in data else curr.get('distrito')
        is_regular = (1 if data['is_regular'] else 0) if 'is_regular' in data else curr.get('is_regular')
        monthly_fee = float(data['monthly_fee']) if 'monthly_fee' in data and data['monthly_fee'] is not None else curr.get('monthly_fee')
        servicios = data['servicios'] if 'servicios' in data else curr.get('servicios')
        contract_start = data['contract_start'] if 'contract_start' in data else curr.get('contract_start')
        contract_end = data['contract_end'] if 'contract_end' in data else curr.get('contract_end')
        location_code = data['location_code'] if 'location_code' in data else curr.get('location_code')
        periodicity = data['periodicity'] if 'periodicity' in data else (curr.get('periodicity') or 'mensual')
        centro_logistico = data['centro_logistico'] if 'centro_logistico' in data else curr.get('centro_logistico')

        cur.execute("""
            UPDATE client_sites SET
                client_id=?, codigo_cliente=?, codigo_sede=?, codigo_cliente_sede=?,
                nombre_cliente=?, sede_cliente=?, distrito=?, is_regular=?, monthly_fee=?,
                servicios=?, contract_start=?, contract_end=?, location_code=?,
                periodicity=?, centro_logistico=?
            WHERE id=?
        """, (client_id, codigo_cliente, codigo_sede, codigo_cliente_sede,
              nombre_cliente, sede_cliente, distrito, is_regular, monthly_fee,
              servicios, contract_start, contract_end, location_code,
              periodicity, centro_logistico, id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_client_site(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM client_sites WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_monthly_billing(year=None):
    """Retorna matriz de facturación mensual por cliente regular con datos completos del año solicitado."""
    conn = get_connection()
    try:
        if year is not None:
            try:
                year = int(year)
            except Exception:
                year = 2026
        else:
            year = 2026

        # Get all regular and periodic client sites (including sites with POs for this year)
        sites = conn.execute("""
            SELECT cs.id, cs.client_id, cs.nombre_cliente, cs.sede_cliente, cs.monthly_fee, cs.servicios,
                   cs.location_code, cs.codigo_cliente_sede, cs.periodicity, cs.is_regular,
                   c.business_name as empresa, c.ruc
            FROM client_sites cs
            LEFT JOIN clients c ON cs.client_id = c.id
            WHERE (cs.is_active=1 OR cs.is_active IS NULL)
              AND (cs.is_regular=1 OR cs.periodicity IN ('mensual', 'bimensual', 'trimestral', 'eventual')
                   OR cs.id IN (SELECT DISTINCT client_site_id FROM purchase_orders WHERE year=?))
            ORDER BY COALESCE(c.business_name, cs.nombre_cliente) ASC, cs.nombre_cliente ASC
        """, (year,)).fetchall()

        # Distinct clients for company-level grouping
        clients = conn.execute("""
            SELECT DISTINCT c.id, c.business_name, c.ruc
            FROM clients c
            WHERE c.id IN (
                SELECT client_id FROM client_sites WHERE (is_active=1 OR is_active IS NULL)
                UNION
                SELECT client_id FROM purchase_orders WHERE year=?
                UNION
                SELECT client_id FROM invoices WHERE year_billed=?
            )
            ORDER BY c.business_name ASC
        """, (year, year)).fetchall()

        # Invoices for this year (vigentes)
        invoices = conn.execute("""
            SELECT i.*, cs.nombre_cliente as site_name, cs.location_code as site_location, c.business_name as empresa, c.ruc
            FROM invoices i
            LEFT JOIN client_sites cs ON i.client_site_id = cs.id
            JOIN clients c ON i.client_id = c.id
            WHERE i.year_billed = ? AND (i.status != 'annulled' OR i.status IS NULL)
            ORDER BY i.month_billed ASC, i.id ASC
        """, (year,)).fetchall()

        # Annulled invoices for reporting / auditing
        annulled_invoices = conn.execute("""
            SELECT i.*, c.business_name as empresa, c.ruc
            FROM invoices i
            JOIN clients c ON i.client_id = c.id
            WHERE i.year_billed = ? AND i.status = 'annulled'
            ORDER BY i.month_billed ASC, i.id ASC
        """, (year,)).fetchall()

        # Purchase orders for this year
        orders = conn.execute("""
            SELECT po.*, cs.nombre_cliente as site_name, cs.location_code as site_location, c.business_name as empresa, c.ruc
            FROM purchase_orders po
            JOIN clients c ON po.client_id = c.id
            LEFT JOIN client_sites cs ON po.client_site_id = cs.id
            WHERE po.year = ?
            ORDER BY po.month ASC, po.issue_date DESC, po.id ASC
        """, (year,)).fetchall()

        return {
            'year': year,
            'clients': [dict(r) for r in clients],
            'sites': [dict(r) for r in sites],
            'invoices': [dict(r) for r in invoices],
            'annulled_invoices': [dict(r) for r in annulled_invoices],
            'orders': [dict(r) for r in orders],
        }
    finally:
        conn.close()

# ===================== PURCHASE ORDERS (ORDENES DE COMPRA) =====================

@eel.expose
def get_purchase_orders(year=None, month=None, client_id=None, periodicity=None, status=None, search=None):
    """Obtiene órdenes de compra registradas con filtros avanzados."""
    conn = get_connection()
    try:
        query = """
            SELECT po.*, c.business_name as empresa, c.ruc,
                   cs.nombre_cliente as site_name, cs.location_code, cs.monthly_fee
            FROM purchase_orders po
            JOIN clients c ON po.client_id = c.id
            LEFT JOIN client_sites cs ON po.client_site_id = cs.id
            WHERE 1=1
        """
        params = []
        if year is not None and str(year).strip():
            query += " AND po.year = ?"
            params.append(int(year))
        if month is not None and str(month).strip():
            query += " AND po.month = ?"
            params.append(int(month))
        if client_id is not None and str(client_id).strip():
            query += " AND po.client_id = ?"
            params.append(int(client_id))
        if periodicity is not None and str(periodicity).strip() and periodicity != 'all':
            query += " AND po.periodicity = ?"
            params.append(str(periodicity).strip())
        if status is not None and str(status).strip() and status != 'all':
            query += " AND po.status = ?"
            params.append(str(status).strip())
        if search is not None and str(search).strip():
            term = f"%{str(search).strip()}%"
            query += """ AND (
                po.oc_number LIKE ? OR
                c.business_name LIKE ? OR
                cs.nombre_cliente LIKE ? OR
                po.centro_logistico LIKE ? OR
                po.notes LIKE ?
            )"""
            params.extend([term, term, term, term, term])

        query += " ORDER BY po.year DESC, po.month DESC, po.issue_date DESC, po.id DESC"
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def save_purchase_order(data):
    """Crea o actualiza una orden de compra mensual."""
    import json
    conn = get_connection()
    try:
        po_id = data.get('id')
        client_id = data.get('client_id')
        client_site_id = data.get('client_site_id') or None
        year = int(data.get('year', 2026))
        month = int(data.get('month', 1))
        oc_number = str(data.get('oc_number', '')).strip()
        amount = float(data.get('amount') or 0)
        status = data.get('status', 'pending')
        notes = str(data.get('notes', '')).strip()
        periodicity = str(data.get('periodicity') or 'mensual').strip()
        issue_date = str(data.get('issue_date') or '').strip()
        centro_logistico = str(data.get('centro_logistico') or '').strip()
        id_centro_logistico = str(data.get('id_centro_logistico') or '').strip()
        sociedad_code = str(data.get('sociedad_code') or '').strip()
        sociedad_name = str(data.get('sociedad_name') or '').strip()
        items_json = data.get('items_json')
        if isinstance(items_json, (list, dict)):
            items_json = json.dumps(items_json)

        if not client_id:
            return {'ok': False, 'error': 'El cliente es obligatorio'}
        if not oc_number:
            return {'ok': False, 'error': 'El número de OC es obligatorio'}

        if po_id:
            conn.execute("""
                UPDATE purchase_orders
                SET client_id=?, client_site_id=?, year=?, month=?, oc_number=?, amount=?, status=?, notes=?,
                    periodicity=?, issue_date=?, centro_logistico=?, id_centro_logistico=?, sociedad_code=?, sociedad_name=?, items_json=?
                WHERE id=?
            """, (client_id, client_site_id, year, month, oc_number, amount, status, notes,
                  periodicity, issue_date, centro_logistico, id_centro_logistico, sociedad_code, sociedad_name, items_json, po_id))
        else:
            conn.execute("""
                INSERT INTO purchase_orders (
                    client_id, client_site_id, year, month, oc_number, amount, status, notes,
                    periodicity, issue_date, centro_logistico, id_centro_logistico, sociedad_code, sociedad_name, items_json
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (client_id, client_site_id, year, month, oc_number, amount, status, notes,
                  periodicity, issue_date, centro_logistico, id_centro_logistico, sociedad_code, sociedad_name, items_json))

        # Check if an existing invoice exists for this site/month/year to sync OC or update status
        if client_site_id:
            inv = conn.execute("""
                SELECT id FROM invoices
                WHERE client_site_id = ? AND month_billed = ? AND year_billed = ?
            """, (client_site_id, month, year)).fetchone()
            if inv:
                conn.execute("""
                    UPDATE invoices
                    SET purchase_order = ?
                    WHERE id = ? AND (purchase_order IS NULL OR purchase_order = '')
                """, (oc_number, inv['id']))
                conn.execute("""
                    UPDATE purchase_orders
                    SET status = 'invoiced'
                    WHERE client_site_id = ? AND month = ? AND year = ? AND oc_number = ?
                """, (client_site_id, month, year, oc_number))

        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_purchase_order(id):
    """Elimina una orden de compra."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM purchase_orders WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== SERVICE RECORDS =====================



def _calc_hours(hi, hs, traslado):
    """Calcula horas_trabajadas from time strings and traslado_min."""
    if not hi or not hs:
        return 0
    try:
        h1, m1 = hi.split(':')
        h2, m2 = hs.split(':')
        min_in = int(h1) * 60 + int(m1)
        min_out = int(h2) * 60 + int(m2)
        if min_out < min_in:
            # Soporta turnos nocturnos que cruzan la medianoche (ej. 22:00 a 02:00)
            min_out += 24 * 60
        raw_min = min_out - min_in
        # Se descuenta 1h de almuerzo (no se registra aparte) cuando la jornada supera las 5 horas
        lunch_deduction = 60 if raw_min > 300 else 0
        total_min = max(raw_min - lunch_deduction, 0)
        t = min(traslado or 0, 60)
        return round(total_min / 60 + t / 60, 2)
    except:
        return 0

def _sync_daily_control(conn, fecha, employee_id):
    """Actualiza daily_control con la suma de horas de servicio para esa fecha."""
    total = conn.execute("""
        SELECT COALESCE(SUM(horas_trabajadas),0) as t
        FROM service_records
        WHERE fecha=? AND employee_id=? AND status='completed'
    """, (fecha, employee_id)).fetchone()['t']

    emp = conn.execute("SELECT full_name, sede_operativa, responsable FROM employees WHERE id=?", (employee_id,)).fetchone()
    existing = conn.execute(
        "SELECT id FROM daily_control WHERE fecha_revision=? AND employee_id=?",
        (fecha, employee_id)
    ).fetchone()

    if existing:
        conn.execute("""
            UPDATE daily_control SET horas_dia=?, se_presento=1, sede_operativa=?, responsable=?
            WHERE id=?
        """, (total, emp['sede_operativa'] if emp else None, emp['responsable'] if emp else None, existing['id']))
    else:
        conn.execute("""
            INSERT INTO daily_control (fecha_revision, employee_id, sede_operativa, responsable, se_presento, horas_dia)
            VALUES (?, ?, ?, ?, 1, ?)
        """, (fecha, employee_id, emp['sede_operativa'] if emp else None, emp['responsable'] if emp else None, total))

@eel.expose
def get_service_records(fecha=None, employee_id=None, status=None):
    conn = get_connection()
    try:
        sql = """
            SELECT sr.*, e.full_name as employee_name,
                   cs.nombre_cliente, cs.sede_cliente, cs.codigo_cliente_sede, cs.codigo_cliente, cs.codigo_sede,
                   c.business_name, c.ruc
            FROM service_records sr
            JOIN employees e ON sr.employee_id=e.id
            LEFT JOIN client_sites cs ON sr.client_site_id = cs.id
            LEFT JOIN clients c ON cs.client_id = c.id
        """
        params = []
        conditions = []
        if fecha:
            conditions.append("sr.fecha=?")
            params.append(fecha)
        if employee_id:
            conditions.append("sr.employee_id=?")
            params.append(employee_id)
        if status:
            conditions.append("sr.status=?")
            params.append(status)
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        sql += " ORDER BY sr.fecha DESC, sr.hora_ingreso ASC LIMIT 500"
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_service_record(data):
    conn = get_connection()
    try:
        iso = date.fromisoformat(data['fecha']).isocalendar()
        w = data.get('semana') or iso[1]
        y = data.get('año') or iso[0]
        cur = conn.execute("""
            INSERT INTO service_records (fecha, employee_id, client_site_id, hora_ingreso,
                traslado_min, status, semana, año)
            VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
        """, (data['fecha'], data['employee_id'], data.get('client_site_id'),
              data.get('hora_ingreso'), data.get('traslado_min', 0), int(w), int(y)))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def complete_service_record(id, data):
    """Completa un registro: marca salida, evidencia, horas, y actualiza daily_control."""
    conn = get_connection()
    try:
        rec = conn.execute("SELECT * FROM service_records WHERE id=?", (id,)).fetchone()
        if not rec:
            return {'ok': False, 'error': 'Registro no encontrado'}

        hs = data.get('hora_salida')
        hi = data.get('hora_ingreso') or rec['hora_ingreso']
        traslado = data.get('traslado_min', rec['traslado_min'] or 0)
        hrs = _calc_hours(hi, hs, traslado)

        conn.execute("""
            UPDATE service_records SET client_site_id=?, hora_ingreso=?, hora_salida=?,
                evidencia=?, observaciones=?, horas_trabajadas=?, traslado_min=?, status='completed'
            WHERE id=?
        """, (data.get('client_site_id', rec['client_site_id']), hi, hs,
              1 if data.get('evidencia') else 0, data.get('observaciones'),
              hrs, traslado, id))
        conn.commit()

        # Auto-sync daily control
        _sync_daily_control(conn, rec['fecha'], rec['employee_id'])
        conn.commit()

        return {'ok': True, 'horas_trabajadas': hrs}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def clock_in(data):
    """Registro rápido de entrada (clock-in)."""
    conn = get_connection()
    try:
        iso = date.fromisoformat(data['fecha']).isocalendar()
        w = iso[1]
        y = iso[0]
        cur = conn.execute("""
            INSERT INTO service_records (fecha, employee_id, client_site_id, hora_ingreso, status, semana, año)
            VALUES (?, ?, ?, ?, 'active', ?, ?)
        """, (data['fecha'], data['employee_id'], data.get('client_site_id'),
              data.get('hora_ingreso'), int(w), int(y)))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_service_record(id):
    conn = get_connection()
    try:
        rec = conn.execute("SELECT * FROM service_records WHERE id=?", (id,)).fetchone()
        conn.execute("DELETE FROM service_records WHERE id=?", (id,))
        conn.commit()
        if rec:
            _sync_daily_control(conn, rec['fecha'], rec['employee_id'])
            conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== DAILY CONTROL =====================

@eel.expose
def get_daily_control(fecha=None):
    conn = get_connection()
    try:
        if fecha:
            active_emps = conn.execute("SELECT id FROM employees WHERE is_active=1").fetchall()
            for emp in active_emps:
                _sync_daily_control(conn, fecha, emp['id'])
            conn.commit()
        sql = """
            SELECT dc.*, e.full_name as employee_name
            FROM daily_control dc JOIN employees e ON dc.employee_id=e.id
        """
        params = []
        if fecha:
            sql += " WHERE dc.fecha_revision=?"
            params.append(fecha)
        sql += " ORDER BY dc.fecha_revision DESC, e.full_name ASC LIMIT 100"
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def update_daily_control(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE daily_control SET fecha_revision=?, sede_operativa=?, responsable=?,
                se_presento=?, horas_dia=?, evidencia_dia=?, pendientes_sin_salida=?, observaciones=?
            WHERE id=?
        """, (data.get('fecha_revision'), data.get('sede_operativa'), data.get('responsable'),
              1 if data.get('se_presento') else 0, data.get('horas_dia', 0),
              1 if data.get('evidencia_dia') else 0, 1 if data.get('pendientes_sin_salida') else 0,
              data.get('observaciones'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def sync_daily_control(fecha, employee_id):
    """Recalcula y actualiza daily_control desde service_records para un empleado/fecha."""
    conn = get_connection()
    try:
        _sync_daily_control(conn, fecha, employee_id)
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== WEEKLY KPI =====================

@eel.expose
def get_weekly_kpi(semana, año):
    conn = get_connection()
    try:
        config = {}
        for row in conn.execute("SELECT key, value FROM config WHERE key LIKE 'tt_%'").fetchall():
            v = row['value']
            try:
                config[row['key']] = float(v)
            except:
                config[row['key']] = 0

        meta = config.get('tt_meta_semanal', 48)
        ph = config.get('tt_peso_horas', 0.7)
        pe = config.get('tt_peso_evidencia', 0.3)

        rows = conn.execute("""
            SELECT e.id, e.full_name, e.sede_operativa,
                   COALESCE(SUM(sr.horas_trabajadas),0) as total_horas,
                   COUNT(CASE WHEN sr.evidencia=1 THEN 1 END) as con_evidencia,
                   COUNT(sr.id) as total_servicios
            FROM employees e
            LEFT JOIN service_records sr ON sr.employee_id=e.id AND sr.semana=? AND sr.año=? AND sr.status='completed'
            WHERE e.is_active=1
            GROUP BY e.id
            ORDER BY total_horas DESC
        """, (semana, año)).fetchall()

        result = []
        for r in rows:
            total_h = r['total_horas'] or 0
            servicios = r['total_servicios'] or 0
            evidencia_pct = (r['con_evidencia'] / servicios * 100) if servicios > 0 else 0
            horas_norm = min(total_h / meta, 1.0) if meta > 0 else 0
            score = (horas_norm * ph) + (evidencia_pct / 100 * pe)
            result.append({
                'employee_id': r['id'],
                'employee_name': r['full_name'],
                'sede_operativa': r['sede_operativa'],
                'total_horas': round(total_h, 2),
                'servicios': servicios,
                'con_evidencia': r['con_evidencia'],
                'evidencia_pct': round(evidencia_pct, 1),
                'score': round(score * 100, 1),
            })

        result.sort(key=lambda x: x['score'], reverse=True)
        for i, r in enumerate(result):
            r['ranking'] = i + 1

        return result
    finally:
        conn.close()

@eel.expose
def get_week_semana(fecha_str):
    from datetime import date
    d = date.fromisoformat(fecha_str)
    semana = d.isocalendar()[1]
    return {'semana': semana, 'año': d.year}

# ===================== ESTRADIOL PROJECTION =====================

import math
from datetime import date, timedelta

@eel.expose
def get_estradiol_projection():
    """
    Simple PK model: one-compartment with first-order absorption.
    Returns estimated estradiol levels (pg/mL) for all available data + 30 days future.
    """
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT date, dose_mg FROM injections ORDER BY date ASC
        """).fetchall()
        doses = [dict(r) for r in rows]
    finally:
        conn.close()

    if not doses:
        return {'days': [], 'levels': [], 'next_dose_days': None, 'days_since_last': None}

    last_dose_date = date.fromisoformat(doses[-1]['date'])
    days_since_last = (local_date() - last_dose_date).days

    # PK parameters for estradiol enantate SC
    ka = 0.35     # absorption rate (1/day) — slightly slower SC
    kel = 0.099   # elimination rate (1/day) — half-life ~7 days
    Vd_F = 15.0
    scaling = 1000.0 / Vd_F

    # Generate from 180 days before first dose to 30 days after last
    first_dose_date = date.fromisoformat(doses[0]['date'])
    today_dt = local_date()
    start = min(first_dose_date, today_dt - timedelta(days=180))
    end = max(today_dt + timedelta(days=60), last_dose_date + timedelta(days=30))
    days_list = []
    levels = []

    d = start
    while d <= end:
        days_list.append(d.isoformat())
        total = 0.0
        for dose in doses:
            dose_date = date.fromisoformat(dose['date'])
            t = (d - dose_date).days
            if t < 0:
                continue
            if t > 90:
                continue
            amount_mg = dose['dose_mg']
            try:
                conc = (amount_mg * scaling * ka) / (ka - kel) * (math.exp(-kel * t) - math.exp(-ka * t))
            except (OverflowError, ValueError):
                conc = 0.0
            if conc < 0:
                conc = 0.0
            total += conc
        levels.append(round(total, 1))
        d += timedelta(days=1)

    next_due = last_dose_date + timedelta(days=7)
    next_dose_days = (next_due - today_dt).days

    return {
        'days': days_list,
        'levels': levels,
        'last_dose_date': doses[-1]['date'],
        'days_since_last': days_since_last,
        'next_dose_date': next_due.isoformat(),
        'next_dose_days': next_dose_days,
        'first_dose_date': doses[0]['date'],
    }

# ===================== SERVICE DESCRIPTIONS =====================

@eel.expose
def get_service_descriptions(service_type_id=None):
    conn = get_connection()
    try:
        if service_type_id:
            rows = conn.execute("""
                SELECT sd.*, st.name as service_name
                FROM service_descriptions sd
                JOIN service_types st ON sd.service_type_id = st.id
                WHERE sd.service_type_id=?
                ORDER BY sd.name ASC
            """, (service_type_id,)).fetchall()
        else:
            rows = conn.execute("""
                SELECT sd.*, st.name as service_name
                FROM service_descriptions sd
                JOIN service_types st ON sd.service_type_id = st.id
                ORDER BY st.name ASC, sd.name ASC
            """).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def create_service_description(data):
    conn = get_connection()
    try:
        cur = conn.execute("""
            INSERT INTO service_descriptions (service_type_id, name, description_text, productos, equipos)
            VALUES (?, ?, ?, ?, ?)
        """, (data['service_type_id'], data['name'], data['description_text'],
              data.get('productos'), data.get('equipos')))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_service_description(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE service_descriptions SET service_type_id=?, name=?, description_text=?, productos=?, equipos=?
            WHERE id=?
        """, (data['service_type_id'], data['name'], data['description_text'],
              data.get('productos'), data.get('equipos'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_service_description(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM service_descriptions WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== QUOTES =====================

def _next_quote_number():
    """Generate next quote number: COT YYMMDD.SEQ (SEQ per month)"""
    from datetime import date
    today = date.today()
    prefix = today.strftime("COT %Y%m%d.")
    month_prefix = today.strftime("COT %Y%m")
    conn = get_connection()
    try:
        last = conn.execute("""
            SELECT number FROM quotes WHERE number LIKE ? || '%'
            ORDER BY id DESC LIMIT 1
        """, (month_prefix,)).fetchone()
        if last:
            parts = last['number'].split('.')
            seq = int(parts[-1]) + 1
        else:
            seq = 1
        return prefix + str(seq)
    finally:
        conn.close()

@eel.expose
def get_quotes(status=None):
    conn = get_connection()
    try:
        sql = """
            SELECT q.*, c.business_name, c.ruc as client_ruc,
                   cs.nombre_cliente as site_name, cs.sede_cliente
            FROM quotes q
            JOIN clients c ON q.client_id = c.id
            LEFT JOIN client_sites cs ON q.client_site_id = cs.id
        """
        params = []
        if status:
            sql += " WHERE q.status=?"
            params.append(status)
        sql += " ORDER BY q.created_at DESC LIMIT 100"
        rows = conn.execute(sql, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()

@eel.expose
def get_quote(id):
    conn = get_connection()
    try:
        quote = conn.execute("""
            SELECT q.*, c.business_name, c.ruc as client_ruc, c.contact_name, c.phone, c.email, c.address,
                   cs.nombre_cliente as site_name, cs.sede_cliente, cs.distrito
            FROM quotes q
            JOIN clients c ON q.client_id = c.id
            LEFT JOIN client_sites cs ON q.client_site_id = cs.id
            WHERE q.id=?
        """, (id,)).fetchone()
        if not quote:
            return None
        items = conn.execute("""
            SELECT qi.*, st.name as service_name
            FROM quote_items qi
            LEFT JOIN service_types st ON qi.service_type_id = st.id
            WHERE qi.quote_id=?
            ORDER BY qi.sort_order ASC
        """, (id,)).fetchall()
        result = dict(quote)
        result['items'] = [dict(r) for r in items]
        return result
    finally:
        conn.close()

@eel.expose
def create_quote(data):
    conn = get_connection()
    try:
        number = _next_quote_number()
        cur = conn.execute("""
            INSERT INTO quotes (number, client_id, client_site_id, issue_date, valid_until, payment_terms, subtotal, igv, total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (number, data['client_id'], data.get('client_site_id'),
              data.get('issue_date'), data.get('valid_until'), data.get('payment_terms'),
              data.get('subtotal', 0), data.get('igv', 0), data.get('total', 0),
              data.get('status', 'borrador')))
        conn.commit()
        return {'ok': True, 'id': cur.lastrowid, 'number': number}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_quote(id, data):
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE quotes SET client_id=?, client_site_id=?, issue_date=?, valid_until=?,
                payment_terms=?, subtotal=?, igv=?, total=?, status=?
            WHERE id=?
        """, (data['client_id'], data.get('client_site_id'), data.get('issue_date'),
              data.get('valid_until'), data.get('payment_terms'), data.get('subtotal', 0),
              data.get('igv', 0), data.get('total', 0), data.get('status', 'borrador'), id))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_quote(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM quote_items WHERE quote_id=?", (id,))
        conn.execute("DELETE FROM quotes WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== QUOTE ITEMS =====================

@eel.expose
def add_quote_item(quote_id, data):
    conn = get_connection()
    try:
        total = (data.get('quantity', 1) or 1) * (data.get('unit_price', 0) or 0)
        max_sort = conn.execute("SELECT COALESCE(MAX(sort_order),0)+1 as n FROM quote_items WHERE quote_id=?", (quote_id,)).fetchone()['n']
        cur = conn.execute("""
            INSERT INTO quote_items (quote_id, service_type_id, description_id, description_text, productos_text, equipos_text, quantity, unit_price, total, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (quote_id, data.get('service_type_id'), data.get('description_id'),
              data.get('description_text'), data.get('productos_text'), data.get('equipos_text'),
              data.get('quantity', 1), data.get('unit_price', 0), total, max_sort))
        new_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': new_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_quote_item(id, data):
    conn = get_connection()
    try:
        total = (data.get('quantity', 1) or 1) * (data.get('unit_price', 0) or 0)
        conn.execute("""
            UPDATE quote_items SET service_type_id=?, description_id=?, description_text=?,
                productos_text=?, equipos_text=?, quantity=?, unit_price=?, total=?
            WHERE id=?
        """, (data.get('service_type_id'), data.get('description_id'), data.get('description_text'),
              data.get('productos_text'), data.get('equipos_text'), data.get('quantity', 1),
              data.get('unit_price', 0), total, id))
        conn.commit()
        return {'ok': True, 'total': total}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_quote_item(id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM quote_items WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def recalc_quote_totals(quote_id):
    """Recalcula subtotal, IGV, total de una cotización desde sus items."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT COALESCE(SUM(total),0) as s FROM quote_items WHERE quote_id=?", (quote_id,)).fetchone()
        subtotal = round(row['s'], 2)
        igv = round(subtotal * 0.18, 2)
        total = round(subtotal + igv, 2)
        conn.execute("UPDATE quotes SET subtotal=?, igv=?, total=? WHERE id=?", (subtotal, igv, total, quote_id))
        conn.commit()
        return {'ok': True, 'subtotal': subtotal, 'igv': igv, 'total': total}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== WORD GENERATION =====================

@eel.expose
def generate_quote_word(quote_id):
    from docx import Document
    from docx.shared import Pt
    import os, base64, io, copy, re

    conn = get_connection()
    try:
        quote = conn.execute("""
            SELECT q.*, c.business_name, c.ruc as client_ruc, c.contact_name, c.phone, c.email, c.address,
                   cs.nombre_cliente as site_name, cs.sede_cliente, cs.distrito
            FROM quotes q
            JOIN clients c ON q.client_id = c.id
            LEFT JOIN client_sites cs ON q.client_site_id = cs.id
            WHERE q.id=?
        """, (quote_id,)).fetchone()
        if not quote:
            return {'ok': False, 'error': 'Cotizacion no encontrada'}
        items = conn.execute("""
            SELECT qi.*, st.name as service_name
            FROM quote_items qi
            LEFT JOIN service_types st ON qi.service_type_id = st.id
            WHERE qi.quote_id=?
            ORDER BY qi.sort_order ASC
        """, (quote_id,)).fetchall()

        template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates', 'cotizacion_base.docx')
        if not os.path.exists(template_path):
            return {'ok': False, 'error': 'Plantilla no encontrada'}

        doc = Document(template_path)
        ns = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'

        # --- Helper: collapse repeated {{MARKER}} sequences in a string ---
        def collapse_marker_repeats(text):
            return re.sub(r'(\{\{[^}]+\}\})\1+', r'\1', text)

        # --- Helper: apply replacements to a single paragraph ---
        def replace_in_para(p, reps):
            full = p.text
            needed = False
            for old in reps:
                if old in full:
                    needed = True
                    break
            if not needed:
                return
            # Collapse repeated markers at paragraph level first
            full = collapse_marker_repeats(full)
            # Apply all replacements (replace ALL occurrences since we collapsed)
            new_full = full
            for old, new in reps.items():
                new_full = new_full.replace(old, new)
            if new_full == full:
                return
            # Rebuild: clear runs, add single run with replaced text
            xml = p._element
            for r in xml.findall(f'{ns}r'):
                xml.remove(r)
            new_r = copy.deepcopy(xml.makeelement(f'{ns}r', {}))
            rPr = new_r.makeelement(f'{ns}rPr', {})
            sz = new_r.makeelement(f'{ns}sz', {f'{ns}val': '20'})
            rPr.append(sz)
            new_r.append(rPr)
            t = new_r.makeelement(f'{ns}t', {})
            t.text = new_full
            new_r.append(t)
            xml.append(new_r)

        # --- Helper: apply replacements to every paragraph in the doc ---
        def apply_replacements(reps):
            for p in doc.paragraphs:
                replace_in_para(p, reps)
            for t in doc.tables:
                for row in t.rows:
                    for cell in row.cells:
                        for p in cell.paragraphs:
                            replace_in_para(p, reps)

        # --- Step 1: Collapse all repeated markers in the document ---
        # Work at XML t-element level to handle merged-cell duplicates
        for t_elem in doc.element.findall(f'.//{ns}t'):
            if t_elem.text:
                t_elem.text = collapse_marker_repeats(t_elem.text)
        # Also handle table cells
        for t in doc.tables:
            for row in t.rows:
                for cell in row.cells:
                    for t_elem in cell._element.findall(f'.//{ns}t'):
                        if t_elem.text:
                            t_elem.text = collapse_marker_repeats(t_elem.text)

        # --- Step 2: Main text replacements ---
        cot_num_raw = quote['number'].replace('COT ', '')  # e.g. "20260709.1"
        client_dir = (quote['site_name'] or '') + (' - ' + quote['distrito'] if quote['distrito'] else '')
        if not client_dir:
            client_dir = quote['address'] or quote['business_name'] or ''
        payment = quote['payment_terms'] or 'CREDITO A 30 DIAS'

        replacements = {
            '260624.1': cot_num_raw,          # replaces the full COT number
            '260624': cot_num_raw.split('.')[0],  # fallback for date portion in own run
            '{{CLIENTE}}': quote['business_name'] or '',
            '{{RUC_CLIENTE}}': quote['client_ruc'] or '',
            '{{DIRECCION_CLIENTE}}': client_dir,
            '{{FECHA}}': quote['issue_date'] or '',
            '{{CONDICION_PAGO}}': payment,
            '{{RUC_EMPRESA}}': '20613259217',
            '{{CONTACTO_EMPRESA}}': 'Nicole Rios',
            '{{DIRECCION}}': 'Mz B Lt 26 AA HH Santa Rosa de Lipa - Puente Piedra',
            '{{TELEFONO}}': '923584259 / 936310727',
        }
        apply_replacements(replacements)

        # --- Step 3: Handle MANEJO INTEGRADO (Table 1) ---
        all_desc_parts = []
        for item in items:
            st_name = item['service_name'] or ''
            desc = item['description_text'] or ''
            if st_name and desc:
                all_desc_parts.append(f'{st_name.upper()}: {desc}')
            elif desc:
                all_desc_parts.append(desc)
        merged_desc = '\n\n'.join(all_desc_parts) if all_desc_parts else ''

        if len(doc.tables) > 1 and merged_desc:
            t1 = doc.tables[1]
            if len(t1.rows) > 1:
                cell1 = t1.rows[1].cells[0]
                # Clear and set new text
                xml_cell = cell1._element
                for p_elem in xml_cell.findall(f'{ns}p'):
                    for r_elem in p_elem.findall(f'{ns}r'):
                        p_elem.remove(r_elem)
                    # Add single run with merged description
                    new_r = copy.deepcopy(p_elem.makeelement(f'{ns}r', {}))
                    t = new_r.makeelement(f'{ns}t', {})
                    t.text = merged_desc
                    new_r.append(t)
                    p_elem.append(new_r)

        # --- Step 4: Update PRODUCTOS table (Table 2) ---
        if len(doc.tables) > 2:
            t2 = doc.tables[2]
            while len(t2.rows) > 3:
                t2._tbl.remove(t2.rows[3]._tr)
            seen_types = set()
            for item in items:
                st_name = item['service_name'] or 'SERVICIO'
                if st_name not in seen_types:
                    seen_types.add(st_name)
                    if len(t2.rows) >= 3:
                        new_tr = copy.deepcopy(t2.rows[2]._tr)
                        cell_elems = new_tr.findall(f'{ns}tc')
                        if len(cell_elems) >= 4:
                            for ci, val in enumerate([st_name.upper(), '', '', '']):
                                # Clear ALL t elements in cell
                                all_t = cell_elems[ci].findall(f'.//{ns}t')
                                for t_e in all_t:
                                    t_e.text = ''
                                if all_t:
                                    all_t[0].text = val
                        t2._tbl.append(new_tr)

        # --- Step 5: Update Plazo de Ejecucion (Table 4) ---
        # Estimated times per service type
        time_estimates = {
            'Desinsectación': '4 A 6 HORAS EN LAS INSTALACIONES',
            'Desinfección': '2 A 4 HORAS EN LAS INSTALACIONES',
            'Desratización': '2 A 4 HORAS EN LAS INSTALACIONES',
            'Control Aviar': '3 A 5 HORAS EN LAS INSTALACIONES',
            'Mantenimiento de Trampas de Luz': '1 A 2 HORAS EN LAS INSTALACIONES',
            'Limpieza de Tanques': '4 A 6 HORAS EN LAS INSTALACIONES',
        }
        if len(doc.tables) > 4:
            t4 = doc.tables[4]
            for i, item in enumerate(items[:2]):
                if len(t4.rows) > i + 1:
                    for ci in [0, 1]:
                        cell = t4.rows[i + 1].cells[ci] if ci < len(t4.rows[i + 1].cells) else None
                        if cell:
                            st_name = item['service_name'] or ''
                            time_text = time_estimates.get(st_name, '4 A 6 HORAS EN LAS INSTALACIONES') if ci == 1 else st_name.upper()
                            xml_cell = cell._element
                            for p_elem in xml_cell.findall(f'{ns}p'):
                                for r_elem in p_elem.findall(f'{ns}r'):
                                    p_elem.remove(r_elem)
                                new_r = copy.deepcopy(p_elem.makeelement(f'{ns}r', {}))
                                t = new_r.makeelement(f'{ns}t', {})
                                t.text = time_text
                                new_r.append(t)
                                p_elem.append(new_r)
            if len(items) == 1 and len(t4.rows) > 2:
                for ci in range(len(t4.rows[2].cells)):
                    cell = t4.rows[2].cells[ci]
                    for p in cell.paragraphs:
                        for r in p.runs:
                            r.text = ''

        # --- Step 6: Update Personal Asignado (Table 5) ---
        if len(doc.tables) > 5:
            t5 = doc.tables[5]
            if len(t5.rows) > 1:
                cell = t5.rows[1].cells[0]
                num_techs = '1 a 2' if len(items) > 1 else '1'
                personal_text = f"TECNICOS OPERARIOS\n{num_techs} Técnico(s) Operario(s) especializado(s) en manejo integrado de plagas."
                xml_cell = cell._element
                for p_elem in xml_cell.findall(f'{ns}p'):
                    for r_elem in p_elem.findall(f'{ns}r'):
                        p_elem.remove(r_elem)
                    new_r = copy.deepcopy(p_elem.makeelement(f'{ns}r', {}))
                    t = new_r.makeelement(f'{ns}t', {})
                    t.text = personal_text
                    new_r.append(t)
                    p_elem.append(new_r)

        # --- Step 7: Handle pricing table (Table 7) ---
        t7 = doc.tables[7]
        tbl_element = t7._tbl

        all_rows = list(tbl_element.findall(f'{ns}tr'))

        # Save totals rows (3,4,5) and remove them
        total_row_elements = []
        for idx in [5, 4, 3]:
            if idx < len(all_rows):
                total_row_elements.insert(0, all_rows[idx])
                tbl_element.remove(all_rows[idx])

        # Save first service row (row 1) as template, remove old service rows
        remaining = list(tbl_element.findall(f'{ns}tr'))
        service_template = None
        if len(remaining) > 1:
            service_template = copy.deepcopy(remaining[1])

        for idx in [1, 2]:
            if idx < len(remaining):
                tr = remaining[idx]
                if tr in list(tbl_element):
                    tbl_element.remove(tr)

        # Add item rows
        for item in items:
            st_name = item['service_name'] or ''
            desc_text = item['description_text'] or ''
            price = item['unit_price'] or 0
            qty = item['quantity'] or 0
            total_val = item['total'] or 0

            if service_template is not None:
                new_tr = copy.deepcopy(service_template)
            else:
                remaining_now = list(tbl_element.findall(f'{ns}tr'))
                new_tr = copy.deepcopy(remaining_now[0])

            # Clear ALL text in the new row
            for t_elem in new_tr.findall(f'.//{ns}t'):
                t_elem.text = ''

            cell_elems = new_tr.findall(f'{ns}tc')
            if len(cell_elems) >= 4:
                # Cell 0: service name (red, uppercase) + description (black) + "Incluye certificado"
                # Use separate paragraphs for each line (proper Word multiline)
                cell0_xml = cell_elems[0]
                for p_elem in cell0_xml.findall(f'{ns}p'):
                    cell0_xml.remove(p_elem)

                def add_new_para_to_cell(cell_xml, text, color=None, bold=False):
                    new_p = copy.deepcopy(cell_xml.makeelement(f'{ns}p', {}))
                    new_r = copy.deepcopy(new_p.makeelement(f'{ns}r', {}))
                    rPr = new_r.makeelement(f'{ns}rPr', {})
                    if color:
                        attr = {f'{ns}val': color}
                        c = new_r.makeelement(f'{ns}color', attr)
                        rPr.append(c)
                    if bold:
                        b = new_r.makeelement(f'{ns}b', {})
                        rPr.append(b)
                    new_r.append(rPr)
                    t = new_r.makeelement(f'{ns}t', {})
                    t.text = text
                    new_r.append(t)
                    new_p.append(new_r)
                    cell_xml.append(new_p)

                add_new_para_to_cell(cell0_xml, st_name.upper(), color='FF0000', bold=True)
                if desc_text:
                    add_new_para_to_cell(cell0_xml, desc_text)
                add_new_para_to_cell(cell0_xml, 'Incluye certificado de servicio')

                # Cell 1: unit price
                cell1_ts = cell_elems[1].findall(f'.//{ns}t')
                if cell1_ts:
                    cell1_ts[0].text = f"S/ {price:.2f}"

                # Cell 2: quantity
                qty_text = str(int(qty)) if qty == int(qty) else str(qty)
                cell2_ts = cell_elems[2].findall(f'.//{ns}t')
                if cell2_ts:
                    cell2_ts[0].text = qty_text

                # Cell 3: total
                cell3_ts = cell_elems[3].findall(f'.//{ns}t')
                if cell3_ts:
                    cell3_ts[0].text = f"S/ {total_val:.2f}"

            tbl_element.append(new_tr)

        # Add totals rows back
        for tr_elem in total_row_elements:
            tbl_element.append(tr_elem)

        # Update totals text
        subtotal = quote['subtotal'] or 0
        igv = quote['igv'] or 0
        total = quote['total'] or 0

        total_rows_final = list(tbl_element.findall(f'{ns}tr'))
        for tr_elem in total_rows_final[-3:]:
            cells = tr_elem.findall(f'{ns}tc')
            if len(cells) >= 4:
                first_text = ''
                for t_e in cells[0].findall(f'.//{ns}t'):
                    first_text += t_e.text or ''
                if 'SIN IGV' in first_text.upper():
                    val = subtotal
                elif 'IGV' in first_text.upper():
                    val = igv
                else:
                    val = total
                last_cell_ts = cells[3].findall(f'.//{ns}t')
                for t_e in last_cell_ts:
                    t_e.text = ''
                if last_cell_ts:
                    last_cell_ts[0].text = f"S/ {val:,.2f}".replace(',', ' ')

        # Save to memory
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        b64 = base64.b64encode(buf.read()).decode('ascii')

        return {
            'ok': True,
            'file_b64': b64,
            'file_name': f"{quote['number'].replace('/','-').replace(' ', '_')}.docx",
            'file_type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

# ===================== LLaMA INTEGRATION =====================

@eel.expose
def generate_description_ia(service_name, client_name, areas, detalles):
    """Genera descripcion tecnica usando LLaMA via Ollama."""
    import requests, json
    prompt = f"""Eres un ingeniero sanitario especializado en control de plagas. Genera una descripción técnica profesional para una cotización.

Servicio: {service_name}
Cliente: {client_name}
Áreas a tratar: {areas}
Detalles adicionales: {detalles}

La descripción debe incluir metodología paso a paso (Paso 1, Paso 2, Paso 3) como recomendaría un profesional, mencionando productos y equipos según el tipo de servicio. Sé específico y técnico pero claro. Responde solo con la descripción técnica, sin introducciones."""
    try:
        resp = requests.post("http://localhost:11434/api/generate", json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.5, "num_predict": 600}
        }, timeout=30)
        if resp.status_code == 200:
            text = resp.json().get('response', '')
            return {'ok': True, 'text': text}
        return {'ok': False, 'error': f'Ollama error: {resp.status_code}'}
    except Exception as e:
        return {'ok': False, 'error': f'No se pudo conectar con Ollama: {str(e)}'}

# ===================== NEW FEATURES: RUC, CONVERSION & LINDLEY VALIDATION =====================

@eel.expose
def lookup_ruc(ruc):
    """Consulta RUC en API pública (SUNAT padron) para autocompletar razón social y dirección."""
    import requests
    ruc = str(ruc or '').strip()
    if len(ruc) != 11 or not ruc.isdigit():
        return {'ok': False, 'error': 'El RUC debe tener 11 dígitos numéricos'}
    try:
        resp = requests.get(f"https://api.apis.net.pe/v1/ruc?numero={ruc}", timeout=8)
        if resp.status_code == 200:
            d = resp.json()
            address = d.get('direccion', '') or ''
            dist = d.get('distrito', '') or ''
            prov = d.get('provincia', '') or ''
            if dist and dist not in address:
                address = f"{address} - {dist}".strip(' -')
            return {
                'ok': True,
                'business_name': d.get('nombre', ''),
                'address': address,
                'distrito': dist,
                'estado': d.get('estado', ''),
                'condicion': d.get('condicion', '')
            }
        return {'ok': False, 'error': 'No se encontró el RUC en el padrón'}
    except Exception as e:
        return {'ok': False, 'error': f'No se pudo consultar RUC online: {str(e)}'}

@eel.expose
def convert_quote_to_invoice(quote_id):
    """Convierte una cotización en una factura emitida y marca la cotización como aceptada."""
    conn = get_connection()
    try:
        quote = conn.execute("SELECT * FROM quotes WHERE id=?", (quote_id,)).fetchone()
        if not quote:
            return {'ok': False, 'error': 'Cotización no encontrada'}
        items = conn.execute("""
            SELECT qi.*, st.name as service_name
            FROM quote_items qi
            LEFT JOIN service_types st ON qi.service_type_id = st.id
            WHERE qi.quote_id=?
            ORDER BY qi.sort_order ASC
        """, (quote_id,)).fetchall()

        service_names = []
        for it in items:
            sname = it['service_name'] or it['description_text'] or 'Servicio'
            if sname not in service_names:
                service_names.append(sname)
        service_str = ', '.join(service_names) if service_names else f"Según {quote['number']}"

        issue = today()
        pt = (quote['payment_terms'] or '').upper()
        payment_type = 'contado' if 'CONTADO' in pt else 'credito'
        days_credit = 30
        if '15' in pt:
            days_credit = 15
        elif '60' in pt:
            days_credit = 60
        elif payment_type == 'contado':
            days_credit = 0
        due = (date.today() + timedelta(days=days_credit)).isoformat() if days_credit > 0 else issue

        mb = date.today().month
        yb = date.today().year

        cur = conn.execute("""
            INSERT INTO invoices (client_id, client_site_id, series, number, service, payment_type,
                amount, igv, total, issue_date, due_date, status, month_billed, year_billed)
            VALUES (?, ?, 'F001', '', ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?)
        """, (quote['client_id'], quote['client_site_id'], service_str, payment_type,
              quote['subtotal'], quote['igv'], quote['total'], issue, due, mb, yb))

        conn.execute("UPDATE quotes SET status='aceptada' WHERE id=?", (quote_id,))
        conn.commit()
        return {'ok': True, 'invoice_id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_lindley_validation(year=None, month=None):
    """
    Cruza los técnicos activos con sus documentos obligatorios (EMO, MATPEL, Inducción, SCTR)
    y valida si estarán vigentes durante todo el mes consultado (por defecto, el mes siguiente).
    """
    import calendar
    conn = get_connection()
    try:
        now = date.today()
        if not year or not month:
            if now.month == 12:
                year, month = now.year + 1, 1
            else:
                year, month = now.year, now.month + 1
        year, month = int(year), int(month)
        last_day = calendar.monthrange(year, month)[1]
        start_month = date(year, month, 1).isoformat()
        end_month = date(year, month, last_day).isoformat()

        emps = conn.execute("SELECT * FROM employees WHERE is_active=1 ORDER BY full_name ASC").fetchall()
        docs = conn.execute("SELECT * FROM employee_documents ORDER BY expiry_date DESC").fetchall()

        required_types = ['EMO', 'MATPEL', 'Inducción']
        result = []

        for e in emps:
            emp_docs = [d for d in docs if d['employee_id'] == e['id']]
            doc_status = {}
            overall = 'ok'  # 'ok' (verde), 'warning' (vence durante ese mes), 'blocked' (vencido o falta)
            issues = []

            for req in required_types:
                # Match flexible (ej. 'Induccion' o 'Inducción')
                req_norm = req.lower().replace('ó', 'o')
                matches = [d for d in emp_docs if d['doc_type'] and req_norm in d['doc_type'].lower().replace('ó', 'o')]
                if not matches:
                    doc_status[req] = {'status': 'missing', 'expiry_date': None, 'label': 'Sin registro'}
                    overall = 'blocked'
                    issues.append(f'Falta {req}')
                else:
                    best = matches[0]
                    exp = best['expiry_date']
                    if not exp:
                        doc_status[req] = {'status': 'ok', 'expiry_date': None, 'label': 'Registrado (s/fecha)'}
                    elif exp < start_month:
                        doc_status[req] = {'status': 'expired', 'expiry_date': exp, 'label': f'Vencido ({exp})'}
                        overall = 'blocked'
                        issues.append(f'{req} vencido el {exp}')
                    elif exp <= end_month:
                        doc_status[req] = {'status': 'expiring_in_month', 'expiry_date': exp, 'label': f'Vence en el mes ({exp})'}
                        if overall != 'blocked':
                            overall = 'warning'
                        issues.append(f'{req} vence el {exp}')
                    else:
                        doc_status[req] = {'status': 'ok', 'expiry_date': exp, 'label': f'Vigente ({exp})'}

            result.append({
                'employee_id': e['id'],
                'full_name': e['full_name'],
                'document_number': e['document_number'],
                'position': e['position'],
                'docs': doc_status,
                'overall': overall,
                'issues': issues,
            })

        return {
            'year': year,
            'month': month,
            'start_month': start_month,
            'end_month': end_month,
            'employees': result,
        }
    finally:
        conn.close()

# ===================== WORKOUT / ENTRENAMIENTO =====================

@eel.expose
def get_workout_routine():
    conn = get_connection()
    try:
        days = conn.execute("SELECT * FROM workout_days ORDER BY sort_order ASC, day_number ASC, id ASC").fetchall()
        exs = conn.execute("SELECT * FROM workout_exercises ORDER BY day_id ASC, sort_order ASC, id ASC").fetchall()
        ex_by_day = {}
        for ex in exs:
            did = ex['day_id']
            if did not in ex_by_day:
                ex_by_day[did] = []
            ex_by_day[did].append(dict(ex))

        # Get last logged weight for each exercise to pre-fill in live workout
        last_weights = {}
        weight_rows = conn.execute("""
            SELECT exercise_name, weight_kg, reps
            FROM workout_set_logs
            WHERE weight_kg > 0
            ORDER BY date DESC, id DESC
        """).fetchall()
        for wr in weight_rows:
            if wr['exercise_name'] not in last_weights:
                last_weights[wr['exercise_name']] = {'weight_kg': wr['weight_kg'], 'reps': wr['reps']}

        result = []
        for d in days:
            dd = dict(d)
            day_exs = ex_by_day.get(d['id'], [])
            for x in day_exs:
                lw = last_weights.get(x['name'])
                x['last_weight_kg'] = lw['weight_kg'] if lw else x['default_weight_kg']
                x['last_reps'] = lw['reps'] if lw else None
            dd['exercises'] = day_exs
            result.append(dd)
        return result
    finally:
        conn.close()

@eel.expose
def save_workout_day(data):
    conn = get_connection()
    try:
        day_id = data.get('id')
        if day_id:
            conn.execute("""
                UPDATE workout_days SET day_number=?, name=?, subtitle=?, warmup_notes=?, cooldown_notes=?
                WHERE id=?
            """, (data.get('day_number', 1), data['name'], data.get('subtitle'),
                  data.get('warmup_notes'), data.get('cooldown_notes'), day_id))
        else:
            max_s = conn.execute("SELECT COALESCE(MAX(sort_order),0)+1 FROM workout_days").fetchone()[0]
            cur = conn.execute("""
                INSERT INTO workout_days (day_number, name, subtitle, warmup_notes, cooldown_notes, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (data.get('day_number', max_s), data['name'], data.get('subtitle'),
                  data.get('warmup_notes'), data.get('cooldown_notes'), max_s))
            day_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': day_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_workout_day(day_id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM workout_exercises WHERE day_id=?", (day_id,))
        conn.execute("DELETE FROM workout_days WHERE id=?", (day_id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def save_workout_exercise(data):
    conn = get_connection()
    try:
        ex_id = data.get('id')
        if ex_id:
            conn.execute("""
                UPDATE workout_exercises
                SET phase=?, name=?, sets=?, reps_text=?, equipment=?, default_weight_kg=?, rest_seconds=?
                WHERE id=?
            """, (data.get('phase', 'Principal'), data['name'], int(data.get('sets', 3)),
                  data.get('reps_text', '12'), data.get('equipment', ''),
                  float(data.get('default_weight_kg') or 0), int(data.get('rest_seconds') or 60), ex_id))
        else:
            day_id = data['day_id']
            max_s = conn.execute("SELECT COALESCE(MAX(sort_order),0)+1 FROM workout_exercises WHERE day_id=?", (day_id,)).fetchone()[0]
            cur = conn.execute("""
                INSERT INTO workout_exercises
                (day_id, phase, name, sets, reps_text, equipment, default_weight_kg, rest_seconds, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (day_id, data.get('phase', 'Principal'), data['name'], int(data.get('sets', 3)),
                  data.get('reps_text', '12'), data.get('equipment', ''),
                  float(data.get('default_weight_kg') or 0), int(data.get('rest_seconds') or 60), max_s))
            ex_id = cur.lastrowid
        conn.commit()
        return {'ok': True, 'id': ex_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def delete_workout_exercise(ex_id):
    conn = get_connection()
    try:
        conn.execute("DELETE FROM workout_exercises WHERE id=?", (ex_id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

def _sync_exercise_habits_for_date(conn, session_date, old_date=None):
    """Marca automáticamente el hábito de ejercicio (ej. 'Hacer ejercicio') en la fecha del entrenamiento."""
    try:
        ex_habits = conn.execute("""
            SELECT id FROM habits
            WHERE LOWER(name) LIKE '%ejercicio%' OR LOWER(name) LIKE '%entren%' OR LOWER(name) LIKE '%rutina%' OR LOWER(name) LIKE '%gym%'
        """).fetchall()
        for h in ex_habits:
            hid = h['id']
            if old_date and old_date != session_date:
                other_on_old = conn.execute(
                    "SELECT COUNT(*) FROM workout_sessions WHERE date=?", (old_date,)
                ).fetchone()[0]
                if other_on_old == 0:
                    conn.execute("DELETE FROM habit_logs WHERE habit_id=? AND date=?", (hid, old_date))
            if session_date:
                existing = conn.execute(
                    "SELECT id FROM habit_logs WHERE habit_id=? AND date=?", (hid, session_date)
                ).fetchone()
                if not existing:
                    conn.execute(
                        "INSERT INTO habit_logs (habit_id, date, completed) VALUES (?, ?, 1)",
                        (hid, session_date)
                    )
            streak = conn.execute(
                "SELECT COUNT(DISTINCT date) FROM habit_logs WHERE habit_id=?", (hid,)
            ).fetchone()[0]
            conn.execute("UPDATE habits SET streak=? WHERE id=?", (streak, hid))
    except Exception:
        pass

@eel.expose
def log_workout_session(data):
    """
    Guarda una sesión de entrenamiento completada y todos sus sets.
    Además actualiza default_weight_kg del ejercicio y marca automáticamente el hábito de ejercicio.
    """
    conn = get_connection()
    try:
        session_date = data.get('date') or today()
        cur = conn.execute("""
            INSERT INTO workout_sessions (day_id, day_name, date, duration_minutes, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (data.get('day_id'), data.get('day_name'), session_date,
              int(data.get('duration_minutes') or 0), data.get('notes')))
        session_id = cur.lastrowid

        for s in data.get('sets', []):
            w = float(s.get('weight_kg') or 0)
            r = int(s.get('reps') or 0)
            dur = int(s.get('duration_sec') or 0)
            ex_name = s.get('exercise_name')
            if not ex_name:
                continue
            conn.execute("""
                INSERT INTO workout_set_logs (session_id, exercise_name, set_number, weight_kg, reps, duration_sec, completed, date)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, (session_id, ex_name, int(s.get('set_number') or 1), w, r, dur, session_date))
            if w > 0:
                conn.execute("UPDATE workout_exercises SET default_weight_kg=? WHERE name=?", (w, ex_name))

        _sync_exercise_habits_for_date(conn, session_date)
        conn.commit()
        return {'ok': True, 'id': session_id}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def update_workout_session_date(session_id, new_date):
    conn = get_connection()
    try:
        row = conn.execute("SELECT date FROM workout_sessions WHERE id=?", (session_id,)).fetchone()
        old_date = row['date'] if row else None
        conn.execute("UPDATE workout_sessions SET date=? WHERE id=?", (new_date, session_id))
        conn.execute("UPDATE workout_set_logs SET date=? WHERE session_id=?", (new_date, session_id))
        _sync_exercise_habits_for_date(conn, new_date, old_date=old_date)
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_workout_history():
    conn = get_connection()
    try:
        sessions = conn.execute("""
            SELECT * FROM workout_sessions ORDER BY date DESC, id DESC LIMIT 100
        """).fetchall()
        logs = conn.execute("""
            SELECT * FROM workout_set_logs ORDER BY session_id DESC, id ASC
        """).fetchall()
        logs_by_sess = {}
        for l in logs:
            sid = l['session_id']
            if sid not in logs_by_sess:
                logs_by_sess[sid] = []
            logs_by_sess[sid].append(dict(l))

        result = []
        for s in sessions:
            sd = dict(s)
            sd['sets'] = logs_by_sess.get(s['id'], [])
            result.append(sd)
        return result
    finally:
        conn.close()

@eel.expose
def delete_workout_session(session_id):
    conn = get_connection()
    try:
        row = conn.execute("SELECT date FROM workout_sessions WHERE id=?", (session_id,)).fetchone()
        old_date = row['date'] if row else None
        conn.execute("DELETE FROM workout_set_logs WHERE session_id=?", (session_id,))
        conn.execute("DELETE FROM workout_sessions WHERE id=?", (session_id,))
        if old_date:
            _sync_exercise_habits_for_date(conn, None, old_date=old_date)
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()

@eel.expose
def get_workout_progress():
    """
    Retorna lista de ejercicios y serie histórica por fecha (peso máximo, volumen total y reps máximas)
    para graficar la evolución de fuerza/progresión.
    """
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT exercise_name, date,
                   MAX(weight_kg) as max_weight,
                   SUM(weight_kg * CASE WHEN reps > 0 THEN reps ELSE 1 END) as volume,
                   MAX(reps) as max_reps,
                   COUNT(*) as total_sets
            FROM workout_set_logs
            WHERE completed = 1
            GROUP BY exercise_name, date
            ORDER BY date ASC
        """).fetchall()

        by_exercise = {}
        for r in rows:
            name = r['exercise_name']
            if name not in by_exercise:
                by_exercise[name] = []
            by_exercise[name].append({
                'date': r['date'],
                'max_weight': round(r['max_weight'] or 0, 2),
                'volume': round(r['volume'] or 0, 2),
                'max_reps': r['max_reps'] or 0,
                'total_sets': r['total_sets'] or 0,
            })

        # All known exercise names from routine + logs
        ex_names = [r[0] for r in conn.execute("SELECT DISTINCT name FROM workout_exercises ORDER BY id ASC").fetchall()]
        for k in by_exercise.keys():
            if k not in ex_names:
                ex_names.append(k)

        return {
            'exercises': ex_names,
            'series': by_exercise,
        }
    finally:
        conn.close()

# ===================== WEATHER =====================

@eel.expose
def get_weather_data(lat=-34.6602, lon=-58.3674):
    """
    Obtiene el pronóstico actual y extendido desde Open-Meteo para el resumen del dashboard.
    Coordenadas predeterminadas: Avellaneda, Buenos Aires (-34.6602, -58.3674).
    """
    import urllib.request
    import json
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
            f"&timezone=America%2FArgentina%2FBuenos_Aires"
            f"&forecast_days=4"
        )
        req = urllib.request.Request(url, headers={'User-Agent': 'NicoleERP/1.0'})
        with urllib.request.urlopen(req, timeout=7) as response:
            data = json.loads(response.read().decode('utf-8'))
            return {'ok': True, 'data': data}
    except Exception as e:
        return {'ok': False, 'error': str(e)}


# ===================== FINANZAS PERSONALES =====================

def _calculate_account_balances(conn):
    """Calcula el saldo actual en tiempo real de cada cuenta financiera."""
    accounts = conn.execute("SELECT * FROM finance_accounts WHERE is_active=1 ORDER BY id ASC").fetchall()
    result = []
    for acc in accounts:
        a = dict(acc)
        aid = a['id']
        init_bal = float(a.get('initial_balance') or 0.0)

        # Ingresos a la cuenta
        inc_row = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM finance_transactions WHERE account_id=? AND type='income'",
            (aid,)
        ).fetchone()
        incomes = float(inc_row[0] if inc_row else 0.0)

        # Gastos y aportes a meta debitados de la cuenta
        exp_row = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM finance_transactions WHERE account_id=? AND type IN ('expense', 'goal_contribution')",
            (aid,)
        ).fetchone()
        expenses = float(exp_row[0] if exp_row else 0.0)

        # Transferencias salientes
        tout_row = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM finance_transactions WHERE account_id=? AND type='transfer'",
            (aid,)
        ).fetchone()
        transfers_out = float(tout_row[0] if tout_row else 0.0)

        # Transferencias entrantes
        tin_row = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM finance_transactions WHERE destination_account_id=? AND type='transfer'",
            (aid,)
        ).fetchone()
        transfers_in = float(tin_row[0] if tin_row else 0.0)

        a['incomes_total'] = incomes
        a['expenses_total'] = expenses
        a['transfers_out_total'] = transfers_out
        a['transfers_in_total'] = transfers_in
        a['current_balance'] = round(init_bal + incomes - expenses - transfers_out + transfers_in, 2)
        result.append(a)
    return result


def _get_primary_goal_summary(conn):
    """Calcula el estado y progreso de la meta de la operación en USD."""
    goal_row = conn.execute("SELECT * FROM finance_goals WHERE is_active=1 ORDER BY id ASC LIMIT 1").fetchone()
    if not goal_row:
        return None
    goal = dict(goal_row)
    gid = goal['id']
    target_usd = float(goal.get('target_amount') or 5000.0)
    base_usd = float(goal.get('current_amount') or 0.0)
    rate = float(goal.get('usd_exchange_rate') or 1200.0)

    # Sumar aportes de transacciones asociadas a la meta
    contrib_row = conn.execute(
        "SELECT COALESCE(SUM(goal_amount_usd), 0), COUNT(*) FROM finance_transactions WHERE goal_id=? AND type='goal_contribution'",
        (gid,)
    ).fetchone()
    contrib_usd = float(contrib_row[0] if contrib_row else 0.0)
    contrib_count = int(contrib_row[1] if contrib_row else 0)

    total_saved_usd = round(base_usd + contrib_usd, 2)
    remaining_usd = max(0.0, round(target_usd - total_saved_usd, 2))
    progress_percent = min(100.0, round((total_saved_usd / target_usd * 100), 1)) if target_usd > 0 else 0.0

    goal['base_usd'] = base_usd
    goal['contributed_usd'] = contrib_usd
    goal['contributions_count'] = contrib_count
    goal['total_saved_usd'] = total_saved_usd
    goal['remaining_usd'] = remaining_usd
    goal['progress_percent'] = progress_percent
    goal['target_ars_equiv'] = round(target_usd * rate, 2)
    goal['saved_ars_equiv'] = round(total_saved_usd * rate, 2)
    goal['remaining_ars_equiv'] = round(remaining_usd * rate, 2)
    return goal


def _get_debts_summary_helper(conn):
    """Calcula el estado consolidado de deudas y avance de pagos."""
    debts = conn.execute("SELECT * FROM finance_debts ORDER BY id ASC").fetchall()
    total_orig = 0.0
    total_paid = 0.0
    active_cnt = 0
    paid_cnt = 0

    for d in debts:
        orig = float(d['total_amount'] or 0.0)
        init_p = float(d['initial_paid'] or 0.0)
        pay_row = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM finance_debt_payments WHERE debt_id=?", (d['id'],)).fetchone()
        sum_p = float(pay_row[0] if pay_row else 0.0)
        paid = init_p + sum_p

        total_orig += orig
        total_paid += paid
        if paid >= orig and orig > 0:
            paid_cnt += 1
        else:
            active_cnt += 1

    remaining = max(0.0, round(total_orig - total_paid, 2))
    pct = min(100.0, round((total_paid / total_orig * 100), 1)) if total_orig > 0 else 0.0
    return {
        'total_original': round(total_orig, 2),
        'total_paid': round(total_paid, 2),
        'total_remaining': remaining,
        'progress_percent': pct,
        'active_count': active_cnt,
        'paid_count': paid_cnt,
        'has_debts': len(debts) > 0
    }


def _get_recurring_summary_helper(conn, month, year):
    """Calcula el estado de gastos fijos para el mes seleccionado."""
    recs = conn.execute("SELECT * FROM finance_recurring_expenses WHERE is_active=1 ORDER BY due_day ASC").fetchall()
    total_expected = sum(float(r['amount'] or 0.0) for r in recs)

    logs = conn.execute("""
        SELECT recurring_id, paid_amount
        FROM finance_recurring_logs
        WHERE month=? AND year=? AND is_paid=1
    """, (month, year)).fetchall()

    paid_map = {l['recurring_id']: float(l['paid_amount'] or 0.0) for l in logs}
    total_paid = sum(paid_map.values())
    pending_cnt = sum(1 for r in recs if r['id'] not in paid_map)

    return {
        'total_expected': round(total_expected, 2),
        'total_paid': round(total_paid, 2),
        'total_pending': max(0.0, round(total_expected - total_paid, 2)),
        'total_items': len(recs),
        'paid_count': len(logs),
        'pending_count': pending_cnt,
        'is_all_paid': (len(recs) > 0 and pending_cnt == 0)
    }


def _get_salary_summary_helper(conn, month, year):
    """Obtiene el sueldo esperado vs cobrado para el mes seleccionado."""
    row = conn.execute("SELECT * FROM finance_salaries WHERE month=? AND year=?", (month, year)).fetchone()
    if not row:
        return {
            'has_record': False,
            'expected_amount': 0.0,
            'received_amount': 0.0,
            'difference': 0.0,
            'difference_abs': 0.0,
            'status': 'pending',
            'is_fully_paid': False,
            'is_underpaid': False
        }
    sal = dict(row)
    exp = float(sal.get('expected_amount') or 0.0)
    rec = float(sal.get('received_amount') or 0.0)
    diff = round(rec - exp, 2)
    return {
        'has_record': True,
        'id': sal['id'],
        'expected_amount': exp,
        'received_amount': rec,
        'difference': diff,
        'difference_abs': abs(diff),
        'payment_date': sal.get('payment_date'),
        'account_id': sal.get('account_id'),
        'status': sal.get('status', 'pending'),
        'notes': sal.get('notes'),
        'is_fully_paid': (rec >= exp and exp > 0),
        'is_underpaid': (rec < exp)
    }


@eel.expose
def get_finance_summary(month=None, year=None):
    """
    Retorna el resumen financiero completo para el dashboard de Finanzas:
    - Balance neto, ingresos y gastos del mes en ARS
    - Desglose de gastos por categoría
    - Desglose de ingresos por categoría
    - Saldos en tiempo real de cuentas/billeteras
    - Resumen y progreso de la Meta Operación en USD
    - Transacciones del mes seleccionado
    """
    now = datetime.now(AR_TZ)
    if year is None or year == '':
        year = now.year
    else:
        year = int(year)

    if month is None or month == '':
        month = now.month
    else:
        month = int(month)

    month_str = f"{year:04d}-{month:02d}"

    conn = get_connection()
    try:
        # 1. Totales de ingresos y gastos del mes en ARS
        inc_row = conn.execute("""
            SELECT COALESCE(SUM(amount), 0)
            FROM finance_transactions
            WHERE type='income' AND strftime('%Y-%m', date) = ?
        """, (month_str,)).fetchone()
        total_income = float(inc_row[0] if inc_row else 0.0)

        exp_row = conn.execute("""
            SELECT COALESCE(SUM(amount), 0)
            FROM finance_transactions
            WHERE type IN ('expense', 'goal_contribution') AND strftime('%Y-%m', date) = ?
        """, (month_str,)).fetchone()
        total_expense = float(exp_row[0] if exp_row else 0.0)

        # 2. Desglose de gastos por categoría
        cat_exp_rows = conn.execute("""
            SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
            FROM finance_categories c
            JOIN finance_transactions t ON t.category_id = c.id
            WHERE t.type IN ('expense', 'goal_contribution') AND strftime('%Y-%m', t.date) = ?
            GROUP BY c.id, c.name, c.icon, c.color
            ORDER BY total DESC
        """, (month_str,)).fetchall()

        expenses_by_category = []
        for r in cat_exp_rows:
            tot = float(r['total'])
            pct = round((tot / total_expense * 100), 1) if total_expense > 0 else 0.0
            expenses_by_category.append({
                'id': r['id'],
                'name': r['name'],
                'icon': r['icon'] or '🏷️',
                'color': r['color'] or '#f43f5e',
                'total': round(tot, 2),
                'percent': pct
            })

        # 3. Desglose de ingresos por categoría
        cat_inc_rows = conn.execute("""
            SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
            FROM finance_categories c
            JOIN finance_transactions t ON t.category_id = c.id
            WHERE t.type='income' AND strftime('%Y-%m', t.date) = ?
            GROUP BY c.id, c.name, c.icon, c.color
            ORDER BY total DESC
        """, (month_str,)).fetchall()

        incomes_by_category = []
        for r in cat_inc_rows:
            tot = float(r['total'])
            pct = round((tot / total_income * 100), 1) if total_income > 0 else 0.0
            incomes_by_category.append({
                'id': r['id'],
                'name': r['name'],
                'icon': r['icon'] or '💼',
                'color': r['color'] or '#10b981',
                'total': round(tot, 2),
                'percent': pct
            })

        # 4. Cuentas con saldo en tiempo real
        accounts = _calculate_account_balances(conn)

        # 5. Meta Operación USD
        goal = _get_primary_goal_summary(conn)

        # 6. Transacciones del mes
        tx_rows = conn.execute("""
            SELECT t.*,
                   a.name as account_name, a.icon as account_icon, a.currency as account_currency,
                   c.name as category_name, c.icon as category_icon, c.color as category_color,
                   da.name as dest_account_name, da.icon as dest_account_icon
            FROM finance_transactions t
            LEFT JOIN finance_accounts a ON t.account_id = a.id
            LEFT JOIN finance_categories c ON t.category_id = c.id
            LEFT JOIN finance_accounts da ON t.destination_account_id = da.id
            WHERE strftime('%Y-%m', t.date) = ?
            ORDER BY t.date DESC, t.id DESC
        """, (month_str,)).fetchall()
        transactions = [dict(r) for r in tx_rows]

        # 7. Resumen de Deudas
        debts_res = _get_debts_summary_helper(conn)

        # 8. Resumen de Gastos Fijos para el mes
        recurring_res = _get_recurring_summary_helper(conn, month, year)

        # 9. Sueldo para el mes
        salary_res = _get_salary_summary_helper(conn, month, year)

        return {
            'ok': True,
            'month': month,
            'year': year,
            'month_str': month_str,
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'net_balance': round(total_income - total_expense, 2),
            'expenses_by_category': expenses_by_category,
            'incomes_by_category': incomes_by_category,
            'accounts': accounts,
            'goal': goal,
            'transactions': transactions,
            'debts_summary': debts_res,
            'recurring_summary': recurring_res,
            'salary_summary': salary_res
        }
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def get_finance_transactions(filters=None):
    """Obtiene la lista de transacciones con filtros opcionales."""
    filters = filters or {}
    conn = get_connection()
    try:
        query = """
            SELECT t.*,
                   a.name as account_name, a.icon as account_icon, a.currency as account_currency,
                   c.name as category_name, c.icon as category_icon, c.color as category_color,
                   da.name as dest_account_name, da.icon as dest_account_icon,
                   g.title as goal_title
            FROM finance_transactions t
            LEFT JOIN finance_accounts a ON t.account_id = a.id
            LEFT JOIN finance_categories c ON t.category_id = c.id
            LEFT JOIN finance_accounts da ON t.destination_account_id = da.id
            LEFT JOIN finance_goals g ON t.goal_id = g.id
            WHERE 1=1
        """
        params = []

        if filters.get('month') and filters.get('year'):
            m_str = f"{int(filters['year']):04d}-{int(filters['month']):02d}"
            query += " AND strftime('%Y-%m', t.date) = ?"
            params.append(m_str)

        if filters.get('account_id'):
            query += " AND (t.account_id = ? OR t.destination_account_id = ?)"
            params.extend([int(filters['account_id']), int(filters['account_id'])])

        if filters.get('category_id'):
            query += " AND t.category_id = ?"
            params.append(int(filters['category_id']))

        if filters.get('type'):
            query += " AND t.type = ?"
            params.append(filters['type'])

        if filters.get('only_goals'):
            query += " AND t.type = 'goal_contribution'"

        if filters.get('search'):
            query += " AND (t.description LIKE ? OR c.name LIKE ?)"
            s = f"%{filters['search']}%"
            params.extend([s, s])

        query += " ORDER BY t.date DESC, t.id DESC LIMIT 200"
        rows = conn.execute(query, params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@eel.expose
def create_finance_transaction(data):
    """Crea una nueva transacción (gasto, ingreso, transferencia, o aporte a meta)."""
    conn = get_connection()
    try:
        tx_type = data.get('type', 'expense')
        amount = float(data.get('amount') or 0.0)
        account_id = int(data.get('account_id'))
        category_id = int(data.get('category_id')) if data.get('category_id') else None
        dest_account_id = int(data.get('destination_account_id')) if data.get('destination_account_id') else None
        date_val = data.get('date') or today()
        desc = (data.get('description') or '').strip()
        goal_id = int(data.get('goal_id')) if data.get('goal_id') else None
        goal_amount_usd = float(data.get('goal_amount_usd') or 0.0)

        # Si es un aporte a la meta
        if tx_type == 'goal_contribution' or data.get('is_goal_contribution'):
            tx_type = 'goal_contribution'
            if not goal_id:
                g_row = conn.execute("SELECT id, usd_exchange_rate FROM finance_goals WHERE is_active=1 LIMIT 1").fetchone()
                if g_row:
                    goal_id = g_row['id']
                    rate = float(g_row['usd_exchange_rate'] or 1200.0)
                    if goal_amount_usd <= 0 and rate > 0:
                        goal_amount_usd = round(amount / rate, 2)
            # Asignar categoría de aporte si no vino una
            if not category_id:
                c_row = conn.execute("SELECT id FROM finance_categories WHERE name LIKE '%Operación%' OR name LIKE '%Meta%' LIMIT 1").fetchone()
                if c_row:
                    category_id = c_row['id']

        cur = conn.execute("""
            INSERT INTO finance_transactions
            (account_id, category_id, type, amount, currency, date, description, destination_account_id, goal_id, goal_amount_usd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            account_id, category_id, tx_type, amount, data.get('currency', 'ARS'),
            date_val, desc, dest_account_id, goal_id, goal_amount_usd
        ))
        conn.commit()
        return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def update_finance_transaction(id, data):
    """Actualiza una transacción existente."""
    conn = get_connection()
    try:
        tx_type = data.get('type', 'expense')
        amount = float(data.get('amount') or 0.0)
        account_id = int(data.get('account_id'))
        category_id = int(data.get('category_id')) if data.get('category_id') else None
        dest_account_id = int(data.get('destination_account_id')) if data.get('destination_account_id') else None
        date_val = data.get('date') or today()
        desc = (data.get('description') or '').strip()
        goal_id = int(data.get('goal_id')) if data.get('goal_id') else None
        goal_amount_usd = float(data.get('goal_amount_usd') or 0.0)

        conn.execute("""
            UPDATE finance_transactions
            SET account_id=?, category_id=?, type=?, amount=?, currency=?, date=?,
                description=?, destination_account_id=?, goal_id=?, goal_amount_usd=?
            WHERE id=?
        """, (
            account_id, category_id, tx_type, amount, data.get('currency', 'ARS'),
            date_val, desc, dest_account_id, goal_id, goal_amount_usd, id
        ))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def delete_finance_transaction(id):
    """Elimina una transacción."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM finance_transactions WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def get_finance_accounts():
    """Retorna las cuentas financieras activas con sus saldos."""
    conn = get_connection()
    try:
        return _calculate_account_balances(conn)
    finally:
        conn.close()


@eel.expose
def create_finance_account(data):
    """Crea una nueva cuenta o billetera."""
    conn = get_connection()
    try:
        name = (data.get('name') or '').strip()
        if not name:
            return {'ok': False, 'error': 'El nombre de la cuenta es obligatorio'}
        cur = conn.execute("""
            INSERT INTO finance_accounts (name, account_type, currency, initial_balance, color, icon)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            name,
            data.get('account_type', 'wallet'),
            data.get('currency', 'ARS'),
            float(data.get('initial_balance') or 0.0),
            data.get('color', '#8b5cf6'),
            data.get('icon', '💳')
        ))
        conn.commit()
        return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def update_finance_account(id, data):
    """Actualiza una cuenta financiera."""
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE finance_accounts
            SET name=?, account_type=?, currency=?, initial_balance=?, color=?, icon=?
            WHERE id=?
        """, (
            data.get('name'),
            data.get('account_type', 'wallet'),
            data.get('currency', 'ARS'),
            float(data.get('initial_balance') or 0.0),
            data.get('color', '#8b5cf6'),
            data.get('icon', '💳'),
            id
        ))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def delete_finance_account(id):
    """Elimina o desactiva una cuenta."""
    conn = get_connection()
    try:
        # Si tiene transacciones, desactivarla para no romper historial
        count = conn.execute("SELECT COUNT(*) FROM finance_transactions WHERE account_id=? OR destination_account_id=?", (id, id)).fetchone()[0]
        if count > 0:
            conn.execute("UPDATE finance_accounts SET is_active=0 WHERE id=?", (id,))
        else:
            conn.execute("DELETE FROM finance_accounts WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def get_finance_categories():
    """Retorna las categorías de gastos e ingresos."""
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM finance_categories WHERE is_active=1 ORDER BY type DESC, sort_order ASC, name ASC").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


@eel.expose
def create_finance_category(data):
    """Crea una nueva categoría."""
    conn = get_connection()
    try:
        name = (data.get('name') or '').strip()
        if not name:
            return {'ok': False, 'error': 'El nombre es obligatorio'}
        cur = conn.execute("""
            INSERT INTO finance_categories (name, type, icon, color, sort_order)
            VALUES (?, ?, ?, ?, ?)
        """, (
            name,
            data.get('type', 'expense'),
            data.get('icon', '🏷️'),
            data.get('color', '#f43f5e'),
            int(data.get('sort_order') or 0)
        ))
        conn.commit()
        return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def delete_finance_category(id):
    """Elimina o desactiva una categoría."""
    conn = get_connection()
    try:
        count = conn.execute("SELECT COUNT(*) FROM finance_transactions WHERE category_id=?", (id,)).fetchone()[0]
        if count > 0:
            conn.execute("UPDATE finance_categories SET is_active=0 WHERE id=?", (id,))
        else:
            conn.execute("DELETE FROM finance_categories WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def get_finance_goals():
    """Retorna las metas de ahorro con su detalle y aportes."""
    conn = get_connection()
    try:
        primary = _get_primary_goal_summary(conn)
        # Traer todos los aportes detallados de la meta
        if primary:
            contributions = conn.execute("""
                SELECT t.id, t.date, t.amount, t.goal_amount_usd, t.description,
                       a.name as account_name, a.icon as account_icon
                FROM finance_transactions t
                LEFT JOIN finance_accounts a ON t.account_id = a.id
                WHERE t.goal_id = ? AND t.type = 'goal_contribution'
                ORDER BY t.date DESC, t.id DESC
            """, (primary['id'],)).fetchall()
            primary['contributions'] = [dict(c) for c in contributions]
        return primary
    finally:
        conn.close()


@eel.expose
def update_finance_goal(id, data):
    """Actualiza los parámetros de la meta de la operación (monto objetivo, saldo inicial, cotización, fecha, notas)."""
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE finance_goals
            SET title=?, target_amount=?, current_amount=?, usd_exchange_rate=?, target_date=?, notes=?
            WHERE id=?
        """, (
            data.get('title', 'Mi Operación'),
            float(data.get('target_amount') or 5000.0),
            float(data.get('current_amount') or 0.0),
            float(data.get('usd_exchange_rate') or 1200.0),
            data.get('target_date') or None,
            data.get('notes') or '',
            id
        ))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def add_goal_contribution(data):
    """
    Registra un aporte directo a la Meta Operación.
    Recibe monto en USD o ARS, cuenta de origen, fecha y nota.
    """
    conn = get_connection()
    try:
        goal_id = int(data.get('goal_id') or 1)
        g_row = conn.execute("SELECT * FROM finance_goals WHERE id=?", (goal_id,)).fetchone()
        if not g_row:
            return {'ok': False, 'error': 'Meta no encontrada'}
        rate = float(g_row['usd_exchange_rate'] or 1200.0)

        amount_usd = float(data.get('amount_usd') or 0.0)
        amount_ars = float(data.get('amount_ars') or 0.0)

        # Si se ingresó solo USD o solo ARS, calcular el otro según la cotización
        if amount_usd > 0 and amount_ars <= 0:
            amount_ars = round(amount_usd * rate, 2)
        elif amount_ars > 0 and amount_usd <= 0:
            amount_usd = round(amount_ars / rate, 2) if rate > 0 else 0.0

        account_id = int(data.get('account_id'))
        date_val = data.get('date') or today()
        notes = (data.get('notes') or 'Aporte a Meta Operación').strip()

        # Categoría
        c_row = conn.execute("SELECT id FROM finance_categories WHERE name LIKE '%Operación%' OR name LIKE '%Meta%' LIMIT 1").fetchone()
        cat_id = c_row['id'] if c_row else None

        cur = conn.execute("""
            INSERT INTO finance_transactions
            (account_id, category_id, type, amount, currency, date, description, goal_id, goal_amount_usd)
            VALUES (?, ?, 'goal_contribution', ?, 'ARS', ?, ?, ?, ?)
        """, (account_id, cat_id, amount_ars, date_val, notes, goal_id, amount_usd))
        conn.commit()
        return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


# ===================== DEUDAS & AVANCE DE PAGOS =====================

@eel.expose
def get_finance_debts():
    """Retorna todas las deudas, el desglose de pagos y el resumen de avance."""
    conn = get_connection()
    try:
        debts = conn.execute("SELECT * FROM finance_debts ORDER BY CASE status WHEN 'active' THEN 1 ELSE 2 END, id DESC").fetchall()
        result_debts = []
        total_orig = 0.0
        total_paid = 0.0
        active_cnt = 0
        paid_cnt = 0

        for d_row in debts:
            d = dict(d_row)
            did = d['id']
            orig = float(d.get('total_amount') or 0.0)
            init_p = float(d.get('initial_paid') or 0.0)

            # Pagos realizados
            pay_rows = conn.execute("""
                SELECT p.*, a.name as account_name, a.icon as account_icon
                FROM finance_debt_payments p
                LEFT JOIN finance_accounts a ON p.account_id = a.id
                WHERE p.debt_id = ?
                ORDER BY p.date DESC, p.id DESC
            """, (did,)).fetchall()
            payments = [dict(p) for p in pay_rows]
            sum_p = sum(float(p['amount'] or 0.0) for p in payments)
            paid = round(init_p + sum_p, 2)
            rem = max(0.0, round(orig - paid, 2))
            pct = min(100.0, round((paid / orig * 100), 1)) if orig > 0 else 100.0

            d['payments'] = payments
            d['payments_count'] = len(payments)
            d['total_paid'] = paid
            d['remaining_amount'] = rem
            d['progress_percent'] = pct
            d['is_paid'] = (paid >= orig and orig > 0) or (d.get('status') == 'paid')

            total_orig += orig
            total_paid += paid
            if d['is_paid']:
                paid_cnt += 1
            else:
                active_cnt += 1

            result_debts.append(d)

        overall_rem = max(0.0, round(total_orig - total_paid, 2))
        overall_pct = min(100.0, round((total_paid / total_orig * 100), 1)) if total_orig > 0 else 0.0

        summary = {
            'total_original': round(total_orig, 2),
            'total_paid': round(total_paid, 2),
            'total_remaining': overall_rem,
            'progress_percent': overall_pct,
            'active_count': active_cnt,
            'paid_count': paid_cnt,
            'total_count': len(debts)
        }
        return {'ok': True, 'debts': result_debts, 'summary': summary}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def create_finance_debt(data):
    """Crea una nueva deuda o compromiso financiero."""
    conn = get_connection()
    try:
        title = (data.get('title') or '').strip()
        if not title:
            return {'ok': False, 'error': 'El título o concepto de la deuda es obligatorio'}
        total_amt = float(data.get('total_amount') or 0.0)
        if total_amt <= 0:
            return {'ok': False, 'error': 'El monto total debe ser mayor a 0'}

        cur = conn.execute("""
            INSERT INTO finance_debts
            (title, creditor, total_amount, initial_paid, currency, due_date, installments_total, installments_paid, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            title,
            data.get('creditor') or '',
            total_amt,
            float(data.get('initial_paid') or 0.0),
            data.get('currency', 'ARS'),
            data.get('due_date') or None,
            int(data.get('installments_total') or 1),
            int(data.get('installments_paid') or 0),
            data.get('notes') or ''
        ))
        conn.commit()
        return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def update_finance_debt(id, data):
    """Actualiza una deuda existente."""
    conn = get_connection()
    try:
        title = (data.get('title') or '').strip()
        total_amt = float(data.get('total_amount') or 0.0)
        init_paid = float(data.get('initial_paid') or 0.0)

        conn.execute("""
            UPDATE finance_debts
            SET title=?, creditor=?, total_amount=?, initial_paid=?, currency=?,
                due_date=?, installments_total=?, installments_paid=?, status=?, notes=?
            WHERE id=?
        """, (
            title,
            data.get('creditor') or '',
            total_amt,
            init_paid,
            data.get('currency', 'ARS'),
            data.get('due_date') or None,
            int(data.get('installments_total') or 1),
            int(data.get('installments_paid') or 0),
            data.get('status', 'active'),
            data.get('notes') or '',
            id
        ))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def delete_finance_debt(id):
    """Elimina una deuda y sus pagos asociados."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM finance_debts WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def pay_finance_debt(data):
    """
    Registra un pago / cuota hacia una deuda:
    - Inserta en finance_debt_payments
    - Genera transacción de gasto en finance_transactions impactando la cuenta elegida
    - Actualiza el estado de la deuda si se cancela en su totalidad
    """
    conn = get_connection()
    try:
        debt_id = int(data.get('debt_id'))
        amount = float(data.get('amount') or 0.0)
        if amount <= 0:
            return {'ok': False, 'error': 'El monto del pago debe ser mayor a 0'}

        account_id = int(data.get('account_id')) if data.get('account_id') else None
        date_val = data.get('date') or today()
        inst_num = int(data.get('installment_number')) if data.get('installment_number') else None
        notes = (data.get('notes') or '').strip()

        d_row = conn.execute("SELECT * FROM finance_debts WHERE id=?", (debt_id,)).fetchone()
        if not d_row:
            return {'ok': False, 'error': 'Deuda no encontrada'}

        # Categoría para pago de deuda
        c_row = conn.execute("SELECT id FROM finance_categories WHERE name LIKE '%Deuda%' LIMIT 1").fetchone()
        cat_id = c_row['id'] if c_row else None

        # Si se seleccionó una cuenta, crear movimiento de gasto
        tx_id = None
        if account_id:
            desc_parts = [f"Pago deuda: {d_row['title']}"]
            if inst_num:
                desc_parts.append(f"(Cuota {inst_num})")
            if notes:
                desc_parts.append(f"- {notes}")
            tx_desc = " ".join(desc_parts)

            cur_tx = conn.execute("""
                INSERT INTO finance_transactions
                (account_id, category_id, type, amount, currency, date, description)
                VALUES (?, ?, 'expense', ?, 'ARS', ?, ?)
            """, (account_id, cat_id, amount, date_val, tx_desc))
            tx_id = cur_tx.lastrowid

        # Insertar registro de pago
        conn.execute("""
            INSERT INTO finance_debt_payments
            (debt_id, transaction_id, account_id, amount, date, installment_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (debt_id, tx_id, account_id, amount, date_val, inst_num, notes))

        # Actualizar cuotas pagadas si vino número de cuota
        if inst_num:
            conn.execute("""
                UPDATE finance_debts
                SET installments_paid = MAX(installments_paid, ?)
                WHERE id = ?
            """, (inst_num, debt_id))

        # Verificar si la deuda quedó saldada
        sum_p = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM finance_debt_payments WHERE debt_id=?", (debt_id,)).fetchone()[0]
        total_p = float(d_row['initial_paid'] or 0.0) + float(sum_p)
        if total_p >= float(d_row['total_amount'] or 0.0):
            conn.execute("UPDATE finance_debts SET status='paid' WHERE id=?", (debt_id,))

        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def delete_debt_payment(payment_id):
    """Elimina un pago de deuda y su transacción vinculada."""
    conn = get_connection()
    try:
        p_row = conn.execute("SELECT debt_id, transaction_id FROM finance_debt_payments WHERE id=?", (payment_id,)).fetchone()
        if p_row:
            if p_row['transaction_id']:
                conn.execute("DELETE FROM finance_transactions WHERE id=?", (p_row['transaction_id'],))
            conn.execute("DELETE FROM finance_debt_payments WHERE id=?", (payment_id,))

            # Reactivar deuda si estaba en paid
            debt_id = p_row['debt_id']
            d_row = conn.execute("SELECT total_amount, initial_paid FROM finance_debts WHERE id=?", (debt_id,)).fetchone()
            if d_row:
                sum_p = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM finance_debt_payments WHERE debt_id=?", (debt_id,)).fetchone()[0]
                if float(d_row['initial_paid'] or 0.0) + float(sum_p) < float(d_row['total_amount'] or 0.0):
                    conn.execute("UPDATE finance_debts SET status='active' WHERE id=?", (debt_id,))

            conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


# ===================== GASTOS FIJOS MENSUALES =====================

@eel.expose
def get_finance_recurring(month=None, year=None):
    """
    Retorna los gastos fijos mensuales y su estado de pago (Pagado/Pendiente) para el mes/año indicado.
    """
    now = datetime.now(AR_TZ)
    if year is None or year == '':
        year = now.year
    else:
        year = int(year)

    if month is None or month == '':
        month = now.month
    else:
        month = int(month)

    conn = get_connection()
    try:
        recs = conn.execute("""
            SELECT r.*,
                   c.name as category_name, c.icon as category_icon, c.color as category_color,
                   a.name as default_account_name, a.icon as default_account_icon
            FROM finance_recurring_expenses r
            LEFT JOIN finance_categories c ON r.category_id = c.id
            LEFT JOIN finance_accounts a ON r.account_id = a.id
            WHERE r.is_active = 1
            ORDER BY r.due_day ASC, r.id ASC
        """).fetchall()

        logs = conn.execute("""
            SELECT l.*, a.name as paid_account_name
            FROM finance_recurring_logs l
            LEFT JOIN finance_transactions t ON l.transaction_id = t.id
            LEFT JOIN finance_accounts a ON t.account_id = a.id
            WHERE l.month = ? AND l.year = ? AND l.is_paid = 1
        """, (month, year)).fetchall()

        logs_by_rec = {l['recurring_id']: dict(l) for l in logs}

        result_recs = []
        total_exp = 0.0
        total_paid = 0.0
        paid_cnt = 0
        pending_cnt = 0

        current_day = now.day if (now.year == year and now.month == month) else None

        for r_row in recs:
            r = dict(r_row)
            rid = r['id']
            amt = float(r.get('amount') or 0.0)
            total_exp += amt

            log = logs_by_rec.get(rid)
            if log:
                r['is_paid'] = True
                r['paid_amount'] = float(log.get('paid_amount') or amt)
                r['paid_date'] = log.get('paid_date')
                r['log_id'] = log.get('id')
                r['paid_account_name'] = log.get('paid_account_name')
                total_paid += r['paid_amount']
                paid_cnt += 1
            else:
                r['is_paid'] = False
                r['paid_amount'] = 0.0
                r['paid_date'] = None
                r['log_id'] = None
                pending_cnt += 1

            # Chequear si está vencido en el mes actual
            dday = int(r.get('due_day') or 10)
            r['is_overdue'] = bool(not r['is_paid'] and current_day and current_day > dday)

            result_recs.append(r)

        summary = {
            'month': month,
            'year': year,
            'total_expected': round(total_exp, 2),
            'total_paid': round(total_paid, 2),
            'total_pending': max(0.0, round(total_exp - total_paid, 2)),
            'total_count': len(recs),
            'paid_count': paid_cnt,
            'pending_count': pending_cnt,
            'is_all_paid': (len(recs) > 0 and pending_cnt == 0)
        }
        return {'ok': True, 'recurring': result_recs, 'summary': summary}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def create_finance_recurring(data):
    """Crea un nuevo gasto fijo mensual."""
    conn = get_connection()
    try:
        name = (data.get('name') or '').strip()
        if not name:
            return {'ok': False, 'error': 'El nombre del gasto fijo es obligatorio'}
        amt = float(data.get('amount') or 0.0)

        cur = conn.execute("""
            INSERT INTO finance_recurring_expenses
            (name, category_id, account_id, amount, currency, due_day, auto_debit, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            name,
            int(data['category_id']) if data.get('category_id') else None,
            int(data['account_id']) if data.get('account_id') else None,
            amt,
            data.get('currency', 'ARS'),
            int(data.get('due_day') or 10),
            1 if data.get('auto_debit') else 0,
            data.get('notes') or ''
        ))
        conn.commit()
        return {'ok': True, 'id': cur.lastrowid}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def update_finance_recurring(id, data):
    """Actualiza un gasto fijo."""
    conn = get_connection()
    try:
        conn.execute("""
            UPDATE finance_recurring_expenses
            SET name=?, category_id=?, account_id=?, amount=?, currency=?, due_day=?, auto_debit=?, notes=?
            WHERE id=?
        """, (
            data.get('name'),
            int(data['category_id']) if data.get('category_id') else None,
            int(data['account_id']) if data.get('account_id') else None,
            float(data.get('amount') or 0.0),
            data.get('currency', 'ARS'),
            int(data.get('due_day') or 10),
            1 if data.get('auto_debit') else 0,
            data.get('notes') or '',
            id
        ))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def delete_finance_recurring(id):
    """Elimina un gasto fijo."""
    conn = get_connection()
    try:
        conn.execute("DELETE FROM finance_recurring_expenses WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def mark_recurring_paid(data):
    """
    Marca un gasto fijo como pagado para el mes especificado:
    - Opcionalmente genera la transacción en finance_transactions
    - Guarda en finance_recurring_logs
    """
    conn = get_connection()
    try:
        recurring_id = int(data.get('recurring_id'))
        month = int(data.get('month'))
        year = int(data.get('year'))
        paid_amount = float(data.get('paid_amount') or 0.0)
        paid_date = data.get('paid_date') or today()
        account_id = int(data.get('account_id')) if data.get('account_id') else None
        create_tx = bool(data.get('create_transaction', True))

        rec = conn.execute("SELECT * FROM finance_recurring_expenses WHERE id=?", (recurring_id,)).fetchone()
        if not rec:
            return {'ok': False, 'error': 'Gasto fijo no encontrado'}

        tx_id = None
        if create_tx and account_id and paid_amount > 0:
            cur_tx = conn.execute("""
                INSERT INTO finance_transactions
                (account_id, category_id, type, amount, currency, date, description)
                VALUES (?, ?, 'expense', ?, 'ARS', ?, ?)
            """, (account_id, rec['category_id'], paid_amount, paid_date, f"Gasto fijo: {rec['name']} ({month:02d}/{year})"))
            tx_id = cur_tx.lastrowid

        conn.execute("""
            INSERT INTO finance_recurring_logs
            (recurring_id, month, year, paid_amount, paid_date, transaction_id, is_paid, notes)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            ON CONFLICT(recurring_id, month, year) DO UPDATE SET
                paid_amount=excluded.paid_amount,
                paid_date=excluded.paid_date,
                transaction_id=COALESCE(excluded.transaction_id, finance_recurring_logs.transaction_id),
                is_paid=1
        """, (recurring_id, month, year, paid_amount, paid_date, tx_id, data.get('notes') or ''))

        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def unmark_recurring_paid(log_id):
    """Desmarca un gasto fijo como pagado y elimina la transacción vinculada si existe."""
    conn = get_connection()
    try:
        log = conn.execute("SELECT transaction_id FROM finance_recurring_logs WHERE id=?", (log_id,)).fetchone()
        if log:
            if log['transaction_id']:
                conn.execute("DELETE FROM finance_transactions WHERE id=?", (log['transaction_id'],))
            conn.execute("DELETE FROM finance_recurring_logs WHERE id=?", (log_id,))
            conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


# ===================== REGISTRO Y COMPARACIÓN DE SUELDOS =====================

@eel.expose
def get_finance_salaries(year=None):
    """
    Retorna la lista de los 12 meses del año con sueldos pactados/esperados vs cobrados,
    calculando diferencias, faltantes y estado de pago.
    """
    now = datetime.now(AR_TZ)
    if year is None or year == '':
        year = now.year
    else:
        year = int(year)

    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT s.*, a.name as account_name, a.icon as account_icon
            FROM finance_salaries s
            LEFT JOIN finance_accounts a ON s.account_id = a.id
            WHERE s.year = ?
            ORDER BY s.month ASC
        """, (year,)).fetchall()

        by_month = {r['month']: dict(r) for r in rows}
        month_names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

        months_list = []
        tot_expected = 0.0
        tot_received = 0.0
        pending_cnt = 0

        for m in range(1, 13):
            sal = by_month.get(m)
            exp = float(sal['expected_amount']) if sal else 0.0
            rec = float(sal['received_amount']) if sal else 0.0
            diff = round(rec - exp, 2)

            is_fully = (rec >= exp and exp > 0)
            is_under = (rec < exp and exp > 0)
            if is_under or (exp > 0 and rec == 0):
                pending_cnt += 1

            tot_expected += exp
            tot_received += rec

            item = {
                'month': m,
                'month_name': month_names[m - 1],
                'year': year,
                'has_record': bool(sal),
                'id': sal['id'] if sal else None,
                'expected_amount': exp,
                'received_amount': rec,
                'difference': diff,
                'difference_abs': abs(diff),
                'is_fully_paid': is_fully,
                'is_underpaid': is_under,
                'payment_date': sal.get('payment_date') if sal else None,
                'account_id': sal.get('account_id') if sal else None,
                'account_name': sal.get('account_name') if sal else None,
                'account_icon': sal.get('account_icon') if sal else None,
                'status': sal.get('status', 'pending') if sal else ('paid_full' if is_fully else 'pending'),
                'notes': sal.get('notes') if sal else '',
                'transaction_id': sal.get('transaction_id') if sal else None
            }
            months_list.append(item)

        tot_diff = round(tot_received - tot_expected, 2)
        summary = {
            'year': year,
            'total_expected': round(tot_expected, 2),
            'total_received': round(tot_received, 2),
            'total_difference': tot_diff,
            'total_difference_abs': abs(tot_diff),
            'pending_months_count': pending_cnt,
            'has_salaries': (tot_expected > 0 or tot_received > 0)
        }
        return {'ok': True, 'months': months_list, 'summary': summary}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def save_finance_salary(data):
    """
    Registra o actualiza el sueldo de un mes (monto que debería haber cobrado vs cobrado real).
    Sincroniza opcionalmente el ingreso en finance_transactions impactando la cuenta bancaria.
    """
    conn = get_connection()
    try:
        month = int(data.get('month'))
        year = int(data.get('year'))
        expected = float(data.get('expected_amount') or 0.0)
        received = float(data.get('received_amount') or 0.0)
        pay_date = data.get('payment_date') or today()
        account_id = int(data.get('account_id')) if data.get('account_id') else None
        notes = (data.get('notes') or '').strip()
        sync_tx = bool(data.get('sync_transaction', True))

        # Determinar status
        if received >= expected and expected > 0:
            status = 'paid_full'
        elif received > 0:
            status = 'paid_partial'
        else:
            status = 'pending'

        existing = conn.execute("SELECT * FROM finance_salaries WHERE month=? AND year=?", (month, year)).fetchone()
        tx_id = existing['transaction_id'] if existing else None

        # Sincronizar con movimiento de ingreso si se cobró dinero
        if sync_tx and received > 0 and account_id:
            c_row = conn.execute("SELECT id FROM finance_categories WHERE name LIKE '%Sueldo%' OR name LIKE '%Trabajo%' LIMIT 1").fetchone()
            cat_id = c_row['id'] if c_row else None
            month_names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
            desc = f"Sueldo {month_names[month - 1]} {year}" + (f" - {notes}" if notes else "")

            if tx_id:
                conn.execute("""
                    UPDATE finance_transactions
                    SET account_id=?, amount=?, date=?, description=?, category_id=?
                    WHERE id=?
                """, (account_id, received, pay_date, desc, cat_id, tx_id))
            else:
                cur_tx = conn.execute("""
                    INSERT INTO finance_transactions
                    (account_id, category_id, type, amount, currency, date, description)
                    VALUES (?, ?, 'income', ?, 'ARS', ?, ?)
                """, (account_id, cat_id, received, pay_date, desc))
                tx_id = cur_tx.lastrowid
        elif received == 0 and tx_id:
            # Si se puso en 0, eliminar transacción previa
            conn.execute("DELETE FROM finance_transactions WHERE id=?", (tx_id,))
            tx_id = None

        if existing:
            conn.execute("""
                UPDATE finance_salaries
                SET expected_amount=?, received_amount=?, payment_date=?, account_id=?, status=?, notes=?, transaction_id=?
                WHERE id=?
            """, (expected, received, pay_date, account_id, status, notes, tx_id, existing['id']))
        else:
            conn.execute("""
                INSERT INTO finance_salaries
                (month, year, expected_amount, received_amount, payment_date, account_id, status, notes, transaction_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (month, year, expected, received, pay_date, account_id, status, notes, tx_id))

        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()


@eel.expose
def delete_finance_salary(id):
    """Elimina un registro de sueldo."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT transaction_id FROM finance_salaries WHERE id=?", (id,)).fetchone()
        if row and row['transaction_id']:
            conn.execute("DELETE FROM finance_transactions WHERE id=?", (row['transaction_id'],))
        conn.execute("DELETE FROM finance_salaries WHERE id=?", (id,))
        conn.commit()
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}
    finally:
        conn.close()



# ===================== SIRI SHORTCUTS & APPLE INTEGRATION =====================

def get_or_create_shortcut_token():
    conn = get_connection()
    try:
        row = conn.execute("SELECT value FROM config WHERE key='shortcut_token'").fetchone()
        if row and row['value'] and len(row['value'].strip()) >= 16:
            return row['value'].strip()
        import secrets
        token = secrets.token_hex(16)
        conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('shortcut_token', ?)", (token,))
        conn.commit()
        return token
    finally:
        conn.close()

@eel.expose
def get_shortcut_info():
    """Retorna el token actual y los datos de conexión para Atajos de Siri."""
    token = get_or_create_shortcut_token()
    cloud_url = "https://nicolecarp.pythonanywhere.com"
    return {
        "ok": True,
        "token": token,
        "cloud_url": cloud_url,
        "shortcut_endpoint": f"{cloud_url}/api/shortcut",
        "actions": [
            {
                "id": "log_injection",
                "name": "💉 Registrar Inyección TRH",
                "desc": "Registra una dosis de Valerato de Estradiol y calcula la próxima fecha.",
                "fields": ["dose_mg (opcional, ej: 4.0)", "notes (opcional)"]
            },
            {
                "id": "create_task",
                "name": "📌 Nueva Tarea Rápida",
                "desc": "Crea una tarea pendiente en Nicole con área y prioridad.",
                "fields": ["title (obligatorio)", "area ('personal'|'trabajo'|'universidad')", "priority ('low'|'medium'|'high')"]
            },
            {
                "id": "log_weight",
                "name": "⚖️ Registrar Peso Corporal",
                "desc": "Registra el peso de hoy en el historial de mediciones de salud.",
                "fields": ["weight (obligatorio, ej: 62.5)", "notes (opcional)"]
            },
            {
                "id": "log_workout_set",
                "name": "🏋️ Registrar Serie de Gimnasio",
                "desc": "Anota una serie en el entrenamiento de hoy manos libres.",
                "fields": ["exercise_name (obligatorio, ej: 'Sentadilla')", "weight (kilos)", "reps (repeticiones)"]
            },
            {
                "id": "daily_summary",
                "name": "☀️ Resumen del Día",
                "desc": "Genera un texto listo para que Siri lo lea en voz alta con tareas, salud y facu.",
                "fields": []
            },
            {
                "id": "create_reimbursement",
                "name": "💵 Registrar Viático de Campo",
                "desc": "Anota un gasto de transporte o comida en campo.",
                "fields": ["amount (obligatorio, soles)", "concept (obligatorio, ej: 'Taxi a Huachipa')"]
            }
        ]
    }

@eel.expose
def regenerate_shortcut_token():
    """Genera un nuevo token seguro para Atajos de Siri."""
    import secrets
    new_token = secrets.token_hex(16)
    conn = get_connection()
    try:
        conn.execute("INSERT OR REPLACE INTO config (key, value) VALUES ('shortcut_token', ?)", (new_token,))
        conn.commit()
        return {"ok": True, "token": new_token}
    except Exception as e:
        return {"ok": False, "error": str(e)}
    finally:
        conn.close()

@eel.expose
def handle_shortcut_action(action, payload=None):
    """
    Enrutador central de acciones ejecutadas desde Apple Shortcuts / Siri.
    Devuelve siempre un campo 'message' amigable redactado para lectura por voz de Siri.
    """
    if payload is None:
        payload = {}
    elif not isinstance(payload, dict):
        payload = {}

    act = (action or "").strip().lower()

    if act in ("log_injection", "injection", "inyeccion"):
        return _shortcut_log_injection(payload)
    elif act in ("create_task", "task", "tarea"):
        return _shortcut_create_task(payload)
    elif act in ("log_weight", "weight", "peso"):
        return _shortcut_log_weight(payload)
    elif act in ("log_workout_set", "workout_set", "serie", "gym"):
        return _shortcut_log_workout_set(payload)
    elif act in ("daily_summary", "summary", "resumen", "briefing"):
        return _shortcut_daily_summary(payload)
    elif act in ("create_reimbursement", "reimbursement", "viatico", "gasto"):
        return _shortcut_create_reimbursement(payload)
    else:
        return {
            "ok": False,
            "error": f"Acción desconocida: '{action}'",
            "message": f"Acción no reconocida en Nicole: {action}."
        }


def _shortcut_log_injection(payload):
    dose_raw = payload.get("dose_mg") or payload.get("dosis")
    try:
        dose_mg = float(str(dose_raw).replace(",", ".")) if dose_raw else 4.0
    except ValueError:
        dose_mg = 4.0

    inj_date = payload.get("date") or today()
    site = payload.get("injection_site") or payload.get("sitio") or "Glúteo"
    notes = payload.get("notes") or "Registrado vía Atajo de Siri"

    res = create_injection({
        "date": inj_date,
        "dose_mg": dose_mg,
        "injection_site": site,
        "notes": notes
    })
    if not res.get("ok"):
        return {"ok": False, "message": f"No se pudo registrar la inyección: {res.get('error')}"}

    try:
        d_obj = date.fromisoformat(inj_date)
        next_date = d_obj + timedelta(days=7)
        dias_semana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
        dia_nom = dias_semana[next_date.weekday()]
        next_str = f"Próxima dosis recomendada: {dia_nom} {next_date.strftime('%d/%m')}."
    except Exception:
        next_str = ""

    msg = f"Inyección de {dose_mg:.1f} miligramos registrada exitosamente. {next_str}".strip()
    return {
        "ok": True,
        "message": msg,
        "id": res.get("id"),
        "dose_mg": dose_mg,
        "date": inj_date
    }


def _shortcut_create_task(payload):
    title = (payload.get("title") or payload.get("titulo") or "").strip()
    if not title:
        return {"ok": False, "message": "Falta indicar el título de la tarea."}

    area_raw = str(payload.get("area") or payload.get("area_id") or "").lower()
    area_id = 3
    if any(k in area_raw for k in ("trabaj", "lab", "empresa", "pest", "1")):
        area_id = 1
    elif any(k in area_raw for k in ("uni", "facu", "estud", "utn", "2")):
        area_id = 2

    priority = str(payload.get("priority") or payload.get("prioridad") or "medium").lower()
    if priority not in ("low", "medium", "high"):
        priority = "medium"

    due_date = payload.get("due_date") or payload.get("fecha") or None

    res = create_task({
        "title": title,
        "area_id": area_id,
        "priority": priority,
        "due_date": due_date,
        "category": "Atajo Siri"
    })
    if not res.get("ok"):
        return {"ok": False, "message": f"Error al guardar la tarea: {res.get('error')}"}

    nombres_areas = {1: "Trabajo", 2: "Universidad", 3: "Personal"}
    area_nom = nombres_areas.get(area_id, "Personal")
    msg = f"Tarea anotada: '{title}' en el área {area_nom}."
    return {
        "ok": True,
        "message": msg,
        "id": res.get("id"),
        "title": title,
        "area": area_nom
    }


def _shortcut_log_weight(payload):
    w_raw = payload.get("weight") or payload.get("peso")
    if not w_raw:
        return {"ok": False, "message": "Falta indicar el peso en kilogramos."}
    try:
        w = float(str(w_raw).replace(",", "."))
    except ValueError:
        return {"ok": False, "message": "El valor del peso no es un número válido."}

    m_date = payload.get("date") or today()
    notes = payload.get("notes") or "Registrado vía Atajo de Siri"

    res = create_body_measurement({
        "date": m_date,
        "weight": w,
        "notes": notes
    })
    if not res.get("ok"):
        return {"ok": False, "message": f"Error al registrar peso: {res.get('error')}"}

    msg = f"Peso registrado: {w:.1f} kilos en tu historial de salud."
    return {
        "ok": True,
        "message": msg,
        "weight": w,
        "date": m_date
    }


def _shortcut_log_workout_set(payload):
    ex_name = (payload.get("exercise_name") or payload.get("ejercicio") or payload.get("name") or "").strip()
    if not ex_name:
        return {"ok": False, "message": "Falta indicar el nombre del ejercicio."}

    w_raw = payload.get("weight") or payload.get("peso") or 0
    r_raw = payload.get("reps") or payload.get("repeticiones") or 0
    try:
        weight = float(str(w_raw).replace(",", "."))
        reps = int(r_raw)
    except ValueError:
        return {"ok": False, "message": "Peso o repeticiones con formato inválido."}

    t_date = payload.get("date") or today()
    conn = get_connection()
    try:
        sess = conn.execute("SELECT id FROM workout_sessions WHERE date=? ORDER BY id DESC LIMIT 1", (t_date,)).fetchone()
        if sess:
            session_id = sess["id"]
        else:
            cur = conn.execute("""
                INSERT INTO workout_sessions (day_name, date, duration_minutes, notes)
                VALUES ('Sesión Rápida (Siri)', ?, 0, 'Iniciada por Atajo de Siri')
            """, (t_date,))
            session_id = cur.lastrowid

        prev_count = conn.execute("""
            SELECT COUNT(*) as c FROM workout_set_logs WHERE session_id=? AND exercise_name=?
        """, (session_id, ex_name)).fetchone()["c"]
        set_num = prev_count + 1

        conn.execute("""
            INSERT INTO workout_set_logs (session_id, exercise_name, set_number, weight_kg, reps, duration_sec, completed, date)
            VALUES (?, ?, ?, ?, ?, 0, 1, ?)
        """, (session_id, ex_name, set_num, weight, reps, t_date))

        if weight > 0:
            conn.execute("UPDATE workout_exercises SET default_weight_kg=? WHERE name=?", (weight, ex_name))

        _sync_exercise_habits_for_date(conn, t_date)
        conn.commit()

        msg = f"Serie {set_num} de {ex_name} anotada: {weight:.1f} kilos por {reps} repeticiones."
        return {
            "ok": True,
            "message": msg,
            "session_id": session_id,
            "exercise": ex_name,
            "set_number": set_num,
            "weight": weight,
            "reps": reps
        }
    except Exception as e:
        return {"ok": False, "message": f"Error al guardar la serie: {str(e)}"}
    finally:
        conn.close()


def _shortcut_daily_summary(payload=None):
    conn = get_connection()
    try:
        t_date = today()

        # 1. Tareas pendientes
        tasks = conn.execute("""
            SELECT title FROM tasks 
            WHERE status!='completed' AND (due_date<=? OR due_date IS NULL)
            ORDER BY priority DESC, due_date ASC LIMIT 5
        """, (t_date,)).fetchall()
        t_count = len(tasks)

        # 2. Inyección TRH
        last_inj = conn.execute("SELECT date, dose_mg FROM injections ORDER BY date DESC LIMIT 1").fetchone()
        inj_text = ""
        if last_inj:
            last_d = date.fromisoformat(last_inj["date"])
            diff = (date.fromisoformat(t_date) - last_d).days
            if diff >= 7:
                inj_text = f"¡Atención con tu salud! Hoy o ya te toca inyección de estradiol, pasaron {diff} días desde la última."
            else:
                dias_rest = 7 - diff
                dias_semana = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
                proximo_dia = dias_semana[(last_d + timedelta(days=7)).weekday()]
                inj_text = f"Tu última inyección fue hace {diff} días, la próxima toca el {proximo_dia}."

        # 3. Examen UTN FRA
        next_exam = conn.execute("""
            SELECT e.date, e.type, s.name as subject_name
            FROM exams e JOIN subjects s ON e.subject_id=s.id
            WHERE e.date>=? AND e.status='pending'
            ORDER BY e.date ASC LIMIT 1
        """, (t_date,)).fetchone()
        exam_text = ""
        if next_exam:
            ex_d = date.fromisoformat(next_exam["date"])
            days_to_ex = (ex_d - date.fromisoformat(t_date)).days
            if days_to_ex == 0:
                exam_text = f"¡Hoy tienes examen de {next_exam['subject_name']}!"
            elif days_to_ex == 1:
                exam_text = f"Mañana tienes examen de {next_exam['subject_name']}."
            else:
                exam_text = f"Tu próximo examen de la facu es {next_exam['subject_name']} en {days_to_ex} días."

        # 4. Documentos de trabajo por vencer en 15 días
        exp_docs = conn.execute("""
            SELECT ed.doc_type, e.full_name
            FROM employee_documents ed JOIN employees e ON ed.employee_id=e.id
            WHERE ed.expiry_date>=? AND ed.expiry_date<=date(?,'+15 days')
            ORDER BY ed.expiry_date ASC LIMIT 2
        """, (t_date, t_date)).fetchall()
        doc_text = ""
        if exp_docs:
            items = [f"{d['doc_type']} de {d['full_name']}" for d in exp_docs]
            doc_text = f"En operaciones vencen pronto: {', '.join(items)}."

        parts = []
        if t_count == 0:
            parts.append("No tienes tareas pendientes urgentes para hoy.")
        elif t_count == 1:
            parts.append("Tienes 1 tarea pendiente para hoy.")
        else:
            parts.append(f"Tienes {t_count} tareas pendientes para hoy.")

        if inj_text:
            parts.append(inj_text)
        if exam_text:
            parts.append(exam_text)
        if doc_text:
            parts.append(doc_text)

        spoken = " ".join(parts)
        return {
            "ok": True,
            "message": spoken,
            "task_count": t_count,
            "date": t_date
        }
    except Exception as e:
        return {"ok": False, "message": f"Error al generar resumen: {str(e)}"}
    finally:
        conn.close()


def _shortcut_create_reimbursement(payload):
    amt_raw = payload.get("amount") or payload.get("monto")
    if not amt_raw:
        return {"ok": False, "message": "Falta indicar el monto del viático."}
    try:
        amount = float(str(amt_raw).replace(",", "."))
    except ValueError:
        return {"ok": False, "message": "Monto inválido."}

    concept = (payload.get("concept") or payload.get("concepto") or "Gasto en campo (Siri)").strip()
    conn = get_connection()
    try:
        emp_id = payload.get("employee_id")
        if not emp_id:
            emp = conn.execute("SELECT id FROM employees WHERE is_active=1 ORDER BY id ASC LIMIT 1").fetchone()
            if not emp:
                emp = conn.execute("SELECT id FROM employees ORDER BY id ASC LIMIT 1").fetchone()
            if not emp:
                cur_emp = conn.execute("INSERT INTO employees (full_name, position, is_active) VALUES ('Personal Principal', 'Operador', 1)")
                emp_id = cur_emp.lastrowid
            else:
                emp_id = emp["id"]
        else:
            emp_id = int(emp_id)

        cur = conn.execute("""
            INSERT INTO reimbursements (employee_id, date, concept, amount, status)
            VALUES (?, ?, ?, ?, 'pending')
        """, (emp_id, today(), concept, amount))
        conn.commit()
        msg = f"Viático de S/ {amount:.2f} registrado para '{concept}'."
        return {"ok": True, "message": msg, "id": cur.lastrowid, "amount": amount}
    except Exception as e:
        return {"ok": False, "message": f"Error al guardar el viático: {str(e)}"}
    finally:
        conn.close()


