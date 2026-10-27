# Diccionario de Base de Datos — Nicole ERP

La base de datos del sistema está implementada en **SQLite 3** (`gestion.db`), configurada con `PRAGMA journal_mode=WAL` para alta concurrencia y `PRAGMA foreign_keys = ON` para integridad referencial estricta.

Total de tablas activas: **47 tablas**.

---

## 📑 Índice por Dominios
1. [Trabajo & Facturación Comercial SUNAT](#1-trabajo--facturación-comercial-sunat)
2. [Personal Operativo, Seguridad y Asistencia](#2-personal-operativo-seguridad-y-asistencia)
3. [Universidad (UTN FRA)](#3-universidad-utn-fra)
4. [Salud, TRH y Entrenamiento](#4-salud-trh-y-entrenamiento)
5. [Finanzas Personales & Meta Operación](#5-finanzas-personales--meta-operación)
6. [Taller de Cosplays](#6-taller-de-cosplays)
7. [Productividad Personal & Tareas](#7-productividad-personal--tareas)
8. [Configuración del Sistema](#8-configuración-del-sistema)

---

## 1. Trabajo & Facturación Comercial SUNAT

### `clients`
Registra empresas o personas jurídicas contratantes.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador único del cliente |
| `ruc` | TEXT | | Número de RUC (11 dígitos para Perú) |
| `business_name`| TEXT | NOT NULL | Razón social oficial |
| `contact_name` | TEXT | | Nombre del contacto comercial |
| `phone` | TEXT | | Teléfono de contacto |
| `email` | TEXT | | Correo electrónico de cobranza/contacto |
| `address` | TEXT | | Dirección fiscal registrada |
| `notes` | TEXT | | Condiciones comerciales o notas generales |
| `is_regular` | INTEGER | DEFAULT 0 | 1 = Cliente recurrente mensual, 0 = Eventual |
| `monthly_fee` | REAL | | Tarifa mensual estándar acordada (sin IGV) |
| `servicios` | TEXT | | Descripción resumen de servicios contratados |
| `created_at` | TEXT | DEFAULT datetime | Fecha y hora de registro local |

### `client_sites`
Sedes operativas o plantas pertenecientes a cada cliente.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Identificador de la sede |
| `client_id` | INTEGER | FK -> `clients(id)` | Cliente propietario de la sede |
| `codigo_cliente` | TEXT | | Prefijo del cliente (ej. `ACL`, `ALD`, `SCS`) |
| `codigo_sede` | TEXT | | Código de sede (ej. `ZA`, `AT`, `DU`, `PRIN`) |
| `codigo_cliente_sede`| TEXT | UNIQUE | Código unificado (ej. `ACL-ZA`, `SCS-PRIN`) |
| `nombre_cliente` | TEXT | | Nombre descriptivo del cliente y sede |
| `sede_cliente` | TEXT | | Nombre de la planta / distrito de la sede |
| `distrito` | TEXT | | Distrito geográfico |
| `location_code` | TEXT | | Código de ubicación interna / almacén |
| `is_regular` | INTEGER | DEFAULT 0 | 1 si la sede tiene facturación mensual fija |
| `monthly_fee` | REAL | | Importe mensual contratado para la sede |
| `servicios` | TEXT | | Listado de servicios aplicados a la sede |
| `contract_start`| TEXT | | Fecha inicio de contrato |
| `contract_end` | TEXT | | Fecha fin de contrato |
| `is_active` | INTEGER | DEFAULT 1 | 1 = Sede activa, 0 = Inactiva |

### `service_types`
Catálogo de tipos de servicios principales.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID del tipo de servicio |
| `name` | TEXT | NOT NULL | Nombre (ej. *Desinsectación*, *Desratización*, *Control Aviar*) |
| `description` | TEXT | | Alcance del servicio |
| `default_price`| REAL | | Precio base de referencia |
| `category` | TEXT | | Categoría química / operativa |
| `created_at` | TEXT | DEFAULT datetime | Fecha de creación |

### `service_descriptions`
Descripciones técnicas detalladas, productos químicos y equipos para cada tipo de servicio.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID de la descripción |
| `service_type_id` | INTEGER | FK -> `service_types(id)` | Tipo de servicio asociado |
| `name` | TEXT | NOT NULL | Título o variante técnica |
| `description_text` | TEXT | NOT NULL | Redacción técnica para la cotización |
| `productos` | TEXT | | Listado de ingredientes activos / productos químicos |
| `equipos` | TEXT | | Listado de máquinas y equipos de aplicación |
| `created_at` | TEXT | DEFAULT datetime | Fecha de registro |

### `client_services`
Tarifas personalizadas por cliente para un tipo de servicio específico.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID del servicio asignado |
| `client_id` | INTEGER | FK -> `clients(id)` | Cliente |
| `service_type_id` | INTEGER | FK -> `service_types(id)` | Tipo de servicio |
| `custom_price` | REAL | | Precio acordado con el cliente |
| `notes` | TEXT | | Observaciones |

### `invoices`
Facturas electrónicas emitidas según normativa tributaria SUNAT.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID de la factura |
| `client_id` | INTEGER | FK -> `clients(id)` | Cliente facturado |
| `client_site_id` | INTEGER | FK -> `client_sites(id)` | Sede específica facturada |
| `series` | TEXT | | Serie del comprobante (ej. `E001`) |
| `number` | TEXT | | Número correlativo |
| `service` | TEXT | | Glosa o concepto principal facturado |
| `payment_type` | TEXT | | `contado` o `credito` |
| `amount` | REAL | | Subtotal (base imponible sin IGV) |
| `igv` | REAL | | Impuesto General a las Ventas (18%) |
| `total` | REAL | | Importe total facturado (`amount + igv`) |
| `detraccion` | REAL | DEFAULT 0 | Monto de detracción Banco de la Nación |
| `credito` | REAL | DEFAULT 0 | Saldo neto a cobrar (`total - detraccion`) |
| `purchase_order` | TEXT | | Orden de Compra de referencia del cliente |
| `location_code` | TEXT | | Código de ubicación interna |
| `month_billed` | INTEGER | | Mes del servicio facturado (1 al 12) |
| `year_billed` | INTEGER | | Año del servicio facturado |
| `issue_date` | TEXT | | Fecha de emisión (YYYY-MM-DD) |
| `due_date` | TEXT | | Fecha de vencimiento (YYYY-MM-DD) |
| `status` | TEXT | DEFAULT 'issued' | `issued` (emitida), `paid` (cobrada), `cancelled` |
| `emailed` | INTEGER | DEFAULT 0 | 1 si ya fue enviada por correo al cliente |
| `items_json` | TEXT | | JSON opcional con el desglose de ítems |
| `created_at` | TEXT | DEFAULT datetime | Fecha de registro |

### `purchase_orders`
Órdenes de Compra (OC) mensuales emitidas por clientes institucionales.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID del registro de OC |
| `client_id` | INTEGER | FK -> `clients(id)` | Cliente |
| `client_site_id` | INTEGER | FK -> `client_sites(id)` | Sede de la OC |
| `year` | INTEGER | NOT NULL | Año de la orden |
| `month` | INTEGER | NOT NULL | Mes correspondiente (1 al 12) |
| `oc_number` | TEXT | NOT NULL | Número de documento de la OC |
| `amount` | REAL | | Monto aprobado en la OC |
| `status` | TEXT | DEFAULT 'pending' | `pending` (pendiente de cobro) o `invoiced` |
| `notes` | TEXT | | Comentarios de seguimiento |
| `created_at` | TEXT | DEFAULT datetime | Fecha de registro |

### `quotes` y `quote_items`
Presupuestos formales para generación de archivos Word `.docx`.
- **`quotes`**: `id`, `number` (ej. `COT-2026-001`), `client_id`, `client_site_id`, `issue_date`, `valid_until`, `payment_terms`, `subtotal`, `igv`, `total`, `status` (`borrador`, `enviada`, `aprobada`, `rechazada`, `facturada`).
- **`quote_items`**: `id`, `quote_id` (FK ON DELETE CASCADE), `service_type_id`, `description_id`, `description_text`, `productos_text`, `equipos_text`, `quantity`, `unit_price`, `total`, `sort_order`.

---

## 2. Personal Operativo, Seguridad y Asistencia

### `employees`
Plantilla de técnicos aplicadores, fumigadores y supervisores.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID del colaborador |
| `full_name` | TEXT | NOT NULL | Nombre y apellidos completos |
| `document_number`| TEXT | | DNI u otro documento de identidad |
| `phone` | TEXT | | Teléfono de contacto |
| `email` | TEXT | | Correo electrónico |
| `position` | TEXT | | Puesto laboral (`Fumigador`, `Supervisor`, etc.) |
| `sede_operativa` | TEXT | | Sede base de asignación (ej. `LIMA`, `HUACHIPA`) |
| `responsable` | TEXT | | Supervisor directo a cargo |
| `is_active` | INTEGER | DEFAULT 1 | 1 = Activo, 0 = Inactivo |

### `employee_documents`
Acreditaciones de seguridad, capacitaciones y exámenes médicos obligatorios.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID del documento |
| `employee_id` | INTEGER | FK -> `employees(id)` | Empleado titular |
| `doc_type` | TEXT | NOT NULL | Tipo (`MATPEL`, `EMO`, `Inducción`, `SCTR`, etc.) |
| `doc_number` | TEXT | | Código o número de certificado |
| `issue_date` | TEXT | | Fecha de expedición |
| `expiry_date` | TEXT | | Fecha de vencimiento |
| `file_data` | BLOB | | Archivo binario adjunto (PDF o imagen) |
| `file_name` | TEXT | | Nombre original del archivo |
| `file_type` | TEXT | | MIME type del archivo |
| `external_url` | TEXT | | Enlace a OneDrive u otra nube |
| `notes` | TEXT | | Observaciones |

### `service_records` & `daily_control`
Control diario de asistencia en campo y cálculo de horas de jornada laboral.
- **`service_records`**: Registra cada marcación: `employee_id`, `client_site_id`, `fecha`, `hora_ingreso`, `hora_salida`, `evidencia` (0 o 1), `horas_trabajadas`, `traslado_min`, `status` (`active`/`completed`), `semana`, `año`.
- **`daily_control`**: Resumen diario consolidado por empleado: `fecha_revision`, `employee_id`, `sede_operativa`, `responsable`, `se_presento` (1/0), `horas_dia`, `evidencia_dia`, `pendientes_sin_salida`, `observaciones`.

### `reimbursements` & `overtime`
- **`reimbursements`**: Rendiciones de viáticos y gastos por empleado (`employee_id`, `date`, `concept`, `amount`, `status`).
- **`overtime`**: Horas y días extraordinarios (`employee_id`, `date`, `days`, `reason`, `approved`).

### `lindley_contacts` & `lindley_forms`
- **`lindley_contacts`**: Directorio de coordinadores y jefaturas en plantas de Arca Continental Lindley (`plant`, `contact_name`, `email`, `phone`, `notes`).
- **`lindley_forms`**: Control de llenado y validación de formularios digitales de auditoría mensual Lindley (`month`, `year`, `completed_date`, `status`, `notes`).

---

## 3. Universidad (UTN FRA)

### `curriculum_status`
Almacena el estado académico individual de cada materia del Plan 2023 de Ingeniería Industrial.
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `subject_id` | INTEGER | PRIMARY KEY | ID de la asignatura (corresponde a `curriculum_data.js`) |
| `status` | TEXT | NOT NULL | `APROBADA`, `REGULAR`, `CURSANDO`, `DISPONIBLE`, `BLOQUEADA`, `LIBRE_DISPONIBLE` |
| `grade` | REAL | | Calificación final o nota de cierre |
| `note` | TEXT | | Apuntes de cursada, comisión o docente |
| `updated_at` | TEXT | DEFAULT datetime | Fecha de última modificación |

### `subjects`, `exams`, `assignments`
- **`subjects`**: Materias cursadas activamente en el cuatrimestre (`id`, `name`, `professor`, `schedule`, `year`, `status`).
- **`exams`**: Fechas de parciales, recuperatorios y finales (`subject_id`, `type`, `date`, `time`, `topic`, `grade`, `status`).
- **`assignments`**: Entregas de TPs y proyectos grupales (`subject_id`, `title`, `description`, `due_date`, `grade`, `group_name`, `status`).

---

## 4. Salud, TRH y Entrenamiento

### `injections`
Historial de inyecciones de valerato de estradiol (Terapia de Reemplazo Hormonal).
| Columna | Tipo | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | ID del registro |
| `date` | TEXT | NOT NULL | Fecha de la aplicación (YYYY-MM-DD) |
| `dose_mg` | REAL | DEFAULT 4.0 | Dosis aplicada en miligramos |
| `injection_site`| TEXT | | Sitio anatómico (ej. Glúteo izquierdo, Vasto lateral) |
| `notes` | TEXT | | Síntomas, sensaciones o notas clínicas |

### `body_measurements`
Seguimiento antropométrico de evolución corporal (en centímetros y kilogramos).
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | INTEGER | Identificador del registro |
| `date` | TEXT | Fecha de la medición |
| `weight` | REAL | Peso corporal total (kg) |
| `bideltoid_cm` | REAL | Ancho biacromial / bideltoideo de hombros |
| `bust_cm` | REAL | Circunferencia del busto |
| `underbust_cm`| REAL | Circunferencia del bajo busto |
| `waist_cm` | REAL | Circunferencia de la cintura mínima |
| `iliac_crest_cm`| REAL| Circunferencia sobre la cresta ilíaca |
| `hips_cm` | REAL | Circunferencia máxima de caderas/glúteos |
| `thigh_cm` | REAL | Circunferencia del muslo |
| `arm_cm` | REAL | Circunferencia del brazo |
| `notes` | TEXT | Observaciones adicionales |

### `transition_journal`
Diario personal de hitos y reflexiones del proceso de transición (`date`, `title`, `content`, `entry_type`, `milestone_type`).

### Tablas de Entrenamiento (`workout_*`)
- **`workout_days`**: Días de entrenamiento (ej. Día 1 Glúteos y Piernas, Día 2 Tren Superior).
- **`workout_exercises`**: Ejercicios estructurados por día (`day_id`, `phase`, `name`, `sets`, `reps_text`, `equipment`, `default_weight_kg`, `rest_seconds`, `is_trackable`).
- **`workout_sessions`**: Registro de sesiones completadas en el gimnasio (`day_id`, `date`, `duration_minutes`, `notes`).
- **`workout_set_logs`**: Detalle de series ejecutadas (`session_id`, `exercise_name`, `set_number`, `weight_kg`, `reps`, `completed`).

---

## 5. Finanzas Personales & Meta Operación

- **`finance_accounts`**: Billeteras y cuentas financieras (`name`, `account_type`, `currency`, `initial_balance`, `color`, `icon`, `is_active`).
- **`finance_categories`**: Catálogo de categorías para gastos e ingresos (`name`, `type`, `icon`, `color`, `sort_order`, `is_active`).
- **`finance_goals`**: Metas de ahorro personal, enfocada en la Meta Quirúrgica en USD (`title`, `target_amount`, `current_amount`, `currency`, `usd_exchange_rate`, `target_date`, `notes`, `is_active`).
- **`finance_transactions`**: Registro de movimientos de gastos, ingresos, transferencias entre cuentas y aportes a la meta (`account_id`, `category_id`, `type`, `amount`, `currency`, `date`, `description`, `destination_account_id`, `goal_id`, `goal_amount_usd`).
- **`finance_debts`**: Plan de desendeudamiento y amortización de deudas (`title`, `creditor`, `total_amount`, `initial_paid`, `currency`, `due_date`, `installments_total`, `installments_paid`, `status`, `notes`).
- **`finance_debt_payments`**: Historial de abonos y cuotas pagadas hacia deudas (`debt_id`, `transaction_id`, `account_id`, `amount`, `date`, `installment_number`, `notes`).
- **`finance_recurring_expenses`**: Catálogo de gastos fijos mensuales habituales (`name`, `category_id`, `account_id`, `amount`, `currency`, `due_day`, `auto_debit`, `is_active`, `notes`).
- **`finance_recurring_logs`**: Control mensual de pagos de gastos fijos (Pagado/Pendiente) (`recurring_id`, `month`, `year`, `paid_amount`, `paid_date`, `transaction_id`, `is_paid`, `notes`).
- **`finance_salaries`**: Registro y comparativa de sueldos esperados/pactados vs cobrados reales (`month`, `year`, `expected_amount`, `received_amount`, `currency`, `payment_date`, `account_id`, `status`, `notes`, `transaction_id`).

---

## 6. Taller de Cosplays

- **`cosplay_projects`**: Proyectos y trajes en desarrollo (`character_name`, `series_name`, `client_name`, `project_type`, `price`, `deposit`, `materials_cost`, `due_date`, `status`).
- **`cosplay_items`**: Desglose de piezas, telas, accesorios y materiales de un proyecto (`project_id`, `name`, `item_type`, `cost`, `done`).
- **`cosplay_clients`**: Clientes del taller con ficha de medidas personalizadas (`name`, `contact`, `size_measurements`, `notes`).

---

## 7. Productividad Personal & Tareas

- **`areas`**: Categorías maestras de tareas (1: *Trabajo*, 2: *Universidad*, 3: *Personal*).
- **`tasks`**: Tareas pendientes con alerta (`area_id`, `title`, `description`, `due_date`, `priority`, `status`, `reminder_days`).
- **`habits` & `habit_logs`**: Tracker de hábitos diarios y cálculo de rachas consecutivas (`name`, `frequency`, `streak`).
- **`print_orders`**: Pedidos del taller de impresión 3D (`customer_name`, `piece_name`, `filament_grams`, `print_hours`, `price`, `status`).

---

## 8. Configuración del Sistema

### `config`
Almacén clave-valor para parámetros operacionales del sistema:
- `theme`: Tema activo de la interfaz (`dark` o `light`).
- `cta_detraccion_1` / `cta_detraccion_2`: Cuentas corrientes del Banco de la Nación para constancias de detracción.
- `print3d_price_per_gram`: Precio por gramo de plástico para impresión 3D (por defecto 1.5).
- `print3d_price_per_hour`: Costo por hora de máquina 3D (por defecto 5.0).
- `tt_tope_traslado`, `tt_meta_semanal`, `tt_peso_horas`: Parámetros de ponderación para KPIs de trabajo de campo.
