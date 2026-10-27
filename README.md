# Nicole — Sistema Integral de Gestión (Personal, Negocios y Académico)

Plataforma unificada de gestión diseñada para operar tanto en **escritorio Windows** (vía Eel y Chrome App) como en la **nube y dispositivos móviles / iPhone** (vía Flask PWA en PythonAnywhere).

---

## 📑 Índice
1. [Características Principales](#-características-principales)
2. [Arquitectura Tecnológica](#-arquitectura-tecnológica)
3. [Instalación y Uso Local](#-instalación-y-uso-local)
4. [Despliegue en la Nube](#-despliegue-en-la-nube)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Documentación para Desarrolladores e IAs](#-documentación-para-desarrolladores-e-ias)

---

## 🌟 Características Principales

### 🏢 1. Trabajo & Operaciones Empresariales
- **Facturación SUNAT**: Registro y control de facturas electrónicas (serie `E001`), IGV (18%), cálculo automático de Detracciones del Banco de la Nación (cuentas `00046317769` y `00771005578`) y crédito neto.
- **Matriz de Órdenes de Compra (OC)**: Matriz anual de 12 meses con selector de año y estado de facturación por cliente y sede.
- **Clientes y Sedes Operativas**: Gestión de clientes regulares y eventuales con códigos normalizados (Arca Continental Lindley `ACL-ZA`/`ACL-AT`, Sur Color Star `SCS-PRIN`, AC Logística `ALD-DU`, etc.).
- **Generador de Cotizaciones en Word (.docx)**: Emisión de cotizaciones formales a partir de la plantilla `templates/cotizacion_base.docx` con cálculo automático de totales, catálogo de servicios, insumos y equipos.
- **Control de Personal & Seguridad**: Base de datos de técnicos fumigadores y supervisores, control de vigencia de acreditaciones obligatorias (MATPEL, EMO, Inducción, SCTR), rendiciones de viáticos y horas extras.
- **Control Diario & KPIs Operativos**: Libro de asistencia en planta, horas efectivas, traslados y registro fotográfico de evidencias.

### 🎓 2. Universidad (UTN FRA — Ingeniería Industrial Plan 2023)
- **Malla Curricular Interactiva**: Mapa visual de 42 asignaturas oficiales de Niveles I a V, Título Intermedio y Práctica Profesional Supervisada (PPS).
- **Lógica de Correlatividades**: Validación en tiempo real de condiciones para cursar y rendir (Aprobada, Regular, Cursando, Disponible, Bloqueada).
- **Seguimiento Académico**: Cronograma de parciales, cuenta regresiva a exámenes, registro de trabajos prácticos y calificaciones.

### 💖 3. Salud & Bienestar
- **Terapia de Reemplazo Hormonal (TRH / HRT)**: Registro de inyecciones de valerato de estradiol, dosis (mg), sitios de aplicación y proyección de curvas farmacocinéticas teóricas de estradiol.
- **Medidas Corporales & Antropometría**: Registro histórico y metas de peso, busto, bajo busto, cintura, cadera, cresta ilíaca, muslos y hombros (bideltoideo).
- **Entrenamiento & Gimnasio**: Planificador de rutinas por días, registro de series, repeticiones, cargas (kg), tiempos de descanso e historial de progreso.

### 🎭 4. Cosplays & Emprendimiento
- **Taller de Cosplay**: Gestión de comisiones y proyectos personales, catálogo de ítems, insumos, presupuesto de materiales, abonos y medidas personalizadas por cliente.

### 📋 5. Productividad Personal & Hábitos
- **Gestor de Tareas**: Tareas segmentadas por área (*Trabajo*, *Universidad*, *Personal*) con fechas límite, alertas y prioridades.
- **Tracker de Hábitos**: Registro diario y cálculo automático de rachas consecutivas.
- **Calculadora 3D**: Costeo de impresiones 3D en base a gramos de filamento y horas de máquina configurables.

---

## 🛠️ Arquitectura Tecnológica

| Componente | Tecnología | Rol |
| :--- | :--- | :--- |
| **Backend** | Python 3.12 | Lógica de negocio centralizada en `api.py` |
| **Base de Datos** | SQLite 3 (`WAL` mode) | Persistencia local y en servidor con integridad referencial |
| **Modo Local** | [Eel](https://github.com/ChrisKnott/Eel) | Puente WebSocket para aplicación de escritorio nativa en Chrome |
| **Modo Cloud** | Flask 3 + Gunicorn | Servidor HTTP REST/JSON con shim virtual `/eel.js` para PWA en iPhone |
| **Frontend** | Vanilla JavaScript (ES6+), HTML5, CSS3 | Single Page Application (SPA) responsiva y reactiva sin dependencias de Node.js ni bundlers |
| **PWA** | Service Worker + Manifest | Instalación como app nativa en iOS Safari y Android |
| **Documentos** | `python-docx` + `openpyxl` | Generación y procesamiento de archivos Office Word y Excel |

---

## 🚀 Instalación y Uso Local

### Prerrequisitos
- **Python 3.12** o superior instalado en el sistema.
- **Google Chrome** (recomendado para el modo ventana de escritorio).

### Pasos
1. Clonar o descargar este repositorio en `c:\GESTION`:
   ```powershell
   git clone <url-del-repositorio> c:\GESTION
   cd c:\GESTION
   ```
2. Instalar las dependencias de Python:
   ```powershell
   pip install -r requirements.txt
   ```
3. Ejecutar la aplicación:
   - **Opción A (Recomendada)**: Hacer doble clic en `iniciar.bat`.
   - **Opción B (Línea de comandos)**:
     ```powershell
     python main.py
     ```
4. La aplicación abrirá automáticamente una ventana independiente de Chrome en `http://localhost:8080/index.html`. También se puede acceder desde cualquier dispositivo en la misma red Wi-Fi ingresando la IP local reportada por la app.

---

## ☁️ Despliegue en la Nube

El proyecto está configurado para desplegarse fácilmente en **PythonAnywhere**, **Render**, **Railway** o **Fly.io** mediante `server_cloud.py`.

### Variables de Entorno
| Variable | Obligatoria | Descripción |
| :--- | :---: | :--- |
| `APP_PASSWORD` | Sí (salvo `ALLOW_NO_PASSWORD=1`) | Contraseña de acceso a la aplicación |
| `SECRET_KEY` | Opcional | Clave para firmar las cookies de sesión (se genera una automática si falta) |
| `GITHUB_WEBHOOK_SECRET` | Opcional | Secreto para el endpoint `/webhook/github` para actualización automática |
| `INSECURE_COOKIES` | Opcional | Establecer en `1` solo si se prueba en HTTP sin TLS localmente |

### Actualización Automática (CI/CD)
Un webhook configurado en GitHub hacia `https://<tu-app>.pythonanywhere.com/webhook/github` descargará los cambios automáticamente mediante `git pull` y recargará el proceso WSGI sin requerir inicio de sesión manual en el panel de control.

---

## 📂 Estructura del Proyecto

```text
C:\GESTION\
├── AGENTS.md                  # Contexto y directrices de alta densidad para IAs (Ahorro de tokens)
├── README.md                  # Documento principal del proyecto
├── Procfile                   # Definición de proceso web para servidores cloud
├── requirements.txt           # Paquetes Python requeridos
├── iniciar.bat                # Acceso directo para ejecución local
│
├── main.py                    # Entrypoint local Eel (Desktop)
├── server_cloud.py            # Entrypoint servidor Flask (Cloud / PWA)
├── api.py                     # Controlador con 137 funciones expuestas
├── database.py                # Definición de tablas SQLite y migraciones
├── gestion.db                 # Archivo de base de datos activa
│
├── templates/                 # Plantillas de documentos Office
│   └── cotizacion_base.docx   # Base para presupuestos formales
│
├── web/                       # Código frontend SPA
│   ├── index.html             # Estructura principal y navegación
│   ├── manifest.json          # Manifiesto Web PWA
│   ├── sw.js                  # Service Worker
│   ├── css/style.css          # Estilos y variables de tema día/noche
│   └── js/
│       ├── app.js             # Lógica de interfaz y llamadas API
│       └── curriculum_data.js # Malla y correlatividades UTN FRA
│
└── docs/                      # Documentación técnica modular
    ├── ARCHITECTURE.md        # Arquitectura dual, puente Eel/Cloud y seguridad
    ├── DATABASE.md            # Diccionario exhaustivo de las 38 tablas
    ├── API_REFERENCE.md       # Catálogo de endpoints y funciones de api.py
    └── FRONTEND.md            # Navegación, vistas, modales y cache-busting
```

---

## 🤖 Documentación para Desarrolladores e IAs

Para optimizar el uso de tokens y mantener una visión clara al interactuar con modelos de IA (Claude, Cursor, Copilot, ChatGPT, Antigravity), el repositorio cuenta con documentación modular especializada:

- **[AGENTS.md](./AGENTS.md)**: Resumen ultracompacto de reglas críticas, convenciones e invariantes del proyecto.
- **[docs/DATABASE.md](./docs/DATABASE.md)**: Diccionario de datos completo con todas las tablas, columnas, tipos y claves foráneas.
- **[docs/API_REFERENCE.md](./docs/API_REFERENCE.md)**: Catálogo clasificado de todas las funciones de `api.py` con sus argumentos y salidas.
- **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**: Detalle del puente Eel vs Flask Proxy, autenticación y despliegue.
- **[docs/FRONTEND.md](./docs/FRONTEND.md)**: Guía de la SPA vanilla, gestión de vistas, modales y política de cache-busting.
