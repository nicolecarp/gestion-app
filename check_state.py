from database import get_connection
conn = get_connection()
tables = [r[0] for r in conn.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall()]
print('Tables:', sorted(tables))
print('quotes schema:', [(r[1], r[2]) for r in conn.execute('PRAGMA table_info(quotes)').fetchall()])
print('Service types:', [dict(r) for r in conn.execute('SELECT * FROM service_types').fetchall()])
print('Service desc count:', conn.execute('SELECT count(*) FROM service_descriptions').fetchone()[0])
print('Quotes:', [dict(r) for r in conn.execute('SELECT id, number, client_id, status FROM quotes').fetchall()])
print('Quote items:', [dict(r) for r in conn.execute('SELECT id, quote_id, description_text FROM quote_items').fetchall()])
conn.close()
