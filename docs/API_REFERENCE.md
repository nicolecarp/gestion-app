# Catálogo de Referencia de API — Nicole

Todas las funciones listadas en este documento están implementadas en `api.py` y decoradas con `@eel.expose`.
- **En Escritorio**: Se invocan a través de `eel.nombre_funcion(...args)()`.
- **En la Nube**: El shim `/eel.js` intercepta la llamada y la traduce a `POST /api/nombre_funcion` con carga útil `{ args: [...] }`.
- **En el Frontend**: La función envoltorio estándar es:
  ```javascript
  const res = await api(eel.nombre_funcion, arg1, arg2);
  ```

---

## 📑 Módulos de la API
1. [Tareas](#1-tareas)
2. [Clientes y Sedes](#2-clientes-y-sedes)
3. [Facturación SUNAT](#3-facturación-sunat)
4. [Órdenes de Compra (OC)](#4-órdenes-de-compra-oc)
5. [Cotizaciones y Generador Word](#5-cotizaciones-y-generador-word)
6. [Catálogo de Servicios](#6-catálogo-de-servicios)
7. [Personal y Documentación de Seguridad](#7-personal-y-documentación-de-seguridad)
8. [Asistencia en Campo y KPIs Semanales](#8-asistencia-en-campo-y-kpis-semanales)
9. [Viáticos y Horas Extras](#9-viáticos-y-horas-extras)
10. [Lindley & Formularios](#10-lindley--formularios)
11. [Universidad UTN FRA](#11-universidad-utn-fra)
12. [Hábitos y Productividad](#12-hábitos-y-productividad)
13. [Dashboard y Calendario](#13-dashboard-y-calendario)
14. [Salud, TRH y Curva de Estradiol](#14-salud-trh-y-curva-de-estradiol)
15. [Entrenamiento & Gimnasio](#15-entrenamiento--gimnasio)
16. [Taller de Cosplays](#16-taller-de-cosplays)
17. [Configuración y Sistema](#17-configuración-y-sistema)
18. [Finanzas Personales & Meta Operación](#18-finanzas-personales--meta-operación)

---

## 1. Tareas

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_tasks(area_id=None)` | `area_id` (opcional int: 1, 2, 3) | `[dict]` | Obtiene la lista de tareas pendientes ordenadas por fecha límite ascendente |
| `create_task(data)` | `data` (`title`, `area_id`, `category`, `description`, `due_date`, `priority`, `reminder_days`) | `{'ok': True, 'id': int}` | Crea una nueva tarea |
| `update_task(id, data)` | `id` (int), `data` (`title`, `category`, `description`, `due_date`, `priority`, `reminder_days`) | `{'ok': True}` | Modifica los campos de una tarea |
| `complete_task(id)` | `id` (int) | `{'ok': True}` | Marca la tarea con `status='completed'` |
| `delete_task(id)` | `id` (int) | `{'ok': True}` | Elimina físicamente la tarea |
| `get_completed_tasks(area_id=None)` | `area_id` (opcional) | `[dict]` | Devuelve las últimas tareas terminadas |

---

## 2. Clientes y Sedes

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_clients()` | Ninguno | `[dict]` | Lista todos los clientes con resumen de facturación y sedes |
| `create_client(data)` | `data` (`business_name`, `ruc`, `contact_name`, `phone`, `email`, `address`, `notes`, `is_regular`, `monthly_fee`, `servicios`) | `{'ok': True, 'id': int}` | Registra un nuevo cliente |
| `update_client(id, data)` | `id`, `data` | `{'ok': True}` | Actualiza datos del cliente |
| `delete_client(id)` | `id` | `{'ok': True}` | Elimina un cliente |
| `get_client_sites(only_active=True)` | `only_active` (bool) | `[dict]` | Obtiene sedes con nombre y RUC del cliente |
| `get_client_sites_grouped()` | Ninguno | `[dict]` | Obtiene clientes agrupados con sus respectivas sedes anidadas |
| `get_client_site(id)` | `id` (int) | `dict` | Obtiene los datos detallados de una sede específica |
| `create_client_site(data)` | `data` (`client_id`, `codigo_cliente`, `codigo_sede`, `sede_cliente`, `distrito`, `is_regular`, `monthly_fee`, `servicios`, ...) | `{'ok': True, 'id': int}` | Registra una nueva sede con código autogenerado |
| `update_client_site(id, data)` | `id`, `data` | `{'ok': True}` | Actualiza la sede |
| `delete_client_site(id)` | `id` | `{'ok': True}` | Elimina la sede |

---

## 3. Facturación SUNAT

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_invoices()` | Ninguno | `[dict]` | Obtiene el listado completo de facturas con datos del cliente y sede |
| `create_invoice(data)` | `data` (`client_id`, `client_site_id`, `series`, `number`, `service`, `payment_type`, `amount`, `igv`, `total`, `detraccion`, `credito`, `purchase_order`, `month_billed`, `year_billed`, ...) | `{'ok': True, 'id': int}` | Registra una factura y actualiza la OC vinculada a estado `invoiced` |
| `update_invoice(id, data)` | `id`, `data` | `{'ok': True}` | Actualiza los datos de una factura existente |
| `delete_invoice(id)` | `id` | `{'ok': True}` | Elimina el registro de una factura |
| `get_monthly_billing(year)` | `year` (int) | `{'matrix': [...], 'totals': {...}}` | Devuelve la matriz anual de facturación (12 meses) agrupada por cliente y sede |

---

## 4. Órdenes de Compra (OC)

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_purchase_orders(year, month=None, client_id=None)` | `year` (int), filtros opcionales | `[dict]` | Obtiene órdenes de compra registradas con datos de cliente y sede |
| `save_purchase_order(data)` | `data` (`client_id`, `client_site_id`, `year`, `month`, `oc_number`, `amount`, `status`, `notes`, `id` opcional) | `{'ok': True, 'id': int}` | Inserta o actualiza una orden de compra |
| `delete_purchase_order(id)` | `id` | `{'ok': True}` | Elimina una orden de compra |

---

## 5. Cotizaciones y Generador Word

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_quotes(status=None)` | `status` (opcional) | `[dict]` | Obtiene las cotizaciones registradas |
| `get_quote(id)` | `id` | `dict` con cotización y lista de `items` | Retorna el detalle completo de un presupuesto |
| `create_quote(data)` | `data` (`client_id`, `client_site_id`, `issue_date`, `valid_until`, `payment_terms`, `items`) | `{'ok': True, 'id': int, 'number': str}` | Crea cotización con correlativo automático |
| `update_quote(id, data)` | `id`, `data` | `{'ok': True}` | Modifica cabecera de la cotización |
| `delete_quote(id)` | `id` | `{'ok': True}` | Elimina la cotización y sus ítems en cascada |
| `add_quote_item(quote_id, data)` | `quote_id`, `data` | `{'ok': True, 'id': int}` | Agrega un ítem y recalcula subtotales e IGV |
| `update_quote_item(id, data)` | `id`, `data` | `{'ok': True}` | Modifica un ítem y recalcula la cotización |
| `delete_quote_item(id)` | `id` | `{'ok': True}` | Borra un ítem y recalcula totales |
| `recalc_quote_totals(quote_id)` | `quote_id` | `{'subtotal': float, 'igv': float, 'total': float}` | Recalcula importes basados en la suma de los ítems |
| `generate_quote_word(quote_id)` | `quote_id` | `{'ok': True, 'filename': str, 'file_base64': str}` | Fusiona datos con `templates/cotizacion_base.docx` y entrega el binario codificado en Base64 |
| `convert_quote_to_invoice(quote_id)` | `quote_id` | `{'ok': True, 'invoice_id': int}` | Convierte una cotización aprobada en factura en borrador |

---

## 6. Catálogo de Servicios

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_service_types()` | Ninguno | `[dict]` | Catálogo de tipos de servicios principales |
| `create_service_type(data)` | `data` (`name`, `description`, `default_price`, `category`) | `{'ok': True, 'id': int}` | Crea un tipo de servicio |
| `update_service_type(id, data)`| `id`, `data` | `{'ok': True}` | Modifica el tipo de servicio |
| `delete_service_type(id)` | `id` | `{'ok': True}` | Elimina el tipo de servicio |
| `get_service_descriptions(service_type_id=None)` | `service_type_id` | `[dict]` | Textos técnicos, productos y equipos para cotizaciones |
| `create_service_description(data)`| `data` | `{'ok': True, 'id': int}` | Crea una descripción técnica |
| `update_service_description(id, data)`| `id`, `data` | `{'ok': True}` | Actualiza la descripción técnica |
| `delete_service_description(id)`| `id` | `{'ok': True}` | Borra la descripción técnica |
| `get_client_services(client_id)`| `client_id` | `[dict]` | Tarifas asignadas a un cliente específico |
| `set_client_services(client_id, services)` | `client_id`, `services` (`[dict]`) | `{'ok': True}` | Actualiza masivamente las tarifas de un cliente |

---

## 7. Personal y Documentación de Seguridad

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_employees(active_only=False)` | `active_only` (bool) | `[dict]` | Lista de técnicos y supervisores con conteo de documentos por vencer |
| `create_employee(data)` | `data` (`full_name`, `document_number`, `position`, `sede_operativa`, `responsable`, ...) | `{'ok': True, 'id': int}` | Registra un nuevo colaborador |
| `update_employee(id, data)` | `id`, `data` | `{'ok': True}` | Actualiza ficha de empleado |
| `toggle_employee_active(id)` | `id` | `{'ok': True, 'is_active': int}` | Alterna estado activo/inactivo |
| `delete_employee(id)` | `id` | `{'ok': True}` | Borra un empleado |
| `get_employee_documents(employee_id)` | `employee_id` | `[dict]` | Lista acreditaciones (MATPEL, EMO, etc.) y semáforo de vencimiento |
| `create_employee_document(data)` | `data` (`employee_id`, `doc_type`, `doc_number`, `issue_date`, `expiry_date`, `notes`) | `{'ok': True, 'id': int}` | Registra documento obligatorio |
| `upload_employee_document_file(id, file_b64, file_name, file_type)` | `id`, binarios en base64 | `{'ok': True}` | Almacena el archivo digital adjunto en la base de datos |
| `get_employee_document_file(id)` | `id` | `{'file_data': b64, 'file_name': str, 'file_type': str}` | Descarga el archivo adjunto |
| `delete_employee_document(id)` | `id` | `{'ok': True}` | Elimina el documento |

---

## 8. Asistencia en Campo y KPIs Semanales

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_service_records(fecha, employee_id=None, status=None)` | Fecha (YYYY-MM-DD) y filtros | `[dict]` | Marcaciones de campo con horas trabajadas y traslados |
| `clock_in(data)` | `data` (`fecha`, `employee_id`, `client_site_id`, `hora_ingreso`) | `{'ok': True, 'id': int}` | Registro de entrada de técnico a planta |
| `complete_service_record(id, data)`| `id`, `data` (`hora_salida`, `evidencia`, `observaciones`, `traslado_min`) | `{'ok': True}` | Cierre de marcación con cálculo de horas |
| `get_daily_control(fecha)` | `fecha` (YYYY-MM-DD) | `[dict]` | Consolidado diario de asistencia por sede y supervisor |
| `sync_daily_control(fecha, employee_id)` | `fecha`, `employee_id` | `{'ok': True}` | Recalcula el libro diario a partir de las marcaciones |
| `get_weekly_kpi(semana, año)` | `semana` (int), `año` (int) | `{'kpis': [...], 'meta': float}` | Ponderación de horas efectivas y cumplimiento de evidencia fotográfica |

---

## 9. Viáticos y Horas Extras

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_reimbursements()` | Ninguno | `[dict]` | Rendiciones de gastos y viáticos del personal |
| `create_reimbursement(data)` | `data` (`employee_id`, `date`, `concept`, `amount`) | `{'ok': True, 'id': int}` | Registra un viático |
| `update_reimbursement(id, data)` | `id`, `data` | `{'ok': True}` | Actualiza monto o estado |
| `delete_reimbursement(id)` | `id` | `{'ok': True}` | Elimina un viático |
| `get_overtime()` | Ninguno | `[dict]` | Lista solicitudes de horas extras |
| `create_overtime(data)` | `data` (`employee_id`, `date`, `days`, `reason`) | `{'ok': True, 'id': int}` | Registra horas/días extraordinarios |
| `update_overtime(id, data)` | `id`, `data` | `{'ok': True}` | Modifica o aprueba horas extras |
| `delete_overtime(id)` | `id` | `{'ok': True}` | Elimina solicitud de horas extras |

---

## 10. Lindley & Formularios

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_lindley_contacts()` | Ninguno | `[dict]` | Directorio de contactos en plantas Lindley |
| `create_lindley_contact(data)` | `data` (`plant`, `contact_name`, `email`, `phone`, `notes`) | `{'ok': True, 'id': int}` | Agrega contacto a la agenda |
| `update_lindley_contact(id, data)`| `id`, `data` | `{'ok': True}` | Actualiza contacto |
| `delete_lindley_contact(id)` | `id` | `{'ok': True}` | Elimina contacto |
| `get_lindley_forms()` | Ninguno | `[dict]` | Historial de formularios mensuales de inspección |
| `create_lindley_form(data)` | `data` (`month`, `year`, `notes`, `status`) | `{'ok': True, 'id': int}` | Crea registro de formulario |
| `update_lindley_form(id, data)` | `id`, `data` | `{'ok': True}` | Actualiza estado de presentación |
| `get_lindley_validation(year, month)` | `year`, `month` | `{'ok': True, 'invoiced': bool, 'form_submitted': bool, ...}` | Validación cruzada de OC vs Factura vs Formulario |

---

## 11. Universidad UTN FRA

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_curriculum_status()` | Ninguno | `[dict]` | Devuelve el estado de las 42 materias de la malla Plan 2023 |
| `update_curriculum_status(subject_id, status, grade, note)` | `subject_id`, `status` (`APROBADA`, `REGULAR`, `CURSANDO`, etc.), `grade`, `note` | `{'ok': True}` | Actualiza el avance en la malla interactiva |
| `get_subjects()` | Ninguno | `[dict]` | Asignaturas cursadas en el período actual con conteo de parciales y entregas |
| `create_subject(data)` | `data` (`name`, `professor`, `schedule`, `year`) | `{'ok': True, 'id': int}` | Registra cursada |
| `update_subject(id, data)` | `id`, `data` | `{'ok': True}` | Modifica datos de cursada |
| `delete_subject(id)` | `id` | `{'ok': True}` | Elimina la materia |
| `get_exams(subject_id=None)` | `subject_id` (opcional) | `[dict]` | Lista de exámenes con cuenta regresiva en días |
| `create_exam(data)` | `data` (`subject_id`, `type`, `date`, `time`, `topic`) | `{'ok': True, 'id': int}` | Agenda un examen |
| `update_exam(id, data)` | `id`, `data` | `{'ok': True}` | Modifica fecha o calificación de examen |
| `delete_exam(id)` | `id` | `{'ok': True}` | Borra el examen |
| `get_assignments(subject_id=None)`| `subject_id` (opcional) | `[dict]` | Trabajos prácticos y proyectos grupales |
| `create_assignment(data)` | `data` (`subject_id`, `title`, `due_date`, `group_name`, ...) | `{'ok': True, 'id': int}` | Registra entrega académica |
| `update_assignment(id, data)` | `id`, `data` | `{'ok': True}` | Actualiza entrega |
| `delete_assignment(id)` | `id` | `{'ok': True}` | Elimina entrega |

---

## 12. Hábitos y Productividad

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_habits()` | Ninguno | `[dict]` | Lista de hábitos activos con cálculo de racha actual |
| `create_habit(data)` | `data` (`name`, `frequency`) | `{'ok': True, 'id': int}` | Crea nuevo hábito |
| `delete_habit(id)` | `id` | `{'ok': True}` | Elimina el hábito |
| `toggle_habit_today(habit_id)` | `habit_id` | `{'ok': True, 'completed': bool, 'streak': int}` | Marca o desmarca el cumplimiento del día y recalcula racha |
| `get_habit_logs(year, habit_id=None)` | `year`, `habit_id` | `[dict]` | Historial para renderizar mapa de calor o cuadrícula anual |

---

## 13. Dashboard y Calendario

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_dashboard_stats()` | Ninguno | `{'tasks_pending': int, 'exams_near': int, 'habits_done': int, 'invoices_summary': {...}}` | Métricas consolidadas para la pantalla de inicio |
| `get_weather_data(lat, lon)` | `lat` (float, opcional), `lon` (float, opcional) | `{'ok': True, 'data': {...}}` | Consulta el pronóstico en tiempo real y extendido de Open-Meteo para el dashboard |
| `get_calendar_events(year, month)` | `year` (int), `month` (int) | `[dict]` | Consolida en una sola lista tareas, exámenes, inyecciones, sesiones de gimnasio y entregas del mes |
| `get_today_tasks()` | Ninguno | `[dict]` | Tareas con vencimiento para el día actual |
| `get_soon_deadlines()` | Ninguno | `[dict]` | Tareas y exámenes que vencen en los próximos 7 días |

---

## 14. Salud, TRH y Curva de Estradiol

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_injections()` | Ninguno | `[dict]` | Historial de inyecciones de valerato de estradiol |
| `create_injection(data)` | `data` (`date`, `dose_mg`, `injection_site`, `notes`) | `{'ok': True, 'id': int}` | Registra una dosis aplicada |
| `delete_injection(id)` | `id` | `{'ok': True}` | Elimina un registro de inyección |
| `get_estradiol_projection()` | Ninguno | `{'dates': [...], 'levels': [...], 'current_level': float}` | Simulación farmacocinética bi-exponencial de niveles séricos de estradiol (pg/mL) |
| `get_body_measurements()` | Ninguno | `[dict]` | Histórico de mediciones antropométricas |
| `create_body_measurement(data)` | `data` (`date`, `weight`, `bideltoid_cm`, `bust_cm`, `waist_cm`, `hips_cm`, ...) | `{'ok': True, 'id': int}` | Registra nueva medición corporal |
| `delete_body_measurement(id)` | `id` | `{'ok': True}` | Borra medición |
| `get_measurement_goals()` | Ninguno | `dict` | Metas objetivo de contorno y peso |
| `save_measurement_goals(goals)`| `goals` (dict) | `{'ok': True}` | Guarda metas objetivo |

---

## 15. Entrenamiento & Gimnasio

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_workout_routine()` | Ninguno | `[dict]` con días y ejercicios | Estructura de la rutina semanal de entrenamiento |
| `save_workout_day(data)` | `data` (`name`, `subtitle`, `warmup_notes`, `cooldown_notes`, ...) | `{'ok': True, 'id': int}` | Crea o modifica un día de entrenamiento |
| `delete_workout_day(day_id)` | `day_id` | `{'ok': True}` | Elimina el día y sus ejercicios en cascada |
| `save_workout_exercise(data)` | `data` (`day_id`, `name`, `phase`, `sets`, `reps_text`, `equipment`, `default_weight_kg`, ...) | `{'ok': True, 'id': int}` | Inserta o edita un ejercicio en la rutina |
| `delete_workout_exercise(ex_id)` | `ex_id` | `{'ok': True}` | Elimina un ejercicio |
| `log_workout_session(data)` | `data` (`day_id`, `date`, `duration_minutes`, `notes`, `sets`: `[{exercise_name, set_number, weight_kg, reps}]`) | `{'ok': True, 'id': int}` | Guarda una sesión completa con sus cargas y sincroniza el hábito de entrenamiento |
| `get_workout_history()` | Ninguno | `[dict]` | Historial cronológico de sesiones completadas |
| `get_workout_progress()` | Ninguno | `{'exercises': {...}}` | Evolución de cargas máximas (1RM estimado / peso levantado) por ejercicio |
| `delete_workout_session(id)` | `id` | `{'ok': True}` | Elimina una sesión del historial |

---

## 16. Taller de Cosplays

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_cosplay_projects()` | Ninguno | `[dict]` con lista de `items` | Proyectos de cosplay con costos y avance de confección |
| `save_cosplay_project(data)` | `data` (`character_name`, `series_name`, `client_name`, `price`, `deposit`, `materials_cost`, `due_date`, `status`, ...) | `{'ok': True, 'id': int}` | Guarda o actualiza proyecto |
| `delete_cosplay_project(id)` | `id` | `{'ok': True}` | Elimina el proyecto y sus piezas |
| `add_cosplay_item(data)` | `data` (`project_id`, `name`, `item_type`, `cost`, `done`) | `{'ok': True, 'id': int}` | Agrega un material, accesorio o pieza |
| `toggle_cosplay_item(item_id)` | `item_id` | `{'ok': True, 'done': int}` | Alterna el estado de confección de la pieza |
| `delete_cosplay_item(item_id)` | `item_id` | `{'ok': True}` | Elimina el ítem |
| `get_cosplay_clients()` | Ninguno | `[dict]` | Catálogo de clientes con ficha de medidas corporales |
| `save_cosplay_client(data)` | `data` (`name`, `contact`, `size_measurements`, `notes`) | `{'ok': True, 'id': int}` | Guarda cliente |
| `delete_cosplay_client(id)` | `id` | `{'ok': True}` | Borra cliente |

---

## 17. Configuración y Sistema

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_config(key)` | `key` (str) | `str` o `None` | Lee un valor de la tabla `config` |
| `set_config(key, value)` | `key` (str), `value` (str) | `{'ok': True}` | Establece o sobrescribe un parámetro |
| `get_all_config()` | Ninguno | `{key: value, ...}` | Devuelve todos los parámetros del sistema |
| `lookup_ruc(ruc)` | `ruc` (str de 11 dígitos) | `{'ok': True, 'data': {...}}` | Consulta RUC en API pública para autocompletar razón social |
| `generate_description_ia(...)`| Datos de servicio | `{'ok': True, 'description': str}` | Genera redacción técnica de servicio mediante LLaMA local o API |
| `check_reload()` | Ninguno | `bool` | Usado por el frontend en escritorio para saber si hubo cambios de código |
| `get_lan_info()` | Ninguno | `{'ip': str, 'port': int, 'url': str}` | Obtiene la IP local para conectar el iPhone vía red Wi-Fi |
| `sync_cloud_from_github()` | Ninguno | `{'ok': bool, 'output': str}` | Ejecuta `git pull` y recarga WSGI en la nube desde Ajustes |

---

## 18. Finanzas Personales & Meta Operación

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_finance_summary(month, year)` | `month` (opcional), `year` (opcional) | `{'ok': True, 'total_income': float, 'total_expense': float, 'net_balance': float, 'expenses_by_category': list, 'incomes_by_category': list, 'accounts': list, 'goal': dict, 'transactions': list}` | Resumen mensual consolidado en ARS, saldos de cuentas en vivo y estado de la meta en USD |
| `get_finance_transactions(filters)` | `filters` (dict opcional) | `list[dict]` | Historial de transacciones con filtros por mes/año, cuenta, categoría, tipo o texto de búsqueda |
| `create_finance_transaction(data)` | `data` (dict) | `{'ok': True, 'id': int}` | Registra gasto, ingreso, transferencia entre cuentas o aporte directo a la meta |
| `update_finance_transaction(id, data)` | `id` (int), `data` (dict) | `{'ok': True}` | Actualiza monto, fecha, cuenta o detalles de un movimiento |
| `delete_finance_transaction(id)` | `id` (int) | `{'ok': True}` | Elimina una transacción |
| `get_finance_accounts()` | Ninguno | `list[dict]` | Lista de cuentas activas con saldo real calculado en tiempo real |
| `create_finance_account(data)` | `data` (dict) | `{'ok': True, 'id': int}` | Crea una nueva cuenta o billetera (ej. Mercado Pago, Efectivo, Banco) |
| `update_finance_account(id, data)` | `id` (int), `data` (dict) | `{'ok': True}` | Modifica nombre, tipo, saldo inicial o ícono de la cuenta |
| `delete_finance_account(id)` | `id` (int) | `{'ok': True}` | Desactiva o borra una cuenta |
| `get_finance_categories()` | Ninguno | `list[dict]` | Catálogo de categorías para gastos e ingresos |
| `create_finance_category(data)` | `data` (dict) | `{'ok': True, 'id': int}` | Añade una categoría de gasto o ingreso |
| `delete_finance_category(id)` | `id` (int) | `{'ok': True}` | Elimina o desactiva una categoría |
| `get_finance_goals()` | Ninguno | `dict` | Consulta el estado de la Meta Operación en USD con desglose de aportes |
| `update_finance_goal(id, data)` | `id` (int), `data` (dict) | `{'ok': True}` | Actualiza objetivo USD, ahorro base inicial, cotización de referencia y fecha |
| `add_goal_contribution(data)` | `data` (dict) | `{'ok': True, 'id': int}` | Registra un aporte directo a la Meta Operación convirtiendo USD/ARS al vuelo |
| `get_finance_debts()` | Ninguno | `{'ok': True, 'debts': list, 'summary': dict}` | Lista de deudas, desglose de pagos y métricas de avance y saldo pendiente |
| `create_finance_debt(data)` | `data` (dict) | `{'ok': True, 'id': int}` | Crea una nueva deuda (título, acreedor, monto total, cuotas, notas) |
| `update_finance_debt(id, data)` | `id` (int), `data` (dict) | `{'ok': True}` | Modifica los datos de una deuda |
| `delete_finance_debt(id)` | `id` (int) | `{'ok': True}` | Borra una deuda y sus pagos |
| `pay_finance_debt(data)` | `data` (dict) | `{'ok': True}` | Registra un abono/cuota, debita de la cuenta elegida e incrementa avance |
| `delete_debt_payment(id)` | `id` (int) | `{'ok': True}` | Anula un pago de deuda y revierte la transacción generada |
| `get_finance_recurring(month, year)` | `month`, `year` | `{'ok': True, 'recurring': list, 'summary': dict}` | Gastos fijos con estado Pagado/Pendiente/Vencido para el mes indicado |
| `create_finance_recurring(data)` | `data` (dict) | `{'ok': True, 'id': int}` | Registra un gasto fijo habitual (nombre, categoría, día de vencimiento, monto) |
| `update_finance_recurring(id, data)` | `id` (int), `data` (dict) | `{'ok': True}` | Actualiza los parámetros de un gasto fijo |
| `delete_finance_recurring(id)` | `id` (int) | `{'ok': True}` | Elimina un gasto fijo |
| `mark_recurring_paid(data)` | `data` (dict) | `{'ok': True}` | Marca como pagado el gasto fijo e impacta el gasto en la cuenta bancaria |
| `unmark_recurring_paid(id)` | `id` (int) | `{'ok': True}` | Desmarca el pago de un gasto fijo |
| `get_finance_salaries(year)` | `year` (opcional) | `{'ok': True, 'months': list, 'summary': dict}` | Comparativa anual mensual de sueldo esperado/pactado vs cobrado y diferencias |
| `save_finance_salary(data)` | `data` (dict) | `{'ok': True}` | Carga/edita liquidación de sueldo de un mes y sincroniza el ingreso bancario |
| `delete_finance_salary(id)` | `id` (int) | `{'ok': True}` | Elimina el registro de sueldo de un mes |

---

## 19. Atajos de Siri & Integración Apple

| Función | Parámetros | Retorno | Descripción |
| :--- | :--- | :--- | :--- |
| `get_shortcut_info()` | Ninguno | `{'ok': True, 'token': str, 'shortcut_endpoint': str, 'actions': list}` | Retorna el token actual y endpoints para configurar Atajos de Siri |
| `regenerate_shortcut_token()` | Ninguno | `{'ok': True, 'token': str}` | Genera un nuevo token seguro invalidando el anterior |
| `handle_shortcut_action(action, payload)` | `action` (str), `payload` (dict) | `{'ok': True, 'message': str, ...}` | Ejecuta la acción solicitada desde Apple Shortcuts con respuesta redactada para voz de Siri |


