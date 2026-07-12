from database import get_connection
from datetime import date, timedelta

conn = get_connection()
cur = conn.cursor()

tasks = [
    (1, 1, 'Revisar stock de productos quimicos', '2026-07-08'),
    (2, 1, 'Enviar cotizacion a cliente nuevo', '2026-07-10'),
    (3, 1, 'Llamar a Lindley para coordinar planta', '2026-07-14'),
    (4, 1, 'Actualizar Excel de entradas/salidas', '2026-07-11'),
    (5, 2, 'Estudiar para parcial de Analisis Matematico', '2026-07-20'),
    (6, 2, 'Entregar TP grupal de Fisica', '2026-07-15'),
    (7, 3, 'Comprar regalo de cumpleaños', '2026-07-12'),
    (8, 3, 'Sacar turno medico', '2026-07-18'),
]

for task in tasks:
    conn.execute(
        "INSERT OR IGNORE INTO tasks (id, area_id, title, due_date) VALUES (?, ?, ?, ?)",
        task
    )

conn.execute("INSERT OR IGNORE INTO employees (id, full_name, document_number, position, sede_operativa, responsable) VALUES (1, 'Carlos Mendoza', 'DNI 12345678', 'Fumigador', 'LIMA', 'SUP_LIMA')")
conn.execute("INSERT OR IGNORE INTO employees (id, full_name, document_number, position, sede_operativa, responsable) VALUES (2, 'Maria Lopez', 'DNI 23456789', 'Supervisora', 'LIMA', 'SUP_LIMA')")
conn.execute("INSERT OR IGNORE INTO employees (id, full_name, document_number, position, sede_operativa, responsable) VALUES (3, 'Jose Garcia', 'DNI 34567890', 'Fumigador', 'LIMA', 'SUP_LIMA')")
conn.execute("INSERT OR IGNORE INTO employees (id, full_name, document_number, position, sede_operativa, responsable) VALUES (4, 'Kevin Zamora', 'DNI 45678901', 'Fumigador', 'LIMA', 'SUP_LIMA')")
conn.execute("INSERT OR IGNORE INTO employees (id, full_name, document_number, position, sede_operativa, responsable) VALUES (5, 'Victor Huaman', 'DNI 56789012', 'Fumigador', 'LIMA', 'SUP_LIMA')")
conn.execute("INSERT OR IGNORE INTO employees (id, full_name, document_number, position, sede_operativa, responsable) VALUES (6, 'Bryan Medina', 'DNI 67890123', 'Fumigador', 'LIMA', 'SUP_LIMA')")

conn.execute("INSERT OR IGNORE INTO employee_documents (id, employee_id, doc_type, expiry_date) VALUES (1, 1, 'MATPEL', '2026-08-15')")
conn.execute("INSERT OR IGNORE INTO employee_documents (id, employee_id, doc_type, expiry_date) VALUES (2, 1, 'EMO', '2026-06-30')")
conn.execute("INSERT OR IGNORE INTO employee_documents (id, employee_id, doc_type, expiry_date) VALUES (3, 2, 'Induccion', '2026-09-01')")
conn.execute("INSERT OR IGNORE INTO employee_documents (id, employee_id, doc_type, expiry_date) VALUES (4, 3, 'MATPEL', '2026-07-05')")

conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (1, '20123456789', 'Lindley S.A.', 'Juan Perez', '999-123-456')")
conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (2, '20987654321', 'Restaurante El Marino', 'Pedro Diaz', '998-765-432')")
conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (3, '20567890123', 'AC LOGISTICA DEL PERU', 'Maria Torres', '999-456-789')")
conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (4, '20456789012', 'INDUSTRIA DEL ENVASE S.A.C.', 'Carlos Ruiz', '998-345-678')")
conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (5, '20345678901', 'VEND SAC', 'Luisa Gomez', '997-234-567')")
conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (6, '20234567890', 'TOPITOP S.A.', 'Roberto Silva', '996-123-456')")
conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (7, '20123456780', 'CORPORACION VEGA E.I.R.L.', 'Ana Vega', '995-987-654')")
conn.execute("INSERT OR IGNORE INTO clients (id, ruc, business_name, contact_name, phone) VALUES (8, '20678901234', 'FITESA S.A.', 'Pedro Diaz', '994-876-543')")

