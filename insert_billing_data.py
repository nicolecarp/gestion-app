import sqlite3
import os

db_path = r'c:\GESTION\gestion.db'
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Configuration note: Cuenta de detracción del Banco de la Nación
cursor.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", 
               ('cta_detraccion_1', '00046317769'))
cursor.execute("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", 
               ('cta_detraccion_2', '00771005578'))

clients_data = [
    {
        'ruc': '20516702649',
        'business_name': 'SUR COLOR STAR S.A.',
        'is_regular': 1,
        'monthly_fee': 800.00,
        'servicios': 'Control Aviar',
        'notes': 'Servicio mensual S/ 800.00 sin IGV. OC Septiembre: 8600033006',
        'sites': [
            {
                'codigo_cliente': 'SCS',
                'codigo_sede': 'PRIN',
                'codigo_cliente_sede': 'SCS-PRIN',
                'nombre_cliente': 'SUR COLOR STAR - SEDE PRINCIPAL',
                'sede_cliente': 'SEDE PRINCIPAL',
                'location_code': '',
                'distrito': '',
                'is_regular': 1,
                'monthly_fee': 800.00,
                'servicios': 'Control Aviar',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '',
                        'service': 'Control Aviar',
                        'payment_type': 'credito',
                        'amount': 800.00,
                        'igv': 144.00,
                        'total': 944.00,
                        'detraccion': 113.28,
                        'credito': 830.72,
                        'purchase_order': '8600033006',
                        'location_code': '',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            }
        ]
    },
    {
        'ruc': '20100047056',
        'business_name': 'TOPY TOP S.A.',
        'is_regular': 1,
        'monthly_fee': 750.00,
        'servicios': 'Control Aviar',
        'notes': 'Servicio mensual S/ 750.00 sin IGV. OC Septiembre: 8600033002',
        'sites': [
            {
                'codigo_cliente': 'TOP',
                'codigo_sede': 'PRIN',
                'codigo_cliente_sede': 'TOP-PRIN',
                'nombre_cliente': 'TOPY TOP - SEDE PRINCIPAL',
                'sede_cliente': 'SEDE PRINCIPAL',
                'location_code': '',
                'distrito': '',
                'is_regular': 1,
                'monthly_fee': 750.00,
                'servicios': 'Control Aviar',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '',
                        'service': 'Control Aviar',
                        'payment_type': 'credito',
                        'amount': 750.00,
                        'igv': 135.00,
                        'total': 885.00,
                        'detraccion': 106.20,
                        'credito': 778.80,
                        'purchase_order': '8600033002',
                        'location_code': '',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            }
        ]
    },
    {
        'ruc': '20101024645',
        'business_name': 'ARCA CONTINENTAL LINDLEY S.A.',
        'is_regular': 1,
        'monthly_fee': 40500.00,
        'servicios': 'SERV CONTROL DE PLAGAS',
        'notes': 'Grupo Lindley - Plantas Industriales Embotelladoras',
        'sites': [
            {
                'codigo_cliente': 'ACL',
                'codigo_sede': 'PUC',
                'codigo_cliente_sede': 'ACL-PUC',
                'nombre_cliente': 'ARCA CONTINENTAL LINDLEY - PLANTA PUCUSANA',
                'sede_cliente': 'PLANTA PUCUSANA',
                'location_code': '84',
                'distrito': 'Pucusana',
                'is_regular': 1,
                'monthly_fee': 14700.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1845',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 14700.00,
                        'igv': 2646.00,
                        'total': 17346.00,
                        'detraccion': 2081.52,
                        'credito': 15264.48,
                        'purchase_order': '4501201335',
                        'location_code': '84',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ACL',
                'codigo_sede': 'ZAR',
                'codigo_cliente_sede': 'ACL-ZAR',
                'nombre_cliente': 'ARCA CONTINENTAL LINDLEY - PLANTA ZARATE',
                'sede_cliente': 'PLANTA ZARATE',
                'location_code': '1',
                'distrito': 'San Juan de Lurigancho',
                'is_regular': 1,
                'monthly_fee': 7140.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '9570',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 7140.00,
                        'igv': 1285.20,
                        'total': 8425.20,
                        'detraccion': 1011.02,
                        'credito': 7414.18,
                        'purchase_order': '4501203340',
                        'location_code': '1',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ACL',
                'codigo_sede': 'TRU',
                'codigo_cliente_sede': 'ACL-TRU',
                'nombre_cliente': 'ARCA CONTINENTAL LINDLEY - PLANTA TRUJILLO',
                'sede_cliente': 'PLANTA TRUJILLO',
                'location_code': '74',
                'distrito': 'Trujillo',
                'is_regular': 1,
                'monthly_fee': 8510.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1850',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 8510.00,
                        'igv': 1531.80,
                        'total': 10041.80,
                        'detraccion': 1205.02,
                        'credito': 8836.78,
                        'purchase_order': '4501201100',
                        'location_code': '74',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ACL',
                'codigo_sede': 'AQP',
                'codigo_cliente_sede': 'ACL-AQP',
                'nombre_cliente': 'ARCA CONTINENTAL LINDLEY - PLANTA AREQUIPA',
                'sede_cliente': 'PLANTA AREQUIPA',
                'location_code': '31',
                'distrito': 'Arequipa',
                'is_regular': 1,
                'monthly_fee': 5150.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1851',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 5150.00,
                        'igv': 927.00,
                        'total': 6077.00,
                        'detraccion': 729.24,
                        'credito': 5347.76,
                        'purchase_order': '4501201057',
                        'location_code': '31',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ACL',
                'codigo_sede': 'CUZ',
                'codigo_cliente_sede': 'ACL-CUZ',
                'nombre_cliente': 'ARCA CONTINENTAL LINDLEY - PLANTA CUSCO',
                'sede_cliente': 'PLANTA CUSCO',
                'location_code': '32',
                'distrito': 'Cusco',
                'is_regular': 1,
                'monthly_fee': 5000.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1852',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 5000.00,
                        'igv': 900.00,
                        'total': 5900.00,
                        'detraccion': 708.00,
                        'credito': 5192.00,
                        'purchase_order': '4501200921',
                        'location_code': '32',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            }
        ]
    },
    {
        'ruc': '20610033033',
        'business_name': 'AC CORPORATIVO DEL PERU S.A.C.',
        'is_regular': 1,
        'monthly_fee': 1200.00,
        'servicios': 'SERV CONTROL DE PLAGAS',
        'notes': 'Grupo Lindley - Oficinas Administrativas y Sedes',
        'sites': [
            {
                'codigo_cliente': 'ACC',
                'codigo_sede': 'RIM',
                'codigo_cliente_sede': 'ACC-RIM',
                'nombre_cliente': 'AC CORPORATIVO - RIMAC',
                'sede_cliente': 'RIMAC',
                'location_code': '2',
                'distrito': 'Rimac',
                'is_regular': 1,
                'monthly_fee': 600.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 600.00,
                        'igv': 108.00,
                        'total': 708.00,
                        'detraccion': 84.96,
                        'credito': 623.04,
                        'purchase_order': '',
                        'location_code': '2',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ACC',
                'codigo_sede': 'MOL',
                'codigo_cliente_sede': 'ACC-MOL',
                'nombre_cliente': 'AC CORPORATIVO - LA MOLINA',
                'sede_cliente': 'LA MOLINA',
                'location_code': '',
                'distrito': 'La Molina',
                'is_regular': 1,
                'monthly_fee': 600.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 600.00,
                        'igv': 108.00,
                        'total': 708.00,
                        'detraccion': 84.96,
                        'credito': 623.04,
                        'purchase_order': '',
                        'location_code': '',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            }
        ]
    },
    {
        'ruc': '20605957375',
        'business_name': 'AC LOGISTICA DEL PERU S.A.C.',
        'is_regular': 1,
        'monthly_fee': 12550.00,
        'servicios': 'SERV CONTROL DE PLAGAS',
        'notes': 'Grupo Lindley - Centros de Distribución (CEDI)',
        'sites': [
            {
                'codigo_cliente': 'ALD',
                'codigo_sede': 'HUA',
                'codigo_cliente_sede': 'ALD-HUA',
                'nombre_cliente': 'AC LOGISTICA - CEDI HUACHIPA',
                'sede_cliente': 'CEDI HUACHIPA',
                'location_code': '1',
                'distrito': 'Huachipa',
                'is_regular': 1,
                'monthly_fee': 3680.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '9573',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 3680.00,
                        'igv': 662.40,
                        'total': 4342.40,
                        'detraccion': 521.09,
                        'credito': 3821.31,
                        'purchase_order': '4501201113',
                        'location_code': '1',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ALD',
                'codigo_sede': 'DUE',
                'codigo_cliente_sede': 'ALD-DUE',
                'nombre_cliente': 'AC LOGISTICA - CEDI DUEÑAS',
                'sede_cliente': 'CEDI DUEÑAS',
                'location_code': '3',
                'distrito': 'Cercado de Lima',
                'is_regular': 1,
                'monthly_fee': 2940.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '9571',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 2940.00,
                        'igv': 529.20,
                        'total': 3469.20,
                        'detraccion': 416.30,
                        'credito': 3052.90,
                        'purchase_order': '4501203465',
                        'location_code': '3',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ALD',
                'codigo_sede': 'VES',
                'codigo_cliente_sede': 'ALD-VES',
                'nombre_cliente': 'AC LOGISTICA - CEDI VES',
                'sede_cliente': 'CEDI VES',
                'location_code': '2',
                'distrito': 'Villa El Salvador',
                'is_regular': 1,
                'monthly_fee': 3680.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '9572',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 3680.00,
                        'igv': 662.40,
                        'total': 4342.40,
                        'detraccion': 521.09,
                        'credito': 3821.31,
                        'purchase_order': '4501203463',
                        'location_code': '2',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ALD',
                'codigo_sede': 'TRU',
                'codigo_cliente_sede': 'ALD-CTRU',
                'nombre_cliente': 'AC LOGISTICA - CEDI TRUJILLO',
                'sede_cliente': 'CEDI TRUJILLO',
                'location_code': '1',
                'distrito': 'Trujillo',
                'is_regular': 1,
                'monthly_fee': 960.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1853',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 960.00,
                        'igv': 172.80,
                        'total': 1132.80,
                        'detraccion': 135.94,
                        'credito': 996.86,
                        'purchase_order': '4501203073',
                        'location_code': '1',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ALD',
                'codigo_sede': 'PUC',
                'codigo_cliente_sede': 'ALD-CPUC',
                'nombre_cliente': 'AC LOGISTICA - CEDI PUCUSANA',
                'sede_cliente': 'CEDI PUCUSANA',
                'location_code': '',
                'distrito': 'Pucusana',
                'is_regular': 1,
                'monthly_fee': 1290.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 1290.00,
                        'igv': 232.20,
                        'total': 1522.20,
                        'detraccion': 182.66,
                        'credito': 1339.54,
                        'purchase_order': '',
                        'location_code': '',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            }
        ]
    },
    {
        'ruc': '20114050025',
        'business_name': 'EMBOTELLADORA LA SELVA S.A.C.',
        'is_regular': 1,
        'monthly_fee': 5475.00,
        'servicios': 'SERV CONTROL DE PLAGAS',
        'notes': 'Grupo Lindley - Embotelladora La Selva (Inca Kola Iquitos)',
        'sites': [
            {
                'codigo_cliente': 'ELS',
                'codigo_sede': 'IQT',
                'codigo_cliente_sede': 'ELS-IQT',
                'nombre_cliente': 'EMBOTELLADORA LA SELVA - IQUITOS',
                'sede_cliente': 'IQUITOS',
                'location_code': '1',
                'distrito': 'Iquitos',
                'is_regular': 1,
                'monthly_fee': 4225.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1847',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 4225.00,
                        'igv': 760.50,
                        'total': 4985.50,
                        'detraccion': 598.26,
                        'credito': 4387.24,
                        'purchase_order': '6300011728',
                        'location_code': '1',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ELS',
                'codigo_sede': 'CIQ',
                'codigo_cliente_sede': 'ELS-CIQ',
                'nombre_cliente': 'EMBOTELLADORA LA SELVA - CEDI IQUITOS',
                'sede_cliente': 'CEDI IQUITOS',
                'location_code': '9',
                'distrito': 'Iquitos',
                'is_regular': 1,
                'monthly_fee': 1250.00,
                'servicios': 'SERV CONTROL DE PLAGAS',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1848',
                        'service': 'SERV CONTROL DE PLAGAS',
                        'payment_type': 'credito',
                        'amount': 1250.00,
                        'igv': 225.00,
                        'total': 1475.00,
                        'detraccion': 177.00,
                        'credito': 1298.00,
                        'purchase_order': '6300011729',
                        'location_code': '9',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            },
            {
                'codigo_cliente': 'ELS',
                'codigo_sede': 'ADI',
                'codigo_cliente_sede': 'ELS-ADI',
                'nombre_cliente': 'EMBOTELLADORA LA SELVA - ADICIONALES',
                'sede_cliente': 'ADICIONALES',
                'location_code': '1',
                'distrito': 'Iquitos',
                'is_regular': 0,
                'monthly_fee': 0.00,
                'servicios': 'SERV CONTROL DE PLAGAS (ADICIONAL)',
                'invoices': [
                    {
                        'series': 'E001',
                        'number': '1849',
                        'service': 'SERV CONTROL DE PLAGAS (ADICIONAL)',
                        'payment_type': 'credito',
                        'amount': 1420.00,
                        'igv': 255.60,
                        'total': 1675.60,
                        'detraccion': 201.07,
                        'credito': 1474.53,
                        'purchase_order': '6300011730',
                        'location_code': '1',
                        'issue_date': '2026-09-30',
                        'due_date': '2026-10-30',
                        'month_billed': 9,
                        'year_billed': 2026,
                        'status': 'issued'
                    }
                ]
            }
        ]
    }
]

