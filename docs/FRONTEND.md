# Guía de Frontend y UI — Nicole SPA

El frontend de Nicole está construido como una **Single Page Application (SPA)** responsiva en **JavaScript Vanilla (ES6+)**, sin frameworks pesados (como React, Angular o Vue) ni cadenas de construcción (como Vite, Webpack o npm).

---

## 1. Estructura de Archivos en `web/`

```text
web/
├── index.html             # Shell único de la SPA, navegación fija, modales y toast
├── manifest.json          # Configuración PWA para instalación en iOS / Android
├── sw.js                  # Service Worker para caché y soporte offline
├── apple-touch-icon.png   # Íconos para la pantalla de inicio de iPhone
├── favicon.ico / .png     # Favicons para navegadores de escritorio
├── css/
│   └── style.css          # Estilos unificados, variables CSS de tema y diseño responsivo
├── js/
│   ├── app.js             # Controlador maestro: enrutamiento, estado, renderizado y eventos
│   └── curriculum_data.js # Definición del Plan 2023 de Ingeniería Industrial (UTN FRA)
└── img/
    └── asa-icon.png       # Avatar e isotipo de la marca
```

---

## 2. Shell de la Aplicación y Vistas (`index.html`)

La navegación se gestiona mediante pestañas superiores en una "píldora" flotante (`#topNav`). Cada botón de navegación posee un atributo `data-view`:

```html
<main id="app">
    <div id="view-dashboard" class="view active"></div>
    <div id="view-work" class="view"></div>
    <div id="view-university" class="view"></div>
    <div id="view-personal" class="view"></div>
    <div id="view-finance" class="view"></div>
    <div id="view-cosplays" class="view"></div>
    <div id="view-settings" class="view"></div>
</main>
```

Solo la vista activa contiene la clase `.active` (`display: block`). Las demás permanecen en `display: none` para optimizar el rendimiento del DOM. La sección **Personal** unifica Entrenamiento (Rutina), Progreso & Hábitos, Inyecciones (TRH) y Medidas Corporales bajo 4 subpestañas fluidas sin alterar sus datos.

---

## 3. Enrutamiento y Gestión de Estado (`app.js`)

### 3.1 Objeto de Estado Global (`state`)
`app.js` mantiene un único objeto reactivo en memoria que almacena los filtros actuales, subpestañas seleccionadas y datos en caché:
```javascript
const state = {
    view: 'dashboard',
    workTab: 'facturacion',      // 'clientes', 'matrix', 'invoices', 'calculadora', etc.
    uniTab: 'cursada',           // 'cursada', 'malla', 'parciales', 'tps'
    personalTab: 'routine',      // 'routine', 'progress', 'injections', 'measurements'
    financeTab: 'resumen',       // 'resumen', 'meta', 'cuentas'
    financeMonth: 10,
    financeYear: 2026,
    cal: { year: 2026, month: 10 },
    // ...
};
```

### 3.2 Cambio de Vista (`switchView`)
Al hacer clic en un enlace de navegación, la función `switchView(viewName)`:
1. Remueve la clase `.active` de la vista anterior y la asigna a la nueva.
2. Actualiza la clase `.active` en el enlace correspondiente del menú.
3. Invoca la función de carga de datos específica de la vista (ej. `loadWorkView()`, `loadHealthView()`).

---

## 4. Patrón de Comunicación con el Backend (`api`)

Todas las llamadas al servidor (tanto en Eel local como en la nube) se realizan a través de la función auxiliar `api()`:

```javascript
async function api(fn, ...args) {
    if (typeof fn !== 'function') {
        throw new Error(`La función solicitada no está expuesta en eel.`);
    }
    return await fn(...args)();
}
```

### Ejemplo de uso:
```javascript
// Obtener clientes
const clients = await api(eel.get_clients);

// Crear una tarea
const res = await api(eel.create_task, {
    title: 'Comprar insumos',
    area_id: 1,
    priority: 'high'
});
if (res.ok) {
    showToast('Tarea guardada exitosamente');
    loadTasks();
}
```

---

## 5. Sistema de Modales y Notificaciones Toast

### 5.1 Modales Globales
El documento cuenta con una estructura modal única reutilizable (`#modalOverlay` y `#modal`):
- `showModal(title, htmlContent, onSaveCallback, saveButtonLabel)`: Inyecta el contenido dinámicamente y asigna la acción del botón de guardar.
- `closeModal()`: Oculta el contenedor y limpia los escuchadores de eventos.

### 5.2 Toast Messages
`showToast(message, type='info', duration=3000)`: Despliega una alerta no intrusiva en la esquina inferior con auto-cierre.

---

## 6. Malla Curricular Interactiva (`curriculum_data.js`)

La vista de Universidad integra el mapa de la carrera de Ingeniería Industrial (UTN FRA, Plan 2023).

### Estados de Asignatura:
- `APROBADA`: Materia finalizada y acreditada (color verde / *sage*).
- `REGULAR`: Cursada aprobada, pendiente de examen final (color lavanda).
- `CURSANDO`: Cursando activamente en el ciclo lectivo actual (color rosa primario).
- `DISPONIBLE`: Cumple correlatividades para ser cursada (color ámbar).
- `LIBRE_DISPONIBLE`: Habilitada para rendir final libre (color cian).
- `BLOQUEADA`: Faltan correlativas previas para cursar (color gris tenue con candado).

El algoritmo de cálculo de correlatividades evalúa las listas `cursadasParaCursar`, `aprobadasParaCursar` y `aprobadasParaRendir` de cada nodo frente a las materias registradas en la tabla `curriculum_status`.

---

## 7. Temas Visuales y Paleta de Colores

La aplicación utiliza variables CSS en `:root` y en el atributo `[data-theme="dark"]` / `[data-theme="light"]`.

### Paleta Nocturna (Predeterminada)
- **Fondo Base (`--bg-base`)**: `#151014` (tono carbón berenjena profundo).
- **Tarjetas y Superficies (`--bg-surface`)**: `#211920`.
- **Bordes sutiles (`--border`)**: `#362832`.
- **Acento Primario (`--primary`)**: `#F28BA8` (rosa elegante).
- **Acento Secundario (`--primary-hover`)**: `#f5a2b9`.
- **Texto Principal (`--text-main`)**: `#F7EAF0`.
- **Texto Atenuado (`--text-muted`)**: `#a8929e`.

El tema se puede alternar con el botón del encabezado (`#themeToggle`) y se persiste automáticamente en la tabla `config` de SQLite y en `localStorage`.

---

## 8. ⚠️ PROTOCOLO CRÍTICO: Cache-Busting (`?v=XX`)

> [!IMPORTANT]
> Los navegadores móviles (especialmente Mobile Safari en iOS y Chrome en Android al agregar la app a la pantalla de inicio PWA) retienen una memoria caché muy agresiva de los archivos JavaScript y CSS.

Cada vez que realices una modificación en:
- `web/js/app.js`
- `web/js/curriculum_data.js`
- `web/css/style.css`

**Debes incrementar el parámetro de versión en `web/index.html`**:
```html
<!-- Ejemplo: subir de v=18 a v=19 -->
<link rel="stylesheet" href="css/style.css?v=19">
...
<script src="js/curriculum_data.js?v=19"></script>
<script src="js/app.js?v=19"></script>
```
Si este paso se omite, los usuarios en dispositivos móviles continuarán ejecutando la versión antigua de la interfaz sin ver las nuevas funciones o correcciones.