# Client sites
sites = [
    (1, 'ACL', 'ZA', 'ACL-ZA', 'ARCA CONTINENTAL LINDLEY - ZARATE', 'ZARATE', None, 1, 2500.00, 'Fumigación, Desinfección, Desratización'),
    (1, 'ACL', 'AT', 'ACL-AT', 'ARCA CONTINENTAL LINDLEY - ATE', 'ATE', None, 1, 1800.00, 'Fumigación'),
    (3, 'ALD', 'DU', 'ALD-DU', 'AC LOGISTICA DEL PERU - DUEÑAS', 'DUEÑAS', None, 1, 3200.00, 'Fumigación, Desratización, Control de plagas'),
    (3, 'ALD', 'VI', 'ALD-VI', 'AC LOGISTICA DEL PERU - VILLA EL SALVADOR', 'VILLA EL SALVADOR', None, 1, 2800.00, 'Fumigación, Desinfección'),
    (3, 'ALD', 'HU', 'ALD-HU', 'AC LOGISTICA DEL PERU - HUACHIPA', 'HUACHIPA', None, 1, 3500.00, 'Fumigación, Desratización, Control integral'),
    (4, 'IDE', 'CA', 'IDE-CA', 'INDUSTRIA DEL ENVASE - CALLAO', 'CALLAO', None, 1, 1500.00, 'Fumigación, Desinfección'),
    (5, 'VSA', 'LI', 'VSA-LI', 'VEND SAC - OFICINAS LIMA', 'LIMA', None, 0, 800.00, 'Desinfección'),
    (6, 'TOP', 'SA', 'TOP-SA', 'TOPITOP - SAN JUAN DE LURIGANCHO', 'SAN JUAN DE LURIGANCHO', None, 1, 2200.00, 'Fumigación, Desratización, Desinfección'),
    (7, 'CVE', 'SA', 'CVE-SA', 'CORPORACION VEGA - SAN JUAN DE LURIGANCHO', 'SAN JUAN DE LURIGANCHO', None, 0, 0, 'Fumigación'),
    (8, 'FIT', 'HU', 'FIT-HU', 'FITESA - HUACHIPA', 'HUACHIPA', None, 1, 1800.00, 'Fumigación, Control de plagas'),
]
for s in sites:
    conn.execute("""INSERT OR IGNORE INTO client_sites
        (client_id, codigo_cliente, codigo_sede, codigo_cliente_sede, nombre_cliente, sede_cliente, distrito, is_regular, monthly_fee, servicios)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", s)

# Service records (sample data for week 2 of 2026)
import random
employees_srv = [1,3,4,5,6]
client_site_ids = conn.execute("SELECT id FROM client_sites").fetchall()
client_site_ids = [r['id'] for r in client_site_ids]
start_date = date(2026, 1, 5)  # Monday of week 2
for day_offset in range(5):
    d = start_date + timedelta(days=day_offset)
    ds = d.isoformat()
    for emp_id in employees_srv:
        if random.random() < 0.6:
            cs_id = random.choice(client_site_ids) if client_site_ids else None
            h_ing = f"{random.randint(7,10)}:{random.randint(0,59):02d}"
            h_sal = f"{random.randint(14,18)}:{random.randint(0,59):02d}"
            h1,m1 = map(int, h_ing.split(':'))
            h2,m2 = map(int, h_sal.split(':'))
            total_min = (h2*60+m2) - (h1*60+m1) - 60
            traslado = random.randint(20, 60)
            t_comp = min(traslado, 60)
            h_trab = round(max(total_min,0)/60 + t_comp/60, 2)
            conn.execute("""
                INSERT OR IGNORE INTO service_records
                (fecha, employee_id, client_site_id, hora_ingreso, hora_salida, evidencia,
                 traslado_min, horas_trabajadas, status, semana, año)
                VALUES (?,?,?,?,?,?,?,?,'completed',?,?)
            """, (ds, emp_id, cs_id, h_ing, h_sal,
                  1 if random.random() < 0.8 else 0, traslado, h_trab, 2, 2026))

conn.execute("INSERT OR IGNORE INTO lindley_contacts (id, plant, contact_name, email, phone) VALUES (1, 'Ate', 'Maria Torres', 'mtorres@lindley.com', '999-111-222')")
conn.execute("INSERT OR IGNORE INTO lindley_contacts (id, plant, contact_name, email, phone) VALUES (2, 'Villa El Salvador', 'Carlos Ruiz', 'cruiz@lindley.com', '999-333-444')")

conn.execute("INSERT OR IGNORE INTO subjects (id, name, professor, year) VALUES (1, 'Analisis Matematico I', 'Prof. Gomez', 2026)")
conn.execute("INSERT OR IGNORE INTO subjects (id, name, professor, year) VALUES (2, 'Fisica I', 'Prof. Rodriguez', 2026)")
conn.execute("INSERT OR IGNORE INTO subjects (id, name, professor, year) VALUES (3, 'Quimica General', 'Prof. Martinez', 2026)")

conn.execute("INSERT OR IGNORE INTO exams (id, subject_id, type, date, status) VALUES (1, 1, 'Parcial', '2026-07-20', 'pending')")
conn.execute("INSERT OR IGNORE INTO exams (id, subject_id, type, date, status) VALUES (2, 2, 'Parcial', '2026-07-22', 'pending')")
conn.execute("INSERT OR IGNORE INTO exams (id, subject_id, type, date, status) VALUES (3, 3, 'Parcial', '2026-07-25', 'pending')")

conn.execute("INSERT OR IGNORE INTO assignments (id, subject_id, title, due_date, group_name) VALUES (1, 2, 'TP N°1 - Pendulo', '2026-07-15', 'Grupo 3')")
conn.execute("INSERT OR IGNORE INTO assignments (id, subject_id, title, due_date, group_name) VALUES (2, 3, 'TP N°1 - Tabla periodica', '2026-07-18', 'Grupo 2')")

# Injections: every Saturday Oct 2025 - Jun 2026, 4mg enantate SC
from datetime import date, timedelta
inj_date = date(2025, 10, 4)  # First Saturday of Oct 2025
end_date = date(2026, 6, 26)
idx = 1
while inj_date <= end_date:
    if inj_date.weekday() == 5:  # Saturday
        conn.execute("INSERT OR IGNORE INTO injections (id, date, dose_mg, injection_site) VALUES (?, ?, 4.0, 'Subcutánea abdominal')",
                     (idx, inj_date.isoformat()))
        idx += 1
        inj_date += timedelta(days=7)
    else:
        inj_date += timedelta(days=1)

conn.execute("INSERT OR IGNORE INTO habits (id, name, streak) VALUES (1, 'Leer 15 min', 5)")
conn.execute("INSERT OR IGNORE INTO habits (id, name, streak) VALUES (2, 'Meditar', 3)")

# Service types and descriptions
service_types_data = [
    ('Desinsectación', 'Control de insectos rastreros y voladores', 'Insecticida'),
    ('Desinfección', 'Control de patógenos y sanitización', 'Desinfectante'),
    ('Desratización', 'Control de roedores', 'Rodenticida'),
    ('Control Aviar', 'Control de aves plaga', 'Disuasivos'),
    ('Mantenimiento de Trampas de Luz', 'Monitoreo de insectocutores', 'Trampas'),
    ('Limpieza de Tanques', 'Limpieza y desinfección de tanques de agua', 'Limpieza'),
]
for t in service_types_data:
    conn.execute('INSERT OR IGNORE INTO service_types (name, description, category) VALUES (?, ?, ?)', t)

st = {}
for r in conn.execute('SELECT id, name FROM service_types').fetchall():
    st[r['name']] = r['id']

descriptions = [
    (st['Desinsectación'], 'Corta - General c/vehículo',
     'Paso 1: Inspección y Diagnóstico.\nSe realiza una revisión visual para localizar focos de infestación y rutas de tránsito de insectos, tanto en las estructuras de las instalaciones como en la cabina y zona de carga del vehículo.\n\nPaso 2: Aplicación por Asperción.\nSe utiliza el método de asperción líquida para cubrir perímetros, zócalos y rincones críticos. En el vehículo, se aplica el producto en superficies bajas, alfombras y compartimentos internos para garantizar una cobertura total contra insectos rastreros y voladores.\n\nPaso 3: Reporte de Servicio.\nAl terminar, se entrega un informe con las zonas tratadas y los hallazgos principales, sumado a recomendaciones sobre higiene y sellado para evitar que las plagas regresen al entorno o a la unidad.',
     'DC 4060', 'Atomizador'),
    (st['Desinsectación'], 'Media - Con monitoreo',
     'Paso 1: Inspección y Diagnóstico Inicial.\nSe realiza una inspección exhaustiva para evaluar el entorno, detectar riesgos de proliferación y definir un programa de servicios. Las frecuencias de intervención se acuerdan previamente con las áreas encargadas.\n\nPaso 2: Ejecución y Monitoreo.\nSegún el diagnóstico, se aplican los métodos más adecuados (pulverización, atomización o equipos ULV), complementados con geles, atrayentes o pegantes. Paralelamente, se realiza un monitoreo periódico de las trampas de luz y pegantes, llevando un conteo de capturas para evaluar la situación en tiempo real.\n\nPaso 3: Informe de Resultados.\nAl finalizar, se presenta un reporte detallado que analiza las áreas con mayor incidencia de plagas. Se incluyen recomendaciones específicas de mejora estructural o de hábitos para mantener el entorno libre de infestaciones.',
     'DC 4060, Bloom, Tell 50', 'Pulverizador, Atomizador, ULV'),
    (st['Desinsectación'], 'Larga - Diagnóstico detallado',
     'Paso 1: Inspección y Diagnóstico Inicial.\nSe realiza una inspección exhaustiva del área a tratar, donde se identifica el estatus actual del entorno y se generan diagnósticos detallados. Durante esta fase, también se detectan oportunidades de mejora para el control preventivo de plagas, minimizando el riesgo de aparición o proliferación. Con base en la inspección, se elabora un programa de servicios, especificando las frecuencias de intervención, las cuales se acuerdan con las áreas encargadas y las partes involucradas.\n\nPaso 2: Ejecución del Servicio de Desinsectación.\nSegún el programa establecido, se procede con la desinsectación utilizando los métodos más adecuados, como pulverización, atomización o equipos ULV, de acuerdo con la evaluación del área realizada previamente por el Supervisor a cargo. Además, se evalúa la aplicación de otros métodos complementarios, como pegantes, atrayentes, geles u otros, según las características específicas de la planta o almacén.\n\nPaso 3: Informe de Resultados y Recomendaciones.\nAl finalizar el servicio, se presenta un informe detallado que incluye un análisis de las áreas con mayor incidencia de plagas y capturas de insectos. También se brindan recomendaciones específicas sobre mejoras que la empresa puede implementar para optimizar el control de plagas y mantener un entorno libre de infestaciones.',
     'DC 4060, Bloom, Tell 50, Compact Health', 'Pulverizador, Atomizador, ULV'),
    (st['Desinsectación'], 'Piojos de Paloma',
     'Paso 1: Inspección y Diagnóstico Inicial.\nSe realiza una inspección exhaustiva en aleros, techos, grietas y ventanas para localizar los focos de piojos de paloma y sus rutas de migración hacia el interior.\n\nPaso 2: Ejecución mediante Pulverización y Asperción.\nAsperción: Se aplica una lluvia fina de gotas medianas sobre superficies abiertas, techos y zonas de anidación para crear una barrera residual.\nPulverización: Se utiliza presión focalizada para introducir el químico en grietas, fisuras, zócalos y marcos de ventanas.\n\nPaso 3: Informe de Resultados.\nSe presenta un reporte detallado con recomendaciones técnicas sobre la frecuencia de reaplicación.',
     'DC 4060', 'Atomizador, Pulverizador'),
    (st['Desinsectación'], 'Termonebulización',
     'Paso 1: Inspección y Diagnóstico Inicial.\nSe realiza una inspección para evaluar el entorno y definir frecuencias de intervención.\n\nPaso 2: Ejecución.\nSe aplica termonebulización en áreas de comedor, cocina y almacén.\n\nPaso 3: Informe de Resultados.\nSe presentan recomendaciones de mejora estructural.',
     'DC 4060', 'Termonebulizadora'),
    (st['Desinfección'], 'Completa - Instalaciones y vehículos',
     'Paso 1: Identificación de Áreas Críticas.\nSe determinan los puntos de mayor contacto físico en instalaciones y vehículos.\n\nPaso 2: Tratamiento de Sanitización.\nAsperción de agentes desinfectantes de amplio espectro (virucidas y bactericidas).\n\nPaso 3: Constancia de Higiene.\nSe emite certificado de desinfección.',
     'Betagen, Skillquat Plus, DMQ', 'Atomizador'),
    (st['Desinfección'], 'Completa - Solo instalaciones',
     'Paso 1: Identificación de Áreas Críticas en SSHH y áreas comunes.\n\nPaso 2: Tratamiento de Sanitización con virucidas y bactericidas.\n\nPaso 3: Constancia de Higiene.',
     'Betagen, Skillquat Plus', 'Atomizador'),
    (st['Desinfección'], 'Breve - SSHH y vestuarios',
     'Sanitización de Áreas Críticas en SSHH y vestuarios para asegurar un ambiente seguro para el personal.',
     'Betagen', 'Atomizador'),
    (st['Desratización'], 'Completa - 3 pasos',
     'Paso 1: Diagnóstico e Instalación de Dispositivos (cebaderos, trampas pegantes, jaulas mecánicas).\n\nPaso 2: Mantenimiento y Estrategia de Control (evaluación de consumos/capturas, fase de ataque químico a físico).\n\nPaso 3: Informe y Plan de Acción.',
     'Klerat, Roe Mat, Bio Rat', 'Cebaderos, trampas, jaulas'),
    (st['Desratización'], 'Detallada - Con instalación',
     'Primer Paso: Inspección y Diagnóstico exhaustivo.\nInstalación de Dispositivos numerados con plano de ubicación.\n\nSegundo Paso: Mantenimiento y Evaluación (conteo de consumos y atrapes).\n\nTercer Paso: Informe y Plan de Acción por área.',
     'Klerat Bloques, Roe Mat', 'Cebaderos con llave, tubulares'),
    (st['Control Aviar'], 'Completo - Estaciones disuasivas',
     'Paso 1: Instalación de Estaciones Disuasivas en puntos estratégicos.\n\nPaso 2: Evaluación y Mantenimiento Periódico (inspección, limpieza).\n\nPaso 3: Registro y Reporte de Eficacia.',
     'Aves rapaces, ahuyentadores', 'Cometas, jaulas, estaciones'),
    (st['Control Aviar'], 'Breve - Cometas y globos',
     'Control de aves plagas con globos y cometas disuasivas. Incluye extracción sanitaria.',
     'Elementos disuasivos', 'Cometas, globos'),
    (st['Mantenimiento de Trampas de Luz'], 'Estándar',
     'Mantenimiento periódico de trampas de luz. Limpieza de rejillas y tubos UV, conteo de capturas. No incluye pegantes.',
     'Pegantes (no incluido)', 'Trampas de luz'),
    (st['Limpieza de Tanques'], 'Estándar',
     'Limpieza y desinfección de tanques de agua: vaciado, lavado mecánico, desinfección, enjuague. Se entrega certificado.',
     'Betagen, Skillquat Plus', 'Hidrolavadora, bombas'),
]
for d in descriptions:
    conn.execute('''INSERT OR IGNORE INTO service_descriptions (service_type_id, name, description_text, productos, equipos) VALUES (?, ?, ?, ?, ?)''', d)

# Demo quote
today = date.today()
conn.execute('''INSERT INTO quotes (number, client_id, client_site_id, issue_date, valid_until, payment_terms, subtotal, igv, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
    ('COT ' + today.strftime('%Y%m%d.1'), 3, 5, today.isoformat(), (today + timedelta(days=15)).isoformat(), 'CREDITO A 30 DIAS', 2300, 414, 2714, 'borrador'))
conn.execute('''INSERT INTO quote_items (quote_id, service_type_id, description_id, description_text, quantity, unit_price, total, sort_order)
    VALUES (1, 1, 1, 'DESINSECTACION Y DESINFECCION GENERAL', 1, 1500, 1500, 1)''')
conn.execute('''INSERT INTO quote_items (quote_id, service_type_id, description_id, description_text, quantity, unit_price, total, sort_order)
    VALUES (1, 3, 9, 'CONTROL DE ROEDORES', 4, 200, 800, 2)''')

conn.execute("INSERT OR IGNORE INTO config (key, value) VALUES ('print3d_price_per_gram', '1.5')")
conn.execute("INSERT OR IGNORE INTO config (key, value) VALUES ('print3d_price_per_hour', '5.0')")

# Demo invoices (last 6 months for regular clients)
import random as rnd
rnd.seed(42)
regular_sites = conn.execute("SELECT cs.id, cs.client_id, cs.monthly_fee FROM client_sites cs WHERE cs.is_regular=1").fetchall()
for site in regular_sites:
    site_id = site['id']
    parent_id = site['client_id'] or site_id
    fee = site['monthly_fee'] or 1000
    for offset in range(6):
        if rnd.random() < 0.75:
            m = ((date.today().month - 1 - offset) % 12) + 1
            y = date.today().year - (1 if (date.today().month - 1 - offset) < 0 else 0)
            amount = round(fee * rnd.uniform(0.9, 1.1), 2)
            igv = round(amount * 0.18, 2)
            total = round(amount + igv, 2)
            conn.execute("""
                INSERT OR IGNORE INTO invoices
                (client_id, client_site_id, series, number, service, payment_type, amount, igv, total, issue_date, status, month_billed, year_billed)
                VALUES (?, ?, 'F001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                parent_id, site_id,
                str(rnd.randint(100, 999)),
                'Servicio mensual de fumigación',
                rnd.choice(['contado', 'credito']),
                amount, igv, total,
                f"{y}-{m:02d}-{rnd.randint(1, 28):02d}",
                rnd.choice(['paid', 'paid', 'issued']),
                m, y
            ))

conn.commit()
conn.close()

print("Demo data seeded successfully!")