inserted_clients = 0
inserted_sites = 0
inserted_invoices = 0

for cdata in clients_data:
    # Check if client already exists by RUC
    existing = cursor.execute("SELECT id FROM clients WHERE ruc=?", (cdata['ruc'],)).fetchone()
    if existing:
        client_id = existing['id']
        cursor.execute("""
            UPDATE clients SET business_name=?, is_regular=?, monthly_fee=?, servicios=?, notes=?
            WHERE id=?
        """, (cdata['business_name'], cdata['is_regular'], cdata['monthly_fee'], cdata['servicios'], cdata['notes'], client_id))
    else:
        cursor.execute("""
            INSERT INTO clients (ruc, business_name, is_regular, monthly_fee, servicios, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (cdata['ruc'], cdata['business_name'], cdata['is_regular'], cdata['monthly_fee'], cdata['servicios'], cdata['notes']))
        client_id = cursor.lastrowid
        inserted_clients += 1

    for sdata in cdata['sites']:
        site_ex = cursor.execute("SELECT id FROM client_sites WHERE codigo_cliente_sede=?", (sdata['codigo_cliente_sede'],)).fetchone()
        if site_ex:
            site_id = site_ex['id']
            cursor.execute("""
                UPDATE client_sites SET client_id=?, codigo_cliente=?, codigo_sede=?, nombre_cliente=?,
                    sede_cliente=?, location_code=?, distrito=?, is_regular=?, monthly_fee=?, servicios=?
                WHERE id=?
            """, (client_id, sdata['codigo_cliente'], sdata['codigo_sede'], sdata['nombre_cliente'],
                  sdata['sede_cliente'], sdata['location_code'], sdata['distrito'], sdata['is_regular'],
                  sdata['monthly_fee'], sdata['servicios'], site_id))
        else:
            cursor.execute("""
                INSERT INTO client_sites (client_id, codigo_cliente, codigo_sede, codigo_cliente_sede,
                    nombre_cliente, sede_cliente, location_code, distrito, is_regular, monthly_fee, servicios)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (client_id, sdata['codigo_cliente'], sdata['codigo_sede'], sdata['codigo_cliente_sede'],
                  sdata['nombre_cliente'], sdata['sede_cliente'], sdata['location_code'], sdata['distrito'],
                  sdata['is_regular'], sdata['monthly_fee'], sdata['servicios']))
            site_id = cursor.lastrowid
            inserted_sites += 1

        for idata in sdata.get('invoices', []):
            # Check duplicate by (client_site_id, month_billed, year_billed, purchase_order)
            inv_ex = cursor.execute("""
                SELECT id FROM invoices 
                WHERE client_site_id=? AND month_billed=? AND year_billed=? AND 
                      (purchase_order=? OR (purchase_order IS NULL AND ?=''))
            """, (site_id, idata['month_billed'], idata['year_billed'], idata['purchase_order'], idata['purchase_order'])).fetchone()
            
            if not inv_ex:
                cursor.execute("""
                    INSERT INTO invoices (client_id, client_site_id, series, number, service, payment_type,
                        amount, igv, total, detraccion, credito, purchase_order, location_code,
                        issue_date, due_date, month_billed, year_billed, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (client_id, site_id, idata['series'], idata['number'], idata['service'], idata['payment_type'],
                      idata['amount'], idata['igv'], idata['total'], idata['detraccion'], idata['credito'],
                      idata['purchase_order'], idata['location_code'], idata['issue_date'], idata['due_date'],
                      idata['month_billed'], idata['year_billed'], idata['status']))
                inserted_invoices += 1

conn.commit()
conn.close()

print(f"Insertion complete: {inserted_clients} clients created, {inserted_sites} sites created, {inserted_invoices} invoices created.")
