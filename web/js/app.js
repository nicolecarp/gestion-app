// ===== GLOBAL ERROR HANDLER =====
window.onerror = function(msg, url, line, col, err) {
    console.error('GLOBAL ERROR:', msg, url, line, col, err);
    document.getElementById('app').innerHTML =
        '<div class="empty-state" style="padding:60px">' +
        '<div class="empty-icon">⚠️</div>' +
        '<h3>Error en la aplicación</h3>' +
        '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px">' + msg + '</p>' +
        '</div>';
};

console.log('app.js loaded at', new Date().toISOString());

// ===== STATE =====
const state = {
    view: 'dashboard',
    weatherData: null,
    workTab: 'tasks',
    personalTab: 'routine',
    selectedRoutineDayId: null,
    cal: { year: 0, month: 0 },
    showCompleted: false,
    healthTab: 'injections',
    estradiolRange: 365,
    estradiolData: null,
    activeWorkout: null, // { dayId, dayName, warmup, cooldown, startTime, elapsedSec, timerId, restSec, restTimerId, exercises: [...] }
    progressExercise: '',
    progressMetric: 'max_weight',
    financeTab: 'resumen',
    financeMonth: new Date().getMonth() + 1,
    financeYear: new Date().getFullYear(),
    financeFilterType: 'all',
    financeFilterAccount: '',
    financeSearch: '',
};

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nicole_theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (typeof window.eel !== 'undefined' && window.eel.set_config) {
        api(eel.set_config, 'theme', next).catch(() => {});
    }
    if (state.view === 'health' || state.view === 'personal' || state.view === 'finance') {
        navigate(state.view);
    }
}

// ===== SAFE API CALL =====
async function api(fn, ...args) {
    try {
        if (typeof fn !== 'function') {
            const eelType = typeof window.eel;
            const keys = window.eel ? Object.keys(window.eel).filter(k => !k.startsWith('_')).slice(0, 15) : [];
            throw new Error(
                eelType === 'undefined'
                    ? 'eel no está definido (window.eel = undefined)'
                    : `eel existe pero '${fn ? fn.name || 'fn' : 'fn'}' no es función. Funciones disponibles: ${keys.join(', ') || 'ninguna'}`
            );
        }
        return await fn(...args)();
    } catch (e) {
        console.error('API error:', e.message);
        showToast('Error: ' + e.message);
        throw e;
    }
}

// ===== HELPERS =====
function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function localDateStr(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function todayStr() {
    return localDateStr(new Date());
}

function today() {
    return todayStr();
}

function fmtDate(d) {
    if (!d) return '-';
    const p = d.split('-');
    if (p.length !== 3) return d;
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return parseInt(p[2]) + ' ' + meses[parseInt(p[1])-1] + ' ' + p[0];
}

function daysUntil(d) {
    if (!d) return null;
    const t = new Date();
    const dt = new Date(d + 'T00:00:00');
    return Math.ceil((dt - t) / (1000*60*60*24));
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._hide);
    t._hide = setTimeout(() => t.classList.remove('show'), 2500);
}

function openModal(title, bodyHtml) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    const saveBtn = document.getElementById('modalSave');
    const cancelBtn = document.getElementById('modalCancel');
    saveBtn.style.display = '';
    saveBtn.textContent = 'Guardar';
    cancelBtn.style.display = '';
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = closeModal;
    document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
}

// ===== WAIT FOR EEL =====
function waitForEel(cb, attempt) {
    if (attempt === undefined) attempt = 0;
    if (attempt >= 300) {
        // 6 seconds timeout
        document.getElementById('app').innerHTML =
            '<div class="empty-state"><div class="empty-icon">⏱️</div><h3>Tiempo de espera agotado</h3>' +
            '<p style="font-size:0.85rem;color:var(--text-muted)">' +
            'eel type: ' + (typeof window.eel) + '<br>' +
            'get_dashboard_stats: ' + (typeof (window.eel && window.eel.get_dashboard_stats)) + '<br>' +
            'WebSocket: ' + (window.eel && window.eel._websocket ? window.eel._websocket.readyState : 'N/A') +
            '</p></div>';
        return;
    }
    if (typeof window.eel !== 'undefined' && typeof window.eel.get_dashboard_stats === 'function') {
        console.log('Eel ready after', attempt * 20, 'ms');
        cb();
    } else {
        setTimeout(() => waitForEel(cb, attempt + 1), 20);
    }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('nicole_theme') || 'dark';
    applyTheme(savedTheme);
    initAudioAndNotifications();
    document.getElementById('modalClose').onclick = closeModal;
    document.getElementById('modalCancel').onclick = closeModal;
    document.getElementById('modalOverlay').onclick = (e) => {
        if (e.target === e.currentTarget) closeModal();
    };
    document.getElementById('navLinks').addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (!link) return;
        e.preventDefault();
        navigate(link.dataset.view);
    });
    const now = new Date();
    state.cal.year = now.getFullYear();
    state.cal.month = now.getMonth() + 1;
    waitForEel(async () => {
        if (!localStorage.getItem('nicole_theme')) {
            const dbTheme = await api(eel.get_config, 'theme');
            if (dbTheme) applyTheme(dbTheme);
        }
        navigate('dashboard');
        startReloadPoller();
        setTimeout(() => checkSmartDailyNotifications(), 2500);
    });
});

function startReloadPoller() {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') return;
    setInterval(async () => {
        try {
            if (window.eel && typeof window.eel.check_reload === 'function') {
                if (await window.eel.check_reload()()) {
                    location.reload();
                }
            }
        } catch (_) {}
    }, 5000);
}

// ===== NAVIGATION =====
async function navigate(view) {
    if (view === 'health') {
        state.personalTab = (state.healthTab === 'measurements') ? 'measurements' : 'injections';
        view = 'personal';
    }
    const isSameView = (state.view === view);
    const savedScrollY = window.scrollY;
    state.view = view;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`.nav-link[data-view="${view}"]`);
    if (link) link.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + view);
    if (!el) return;
    el.classList.add('active');
    // Only replace with "Cargando..." if the view is currently empty, preventing scroll jumps
    if (!isSameView && !el.innerHTML.trim()) {
        el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Cargando...</div>';
    }
    try {
        switch (view) {
            case 'dashboard': await renderDashboard(el); break;
            case 'work': await renderWork(el); break;
            case 'university': await renderUniversity(el); break;
            case 'personal': await renderPersonal(el); break;
            case 'health': await renderPersonal(el); break;
            case 'finance': await renderFinance(el); break;
            case 'cosplays':
            case 'print3d': await renderCosplays(el); break;
            case 'settings': await renderSettings(el); break;
        }
        if (isSameView) {
            window.scrollTo(0, savedScrollY);
        } else {
            window.scrollTo(0, 0);
        }
    } catch (e) {
        console.error('Error rendering', view, e);
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Error al cargar</h3><p>${esc(e.message || 'Error desconocido')}</p><button class="btn btn-primary" onclick="navigate('${view}')">Reintentar</button></div>`;
    }
}

// ===================== CLIMA / WEATHER =====================

function getWeatherInfoFromWMO(code, isDay = 1) {
    const c = Number(code);
    switch (c) {
        case 0:
            return { desc: isDay ? 'Despejado' : 'Noche despejada', icon: isDay ? '☀️' : '🌙' };
        case 1:
            return { desc: 'Mayormente despejado', icon: isDay ? '🌤️' : '🌙' };
        case 2:
            return { desc: 'Parcialmente nublado', icon: '⛅' };
        case 3:
            return { desc: 'Nublado', icon: '☁️' };
        case 45:
        case 48:
            return { desc: 'Niebla / Neblina', icon: '🌫️' };
        case 51:
        case 53:
        case 55:
            return { desc: 'Llovizna', icon: '🌦️' };
        case 56:
        case 57:
            return { desc: 'Llovizna helada', icon: '🌨️' };
        case 61:
            return { desc: 'Lluvia leve', icon: '🌧️' };
        case 63:
            return { desc: 'Lluvia moderada', icon: '🌧️' };
        case 65:
            return { desc: 'Lluvia fuerte', icon: '🌧️' };
        case 66:
        case 67:
            return { desc: 'Lluvia helada', icon: '🌨️' };
        case 71:
        case 73:
        case 75:
            return { desc: 'Nevada', icon: '❄️' };
        case 77:
            return { desc: 'Granizo', icon: '🌨️' };
        case 80:
        case 81:
        case 82:
            return { desc: 'Chubascos', icon: '🌧️' };
        case 85:
        case 86:
            return { desc: 'Chubascos de nieve', icon: '❄️' };
        case 95:
            return { desc: 'Tormenta eléctrica', icon: '⛈️' };
        case 96:
        case 99:
            return { desc: 'Tormenta con granizo', icon: '⛈️' };
        default:
            return { desc: 'Templado', icon: '🌤️' };
    }
}

async function fetchWeatherData(forceRefresh = false) {
    const CACHE_KEY = 'nicole_weather_cache_v2';
    const CACHE_MS = 20 * 60 * 1000; // 20 minutos de caché

    if (!forceRefresh) {
        if (state.weatherData && (Date.now() - (state.weatherData.timestamp || 0) < CACHE_MS)) {
            return state.weatherData;
        }
        try {
            const cachedStr = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);
                if (Date.now() - (cached.timestamp || 0) < CACHE_MS) {
                    state.weatherData = cached;
                    return cached;
                }
            }
        } catch (_) {}
    }

    let lat = -34.6602;
    let lon = -58.3674;
    let cityName = 'Avellaneda, Buenos Aires';

    try {
        const savedCoords = localStorage.getItem('nicole_weather_coords');
        if (savedCoords) {
            const parsed = JSON.parse(savedCoords);
            if (parsed.lat && parsed.lon) {
                lat = parsed.lat;
                lon = parsed.lon;
                cityName = parsed.name || 'Mi ubicación';
            }
        }
    } catch (_) {}

    let rawData = null;

    // 1. Intentar vía backend Eel/Flask
    try {
        if (window.eel && typeof window.eel.get_weather_data === 'function') {
            const res = await api(eel.get_weather_data, lat, lon);
            if (res && res.ok && res.data) {
                rawData = res.data;
            }
        }
    } catch (_) {}

    // 2. Fallback directo a Open-Meteo
    if (!rawData) {
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America%2FArgentina%2FBuenos_Aires&forecast_days=4`;
            const resp = await fetch(url);
            if (resp.ok) {
                rawData = await resp.json();
            }
        } catch (_) {}
    }

    if (!rawData) {
        return state.weatherData || null;
    }

    const payload = {
        ...rawData,
        cityName,
        lat,
        lon,
        timestamp: Date.now()
    };

    state.weatherData = payload;
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (_) {}

    return payload;
}

function buildWeatherHeaderPill(weather) {
    if (!weather || !weather.current) {
        return `<span class="weather-pill" onclick="document.getElementById('dashboardWeatherCard')?.scrollIntoView({behavior:'smooth'})" title="Ver clima">🌤️ Clima</span>`;
    }
    const cur = weather.current;
    const wInfo = getWeatherInfoFromWMO(cur.weather_code, cur.is_day);
    const temp = Math.round(cur.temperature_2m);
    return `<span class="weather-pill" onclick="document.getElementById('dashboardWeatherCard')?.scrollIntoView({behavior:'smooth'})" title="Ver detalle del clima">
        ${wInfo.icon} ${temp}°C · ${wInfo.desc}
    </span>`;
}

function buildWeatherWidgetHtml(weather, isLoading = false) {
    if (isLoading) {
        return `<div class="card weather-card" id="dashboardWeatherCard" style="display:flex;align-items:center;justify-content:center;padding:32px 18px;color:var(--text-muted);font-size:0.88rem;gap:10px">
            <span style="font-size:1.3rem">🌤️</span>
            <span>Cargando pronóstico del clima...</span>
        </div>`;
    }

    if (!weather || !weather.current) {
        return `<div class="card weather-card" id="dashboardWeatherCard">
            <div class="weather-header">
                <div class="weather-location-wrap">
                    <span>🌤️ Clima</span>
                </div>
                <div class="weather-actions">
                    <button class="btn btn-ghost btn-xs" onclick="refreshDashboardWeather(true)" title="Reintentar">🔄 Reintentar</button>
                </div>
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);padding:8px 0">
                Pronóstico del clima listo para sincronizar al conectar.
            </div>
        </div>`;
    }

    const cur = weather.current;
    const daily = weather.daily || {};
    const wInfo = getWeatherInfoFromWMO(cur.weather_code, cur.is_day);
    const curTemp = Math.round(cur.temperature_2m);
    const stTemp = Math.round(cur.apparent_temperature != null ? cur.apparent_temperature : cur.temperature_2m);
    const humidity = cur.relative_humidity_2m != null ? cur.relative_humidity_2m : '--';
    const wind = cur.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) : '--';
    const rainProb = (daily.precipitation_probability_max && daily.precipitation_probability_max[0] != null)
        ? daily.precipitation_probability_max[0]
        : 0;

    const minToday = (daily.temperature_2m_min && daily.temperature_2m_min[0] != null) ? Math.round(daily.temperature_2m_min[0]) : curTemp;
    const maxToday = (daily.temperature_2m_max && daily.temperature_2m_max[0] != null) ? Math.round(daily.temperature_2m_max[0]) : curTemp;

    // Próximos 3 días
    let forecastHtml = '';
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    if (daily.time && daily.time.length > 1) {
        for (let i = 1; i <= Math.min(3, daily.time.length - 1); i++) {
            const dateStr = daily.time[i];
            const p = dateStr.split('-').map(Number);
            const dObj = new Date(p[0], p[1] - 1, p[2]);
            const dLabel = (i === 1) ? 'Mañana' : dayNames[dObj.getDay()];
            const fCode = daily.weather_code ? daily.weather_code[i] : 0;
            const fInfo = getWeatherInfoFromWMO(fCode, 1);
            const fMin = (daily.temperature_2m_min && daily.temperature_2m_min[i] != null) ? Math.round(daily.temperature_2m_min[i]) : '--';
            const fMax = (daily.temperature_2m_max && daily.temperature_2m_max[i] != null) ? Math.round(daily.temperature_2m_max[i]) : '--';
            const fRain = (daily.precipitation_probability_max && daily.precipitation_probability_max[i] != null) ? daily.precipitation_probability_max[i] : 0;

            forecastHtml += `
                <div class="weather-forecast-day">
                    <span class="forecast-day-name">${dLabel}</span>
                    <span class="forecast-day-icon" title="${esc(fInfo.desc)}">${fInfo.icon}</span>
                    <span class="forecast-day-temps">${fMin}° / ${fMax}°</span>
                    <span class="forecast-day-rain">🌧️ ${fRain}%</span>
                </div>
            `;
        }
    }

    return `
        <div class="card weather-card" id="dashboardWeatherCard">
            <div class="weather-header">
                <div class="weather-location-wrap">
                    <span style="font-size:1rem">📍</span>
                    <span id="weatherCityName">${esc(weather.cityName || 'Avellaneda, Buenos Aires')}</span>
                    <span class="weather-badge">Hoy</span>
                </div>
                <div class="weather-actions">
                    <button class="btn btn-ghost btn-xs" onclick="refreshDashboardWeather(true)" title="Actualizar clima">🔄</button>
                    <button class="btn btn-ghost btn-xs" onclick="detectUserLocationWeather()" title="Usar mi ubicación GPS">📍</button>
                </div>
            </div>

            <div class="weather-main-row">
                <div class="weather-temp-block">
                    <div class="weather-icon-big">${wInfo.icon}</div>
                    <div>
                        <div class="weather-temp">${curTemp}°<span class="weather-unit">C</span></div>
                        <div class="weather-desc">${esc(wInfo.desc)}</div>
                    </div>
                </div>
                <div class="weather-st-block">
                    <div class="weather-st-label">Sensación térmica</div>
                    <div class="weather-st-val">${stTemp}°C</div>
                    <div class="weather-range">↓ ${minToday}° · ↑ ${maxToday}°</div>
                </div>
            </div>

            <div class="weather-stats-grid">
                <div class="weather-stat-chip">
                    <span class="chip-label">💧 Humedad</span>
                    <span class="chip-value">${humidity}%</span>
                </div>
                <div class="weather-stat-chip">
                    <span class="chip-label">🌧️ Lluvia</span>
                    <span class="chip-value">${rainProb}%</span>
                </div>
                <div class="weather-stat-chip">
                    <span class="chip-label">💨 Viento</span>
                    <span class="chip-value">${wind} km/h</span>
                </div>
            </div>

            ${forecastHtml ? `<div class="weather-forecast-row">${forecastHtml}</div>` : ''}
        </div>
    `;
}

async function renderDashboardWeatherAsync() {
    const weather = await fetchWeatherData(false);
    const mount = document.getElementById('dashWeatherMount');
    if (mount) {
        mount.innerHTML = buildWeatherWidgetHtml(weather);
    }
    const headerPill = document.getElementById('dashWeatherHeaderPill');
    if (headerPill) {
        headerPill.innerHTML = buildWeatherHeaderPill(weather);
    }
}

async function refreshDashboardWeather(userTriggered = false) {
    if (userTriggered) {
        const mount = document.getElementById('dashWeatherMount');
        if (mount) mount.innerHTML = buildWeatherWidgetHtml(null, true);
    }
    const weather = await fetchWeatherData(true);
    const mount = document.getElementById('dashWeatherMount');
    if (mount) {
        mount.innerHTML = buildWeatherWidgetHtml(weather);
    }
    const headerPill = document.getElementById('dashWeatherHeaderPill');
    if (headerPill) {
        headerPill.innerHTML = buildWeatherHeaderPill(weather);
    }
    if (userTriggered) {
        showToast('🌤️ Clima actualizado');
    }
}
window.refreshDashboardWeather = refreshDashboardWeather;

function detectUserLocationWeather() {
    if (!('geolocation' in navigator)) {
        showToast('Tu navegador o dispositivo no soporta geolocalización');
        return;
    }
    showToast('📍 Detectando tu ubicación...');
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const lat = parseFloat(pos.coords.latitude.toFixed(4));
            const lon = parseFloat(pos.coords.longitude.toFixed(4));
            localStorage.setItem('nicole_weather_coords', JSON.stringify({
                lat,
                lon,
                name: 'Mi ubicación'
            }));
            await refreshDashboardWeather(true);
            showToast('📍 Clima configurado con tu ubicación');
        },
        (err) => {
            showToast('No se pudo obtener ubicación: ' + (err.message || 'Permiso denegado'));
        },
        { timeout: 10000, enableHighAccuracy: false }
    );
}
window.detectUserLocationWeather = detectUserLocationWeather;

async function getQuickWeatherNotificationText() {
    try {
        const weather = await fetchWeatherData(false);
        if (!weather || !weather.current) return null;
        const cur = weather.current;
        const wInfo = getWeatherInfoFromWMO(cur.weather_code, cur.is_day);
        const temp = Math.round(cur.temperature_2m);
        const city = weather.cityName || 'Avellaneda';
        let minMax = '';
        if (weather.daily && weather.daily.temperature_2m_min && weather.daily.temperature_2m_max) {
            const min = Math.round(weather.daily.temperature_2m_min[0]);
            const max = Math.round(weather.daily.temperature_2m_max[0]);
            minMax = ` (${min}° / ${max}°)`;
        }
        return `${wInfo.icon} Clima ${city}: ${temp}°C · ${wInfo.desc}${minMax}`;
    } catch (_) {
        return null;
    }
}

// ===================== DASHBOARD =====================
async function renderDashboard(el) {
    const [stats, events, tasks, habits] = await Promise.all([
        api(eel.get_dashboard_stats),
        api(eel.get_calendar_events, state.cal.year, state.cal.month),
        api(eel.get_soon_deadlines),
        api(eel.get_habits)
    ]);

    const today = new Date();
    const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches';
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','setiembre','octubre','noviembre','diciembre'];
    const fechaStr = `${dias[today.getDay()]}, ${today.getDate()} de ${meses[today.getMonth()]}`;

    const injDays = stats && stats.next_injection_days != null ? stats.next_injection_days : null;
    const injOverdue = stats && stats.overdue_injection;
    const injLabel = injDays !== null ? (injDays <= 0 ? 'Toca hoy' : `En ${injDays}d`) : 'Sin registro';

    const nextWorkout = (stats && stats.next_workout_name)
        ? stats.next_workout_name.replace(/^D[íi]a\s*\d+\s*:\s*/i, '')
        : 'Iniciar rutina';
    const workoutsMonth = (stats && stats.workouts_month) || 0;
    const latestWeight = (stats && stats.latest_weight) ? `${stats.latest_weight} kg` : '--';
    const activeCosplays = (stats && stats.active_cosplays) || 0;
    const pendingTasks = (stats && stats.pending_tasks) || 0;

    let html = `
        <div class="page-header" style="margin-bottom:14px">
            <div>
                <h1>${greeting}, Nicole ✨</h1>
                <div class="subtitle" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span>${fechaStr}</span>
                    <span id="dashWeatherHeaderPill">${buildWeatherHeaderPill(state.weatherData)}</span>
                </div>
            </div>
            <div class="page-actions" style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" onclick="state.personalTab='routine';navigate('personal')">🏋️‍♀️ Entrenar</button>
                <button class="btn btn-secondary btn-sm" onclick="state.personalTab='measurements';navigate('personal')">📏 Medidas</button>
                <button class="btn btn-secondary btn-sm" onclick="navigate('finance')">💸 Finanzas</button>
                <button class="btn btn-secondary btn-sm" onclick="navigate('cosplays')">🎭 Cosplays</button>
                <button class="btn btn-secondary btn-sm" onclick="showPersonalTaskForm()">+ Tarea</button>
            </div>
        </div>
        <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(155px,1fr));margin-bottom:18px">
            <div class="stat-card coral" style="cursor:pointer" onclick="state.personalTab='routine';navigate('personal')">
                <div class="stat-icon">🏋️‍♀️</div>
                <div class="stat-value" style="font-size:1.05rem;line-height:1.25;margin:4px 0">${esc(nextWorkout)}</div>
                <div class="stat-label">Toca hoy · ${workoutsMonth} este mes</div>
            </div>
            <div class="stat-card ${injOverdue || (stats && stats.estradiol_stock !== null && stats.estradiol_stock <= 2) ? 'rose' : 'lavender'}" style="cursor:pointer" onclick="state.personalTab='injections';navigate('personal')">
                <div class="stat-icon">💉</div>
                <div class="stat-value">${injLabel}</div>
                <div class="stat-label">${stats && stats.estradiol_stock !== null ? (stats.estradiol_stock <= 2 ? `⚠️ Quedan ${stats.estradiol_stock} dosis` : `E₂ · Stock: ${stats.estradiol_stock} dosis`) : 'Próxima dosis E₂'}</div>
            </div>
            <div class="stat-card sage" style="cursor:pointer" onclick="state.personalTab='measurements';navigate('personal')">
                <div class="stat-icon">⚖️</div>
                <div class="stat-value">${latestWeight}</div>
                <div class="stat-label">Último peso</div>
            </div>
            <div class="stat-card lavender" style="cursor:pointer" onclick="navigate('cosplays')">
                <div class="stat-icon">🎭</div>
                <div class="stat-value">${activeCosplays}</div>
                <div class="stat-label">${stats && stats.next_cosplay_name ? 'Próx: ' + esc(stats.next_cosplay_name) : 'Cosplays activos'}</div>
            </div>
            <div class="stat-card rose" style="cursor:pointer" onclick="state.personalTab='progress';navigate('personal')">
                <div class="stat-icon">📌</div>
                <div class="stat-value">${pendingTasks}</div>
                <div class="stat-label">Tareas pendientes</div>
            </div>
        </div>
        <div class="two-col">
            <div>
                ${buildCalendar(events)}
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
                <div id="dashWeatherMount">
                    ${buildWeatherWidgetHtml(state.weatherData)}
                </div>
                ${buildDashboardHabits(habits || [])}
                ${buildUpcomingTasks(tasks, stats)}
            </div>
        </div>
    `;
    el.innerHTML = html;
    renderDashboardWeatherAsync();
}

function buildDashboardHabits(habitList) {
    if (!habitList || habitList.length === 0) return '';
    let html = `<div class="card" style="padding:14px 18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div class="card-title" style="margin:0">✨ Hábitos de hoy</div>
            <button class="btn btn-ghost btn-sm" style="font-size:0.75rem" onclick="state.personalTab='progress';navigate('personal')">Ver todos</button>
        </div>`;
    for (const h of habitList) {
        const done = Boolean(h.done_today);
        html += `<div class="habit-item" style="padding:6px 0">
            <div class="habit-check${done ? ' done' : ''}" onclick="toggleHabitFromDash(${h.id})"></div>
            <div class="habit-name">${esc(h.name)}</div>
            <div class="habit-streak">🔥 ${h.streak || 0}d</div>
        </div>`;
    }
    html += `</div>`;
    return html;
}

async function toggleHabitFromDash(id) {
    await api(eel.toggle_habit_today, id);
    navigate('dashboard');
}
window.toggleHabitFromDash = toggleHabitFromDash;

function buildCalendar(events) {
    const { year, month } = state.cal;
    const today = new Date();
    const firstDay = new Date(year, month-1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','diciembre'];
    const wd = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    const todayEvents = (events && events[today.getDate()]) || [];

    let html = `<div class="card"><div class="calendar-header">
        <h3>${meses[month-1]} ${year}</h3>
        <div class="calendar-nav">
            <button onclick="calMove(-1)">◀</button>
            <button onclick="calMove(1)">▶</button>
        </div>
    </div><div class="calendar-grid">`;

    wd.forEach(d => { html += `<div class="calendar-weekday">${d}</div>`; });
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === today.getDate() && month === today.getMonth()+1 && year === today.getFullYear();
        const hasEvents = events && events[day] && events[day].length > 0;
        const cls = `calendar-day${isToday ? ' today' : ''}${hasEvents ? ' has-events' : ''}`;
        html += `<div class="${cls}" onclick="showDayEvents(${year},${month},${day})">${day}</div>`;
    }
    html += '</div>';

    if (todayEvents.length > 0) {
        html += '<div class="calendar-events">';
        todayEvents.slice(0, 5).forEach(ev => {
            const dotClass = ev.type === 'task' ? 'task' : ev.type === 'injection' ? 'injection' : 'assignment';
            html += `<div class="calendar-event">
                <div class="event-dot ${dotClass}"></div>
                <div class="event-text">${esc(ev.title)}</div>
            </div>`;
        });
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function buildUpcomingTasks(tasks, stats) {
    let html = '<div class="card"><div class="card-title">Próximos 7 días</div>';
    let hasItems = false;

    if (stats && stats.next_injection_days != null && stats.next_injection_days <= 7) {
        hasItems = true;
        const injOverdue = stats.overdue_injection;
        const badge = injOverdue ? '<span class="task-badge overdue">Vencida</span>' :
                      stats.next_injection_days <= 1 ? '<span class="task-badge due-soon">Hoy</span>' : '';
        html += `<div class="task-item injection-reminder" onclick="state.personalTab='injections';navigate('personal')">
            <div class="task-check" style="border-color:#B388EB;background:var(--bg-lavender)"></div>
            <div class="task-info">
                <div class="task-title">💉 Dosis de Estradiol</div>
                <div class="task-meta">${stats.next_injection_date ? fmtDate(stats.next_injection_date) : ''} · ${stats.next_injection_days > 0 ? `En ${stats.next_injection_days} día${stats.next_injection_days !== 1 ? 's' : ''}` : 'Hoy'}</div>
            </div>
            ${badge}
        </div>`;
    }

    if (stats && stats.next_cosplay_name && stats.next_cosplay_date) {
        const du = daysUntil(stats.next_cosplay_date);
        if (du !== null && du <= 14) {
            hasItems = true;
            html += `<div class="task-item" onclick="navigate('cosplays')">
                <div class="task-check" style="border-color:var(--rose)"></div>
                <div class="task-info">
                    <div class="task-title">🎭 Entrega: ${esc(stats.next_cosplay_name)}</div>
                    <div class="task-meta">${fmtDate(stats.next_cosplay_date)}</div>
                </div>
                ${du <= 3 ? '<span class="task-badge due-soon">Pronto</span>' : ''}
            </div>`;
        }
    }

    if (tasks && tasks.length > 0) {
        hasItems = true;
        for (const t of tasks) {
            const du = daysUntil(t.due_date);
            const badge = du !== null && du < 0 ? '<span class="task-badge overdue">Vencida</span>' :
                          du !== null && du <= 3 ? '<span class="task-badge due-soon">Pronto</span>' : '';
            html += `<div class="task-item" onclick="showTaskForm(${t.id})">
                <div class="task-check" onclick="event.stopPropagation();completeTask(${t.id})"></div>
                <div class="task-info">
                    <div class="task-title">${esc(t.title)}</div>
                    <div class="task-meta">${esc(t.area_name || '')} · ${fmtDate(t.due_date) || 'Sin fecha'}</div>
                </div>
                ${badge}
            </div>`;
        }
    }

    if (!hasItems) {
        html += '<div class="empty-state" style="padding:20px"><p>Todo al día esta semana ✨</p></div>';
    }
    html += '</div>';
    return html;
}

function calMove(dir) {
    state.cal.month += dir;
    if (state.cal.month > 12) { state.cal.month = 1; state.cal.year++; }
    if (state.cal.month < 1) { state.cal.month = 12; state.cal.year--; }
    navigate('dashboard');
}

async function showDayEvents(year, month, day) {
    const events = await api(eel.get_calendar_events, year, month);
    const dayEvents = (events && events[day]) || [];
    if (dayEvents.length === 0) {
        showToast('Sin eventos este día');
        return;
    }
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
    const typeIcon = { task:'📋', exam:'📝', doc:'📄', assignment:'📎', injection:'💉', cosplay:'🎭', workout:'🏋️‍♀️' };
    let html = dayEvents.map(ev => {
        let clickAttr = '';
        let cursorStyle = '';
        if (ev.type === 'exam' && ev.id) {
            clickAttr = `onclick="closeModal();navigate('university').then(() => editExamById(${ev.id}, ${ev.subject_id || 'null'}))" title="Clic para ver o editar examen"`;
            cursorStyle = 'cursor:pointer;';
        } else if (ev.type === 'assignment' && ev.id) {
            clickAttr = `onclick="closeModal();navigate('university').then(() => editAssignmentById(${ev.id}, ${ev.subject_id || 'null'}))" title="Clic para ver o editar TP"`;
            cursorStyle = 'cursor:pointer;';
        }
        return `<div class="calendar-event" style="margin-bottom:6px;${cursorStyle}" ${clickAttr}>
            <span style="margin-right:6px">${typeIcon[ev.type] || '📌'}</span>
            <div class="event-text">${esc(ev.title)}</div>
        </div>`;
    }).join('');
    openModal(`${day} de ${meses[month-1]}`, html);
    document.getElementById('modalSave').style.display = 'none';
    document.getElementById('modalCancel').style.display = 'none';
}

// ===================== WORK =====================
async function renderWork(el) {
    const tabs = ['tasks','clients','matrix','invoices','calculadora','cotizaciones','services','dailycontrol','employees','documents','reimbursements','overtime','lindley'];
    const labels = ['Tareas','Clientes','Matriz Mensual','Facturas','Calculadora IGV','Cotizaciones','Servicios','Control','Empleados','Documentos','Reembolsos','Días extra','Lindley'];

    let html = `<div class="page-header">
        <div><h1>Trabajo</h1><div class="subtitle">Control de gestión</div></div>
    </div>
    <div class="subnav">`;
    tabs.forEach(t => {
        html += `<button class="subnav-item${state.workTab === t ? ' active' : ''}" onclick="switchWorkTab('${t}')">${labels[tabs.indexOf(t)]}</button>`;
    });
    html += '</div><div id="workContent"></div>';
    el.innerHTML = html;

    const content = el.querySelector('#workContent');
    switch (state.workTab) {
        case 'tasks': await renderWorkTasks(content); break;
        case 'clients': await renderWorkClients(content); break;
        case 'matrix': await renderWorkMatrix(content); break;
        case 'invoices': await renderWorkInvoices(content); break;
        case 'calculadora': await renderWorkCalculator(content); break;
        case 'services': await renderWorkServices(content); break;
        case 'dailycontrol': await renderWorkDailyControl(content); break;
        case 'employees': await renderWorkEmployees(content); break;
        case 'documents': await renderWorkDocuments(content); break;
        case 'reimbursements': await renderWorkReimbursements(content); break;
        case 'overtime': await renderWorkOvertime(content); break;
        case 'lindley': await renderWorkLindley(content); break;
        case 'cotizaciones': await renderWorkQuotes(content); break;
    }
}

function switchWorkTab(tab) {
    state.workTab = tab;
    navigate('work');
}

// --- WORK TASKS ---
async function renderWorkTasks(el) {
    const all = await api(eel.get_tasks, 1) || [];
    const tasks = all.filter(t => t.status !== 'completed');
    const completed = await api(eel.get_completed_tasks, 1) || [];
    let html = `<div style="display:flex;justify-content:space-between;margin-bottom:14px">
        <div></div>
        <div style="display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" onclick="toggleCompletedTasks()">${state.showCompleted ? 'Ocultar' : 'Ver'} completadas (${completed.length})</button>
            <button class="btn btn-primary" onclick="showTaskForm()">+ Nueva tarea</button>
        </div>
    </div>`;
    if (tasks.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">📋</div><h3>Sin tareas pendientes</h3><p>Agrega tu primera tarea laboral</p></div>';
    } else {
        for (const t of tasks) {
            const du = daysUntil(t.due_date);
            const badge = du !== null && du < 0 ? '<span class="task-badge overdue">Vencida</span>' :
                          du !== null && du <= 3 ? '<span class="task-badge due-soon">Pronto</span>' : '';
            html += `<div class="task-item">
                <div class="task-check" onclick="completeTask(${t.id})"></div>
                <div class="task-info" onclick="showTaskForm(${t.id})">
                    <div class="task-title">${esc(t.title)}</div>
                    <div class="task-meta">${fmtDate(t.due_date) || 'Sin fecha'}${t.category ? ' · '+esc(t.category) : ''}</div>
                </div>
                ${badge}
                <div class="task-actions">
                    <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();deleteTask(${t.id})">✕</button>
                </div>
            </div>`;
        }
    }
    if (state.showCompleted && completed.length > 0) {
        html += `<div class="card" style="margin-top:16px"><div class="card-title">Completadas</div>`;
        for (const t of completed) {
            html += `<div class="task-item" style="opacity:0.6">
                <div class="task-check" style="background:var(--sage);border-color:var(--sage)"></div>
                <div class="task-info">
                    <div class="task-title" style="text-decoration:line-through">${esc(t.title)}</div>
                    <div class="task-meta">${fmtDate(t.due_date) || 'Sin fecha'}${t.category ? ' · '+esc(t.category) : ''}</div>
                </div>
            </div>`;
        }
        html += '</div>';
    }
    el.innerHTML = html;
}

function toggleCompletedTasks() {
    state.showCompleted = !state.showCompleted;
    navigate('work');
}

function showTaskForm(id) {
    if (id) {
        api(eel.get_tasks, 1).then(tasks => {
            const t = tasks.find(x => x.id === id);
            if (t) showTaskModal(t);
        });
    } else showTaskModal(null);
}

function showTaskModal(task) {
    const title = task ? 'Editar tarea' : 'Nueva tarea';
    const html = `<form id="modalForm">
        <div class="form-group"><label>Título</label><input class="form-control" name="title" value="${esc(task ? task.title : '')}" required></div>
        <div class="form-group"><label>Categoría</label><input class="form-control" name="category" value="${esc(task ? task.category : '')}"></div>
        <div class="form-row">
            <div class="form-group"><label>Fecha límite</label><input type="date" class="form-control" name="due_date" value="${task ? task.due_date : ''}"></div>
            <div class="form-group"><label>Prioridad</label><select class="form-control" name="priority">
                <option value="low" ${task && task.priority === 'low' ? 'selected' : ''}>Baja</option>
                <option value="medium" ${!task || task.priority === 'medium' ? 'selected' : ''}>Media</option>
                <option value="high" ${task && task.priority === 'high' ? 'selected' : ''}>Alta</option>
            </select></div>
        </div>
        <div class="form-group"><label>Descripción</label><textarea class="form-control" name="description">${esc(task ? task.description : '')}</textarea></div>
    </form>`;
    openModal(title, html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = { area_id: 1, title: f.get('title'), category: f.get('category'),
            due_date: f.get('due_date'), priority: f.get('priority'), description: f.get('description') };
        if (!data.title) { showToast('El título es obligatorio'); return; }
        const res = task ? await api(eel.update_task, task.id, data) : await api(eel.create_task, data);
        if (res && res.ok) { showToast(task ? 'Tarea actualizada' : 'Tarea creada'); closeModal(); navigate('work'); }
        else showToast('Error al guardar');
    };
}

async function completeTask(id) {
    const res = await api(eel.complete_task, id);
    if (res && res.ok) { showToast('¡Completada!'); navigate(state.view); }
}

async function deleteTask(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    const res = await api(eel.delete_task, id);
    if (res && res.ok) { showToast('Eliminada'); navigate(state.view); }
}

// --- WORK CLIENTS (sedes agrupadas por empresa) ---
async function renderWorkClients(el) {
    const sites = await api(eel.get_client_sites_grouped) || [];
    const clients = await api(eel.get_clients) || [];
    let html = '<div style="display:flex;justify-content:space-between;margin-bottom:14px">' +
        '<div><button class="btn btn-ghost btn-sm" onclick="showEmpresaForm()">+ Empresa</button></div>' +
        '<div><button class="btn btn-primary" onclick="showClientSiteForm()">+ Sede</button></div></div>';
    html += '<div id="clientSitesData" data-clients=\''+esc(JSON.stringify(clients))+'\'></div>';
    if (sites.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">🏢</div><h3>Sin clientes</h3><p>Agrega una empresa y luego sus sedes</p></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Empresa / Sede</th><th>Distrito</th><th>Contacto</th><th>Teléfono</th><th>Regular</th><th>Monto mensual</th><th></th></tr></thead><tbody>';
        let lastEmpresa = '';
        for (const s of sites) {
            const empresa = s.empresa || s.nombre_cliente;
            if (empresa !== lastEmpresa) {
                lastEmpresa = empresa;
                html += '<tr class="group-header"><td colspan="7"><strong>'+esc(empresa)+'</strong> <span style="color:#999;font-size:0.8rem">'+esc(s.ruc || '')+'</span></td></tr>';
            }
            const regular = s.is_regular ? '<span class="tag tag-sage">Sí</span>' : '<span class="tag">No</span>';
            const fee = s.monthly_fee ? 'S/ '+parseFloat(s.monthly_fee).toFixed(2) : '-';
            html += '<tr><td style="padding-left:28px">'+esc(s.nombre_cliente)+' <span style="color:#999;font-size:0.75rem">('+esc(s.codigo_cliente_sede || '')+')</span></td>' +
                '<td>'+esc(s.distrito || '-')+'</td><td>'+esc(s.contact_name || '-')+'</td><td>'+esc(s.phone || '-')+'</td>' +
                '<td>'+regular+'</td><td>'+fee+'</td>' +
                '<td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="showClientSiteForm('+s.id+')">✎</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="deleteClientSite('+s.id+')">✕</button></td></tr>';
        }
        html += '</tbody></table></div>';
    }
    el.innerHTML = html;
}

function showClientSiteForm(id) {
    if (id) {
        api(eel.get_client_sites_grouped).then(sites => {
            const s = sites.find(x => x.id === id);
            if (s) showClientSiteModal(s);
        });
    } else showClientSiteModal(null);
}

function showClientSiteModal(site) {
    api(eel.get_clients).then(clients => {
        clients = clients || [];
        const clientOpts = '<option value="">— Sin empresa —</option>' + clients.map(c =>
            '<option value="'+c.id+'"'+(site && site.parent_client_id === c.id ? ' selected' : '')+'>'+esc(c.business_name)+' ('+esc(c.ruc || '')+')</option>'
        ).join('');
        const html = '<form id="modalForm">' +
            '<div class="form-group"><label>Empresa</label><select class="form-control" name="client_id">'+clientOpts+'</select></div>' +
            '<div class="form-group"><label>Nombre de sede *</label><input class="form-control" name="nombre_cliente" value="'+esc(site ? site.nombre_cliente : '')+'"></div>' +
            '<div class="form-row"><div class="form-group"><label>Código cliente</label><input class="form-control" name="codigo_cliente" value="'+esc(site ? site.codigo_cliente : '')+'"></div>' +
            '<div class="form-group"><label>Código sede</label><input class="form-control" name="codigo_sede" value="'+esc(site ? site.codigo_sede : '')+'"></div></div>' +
            '<div class="form-group"><label>Código cliente-sede</label><input class="form-control" name="codigo_cliente_sede" value="'+esc(site ? site.codigo_cliente_sede : '')+'"></div>' +
            '<div class="form-group"><label>Distrito</label><input class="form-control" name="distrito" value="'+esc(site ? site.distrito : '')+'"></div>' +
            '<div class="form-row"><div class="form-group"><label>Cliente regular</label><select class="form-control" name="is_regular">' +
            '<option value="0"'+(site && site.is_regular ? '' : ' selected')+'>No</option>' +
            '<option value="1"'+(site && site.is_regular ? ' selected' : '')+'>Sí</option></select></div>' +
            '<div class="form-group"><label>Monto mensual (S/)</label><input type="number" step="0.01" class="form-control" name="monthly_fee" value="'+(site ? site.monthly_fee || '' : '')+'"></div></div>' +
            '<div class="form-group"><label>Servicios que realiza</label><textarea class="form-control" name="servicios" placeholder="Separar por comas">'+esc(site ? site.servicios || '' : '')+'</textarea></div>' +
            '<div class="form-row"><div class="form-group"><label>Contrato desde</label><input type="date" class="form-control" name="contract_start" value="'+(site ? site.contract_start || '' : '')+'"></div>' +
            '<div class="form-group"><label>Contrato hasta</label><input type="date" class="form-control" name="contract_end" value="'+(site ? site.contract_end || '' : '')+'"></div></div>' +
            '</form>';
        openModal(site ? 'Editar sede' : 'Nueva sede', html);
        document.getElementById('modalSave').onclick = async () => {
            const f = new FormData(document.getElementById('modalForm'));
            const data = {
                client_id: f.get('client_id') ? parseInt(f.get('client_id')) : null,
                nombre_cliente: f.get('nombre_cliente'),
                codigo_cliente: f.get('codigo_cliente'),
                codigo_sede: f.get('codigo_sede'),
                codigo_cliente_sede: f.get('codigo_cliente_sede'),
                distrito: f.get('distrito'),
                is_regular: f.get('is_regular') === '1' ? 1 : 0,
                monthly_fee: parseFloat(f.get('monthly_fee')) || null,
                servicios: f.get('servicios'),
                contract_start: f.get('contract_start'),
                contract_end: f.get('contract_end'),
            };
            if (!data.nombre_cliente) { showToast('El nombre de sede es obligatorio'); return; }
            const res = site ? await api(eel.update_client_site, site.id, data) : await api(eel.create_client_site, data);
            if (res && res.ok) { showToast(site ? 'Actualizada' : 'Creada'); closeModal(); navigate('work'); }
            else showToast('Error');
        };
    });
}

async function deleteClientSite(id) {
    if (!confirm('¿Eliminar esta sede? Se perderán registros de servicio relacionados.')) return;
    await api(eel.delete_client_site, id);
    showToast('Eliminada');
    navigate('work');
}

function showEmpresaForm(id) {
    api(eel.get_clients).then(clients => {
        const c = id ? clients.find(x => x.id === id) : null;
        const html = '<form id="modalForm">' +
            '<div class="form-group"><label>RUC</label><div style="display:flex;gap:8px">' +
            '<input class="form-control" name="ruc" id="empresaRucInput" value="'+esc(c ? c.ruc : '')+'" placeholder="11 dígitos">' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="buscarRucSunat()">🔍 SUNAT</button></div></div>' +
            '<div class="form-group"><label>Razón social *</label><input class="form-control" name="business_name" id="empresaNameInput" value="'+esc(c ? c.business_name : '')+'"></div>' +
            '<div class="form-row"><div class="form-group"><label>Contacto</label><input class="form-control" name="contact_name" value="'+esc(c ? c.contact_name : '')+'"></div>' +
            '<div class="form-group"><label>Teléfono</label><input class="form-control" name="phone" value="'+esc(c ? c.phone : '')+'"></div></div>' +
            '<div class="form-group"><label>Email</label><input class="form-control" name="email" value="'+esc(c ? c.email : '')+'"></div>' +
            '<div class="form-group"><label>Dirección</label><input class="form-control" name="address" id="empresaAddressInput" value="'+esc(c ? c.address : '')+'"></div>' +
            '</form>';
        openModal(c ? 'Editar empresa' : 'Nueva empresa', html);
        document.getElementById('modalSave').onclick = async () => {
            const f = new FormData(document.getElementById('modalForm'));
            const data = { business_name: f.get('business_name'), ruc: f.get('ruc'), contact_name: f.get('contact_name'),
                phone: f.get('phone'), email: f.get('email'), address: f.get('address') };
            if (!data.business_name) { showToast('La razón social es obligatoria'); return; }
            const res = c ? await api(eel.update_client, c.id, data) : await api(eel.create_client, data);
            if (res && res.ok) { showToast(c ? 'Actualizada' : 'Creada'); closeModal(); navigate('work'); }
            else showToast('Error');
        };
    });
}

async function buscarRucSunat() {
    const rucEl = document.getElementById('empresaRucInput');
    if (!rucEl || !rucEl.value.trim()) { showToast('Ingresa un número de RUC'); return; }
    showToast('Consultando RUC...');
    const res = await api(eel.lookup_ruc, rucEl.value.trim());
    if (res && res.ok) {
        if (res.business_name) document.getElementById('empresaNameInput').value = res.business_name;
        if (res.address) document.getElementById('empresaAddressInput').value = res.address;
        showToast('Datos cargados (' + (res.estado || 'OK') + ')');
    } else {
        showToast(res && res.error ? res.error : 'No se pudo consultar RUC');
    }
}


// ===================== WORK MATRIX (MATRIZ MENSUAL 12 MESES & OC) =====================

function toggleEmpresaExpand(clientId) {
    if (!state.expandedEmpresas) state.expandedEmpresas = {};
    const cur = state.expandedEmpresas[clientId] !== false;
    state.expandedEmpresas[clientId] = !cur;
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function expandAllEmpresas(expand) {
    if (!state.expandedEmpresas) state.expandedEmpresas = {};
    const clients = state.matrixData?.clients || [];
    for (const c of clients) {
        state.expandedEmpresas[c.id] = expand;
    }
    const allSites = state.matrixData?.sites || [];
    for (const s of allSites) {
        if (s.client_id) state.expandedEmpresas[s.client_id] = expand;
    }
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function onSearchMatrixMain(val) {
    state.matrixSearch = val;
    state.matrixOcSearch = val;
    if (val && val.trim().length > 0) {
        if (!state.expandedEmpresas) state.expandedEmpresas = {};
        const clients = state.matrixData?.clients || [];
        for (const c of clients) {
            state.expandedEmpresas[c.id] = true;
        }
    }
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function clearMatrixSearch() {
    state.matrixSearch = '';
    state.matrixOcSearch = '';
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

async function renderWorkMatrix(el) {
    state.matrixYear = state.matrixYear || (new Date().getFullYear() || 2026);
    state.matrixMonthFilter = state.matrixMonthFilter || 'all';
    state.matrixPeriodicityFilter = state.matrixPeriodicityFilter || 'all';
    state.matrixOcStatusFilter = state.matrixOcStatusFilter || 'all';
    state.matrixOcPeriodicityFilter = state.matrixOcPeriodicityFilter || 'all';
    state.matrixOcMonthFilter = state.matrixOcMonthFilter || (state.matrixMonthFilter !== 'all' ? String(state.matrixMonthFilter) : 'all');
    state.matrixOcSearch = state.matrixOcSearch || '';
    state.matrixSearch = state.matrixSearch || '';
    state.expandedEmpresas = state.expandedEmpresas || {};

    const [data, sitesGrouped, clients] = await Promise.all([
        api(eel.get_monthly_billing, state.matrixYear),
        api(eel.get_client_sites_grouped),
        api(eel.get_clients)
    ]);

    const resData = data || { year: state.matrixYear, clients: [], sites: [], invoices: [], orders: [] };
    state.matrixData = resData;
    state.allSites = sitesGrouped || [];
    state.allClients = clients || [];

    const allSites = resData.sites || [];
    const invoices = resData.invoices || [];
    const orders = resData.orders || [];

    // Filter sites based on periodicity
    const filteredSites = allSites.filter(s => {
        const per = s.periodicity || 'mensual';
        if (state.matrixPeriodicityFilter === 'mensual') return per === 'mensual';
        if (state.matrixPeriodicityFilter === 'bimensual') return per === 'bimensual';
        if (state.matrixPeriodicityFilter === 'trimestral') return per === 'trimestral' || per === 'semestral';
        if (state.matrixPeriodicityFilter === 'eventual') return per === 'eventual' || !s.is_regular;
        return true;
    });

    const mensualSitesCount = allSites.filter(s => (s.periodicity || 'mensual') === 'mensual').length;
    const bimensualSitesCount = allSites.filter(s => s.periodicity === 'bimensual').length;
    const trimestralSitesCount = allSites.filter(s => s.periodicity === 'trimestral' || s.periodicity === 'semestral').length;
    const eventualSitesCount = allSites.filter(s => (s.periodicity === 'eventual' || !s.is_regular)).length;

    const monthShorts = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const isCurYear = state.matrixYear === curYear;
    const searchVal = (state.matrixSearch || '').toLowerCase().trim();

    const isSingleMonth = state.matrixMonthFilter !== 'all';
    const mSel = isSingleMonth ? parseInt(state.matrixMonthFilter) : null;
    const selMonthName = isSingleMonth ? monthNames[mSel - 1] : '';

    // Totals strictly Sin IGV (Base Imponible)
    let totSinIgv = 0, totFacturado = 0, totDetr = 0, totCredito = 0;
    let kpiSinIgv = 0, kpiFacturado = 0, kpiDetr = 0, kpiCredito = 0;

    invoices.forEach(i => {
        totSinIgv += (i.amount || 0);
        totFacturado += (i.total || 0);
        totDetr += (i.detraccion || 0);
        totCredito += (i.credito || 0);
        if (!isSingleMonth || (i.month_billed || 0) === mSel) {
            kpiSinIgv += (i.amount || 0);
            kpiFacturado += (i.total || 0);
            kpiDetr += (i.detraccion || 0);
            kpiCredito += (i.credito || 0);
        }
    });

    // Expected monthly fees (Sin IGV)
    let kpiExpected = 0;
    filteredSites.forEach(s => {
        const fee = parseFloat(s.monthly_fee) || 0;
        const per = s.periodicity || 'mensual';
        if (isSingleMonth) {
            if (per === 'mensual') kpiExpected += fee;
            else if (per === 'bimensual' && (mSel % 2 === 0)) kpiExpected += fee;
            else if (per === 'trimestral' && (mSel % 3 === 0)) kpiExpected += fee;
            else if (per === 'semestral' && (mSel === 6 || mSel === 12)) kpiExpected += fee;
            else if (per === 'anual' && mSel === 12) kpiExpected += fee;
            else if (fee > 0 && !['bimensual', 'trimestral', 'semestral', 'anual'].includes(per)) kpiExpected += fee;
        } else {
            if (per === 'mensual') kpiExpected += (fee * 12);
            else if (per === 'bimensual') kpiExpected += (fee * 6);
            else if (per === 'trimestral') kpiExpected += (fee * 4);
            else if (per === 'semestral') kpiExpected += (fee * 2);
            else if (per === 'anual') kpiExpected += fee;
            else kpiExpected += (fee * 12);
        }
    });

    // Lookups
    const invMap = {};
    for (const inv of invoices) {
        if (inv.client_site_id) {
            const k = inv.client_site_id + '-' + (inv.month_billed || 0);
            if (!invMap[k]) invMap[k] = [];
            invMap[k].push(inv);
        }
        if (inv.client_id) {
            const kc = 'c' + inv.client_id + '-' + (inv.month_billed || 0);
            if (!invMap[kc]) invMap[kc] = [];
            invMap[kc].push(inv);
        }
    }

    const ocMap = {};
    for (const po of orders) {
        if (po.client_site_id) {
            const k = po.client_site_id + '-' + po.month;
            if (!ocMap[k]) ocMap[k] = [];
            ocMap[k].push(po);
        }
        if (po.client_id) {
            const kc = 'c' + po.client_id + '-' + po.month;
            if (!ocMap[kc]) ocMap[kc] = [];
            ocMap[kc].push(po);
        }
    }

    const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
    const invoicedOrdersCount = orders.filter(o => o.status === 'invoiced').length;

    const kpiOrders = isSingleMonth ? orders.filter(o => o.month === mSel) : orders;
    const kpiPendingOrdersCount = kpiOrders.filter(o => {
        if (o.status === 'invoiced') return false;
        const invList = (o.client_site_id ? invMap[o.client_site_id + '-' + o.month] : invMap['c' + o.client_id + '-' + o.month]) || [];
        const bTot = invList.reduce((acc, i) => acc + (i.amount || 0), 0);
        if (invList.some(i => i.purchase_order && i.purchase_order.trim() === o.oc_number.trim())) return false;
        if (bTot >= (o.amount || 0) && bTot > 0) return false;
        return true;
    }).length;

    // Group filtered sites by client (Empresa)
    const sitesByClient = {};
    for (const s of filteredSites) {
        const cid = s.client_id || 0;
        if (!sitesByClient[cid]) sitesByClient[cid] = [];
        sitesByClient[cid].push(s);
    }

    const clientObjMap = {};
    for (const c of (resData.clients || [])) clientObjMap[c.id] = c;
    for (const c of (clients || [])) if (!clientObjMap[c.id]) clientObjMap[c.id] = c;

    let companyIds = Object.keys(sitesByClient).map(x => parseInt(x));
    companyIds.sort((a, b) => {
        const nameA = (clientObjMap[a]?.business_name || sitesByClient[a]?.[0]?.empresa || '').toUpperCase();
        const nameB = (clientObjMap[b]?.business_name || sitesByClient[b]?.[0]?.empresa || '').toUpperCase();
        return nameA.localeCompare(nameB);
    });

    if (searchVal) {
        companyIds = companyIds.filter(cid => {
            const cName = (clientObjMap[cid]?.business_name || sitesByClient[cid]?.[0]?.empresa || '').toLowerCase();
            const cRuc = (clientObjMap[cid]?.ruc || '').toLowerCase();
            if (cName.includes(searchVal) || cRuc.includes(searchVal)) return true;

            const cSites = sitesByClient[cid] || [];
            for (const s of cSites) {
                if ((s.nombre_cliente || '').toLowerCase().includes(searchVal)) return true;
                if ((s.servicios || '').toLowerCase().includes(searchVal)) return true;
                if ((s.location_code || '').toLowerCase().includes(searchVal)) return true;
                for (let m = 1; m <= 12; m++) {
                    const ocs = ocMap[s.id + '-' + m] || [];
                    if (ocs.some(o => o.oc_number.toLowerCase().includes(searchVal) || (o.notes || '').toLowerCase().includes(searchVal))) return true;
                    const invs = invMap[s.id + '-' + m] || [];
                    if (invs.some(i => (i.purchase_order || '').toLowerCase().includes(searchVal) || `${i.series}-${i.number}`.toLowerCase().includes(searchVal))) return true;
                }
            }
            return false;
        });

        for (const cid of companyIds) {
            state.expandedEmpresas[cid] = true;
        }
    }

    let html = `
    <div class="page-header" style="margin-bottom:14px">
        <div>
            <h1>Matriz de Facturación Mensual</h1>
            <div class="subtitle">${isSingleMonth ? `Mes: ${selMonthName} ${state.matrixYear} · Todos los montos se expresan Sin IGV` : `Año ${state.matrixYear} · Todos los montos se expresan Sin IGV`}</div>
        </div>
        <div class="page-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:4px;background:var(--card);padding:4px 8px;border-radius:8px;border:1px solid var(--border-light)">
                <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted)">Año:</span>
                <button class="btn btn-ghost btn-sm" style="padding:2px 8px" onclick="changeMatrixYear(${state.matrixYear - 1})">◀</button>
                <select class="form-control" style="width:85px;font-weight:700;padding:4px 8px;font-size:0.85rem" onchange="changeMatrixYear(this.value)">
                    <option value="2024"${state.matrixYear === 2024 ? ' selected' : ''}>2024</option>
                    <option value="2025"${state.matrixYear === 2025 ? ' selected' : ''}>2025</option>
                    <option value="2026"${state.matrixYear === 2026 ? ' selected' : ''}>2026</option>
                    <option value="2027"${state.matrixYear === 2027 ? ' selected' : ''}>2027</option>
                </select>
                <button class="btn btn-ghost btn-sm" style="padding:2px 8px" onclick="changeMatrixYear(${state.matrixYear + 1})">▶</button>
            </div>
            <div style="display:flex;align-items:center;gap:4px;background:var(--card);padding:4px 8px;border-radius:8px;border:1px solid var(--border-light)">
                <span style="font-size:0.8rem;font-weight:700;color:var(--text-muted)">Mes:</span>
                <select class="form-control" style="width:135px;font-weight:600;padding:4px 8px;font-size:0.85rem" onchange="changeMatrixMonth(this.value)">
                    <option value="all"${state.matrixMonthFilter === 'all' ? ' selected' : ''}>📅 12 Meses</option>
                    ${monthNames.map((mn, idx) => `<option value="${idx+1}"${state.matrixMonthFilter === (idx+1) ? ' selected' : ''}>${mn}${isCurYear && (idx+1) === curMonth ? ' (Hoy)' : ''}</option>`).join('')}
                </select>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="showPurchaseOrderModal()">+ Registrar OC</button>
            <button class="btn btn-primary btn-sm" onclick="showInvoiceForm()">+ Nueva Factura</button>
        </div>
    </div>

    <!-- Native Nicole Stats Row -->
    <div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px">
        <div class="stat-card coral">
            <div class="stat-icon">📊</div>
            <div class="stat-value">S/ ${fmtMoney(kpiSinIgv)}</div>
            <div class="stat-label">Facturado ${isSingleMonth ? selMonthName : state.matrixYear} (Sin IGV)</div>
        </div>
        <div class="stat-card lavender">
            <div class="stat-icon">📅</div>
            <div class="stat-value">S/ ${fmtMoney(kpiExpected)}</div>
            <div class="stat-label">Cuota Pactada Teórica (Sin IGV)</div>
        </div>
        <div class="stat-card sage">
            <div class="stat-icon">💰</div>
            <div class="stat-value">S/ ${fmtMoney(kpiDetr)}</div>
            <div class="stat-label">Detracciones SPOT (12%)</div>
        </div>
        <div class="stat-card gold">
            <div class="stat-icon">📋</div>
            <div class="stat-value">${kpiOrders.length} <span style="font-size:0.85rem;font-weight:normal">(${kpiPendingOrdersCount} pend.)</span></div>
            <div class="stat-label">Órdenes de Compra (OC)</div>
        </div>
    </div>

    <!-- Matrix Card -->
    <div class="card" style="margin-bottom:24px;padding:0;overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
            <div>
                <div style="font-weight:700;font-size:1rem">${isSingleMonth ? `Control de Facturación · ${selMonthName} ${state.matrixYear}` : `Control de Facturación Mensual y Órdenes de Compra · Año ${state.matrixYear}`}</div>
                <div style="font-size:0.78rem;color:var(--text-muted)">Haz clic en una OC para facturarla directamente indicando el número de factura.</div>
            </div>
            <div style="display:flex;gap:12px;font-size:0.75rem;align-items:center;flex-wrap:wrap">
                <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:rgba(99,102,241,0.2);border-radius:2px;display:inline-block"></span> Facturada (Sin IGV)</span>
                <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:rgba(245,158,11,0.25);border:1px dashed #f59e0b;border-radius:2px;display:inline-block"></span> OC Pendiente</span>
                <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;background:var(--border-light);border-radius:2px;display:inline-block"></span> + OC (Pendiente)</span>
            </div>
        </div>

        <!-- Month Navigation Filter -->
        <div style="padding:10px 18px;background:var(--card);border-bottom:1px solid var(--border-light);display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase">Mes:</span>
                <div class="filter-pills" style="margin:0">
                    <button class="filter-pill${state.matrixMonthFilter === 'all' ? ' active' : ''}" onclick="changeMatrixMonth('all')">Todo el año (12m)</button>
                    ${monthShorts.map((name, idx) => {
                        const mNum = idx + 1;
                        const isCur = isCurYear && mNum === curMonth;
                        const isAct = state.matrixMonthFilter === mNum;
                        return `<button class="filter-pill${isAct ? ' active' : ''}" onclick="changeMatrixMonth(${mNum})" title="Ver ${monthNames[idx]}">
                            ${name}${isCur ? ' •' : ''}
                        </button>`;
                    }).join('')}
                </div>
            </div>
            ${isSingleMonth ? `
                <div style="display:flex;align-items:center;gap:6px">
                    <span class="tag tag-primary" style="font-weight:700;font-size:0.75rem">${selMonthName} ${state.matrixYear}</span>
                    <button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:3px 10px" onclick="changeMatrixMonth('all')">✕ Ver 12 meses</button>
                </div>
            ` : ''}
        </div>

        <!-- Toolbar: Search & Periodicity Filter -->
        <div style="padding:10px 18px;background:var(--card);border-bottom:1px solid var(--border-light);display:flex;gap:12px;flex-wrap:wrap;align-items:center">
            <div style="flex:1;min-width:240px">
                <input type="text" class="form-control" style="font-size:0.85rem;padding:6px 14px;border-radius:var(--radius-full)" placeholder="🔍 Buscar por OC, empresa, sede, servicio..." value="${esc(state.matrixSearch)}" oninput="onSearchMatrixMain(this.value)">
            </div>
            <div style="display:flex;gap:6px">
                <button class="btn btn-secondary btn-sm" onclick="expandAllEmpresas(true)">⊞ Expandir</button>
                <button class="btn btn-secondary btn-sm" onclick="expandAllEmpresas(false)">⊟ Colapsar</button>
                ${searchVal ? `<button class="btn btn-ghost btn-sm" onclick="clearMatrixSearch()">✕ Limpiar</button>` : ''}
            </div>
            <div class="filter-pills" style="margin:0">
                <button class="filter-pill${state.matrixPeriodicityFilter === 'all' ? ' active' : ''}" onclick="filterMatrixPeriodicity('all')">Todas (${allSites.length})</button>
                <button class="filter-pill${state.matrixPeriodicityFilter === 'mensual' ? ' active' : ''}" onclick="filterMatrixPeriodicity('mensual')">Mensuales (${mensualSitesCount})</button>
                <button class="filter-pill${state.matrixPeriodicityFilter === 'bimensual' ? ' active' : ''}" onclick="filterMatrixPeriodicity('bimensual')">Bimensuales (${bimensualSitesCount})</button>
                <button class="filter-pill${state.matrixPeriodicityFilter === 'trimestral' ? ' active' : ''}" onclick="filterMatrixPeriodicity('trimestral')">Trimestral/Sem (${trimestralSitesCount})</button>
                <button class="filter-pill${state.matrixPeriodicityFilter === 'eventual' ? ' active' : ''}" onclick="filterMatrixPeriodicity('eventual')">Eventuales (${eventualSitesCount})</button>
            </div>
        </div>`;

    if (companyIds.length === 0) {
        html += `<div style="padding:35px;text-align:center;color:var(--text-muted)">
            <p style="font-size:1.1rem;margin-bottom:6px">No se encontraron empresas o sedes con los filtros seleccionados</p>
            ${searchVal ? `<button class="btn btn-secondary btn-sm" onclick="clearMatrixSearch()">Limpiar búsqueda</button>` : ''}
        </div>`;
    } else if (isSingleMonth) {
        // ================= SINGLE MONTH FOCUSED TABLE =================
        html += `<div class="table-wrap" style="overflow-x:auto;max-height:680px">
            <table class="matrix-table">
                <thead style="position:sticky;top:0;background:var(--card);z-index:4">
                    <tr>
                        <th class="matrix-sticky-col" style="min-width:260px">Empresa / Sede / Servicio</th>
                        <th style="text-align:center;font-size:0.75rem;padding:6px 6px;min-width:85px">Frecuencia</th>
                        <th style="text-align:right;font-size:0.75rem;padding:6px 8px;min-width:105px">Cuota (Sin IGV)</th>
                        <th style="text-align:center;font-size:0.8rem;padding:8px 10px;min-width:260px">
                            ${selMonthName} ${state.matrixYear} (Sin IGV)
                        </th>
                        <th style="text-align:right;font-size:0.75rem;min-width:115px;padding:6px 8px">Facturado Mes</th>
                        <th style="text-align:center;font-size:0.75rem;min-width:95px;padding:6px 6px">Estado / Saldo</th>
                        <th style="text-align:center;font-size:0.75rem;min-width:115px;padding:6px 6px">Acción</th>
                    </tr>
                </thead>
                <tbody>`;

        let singleMonthBilledTotal = 0;
        let singleMonthExpectedTotal = 0;
        let singleMonthPendingOcTotal = 0;

        for (const cid of companyIds) {
            const clientSites = sitesByClient[cid] || [];
            const clientObj = clientObjMap[cid] || {};
            const compName = clientObj.business_name || clientSites[0]?.empresa || 'Cliente';
            const compRuc = clientObj.ruc || clientSites[0]?.ruc || '';
            const isExpanded = state.expandedEmpresas[cid] !== false;

            let empTotalCuota = 0;
            let empMonthBilled = 0;
            let empMonthPendingOcs = 0;

            let empMonthPendingOcAmount = 0;

            for (const s of clientSites) {
                const fee = parseFloat(s.monthly_fee) || 0;
                empTotalCuota += fee;
                singleMonthExpectedTotal += fee;

                const invs = invMap[s.id + '-' + mSel] || [];
                const mTot = invs.reduce((sum, x) => sum + (x.amount || 0), 0);
                empMonthBilled += mTot;
                singleMonthBilledTotal += mTot;

                const ocs = ocMap[s.id + '-' + mSel] || [];
                const pendingOcs = ocs.filter(o => {
                    if (o.status === 'invoiced') return false;
                    if (invs.some(i => i.purchase_order && i.purchase_order.trim() === o.oc_number.trim())) return false;
                    if (mTot >= (o.amount || 0) && mTot > 0) return false;
                    return true;
                });
                empMonthPendingOcs += pendingOcs.length;
                empMonthPendingOcAmount += pendingOcs.reduce((sum, o) => sum + (o.amount || 0), 0);
            }

            singleMonthPendingOcTotal += empMonthPendingOcAmount;

            // Company Row
            html += `<tr class="matrix-empresa-row ${isExpanded ? '' : 'collapsed'}" onclick="toggleEmpresaExpand(${cid})">
                <td class="matrix-sticky-col">
                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <div style="display:flex;align-items:center">
                            <span class="matrix-empresa-chevron">${isExpanded ? '▼' : '▶'}</span>
                            <div>
                                <span style="font-size:0.88rem;font-weight:700">${esc(compName)}</span>
                                ${compRuc ? `<span class="tag tag-ghost" style="margin-left:6px;font-size:0.68rem;padding:1px 4px">RUC ${esc(compRuc)}</span>` : ''}
                            </div>
                        </div>
                        <span class="tag tag-primary" style="font-size:0.7rem;padding:2px 6px">${clientSites.length} ${clientSites.length === 1 ? 'servicio' : 'servicios'}</span>
                    </div>
                </td>
                <td style="text-align:center;font-size:0.75rem;color:var(--text-muted);font-weight:600">Empresa</td>
                <td style="text-align:right;font-family:monospace;font-size:0.83rem;font-weight:700;padding:6px 8px">
                    ${empTotalCuota > 0 ? `S/ ${fmtMoney(empTotalCuota)}` : '—'}
                </td>
                <td style="text-align:center;padding:6px 8px">
                    ${empMonthBilled > 0 ? `<div style="font-family:monospace;font-weight:700;font-size:0.85rem;color:var(--accent)">S/ ${fmtMoney(empMonthBilled)}</div>` : ''}
                    ${empMonthPendingOcs > 0 ? `<div style="font-size:0.72rem;color:#b45309;font-weight:700">⏳ ${empMonthPendingOcs} OC por facturar</div>` : ''}
                    ${empMonthBilled === 0 && empMonthPendingOcs === 0 ? '<span style="color:var(--text-muted);font-size:0.75rem">—</span>' : ''}
                </td>
                <td style="text-align:right;font-family:monospace;font-weight:700;font-size:0.85rem;color:var(--accent);padding:6px 8px">
                    ${empMonthBilled > 0 ? `S/ ${fmtMoney(empMonthBilled)}` : '—'}
                </td>
                <td style="text-align:center;padding:6px 4px">
                    ${empMonthPendingOcs > 0 ? `
                        <span class="tag tag-gold" style="font-size:0.7rem;padding:2px 6px" title="Órdenes de compra pendientes de facturar">
                            ⏳ ${empMonthPendingOcs} OC pend.
                        </span>
                    ` : (empMonthBilled > 0 ? `
                        <span class="tag tag-sage" style="font-size:0.7rem;padding:2px 6px">
                            ✓ Facturado
                        </span>
                    ` : '<span style="color:var(--text-muted);font-size:0.75rem">—</span>')}
                </td>
                <td style="text-align:center;padding:6px 4px;font-size:0.72rem;color:var(--text-muted)">
                    ${isExpanded ? '▲ Colapsar' : '▼ Desglosar'}
                </td>
            </tr>`;

            // Child Site Rows
            if (isExpanded) {
                for (const s of clientSites) {
                    const fee = parseFloat(s.monthly_fee) || 0;
                    const per = s.periodicity || 'mensual';
                    const cellInvs = invMap[s.id + '-' + mSel] || [];
                    const cellOcs = ocMap[s.id + '-' + mSel] || [];
                    const monthAmount = cellInvs.reduce((acc, x) => acc + (x.amount || 0), 0);

                    const isCellMatched = searchVal && (
                        cellOcs.some(o => o.oc_number.toLowerCase().includes(searchVal)) ||
                        cellInvs.some(i => (i.purchase_order || '').toLowerCase().includes(searchVal))
                    );

                    let cellContent = '';
                    let actionButton = '';

                    if (cellInvs.length > 0 && cellOcs.length > 0) {
                        const po = cellOcs[0];
                        if (cellInvs.length === 1) {
                            const inv = cellInvs[0];
                            cellContent = `<div class="matrix-cell-invoiced ${isCellMatched ? 'matrix-cell-highlight' : ''}" style="padding:6px 10px;text-align:left;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="showInvoiceForm(${inv.id})">
                                <div>
                                    <div style="font-family:monospace;font-weight:700;font-size:0.85rem;color:var(--accent)">S/ ${fmtMoney(monthAmount)}</div>
                                    <div style="font-size:0.72rem;color:var(--text-muted)">Factura: <strong>${esc(inv.series)}-${esc(inv.number)}</strong></div>
                                </div>
                                <div style="text-align:right">
                                    <span class="tag tag-gold" style="font-size:0.72rem">OC ${esc(po.oc_number)}</span>
                                    <div style="font-size:0.68rem;color:#10b981;font-weight:700">✓ Facturado</div>
                                </div>
                            </div>`;
                            actionButton = `<button class="btn btn-ghost btn-sm" style="font-size:0.75rem;padding:3px 8px" onclick="showInvoiceForm(${inv.id})">✎ Factura</button>`;
                        } else {
                            // Multiple invoices in same cell (e.g. duplicate)
                            cellContent = `<div style="display:flex;flex-direction:column;gap:4px">` +
                                cellInvs.map(inv => `
                                    <div class="matrix-cell-invoiced" style="padding:4px 8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="showInvoiceForm(${inv.id})">
                                        <div>
                                            <span style="font-family:monospace;font-weight:700;font-size:0.82rem;color:var(--accent)">S/ ${fmtMoney(inv.amount || 0)}</span>
                                            <span style="font-size:0.72rem;color:var(--text-muted);margin-left:4px">F: <strong>${esc(inv.series)}-${esc(inv.number)}</strong></span>
                                        </div>
                                        <div style="display:flex;align-items:center;gap:4px">
                                            <span class="tag tag-sage" style="font-size:0.65rem">Facturada</span>
                                            <button class="btn btn-ghost btn-sm" style="padding:1px 5px;font-size:0.7rem;color:#ef4444" onclick="event.stopPropagation(); deleteInvoice(${inv.id}, '${esc(inv.series)}-${esc(inv.number)}')" title="Eliminar comprobante">✕</button>
                                        </div>
                                    </div>
                                `).join('') + `</div>`;
                            actionButton = `<button class="btn btn-ghost btn-sm" style="font-size:0.75rem;padding:3px 8px" onclick="showInvoiceForm(${cellInvs[0].id})">✎ Facturas (${cellInvs.length})</button>`;
                        }
                    } else if (cellOcs.length > 0) {
                        const po = cellOcs[0];
                        cellContent = `<div class="matrix-cell-oc ${isCellMatched ? 'matrix-cell-highlight' : ''}" style="padding:6px 10px;text-align:left;display:flex;justify-content:space-between;align-items:center" onclick="showQuickBillOcModal(${po.id})">
                            <div>
                                <div style="font-size:0.78rem;font-weight:700;color:#d97706">OC ${esc(po.oc_number)}</div>
                                <div style="font-size:0.7rem;color:var(--text-muted)">${po.centro_logistico ? 'Centro ' + esc(po.centro_logistico) : 'Registrada'}</div>
                            </div>
                            <div style="text-align:right">
                                <div style="font-size:0.8rem;color:#b45309;font-weight:700">⏳ S/ ${fmtMoney(po.amount || 0)}</div>
                                <div style="font-size:0.68rem;color:#f59e0b">Clic para facturar</div>
                            </div>
                        </div>`;
                        actionButton = `<button class="btn btn-primary btn-sm" style="font-size:0.72rem;padding:3px 8px" onclick="showQuickBillOcModal(${po.id})">Facturar ➔</button>`;
                    } else if (cellInvs.length > 0) {
                        if (cellInvs.length === 1) {
                            const inv = cellInvs[0];
                            const ocDisp = inv.purchase_order;
                            cellContent = `<div class="matrix-cell-invoiced ${isCellMatched ? 'matrix-cell-highlight' : ''}" style="padding:6px 10px;text-align:left;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="showInvoiceForm(${inv.id})">
                                <div>
                                    <div style="font-family:monospace;font-weight:700;font-size:0.85rem;color:var(--accent)">S/ ${fmtMoney(monthAmount)}</div>
                                    <div style="font-size:0.72rem;color:var(--text-muted)">F: <strong>${esc(inv.series)}-${esc(inv.number)}</strong></div>
                                </div>
                                <div style="text-align:right">
                                    ${ocDisp ? `<span class="tag tag-gold" style="font-size:0.72rem">OC ${esc(ocDisp)}</span>` : '<span style="font-size:0.68rem;color:#10b981;font-weight:700">✓ Facturado</span>'}
                                </div>
                            </div>`;
                            actionButton = `<button class="btn btn-ghost btn-sm" style="font-size:0.75rem;padding:3px 8px" onclick="showInvoiceForm(${inv.id})">✎ Factura</button>`;
                        } else {
                            cellContent = `<div style="display:flex;flex-direction:column;gap:4px">` +
                                cellInvs.map(inv => `
                                    <div class="matrix-cell-invoiced" style="padding:4px 8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="showInvoiceForm(${inv.id})">
                                        <div>
                                            <span style="font-family:monospace;font-weight:700;font-size:0.82rem;color:var(--accent)">S/ ${fmtMoney(inv.amount || 0)}</span>
                                            <span style="font-size:0.72rem;color:var(--text-muted);margin-left:4px">F: <strong>${esc(inv.series)}-${esc(inv.number)}</strong></span>
                                        </div>
                                        <div style="display:flex;align-items:center;gap:4px">
                                            <span class="tag tag-sage" style="font-size:0.65rem">Facturada</span>
                                            <button class="btn btn-ghost btn-sm" style="padding:1px 5px;font-size:0.7rem;color:#ef4444" onclick="event.stopPropagation(); deleteInvoice(${inv.id}, '${esc(inv.series)}-${esc(inv.number)}')" title="Eliminar comprobante">✕</button>
                                        </div>
                                    </div>
                                `).join('') + `</div>`;
                            actionButton = `<button class="btn btn-ghost btn-sm" style="font-size:0.75rem;padding:3px 8px" onclick="showInvoiceForm(${cellInvs[0].id})">✎ Facturas (${cellInvs.length})</button>`;
                        }
                    } else {
                        cellContent = `<div class="matrix-cell-empty" style="padding:8px 6px;text-align:center" onclick="showPurchaseOrderModal(null, ${s.id}, ${s.client_id}, ${mSel}, ${state.matrixYear})">
                            <span style="font-size:0.75rem;font-weight:600">+ Registrar OC / Cuota</span>
                        </div>`;
                        actionButton = `<button class="btn btn-ghost btn-sm" style="font-size:0.72rem;padding:3px 8px" onclick="showPurchaseOrderModal(null, ${s.id}, ${s.client_id}, ${mSel}, ${state.matrixYear})">+ OC</button>`;
                    }

                    // Estado / Saldo: SI NO HAY OC, NO DEBE SALIR SALDO NEGATIVO (no es pérdida)
                    let statusSiteBadge = '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';
                    if (cellOcs.length > 0) {
                        const ocSum = cellOcs.reduce((sum, o) => sum + (o.amount || 0), 0);
                        const hasPendingOc = cellOcs.some(o => o.status === 'pending');
                        if (monthAmount >= ocSum && ocSum > 0) {
                            if (monthAmount > ocSum) {
                                statusSiteBadge = `<span class="tag tag-sage" style="font-size:0.7rem;padding:2px 6px">+S/ ${fmtMoney(monthAmount - ocSum)}</span>`;
                            } else {
                                statusSiteBadge = `<span class="tag tag-sage" style="font-size:0.7rem;padding:2px 6px">✓ Facturado</span>`;
                            }
                        } else if (hasPendingOc) {
                            const pendDiff = ocSum - monthAmount;
                            statusSiteBadge = `<span class="tag tag-gold" style="font-size:0.7rem;padding:2px 6px" title="OC pendiente de facturar">⏳ S/ ${fmtMoney(pendDiff)} pend.</span>`;
                        }
                    } else if (monthAmount > 0) {
                        statusSiteBadge = `<span class="tag tag-sage" style="font-size:0.7rem;padding:2px 6px">+S/ ${fmtMoney(monthAmount)}</span>`;
                    } else {
                        statusSiteBadge = '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';
                    }

                    html += `<tr class="matrix-site-row">
                        <td class="matrix-sticky-col matrix-site-indent">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
                                <div style="font-weight:600;font-size:0.82rem;cursor:pointer" onclick="showEditSiteModal(${s.id})" title="Editar sede, frecuencia y cuota pactada">
                                    ${esc(s.nombre_cliente)} <span style="font-size:0.75rem;color:var(--text-muted)">✏️</span>
                                </div>
                            </div>
                            <div style="font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                                <span>${esc(s.servicios || 'Servicio')}</span>
                                ${s.location_code ? `<span class="tag tag-ghost" style="padding:0 4px;font-size:0.65rem">Loc: ${esc(s.location_code)}</span>` : ''}
                            </div>
                        </td>
                        <td style="text-align:center;padding:4px 6px;cursor:pointer" onclick="showEditSiteModal(${s.id})">
                            <span class="tag-periodicity-${per}">${per}</span>
                        </td>
                        <td style="text-align:right;font-family:monospace;font-size:0.8rem;font-weight:600;padding:6px 8px;cursor:pointer" onclick="showEditSiteModal(${s.id})">
                            ${fee > 0 ? `S/ ${fmtMoney(fee)}` : '—'}
                        </td>
                        <td style="padding:4px 6px">
                            ${cellContent}
                        </td>
                        <td style="text-align:right;font-family:monospace;font-weight:700;font-size:0.82rem;padding:6px 8px">
                            ${monthAmount > 0 ? `S/ ${fmtMoney(monthAmount)}` : '—'}
                        </td>
                        <td style="text-align:center;padding:6px 4px">
                            ${statusSiteBadge}
                        </td>
                        <td style="text-align:center;padding:6px 4px;white-space:nowrap">
                            ${actionButton}
                        </td>
                    </tr>`;
                }
            }
        }

        const singleMonthDiff = singleMonthBilledTotal - singleMonthExpectedTotal;

        html += `</tbody>
                <tfoot style="position:sticky;bottom:0;background:var(--card);font-weight:700;z-index:3;border-top:2px solid var(--border-light)">
                    <tr>
                        <td class="matrix-sticky-col" style="font-weight:700;font-size:0.82rem">Totales ${selMonthName} ${state.matrixYear} (Sin IGV)</td>
                        <td style="text-align:center">-</td>
                        <td style="text-align:right;font-family:monospace;font-size:0.8rem">S/ ${fmtMoney(singleMonthExpectedTotal)}</td>
                        <td style="text-align:center;font-family:monospace;font-size:0.82rem;padding:8px;background:rgba(99,102,241,0.06);color:var(--primary)">
                            S/ ${fmtMoney(singleMonthBilledTotal)} Facturado
                        </td>
                        <td style="text-align:right;font-family:monospace;font-size:0.85rem;color:var(--accent);padding:8px">
                            S/ ${fmtMoney(singleMonthBilledTotal)}
                        </td>
                        <td style="text-align:center">
                            ${singleMonthPendingOcTotal > 0 ? `
                                <span class="tag tag-gold" style="font-size:0.72rem">
                                    ⏳ S/ ${fmtMoney(singleMonthPendingOcTotal)} por facturar
                                </span>
                            ` : (singleMonthBilledTotal > 0 ? `
                                <span class="tag tag-sage" style="font-size:0.72rem">
                                    ✓ Facturación al día
                                </span>
                            ` : '<span style="color:var(--text-muted);font-size:0.72rem">—</span>')}
                        </td>
                        <td style="text-align:center">-</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
    } else {
        // ================= 12-MONTH FULL MATRIX =================
        html += `<div class="table-wrap" style="overflow-x:auto;max-height:680px">
            <table class="matrix-table">
                <thead style="position:sticky;top:0;background:var(--card);z-index:4">
                    <tr>
                        <th class="matrix-sticky-col">Empresa / Sede / Servicio</th>
                        <th style="text-align:center;font-size:0.75rem;padding:6px 6px">Frecuencia</th>
                        <th style="text-align:right;font-size:0.75rem;padding:6px 8px;min-width:100px">Cuota (Sin IGV)</th>`;

        for (let m = 1; m <= 12; m++) {
            const isThisMonth = isCurYear && m === curMonth;
            const extraCls = isThisMonth ? ' matrix-month-cur' : '';
            html += `<th class="${extraCls} matrix-month-clickable" style="text-align:center;font-size:0.75rem;min-width:74px;padding:6px 4px;cursor:pointer" onclick="changeMatrixMonth(${m})" title="Ver ${monthNames[m-1]}">${monthShorts[m-1]}${isThisMonth ? ' <span style="font-size:0.65rem;color:var(--accent);display:block;margin-top:-2px">(Hoy)</span>' : ''}</th>`;
        }

        html += `
                        <th style="text-align:right;font-size:0.75rem;min-width:100px;padding:6px 8px">Total Sin IGV</th>
                        <th style="text-align:center;font-size:0.75rem;min-width:85px;padding:6px 6px">Estado</th>
                    </tr>
                </thead>
                <tbody>`;

        const monthTotals = new Array(13).fill(0);
        let grandTotalAnnual = 0;

        for (const cid of companyIds) {
            const clientSites = sitesByClient[cid] || [];
            const clientObj = clientObjMap[cid] || {};
            const compName = clientObj.business_name || clientSites[0]?.empresa || 'Cliente';
            const compRuc = clientObj.ruc || clientSites[0]?.ruc || '';
            const isExpanded = state.expandedEmpresas[cid] !== false;

            let empTotalCuota = 0;
            const empMonthTotals = new Array(13).fill(0);
            const empMonthPendingOcs = new Array(13).fill(0);
            let empAnnualInvoiced = 0;

            for (const s of clientSites) {
                empTotalCuota += (parseFloat(s.monthly_fee) || 0);
                for (let m = 1; m <= 12; m++) {
                    const invs = invMap[s.id + '-' + m] || [];
                    const mTot = invs.reduce((sum, x) => sum + (x.amount || 0), 0);
                    empMonthTotals[m] += mTot;
                    empAnnualInvoiced += mTot;
                    monthTotals[m] += mTot;

                    const ocs = ocMap[s.id + '-' + m] || [];
                    const pOcs = ocs.filter(o => {
                        if (o.status === 'invoiced') return false;
                        if (invs.some(i => i.purchase_order && i.purchase_order.trim() === o.oc_number.trim())) return false;
                        if (mTot >= (o.amount || 0) && mTot > 0) return false;
                        return true;
                    });
                    empMonthPendingOcs[m] += pOcs.length;
                }
            }
            grandTotalAnnual += empAnnualInvoiced;

            // Empresa Parent Row
            html += `<tr class="matrix-empresa-row ${isExpanded ? '' : 'collapsed'}" onclick="toggleEmpresaExpand(${cid})">
                <td class="matrix-sticky-col">
                    <div style="display:flex;align-items:center;justify-content:space-between">
                        <div style="display:flex;align-items:center">
                            <span class="matrix-empresa-chevron">${isExpanded ? '▼' : '▶'}</span>
                            <div>
                                <span style="font-size:0.88rem;font-weight:700">${esc(compName)}</span>
                                ${compRuc ? `<span class="tag tag-ghost" style="margin-left:6px;font-size:0.68rem;padding:1px 4px">RUC ${esc(compRuc)}</span>` : ''}
                            </div>
                        </div>
                        <span class="tag tag-primary" style="font-size:0.7rem;padding:2px 6px">${clientSites.length} ${clientSites.length === 1 ? 'servicio' : 'servicios'}</span>
                    </div>
                </td>
                <td style="text-align:center;font-size:0.75rem;color:var(--text-muted);font-weight:600">Empresa</td>
                <td style="text-align:right;font-family:monospace;font-size:0.83rem;font-weight:700;padding:6px 8px">
                    ${empTotalCuota > 0 ? `S/ ${fmtMoney(empTotalCuota)}` : '—'}
                </td>`;

            for (let m = 1; m <= 12; m++) {
                const totM = empMonthTotals[m];
                const pendOcs = empMonthPendingOcs[m];
                html += `<td style="text-align:center;padding:4px 3px">
                    ${totM > 0 ? `<div style="font-family:monospace;font-weight:700;font-size:0.78rem;color:var(--accent)">S/ ${fmtMoney(totM)}</div>` : ''}
                    ${pendOcs > 0 ? `<div style="font-size:0.65rem;color:#b45309;font-weight:700">⏳ ${pendOcs} OC</div>` : ''}
                    ${totM === 0 && pendOcs === 0 ? '<span style="color:var(--text-muted);font-size:0.75rem">—</span>' : ''}
                </td>`;
            }

            html += `
                <td style="text-align:right;font-family:monospace;font-weight:700;font-size:0.85rem;color:var(--accent);padding:6px 8px">
                    S/ ${fmtMoney(empAnnualInvoiced)}
                </td>
                <td style="text-align:center;padding:6px 4px;font-size:0.72rem;color:var(--text-muted)">
                    ${isExpanded ? '▲ Colapsar' : '▼ Desglosar'}
                </td>
            </tr>`;

            // Child Site Rows
            if (isExpanded) {
                for (const s of clientSites) {
                    const fee = parseFloat(s.monthly_fee) || 0;
                    const per = s.periodicity || 'mensual';
                    let siteInvoicedSum = 0;
                    let siteBilledMonths = 0;

                    html += `<tr class="matrix-site-row">
                        <td class="matrix-sticky-col matrix-site-indent">
                            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
                                <div style="font-weight:600;font-size:0.82rem;cursor:pointer" onclick="showEditSiteModal(${s.id})" title="Editar sede, frecuencia y cuota pactada">
                                    ${esc(s.nombre_cliente)} <span style="font-size:0.75rem;color:var(--text-muted)">✏️</span>
                                </div>
                            </div>
                            <div style="font-size:0.72rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                                <span>${esc(s.servicios || 'Servicio')}</span>
                                ${s.location_code ? `<span class="tag tag-ghost" style="padding:0 4px;font-size:0.65rem">Loc: ${esc(s.location_code)}</span>` : ''}
                            </div>
                        </td>
                        <td style="text-align:center;padding:4px 6px;cursor:pointer" onclick="showEditSiteModal(${s.id})">
                            <span class="tag-periodicity-${per}">${per}</span>
                        </td>
                        <td style="text-align:right;font-family:monospace;font-size:0.8rem;font-weight:600;padding:6px 8px;cursor:pointer" onclick="showEditSiteModal(${s.id})">
                            ${fee > 0 ? `S/ ${fmtMoney(fee)}` : '—'}
                        </td>`;

                    for (let m = 1; m <= 12; m++) {
                        const cellInvs = invMap[s.id + '-' + m] || [];
                        const cellOcs = ocMap[s.id + '-' + m] || [];
                        const monthAmount = cellInvs.reduce((acc, x) => acc + (x.amount || 0), 0);

                        if (cellInvs.length > 0) {
                            siteInvoicedSum += monthAmount;
                            siteBilledMonths++;
                        }

                        const isCellMatched = searchVal && (
                            cellOcs.some(o => o.oc_number.toLowerCase().includes(searchVal)) ||
                            cellInvs.some(i => (i.purchase_order || '').toLowerCase().includes(searchVal))
                        );

                        html += `<td style="padding:4px 3px">`;

                        if (cellInvs.length > 0 && cellOcs.length > 0) {
                            const po = cellOcs[0];
                            const inv = cellInvs[0];
                            html += `<div class="matrix-cell-invoiced ${isCellMatched ? 'matrix-cell-highlight' : ''}" onclick="showInvoiceForm(${inv.id})" title="Factura S/ ${fmtMoney(monthAmount)} - OC: ${esc(po.oc_number)}">
                                <div style="font-family:monospace;font-weight:700;font-size:0.76rem;color:var(--accent)">S/ ${fmtMoney(monthAmount)}</div>
                                <div style="font-size:0.65rem;color:var(--text-muted)">F: ${esc(inv.series)}-${esc(inv.number)}</div>
                                <div style="font-size:0.68rem;font-weight:700;color:#d97706;margin-top:2px">OC ${esc(po.oc_number)}</div>
                            </div>`;
                        } else if (cellOcs.length > 0) {
                            const po = cellOcs[0];
                            html += `<div class="matrix-cell-oc ${isCellMatched ? 'matrix-cell-highlight' : ''}" onclick="showQuickBillOcModal(${po.id})" title="OC: ${esc(po.oc_number)} - S/ ${fmtMoney(po.amount)}. Clic para facturar">
                                <div style="font-size:0.73rem;font-weight:700;color:#d97706">OC ${esc(po.oc_number)}</div>
                                <div style="font-size:0.65rem;color:#b45309">⏳ S/ ${fmtMoney(po.amount || 0)}</div>
                            </div>`;
                        } else if (cellInvs.length > 0) {
                            const inv = cellInvs[0];
                            const ocDisp = inv.purchase_order;
                            html += `<div class="matrix-cell-invoiced ${isCellMatched ? 'matrix-cell-highlight' : ''}" onclick="showInvoiceForm(${inv.id})" title="Factura emitida S/ ${fmtMoney(monthAmount)}">
                                <div style="font-family:monospace;font-weight:700;font-size:0.76rem;color:var(--accent)">S/ ${fmtMoney(monthAmount)}</div>
                                <div style="font-size:0.65rem;color:var(--text-muted)">F: ${esc(inv.series)}-${esc(inv.number)}</div>
                                ${ocDisp ? `<div style="font-size:0.65rem;color:#f59e0b;font-weight:700">OC ${esc(ocDisp)}</div>` : ''}
                            </div>`;
                        } else {
                            html += `<div class="matrix-cell-empty" onclick="showPurchaseOrderModal(null, ${s.id}, ${s.client_id}, ${m}, ${state.matrixYear})" title="Registrar OC de ${monthShorts[m-1]}">+ OC</div>`;
                        }

                        html += `</td>`;
                    }

                    const siteYearOcs = (orders || []).filter(o => o.client_site_id === s.id);
                    const sitePendingOcs = siteYearOcs.filter(o => o.status === 'pending');
                    const sitePendingSum = sitePendingOcs.reduce((acc, o) => acc + (o.amount || 0), 0);

                    let site12mStatusBadge = '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';
                    if (sitePendingSum > 0) {
                        site12mStatusBadge = `<span class="tag tag-gold" style="font-size:0.7rem;padding:2px 6px">⏳ S/ ${fmtMoney(sitePendingSum)} pend.</span>`;
                    } else if (siteInvoicedSum > 0) {
                        site12mStatusBadge = `<span class="tag tag-sage" style="font-size:0.7rem;padding:2px 6px">✓ Facturado</span>`;
                    } else {
                        site12mStatusBadge = '<span style="color:var(--text-muted);font-size:0.75rem">—</span>';
                    }

                    html += `
                        <td style="text-align:right;font-family:monospace;font-weight:700;font-size:0.82rem;padding:6px 8px">
                            ${siteInvoicedSum > 0 ? `S/ ${fmtMoney(siteInvoicedSum)}` : '—'}
                        </td>
                        <td style="text-align:center;padding:6px 4px">
                            ${site12mStatusBadge}
                        </td>
                    </tr>`;
                }
            }
        }

        html += `</tbody>
                <tfoot style="position:sticky;bottom:0;background:var(--card);font-weight:700;z-index:3;border-top:2px solid var(--border-light)">
                    <tr>
                        <td class="matrix-sticky-col" style="font-weight:700;font-size:0.82rem">Totales Mensuales (Sin IGV)</td>
                        <td style="text-align:center">-</td>
                        <td style="text-align:right;font-family:monospace;font-size:0.8rem">-</td>`;

        for (let m = 1; m <= 12; m++) {
            html += `<td style="text-align:center;font-family:monospace;font-size:0.78rem;padding:8px 4px;background:rgba(99,102,241,0.06)">
                ${monthTotals[m] > 0 ? `S/ ${fmtMoney(monthTotals[m])}` : '—'}
            </td>`;
        }

        html += `
                        <td style="text-align:right;font-family:monospace;font-size:0.85rem;color:var(--accent);padding:8px">
                            S/ ${fmtMoney(grandTotalAnnual)}
                        </td>
                        <td style="text-align:center">-</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
    }
    html += `</div>`;

    // Section 2: Purchase Orders Table
    const filteredOrders = orders.filter(o => {
        if (state.matrixOcStatusFilter === 'pending' && o.status !== 'pending') return false;
        if (state.matrixOcStatusFilter === 'invoiced' && o.status !== 'invoiced') return false;
        if (state.matrixOcPeriodicityFilter === 'mensual' && (o.periodicity || 'mensual') !== 'mensual') return false;
        if (state.matrixOcPeriodicityFilter === 'bimensual' && o.periodicity !== 'bimensual') return false;
        if (state.matrixOcPeriodicityFilter === 'eventual' && o.periodicity !== 'eventual') return false;
        if (state.matrixOcMonthFilter !== 'all' && String(o.month) !== String(state.matrixOcMonthFilter)) return false;
        if (state.matrixOcSearch) {
            const q = state.matrixOcSearch.toLowerCase();
            const hit = (o.oc_number || '').toLowerCase().includes(q) ||
                        (o.empresa || '').toLowerCase().includes(q) ||
                        (o.site_name || '').toLowerCase().includes(q) ||
                        (o.notes || '').toLowerCase().includes(q);
            if (!hit) return false;
        }
        return true;
    });

    html += `
    <div class="card" style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
            <div>
                <div style="font-weight:700;font-size:1rem;display:flex;align-items:center;gap:8px">
                    Órdenes de Compra (OC) — Año ${state.matrixYear}${isSingleMonth ? ` (${selMonthName})` : ''}
                    <span class="tag tag-ghost">${filteredOrders.length}</span>
                </div>
                <div style="font-size:0.78rem;color:var(--text-muted)">Haz clic en "Facturar" para registrar el comprobante de una OC con un solo clic.</div>
            </div>
            <button class="btn btn-primary btn-sm" onclick="showPurchaseOrderModal()">+ Nueva OC</button>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
            <div style="flex:1;min-width:240px">
                <input type="text" class="form-control" style="font-size:0.85rem;padding:6px 14px;border-radius:var(--radius-full)" placeholder="🔍 Buscar por N° OC, cliente, sede..." value="${esc(state.matrixOcSearch)}" oninput="onSearchMatrixOc(this.value)">
            </div>
            <div class="filter-pills" style="margin:0">
                <button class="filter-pill${state.matrixOcStatusFilter === 'all' ? ' active' : ''}" onclick="filterMatrixOcStatus('all')">Todas (${orders.length})</button>
                <button class="filter-pill${state.matrixOcStatusFilter === 'pending' ? ' active' : ''}" onclick="filterMatrixOcStatus('pending')">⏳ Por facturar (${pendingOrdersCount})</button>
                <button class="filter-pill${state.matrixOcStatusFilter === 'invoiced' ? ' active' : ''}" onclick="filterMatrixOcStatus('invoiced')">✅ Facturadas (${invoicedOrdersCount})</button>
            </div>
            <div class="filter-pills" style="margin:0">
                <button class="filter-pill${state.matrixOcPeriodicityFilter === 'all' ? ' active' : ''}" onclick="filterMatrixOcPeriodicity('all')">Frecuencia: Todas</button>
                <button class="filter-pill${state.matrixOcPeriodicityFilter === 'mensual' ? ' active' : ''}" onclick="filterMatrixOcPeriodicity('mensual')">Mensual</button>
                <button class="filter-pill${state.matrixOcPeriodicityFilter === 'bimensual' ? ' active' : ''}" onclick="filterMatrixOcPeriodicity('bimensual')">Bimensual</button>
                <button class="filter-pill${state.matrixOcPeriodicityFilter === 'eventual' ? ' active' : ''}" onclick="filterMatrixOcPeriodicity('eventual')">Eventual</button>
            </div>
            <div>
                <select class="form-control" style="font-size:0.85rem;padding:6px 28px 6px 12px;border-radius:var(--radius-full);width:auto" onchange="filterMatrixOcMonth(this.value)">
                    <option value="all"${state.matrixOcMonthFilter === 'all' ? ' selected' : ''}>Todos los meses</option>
                    ${monthNames.map((mn, idx) => `<option value="${idx+1}"${String(state.matrixOcMonthFilter) === String(idx+1) ? ' selected' : ''}>${mn}</option>`).join('')}
                </select>
            </div>
        </div>`;

    if (filteredOrders.length === 0) {
        html += `<div class="empty-state" style="padding:25px"><p>No hay órdenes de compra registradas con los filtros seleccionados</p></div>`;
    } else {
        html += `<div class="table-wrap"><table>
            <thead>
                <tr>
                    <th style="width:55px">Mes</th>
                    <th style="width:110px">N° de Orden (OC)</th>
                    <th style="width:95px">Fecha</th>
                    <th>Empresa</th>
                    <th>Sede / Centro</th>
                    <th style="text-align:center;width:95px">Frecuencia</th>
                    <th style="text-align:right;width:110px">Monto Sin IGV</th>
                    <th>Detalle</th>
                    <th style="text-align:center;width:105px">Estado</th>
                    <th style="text-align:right;width:160px">Acciones</th>
                </tr>
            </thead>
            <tbody>`;

        for (const po of filteredOrders) {
            const isPending = po.status === 'pending';
            const mName = monthShorts[(po.month || 1) - 1];
            const per = po.periodicity || 'mensual';

            html += `<tr>
                <td style="font-weight:700;font-size:0.85rem">${mName}</td>
                <td>
                    <span class="tag tag-primary" style="font-family:monospace;font-size:0.85rem">OC ${esc(po.oc_number)}</span>
                </td>
                <td style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap">${po.issue_date || '—'}</td>
                <td>
                    <strong>${esc(po.sociedad_name || po.empresa || '')}</strong>
                </td>
                <td>
                    <div style="font-weight:600;font-size:0.83rem">${esc(po.centro_logistico || po.site_name || 'Toda la empresa')}</div>
                </td>
                <td style="text-align:center">
                    <span class="tag-periodicity-${per}">${per}</span>
                </td>
                <td style="text-align:right;font-family:monospace;font-weight:700;font-size:0.85rem">
                    ${po.amount ? `S/ ${fmtMoney(po.amount)}` : '—'}
                </td>
                <td style="font-size:0.78rem;color:var(--text-muted)">
                    ${esc(po.notes || '—')}
                </td>
                <td style="text-align:center">
                    ${isPending ? '<span class="tag tag-amber" style="font-size:0.75rem">Por facturar</span>' : '<span class="tag tag-sage" style="font-size:0.75rem">Facturada</span>'}
                </td>
                <td style="text-align:right;white-space:nowrap">
                    ${isPending ? `<button class="btn btn-primary btn-sm" onclick="showQuickBillOcModal(${po.id})" style="padding:3px 7px;font-size:0.75rem">Facturar ➔</button>` : ''}
                    <button class="btn btn-ghost btn-sm" onclick="showPurchaseOrderModal(${po.id})" title="Editar">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deletePurchaseOrder(${po.id})" title="Eliminar" style="color:#ef4444">✕</button>
                </td>
            </tr>`;
        }
        html += `</tbody></table></div>`;
    }
    html += `</div>`;

    el.innerHTML = html;
}

// Helper to calculate due date avoiding timezone rollovers
function calcDueDateInfo(issueDateStr, days) {
    if (!issueDateStr) return { iso: '', formatted: '—' };
    const parts = String(issueDateStr).split('-');
    if (parts.length !== 3) return { iso: '', formatted: '—' };
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d + days, 12, 0, 0);
    const resY = dt.getFullYear();
    const resM = String(dt.getMonth() + 1).padStart(2, '0');
    const resD = String(dt.getDate()).padStart(2, '0');
    return {
        iso: `${resY}-${resM}-${resD}`,
        formatted: `${resD}/${resM}/${resY}`
    };
}

function updateQuickBillDueDate() {
    const issueDateStr = document.getElementById('qbIssueDate')?.value || todayStr();
    const termVal = document.getElementById('qbDueTerm')?.value;
    const dispEl = document.getElementById('qbDueDateDisplay');
    if (!dispEl) return;

    const days = parseInt(termVal) || 0;
    const info = calcDueDateInfo(issueDateStr, days);

    if (days === 0) {
        dispEl.innerHTML = `${info.formatted} <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(Al Contado)</span>`;
    } else {
        dispEl.innerHTML = `${info.formatted} <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(en ${days} días)</span>`;
    }
}

// Quick Facturar OC Modal: Simply enter the invoice number and choose payment term!
function showQuickBillOcModal(poId) {
    const orders = state.matrixData?.orders || [];
    const po = orders.find(o => o.id === poId);
    if (!po) { showToast('Orden de compra no encontrada'); return; }

    const sites = state.allSites || [];
    const site = sites.find(s => s.id === po.client_site_id);
    const clients = state.allClients || [];
    const client = clients.find(c => c.id === (po.client_id || site?.client_id || site?.parent_client_id));
    const clientName = client?.business_name || po.sociedad_name || po.empresa || 'Cliente';
    const clientRuc = client?.ruc || site?.ruc || po.ruc || '';
    const siteName = po.centro_logistico || po.site_name || site?.nombre_cliente || 'Sede principal';
    const feeSinIgv = parseFloat(po.amount) || 0;
    const feeTotal = Math.round(feeSinIgv * 1.18 * 100) / 100;
    const feeDetr = feeTotal > 700 ? Math.round(feeTotal * 0.12 * 100) / 100 : 0;
    const feeCred = Math.round((feeTotal - feeDetr) * 100) / 100;

    const modalHtml = `
    <form id="quickBillForm" autocomplete="off" onsubmit="saveQuickBillOc(event, ${po.id})">
        <div class="card" style="margin-bottom:14px;padding:12px;background:var(--card)">
            <div>
                <div style="font-weight:700;font-size:0.98rem;color:var(--primary)">
                    ${esc(clientName)}${clientRuc ? ` <span style="font-size:0.85rem;color:var(--text-muted);font-weight:600">(${esc(clientRuc)})</span>` : ''}
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">${esc(siteName)}</div>
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border-light);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:0.85rem">
                <span>OC: <strong>${esc(po.oc_number)}</strong></span>
                <span>Base: <strong>S/ ${fmtMoney(feeSinIgv)}</strong> (Sin IGV)</span>
                <span>Total: <strong>S/ ${fmtMoney(feeTotal)}</strong></span>
                ${feeTotal > 700 ? `<span style="color:#b45309">SPOT (12%): <strong>S/ ${fmtMoney(feeDetr)}</strong></span><span style="color:#10b981">Neto: <strong>S/ ${fmtMoney(feeCred)}</strong></span>` : `<span style="color:var(--text-muted)">SPOT: <strong>No aplica (≤ S/ 700)</strong></span>`}
            </div>
        </div>

        <div class="form-row">
            <div class="form-group" style="max-width:90px">
                <label>Serie</label>
                <input class="form-control" id="qbSeries" value="E001" autocomplete="off" style="font-weight:700">
            </div>
            <div class="form-group" style="flex:1">
                <label>Número de Factura *</label>
                <input class="form-control" id="qbNumber" placeholder="Ej. 1405" autofocus required autocomplete="off" spellcheck="false" style="font-size:1.1rem;font-weight:700;font-family:monospace">
            </div>
        </div>

        <div class="form-row" style="margin-bottom:6px">
            <div class="form-group" style="flex:1">
                <label>Fecha de Emisión</label>
                <input type="date" class="form-control" id="qbIssueDate" value="${todayStr()}" onchange="updateQuickBillDueDate()">
            </div>
            <div class="form-group" style="flex:1">
                <label>Plazo / Vencimiento</label>
                <select class="form-control" id="qbDueTerm" onchange="updateQuickBillDueDate()">
                    <option value="10">Crédito a 10 días</option>
                    <option value="15">Crédito a 15 días</option>
                    <option value="21">Crédito a 21 días</option>
                    <option value="30" selected>Crédito a 30 días</option>
                    <option value="45">Crédito a 45 días</option>
                    <option value="60">Crédito a 60 días</option>
                    <option value="90">Crédito a 90 días</option>
                    <option value="0">Al Contado (0 días)</option>
                </select>
            </div>
        </div>

        <div style="margin-top:-2px;margin-bottom:14px;font-size:0.83rem;color:var(--text-muted);display:flex;align-items:center;gap:6px">
            <span>📅 Vencimiento calculado:</span>
            <strong id="qbDueDateDisplay" style="color:var(--accent);font-family:monospace;font-size:0.95rem">--/--/----</strong>
        </div>
    </form>`;

    openModal(`Facturar OC ${po.oc_number}`, modalHtml);

    setTimeout(() => {
        updateQuickBillDueDate();
        const inp = document.getElementById('qbNumber');
        if (inp) inp.focus();
    }, 80);

    const saveBtn = document.getElementById('modalSave');
    saveBtn.textContent = 'Registrar Factura';
    saveBtn.onclick = () => {
        const form = document.getElementById('quickBillForm');
        if (form.reportValidity()) {
            form.requestSubmit();
        }
    };
}

async function saveQuickBillOc(e, poId) {
    e.preventDefault();
    const orders = state.matrixData?.orders || [];
    const po = orders.find(o => o.id === poId);
    if (!po) return;

    const series = (document.getElementById('qbSeries')?.value || 'E001').trim();
    const number = (document.getElementById('qbNumber')?.value || '').trim();
    const issueDate = document.getElementById('qbIssueDate')?.value || todayStr();
    const dueDays = parseInt(document.getElementById('qbDueTerm')?.value ?? '30') || 0;

    if (!number) {
        showToast('Ingresa el número de factura');
        return;
    }

    const sites = state.allSites || [];
    const site = sites.find(s => s.id === po.client_site_id);

    const feeSinIgv = parseFloat(po.amount) || 0;
    const feeTotal = Math.round(feeSinIgv * 1.18 * 100) / 100;
    // SUNAT SPOT: Solo aplica cuando el TOTAL CON IGV SUPERA los 700 soles
    const feeDetr = feeTotal > 700 ? Math.round(feeTotal * 0.12 * 100) / 100 : 0;
    const feeCred = Math.round((feeTotal - feeDetr) * 100) / 100;

    const dueInfo = calcDueDateInfo(issueDate, dueDays);
    const dueDate = dueInfo.iso;

    const invoiceData = {
        client_id: po.client_id,
        client_site_id: po.client_site_id,
        series: series,
        number: number,
        purchase_order: po.oc_number,
        location_code: po.location_code || site?.location_code || '',
        service: po.notes || site?.servicios || 'Servicio de Saneamiento y Manejo Integrado de Plagas',
        amount: feeSinIgv,
        igv: Math.round((feeTotal - feeSinIgv) * 100) / 100,
        total: feeTotal,
        detraccion: feeDetr,
        credito: feeCred,
        payment_type: dueDays === 0 ? 'contado' : 'credito',
        issue_date: issueDate,
        due_date: dueDate,
        month_billed: po.month,
        year_billed: po.year,
        status: 'issued'
    };

    const res = await api(eel.create_invoice, invoiceData);
    if (res && res.ok) {
        try {
            if (typeof eel.update_purchase_order === 'function') {
                await api(eel.update_purchase_order, { id: poId, status: 'invoiced' });
            }
        } catch(err) {
            console.warn('PO sync note:', err);
        }
        showToast(`✓ Factura ${series}-${number} registrada`);
        closeModal();
        const elView = document.getElementById('view-work');
        if (elView) renderWorkMatrix(elView);
    } else {
        showToast(res?.error || 'Error al guardar la factura');
    }
}

async function showEditSiteModal(siteId) {
    const site = await api(eel.get_client_site, siteId);
    if (!site) { showToast('No se encontró la sede'); return; }

    const perOpts = [
        { id: 'mensual', label: 'Mensual' },
        { id: 'bimensual', label: 'Bimensual' },
        { id: 'trimestral', label: 'Trimestral' },
        { id: 'semestral', label: 'Semestral' },
        { id: 'anual', label: 'Anual' },
        { id: 'eventual', label: 'Eventual' }
    ].map(p => `<option value="${p.id}"${(site.periodicity || 'mensual') === p.id ? ' selected' : ''}>${p.label}</option>`).join('');

    const html = `
    <form id="editSiteForm" onsubmit="return false;">
        <div class="form-group">
            <label>Empresa</label>
            <input class="form-control" value="${esc(site.business_name || '')}" disabled>
        </div>
        <div class="form-row">
            <div class="form-group" style="flex:2">
                <label>Nombre de la Sede *</label>
                <input class="form-control" name="nombre_cliente" value="${esc(site.nombre_cliente || '')}" required>
            </div>
            <div class="form-group" style="flex:1">
                <label>Sucursal</label>
                <input class="form-control" name="sede_cliente" value="${esc(site.sede_cliente || '')}">
            </div>
        </div>
        <div class="form-group">
            <label>Servicio Realizado</label>
            <input class="form-control" name="servicios" value="${esc(site.servicios || '')}">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Frecuencia *</label>
                <select class="form-control" name="periodicity">
                    ${perOpts}
                </select>
            </div>
            <div class="form-group">
                <label>Cuota Pactada Sin IGV (S/) *</label>
                <input type="number" step="0.01" min="0" class="form-control" name="monthly_fee" value="${(parseFloat(site.monthly_fee) || 0).toFixed(2)}" style="font-family:monospace;font-weight:700" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Código de Ubicación (Loc)</label>
                <input class="form-control" name="location_code" value="${esc(site.location_code || '')}">
            </div>
            <div class="form-group">
                <label>Centro Logístico</label>
                <input class="form-control" name="centro_logistico" value="${esc(site.centro_logistico || '')}">
            </div>
        </div>
        <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" name="is_regular" value="1"${site.is_regular ? ' checked' : ''}>
                <span>Sede regular en la Matriz de Facturación</span>
            </label>
        </div>
    </form>`;

    openModal('Editar Sede', html);

    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('editSiteForm'));
        const updateData = {
            nombre_cliente: (f.get('nombre_cliente') || '').trim(),
            sede_cliente: (f.get('sede_cliente') || '').trim() || (f.get('nombre_cliente') || '').trim(),
            servicios: (f.get('servicios') || '').trim(),
            periodicity: f.get('periodicity'),
            monthly_fee: parseFloat(f.get('monthly_fee')) || 0,
            location_code: (f.get('location_code') || '').trim(),
            centro_logistico: (f.get('centro_logistico') || '').trim(),
            is_regular: f.get('is_regular') ? 1 : 0
        };

        if (!updateData.nombre_cliente) {
            showToast('El nombre de la sede es obligatorio');
            return;
        }

        const res = await api(eel.update_client_site, siteId, updateData);
        if (res && res.ok) {
            showToast('Sede actualizada');
            closeModal();
            const workView = document.getElementById('view-work');
            if (workView) renderWorkMatrix(workView);
        } else {
            showToast(res && res.error ? res.error : 'Error al guardar');
        }
    };
}


function changeMatrixYear(year) {
    state.matrixYear = parseInt(year) || 2026;
    navigate('work');
}

function changeMatrixMonth(month) {
    if (month === 'all' || month === '' || month === null || month === undefined) {
        state.matrixMonthFilter = 'all';
        state.matrixOcMonthFilter = 'all';
    } else {
        const m = parseInt(month);
        state.matrixMonthFilter = m;
        state.matrixOcMonthFilter = String(m);
    }
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}


function filterMatrixPeriodicity(per) {
    state.matrixPeriodicityFilter = per;
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function filterMatrixOcStatus(status) {
    state.matrixOcStatusFilter = status;
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function filterMatrixOcPeriodicity(per) {
    state.matrixOcPeriodicityFilter = per;
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function filterMatrixOcMonth(month) {
    state.matrixOcMonthFilter = month;
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function onSearchMatrixOc(val) {
    state.matrixOcSearch = val;
    state.matrixSearch = val;
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function filterMatrixOc() {
    const content = document.getElementById('workContent');
    if (content) renderWorkMatrix(content);
}

function handleMatrixCellOc(siteId, clientId, month, year, poId) {
    const orders = state.matrixData?.orders || [];
    const po = orders.find(o => o.id === poId);
    if (!po) return;

    let itemsCount = 0;
    try {
        if (po.items_json) {
            const parsed = JSON.parse(po.items_json);
            if (Array.isArray(parsed)) itemsCount = parsed.length;
        }
    } catch(e) {}

    const isPending = po.status === 'pending';

    const modalHtml = `
        <div style="padding:10px 0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                <div>
                    <div style="font-size:1.15rem;font-weight:700">Orden de Compra: OC ${esc(po.oc_number)}</div>
                    <div style="font-size:0.85rem;color:var(--text-muted);margin-top:2px">
                        ${esc(po.sociedad_name || po.empresa)} · ${esc(po.centro_logistico || po.site_name || '')}
                    </div>
                </div>
                <span class="tag-periodicity-${po.periodicity || 'mensual'}">${po.periodicity || 'mensual'}</span>
            </div>

            <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
                <div class="card" style="flex:1;min-width:140px;padding:10px;text-align:center">
                    <div style="font-size:0.75rem;color:var(--text-muted)">Monto Sin IGV</div>
                    <div style="font-size:1.1rem;font-weight:700;font-family:monospace">S/ ${fmtMoney(po.amount || 0)}</div>
                </div>
                <div class="card" style="flex:1;min-width:140px;padding:10px;text-align:center">
                    <div style="font-size:0.75rem;color:var(--text-muted)">Fecha Emisión</div>
                    <div style="font-size:0.95rem;font-weight:600;margin-top:4px">${po.issue_date || '—'}</div>
                </div>
                <div class="card" style="flex:1;min-width:140px;padding:10px;text-align:center">
                    <div style="font-size:0.75rem;color:var(--text-muted)">Estado</div>
                    <div style="margin-top:4px">${isPending ? '<span class="tag tag-amber">⏳ Por facturar</span>' : '<span class="tag tag-sage">✅ Facturada</span>'}</div>
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:8px">
                ${isPending ? `<button class="btn btn-primary" onclick="closeModal(); emitInvoiceFromOc(${po.id})">🧮 Emitir en Calculadora SUNAT</button>` : ''}
                ${itemsCount > 0 ? `<button class="btn btn-secondary" onclick="closeModal(); showOcItemsModal(${po.id})">👁️ Ver Desglose de Ítems (${itemsCount} posiciones)</button>` : ''}
                <button class="btn btn-secondary" onclick="closeModal(); showPurchaseOrderModal(${po.id})">✏️ Modificar Orden de Compra</button>
                <button class="btn btn-ghost" onclick="closeModal(); deletePurchaseOrder(${po.id})" style="color:#ef4444">🗑️ Eliminar Orden de Compra</button>
            </div>
        </div>
    `;
    openModal('Detalles de Orden de Compra', modalHtml);
}

function showOcItemsModal(poId) {
    const orders = state.matrixData?.orders || [];
    const invoices = state.matrixData?.invoices || [];
    const po = orders.find(o => o.id === poId);
    if (!po) return;

    // Check if there is an invoice linked to this OC
    const linkedInvoice = invoices.find(i => i.purchase_order === po.oc_number || (i.client_site_id === po.client_site_id && i.month_billed === po.month));

    let items = [];
    try {
        if (po.items_json) {
            items = JSON.parse(po.items_json);
        }
    } catch(e) {}

    let rowsHtml = '';
    let totalCalc = 0;
    if (items.length === 0) {
        rowsHtml = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:20px">No se registraron posiciones individuales para esta OC</td></tr>`;
    } else {
        items.forEach(it => {
            const sub = (it.cant * it.pu) || 0;
            totalCalc += sub;
            rowsHtml += `<tr>
                <td style="font-family:monospace;font-weight:700">${esc(it.pos || '10')}</td>
                <td><strong>${esc(it.desc)}</strong></td>
                <td style="text-align:center">${it.cant}</td>
                <td style="text-align:center;color:var(--text-muted)">${esc(it.un || 'UN')}</td>
                <td style="text-align:right;font-family:monospace">S/ ${fmtMoney(it.pu)}</td>
                <td style="text-align:right;font-family:monospace;font-weight:700">S/ ${fmtMoney(sub)}</td>
            </tr>`;
        });
    }

    const modalHtml = `
        <div style="padding:10px 0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                <div>
                    <h3 style="margin:0;font-size:1.15rem">Orden de Compra: OC ${esc(po.oc_number)}</h3>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">
                        ${esc(po.sociedad_name || po.empresa)} · ${esc(po.centro_logistico || po.site_name || '')} (${po.issue_date || ''})
                    </div>
                </div>
                <span class="tag-periodicity-${po.periodicity || 'mensual'}">${po.periodicity || 'mensual'}</span>
            </div>

            ${linkedInvoice ? `
            <div class="card" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                <div>
                    <div style="font-weight:700;color:#059669;font-size:0.88rem">✅ Factura SUNAT Emitida: ${esc(linkedInvoice.series)}-${esc(linkedInvoice.number)}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Total Facturado: S/ ${fmtMoney(linkedInvoice.total)} con IGV · Emisión: ${linkedInvoice.issue_date || ''}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="closeModal(); showInvoiceForm(${linkedInvoice.id})">📄 Ver Factura</button>
            </div>
            ` : ''}

            <div class="table-wrap" style="max-height:380px;overflow-y:auto;margin-bottom:16px">
                <table class="oc-items-table">
                    <thead>
                        <tr>
                            <th style="width:40px">Pos</th>
                            <th>Descripción del Servicio</th>
                            <th style="text-align:center;width:60px">Cant</th>
                            <th style="text-align:center;width:50px">Und</th>
                            <th style="text-align:right;width:120px">P. Unitario</th>
                            <th style="text-align:right;width:120px">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr style="font-weight:700;border-top:2px solid var(--border-light)">
                            <td colspan="5" style="text-align:right">Total Sin IGV:</td>
                            <td style="text-align:right;font-family:monospace;font-size:1rem;color:var(--accent)">S/ ${fmtMoney(po.amount || totalCalc)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap">
                <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
                <button class="btn btn-primary" onclick="closeModal(); emitInvoiceFromOc(${po.id})">🧮 Cargar todo a Calculadora SUNAT</button>
            </div>
        </div>
    `;

    openModal(`Desglose de Ítems · OC ${po.oc_number}`, modalHtml);
}

function emitInvoiceFromOc(poId) {
    const orders = state.matrixData?.orders || [];
    const po = orders.find(o => o.id === poId);
    if (!po) return;

    const sites = state.allSites || [];
    const site = sites.find(s => s.id === po.client_site_id);

    // Parse items if available
    let calcItems = [];
    try {
        if (po.items_json) {
            const parsed = JSON.parse(po.items_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
                calcItems = parsed.map(it => ({
                    desc: it.desc,
                    cant: it.cant,
                    pu: it.pu
                }));
            }
        }
    } catch(e) {}

    if (calcItems.length === 0) {
        calcItems = [
            {
                desc: site?.servicios || po.notes || 'SERV CONTROL DE PLAGAS',
                cant: 1,
                pu: po.amount || site?.monthly_fee || 0
            }
        ];
    }

    // Determine Banco de la Nación account based on client/business
    let bnAcc = '00046317769';
    if (po.client_id === 11 || po.client_id === 13 || po.client_id === 14 || po.client_id === 15 || po.client_id === 16) {
        bnAcc = '00771005578';
    }

    window.calcState = {
        clientId: po.client_id,
        clientName: po.empresa,
        clientRuc: po.ruc,
        siteId: po.client_site_id,
        siteName: po.site_name,
        locationCode: po.location_code || '',
        series: 'E001',
        number: '',
        purchaseOrder: po.oc_number,
        issueDate: todayStr(),
        monthBilled: po.month,
        yearBilled: po.year,
        igvRate: 0.18,
        detrRate: 0.12,
        bnAccount: bnAcc,
        items: calcItems
    };

    switchWorkTab('calculadora');
    showToast(`Datos de OC ${po.oc_number} (${calcItems.length} ítems) cargados en Calculadora SUNAT`);
}

async function showPurchaseOrderModal(poId, defaultSiteId, defaultClientId, defaultMonth, defaultYear) {
    const clients = state.allClients || await api(eel.get_clients) || [];
    const sites = state.allSites || await api(eel.get_client_sites_grouped) || [];
    state.allClients = clients;
    state.allSites = sites;

    let po = null;
    if (poId) {
        const orders = state.matrixData?.orders || [];
        po = orders.find(o => o.id === poId);
    }

    const curYear = state.matrixYear || 2026;
    const selClient = po ? po.client_id : (defaultClientId || (clients[0]?.id || ''));
    const selSite = po ? po.client_site_id : (defaultSiteId || '');
    const selMonth = po ? po.month : (defaultMonth || (new Date().getMonth() + 1));
    const selYear = po ? po.year : (defaultYear || curYear);
    const ocNum = po ? po.oc_number : '';
    const defFee = po ? po.amount : '';
    const notes = po ? po.notes : '';
    const status = po ? po.status : 'pending';
    const periodicity = po ? (po.periodicity || 'mensual') : 'mensual';
    const issueDate = po ? (po.issue_date || todayStr()) : todayStr();
    const centroLogistico = po ? (po.centro_logistico || '') : '';

    const clientOpts = clients.map(c => `<option value="${c.id}" ${c.id === selClient ? 'selected' : ''}>${esc(c.business_name)} (${esc(c.ruc)})</option>`).join('');

    const modalHtml = `
    <form id="purchaseOrderForm" onsubmit="savePurchaseOrderForm(event, ${poId || 'null'})">
        <div class="form-row">
            <div class="form-group" style="flex:2">
                <label>Empresa / Cliente *</label>
                <select class="form-control" id="poClientId" onchange="onPoClientChanged(this)" required>
                    <option value="">- Seleccionar Cliente -</option>
                    ${clientOpts}
                </select>
            </div>
            <div class="form-group" style="flex:2">
                <label>Sede Comercial (Opcional si aplica a todas)</label>
                <select class="form-control" id="poSiteId">
                    <!-- Populated dynamically -->
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>Año *</label>
                <select class="form-control" id="poYear" required>
                    <option value="2024" ${selYear === 2024 ? 'selected' : ''}>2024</option>
                    <option value="2025" ${selYear === 2025 ? 'selected' : ''}>2025</option>
                    <option value="2026" ${selYear === 2026 ? 'selected' : ''}>2026</option>
                    <option value="2027" ${selYear === 2027 ? 'selected' : ''}>2027</option>
                </select>
            </div>
            <div class="form-group">
                <label>Mes de Servicio *</label>
                <select class="form-control" id="poMonth" required>
                    <option value="1" ${selMonth === 1 ? 'selected' : ''}>Enero</option>
                    <option value="2" ${selMonth === 2 ? 'selected' : ''}>Febrero</option>
                    <option value="3" ${selMonth === 3 ? 'selected' : ''}>Marzo</option>
                    <option value="4" ${selMonth === 4 ? 'selected' : ''}>Abril</option>
                    <option value="5" ${selMonth === 5 ? 'selected' : ''}>Mayo</option>
                    <option value="6" ${selMonth === 6 ? 'selected' : ''}>Junio</option>
                    <option value="7" ${selMonth === 7 ? 'selected' : ''}>Julio</option>
                    <option value="8" ${selMonth === 8 ? 'selected' : ''}>Agosto</option>
                    <option value="9" ${selMonth === 9 ? 'selected' : ''}>Septiembre</option>
                    <option value="10" ${selMonth === 10 ? 'selected' : ''}>Octubre</option>
                    <option value="11" ${selMonth === 11 ? 'selected' : ''}>Noviembre</option>
                    <option value="12" ${selMonth === 12 ? 'selected' : ''}>Diciembre</option>
                </select>
            </div>
            <div class="form-group">
                <label>Frecuencia / Periodicidad</label>
                <select class="form-control" id="poPeriodicity">
                    <option value="mensual" ${periodicity === 'mensual' ? 'selected' : ''}>🔄 Mensual</option>
                    <option value="bimensual" ${periodicity === 'bimensual' ? 'selected' : ''}>🔁 Bimensual</option>
                    <option value="trimestral" ${periodicity === 'trimestral' ? 'selected' : ''}>🔁 Trimestral</option>
                    <option value="eventual" ${periodicity === 'eventual' ? 'selected' : ''}>⚡ Eventual / Ad-hoc</option>
                </select>
            </div>
            <div class="form-group">
                <label>Estado</label>
                <select class="form-control" id="poStatus">
                    <option value="pending" ${status === 'pending' ? 'selected' : ''}>⏳ Por facturar</option>
                    <option value="invoiced" ${status === 'invoiced' ? 'selected' : ''}>✅ Facturada</option>
                </select>
            </div>
        </div>

        <div class="form-row">
            <div class="form-group" style="flex:2">
                <label>Número de Orden de Compra (OC) *</label>
                <input type="text" class="form-control" id="poOcNumber" value="${esc(ocNum)}" placeholder="Ej. 4501209368" required style="font-family:monospace;font-weight:700">
            </div>
            <div class="form-group" style="flex:1">
                <label>Fecha Emisión OC</label>
                <input type="date" class="form-control" id="poIssueDate" value="${issueDate}">
            </div>
            <div class="form-group" style="flex:1">
                <label>Monto Sin IGV (S/)</label>
                <input type="number" step="0.01" min="0" class="form-control" id="poAmount" value="${defFee}" placeholder="0.00" style="font-family:monospace">
            </div>
        </div>

        <div class="form-row">
            <div class="form-group" style="flex:2">
                <label>Centro Logístico / Planta / CEDI</label>
                <input type="text" class="form-control" id="poCentroLogistico" value="${esc(centroLogistico)}" placeholder="Ej. CEDI SUR - AC LOGISTICA (4803)">
            </div>
            <div class="form-group" style="flex:2">
                <label>Notas / Descripción del Servicio</label>
                <input type="text" class="form-control" id="poNotes" value="${esc(notes)}" placeholder="Ej. Control de Aves mensual, Desinsectación almacenes">
            </div>
        </div>
    </form>
    `;

    openModal(poId ? 'Editar Orden de Compra (OC)' : 'Registrar Orden de Compra (OC)', modalHtml);

    const clientSelEl = document.getElementById('poClientId');
    if (clientSelEl) {
        onPoClientChanged(clientSelEl, selSite);
    }

    const saveBtn = document.getElementById('modalSave');
    saveBtn.textContent = 'Guardar OC';
    saveBtn.onclick = () => {
        const form = document.getElementById('purchaseOrderForm');
        if (form.reportValidity()) {
            form.requestSubmit();
        }
    };
}

function onPoClientChanged(clientSel, selSiteId) {
    const clientId = parseInt(clientSel.value);
    const siteSel = document.getElementById('poSiteId');
    if (!siteSel) return;

    const sites = (state.allSites || []).filter(s => s.client_id === clientId);
    let opts = '<option value="">- Aplica a toda la Empresa -</option>';
    sites.forEach(s => {
        opts += `<option value="${s.id}" data-fee="${s.monthly_fee || 0}" ${s.id === selSiteId ? 'selected' : ''}>${esc(s.nombre_cliente)} (S/ ${fmtMoney(s.monthly_fee || 0)})</option>`;
    });
    siteSel.innerHTML = opts;

    siteSel.onchange = () => {
        const opt = siteSel.options[siteSel.selectedIndex];
        const fee = opt?.getAttribute('data-fee');
        const amountEl = document.getElementById('poAmount');
        if (amountEl && (!amountEl.value || amountEl.value === '0') && fee) {
            amountEl.value = parseFloat(fee).toFixed(2);
        }
    };
}

async function savePurchaseOrderForm(e, poId) {
    e.preventDefault();
    const clientId = parseInt(document.getElementById('poClientId').value);
    const siteIdVal = document.getElementById('poSiteId').value;
    const clientSiteId = siteIdVal ? parseInt(siteIdVal) : null;
    const year = parseInt(document.getElementById('poYear').value);
    const month = parseInt(document.getElementById('poMonth').value);
    const ocNumber = document.getElementById('poOcNumber').value.trim();
    const issueDate = document.getElementById('poIssueDate').value;
    const amountVal = document.getElementById('poAmount').value;
    const amount = amountVal ? parseFloat(amountVal) : 0;
    const periodicity = document.getElementById('poPeriodicity').value;
    const status = document.getElementById('poStatus').value;
    const centroLogistico = document.getElementById('poCentroLogistico').value.trim();
    const notes = document.getElementById('poNotes').value.trim();

    if (!clientId) { showToast('Selecciona un cliente'); return; }
    if (!ocNumber) { showToast('Ingresa el número de OC'); return; }

    const data = {
        id: poId,
        client_id: clientId,
        client_site_id: clientSiteId,
        year,
        month,
        oc_number: ocNumber,
        issue_date: issueDate,
        amount,
        periodicity,
        status,
        centro_logistico: centroLogistico,
        notes
    };

    const res = await api(eel.save_purchase_order, data);
    if (res && res.ok) {
        showToast(poId ? 'OC actualizada' : 'OC registrada exitosamente');
        closeModal();
        navigate('work');
    } else {
        showToast(res?.error || 'Error al guardar la OC');
    }
}

async function deletePurchaseOrder(id) {
    if (!confirm('¿Eliminar esta orden de compra?')) return;
    const res = await api(eel.delete_purchase_order, id);
    if (res && res.ok) {
        showToast('Orden de compra eliminada');
        navigate('work');
    } else {
        showToast(res?.error || 'Error al eliminar');
    }
}


// --- WORK INVOICES (facturación mensual) ---

function toggleInvoiceSort() {
    state.invoiceSort = state.invoiceSort === 'asc' ? 'desc' : 'asc';
    const elView = document.getElementById('view-work');
    if (elView) renderWorkInvoices(elView);
}

async function renderWorkInvoices(el) {
    const data = await api(eel.get_monthly_billing) || { sites: [], invoices: [] };
    const allInvoices = await api(eel.get_invoices) || [];
    const sites = await api(eel.get_client_sites_grouped) || [];
    const clients = await api(eel.get_clients) || [];

    state.invoiceStatusFilter = state.invoiceStatusFilter || 'all';
    state.invoiceSort = state.invoiceSort || 'desc';

    // Ordenar predeterminadamente por número de comprobante descendente (más reciente primero: 1910, 1909...)
    allInvoices.sort((a, b) => {
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        if (numA !== numB) {
            return state.invoiceSort === 'asc' ? (numA - numB) : (numB - numA);
        }
        return (b.series || '').localeCompare(a.series || '');
    });
    
    // Separate active (vigentes) from annulled
    const vigentes = allInvoices.filter(i => i.status !== 'annulled');
    const anuladas = allInvoices.filter(i => i.status === 'annulled');
    
    // Global totals computed ONLY from valid/active invoices
    let totSinIgv = 0, totFinal = 0, totDetr = 0, totCredito = 0;
    vigentes.forEach(i => {
        totSinIgv += (i.amount || 0);
        totFinal += (i.total || 0);
        totDetr += (i.detraccion || 0);
        totCredito += (i.credito || 0);
    });
    const totAnulado = anuladas.reduce((acc, x) => acc + (x.total || 0), 0);

    // Lookup: siteId-month-year
    const invMap = {};
    for (const inv of (data.invoices || [])) {
        const key = inv.client_site_id + '-' + (inv.month_billed||0) + '-' + (inv.year_billed||0);
        if (!invMap[key]) invMap[key] = [];
        invMap[key].push(inv);
    }

    // Last 12 months for matrix
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ m: d.getMonth()+1, y: d.getFullYear(), label: d.toLocaleString('es', { month:'short', year:'2-digit' }) });
    }

    let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div>
            <h2 style="margin:0;font-size:1.35rem">Facturación Comercial Emitida</h2>
            <div style="font-size:0.8rem;color:var(--text-muted)">Registro de comprobantes, órdenes de compra, detracciones SPOT (12%) y cuentas de crédito</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-secondary" onclick="switchWorkTab('matrix')">📊 Ver Matriz Mensual (12 Meses)</button>
            <button class="btn btn-secondary" onclick="switchWorkTab('calculadora')">🧮 Calculadora SUNAT</button>
            <button class="btn btn-primary" onclick="showInvoiceForm()">+ Nueva Factura</button>
        </div>
    </div>

    <!-- Summary KPI Cards (Vigentes vs Anuladas) -->
    <div class="calc-kpi-grid" style="margin-bottom:20px">
        <div class="calc-kpi-card highlight">
            <div class="calc-kpi-label">Total Facturado Vigente (Con IGV)</div>
            <div class="calc-kpi-value">S/ ${fmtMoney(totFinal)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">${vigentes.length} comprobantes vigentes</div>
        </div>
        <div class="calc-kpi-card">
            <div class="calc-kpi-label">Base Imponible (Sin IGV)</div>
            <div class="calc-kpi-value">S/ ${fmtMoney(totSinIgv)}</div>
        </div>
        <div class="calc-kpi-card amber">
            <div class="calc-kpi-label">Detracciones SPOT (12%)</div>
            <div class="calc-kpi-value">S/ ${fmtMoney(totDetr)}</div>
        </div>
        <div class="calc-kpi-card green">
            <div class="calc-kpi-label">Crédito Neto por Cobrar</div>
            <div class="calc-kpi-value">S/ ${fmtMoney(totCredito)}</div>
        </div>
        <div class="calc-kpi-card" style="border-left:4px solid #ef4444">
            <div class="calc-kpi-label" style="color:#ef4444">Comprobantes Anulados (NC)</div>
            <div class="calc-kpi-value" style="color:#ef4444">${anuladas.length} <span style="font-size:0.8rem;font-weight:normal;color:var(--text-muted)">(S/ ${fmtMoney(totAnulado)})</span></div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">Excluidas de ingresos</div>
        </div>
    </div>

    <!-- Invoices List with Status Tabs -->
    <div class="card" style="margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">
            <div>
                <div style="font-weight:700;font-size:1rem">Comprobantes Emitidos SUNAT 2026 (${allInvoices.length})</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">Registro oficial SIRE RVIE de ventas electrónicas (E001/EB01)</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <input type="text" id="invoiceSearchInput" class="form-control" style="width:240px;padding:6px 14px;font-size:0.85rem;border-radius:var(--radius-full)" placeholder="🔍 Buscar cliente, OC o factura..." oninput="filterInvoicesTable(this.value)">
                <button class="btn btn-primary btn-sm" onclick="showInvoiceForm(null)">+ Nueva Factura</button>
            </div>
        </div>
        <!-- Status Filter Pills -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border-light);align-items:center">
            <div class="filter-pills" style="margin:0">
                <button class="filter-pill${state.invoiceStatusFilter === 'all' ? ' active' : ''}" onclick="filterInvoiceStatus('all')">Todas (${allInvoices.length})</button>
                <button class="filter-pill${state.invoiceStatusFilter === 'vigentes' ? ' active' : ''}" onclick="filterInvoiceStatus('vigentes')">✅ Vigentes (${vigentes.length})</button>
                <button class="filter-pill${state.invoiceStatusFilter === 'issued' ? ' active' : ''}" onclick="filterInvoiceStatus('issued')">⏳ Emitidas (${allInvoices.filter(x => x.status === 'issued').length})</button>
                <button class="filter-pill${state.invoiceStatusFilter === 'paid' ? ' active' : ''}" onclick="filterInvoiceStatus('paid')">💳 Pagadas (${allInvoices.filter(x => x.status === 'paid').length})</button>
                <button class="filter-pill${state.invoiceStatusFilter === 'annulled' ? ' active' : ''}" onclick="filterInvoiceStatus('annulled')">🚫 Anuladas (${anuladas.length})</button>
            </div>
        </div>`;

    if (allInvoices.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">🧾</div><h3>Sin facturas registradas</h3><p>Registra facturas o utiliza la Calculadora de IGV para crearlas</p></div>';
    } else {
        const stMap = {
            issued: {label:'Emitida',cls:'tag-primary'},
            paid: {label:'Pagada',cls:'tag-sage'},
            overdue: {label:'Vencida',cls:'tag-rose'},
            annulled: {label:'Anulada',cls:'tag-rose'}
        };

        html += `<div class="table-wrap" style="max-height:420px;overflow-y:auto">
            <table id="invoicesTable">
                <thead style="position:sticky;top:0;background:var(--card);z-index:2">
                    <tr>
                        <th style="min-width:115px;cursor:pointer" onclick="toggleInvoiceSort()" title="Ordenar por número de comprobante">Comprobante ${state.invoiceSort === 'asc' ? '▲' : '▼'}</th>
                        <th style="text-align:center;width:75px;min-width:75px">Acción</th>
                        <th style="min-width:90px">N° OC</th>
                        <th style="text-align:center;min-width:65px">Centro</th>
                        <th style="min-width:180px">Cliente / Sede</th>
                        <th style="min-width:160px">Servicio</th>
                        <th style="text-align:right;min-width:90px">Subtotal</th>
                        <th style="text-align:right;min-width:90px">Total</th>
                        <th style="text-align:right;min-width:85px">Detracción</th>
                        <th style="text-align:right;min-width:90px">Neto a Cobrar</th>
                        <th style="text-align:center;min-width:75px">Período</th>
                        <th style="text-align:center;min-width:85px">Estado</th>
                    </tr>
                </thead>
                <tbody>`;

        for (const i of allInvoices) {
            const isAnulada = i.status === 'annulled';
            let meta = {};
            try { if (i.items_json) meta = JSON.parse(i.items_json); } catch(e){}
            const nc = meta.nc;
            const per = meta.periodicity;

            const mesStr = i.year_billed && i.month_billed ? (i.month_billed < 10 ? '0'+i.month_billed : i.month_billed)+'/'+i.year_billed : '-';
            const compStr = i.series ? (i.number ? esc(i.series)+'-'+esc(i.number) : esc(i.series)) : '-';
            const locStr = i.location_code || i.site_location || '-';
            const ocStr = i.purchase_order ? `<span class="tag tag-gold" style="font-size:0.75rem">${esc(i.purchase_order)}</span>` : '<span style="color:var(--text-muted)">-</span>';
            const feeSinIgv = parseFloat(i.amount) || 0;
            const feeTotal = parseFloat(i.total) || 0;
            const feeDetr = parseFloat(i.detraccion) || 0;
            const feeCred = parseFloat(i.credito) || (feeTotal - feeDetr);

            let statusBadge = '';
            if (isAnulada) {
                const ncTip = nc ? `Anulada por NC ${nc.nc_serie}-${nc.nc_num} (${nc.nc_fecha}): ${nc.motivo}` : 'Factura anulada por Nota de Crédito';
                statusBadge = `<span class="tag tag-rose" style="cursor:help;font-weight:700" title="${esc(ncTip)}">🚫 Anulada ${nc ? '(NC '+esc(nc.nc_num)+')' : ''}</span>`;
            } else {
                const s = stMap[i.status] || {label:i.status,cls:'tag-primary'};
                statusBadge = `<span class="tag ${s.cls}">${s.label}</span>`;
            }

            const perBadge = per ? `<span class="tag-periodicity-${per}" style="margin-left:4px">${per}</span>` : '';
            const rowStyle = isAnulada ? 'opacity:0.65;background:rgba(239,68,68,0.02)' : '';

            html += `<tr data-status="${esc(i.status || 'issued')}" style="${rowStyle}">
                <td>
                    <strong>${compStr}</strong>
                    ${perBadge}
                </td>
                <td style="text-align:center;white-space:nowrap">
                    <button class="btn btn-ghost btn-sm" onclick="showInvoiceForm(${i.id})" title="Editar comprobante" style="padding:2px 5px">✎</button>
                    <button class="btn btn-ghost btn-sm" style="color:#ef4444;padding:2px 5px" onclick="deleteInvoice(${i.id}, '${esc(i.series)}-${esc(i.number)}')" title="Eliminar factura permanente">🗑️</button>
                </td>
                <td>${ocStr}</td>
                <td style="text-align:center;font-size:0.8rem;color:var(--text-muted)">${esc(locStr)}</td>
                <td><strong>${esc(i.business_name || '')}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${esc(i.site_name || '')}</span></td>
                <td style="font-size:0.8rem">${esc(i.service || '-')}</td>
                <td style="text-align:right;font-family:monospace;${isAnulada ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">S/ ${fmtMoney(feeSinIgv)}</td>
                <td style="text-align:right;font-family:monospace;font-weight:700;${isAnulada ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">S/ ${fmtMoney(feeTotal)}</td>
                <td style="text-align:right;font-family:monospace;color:#f59e0b">S/ ${fmtMoney(feeDetr)}</td>
                <td style="text-align:right;font-family:monospace;color:#10b981;font-weight:700">S/ ${fmtMoney(feeCred)}</td>
                <td style="text-align:center;font-size:0.8rem">${mesStr}</td>
                <td style="text-align:center">${statusBadge}</td>
            </tr>`;
        }
        html += `</tbody></table></div>`;
    }
    html += `</div>`;

    // Quick shortcut to Matriz Mensual
    html += `<div class="card" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:var(--primary-light)">
        <div>
            <div style="font-weight:700;font-size:0.95rem;color:var(--accent)">📊 Matriz de Facturación Mensual (Clientes Regulares)</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Visualiza los 12 meses completos del año, cuotas pactadas y órdenes de compra registradas</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="switchWorkTab('matrix')">Abrir Matriz Completa 12 Meses ➔</button>
    </div>`;
    
    el.innerHTML = html;
    if (state.invoiceStatusFilter && state.invoiceStatusFilter !== 'all') {
        filterInvoicesTable(document.getElementById('invoiceSearchInput')?.value || '');
    }
}

function filterInvoiceStatus(status) {
    state.invoiceStatusFilter = status;
    const term = document.getElementById('invoiceSearchInput')?.value || '';
    filterInvoicesTable(term);
    document.querySelectorAll('.filter-pill').forEach(b => {
        const oc = b.getAttribute('onclick') || '';
        if (oc.includes("filterInvoiceStatus('" + status + "')")) {
            b.classList.add('active');
        } else if (oc.includes('filterInvoiceStatus')) {
            b.classList.remove('active');
        }
    });
}

function filterInvoicesTable(term) {
    const q = (term || '').toLowerCase().trim();
    const statusFilter = state.invoiceStatusFilter || 'all';
    const rows = document.querySelectorAll('#invoicesTable tbody tr');
    rows.forEach(r => {
        const rowStatus = r.getAttribute('data-status') || '';
        let matchStatus = true;
        if (statusFilter === 'vigentes') {
            matchStatus = rowStatus !== 'annulled';
        } else if (statusFilter === 'annulled') {
            matchStatus = rowStatus === 'annulled';
        } else if (statusFilter !== 'all') {
            matchStatus = rowStatus === statusFilter;
        }

        const text = r.innerText.toLowerCase();
        const matchText = !q || text.includes(q);
        r.style.display = (matchStatus && matchText) ? '' : 'none';
    });
}

function fmtMoney(n) {
    if (isNaN(n) || n === null || n === undefined) return '0.00';
    return Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showInvoiceForm(id) {
    if (id) {
        api(eel.get_invoices).then(invs => {
            const i = (invs || []).find(x => x.id === id);
            if (i) showInvoiceModal(i);
        });
    } else showInvoiceModal(null);
}

function showInvoiceModal(inv) {
    Promise.all([
        api(eel.get_client_sites_grouped),
        api(eel.get_clients)
    ]).then(([sites, clients]) => {
        sites = sites || [];
        clients = clients || [];

        const today = todayStr();
        const defClientId = inv ? inv.client_id : (clients[0]?.id || '');
        const defSiteId = inv ? inv.client_site_id : '';
        const defSeries = inv ? (inv.series || 'E001') : 'E001';
        const defNumber = inv ? (inv.number || '') : '';
        const defOc = inv ? (inv.purchase_order || '') : '';
        const defService = inv ? (inv.service || 'Servicio de Saneamiento y Manejo Integrado de Plagas') : 'Servicio de Saneamiento y Manejo Integrado de Plagas';
        const defAmount = inv ? inv.amount : '';
        const defIgv = inv ? inv.igv : '';
        const defTotal = inv ? inv.total : '';
        const defDetr = inv ? inv.detraccion : '';
        const defCred = inv ? inv.credito : '';
        const defIssueDate = inv ? inv.issue_date : today;
        let defDueDate = inv ? (inv.due_date || '') : '';
        if (!defDueDate && defIssueDate) {
            try {
                const d = new Date(defIssueDate + 'T12:00:00');
                d.setDate(d.getDate() + 30);
                defDueDate = d.toISOString().split('T')[0];
            } catch(e) {}
        }

        const clientOpts = clients.map(c =>
            `<option value="${c.id}"${defClientId == c.id ? ' selected' : ''}>${esc(c.business_name)} (${esc(c.ruc || '')})</option>`
        ).join('');

        function buildSiteOpts(cid, selectedSiteId) {
            const clientSites = sites.filter(s => !cid || String(s.client_id) === String(cid));
            let opts = '<option value="">— Sin sede específica —</option>';
            opts += clientSites.map(s =>
                `<option value="${s.id}" data-fee="${s.monthly_fee || 0}" data-service="${esc(s.servicios || '')}" data-loc="${esc(s.location_code || '')}" data-client-id="${s.client_id}"${selectedSiteId == s.id ? ' selected' : ''}>
                    ${esc(s.nombre_cliente)} (Cuota: S/ ${fmtMoney(s.monthly_fee || 0)})
                </option>`
            ).join('');
            return opts;
        }

        const html = `
        <form id="modalForm" autocomplete="off" onsubmit="return false;">
            ${inv ? `
            <div style="margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.22);border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                <div style="font-size:0.85rem">
                    Factura: <strong style="font-family:monospace;font-size:0.95rem">${esc(inv.series)}-${esc(inv.number)}</strong>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" style="color:#ef4444;border:1px solid rgba(239,68,68,0.3);padding:3px 8px;font-size:0.75rem" onclick="deleteInvoice(${inv.id}, '${esc(inv.series)}-${esc(inv.number)}')">
                    🗑️ Eliminar Factura
                </button>
            </div>
            ` : ''}
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Empresa *</label>
                    <select class="form-control" name="client_id" id="modalInvClientId" onchange="onModalInvoiceClientChange(this)">${clientOpts}</select>
                </div>
                <div class="form-group" style="flex:1">
                    <label>Sede (opcional)</label>
                    <select class="form-control" name="client_site_id" id="modalInvSiteId" onchange="onModalInvoiceSiteChange(this)">
                        ${buildSiteOpts(defClientId, defSiteId)}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group" style="max-width:90px">
                    <label>Serie</label>
                    <input class="form-control" name="series" value="${esc(defSeries)}">
                </div>
                <div class="form-group" style="flex:1">
                    <label>Número *</label>
                    <input class="form-control" name="number" value="${esc(defNumber)}" placeholder="Ej. 1405" autocomplete="off" spellcheck="false" required>
                </div>
                <div class="form-group" style="flex:1">
                    <label>Orden de Compra</label>
                    <input class="form-control" name="purchase_order" id="modalInvOc" value="${esc(defOc)}" placeholder="Ej. 8600033006">
                </div>
            </div>

            <div class="form-group">
                <label>Servicio</label>
                <input class="form-control" name="service" id="modalInvService" value="${esc(defService)}" required>
            </div>

            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Monto Sin IGV (S/) *</label>
                    <input type="number" step="0.01" class="form-control" name="amount" id="modalInvAmount" value="${defAmount}" oninput="recalcModalInvoiceAmounts()" placeholder="0.00" style="font-family:monospace;font-weight:700" required>
                </div>
                <div class="form-group" style="flex:1">
                    <label>IGV (18%)</label>
                    <input type="number" step="0.01" class="form-control" name="igv" id="modalInvIgv" value="${defIgv}" placeholder="0.00" style="font-family:monospace">
                </div>
                <div class="form-group" style="flex:1">
                    <label>Total Factura (S/)</label>
                    <input type="number" step="0.01" class="form-control" name="total" id="modalInvTotal" value="${defTotal}" placeholder="0.00" style="font-family:monospace;font-weight:700">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Detracción SPOT (12%)</label>
                    <input type="number" step="0.01" class="form-control" name="detraccion" id="modalInvDetr" value="${defDetr}" placeholder="0.00" style="font-family:monospace">
                </div>
                <div class="form-group" style="flex:1">
                    <label>Neto a Cobrar</label>
                    <input type="number" step="0.01" class="form-control" name="credito" id="modalInvCred" value="${defCred}" placeholder="0.00" style="font-family:monospace">
                </div>
                <div class="form-group" style="flex:1">
                    <label>Tipo de Pago</label>
                    <select class="form-control" name="payment_type" id="modalInvPaymentType">
                        <option value="credito"${(!inv || inv.payment_type === 'credito') ? ' selected' : ''}>Crédito (30 días)</option>
                        <option value="contado"${(inv && inv.payment_type === 'contado') ? ' selected' : ''}>Contado</option>
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Fecha de Emisión</label>
                    <input type="date" class="form-control" name="issue_date" id="modalInvIssueDate" value="${defIssueDate}">
                </div>
                <div class="form-group" style="flex:1">
                    <label>Fecha de Vencimiento</label>
                    <input type="date" class="form-control" name="due_date" id="modalInvDueDate" value="${defDueDate}">
                </div>
                <div class="form-group" style="flex:1">
                    <label>Estado</label>
                    <select class="form-control" name="status">
                        <option value="issued"${(!inv || inv.status === 'issued') ? ' selected' : ''}>Emitida</option>
                        <option value="paid"${(inv && inv.status === 'paid') ? ' selected' : ''}>Pagada</option>
                        <option value="overdue"${(inv && inv.status === 'overdue') ? ' selected' : ''}>Vencida</option>
                    </select>
                </div>
            </div>
            ${inv ? `
            <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                <div style="font-size:0.75rem;color:var(--text-muted)">
                    Comprobante: <strong>${esc(inv.series)}-${esc(inv.number)}</strong> · ID #${inv.id}
                </div>
                <button type="button" class="btn btn-ghost btn-sm" style="color:#ef4444;border:1px solid rgba(239,68,68,0.3)" onclick="deleteInvoice(${inv.id}, '${esc(inv.series)}-${esc(inv.number)}')">
                    🗑️ Eliminar esta Factura
                </button>
            </div>
            ` : ''}
        </form>`;

        openModal(inv ? 'Editar factura' : 'Nueva factura', html);

        window._modalSitesList = sites;

        document.getElementById('modalSave').onclick = async () => {
            const f = new FormData(document.getElementById('modalForm'));
            const cid = parseInt(f.get('client_id'));
            const num = (f.get('number') || '').trim();
            const amt = parseFloat(f.get('amount')) || 0;

            if (!cid) { showToast('Selecciona una empresa'); return; }
            if (!num) { showToast('El número de factura es requerido'); return; }

            const igv = parseFloat(f.get('igv')) || Math.round(amt * 0.18 * 100) / 100;
            const tot = parseFloat(f.get('total')) || Math.round((amt + igv) * 100) / 100;
            const detr = parseFloat(f.get('detraccion')) || (tot > 700 ? Math.round(tot * 0.12 * 100) / 100 : 0);
            const cred = parseFloat(f.get('credito')) || Math.round((tot - detr) * 100) / 100;

            const data = {
                client_id: cid,
                client_site_id: f.get('client_site_id') ? parseInt(f.get('client_site_id')) : null,
                series: (f.get('series') || 'E001').trim(),
                number: num,
                purchase_order: (f.get('purchase_order') || '').trim(),
                service: (f.get('service') || 'Servicio de Saneamiento y Manejo Integrado de Plagas').trim(),
                amount: amt,
                igv: igv,
                total: tot,
                detraccion: detr,
                credito: cred,
                payment_type: f.get('payment_type') || 'credito',
                issue_date: f.get('issue_date') || todayStr(),
                due_date: f.get('due_date'),
                status: f.get('status') || 'issued'
            };

            const res = inv ? await api(eel.update_invoice, inv.id, data) : await api(eel.create_invoice, data);
            if (res && res.ok) {
                showToast(inv ? 'Factura actualizada' : 'Factura registrada');
                closeModal();
                const elView = document.getElementById('view-work');
                if (elView) {
                    if (state.workTab === 'invoices') await renderWorkInvoices(elView);
                    else await renderWorkMatrix(elView);
                }
            } else {
                showToast(res?.error || 'Error al guardar');
            }
        };
    });
}

function onModalInvoiceClientChange(sel) {
    const cid = sel.value;
    const siteSelect = document.getElementById('modalInvSiteId');
    if (!siteSelect || !window._modalSitesList) return;

    const filtered = window._modalSitesList.filter(s => !cid || String(s.client_id) === String(cid));
    let opts = '<option value="">— Sin sede específica —</option>';
    opts += filtered.map(s =>
        `<option value="${s.id}" data-fee="${s.monthly_fee || 0}" data-service="${esc(s.servicios || '')}" data-loc="${esc(s.location_code || '')}" data-client-id="${s.client_id}">
            ${esc(s.nombre_cliente)} (Cuota: S/ ${fmtMoney(s.monthly_fee || 0)})
        </option>`
    ).join('');
    siteSelect.innerHTML = opts;
}

function onModalInvoiceSiteChange(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (!opt) return;

    const fee = parseFloat(opt.getAttribute('data-fee')) || 0;
    const srv = opt.getAttribute('data-service');
    const parentClientId = opt.getAttribute('data-client-id');

    if (parentClientId && document.getElementById('modalInvClientId')) {
        document.getElementById('modalInvClientId').value = parentClientId;
    }
    if (srv && document.getElementById('modalInvService') && !document.getElementById('modalInvService').value.trim()) {
        document.getElementById('modalInvService').value = srv;
    }
    if (fee > 0 && document.getElementById('modalInvAmount') && !document.getElementById('modalInvAmount').value) {
        document.getElementById('modalInvAmount').value = fee.toFixed(2);
        recalcModalInvoiceAmounts();
    }
}

function recalcModalInvoiceAmounts() {
    const amt = parseFloat(document.getElementById('modalInvAmount')?.value) || 0;
    const igv = Math.round(amt * 0.18 * 100) / 100;
    const tot = Math.round((amt + igv) * 100) / 100;
    const detr = tot > 700 ? Math.round(tot * 0.12 * 100) / 100 : 0;
    const cred = Math.round((tot - detr) * 100) / 100;

    const elIgv = document.getElementById('modalInvIgv');
    const elTot = document.getElementById('modalInvTotal');
    const elDet = document.getElementById('modalInvDetr');
    const elCre = document.getElementById('modalInvCred');

    if (elIgv) elIgv.value = igv > 0 ? igv.toFixed(2) : '';
    if (elTot) elTot.value = tot > 0 ? tot.toFixed(2) : '';
    if (elDet) elDet.value = detr > 0 ? detr.toFixed(2) : '0.00';
    if (elCre) elCre.value = cred > 0 ? cred.toFixed(2) : '';
}

async function deleteInvoice(id, label) {
    const promptMsg = label
        ? `¿Eliminar la factura ${label}? Se quitará permanentemente de los registros.`
        : '¿Eliminar esta factura? Se quitará permanentemente de los registros.';
    if (!confirm(promptMsg)) return;

    const res = await api(eel.delete_invoice, id);
    if (res && res.ok) {
        showToast(`✓ Factura ${label || ''} eliminada correctamente`);
        closeModal();
        const elView = document.getElementById('view-work');
        if (elView) {
            if (state.workTab === 'invoices') {
                await renderWorkInvoices(elView);
            } else {
                await renderWorkMatrix(elView);
            }
        }
    } else {
        showToast(res && res.error ? res.error : 'Error al eliminar');
    }
}

function copySunatField(text, label) {
    if (text === null || text === undefined || text === '') return;
    const val = String(text).trim();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(() => {
            showToast('📋 Copiado: ' + (label || val));
        }).catch(() => {
            fallbackCopy(val);
            showToast('📋 Copiado: ' + (label || val));
        });
    } else {
        fallbackCopy(val);
        showToast('📋 Copiado: ' + (label || val));
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
}


// Calculadora de IGV y Detracciones para servicios no registrados en matriz
window.extCalc = window.extCalc || {
    clientId: null,
    clientSiteId: null,
    clientName: '',
    ruc: '',
    service: 'Servicio de Control de Plagas',
    purchaseOrder: '',
    amount: 800.00,
    detrRate: 0.12, // Fijo 12% para Fumigación y Saneamiento Ambiental
    bnAccount: '00046317769',
    series: 'E001',
    number: '',
    issueDate: todayStr(),
    dueDays: 30, // 15, 30, 45, 60, etc.
    customDueDate: '',
    isCustomDueDate: false
};

function getExtCalcDueDateInfo() {
    const issueStr = window.extCalc.issueDate || todayStr();
    let d;
    try {
        d = new Date(issueStr + 'T12:00:00');
    } catch(e) {
        d = new Date();
    }

    if (window.extCalc.isCustomDueDate && window.extCalc.customDueDate) {
        try {
            const cd = new Date(window.extCalc.customDueDate + 'T12:00:00');
            const day = String(cd.getDate()).padStart(2, '0');
            const month = String(cd.getMonth() + 1).padStart(2, '0');
            const diffDays = Math.round((cd - d) / (1000 * 60 * 60 * 24));
            return {
                iso: window.extCalc.customDueDate,
                formatted: `${day}/${month}/${cd.getFullYear()}`,
                label: diffDays > 0 ? `+${diffDays} días` : (diffDays === 0 ? 'Mismo día' : `${diffDays} días`)
            };
        } catch(e) {}
    }

    const days = parseInt(window.extCalc.dueDays) || 0;
    d.setDate(d.getDate() + days);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const iso = `${year}-${month}-${day}`;
    const formatted = `${day}/${month}/${year}`;
    const label = days === 0 ? 'Al Contado' : `+${days} días`;
    return { iso, formatted, label };
}

async function renderWorkCalculator(el) {
    const [clients, sitesGrouped] = await Promise.all([
        api(eel.get_clients),
        api(eel.get_client_sites_grouped)
    ]);

    window._calcClients = clients || [];
    window._calcSites = sitesGrouped || [];

    // Client select options
    const clientOpts = '<option value="">— Seleccionar cliente existente o ingresar libremente —</option>' +
        window._calcClients.map(c =>
            `<option value="${c.id}" data-name="${esc(c.business_name)}" data-ruc="${esc(c.ruc || '')}" data-bn="${esc(c.detraccion_account || '')}"${window.extCalc.clientId === c.id ? ' selected' : ''}>
                ${esc(c.business_name)} (${esc(c.ruc || 'Sin RUC')})
            </option>`
        ).join('');

    // RUC datalist for rapid autocompletion while typing
    const rucDatalistOpts = window._calcClients
        .filter(c => c.ruc)
        .map(c => `<option value="${esc(c.ruc)}">${esc(c.business_name)} (${esc(c.ruc)})</option>`)
        .join('');

    // Sede options based on current clientId
    let sedeOpts = '<option value="">— Sin sede / Fuera de sede —</option>';
    if (window.extCalc.clientId) {
        const clientSites = window._calcSites.filter(s => s.client_id === window.extCalc.clientId);
        sedeOpts += clientSites.map(s =>
            `<option value="${s.id}" data-service="${esc(s.servicios || '')}" data-fee="${s.monthly_fee || 0}"${window.extCalc.clientSiteId === s.id ? ' selected' : ''}>
                ${esc(s.nombre_cliente)} ${s.servicios ? '· ' + esc(s.servicios) : ''}
            </option>`
        ).join('');
    }

    const { iso: curDueDateIso } = getExtCalcDueDateInfo();

    let html = `
    <div class="page-header" style="margin-bottom:16px">
        <div>
            <h2>Calculadora de IGV y Detracciones</h2>
            <div class="subtitle">Herramienta para calcular impuestos, SPOT y copiar datos a SUNAT para servicios fuera de matriz</div>
        </div>
        <div class="page-actions" style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="resetExtCalculator()">🔄 Limpiar</button>
            <button class="btn btn-primary btn-sm" onclick="saveExtCalculatorInvoice()">💾 Registrar Factura</button>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-bottom:24px">
        <!-- Input Parameters Card -->
        <div class="card">
            <h3 style="font-size:1rem;margin-bottom:14px;border-bottom:1px solid var(--border-light);padding-bottom:8px">Datos del Servicio</h3>

            <!-- RUC & Razón Social with Autocomplete -->
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>RUC (Autocompleta cliente)</label>
                    <input class="form-control" id="extCalcRuc" list="extCalcRucList" value="${esc(window.extCalc.ruc)}" placeholder="20XXXXXXXXX" maxlength="11" oninput="onExtCalcRucInput(this.value)">
                    <datalist id="extCalcRucList">${rucDatalistOpts}</datalist>
                </div>
                <div class="form-group" style="flex:2">
                    <label>Razón Social / Empresa</label>
                    <input class="form-control" id="extCalcClient" value="${esc(window.extCalc.clientName)}" placeholder="Ej. Cliente SAC" oninput="window.extCalc.clientName=this.value; renderExtCalcResults()">
                </div>
            </div>

            <!-- Client dropdown selector -->
            <div class="form-group">
                <label style="display:flex;justify-content:space-between;align-items:center">
                    <span>O elegir de clientes registrados:</span>
                    ${window.extCalc.clientId ? `<span style="color:var(--primary);font-size:0.75rem;font-weight:600">✓ Vinculado a cliente</span>` : ''}
                </label>
                <select class="form-control" id="extCalcSelectClient" onchange="onExtCalcClientChange(this)">${clientOpts}</select>
            </div>

            <!-- Optional Sede and OC -->
            <div class="form-row">
                <div class="form-group" style="flex:2">
                    <label>Sede (Opcional)</label>
                    <select class="form-control" id="extCalcSite" onchange="onExtCalcSiteChange(this)">
                        ${sedeOpts}
                    </select>
                </div>
                <div class="form-group" style="flex:1">
                    <label>Orden de Compra (OC)</label>
                    <input class="form-control" id="extCalcPo" value="${esc(window.extCalc.purchaseOrder || '')}" placeholder="Ej. 4501201335" oninput="window.extCalc.purchaseOrder=this.value; renderExtCalcResults()">
                </div>
            </div>

            <!-- Service Description (Optional/Editable) -->
            <div class="form-group">
                <label>Descripción del Servicio (Opcional)</label>
                <input class="form-control" id="extCalcService" value="${esc(window.extCalc.service)}" placeholder="Ej. Servicio de Control de Plagas" oninput="window.extCalc.service=this.value; renderExtCalcResults()">
            </div>

            <!-- Monto Sin IGV & Detracción SPOT fija 12% -->
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Monto Sin IGV (S/) *</label>
                    <input type="number" step="0.01" min="0" class="form-control" id="extCalcAmount" value="${window.extCalc.amount || ''}" placeholder="0.00" style="font-family:monospace;font-weight:700;font-size:1.1rem" oninput="window.extCalc.amount=parseFloat(this.value)||0; renderExtCalcResults()">
                </div>
                <div class="form-group" style="flex:1">
                    <label>Detracción SPOT</label>
                    <div style="padding:9px 12px;background:var(--bg-main);border:1px solid var(--border-light);border-radius:8px;font-size:0.85rem;display:flex;align-items:center;justify-content:space-between">
                        <strong style="color:var(--text)">12% SPOT</strong>
                        <span style="font-size:0.75rem;color:var(--text-muted)">(Aplica si Total > S/ 700)</span>
                    </div>
                </div>
            </div>

            <!-- Plazo y Vencimiento -->
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Plazo de Pago / Vencimiento</label>
                    <select class="form-control" id="extCalcDueTerm" onchange="onExtCalcDueTermChange(this.value)">
                        <option value="10"${window.extCalc.dueDays === 10 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Crédito a 10 días</option>
                        <option value="15"${window.extCalc.dueDays === 15 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Crédito a 15 días</option>
                        <option value="21"${window.extCalc.dueDays === 21 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Crédito a 21 días</option>
                        <option value="30"${window.extCalc.dueDays === 30 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Crédito a 30 días</option>
                        <option value="45"${window.extCalc.dueDays === 45 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Crédito a 45 días</option>
                        <option value="60"${window.extCalc.dueDays === 60 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Crédito a 60 días</option>
                        <option value="90"${window.extCalc.dueDays === 90 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Crédito a 90 días</option>
                        <option value="0"${window.extCalc.dueDays === 0 && !window.extCalc.isCustomDueDate ? ' selected' : ''}>Al Contado (Mismo día)</option>
                        <option value="custom"${window.extCalc.isCustomDueDate ? ' selected' : ''}>Personalizado (Elegir fecha)</option>
                    </select>
                </div>
                <div class="form-group" style="flex:1">
                    <label>Fecha de Emisión</label>
                    <input type="date" class="form-control" id="extCalcIssueDate" value="${window.extCalc.issueDate || todayStr()}" onchange="onExtCalcIssueDateChange(this.value)">
                </div>
            </div>

            <!-- Fecha de vencimiento selector exacto -->
            <div class="form-group" id="extCalcCustomDueDateGroup" style="${window.extCalc.isCustomDueDate ? '' : 'display:none'}">
                <label>Fecha de Vencimiento Exacta</label>
                <input type="date" class="form-control" id="extCalcDueDate" value="${curDueDateIso}" onchange="onExtCalcCustomDueDateChange(this.value)">
            </div>

            <!-- Cuenta BN, Serie y Factura -->
            <div class="form-row">
                <div class="form-group" style="flex:1">
                    <label>Cta. Detracción BN</label>
                    <select class="form-control" id="extCalcBn" onchange="window.extCalc.bnAccount=this.value; renderExtCalcResults()">
                        <option value="00046317769"${window.extCalc.bnAccount === '00046317769' ? ' selected' : ''}>00046317769 (Cta 1)</option>
                        <option value="00771005578"${window.extCalc.bnAccount === '00771005578' ? ' selected' : ''}>00771005578 (Cta 2)</option>
                    </select>
                </div>
                <div class="form-group" style="max-width:90px">
                    <label>Serie</label>
                    <input class="form-control" id="extCalcSerie" value="${esc(window.extCalc.series || 'E001')}" oninput="window.extCalc.series=this.value">
                </div>
                <div class="form-group" style="flex:1">
                    <label>N° Factura</label>
                    <input class="form-control" id="extCalcNum" value="${esc(window.extCalc.number || '')}" placeholder="Ej. 1405" oninput="window.extCalc.number=this.value">
                </div>
            </div>
        </div>

        <!-- Results Card with 1-click Copy -->
        <div class="card" id="extCalcResultsCard">
            <!-- Rendered by renderExtCalcResults -->
        </div>
    </div>
    `;

    el.innerHTML = html;
    renderExtCalcResults();
}

function onExtCalcRucInput(val) {
    const cleanRuc = (val || '').trim();
    window.extCalc.ruc = cleanRuc;

    const clients = window._calcClients || [];
    const matched = clients.find(c => (c.ruc || '').trim() === cleanRuc);

    const elClient = document.getElementById('extCalcClient');
    const elSel = document.getElementById('extCalcSelectClient');
    const elBn = document.getElementById('extCalcBn');

    if (matched) {
        window.extCalc.clientId = matched.id;
        window.extCalc.clientName = matched.business_name;
        if (matched.detraccion_account) {
            window.extCalc.bnAccount = matched.detraccion_account;
        }
        if (elClient) elClient.value = matched.business_name;
        if (elSel) elSel.value = matched.id;
        if (elBn) elBn.value = window.extCalc.bnAccount;
        refreshExtCalcSedes();
    } else {
        if (window.extCalc.clientId) {
            window.extCalc.clientId = null;
            if (elSel) elSel.value = '';
            refreshExtCalcSedes();
        }
    }
    renderExtCalcResults();
}

function onExtCalcClientChange(sel) {
    const cid = sel.value ? parseInt(sel.value) : null;
    window.extCalc.clientId = cid;

    const elClient = document.getElementById('extCalcClient');
    const elRuc = document.getElementById('extCalcRuc');
    const elBn = document.getElementById('extCalcBn');

    if (!cid) {
        refreshExtCalcSedes();
        renderExtCalcResults();
        return;
    }

    const clients = window._calcClients || [];
    const matched = clients.find(c => c.id === cid);
    if (matched) {
        window.extCalc.clientName = matched.business_name;
        window.extCalc.ruc = matched.ruc || '';
        if (matched.detraccion_account) {
            window.extCalc.bnAccount = matched.detraccion_account;
        }
        if (elClient) elClient.value = matched.business_name;
        if (elRuc) elRuc.value = matched.ruc || '';
        if (elBn) elBn.value = window.extCalc.bnAccount;
        refreshExtCalcSedes();
    }
    renderExtCalcResults();
}

function refreshExtCalcSedes() {
    const siteSelect = document.getElementById('extCalcSite');
    if (!siteSelect) return;

    let opts = '<option value="">— Sin sede / Fuera de sede —</option>';
    if (window.extCalc.clientId) {
        const clientSites = (window._calcSites || []).filter(s => s.client_id === window.extCalc.clientId);
        opts += clientSites.map(s =>
            `<option value="${s.id}" data-service="${esc(s.servicios || '')}" data-fee="${s.monthly_fee || 0}"${window.extCalc.clientSiteId === s.id ? ' selected' : ''}>
                ${esc(s.nombre_cliente)} ${s.servicios ? '· ' + esc(s.servicios) : ''}
            </option>`
        ).join('');

        siteSelect.innerHTML = opts;

        // If only 1 site exists, auto-select it
        if (clientSites.length === 1 && !window.extCalc.clientSiteId) {
            siteSelect.value = String(clientSites[0].id);
            onExtCalcSiteChange(siteSelect);
            return;
        }
    } else {
        siteSelect.innerHTML = opts;
        window.extCalc.clientSiteId = null;
    }
}

function onExtCalcSiteChange(sel) {
    const sid = sel && sel.value ? parseInt(sel.value) : null;
    window.extCalc.clientSiteId = sid;

    if (sid) {
        const sites = window._calcSites || [];
        const site = sites.find(s => s.id === sid);
        if (site) {
            if (site.servicios) {
                window.extCalc.service = site.servicios;
                const elSrv = document.getElementById('extCalcService');
                if (elSrv) elSrv.value = site.servicios;
            }
            if ((!window.extCalc.amount || window.extCalc.amount === 800) && site.monthly_fee > 0) {
                window.extCalc.amount = site.monthly_fee;
                const elAmt = document.getElementById('extCalcAmount');
                if (elAmt) elAmt.value = site.monthly_fee.toFixed(2);
            }
        }
    }
    renderExtCalcResults();
}

function onExtCalcDueTermChange(val) {
    const customGroup = document.getElementById('extCalcCustomDueDateGroup');
    if (val === 'custom') {
        window.extCalc.isCustomDueDate = true;
        if (customGroup) customGroup.style.display = '';
    } else {
        window.extCalc.isCustomDueDate = false;
        window.extCalc.dueDays = parseInt(val) || 0;
        if (customGroup) customGroup.style.display = 'none';
    }

    const { iso } = getExtCalcDueDateInfo();
    const elDate = document.getElementById('extCalcDueDate');
    if (elDate) elDate.value = iso;

    renderExtCalcResults();
}

function onExtCalcIssueDateChange(val) {
    window.extCalc.issueDate = val || todayStr();
    const { iso } = getExtCalcDueDateInfo();
    const elDate = document.getElementById('extCalcDueDate');
    if (elDate) elDate.value = iso;
    renderExtCalcResults();
}

function onExtCalcCustomDueDateChange(val) {
    window.extCalc.customDueDate = val;
    window.extCalc.isCustomDueDate = true;
    renderExtCalcResults();
}

function renderExtCalcResults() {
    const card = document.getElementById('extCalcResultsCard');
    if (!card) return;

    const sub = window.extCalc.amount || 0;
    const igv = Math.round(sub * 0.18 * 100) / 100;
    const tot = Math.round((sub + igv) * 100) / 100;

    // SUNAT SPOT: Solo aplica cuando el TOTAL CON IGV SUPERA los S/ 700.00
    const aplicaDetr = tot > 700;
    const detr = aplicaDetr ? Math.round(tot * 0.12 * 100) / 100 : 0.00;
    const cred = Math.round((tot - detr) * 100) / 100;

    const { iso: dueDateIso, formatted: fDueDate, label: termLabel } = getExtCalcDueDateInfo();

    window.extCalcComputed = { sub, igv, tot, detr, cred, aplicaDetr, dueDateIso, fDueDate, termLabel };

    card.innerHTML = `
        <h3 style="font-size:1rem;margin-bottom:14px;border-bottom:1px solid var(--border-light);padding-bottom:8px">Valores para Portal SUNAT</h3>

        <div style="display:flex;flex-direction:column;gap:10px">
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Base Imponible (Sin IGV)</div>
                    <div style="font-family:monospace;font-weight:700;font-size:1.05rem">S/ ${fmtMoney(sub)}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${sub.toFixed(2)}', 'Base Imponible')">📋 Copiar</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">IGV (18%)</div>
                    <div style="font-family:monospace;font-weight:700;font-size:1.05rem">S/ ${fmtMoney(igv)}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${igv.toFixed(2)}', 'IGV')">📋 Copiar</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Total Factura</div>
                    <div style="font-family:monospace;font-weight:700;font-size:1.15rem;color:var(--primary)">S/ ${fmtMoney(tot)}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${tot.toFixed(2)}', 'Total')">📋 Copiar</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Detracción SPOT (12%)</div>
                    <div style="font-family:monospace;font-weight:700;font-size:1.05rem;color:${aplicaDetr ? '#b45309' : 'var(--text-muted)'}">
                        S/ ${fmtMoney(detr)}
                        ${!aplicaDetr ? '<span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)"> (No aplica: Total ≤ S/ 700)</span>' : ''}
                    </div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${detr.toFixed(2)}', 'Detracción')">📋 Copiar</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Neto a Cobrar (${termLabel})</div>
                    <div style="font-family:monospace;font-weight:700;font-size:1.15rem;color:#10b981">S/ ${fmtMoney(cred)}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${cred.toFixed(2)}', 'Neto a Cobrar')">📋 Copiar</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Cuenta Detracción BN</div>
                    <div style="font-family:monospace;font-weight:600;font-size:0.95rem">${window.extCalc.bnAccount}</div>
                    ${!aplicaDetr ? '<div style="font-size:0.7rem;color:var(--text-muted)">Opcional: No requerida en SUNAT para montos ≤ S/ 700</div>' : ''}
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${window.extCalc.bnAccount}', 'Cuenta BN')">📋 Copiar</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-light)">
                <div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">Vencimiento (${termLabel})</div>
                    <div style="font-family:monospace;font-weight:600;font-size:0.95rem">${fDueDate}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${fDueDate}', 'Fecha Vencimiento')">📋 Copiar</button>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0">
                <div style="flex:1;padding-right:8px">
                    <div style="font-size:0.75rem;color:var(--text-muted)">Importe en Letras:</div>
                    <div style="font-size:0.8rem;font-weight:600;margin-top:2px">${numeroALetras(tot)}</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="copySunatField('${numeroALetras(tot).replace(/'/g, "\'")}', 'Importe en Letras')">📋 Copiar</button>
            </div>
        </div>

        <div style="margin-top:16px;display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" onclick="saveExtCalculatorInvoice()">💾 Guardar Factura</button>
            <button class="btn btn-secondary btn-sm" onclick="copyExtCalcSummary()">📋 Copiar Resumen</button>
        </div>
    `;
}

function resetExtCalculator() {
    window.extCalc = {
        clientId: null,
        clientSiteId: null,
        clientName: '',
        ruc: '',
        service: 'Servicio de Control de Plagas',
        purchaseOrder: '',
        amount: 800.00,
        detrRate: 0.12,
        bnAccount: '00046317769',
        series: 'E001',
        number: '',
        issueDate: todayStr(),
        dueDays: 30,
        customDueDate: '',
        isCustomDueDate: false
    };
    const elView = document.getElementById('view-work');
    if (elView) renderWorkCalculator(elView);
}

function copyExtCalcSummary() {
    const c = window.extCalcComputed || {};
    let txt = `DATOS FACTURACIÓN SUNAT\n`;
    if (window.extCalc.clientName) txt += `Cliente: ${window.extCalc.clientName}\n`;
    if (window.extCalc.ruc) txt += `RUC: ${window.extCalc.ruc}\n`;
    if (window.extCalc.clientSiteId) {
        const site = (window._calcSites || []).find(s => s.id === window.extCalc.clientSiteId);
        if (site) txt += `Sede: ${site.nombre_cliente}\n`;
    }
    if (window.extCalc.purchaseOrder) txt += `Orden de Compra (OC): ${window.extCalc.purchaseOrder}\n`;
    if (window.extCalc.service) txt += `Servicio: ${window.extCalc.service}\n`;
    txt += `Base Imponible: S/ ${fmtMoney(c.sub || 0)}\n`;
    txt += `IGV (18%): S/ ${fmtMoney(c.igv || 0)}\n`;
    txt += `Total: S/ ${fmtMoney(c.tot || 0)}\n`;
    if (c.aplicaDetr) {
        txt += `Detracción SPOT (12%): S/ ${fmtMoney(c.detr || 0)}\n`;
        txt += `Neto a Cobrar: S/ ${fmtMoney(c.cred || 0)}\n`;
        txt += `Cuenta BN: ${window.extCalc.bnAccount}\n`;
    } else {
        txt += `Detracción SPOT: No aplica (Total ≤ S/ 700.00)\n`;
        txt += `Neto a Cobrar: S/ ${fmtMoney(c.tot || 0)}\n`;
    }
    txt += `Vencimiento (${c.termLabel || ''}): ${c.fDueDate || ''}\n`;
    txt += `Son: ${numeroALetras(c.tot || 0)}\n`;

    copySunatField(txt, 'Resumen completo');
}

async function saveExtCalculatorInvoice() {
    const c = window.extCalcComputed || {};
    if (!c.sub || c.sub <= 0) {
        showToast('Ingresa un monto válido sin IGV');
        return;
    }

    const number = (window.extCalc.number || '').trim();
    if (!number) {
        showToast('Ingresa el número de factura');
        return;
    }

    const invoiceData = {
        client_id: window.extCalc.clientId || (window._calcClients?.[0]?.id || 1),
        client_site_id: window.extCalc.clientSiteId || null,
        series: (window.extCalc.series || 'E001').trim(),
        number: number,
        purchase_order: (window.extCalc.purchaseOrder || '').trim(),
        service: (window.extCalc.service || 'Servicio de Control de Plagas').trim(),
        amount: c.sub,
        igv: c.igv,
        total: c.tot,
        detraccion: c.detr,
        credito: c.cred,
        payment_type: (window.extCalc.dueDays === 0 && !window.extCalc.isCustomDueDate) ? 'contado' : 'credito',
        issue_date: window.extCalc.issueDate || todayStr(),
        due_date: c.dueDateIso,
        status: 'issued'
    };

    const res = await api(eel.create_invoice, invoiceData);
    if (res && res.ok) {
        showToast(`✓ Factura ${invoiceData.series}-${number} registrada`);
        switchWorkTab('invoices');
    } else {
        showToast(res?.error || 'Error al guardar la factura');
    }
}

function numeroALetras(num) {
    if (isNaN(num) || num === null || num === undefined) return "CERO CON 00/100 SOLES";
    num = Math.round(num * 100) / 100;
    let entero = Math.floor(num);
    let decimales = Math.round((num - entero) * 100);
    let textoDecimal = " CON " + decimales.toString().padStart(2, '0') + "/100 SOLES";

    if (entero === 0) return "CERO" + textoDecimal;

    function unidades(n) {
        const unids = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
        return unids[n] || "";
    }

    function decenas(n) {
        const decs = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
        const diecis = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
        if (n < 10) return unidades(n);
        if (n >= 10 && n < 20) return diecis[n - 10];
        if (n >= 20 && n < 30) return n === 20 ? "VEINTE" : "VEINTI" + unidades(n - 20);
        return decs[Math.floor(n / 10)] + (n % 10 !== 0 ? " Y " + unidades(n % 10) : "");
    }

    function centenas(n) {
        const cents = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
        if (n === 100) return "CIEN";
        return cents[Math.floor(n / 100)] + (n % 100 !== 0 ? " " + decenas(n % 100) : "");
    }

    function miles(n) {
        let c = Math.floor(n / 1000);
        let resto = n % 1000;
        let textoC = c === 1 ? "MIL" : centenas(c) + " MIL";
        return c === 0 ? centenas(resto) : textoC + (resto !== 0 ? " " + centenas(resto) : "");
    }

    function millones(n) {
        let m = Math.floor(n / 1000000);
        let resto = n % 1000000;
        let textoM = m === 1 ? "UN MILLON" : miles(m) + " MILLONES";
        return m === 0 ? miles(resto) : textoM + (resto !== 0 ? " " + miles(resto) : "");
    }

    return (millones(entero) + textoDecimal).trim().replace(/\s+/g, ' ');
}

// --- WORK COTIZACIONES ---
async function renderWorkQuotes(el) {
    const quotes = await api(eel.get_quotes) || [];
    const serviceTypes = await api(eel.get_service_types) || [];
    let html = '<div style="display:flex;justify-content:space-between;margin-bottom:14px">' +
        '<h3 style="margin:0">Cotizaciones</h3>' +
        '<button class="btn btn-primary" onclick="showQuoteForm()">+ Nueva cotización</button></div>';
    html += '<div id="quoteData" data-service-types=\''+esc(JSON.stringify(serviceTypes))+'\'></div>';
    if (quotes.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">📄</div><h3>Sin cotizaciones</h3><p>Crea tu primera cotización</p></div>';
    } else {
        const stMap = { borrador:{label:'Borrador',cls:'tag'}, emitida:{label:'Emitida',cls:'tag-primary'}, aceptada:{label:'Aceptada',cls:'tag-sage'}, rechazada:{label:'Rechazada',cls:'tag-rose'} };
        html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>Cliente</th><th>Sede</th><th>Total</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>';
        for (const q of quotes) {
            const s = stMap[q.status] || {label:q.status,cls:'tag'};
            html += '<tr><td>'+esc(q.number)+'</td><td><strong>'+esc(q.business_name||'')+'</strong></td>' +
                '<td style="font-size:0.8rem">'+esc(q.site_name||'-')+'</td><td>S/ '+(q.total||0).toFixed(2)+'</td>' +
                '<td>'+fmtDate(q.issue_date)+'</td><td><span class="tag '+s.cls+'">'+s.label+'</span></td>' +
                '<td style="text-align:right;white-space:nowrap">' +
                '<button class="btn btn-ghost btn-sm" onclick="showQuoteForm('+q.id+')" title="Editar">✎</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="downloadQuoteWord('+q.id+')" title="Descargar Word">📄</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="convertQuoteToInvoice('+q.id+')" title="Convertir a Factura">🧾</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="deleteQuote('+q.id+')" title="Eliminar">✕</button></td></tr>';
        }
        html += '</tbody></table></div>';
    }
    el.innerHTML = html;
}

async function convertQuoteToInvoice(id) {
    if (!confirm('¿Convertir esta cotización en una Factura emitida y marcarla como Aceptada?')) return;
    const res = await api(eel.convert_quote_to_invoice, id);
    if (res && res.ok) {
        showToast('Factura creada desde cotización');
        state.workTab = 'invoices';
        navigate('work');
    } else {
        showToast('Error: ' + (res?.error || 'No se pudo convertir'));
    }
}

function showQuoteForm(id) {
    if (id) {
        api(eel.get_quote, id).then(q => {
            if (q) showQuoteModal(q);
        });
    } else showQuoteModal(null);
}

function showQuoteModal(quote) {
    // Preload all needed data
    Promise.all([
        api(eel.get_clients) || [],
        api(eel.get_client_sites_grouped) || [],
        api(eel.get_service_types) || [],
        api(eel.get_service_descriptions) || [],
    ]).then(([clients, sites, serviceTypes, descriptions]) => {
        clients = clients || []; sites = sites || []; serviceTypes = serviceTypes || []; descriptions = descriptions || [];
        const items = (quote && quote.items) ? quote.items.map(it => ({...it})) : [];

        const clientOpts = '<option value="">— Seleccionar —</option>' + clients.map(c =>
            '<option value="'+c.id+'"'+(quote && quote.client_id === c.id ? ' selected' : '')+'>'+esc(c.business_name)+'</option>'
        ).join('');

        const stVal = quote ? quote.status : 'borrador';
        const html = '<form id="quoteForm">' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
            '<div class="form-group" style="flex:2"><label>Empresa *</label><select class="form-control" name="client_id" onchange="updateQuoteSites()">'+clientOpts+'</select></div>' +
            '<div class="form-group" style="flex:1"><label>Sede</label><select class="form-control" name="client_site_id" id="quoteSiteSelect"><option value="">— Sin sede —</option></select></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Fecha</label><input type="date" class="form-control" name="issue_date" value="'+(quote ? quote.issue_date : todayStr())+'"></div>' +
            '<div class="form-group"><label>Válido hasta</label><input type="date" class="form-control" name="valid_until" value="'+(quote ? quote.valid_until : '')+'"></div></div>' +
            '<div class="form-row"><div class="form-group"><label>Cond. pago</label><select class="form-control" name="payment_terms">' +
            '<option value="CREDITO A 30 DIAS"'+(quote && quote.payment_terms === 'CREDITO A 30 DIAS' ? ' selected' : '')+'>Crédito 30 días</option>' +
            '<option value="CREDITO A 15 DIAS"'+(quote && quote.payment_terms === 'CREDITO A 15 DIAS' ? ' selected' : '')+'>Crédito 15 días</option>' +
            '<option value="CONTADO"'+(quote && quote.payment_terms === 'CONTADO' ? ' selected' : '')+'>Contado</option>' +
            '<option value="CREDITO A 60 DIAS"'+(quote && quote.payment_terms === 'CREDITO A 60 DIAS' ? ' selected' : '')+'>Crédito 60 días</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Estado</label><select class="form-control" name="status">' +
            '<option value="borrador"'+(stVal==='borrador'?' selected':'')+'>Borrador</option>' +
            '<option value="emitida"'+(stVal==='emitida'?' selected':'')+'>Emitida</option>' +
            '<option value="aceptada"'+(stVal==='aceptada'?' selected':'')+'>Aceptada</option>' +
            '<option value="rechazada"'+(stVal==='rechazada'?' selected':'')+'>Rechazada</option>' +
            '</select></div></div>' +
            '<div id="quoteItemsContainer"></div>' +
            '<div style="margin:8px 0;display:flex;justify-content:space-between;align-items:center">' +
            (quote ? '<button type="button" class="btn btn-secondary btn-sm" onclick="downloadQuoteWord('+quote.id+')">📄 Descargar Word</button>' : '<div></div>') +
            '<button type="button" class="btn btn-ghost btn-sm" onclick="addQuoteLine()">+ Agregar servicio</button></div>' +
            '<div style="border-top:1px solid #ddd;padding-top:8px;text-align:right;font-size:1.1rem">' +
            'Subtotal: <strong id="qSubtotal">S/ 0.00</strong> | IGV (18%): <strong id="qIgv">S/ 0.00</strong> | ' +
            '<span style="font-size:1.3rem">Total: <strong id="qTotal">S/ 0.00</strong></span></div>' +
            '</form>';

        const title = quote ? 'Editar cotización ' + quote.number : 'Nueva cotización';
        openModal(title, html);

        // Store data for line editor
        window.__quoteData = { serviceTypes, descriptions, items, sites, clients, quoteId: quote ? quote.id : null };

        // Populate sites dropdown based on selected client
        window.updateQuoteSites = function() {
            const clientId = parseInt(document.querySelector('[name=client_id]').value);
            const siteSelect = document.getElementById('quoteSiteSelect');
            if (!clientId) { siteSelect.innerHTML = '<option value="">— Sin sede —</option>'; return; }
            const filtered = sites.filter(s => s.parent_client_id === clientId || s.client_id === clientId);
            siteSelect.innerHTML = '<option value="">— Sin sede —</option>' + filtered.map(s =>
                '<option value="'+s.id+'"'+(quote && quote.client_site_id === s.id ? ' selected' : '')+'>'+esc(s.nombre_cliente)+'</option>'
            ).join('');
        };
        updateQuoteSites();

        // Render existing items
        renderQuoteLines(items, serviceTypes, descriptions);
        recalcQuoteTotals();

        document.getElementById('modalSave').onclick = async () => saveQuote(quote);
    });
}

function syncQuoteItemsFromDOM() {
    const lines = document.querySelectorAll('.quote-line');
    if (!lines.length || !window.__quoteData) return;
    const synced = [];
    lines.forEach(line => {
        const typeVal = line.querySelector('.qt-type')?.value;
        const descVal = line.querySelector('.qt-desc')?.value;
        const qty = parseFloat(line.querySelector('.qt-qty')?.value) || 1;
        const price = parseFloat(line.querySelector('.qt-price')?.value) || 0;
        const text = line.querySelector('.qt-text')?.value || '';
        const itemId = line.dataset.itemId ? parseInt(line.dataset.itemId) : null;
        synced.push({
            id: itemId,
            service_type_id: typeVal ? parseInt(typeVal) : '',
            description_id: descVal ? parseInt(descVal) : '',
            description_text: text,
            quantity: qty,
            unit_price: price,
        });
    });
    window.__quoteData.items = synced;
}

function renderQuoteLines(items, serviceTypes, descriptions) {
    const container = document.getElementById('quoteItemsContainer');
    if (!container) return;
    let html = '<div style="margin:8px 0"><h4 style="margin:0 0 8px">Servicios incluidos</h4></div>';
    const allItems = items.length > 0 ? items : [{ id: null, service_type_id: '', description_id: '', description_text: '', quantity: 1, unit_price: 0 }];
    allItems.forEach((item, idx) => {
        const typeOpts = '<option value="">— Seleccionar —</option>' + serviceTypes.map(st =>
            '<option value="'+st.id+'"'+(item.service_type_id === st.id ? ' selected' : '')+'>'+esc(st.name)+'</option>'
        ).join('');
        const matchingDescs = descriptions.filter(d => d.service_type_id === item.service_type_id);
        const descOpts = '<option value="">— Descripción —</option>' + matchingDescs.map(d =>
            '<option value="'+d.id+'" data-text="'+esc(d.description_text)+'"'+(item.description_id === d.id ? ' selected' : '')+'>'+esc(d.name)+'</option>'
        ).join('');

        html += '<div class="quote-line" data-item-id="'+(item.id||'')+'" style="border:1px solid #eee;border-radius:8px;padding:8px;margin-bottom:8px;background:#fafafa">' +
            '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:end">' +
            '<div class="form-group" style="flex:1;min-width:140px"><label>Servicio</label><select class="form-control qt-type" name="qt_type_'+idx+'" onchange="onQuoteTypeChange('+idx+')">'+typeOpts+'</select></div>' +
            '<div class="form-group" style="flex:1;min-width:140px"><label>Descripción</label><select class="form-control qt-desc" name="qt_desc_'+idx+'" onchange="onQuoteDescChange('+idx+')">'+descOpts+'</select></div>' +
            '<div class="form-group" style="width:60px"><label>Cant.</label><input type="number" step="1" class="form-control qt-qty" name="qt_qty_'+idx+'" value="'+(item.quantity||1)+'" onchange="recalcQuoteLine('+idx+')" onkeyup="recalcQuoteLine('+idx+')"></div>' +
            '<div class="form-group" style="width:90px"><label>P. Unit.</label><input type="number" step="0.01" class="form-control qt-price" name="qt_price_'+idx+'" value="'+(item.unit_price||'')+'" onchange="recalcQuoteLine('+idx+')" onkeyup="recalcQuoteLine('+idx+')"></div>' +
            '<div class="form-group" style="width:80px"><label>Total</label><strong class="qt-line-total" id="qt_total_'+idx+'">S/ '+((item.quantity||1)*(item.unit_price||0)).toFixed(2)+'</strong></div>' +
            '<button type="button" class="btn btn-ghost btn-sm" style="margin-bottom:4px" onclick="removeQuoteLine('+idx+')">✕</button></div>' +
            '<div class="form-group" style="margin-top:4px"><label>Descripción detallada</label>' +
            '<div style="display:flex;gap:4px"><textarea class="form-control qt-text" name="qt_text_'+idx+'" rows="3" style="font-size:0.8rem">'+esc(item.description_text||'')+'</textarea>' +
            '<button type="button" class="btn btn-ghost btn-sm" style="align-self:end;white-space:nowrap" onclick="generateIALine('+idx+')" title="Generar con IA">✨ IA</button></div></div></div>';
    });
    container.innerHTML = html;
}

window.onQuoteTypeChange = function(idx) {
    const typeSelect = document.querySelector('[name=qt_type_'+idx+']');
    const descSelect = document.querySelector('[name=qt_desc_'+idx+']');
    const stId = parseInt(typeSelect.value);
    if (!stId) return;
    const data = window.__quoteData;
    const matching = data.descriptions.filter(d => d.service_type_id === stId);
    descSelect.innerHTML = '<option value="">— Descripción —</option>' + matching.map(d =>
        '<option value="'+d.id+'" data-text="'+esc(d.description_text)+'">'+esc(d.name)+'</option>'
    ).join('');
    // Get default unit price
    const st = data.serviceTypes.find(s => s.id === stId);
    if (st && st.default_price && !document.querySelector('[name=qt_price_'+idx+']').value) {
        document.querySelector('[name=qt_price_'+idx+']').value = st.default_price;
        recalcQuoteLine(idx);
    }
};

window.onQuoteDescChange = function(idx) {
    const select = document.querySelector('[name=qt_desc_'+idx+']');
    const textarea = document.querySelector('[name=qt_text_'+idx+']');
    const opt = select.options[select.selectedIndex];
    if (opt && opt.dataset.text) {
        textarea.value = opt.dataset.text;
    }
};

window.recalcQuoteLine = function(idx) {
    const qty = parseFloat(document.querySelector('[name=qt_qty_'+idx+']').value) || 0;
    const price = parseFloat(document.querySelector('[name=qt_price_'+idx+']').value) || 0;
    const total = qty * price;
    document.getElementById('qt_total_'+idx).textContent = 'S/ '+total.toFixed(2);
    recalcQuoteTotals();
};

function recalcQuoteTotals() {
    const totals = document.querySelectorAll('.qt-line-total');
    let subtotal = 0;
    totals.forEach(el => {
        const val = parseFloat(el.textContent.replace('S/ ','')) || 0;
        subtotal += val;
    });
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    const subEl = document.getElementById('qSubtotal');
    const igvEl = document.getElementById('qIgv');
    const totEl = document.getElementById('qTotal');
    if (subEl) subEl.textContent = 'S/ '+subtotal.toFixed(2);
    if (igvEl) igvEl.textContent = 'S/ '+igv.toFixed(2);
    if (totEl) totEl.textContent = 'S/ '+total.toFixed(2);
}

window.addQuoteLine = function() {
    syncQuoteItemsFromDOM();
    const data = window.__quoteData;
    data.items.push({ id: null, service_type_id: '', description_id: '', description_text: '', quantity: 1, unit_price: 0 });
    renderQuoteLines(data.items, data.serviceTypes, data.descriptions);
    recalcQuoteTotals();
};

window.removeQuoteLine = function(idx) {
    syncQuoteItemsFromDOM();
    const data = window.__quoteData;
    if (!data.deletedItemIds) data.deletedItemIds = [];
    const removed = data.items.splice(idx, 1)[0];
    if (removed && removed.id) {
        data.deletedItemIds.push(removed.id);
    }
    renderQuoteLines(data.items, data.serviceTypes, data.descriptions);
    recalcQuoteTotals();
};

window.generateIALine = async function(idx) {
    const typeSelect = document.querySelector('[name=qt_type_'+idx+']');
    const textarea = document.querySelector('[name=qt_text_'+idx+']');
    const stName = typeSelect.options[typeSelect.selectedIndex]?.text || 'Servicio';
    const clientSelect = document.querySelector('[name=client_id]');
    const clientName = clientSelect.options[clientSelect.selectedIndex]?.text || 'Cliente';
    const areaText = prompt('Áreas a tratar (ej: almacén, patio, SSHH):') || '';
    showToast('Generando descripción con IA...');
    const res = await api(eel.generate_description_ia, stName, clientName, areaText, '');
    if (res && res.ok) {
        textarea.value = res.text;
        showToast('Descripción generada');
    } else {
        showToast('Error: ' + (res?.error || 'No se pudo conectar a LLaMA'));
    }
};

async function saveQuote(existing) {
    const form = document.getElementById('quoteForm');
    if (!form) return;
    const f = new FormData(form);
    const clientId = parseInt(f.get('client_id'));
    if (!clientId) { showToast('Selecciona una empresa'); return; }

    syncQuoteItemsFromDOM();
    const qData = window.__quoteData;
    const items = qData.items.filter(it => it.service_type_id);

    const totals = recalcQuoteTotalsFromItems(items);
    const data = {
        client_id: clientId,
        client_site_id: f.get('client_site_id') ? parseInt(f.get('client_site_id')) : null,
        issue_date: f.get('issue_date'),
        valid_until: f.get('valid_until'),
        payment_terms: f.get('payment_terms'),
        subtotal: totals.subtotal,
        igv: totals.igv,
        total: totals.total,
        status: f.get('status'),
    };

    let res;
    if (qData.quoteId) {
        res = await api(eel.update_quote, qData.quoteId, data);
    } else {
        res = await api(eel.create_quote, data);
    }
    if (!res || !res.ok) { showToast('Error al guardar'); return; }

    const quoteId = qData.quoteId || res.id;

    // Save items: delete old items and re-add
    if (qData.quoteId) {
        const oldQuote = await api(eel.get_quote, qData.quoteId);
        if (oldQuote && oldQuote.items) {
            for (const oldItem of oldQuote.items) {
                if (oldItem.id) await api(eel.delete_quote_item, oldItem.id);
            }
        }
    }
    for (const item of items) {
        await api(eel.add_quote_item, quoteId, item);
    }
    await api(eel.recalc_quote_totals, quoteId);

    showToast(existing ? 'Actualizada' : 'Creada: ' + (res.number || ''));
    closeModal();
    navigate('work');
}

function recalcQuoteTotalsFromItems(items) {
    let subtotal = 0;
    items.forEach(it => { subtotal += (it.quantity || 1) * (it.unit_price || 0); });
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    return { subtotal: Math.round(subtotal * 100) / 100, igv: Math.round(igv * 100) / 100, total: Math.round(total * 100) / 100 };
}

async function deleteQuote(id) {
    if (!confirm('¿Eliminar esta cotización?')) return;
    const res = await api(eel.delete_quote, id);
    if (res && res.ok) { showToast('Eliminada'); navigate('work'); }
}

async function downloadQuoteWord(id) {
    showToast('Generando Word...');
    const res = await api(eel.generate_quote_word, id);
    if (!res || !res.ok) { showToast('Error: ' + (res?.error || '')); return; }
    const a = document.createElement('a');
    a.href = 'data:' + (res.file_type || 'application/octet-stream') + ';base64,' + res.file_b64;
    a.download = res.file_name || 'cotizacion.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Word descargado');
}

// --- WORK EMPLOYEES ---
async function renderWorkEmployees(el) {
    const employees = await api(eel.get_employees, false) || [];
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn btn-primary" onclick="showEmployeeForm()">+ Nuevo empleado</button></div>`;
    if (employees.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">👤</div><h3>Sin empleados</h3></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Documento</th><th>Cargo</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead><tbody>';
        for (const e of employees) {
            html += `<tr><td><strong>${esc(e.full_name)}</strong></td><td>${esc(e.document_number || '-')}</td>
                <td>${esc(e.position || '-')}</td><td>${esc(e.phone || '-')}</td>
                <td><span class="tag ${e.is_active ? 'tag-sage' : 'tag-rose'}">${e.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td style="text-align:right">
                    <button class="btn btn-ghost btn-sm" onclick="showEmployeeForm(${e.id})">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="toggleEmployee(${e.id})">${e.is_active ? '🚫' : '✓'}</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteEmployee(${e.id})">✕</button>
                </td></tr>`;
        }
        html += '</tbody></table></div>';
    }
    el.innerHTML = html;
}

function showEmployeeForm(id) {
    if (id) {
        api(eel.get_employees, false).then(emps => {
            const e = emps.find(x => x.id === id);
            if (e) showEmployeeModal(e);
        });
    } else showEmployeeModal(null);
}

function showEmployeeModal(emp) {
    const html = `<form id="modalForm">
        <div class="form-group"><label>Nombre completo *</label><input class="form-control" name="full_name" value="${esc(emp ? emp.full_name : '')}"></div>
        <div class="form-row"><div class="form-group"><label>DNI</label><input class="form-control" name="document_number" value="${esc(emp ? emp.document_number : '')}"></div>
        <div class="form-group"><label>Teléfono</label><input class="form-control" name="phone" value="${esc(emp ? emp.phone : '')}"></div></div>
        <div class="form-group"><label>Email</label><input class="form-control" name="email" value="${esc(emp ? emp.email : '')}"></div>
        <div class="form-group"><label>Cargo</label><input class="form-control" name="position" value="${esc(emp ? emp.position : '')}"></div>
    </form>`;
    openModal(emp ? 'Editar empleado' : 'Nuevo empleado', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = { full_name: f.get('full_name'), document_number: f.get('document_number'),
            phone: f.get('phone'), email: f.get('email'), position: f.get('position') };
        if (!data.full_name) { showToast('El nombre es obligatorio'); return; }
        const res = emp ? await api(eel.update_employee, emp.id, data) : await api(eel.create_employee, data);
        if (res && res.ok) { showToast(emp ? 'Actualizado' : 'Creado'); closeModal(); navigate('work'); }
        else showToast('Error');
    };
}

async function toggleEmployee(id) {
    await api(eel.toggle_employee_active, id);
    navigate('work');
}

async function deleteEmployee(id) {
    if (!confirm('¿Eliminar este empleado?')) return;
    await api(eel.delete_employee, id);
    showToast('Eliminado');
    navigate('work');
}

// --- WORK DOCUMENTS ---
async function renderWorkDocuments(el) {
    const docs = await api(eel.get_employee_documents) || [];
    const employees = await api(eel.get_employees, true) || [];
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <button class="btn btn-primary" onclick="showDocForm(null)">+ Nuevo documento</button>
    </div><div id="docData" data-employees='${esc(JSON.stringify(employees))}'></div>`;
    if (docs.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">📄</div><h3>Sin documentos</h3></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Empleado</th><th>Tipo</th><th>N° Doc</th><th>Vencimiento</th><th>Estado</th><th>Archivo</th><th></th></tr></thead><tbody>';
        for (const d of docs) {
            const du = daysUntil(d.expiry_date);
            const cls = du !== null && du < 0 ? 'tag-rose' : du !== null && du <= 30 ? 'tag-gold' : 'tag-sage';
            const label = du !== null && du < 0 ? 'Vencido' : du !== null ? `${du}d` : '-';
            let fileIcon = '-';
            if (d.external_url) {
                fileIcon = `<a href="${esc(d.external_url)}" target="_blank" rel="noopener noreferrer" class="tag tag-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:3px;font-size:0.75rem" title="Abrir en OneDrive / Nube">☁️ OneDrive ↗</a>`;
            } else if (d.file_name) {
                fileIcon = '<span style="cursor:pointer" onclick="downloadDocFile('+d.id+')" title="'+esc(d.file_name)+'">📎</span>';
            }
            html += `<tr><td><strong>${esc(d.full_name)}</strong></td><td>${esc(d.doc_type)}</td>
                <td>${esc(d.doc_number || '-')}</td><td>${fmtDate(d.expiry_date)}</td>
                <td><span class="tag ${cls}">${label}</span></td>
                <td>${fileIcon}</td>
                <td style="text-align:right">
                    <button class="btn btn-ghost btn-sm" onclick="showDocForm(${d.id})">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteDoc(${d.id})">✕</button>
                </td></tr>`;
        }
        html += '</tbody></table></div>';
    }
    el.innerHTML = html;
}

const DOC_TYPES = ['SCTR','MATPEL','EMO','Inducción','Licencia','Certificado','Otro'];

function showDocForm(id) {
    if (id) {
        api(eel.get_employee_documents).then(docs => {
            const d = docs.find(x => x.id === id);
            if (d) showDocModal(d);
        });
    } else {
        const empDiv = document.getElementById('docData');
        const employees = empDiv ? JSON.parse(empDiv.dataset.employees || '[]') : [];
        showDocModal(null, employees);
    }
}

function showDocModal(doc, employees) {
    if (!employees) {
        api(eel.get_employees, true).then(emps => showDocModal(doc, emps || []));
        return;
    }
    const empOpts = employees.map(e =>
        `<option value="${e.id}" ${doc && doc.employee_id === e.id ? 'selected' : ''}>${esc(e.full_name)}</option>`
    ).join('');
    const typeOpts = DOC_TYPES.map(t =>
        `<option value="${t}" ${doc && doc.doc_type === t ? 'selected' : ''}>${t}</option>`
    ).join('');
    const hasFile = doc && doc.file_name;
    const html = `<form id="modalForm">
        <div class="form-group"><label>Empleado *</label><select class="form-control" name="employee_id">${empOpts}</select></div>
        <div class="form-group"><label>Tipo *</label><select class="form-control" name="doc_type">${typeOpts}</select></div>
        <div class="form-group"><label>N° Documento</label><input class="form-control" name="doc_number" value="${esc(doc ? doc.doc_number : '')}"></div>
        <div class="form-row"><div class="form-group"><label>Emisión</label><input type="date" class="form-control" name="issue_date" value="${doc ? doc.issue_date : ''}"></div>
        <div class="form-group"><label>Vencimiento *</label><input type="date" class="form-control" name="expiry_date" value="${doc ? doc.expiry_date : ''}"></div></div>
        <div class="form-group"><label>Enlace OneDrive / Nube</label>
            <input type="url" class="form-control" name="external_url" placeholder="https://1drv.ms/... (vínculo compartido de OneDrive)" value="${esc(doc ? doc.external_url || '' : '')}">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px">💡 Pega el enlace de OneDrive para abrir el PDF original sin ocupar espacio en la base de datos.</div>
        </div>
        <div class="form-group"><label>Archivo Local (opcional)</label>
            <input type="file" class="form-control" name="file_input" id="docFileInput" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
            ${hasFile ? '<div style="margin-top:4px;font-size:0.8rem;color:#888">Archivo actual: '+esc(doc.file_name)+'</div>' : ''}
        </div>
        <div class="form-group"><label>Notas</label><textarea class="form-control" name="notes">${esc(doc ? doc.notes : '')}</textarea></div>
    </form>`;
    openModal(doc ? 'Editar documento' : 'Nuevo documento', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const extUrl = f.get('external_url') ? f.get('external_url').trim() : null;
        const data = { employee_id: parseInt(f.get('employee_id')), doc_type: f.get('doc_type'),
            doc_number: f.get('doc_number'), issue_date: f.get('issue_date'),
            expiry_date: f.get('expiry_date'), notes: f.get('notes'), external_url: extUrl };
        if (!data.employee_id || !data.doc_type) { showToast('Completa los campos obligatorios'); return; }
        let res = doc ? await api(eel.update_employee_document, doc.id, data) : await api(eel.create_employee_document, data);
        if (!res || !res.ok) { showToast('Error'); return; }
        const newId = doc ? doc.id : res.id;
        // Upload file if selected
        const fileInput = document.getElementById('docFileInput');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async function(e2) {
                const b64 = e2.target.result.split(',')[1];
                await api(eel.upload_employee_document_file, newId, b64, file.name, file.type);
                showToast(doc ? 'Actualizado' : 'Creado'); closeModal(); navigate('work');
            };
            reader.readAsDataURL(file);
        } else {
            showToast(doc ? 'Actualizado' : 'Creado'); closeModal(); navigate('work');
        }
    };
}

async function deleteDoc(id) {
    if (!confirm('¿Eliminar este documento?')) return;
    await api(eel.delete_employee_document, id);
    showToast('Eliminado');
    navigate('work');
}

async function downloadDocFile(id) {
    const res = await api(eel.get_employee_document_file, id);
    if (!res || !res.ok) { showToast('Sin archivo'); return; }
    const a = document.createElement('a');
    a.href = 'data:' + (res.file_type || 'application/octet-stream') + ';base64,' + res.file_b64;
    a.download = res.file_name || 'documento';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// --- WORK REIMBURSEMENTS ---
async function renderWorkReimbursements(el) {
    const reimbs = await api(eel.get_reimbursements) || [];
    const employees = await api(eel.get_employees, true) || [];
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn btn-primary" onclick="showReimbForm()">+ Nuevo reembolso</button></div>`;
    html += `<div id="reimbData" data-employees='${esc(JSON.stringify(employees))}'></div>`;
    if (reimbs.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">💰</div><h3>Sin reembolsos</h3></div>';
    } else {
        const stMap = { pending: {label:'Pendiente',cls:'tag-gold'}, approved: {label:'Aprobado',cls:'tag-primary'}, paid: {label:'Pagado',cls:'tag-sage'} };
        html += '<div class="table-wrap"><table><thead><tr><th>Empleado</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>';
        for (const r of reimbs) {
            const s = stMap[r.status] || {label:r.status,cls:'tag-primary'};
            html += `<tr><td><strong>${esc(r.full_name)}</strong></td><td>${esc(r.concept || '-')}</td>
                <td>S/ ${(r.amount || 0).toFixed(2)}</td><td>${fmtDate(r.date)}</td>
                <td><span class="tag ${s.cls}">${s.label}</span></td>
                <td style="text-align:right">
                    <button class="btn btn-ghost btn-sm" onclick="showReimbForm(${r.id})">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteReimb(${r.id})">✕</button>
                </td></tr>`;
        }
        html += '</tbody></table></div>';
    }
    el.innerHTML = html;
}

function showReimbForm(id) {
    if (id) {
        api(eel.get_reimbursements).then(reimbs => {
            const r = reimbs.find(x => x.id === id);
            if (r) showReimbModal(r);
        });
    } else showReimbModal(null);
}

function showReimbModal(reimb) {
    api(eel.get_employees, true).then(employees => {
        employees = employees || [];
        const empOpts = employees.map(e =>
            `<option value="${e.id}" ${reimb && reimb.employee_id === e.id ? 'selected' : ''}>${esc(e.full_name)}</option>`
        ).join('');
        const html = `<form id="modalForm">
            <div class="form-group"><label>Empleado *</label><select class="form-control" name="employee_id">${empOpts}</select></div>
            <div class="form-group"><label>Concepto</label><input class="form-control" name="concept" value="${esc(reimb ? reimb.concept : '')}"></div>
            <div class="form-row"><div class="form-group"><label>Monto *</label><input type="number" step="0.01" class="form-control" name="amount" value="${reimb ? reimb.amount : ''}"></div>
            <div class="form-group"><label>Fecha</label><input type="date" class="form-control" name="date" value="${reimb ? reimb.date : todayStr()}"></div></div>
            ${reimb ? `<div class="form-group"><label>Estado</label><select class="form-control" name="status">
                <option value="pending" ${reimb.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                <option value="approved" ${reimb.status === 'approved' ? 'selected' : ''}>Aprobado</option>
                <option value="paid" ${reimb.status === 'paid' ? 'selected' : ''}>Pagado</option>
            </select></div>` : ''}
        </form>`;
        openModal(reimb ? 'Editar reembolso' : 'Nuevo reembolso', html);
        document.getElementById('modalSave').onclick = async () => {
            const f = new FormData(document.getElementById('modalForm'));
            const data = { employee_id: parseInt(f.get('employee_id')), concept: f.get('concept'),
                amount: parseFloat(f.get('amount')) || 0, date: f.get('date') };
            if (reimb) data.status = f.get('status');
            if (!data.employee_id || !data.amount) { showToast('Completa los campos'); return; }
            const res = reimb ? await api(eel.update_reimbursement, reimb.id, data) : await api(eel.create_reimbursement, data);
            if (res && res.ok) { showToast(reimb ? 'Actualizado' : 'Creado'); closeModal(); navigate('work'); }
            else showToast('Error');
        };
    });
}

async function deleteReimb(id) {
    if (!confirm('¿Eliminar este reembolso?')) return;
    await api(eel.delete_reimbursement, id);
    showToast('Eliminado');
    navigate('work');
}

// --- WORK OVERTIME ---
async function renderWorkOvertime(el) {
    const overtime = await api(eel.get_overtime) || [];
    const employees = await api(eel.get_employees, true) || [];
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:14px"><button class="btn btn-primary" onclick="showOvertimeForm()">+ Nuevo día extra</button></div>`;
    html += `<div id="otData" data-employees='${esc(JSON.stringify(employees))}'></div>`;
    if (overtime.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">⏰</div><h3>Sin días extra</h3></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Empleado</th><th>Fecha</th><th>Días</th><th>Motivo</th><th>Estado</th><th></th></tr></thead><tbody>';
        for (const o of overtime) {
            html += `<tr><td><strong>${esc(o.full_name)}</strong></td><td>${fmtDate(o.date)}</td>
                <td>${o.days}</td><td>${esc(o.reason || '-')}</td>
                <td><span class="tag ${o.approved ? 'tag-sage' : 'tag-gold'}">${o.approved ? 'Aprobado' : 'Pendiente'}</span></td>
                <td style="text-align:right">
                    <button class="btn btn-ghost btn-sm" onclick="showOvertimeForm(${o.id})">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteOvertime(${o.id})">✕</button>
                </td></tr>`;
        }
        html += '</tbody></table></div>';
    }
    el.innerHTML = html;
}

function showOvertimeForm(id) {
    if (id) {
        api(eel.get_overtime).then(ovs => {
            const o = ovs.find(x => x.id === id);
            if (o) showOvertimeModal(o);
        });
    } else showOvertimeModal(null);
}

function showOvertimeModal(overtime) {
    api(eel.get_employees, true).then(employees => {
        employees = employees || [];
        const empOpts = employees.map(e =>
            `<option value="${e.id}" ${overtime && overtime.employee_id === e.id ? 'selected' : ''}>${esc(e.full_name)}</option>`
        ).join('');
        const html = `<form id="modalForm">
            <div class="form-group"><label>Empleado *</label><select class="form-control" name="employee_id">${empOpts}</select></div>
            <div class="form-row"><div class="form-group"><label>Fecha</label><input type="date" class="form-control" name="date" value="${overtime ? overtime.date : todayStr()}"></div>
            <div class="form-group"><label>Días *</label><input type="number" step="0.5" class="form-control" name="days" value="${overtime ? overtime.days : '1'}"></div></div>
            <div class="form-group"><label>Motivo</label><input class="form-control" name="reason" value="${esc(overtime ? overtime.reason : '')}"></div>
            ${overtime ? `<div class="form-group"><label><input type="checkbox" name="approved" value="1" ${overtime.approved ? 'checked' : ''}> Aprobado</label></div>` : ''}
        </form>`;
        openModal(overtime ? 'Editar día extra' : 'Nuevo día extra', html);
        document.getElementById('modalSave').onclick = async () => {
            const f = new FormData(document.getElementById('modalForm'));
            const data = { employee_id: parseInt(f.get('employee_id')), date: f.get('date'),
                days: parseFloat(f.get('days')) || 0, reason: f.get('reason') };
            if (overtime) data.approved = f.get('approved') ? 1 : 0;
            if (!data.employee_id || !data.days) { showToast('Completa los campos'); return; }
            const res = overtime ? await api(eel.update_overtime, overtime.id, data) : await api(eel.create_overtime, data);
            if (res && res.ok) { showToast(overtime ? 'Actualizado' : 'Creado'); closeModal(); navigate('work'); }
            else showToast('Error');
        };
    });
}

async function deleteOvertime(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await api(eel.delete_overtime, id);
    showToast('Eliminado');
    navigate('work');
}

// --- WORK LINDLEY ---
async function renderWorkLindley(el) {
    const contacts = await api(eel.get_lindley_contacts) || [];
    const forms = await api(eel.get_lindley_forms) || [];
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const nextMonth = curMonth === 12 ? 1 : curMonth + 1;
    const nextYear = curMonth === 12 ? curYear + 1 : curYear;
    const valMonth = state.lindleyMonth || nextMonth;
    const valYear = state.lindleyYear || nextYear;
    const validation = await api(eel.get_lindley_validation, valYear, valMonth) || { employees: [] };
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];

    const monthOpts = meses.map((m, i) => `<option value="${i+1}" ${valMonth === i+1 ? 'selected' : ''}>${m}</option>`).join('');

    let html = `<div class="card" style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div>
                <div class="card-title" style="margin-bottom:2px">🚦 Semáforo de Habilitación de Técnicos para Planta</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">Valida que EMO, MATPEL e Inducción estén vigentes durante todo el mes programado</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
                <select class="form-control" style="width:130px;padding:6px 10px;font-size:0.8rem" onchange="changeLindleyValPeriod(this.value, ${valYear})">${monthOpts}</select>
                <input type="number" class="form-control" style="width:85px;padding:6px 10px;font-size:0.8rem" value="${valYear}" onchange="changeLindleyValPeriod(${valMonth}, this.value)">
            </div>
        </div>`;

    if (!validation.employees || validation.employees.length === 0) {
        html += '<p style="color:var(--text-muted);font-size:0.85rem">Sin técnicos activos</p>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Técnico</th><th>DNI</th><th>EMO</th><th>MATPEL</th><th>Inducción</th><th>Estado ingreso</th></tr></thead><tbody>';
        for (const emp of validation.employees) {
            const renderDocBadge = (d) => {
                if (!d || d.status === 'missing') return '<span class="tag tag-rose">Falta</span>';
                if (d.status === 'expired') return `<span class="tag tag-rose" title="${esc(d.label)}">Vencido (${fmtDate(d.expiry_date)})</span>`;
                if (d.status === 'expiring_in_month') return `<span class="tag tag-gold" title="${esc(d.label)}">⚠️ Vence ${fmtDate(d.expiry_date)}</span>`;
                return `<span class="tag tag-sage">${d.expiry_date ? fmtDate(d.expiry_date) : 'Vigente'}</span>`;
            };
            const overallBadge = emp.overall === 'ok'
                ? '<span class="tag tag-sage">✅ Habilitado</span>'
                : emp.overall === 'warning'
                ? '<span class="tag tag-gold">⚠️ Se vence en el mes</span>'
                : '<span class="tag tag-rose">🚫 No habilitado</span>';
            html += `<tr>
                <td><strong>${esc(emp.full_name)}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${esc(emp.position || '')}</span></td>
                <td>${esc(emp.document_number || '-')}</td>
                <td>${renderDocBadge(emp.docs['EMO'])}</td>
                <td>${renderDocBadge(emp.docs['MATPEL'])}</td>
                <td>${renderDocBadge(emp.docs['Inducción'])}</td>
                <td>${overallBadge}</td>
            </tr>`;
        }
        html += '</tbody></table></div>';
    }
    html += `</div>`;

    html += `<div class="two-col">
        <div class="card">
            <div class="card-title">Contactos por planta</div>
            <div style="margin-bottom:12px"><button class="btn btn-primary btn-sm" onclick="showContactForm()">+ Contacto</button></div>`;
    if (contacts.length === 0) {
        html += '<p style="color:var(--text-muted);font-size:0.85rem">Sin contactos</p>';
    } else {
        for (const c of contacts) {
            html += `<div class="contact-card" style="margin-bottom:8px">
                <div class="contact-avatar">🏭</div>
                <div class="contact-info">
                    <div class="contact-name">${esc(c.plant)}</div>
                    <div class="contact-detail">${esc(c.contact_name || '')} · ${esc(c.email || '')}${c.phone ? ' · '+esc(c.phone) : ''}</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="showContactForm(${c.id})">✎</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteContact(${c.id})">✕</button>
            </div>`;
        }
    }
    html += `</div>
        <div>
            <div class="card" style="margin-bottom:14px">
                <div class="card-title">Plan de trabajo mensual</div>
                <p style="margin-bottom:12px;font-size:0.85rem;color:var(--text-muted)">Programación para ${meses[nextMonth-1]} ${nextYear}</p>
                <button class="btn btn-primary" onclick="completeForm(${nextMonth}, ${nextYear})">Marcar ${meses[nextMonth-1]} completado</button>
            </div>
            <div class="card"><div class="card-title">Historial</div>`;
    if (forms.length === 0) {
        html += '<p style="color:var(--text-muted);font-size:0.85rem">Ninguno aún</p>';
    } else {
        for (const f of forms) {
            html += `<div class="calendar-event"><div class="event-dot ${f.status === 'completed' ? 'task' : 'doc'}"></div>
                <div class="event-text">${meses[f.month-1]} ${f.year} · <span style="color:var(--text-muted)">${f.status === 'completed' ? 'Completado' : 'Pendiente'}</span></div>
            </div>`;
        }
    }
    html += '</div></div></div>';
    el.innerHTML = html;
}

function changeLindleyValPeriod(month, year) {
    state.lindleyMonth = parseInt(month);
    state.lindleyYear = parseInt(year);
    navigate('work');
}

function showContactForm(id) {
    if (id) {
        api(eel.get_lindley_contacts).then(contacts => {
            const c = contacts.find(x => x.id === id);
            if (c) showContactModal(c);
        });
    } else showContactModal(null);
}

function showContactModal(contact) {
    const html = `<form id="modalForm">
        <div class="form-group"><label>Planta *</label><input class="form-control" name="plant" value="${esc(contact ? contact.plant : '')}"></div>
        <div class="form-group"><label>Nombre contacto</label><input class="form-control" name="contact_name" value="${esc(contact ? contact.contact_name : '')}"></div>
        <div class="form-row"><div class="form-group"><label>Email</label><input class="form-control" name="email" value="${esc(contact ? contact.email : '')}"></div>
        <div class="form-group"><label>Teléfono</label><input class="form-control" name="phone" value="${esc(contact ? contact.phone : '')}"></div></div>
        <div class="form-group"><label>Notas</label><textarea class="form-control" name="notes">${esc(contact ? contact.notes : '')}</textarea></div>
    </form>`;
    openModal(contact ? 'Editar contacto' : 'Nuevo contacto', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = { plant: f.get('plant'), contact_name: f.get('contact_name'),
            email: f.get('email'), phone: f.get('phone'), notes: f.get('notes') };
        if (!data.plant) { showToast('La planta es obligatoria'); return; }
        const res = contact ? await api(eel.update_lindley_contact, contact.id, data) : await api(eel.create_lindley_contact, data);
        if (res && res.ok) { showToast(contact ? 'Actualizado' : 'Creado'); closeModal(); navigate('work'); }
        else showToast('Error');
    };
}

async function deleteContact(id) {
    if (!confirm('¿Eliminar este contacto?')) return;
    await api(eel.delete_lindley_contact, id);
    showToast('Eliminado');
    navigate('work');
}

async function completeForm(month, year) {
    const res = await api(eel.create_lindley_form, { month, year, status: 'completed' });
    if (res && res.ok) { showToast('¡Plan registrado!'); navigate('work'); }
    else showToast('Error');
}

// --- WORK SERVICES ---
async function renderWorkServices(el) {
    const records = await api(eel.get_service_records) || [];
    const employees = await api(eel.get_employees) || [];
    const sites = await api(eel.get_client_sites) || [];

    let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div><span class="tag tag-primary" style="font-size:0.85rem">${records.filter(r=>r.status==='active').length} activos</span></div>
        <button class="btn btn-primary" onclick="showClockIn(${esc(JSON.stringify(employees))}, ${esc(JSON.stringify(sites))})">⏱ Marcar entrada</button>
    </div>`;

    if (records.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">📋</div><h3>Sin registros</h3><p>Marca la entrada del día</p></div>';
    } else {
        html += '<div class="table-wrap" style="max-height:500px;overflow-y:auto"><table><thead><tr>' +
            '<th>Fecha</th><th>Técnico</th><th>Cliente</th><th>Entrada</th><th>Salida</th><th>Hrs</th><th>Estado</th><th></th></tr></thead><tbody>';
        for (const r of records) {
            const isActive = r.status === 'active';
            const stl = isActive ? ' style="background:var(--primary-light)"' : '';
            const badge = isActive ? '<span class="task-badge due-soon">Activo</span>' : '<span class="tag tag-sage" style="font-size:0.75rem">Completado</span>';
            const evIcon = r.evidencia ? '📸' : '';
            html += `<tr${stl}>
                <td>${fmtDate(r.fecha)}</td>
                <td>${esc(r.employee_name || '')}</td>
                <td>${esc(r.nombre_cliente || (r.client_site_id ? esc(r.nombre_cliente || '') : '-'))}</td>
                <td>${r.hora_ingreso || '-'}</td>
                <td>${r.hora_salida || '-'}</td>
                <td>${r.horas_trabajadas || (isActive ? '\u2014' : 0)}</td>
                <td>${badge} ${evIcon}</td>
                <td style="text-align:right;white-space:nowrap">
                    ${isActive ? '<button class="btn btn-sm btn-primary" onclick="showClockOut('+r.id+','+esc(JSON.stringify(sites))+')">Marcar salida</button>' : ''}
                    <button class="btn btn-ghost btn-sm" onclick="deleteServiceRecord(${r.id})">✕</button>
                </td></tr>`;
        }
        html += '</tbody></table></div>';
    }
    el.innerHTML = html;
}

function showClockIn(employees, sites) {
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const empOpts = employees.map(e => '<option value="'+e.id+'">'+esc(e.full_name)+'</option>').join('');
    const siteOpts = sites.map(s => '<option value="'+s.id+'">'+esc(s.nombre_cliente)+' - '+esc(s.sede_cliente)+' ('+s.codigo_cliente_sede+')</option>').join('');

    const html = '<form id="modalForm">'+
        '<div class="form-group"><label>Tecnico *</label><select class="form-control" name="employee_id">'+empOpts+'</select></div>'+
        '<div class="form-row">'+
            '<div class="form-group"><label>Fecha</label><input type="date" class="form-control" name="fecha" value="'+todayStr()+'"></div>'+
            '<div class="form-group"><label>Hora entrada</label><input type="time" class="form-control" name="hora_ingreso" value="'+timeStr+'"></div>'+
        '</div>'+
        '<div class="form-group"><label>Cliente/Sede (opcional)</label><select class="form-control" name="client_site_id"><option value="">\u2014 Sin asignar \u2014</option>'+siteOpts+'</select></div>'+
    '</form>';
    openModal('Marcar entrada', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        if (!f.get('employee_id') || !f.get('fecha') || !f.get('hora_ingreso')) { showToast('Completa todos los campos'); return; }
        const res = await api(eel.clock_in, {
            employee_id: parseInt(f.get('employee_id')),
            fecha: f.get('fecha'),
            hora_ingreso: f.get('hora_ingreso'),
            client_site_id: f.get('client_site_id') ? parseInt(f.get('client_site_id')) : null,
        });
        if (res && res.ok) { showToast('Entrada registrada'); closeModal(); navigate('work'); }
        else showToast('Error');
    };
}

function showClockOut(recordId, sites) {
    api(eel.get_service_records).then(records => {
        const r = records.find(x => x.id === recordId);
        if (!r) return;
        const now = new Date();
        const timeStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
        const siteOpts = sites.map(s => '<option value="'+s.id+'"'+(r.client_site_id === s.id ? ' selected' : '')+'>'+esc(s.nombre_cliente)+' - '+esc(s.sede_cliente)+' ('+s.codigo_cliente_sede+')</option>').join('');

        const html = '<form id="modalForm">'+
            '<div style="margin-bottom:14px;padding:10px;background:var(--bg-lavender);border-radius:8px">'+
                '<strong>'+esc(r.employee_name)+'</strong> \u00b7 Entrada: '+r.hora_ingreso+
            '</div>'+
            '<div class="form-row">'+
                '<div class="form-group"><label>Fecha</label><input type="date" class="form-control" name="fecha" value="'+r.fecha+'"></div>'+
                '<div class="form-group"><label>Hora entrada</label><input type="time" class="form-control" name="hora_ingreso" value="'+(r.hora_ingreso||'')+'"></div>'+
            '</div>'+
            '<div class="form-row">'+
                '<div class="form-group"><label>Hora salida *</label><input type="time" class="form-control" name="hora_salida" value="'+(r.hora_salida||timeStr)+'"></div>'+
                '<div class="form-group"><label>Traslado (min)</label><input type="number" class="form-control" name="traslado_min" value="'+(r.traslado_min||0)+'" min="0" step="5"></div>'+
            '</div>'+
            '<div class="form-group"><label>Cliente/Sede</label><select class="form-control" name="client_site_id"><option value="">\u2014 Sin asignar \u2014</option>'+siteOpts+'</select></div>'+
            '<div class="form-group"><label>Evidencia</label><select class="form-control" name="evidencia"><option value="1">Si</option><option value="0" selected>No</option></select></div>'+
            '<div class="form-group"><label>Observaciones</label><textarea class="form-control" name="observaciones"></textarea></div>'+
        '</form>';
        openModal('Completar servicio', html);
        document.getElementById('modalSave').onclick = async () => {
            const f = new FormData(document.getElementById('modalForm'));
            if (!f.get('hora_salida')) { showToast('La hora de salida es obligatoria'); return; }
            const res = await api(eel.complete_service_record, recordId, {
                hora_ingreso: f.get('hora_ingreso'),
                hora_salida: f.get('hora_salida'),
                traslado_min: parseFloat(f.get('traslado_min')) || 0,
                client_site_id: f.get('client_site_id') ? parseInt(f.get('client_site_id')) : null,
                evidencia: f.get('evidencia') === '1',
                observaciones: f.get('observaciones'),
            });
            if (res && res.ok) { showToast('Servicio completado \u00b7 '+res.horas_trabajadas+'h'); closeModal(); navigate('work'); }
            else showToast('Error');
        };
    });
}

async function deleteServiceRecord(id) {
    if (!confirm('\u00bfEliminar este registro?')) return;
    const res = await api(eel.delete_service_record, id);
    if (res && res.ok) { showToast('Eliminado'); navigate('work'); }
}

// --- WORK DAILY CONTROL ---
async function renderWorkDailyControl(el) {
    const today = todayStr();
    const [updatedControl, employees] = await Promise.all([
        api(eel.get_daily_control, today),
        api(eel.get_employees)
    ]);

    let html = '<div class="card"><div class="card-title">Control del dia \u00b7 '+fmtDate(today)+'</div>';

    if (employees.length === 0) {
        html += '<div class="empty-state"><p>Sin empleados activos</p></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>Tecnico</th><th>Sede</th><th>\u00bfAsistio?</th><th>Horas</th><th>Evidencia</th><th>Pendientes</th></tr></thead><tbody>';
        for (const emp of employees) {
            const ctrl = updatedControl.find(c => c.employee_id === emp.id);
            const checked = ctrl ? ctrl.se_presento : false;
            html += '<tr>'+
                '<td>'+esc(emp.full_name)+'</td>'+
                '<td>'+esc(emp.sede_operativa||'-')+'</td>'+
                '<td><input type="checkbox" '+(checked?'checked':'')+' onchange="updateCtrlField('+emp.id+',\'se_presento\',this.checked)"></td>'+
                '<td><strong>'+(ctrl ? ctrl.horas_dia.toFixed(2) : '0.00')+'</strong> h</td>'+
                '<td><input type="checkbox" '+(ctrl && ctrl.evidencia_dia ? 'checked' : '')+' onchange="updateCtrlField('+emp.id+',\'evidencia_dia\',this.checked)"></td>'+
                '<td><input type="checkbox" '+(ctrl && ctrl.pendientes_sin_salida ? 'checked' : '')+' onchange="updateCtrlField('+emp.id+',\'pendientes_sin_salida\',this.checked)"></td>'+
            '</tr>';
        }
        html += '</tbody></table></div><div style="margin-top:6px;font-size:0.8rem;color:var(--text-muted)">\u23f1 Las horas se actualizan automaticamente al completar servicios</div>';
    }
    html += '</div>';

    // Weekly KPI summary
    html += '<div class="card" style="margin-top:14px"><div class="card-title">KPI Semanal</div>';
    const now = new Date();
    const weekRes = await api(eel.get_week_semana, localDateStr(now));
    const kpi = await api(eel.get_weekly_kpi, weekRes.semana, weekRes.año) || [];
    if (kpi.length === 0) {
        html += '<div class="empty-state"><p>Sin datos esta semana</p></div>';
    } else {
        html += '<div class="table-wrap"><table><thead><tr><th>#</th><th>Teecnico</th><th>Horas</th><th>Servicios</th><th>Evidencia</th><th>Score</th></tr></thead><tbody>';
        for (const k of kpi) {
            const cls = k.ranking <= 3 ? ' style="background:var(--bg-sage)"' : '';
            html += '<tr'+cls+'><td>'+k.ranking+'</td><td>'+esc(k.employee_name)+'</td><td>'+k.total_horas+'</td><td>'+k.servicios+'</td><td>'+k.evidencia_pct+'%</td><td><strong>'+k.score+'</strong></td></tr>';
        }
        html += '</tbody></table></div>';
    }
    html += '</div>';

    el.innerHTML = html;
}

async function updateCtrlField(employee_id, field, value) {
    const today = todayStr();
    const ctrl = (await api(eel.get_daily_control, today) || []).find(c => c.employee_id === employee_id);
    const emp = (await api(eel.get_employees)).find(e => e.id === employee_id);
    if (!ctrl) {
        await api(eel.sync_daily_control, today, employee_id);
    }
    const updatedCtrl = (await api(eel.get_daily_control, today) || []).find(c => c.employee_id === employee_id);
    if (updatedCtrl) {
        const data = {
            fecha_revision: today,
            sede_operativa: emp ? emp.sede_operativa : null,
            responsable: emp ? emp.responsable : null,
            se_presento: field === 'se_presento' ? value : updatedCtrl.se_presento,
            horas_dia: field === 'horas_dia' ? parseFloat(value) || 0 : updatedCtrl.horas_dia,
            evidencia_dia: field === 'evidencia_dia' ? value : updatedCtrl.evidencia_dia,
            pendientes_sin_salida: field === 'pendientes_sin_salida' ? value : updatedCtrl.pendientes_sin_salida,
            observaciones: updatedCtrl.observaciones || '',
        };
        const res = await api(eel.update_daily_control, updatedCtrl.id, data);
        if (!res || !res.ok) showToast('Error al guardar');
    }
}

// ===================== UNIVERSITY =====================

function getExamCountdown(dateStr) {
    if (!dateStr) return { text: '', cls: 'countdown-past' };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
        return { text: `Hace ${Math.abs(diffDays)}d`, cls: 'countdown-past', diffDays };
    }
    if (diffDays === 0) {
        return { text: '¡HOY!', cls: 'countdown-urgent', diffDays };
    }
    if (diffDays === 1) {
        return { text: 'Mañana', cls: 'countdown-urgent', diffDays };
    }
    if (diffDays <= 7) {
        return { text: `En ${diffDays} días`, cls: 'countdown-soon', diffDays };
    }
    if (diffDays <= 30) {
        const w = Math.round(diffDays / 7);
        return { text: `En ${w} sem${w !== 1 ? 's' : ''}`, cls: 'countdown-normal', diffDays };
    }
    const m = Math.round(diffDays / 30);
    return { text: `En ${m} mes${m !== 1 ? 'es' : ''}`, cls: 'countdown-normal', diffDays };
}

function parseProfessorEmails(profText) {
    if (!profText) return '';
    const parts = profText.split('/');
    return parts.map(p => {
        const trimmed = p.trim();
        const match = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (match) {
            const email = match[1];
            const name = trimmed.replace(email, '').replace(/[()<>]/g, '').trim() || email;
            return `<a href="mailto:${esc(email)}" class="tag tag-lavender" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px" title="Escribir correo a ${esc(email)}">✉️ ${esc(name)}</a>`;
        }
        return `<span style="color:var(--text)">${esc(trimmed)}</span>`;
    }).join(' <span style="color:var(--text-muted);opacity:0.6">/</span> ');
}

async function renderUniversity(el) {
    state.uniTab = state.uniTab || 'schedule';
    const [subjects, allExams, allAssignments, currStatus] = await Promise.all([
        api(eel.get_subjects) || [],
        api(eel.get_exams) || [],
        api(eel.get_assignments) || [],
        api(eel.get_curriculum_status) || {}
    ]);
    window.__uniSubjects = subjects;
    window.__uniExams = allExams;
    window.__uniAssignments = allAssignments;
    window.__curriculumStatus = currStatus;

    let html = `<div class="page-header">
        <div>
            <h1>Universidad</h1>
            <div class="subtitle">Ingeniería Industrial · UTN FRA (Plan 2023)</div>
        </div>
        <div class="page-actions">
            ${state.uniTab === 'schedule' ? '<button class="btn btn-primary" onclick="showSubjectForm()">+ Materia</button>' : ''}
        </div>
    </div>
    <div class="subnav" style="margin-bottom:18px">
        <button class="subnav-item ${state.uniTab === 'schedule' ? 'active' : ''}" onclick="switchUniTab('schedule')">📅 Cursada y Exámenes 2026</button>
        <button class="subnav-item ${state.uniTab === 'mesh' ? 'active' : ''}" onclick="switchUniTab('mesh')">🗺️ Malla Curricular Interactiva</button>
    </div>
    <div id="uniTabContent"></div>`;

    el.innerHTML = html;
    const tabContainer = el.querySelector('#uniTabContent');
    if (state.uniTab === 'mesh') {
        renderUniversityMesh(tabContainer);
    } else {
        renderUniversitySchedule(tabContainer, subjects, allExams, allAssignments);
    }
}

function switchUniTab(t) {
    state.uniTab = t;
    const uniEl = document.getElementById('view-university');
    if (uniEl) renderUniversity(uniEl);
}

function renderUniversitySchedule(el, subjects, allExams, allAssignments) {
    if (subjects.length === 0) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">🎓</div><h3>Sin materias</h3><p>Agrega tus materias del año</p></div>';
        return;
    }

    const currentSubjects = subjects.filter(s => s.status === 'current');
    const passedSubjects = subjects.filter(s => s.status === 'passed');

    // Upcoming exams/deliverables timeline
    const timelineItems = [];
    allExams.forEach(e => {
        timelineItems.push({
            id: e.id,
            subject_id: e.subject_id,
            subject_name: e.subject_name,
            kind: 'exam',
            type: e.type || 'Examen',
            date: e.date,
            time: e.time,
            topic: e.topic,
            grade: e.grade,
            status: e.status
        });
    });
    allAssignments.forEach(a => {
        timelineItems.push({
            id: a.id,
            subject_id: a.subject_id,
            subject_name: a.subject_name,
            kind: 'assignment',
            type: 'TP',
            date: a.due_date,
            time: null,
            topic: a.title + (a.description ? ': ' + a.description : ''),
            grade: a.grade,
            status: a.status
        });
    });
    timelineItems.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Find next upcoming milestone
    const nowStr = todayStr();
    const upcomingNext = timelineItems.find(t => t.date && t.date >= nowStr && t.status !== 'passed' && t.status !== 'graded');

    let html = '';

    // Quick Stats Bar
    html += `<div class="stats-row" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:20px">
        <div class="stat-card lavender">
            <div class="stat-icon">📚</div>
            <div class="stat-value">${currentSubjects.length}</div>
            <div class="stat-label">Materias en curso (2026)</div>
        </div>
        <div class="stat-card sage">
            <div class="stat-icon">✅</div>
            <div class="stat-value">${passedSubjects.length}</div>
            <div class="stat-label">Materias aprobadas (2025)</div>
        </div>
        <div class="stat-card ${upcomingNext ? 'rose' : 'lavender'}" style="cursor:pointer" onclick="document.getElementById('timelineSection')?.scrollIntoView({behavior:'smooth'})">
            <div class="stat-icon">⏳</div>
            <div class="stat-value" style="font-size:1.05rem;line-height:1.2">${upcomingNext ? esc(upcomingNext.subject_name) : 'Al día'}</div>
            <div class="stat-label">${upcomingNext ? `${getExamCountdown(upcomingNext.date).text} (${fmtDate(upcomingNext.date)})` : 'Sin entregas pendientes'}</div>
        </div>
    </div>`;

    // 🗓️ WEEKLY SCHEDULE CARDS (Lunes a Sábado + Final Libre)
    html += `<div style="margin-bottom:26px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div style="font-size:1rem;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px">
                <span>🗓️</span> Cronograma Semanal de Cursada 2026
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Sede Villa Domínico · Ramón Franco 5050</div>
        </div>
        <div class="uni-schedule-grid">`;

    const dayOrder = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Libre'];
    const currentDayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()];

    dayOrder.forEach(day => {
        const daySubjects = currentSubjects.filter(s => {
            if (s.day_of_week) return s.day_of_week.toLowerCase().includes(day.toLowerCase());
            return s.schedule && s.schedule.toLowerCase().includes(day.toLowerCase());
        });
        if (daySubjects.length === 0) return;

        const isToday = currentDayName.toLowerCase() === day.toLowerCase();

        html += `<div class="day-schedule-card ${isToday ? 'is-active-day' : ''}">
            <div class="day-schedule-header">
                <div class="day-schedule-name">
                    <span>${day === 'Libre' ? '🌐' : '📅'} ${day}</span>
                    ${isToday ? '<span class="tag tag-primary" style="font-size:0.7rem;padding:2px 6px">HOY</span>' : ''}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${daySubjects.length} materia${daySubjects.length > 1 ? 's' : ''}</div>
            </div>`;

        daySubjects.forEach(s => {
            const timeLabel = (s.start_time && s.end_time) ? `${s.start_time} a ${s.end_time} hs` : (s.schedule || '');
            html += `<div style="background:var(--bg);border-radius:12px;padding:12px;border:1px solid rgba(255,255,255,0.06)">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:6px">
                    <div>
                        <div style="font-weight:700;font-size:0.95rem;color:var(--text)">${esc(s.name)}</div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
                            ${s.commission ? `<span class="tag tag-lavender" style="font-size:0.72rem">Com. ${esc(s.commission)}</span>` : ''}
                            ${s.shift ? `<span class="tag tag-primary" style="font-size:0.72rem">${esc(s.shift)}</span>` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:4px">
                        <button class="btn btn-ghost btn-sm" onclick="showSubjectForm(${s.id})" title="Editar datos de materia">✎</button>
                    </div>
                </div>

                ${timeLabel ? `<div style="font-size:0.82rem;color:var(--text-muted);display:flex;align-items:center;gap:6px;margin-bottom:4px">
                    <span>🕒</span> <strong>${esc(timeLabel)}</strong>
                </div>` : ''}

                ${s.classroom ? `<div style="font-size:0.8rem;color:var(--text-light);display:flex;align-items:center;gap:6px;margin-bottom:6px">
                    <span>📍</span> ${esc(s.classroom)}
                </div>` : ''}

                ${s.virtual_link ? `<div style="margin:8px 0">
                    <a href="${esc(s.virtual_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;font-weight:700;font-size:0.8rem;padding:5px 12px;box-shadow:0 3px 8px rgba(242,139,168,0.25)">
                        🎥 Conectar a Zoom ${s.zoom_id ? `<span style="opacity:0.85;font-size:0.72rem">(${esc(s.zoom_id)})</span>` : ''}
                    </a>
                </div>` : ''}

                ${s.professor ? `<div style="font-size:0.78rem;margin-top:6px;padding-top:6px;border-top:1px dashed rgba(255,255,255,0.06);display:flex;flex-wrap:wrap;gap:4px;align-items:center">
                    <span style="color:var(--text-muted)">Docentes:</span> ${parseProfessorEmails(s.professor)}
                </div>` : ''}

                ${s.current_status_note ? `<div style="font-size:0.78rem;background:rgba(255,255,255,0.04);border-left:3px solid var(--primary);padding:6px 8px;border-radius:4px;color:var(--text-light);margin-top:8px;line-height:1.3">
                    📌 ${esc(s.current_status_note)}
                </div>` : ''}

                <div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end">
                    <button class="btn btn-ghost btn-sm" style="font-size:0.74rem" onclick="showExamForm(${s.id})">+ Examen</button>
                    <button class="btn btn-ghost btn-sm" style="font-size:0.74rem" onclick="showAssignmentForm(${s.id})">+ TP</button>
                </div>
            </div>`;
        });

        html += `</div>`;
    });

    html += `</div></div>`;

    // ⏳ COUNTDOWN TIMELINE OF EXAMS AND DELIVERABLES
    html += `<div id="timelineSection" style="margin-bottom:30px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div style="font-size:1rem;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px">
                <span>⏳</span> Cronograma de Exámenes y Entregas (Octubre 2026 – Febrero 2027)
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Haz clic en cualquier fecha para editar o cargar nota</div>
        </div>`;

    if (timelineItems.length === 0) {
        html += '<div class="card" style="padding:16px;color:var(--text-muted);font-size:0.88rem">Sin exámenes ni entregas registradas</div>';
    } else {
        html += `<div style="display:flex;flex-direction:column;gap:6px">`;
        timelineItems.forEach(item => {
            const cd = getExamCountdown(item.date);
            const isDone = item.status === 'passed' || item.status === 'graded';
            const gradeBadge = item.grade !== null && item.grade !== undefined && item.grade !== '' ?
                `<span class="tag tag-sage" style="font-weight:700">Nota: ${item.grade}</span>` : '';

            html += `<div class="exam-timeline-item" onclick="${item.kind === 'exam' ? `editExamById(${item.id}, ${item.subject_id})` : `editAssignmentById(${item.id}, ${item.subject_id})`}">
                <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:48px;height:48px;background:var(--bg);border-radius:10px;border:1px solid rgba(255,255,255,0.06);flex-shrink:0">
                        <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase">${item.date ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(item.date.split('-')[1])-1] : ''}</div>
                        <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${item.date ? item.date.split('-')[2] : '—'}</div>
                    </div>
                    <div style="min-width:0;flex:1">
                        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                            <span style="font-weight:700;font-size:0.9rem;color:var(--text)">${esc(item.subject_name)}</span>
                            <span class="tag ${item.type.includes('Parcial') ? 'tag-primary' : item.type.includes('Recuperatorio') ? 'tag-rose' : item.type.includes('Final') ? 'tag-lavender' : 'tag-amber'}" style="font-size:0.7rem;padding:2px 6px">
                                ${esc(item.type)}
                            </span>
                            ${gradeBadge}
                        </div>
                        <div style="font-size:0.8rem;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">
                            ${item.time ? `🕒 ${item.time} hs · ` : ''}${esc(item.topic || 'Sin temario')}
                        </div>
                    </div>
                </div>
                <div style="flex-shrink:0;text-align:right;display:flex;align-items:center;gap:8px">
                    ${isDone ? '<span class="tag tag-sage">Completado</span>' : `<span class="exam-countdown-badge ${cd.cls}">${cd.text}</span>`}
                    <div onclick="event.stopPropagation()" style="display:flex;gap:4px">
                        <button class="btn btn-ghost btn-sm" style="padding:4px 7px;font-size:0.78rem" onclick="${item.kind === 'exam' ? `editExamById(${item.id}, ${item.subject_id})` : `editAssignmentById(${item.id}, ${item.subject_id})`}" title="Editar">✎</button>
                        <button class="btn btn-ghost btn-sm" style="padding:4px 7px;font-size:0.78rem;color:var(--rose,#ef4444)" onclick="${item.kind === 'exam' ? `deleteExam(${item.id})` : `deleteAssignment(${item.id})`}" title="Eliminar">✕</button>
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }
    html += `</div>`;

    // 📚 SUBJECT CARDS (Original detail view with exams and assignments)
    html += `<div style="font-size:1rem;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <span>📚</span> Detalle por Asignatura y Evaluaciones
    </div>`;

    for (const s of subjects) {
        const exams = allExams.filter(e => e.subject_id === s.id);
        const assignments = allAssignments.filter(a => a.subject_id === s.id);
        const stCls = s.status === 'current' ? 'current' : s.status === 'passed' ? 'passed' : 'failed';

        // Calculate average and cursada condition
        const gradedExams = exams.filter(e => e.grade !== null && e.grade !== undefined && e.grade !== '');
        const gradedTPs = assignments.filter(a => a.grade !== null && a.grade !== undefined && a.grade !== '');
        const allGrades = [...gradedExams.map(e => parseFloat(e.grade)), ...gradedTPs.map(a => parseFloat(a.grade))].filter(g => !isNaN(g));
        const examGrades = gradedExams.map(e => parseFloat(e.grade)).filter(g => !isNaN(g));
        const avg = allGrades.length > 0 ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length) : null;

        let condBadge = '';
        if (s.status === 'passed') {
            condBadge = `<span class="tag tag-sage">✅ Aprobada${avg !== null ? ` · Prom ${avg.toFixed(1)}` : ''}</span>`;
        } else if (s.status === 'failed') {
            condBadge = `<span class="tag tag-rose">Recursar</span>`;
        } else if (examGrades.length > 0) {
            const minExam = Math.min(...examGrades);
            const avgExam = examGrades.reduce((a, b) => a + b, 0) / examGrades.length;
            if (minExam < 4) {
                condBadge = `<span class="tag tag-rose">⚠️ Recuperatorio · Prom ${avgExam.toFixed(1)}</span>`;
            } else if (minExam >= 7 && avgExam >= 7) {
                condBadge = `<span class="tag tag-sage">✨ En Promoción · Prom ${avgExam.toFixed(1)}</span>`;
            } else {
                condBadge = `<span class="tag tag-lavender">📘 Regular · Prom ${avgExam.toFixed(1)}</span>`;
            }
        } else if (avg !== null) {
            condBadge = `<span class="tag tag-primary">Prom TPs: ${avg.toFixed(1)}</span>`;
        }

        html += `<div class="subject-card" style="margin-bottom:14px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
                <div>
                    <div class="subject-name" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        <span><span class="status-dot ${stCls}" style="margin-right:8px"></span>${esc(s.name)}</span>
                        ${condBadge}
                        ${s.commission ? `<span class="tag tag-lavender" style="font-size:0.72rem">Com. ${esc(s.commission)}</span>` : ''}
                    </div>
                    <div class="subject-meta">${esc(s.professor || '')}${s.schedule ? ' · 🕒 '+esc(s.schedule) : ''}${s.classroom ? ' · 📍 '+esc(s.classroom) : ''}</div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm" onclick="showExamForm(${s.id})">+ Examen</button>
                    <button class="btn btn-ghost btn-sm" onclick="showAssignmentForm(${s.id})">+ TP</button>
                    <button class="btn btn-ghost btn-sm" onclick="showSubjectForm(${s.id})">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteSubject(${s.id})">✕</button>
                </div>
            </div>
            <div class="two-col">
                <div><div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Exámenes</div>`;
        if (exams.length === 0) {
            html += '<span style="font-size:0.8rem;color:var(--text-light)">Sin exámenes</span>';
        } else {
            for (const e of exams) {
                const gradeBadge = e.grade ? ` · <strong style="color:${e.grade >= 7 ? 'var(--sage)' : e.grade >= 4 ? 'var(--primary)' : 'var(--rose)'}">Nota: ${e.grade}</strong>` : '';
                html += `<div class="calendar-event" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,0.02)" onclick="editExamById(${e.id}, ${s.id})" title="Clic para editar o cargar nota">
                    <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
                        <div class="event-dot exam"></div>
                        <div class="event-text" style="flex:1">${esc(e.type || 'Examen')}: <strong>${fmtDate(e.date)}</strong>${e.time ? ' ' + esc(e.time) + 'hs' : ''}${e.topic ? ' ('+esc(e.topic)+')' : ''}${gradeBadge}</div>
                    </div>
                    <div style="display:flex;gap:4px;margin-left:8px;flex-shrink:0" onclick="event.stopPropagation()">
                        <button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:0.75rem" onclick="editExamById(${e.id}, ${s.id})" title="Editar examen">✎</button>
                        <button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:0.75rem;color:var(--rose,#ef4444)" onclick="deleteExam(${e.id})" title="Eliminar examen">✕</button>
                    </div>
                </div>`;
            }
        }
        html += `</div><div><div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Trabajos Prácticos</div>`;
        if (assignments.length === 0) {
            html += '<span style="font-size:0.8rem;color:var(--text-light)">Sin TPs</span>';
        } else {
            for (const a of assignments) {
                const tpGrade = a.grade ? ` · <strong>Nota: ${a.grade}</strong>` : '';
                html += `<div class="calendar-event" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-radius:8px;margin-bottom:4px;background:rgba(255,255,255,0.02)" onclick="editAssignmentById(${a.id}, ${s.id})" title="Clic para editar o cargar nota">
                    <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
                        <div class="event-dot assignment"></div>
                        <div class="event-text" style="flex:1">${esc(a.title)}${a.due_date ? ' · Entrega: <strong>'+fmtDate(a.due_date)+'</strong>' : ''}${a.group_name ? ' · '+esc(a.group_name) : ''}${tpGrade}</div>
                    </div>
                    <div style="display:flex;gap:4px;margin-left:8px;flex-shrink:0" onclick="event.stopPropagation()">
                        <button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:0.75rem" onclick="editAssignmentById(${a.id}, ${s.id})" title="Editar TP">✎</button>
                        <button class="btn btn-ghost btn-sm" style="padding:2px 7px;font-size:0.75rem;color:var(--rose,#ef4444)" onclick="deleteAssignment(${a.id})" title="Eliminar TP">✕</button>
                    </div>
                </div>`;
            }
        }
        html += '</div></div></div>';
    }

    el.innerHTML = html;
}

// ===================== MALLA CURRICULAR INTERACTIVA =====================

function renderUniversityMesh(el) {
    if (typeof UTN_INDUSTRIAL_PLAN === 'undefined') {
        el.innerHTML = '<div class="empty-state"><h3>Cargando plan de estudios...</h3></div>';
        return;
    }

    const statusMap = window.__curriculumStatus || {};
    window.__meshFilter = window.__meshFilter || 'ALL';
    window.__meshSearch = window.__meshSearch || '';

    // Calculate metrics across all 42 subjects
    let approvedCount = 0;
    let regularCount = 0;
    let cursandoCount = 0;
    let disponibleCount = 0;
    let libreCount = 0;
    let bloqueadaCount = 0;

    UTN_INDUSTRIAL_PLAN.forEach(s => {
        const eff = getEffectiveSubjectStatus(s, statusMap);
        if (eff === 'APROBADA') approvedCount++;
        else if (eff === 'REGULAR') regularCount++;
        else if (eff === 'CURSANDO') cursandoCount++;
        else if (eff === 'DISPONIBLE') disponibleCount++;
        else if (eff === 'LIBRE_DISPONIBLE') libreCount++;
        else bloqueadaCount++;
    });

    const totalSubjects = UTN_INDUSTRIAL_PLAN.length;
    const pct = ((approvedCount / totalSubjects) * 100).toFixed(1);

    // Título Intermedio checklist (Subjects 1..25)
    const tiSubjects = UTN_INDUSTRIAL_PLAN.filter(s => s.level <= 3);
    const tiDoneCount = tiSubjects.filter(s => {
        const st = getEffectiveSubjectStatus(s, statusMap);
        return st === 'APROBADA' || st === 'REGULAR';
    }).length;
    const tiReady = tiDoneCount === tiSubjects.length;

    let html = '';

    // 1. Degree Progress Card
    html += `<div class="card" style="margin-bottom:18px;padding:16px 20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
            <div>
                <div style="font-weight:700;font-size:1.05rem;color:var(--text)">Progreso de la Carrera · Plan 2023</div>
                <div style="font-size:0.8rem;color:var(--text-muted)">${approvedCount} de ${totalSubjects} asignaturas aprobadas (${pct}%) · UTN FRA</div>
            </div>
            <div style="font-size:1.4rem;font-weight:800;color:var(--sage)">${pct}%</div>
        </div>
        <div style="width:100%;height:10px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;margin-bottom:14px">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, var(--primary), var(--sage));border-radius:6px;transition:width 0.4s ease"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:0.82rem">
            <span class="tag tag-sage" style="font-weight:600">✅ Aprobadas: ${approvedCount}</span>
            <span class="tag tag-lavender" style="font-weight:600">📘 Regulares: ${regularCount}</span>
            <span class="tag tag-primary" style="font-weight:600">⚡ Cursando: ${cursandoCount}</span>
            <span class="tag tag-amber" style="font-weight:600">🔓 Disponibles: ${disponibleCount}</span>
            <span class="tag tag-cyan" style="font-weight:600">🌐 Final Libre: ${libreCount}</span>
            <span class="tag tag-muted" style="font-weight:600">🔒 Bloqueadas: ${bloqueadaCount}</span>
        </div>
    </div>`;

    // 2. Milestones Card (Título Intermedio & PPS)
    html += `<div class="card" style="margin-bottom:18px;padding:14px 18px;background:rgba(255,255,255,0.02)">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
            <div style="display:flex;align-items:center;gap:12px;background:var(--bg);padding:10px 14px;border-radius:10px;border-left:3px solid ${tiReady ? 'var(--sage)' : 'var(--lavender)'}">
                <div style="font-size:1.6rem">🎓</div>
                <div>
                    <div style="font-weight:700;font-size:0.88rem">Título Intermedio: Técnico Universitario</div>
                    <div style="font-size:0.78rem;color:var(--text-muted)">Adm., Producción y Gestión Industrial (${tiDoneCount}/25 materias 1° a 3° Nivel)</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;background:var(--bg);padding:10px 14px;border-radius:10px;border-left:3px solid var(--amber)">
                <div style="font-size:1.6rem">🏭</div>
                <div>
                    <div style="font-weight:700;font-size:0.88rem">Práctica Profesional Supervisada (PPS)</div>
                    <div style="font-size:0.78rem;color:var(--text-muted)">200 hs reloj · Requiere cursadas y aprobadas de 3° y 4° Nivel</div>
                </div>
            </div>
        </div>
    </div>`;

    // 3. Filter Bar & Search Input
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="sub-tabs" style="margin:0;gap:4px">
            <button class="btn btn-sm ${window.__meshFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('ALL')">Todas</button>
            <button class="btn btn-sm ${window.__meshFilter === '1' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('1')">Nivel I</button>
            <button class="btn btn-sm ${window.__meshFilter === '2' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('2')">Nivel II</button>
            <button class="btn btn-sm ${window.__meshFilter === '3' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('3')">Nivel III</button>
            <button class="btn btn-sm ${window.__meshFilter === '4' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('4')">Nivel IV</button>
            <button class="btn btn-sm ${window.__meshFilter === '5' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('5')">Nivel V</button>
            <button class="btn btn-sm ${window.__meshFilter === 'DISPONIBLES' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('DISPONIBLES')">🔓 Disponibles</button>
            <button class="btn btn-sm ${window.__meshFilter === 'CURSANDO' ? 'btn-primary' : 'btn-secondary'}" onclick="setMeshFilter('CURSANDO')">⚡ Cursando</button>
        </div>
        <div style="min-width:220px;flex:1;max-width:320px">
            <input type="text" class="form-control" style="padding:6px 12px;font-size:0.84rem" placeholder="🔍 Buscar asignatura o código..." value="${esc(window.__meshSearch)}" oninput="setMeshSearch(this.value)">
        </div>
    </div>`;

    // 4. Malla Grid (5 Columns)
    const levels = [
        { num: 1, name: "Nivel I (1° Año)", hours: "31 hs/sem" },
        { num: 2, name: "Nivel II (2° Año)", hours: "30 hs/sem" },
        { num: 3, name: "Nivel III (3° Año)", hours: "31 hs/sem" },
        { num: 4, name: "Nivel IV (4° Año)", hours: "34 hs/sem" },
        { num: 5, name: "Nivel V (5° Año)", hours: "33 hs/sem" }
    ];

    html += `<div class="mesh-container" id="meshGrid">`;

    levels.forEach(lvl => {
        // If a specific level is filtered and it's not this one, skip
        if (['1','2','3','4','5'].includes(window.__meshFilter) && window.__meshFilter !== String(lvl.num)) {
            return;
        }

        const subjectsInLevel = UTN_INDUSTRIAL_PLAN.filter(s => s.level === lvl.num);
        html += `<div class="mesh-column">
            <div class="mesh-column-header">
                <div class="mesh-column-title">${lvl.name}</div>
                <div class="mesh-column-subtitle">${lvl.hours} anuales · ${subjectsInLevel.length} materias</div>
            </div>`;

        subjectsInLevel.forEach(s => {
            const effStatus = getEffectiveSubjectStatus(s, statusMap);
            const userEntry = statusMap[s.id] || {};
            const grade = userEntry.grade;
            const cfg = UTN_INDUSTRIAL_STATUS_CONFIG[effStatus] || UTN_INDUSTRIAL_STATUS_CONFIG.BLOQUEADA;

            // Apply search & status filter
            const matchesSearch = !window.__meshSearch ||
                s.name.toLowerCase().includes(window.__meshSearch.toLowerCase()) ||
                (s.code && s.code.toLowerCase().includes(window.__meshSearch.toLowerCase())) ||
                (s.area && s.area.toLowerCase().includes(window.__meshSearch.toLowerCase()));

            let matchesStatusFilter = true;
            if (window.__meshFilter === 'DISPONIBLES') {
                matchesStatusFilter = (effStatus === 'DISPONIBLE' || effStatus === 'LIBRE_DISPONIBLE');
            } else if (window.__meshFilter === 'CURSANDO') {
                matchesStatusFilter = (effStatus === 'CURSANDO');
            }

            const isVisible = matchesSearch && matchesStatusFilter;

            // Correlatives Pills
            const reqPills = [];
            (s.cursadasParaCursar || []).forEach(reqId => {
                const reqStatus = getEffectiveSubjectStatus(UTN_INDUSTRIAL_PLAN.find(x => x.id === reqId) || { id: reqId }, statusMap);
                const isMet = reqStatus === 'APROBADA' || reqStatus === 'REGULAR';
                reqPills.push(`<span class="req-pill ${isMet ? 'is-met' : 'is-missing'}" title="${isMet ? 'Cumplida (Regular o Aprobada)' : 'Falta cursar/firmar'}">#${reqId}</span>`);
            });
            (s.aprobadasParaCursar || []).forEach(reqId => {
                const reqStatus = getEffectiveSubjectStatus(UTN_INDUSTRIAL_PLAN.find(x => x.id === reqId) || { id: reqId }, statusMap);
                const isMet = reqStatus === 'APROBADA';
                reqPills.push(`<span class="req-pill ${isMet ? 'is-met' : 'is-missing'}" style="border:1px solid #5cb38e" title="${isMet ? 'Cumplida (Aprobada)' : 'Falta aprobar final'}">★#${reqId}</span>`);
            });

            html += `<div class="mesh-card" data-mesh-id="${s.id}" style="${!isVisible ? 'display:none;' : ''}border-left:4px solid ${cfg.border}"
                onmouseenter="highlightCorrelatives(${s.id})"
                onmouseleave="clearCorrelativesHighlight()"
                onclick="inspectCurriculumSubject(${s.id})">
                <div class="mesh-card-header">
                    <span class="mesh-card-id">#${s.id} · ${esc(s.code || '')}</span>
                    <span class="tag ${cfg.badgeClass}" style="font-size:0.68rem;padding:2px 6px">
                        ${cfg.icon} ${cfg.label}
                    </span>
                </div>
                <div class="mesh-card-title">
                    ${esc(s.name)}
                    ${s.isIntegrator ? '<span style="color:#ebb255;font-size:0.75rem;margin-left:4px" title="Materia Integradora">⭐</span>' : ''}
                </div>
                <div class="mesh-card-meta">
                    <span>${s.weeklyHours} hs · ${esc(s.regime)}</span>
                    ${grade ? `<strong style="color:var(--sage)">Nota: ${grade}</strong>` : `<span style="font-size:0.68rem;color:var(--text-muted)">${esc(s.area)}</span>`}
                </div>
                ${reqPills.length > 0 ? `<div class="mesh-card-reqs">
                    <span style="font-size:0.66rem;color:var(--text-muted)">Req:</span> ${reqPills.join(' ')}
                </div>` : ''}
            </div>`;
        });

        // Special milestone cards inside columns
        if (lvl.num === 3) {
            html += `<div style="background:rgba(164,140,224,0.08);border:1px dashed var(--lavender);border-radius:10px;padding:10px;font-size:0.78rem">
                <div style="font-weight:700;color:var(--lavender);margin-bottom:4px">🏅 Título Intermedio</div>
                <div style="color:var(--text-muted)">Completar Niveles I a III otorga el título de Técnico Universitario.</div>
            </div>`;
        } else if (lvl.num === 5) {
            html += `<div style="background:rgba(235,178,85,0.08);border:1px dashed var(--amber);border-radius:10px;padding:10px;font-size:0.78rem">
                <div style="font-weight:700;color:var(--amber);margin-bottom:4px">⭐ Proyecto Final & PPS</div>
                <div style="color:var(--text-muted)">200 hs de PPS + Tesina Integradora para la Graduación.</div>
            </div>`;
        }

        html += `</div>`;
    });

    html += `</div>`;

    // 5. Visual Legend Bar
    html += `<div class="mesh-legend">
        <span style="font-weight:700;font-size:0.8rem;color:var(--text-muted);margin-right:4px">REFERENCIAS:</span>
        <div class="legend-item"><div class="legend-dot" style="background:#5cb38e"></div> Aprobada</div>
        <div class="legend-item"><div class="legend-dot" style="background:#a48ce0"></div> Regular (Pendiente Final)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#f28ba8"></div> Cursando 2026</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ebb255"></div> Disponible para Cursar</div>
        <div class="legend-item"><div class="legend-dot" style="background:#4ec5db"></div> Final Libre</div>
        <div class="legend-item"><div class="legend-dot" style="background:rgba(255,255,255,0.25)"></div> Bloqueada</div>
        <div class="legend-item" style="margin-left:auto"><span style="border-bottom:2px solid #ebb255;padding-bottom:1px">Dorado</span> = Requisito previo &nbsp;·&nbsp; <span style="border-bottom:2px solid #5cb38e;padding-bottom:1px">Verde</span> = Materia que destraba</div>
    </div>`;

    el.innerHTML = html;
}

function setMeshFilter(filter) {
    window.__meshFilter = filter;
    const el = document.getElementById('uniTabContent');
    if (el) renderUniversityMesh(el);
}

function setMeshSearch(q) {
    window.__meshSearch = q;
    // Live update card visibility without full re-render
    const cards = document.querySelectorAll('.mesh-card[data-mesh-id]');
    const qLower = q.toLowerCase();
    cards.forEach(card => {
        const id = parseInt(card.getAttribute('data-mesh-id'));
        const s = UTN_INDUSTRIAL_PLAN.find(x => x.id === id);
        if (!s) return;
        const matchesSearch = !q ||
            s.name.toLowerCase().includes(qLower) ||
            (s.code && s.code.toLowerCase().includes(qLower)) ||
            (s.area && s.area.toLowerCase().includes(qLower));

        const effStatus = getEffectiveSubjectStatus(s, window.__curriculumStatus || {});
        let matchesStatusFilter = true;
        if (window.__meshFilter === 'DISPONIBLES') {
            matchesStatusFilter = (effStatus === 'DISPONIBLE' || effStatus === 'LIBRE_DISPONIBLE');
        } else if (window.__meshFilter === 'CURSANDO') {
            matchesStatusFilter = (effStatus === 'CURSANDO');
        }

        card.style.display = (matchesSearch && matchesStatusFilter) ? '' : 'none';
    });
}

function highlightCorrelatives(subjectId) {
    clearCorrelativesHighlight();
    const currentCard = document.querySelector(`.mesh-card[data-mesh-id="${subjectId}"]`);
    if (currentCard) currentCard.classList.add('is-active-subject');

    const prereqIds = getSubjectPrerequisiteIds(subjectId);
    prereqIds.forEach(id => {
        const card = document.querySelector(`.mesh-card[data-mesh-id="${id}"]`);
        if (card) card.classList.add('is-prereq-highlight');
    });

    const unlockIds = getSubjectDependentIds(subjectId);
    unlockIds.forEach(id => {
        const card = document.querySelector(`.mesh-card[data-mesh-id="${id}"]`);
        if (card) card.classList.add('is-unlock-highlight');
    });
}

function clearCorrelativesHighlight() {
    document.querySelectorAll('.mesh-card').forEach(c => {
        c.classList.remove('is-active-subject', 'is-prereq-highlight', 'is-unlock-highlight');
    });
}

function inspectCurriculumSubject(subjectId) {
    const s = UTN_INDUSTRIAL_PLAN.find(x => x.id === subjectId);
    if (!s) return;

    const statusMap = window.__curriculumStatus || {};
    const currentEntry = statusMap[subjectId] || {};
    const effStatus = getEffectiveSubjectStatus(s, statusMap);
    const unlockInfo = evaluateSubjectUnlock(s, statusMap);
    const downstreamIds = getSubjectDependentIds(subjectId);
    const downstreamSubjects = UTN_INDUSTRIAL_PLAN.filter(x => downstreamIds.includes(x.id));

    const html = `<div style="display:flex;flex-direction:column;gap:16px">
        <div style="background:var(--bg);padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.06)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div>
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted)">NIVEL ${s.level} · #${s.id} (${esc(s.code || '')})</div>
                    <div style="font-size:1.15rem;font-weight:800;color:var(--text);margin-top:2px">
                        ${esc(s.name)} ${s.isIntegrator ? '<span style="color:#ebb255">⭐ Integradora</span>' : ''}
                    </div>
                    <div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">
                        ${s.weeklyHours} hs/sem · Régimen ${esc(s.regime)} · Área: ${esc(s.area)}
                    </div>
                </div>
                <div>
                    <span class="tag ${UTN_INDUSTRIAL_STATUS_CONFIG[effStatus].badgeClass}" style="font-size:0.82rem;padding:4px 10px">
                        ${UTN_INDUSTRIAL_STATUS_CONFIG[effStatus].icon} ${UTN_INDUSTRIAL_STATUS_CONFIG[effStatus].label}
                    </span>
                </div>
            </div>
            ${s.notes ? `<div style="font-size:0.8rem;color:var(--text-light);background:rgba(255,255,255,0.03);padding:6px 10px;border-radius:6px;margin-top:8px">📌 ${esc(s.notes)}</div>` : ''}
        </div>

        <div>
            <label style="font-size:0.82rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;display:block">
                Modificar Estado de la Materia
            </label>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px" id="statusButtonGroup">
                <button type="button" class="btn ${effStatus === 'APROBADA' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="selectSubjectStatus('APROBADA')">✅ Aprobada</button>
                <button type="button" class="btn ${effStatus === 'REGULAR' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="selectSubjectStatus('REGULAR')">📘 Regular</button>
                <button type="button" class="btn ${effStatus === 'CURSANDO' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="selectSubjectStatus('CURSANDO')">⚡ Cursando</button>
                <button type="button" class="btn ${effStatus === 'LIBRE_DISPONIBLE' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="selectSubjectStatus('LIBRE_DISPONIBLE')">🌐 Final Libre</button>
                <button type="button" class="btn ${effStatus === 'BLOQUEADA' || effStatus === 'DISPONIBLE' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="selectSubjectStatus('RESET')">🔄 Reset / Automático</button>
            </div>
        </div>

        <div id="gradeContainer" style="display:${effStatus === 'APROBADA' ? 'block' : 'none'}">
            <div class="form-group" style="margin:0">
                <label>Calificación Final (1 a 10)</label>
                <input type="number" step="0.5" min="1" max="10" class="form-control" id="modalGradeInput" value="${currentEntry.grade !== null && currentEntry.grade !== undefined ? currentEntry.grade : ''}" placeholder="Ej. 8, 9...">
            </div>
        </div>

        <!-- Correlatives Checklist -->
        <div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:0.82rem;font-weight:700;color:var(--text);margin-bottom:8px">
                📋 Verificación de Correlatividades (UTN FRA)
            </div>

            <div style="font-size:0.8rem;margin-bottom:6px">
                <strong style="color:var(--text-muted)">Para Cursar (Cursadas firmadas):</strong>
                ${(s.cursadasParaCursar || []).length === 0 ? '<span style="color:var(--sage)"> Sin requisitos previos</span>' : ''}
            </div>
            ${(s.cursadasParaCursar || []).map(cid => {
                const reqSubj = UTN_INDUSTRIAL_PLAN.find(x => x.id === cid) || { name: 'Materia #' + cid };
                const reqStatus = getEffectiveSubjectStatus(reqSubj, statusMap);
                const isMet = reqStatus === 'APROBADA' || reqStatus === 'REGULAR';
                return `<div style="font-size:0.78rem;display:flex;align-items:center;gap:6px;margin:2px 0 2px 12px">
                    <span>${isMet ? '✅' : '❌'}</span>
                    <span style="color:${isMet ? 'var(--text)' : '#e06c75'}">#${cid} ${esc(reqSubj.name)} (${reqStatus})</span>
                </div>`;
            }).join('')}

            ${(s.aprobadasParaCursar || []).length > 0 ? `<div style="font-size:0.8rem;margin:8px 0 4px">
                <strong style="color:var(--text-muted)">Para Cursar (Finales aprobados):</strong>
            </div>
            ${s.aprobadasParaCursar.map(cid => {
                const reqSubj = UTN_INDUSTRIAL_PLAN.find(x => x.id === cid) || { name: 'Materia #' + cid };
                const reqStatus = getEffectiveSubjectStatus(reqSubj, statusMap);
                const isMet = reqStatus === 'APROBADA';
                return `<div style="font-size:0.78rem;display:flex;align-items:center;gap:6px;margin:2px 0 2px 12px">
                    <span>${isMet ? '✅' : '❌'}</span>
                    <span style="color:${isMet ? 'var(--text)' : '#e06c75'}">#${cid} ${esc(reqSubj.name)} (${reqStatus})</span>
                </div>`;
            }).join('')}` : ''}

            <div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.06);font-size:0.8rem">
                <strong>Condición de Inscripción:</strong>
                <span class="tag ${unlockInfo.canEnroll ? 'tag-sage' : 'tag-rose'}" style="margin-left:6px">
                    ${unlockInfo.canEnroll ? '🔓 Habilitada para Cursar' : `🔒 Bloqueada (Faltan ${unlockInfo.missingCursadas.length + unlockInfo.missingAprobadasCursar.length} materias)`}
                </span>
            </div>
        </div>

        ${downstreamSubjects.length > 0 ? `<div style="background:var(--bg);border-radius:12px;padding:14px;border:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:0.82rem;font-weight:700;color:var(--text);margin-bottom:6px">
                🚀 Materias que Destraba a Futuro (${downstreamSubjects.length})
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${downstreamSubjects.map(ds => `<span class="tag tag-lavender" style="font-size:0.75rem" title="Nivel ${ds.level}">
                    N${ds.level}: #${ds.id} ${esc(ds.name)}
                </span>`).join('')}
            </div>
        </div>` : ''}
    </div>`;

    openModal(`Ficha de Asignatura · #${s.id} ${s.name}`, html);

    // Track chosen status in modal
    let selectedStatus = effStatus;
    window.selectSubjectStatus = function(st) {
        selectedStatus = st;
        const grp = document.getElementById('statusButtonGroup');
        if (grp) {
            grp.querySelectorAll('button').forEach(btn => {
                btn.className = 'btn btn-secondary btn-sm';
            });
            event.target.className = 'btn btn-primary btn-sm';
        }
        const gradeBox = document.getElementById('gradeContainer');
        if (gradeBox) {
            gradeBox.style.display = st === 'APROBADA' ? 'block' : 'none';
        }
    };

    document.getElementById('modalSave').onclick = async () => {
        const gradeInput = document.getElementById('modalGradeInput');
        const gradeVal = gradeInput && gradeInput.value ? parseFloat(gradeInput.value) : null;

        const finalStatus = selectedStatus === 'RESET' ?
            (evaluateSubjectUnlock(s, statusMap).canEnroll ? 'DISPONIBLE' : 'BLOQUEADA') : selectedStatus;

        // Persist to backend
        const res = await api(eel.update_curriculum_status, subjectId, finalStatus, gradeVal, null);
        if (res && res.ok) {
            window.__curriculumStatus = window.__curriculumStatus || {};
            window.__curriculumStatus[subjectId] = {
                subject_id: subjectId,
                status: finalStatus,
                grade: gradeVal,
                note: null
            };
            showToast(`Estado actualizado: ${finalStatus}`);
            closeModal();
            const container = document.getElementById('uniTabContent');
            if (container) renderUniversityMesh(container);
        } else {
            showToast('Error al guardar estado');
        }
    };
}

async function editExamById(examId, subjectId) {
    let ex = (window.__uniExams || []).find(x => x.id == examId);
    if (!ex) {
        try {
            const all = await api(eel.get_exams);
            if (all) {
                window.__uniExams = all;
                ex = all.find(x => x.id == examId);
            }
        } catch (_) {}
    }
    if (ex) {
        showExamModal(ex, subjectId || ex.subject_id);
    } else {
        showToast('No se encontró el examen seleccionado');
    }
}

async function deleteExam(id) {
    if (!confirm('¿Eliminar este examen permanentemente?')) return;
    closeModal();
    const res = await api(eel.delete_exam, id);
    if (res && res.ok) {
        showToast('Examen eliminado');
        navigate('university');
    } else {
        showToast('Error al eliminar examen: ' + ((res && res.error) || ''));
    }
}

async function editAssignmentById(assignId, subjectId) {
    let a = (window.__uniAssignments || []).find(x => x.id == assignId);
    if (!a) {
        try {
            const all = await api(eel.get_assignments);
            if (all) {
                window.__uniAssignments = all;
                a = all.find(x => x.id == assignId);
            }
        } catch (_) {}
    }
    if (a) {
        showAssignmentModal(a, subjectId || a.subject_id);
    } else {
        showToast('No se encontró el TP seleccionado');
    }
}

async function deleteAssignment(id) {
    if (!confirm('¿Eliminar este trabajo práctico permanentemente?')) return;
    closeModal();
    const res = await api(eel.delete_assignment, id);
    if (res && res.ok) {
        showToast('TP eliminado');
        navigate('university');
    } else {
        showToast('Error al eliminar TP: ' + ((res && res.error) || ''));
    }
}

function showSubjectForm(id) {
    if (id) {
        api(eel.get_subjects).then(subs => {
            const s = subs.find(x => x.id === id);
            if (s) showSubjectModal(s);
        });
    } else showSubjectModal(null);
}

function showSubjectModal(subj) {
    const html = `<form id="modalForm" onsubmit="event.preventDefault(); document.getElementById('modalSave').click();">
        <div class="form-group"><label>Nombre de la Materia *</label><input class="form-control" name="name" value="${esc(subj ? subj.name : '')}" required></div>
        <div class="form-row">
            <div class="form-group"><label>Comisión</label><input class="form-control" name="commission" value="${esc(subj ? (subj.commission || '') : '')}" placeholder="ej. 2-51-N"></div>
            <div class="form-group"><label>Día de Cursada</label><select class="form-control" name="day_of_week">
                <option value="">Sin día fijo</option>
                <option value="Lunes" ${subj && subj.day_of_week === 'Lunes' ? 'selected' : ''}>Lunes</option>
                <option value="Martes" ${subj && subj.day_of_week === 'Martes' ? 'selected' : ''}>Martes</option>
                <option value="Miércoles" ${subj && subj.day_of_week === 'Miércoles' ? 'selected' : ''}>Miércoles</option>
                <option value="Jueves" ${subj && subj.day_of_week === 'Jueves' ? 'selected' : ''}>Jueves</option>
                <option value="Viernes" ${subj && subj.day_of_week === 'Viernes' ? 'selected' : ''}>Viernes</option>
                <option value="Sábado" ${subj && subj.day_of_week === 'Sábado' ? 'selected' : ''}>Sábado</option>
                <option value="Libre" ${subj && subj.day_of_week === 'Libre' ? 'selected' : ''}>Libre / Suficiencia</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Hora Inicio</label><input type="time" class="form-control" name="start_time" value="${esc(subj ? (subj.start_time || '') : '')}"></div>
            <div class="form-group"><label>Hora Fin</label><input type="time" class="form-control" name="end_time" value="${esc(subj ? (subj.end_time || '') : '')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Turno</label><select class="form-control" name="shift">
                <option value="NOCHE" ${subj && subj.shift === 'NOCHE' ? 'selected' : ''}>Noche (18:15 a 23:00)</option>
                <option value="MANANA" ${subj && subj.shift === 'MANANA' ? 'selected' : ''}>Mañana (08:00 a 12:45)</option>
                <option value="TARDE" ${subj && subj.shift === 'TARDE' ? 'selected' : ''}>Tarde (13:00 a 17:45)</option>
                <option value="LIBRE" ${subj && subj.shift === 'LIBRE' ? 'selected' : ''}>Libre</option>
            </select></div>
            <div class="form-group"><label>Aula / Sede</label><input class="form-control" name="classroom" value="${esc(subj ? (subj.classroom || '') : '')}" placeholder="ej. Aula F102, Lab PC"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Enlace Zoom / Virtual</label><input class="form-control" name="virtual_link" value="${esc(subj ? (subj.virtual_link || '') : '')}" placeholder="https://utn.zoom.us/j/..."></div>
            <div class="form-group"><label>Zoom ID / Clave</label><input class="form-control" name="zoom_id" value="${esc(subj ? (subj.zoom_id || '') : '')}" placeholder="ej. 624 142 4085"></div>
        </div>
        <div class="form-group"><label>Docentes y Correos (separados por /)</label><input class="form-control" name="professor" value="${esc(subj ? subj.professor : '')}" placeholder="Prof. Nombre (correo@fra.utn.edu.ar)"></div>
        <div class="form-group"><label>Horario Resumen</label><input class="form-control" name="schedule" value="${esc(subj ? subj.schedule : '')}" placeholder="ej. Lunes 18:15 a 20:30 hs"></div>
        <div class="form-group"><label>Nota de Estado / Parciales</label><input class="form-control" name="current_status_note" value="${esc(subj ? (subj.current_status_note || '') : '')}" placeholder="ej. Debe 1° Parcial. Lab Grupo 6..."></div>
        <div class="form-row">
            <div class="form-group"><label>Año</label><input type="number" class="form-control" name="year" value="${subj ? subj.year : new Date().getFullYear()}"></div>
            <div class="form-group"><label>Estado</label><select class="form-control" name="status">
                <option value="current" ${!subj || subj.status === 'current' ? 'selected' : ''}>En curso</option>
                <option value="passed" ${subj && subj.status === 'passed' ? 'selected' : ''}>Aprobada</option>
                <option value="failed" ${subj && subj.status === 'failed' ? 'selected' : ''}>Desaprobada</option>
            </select></div>
        </div>
    </form>`;
    openModal(subj ? 'Editar materia' : 'Nueva materia', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = {
            name: f.get('name'),
            commission: f.get('commission'),
            day_of_week: f.get('day_of_week'),
            start_time: f.get('start_time'),
            end_time: f.get('end_time'),
            shift: f.get('shift'),
            classroom: f.get('classroom'),
            virtual_link: f.get('virtual_link'),
            zoom_id: f.get('zoom_id'),
            professor: f.get('professor'),
            schedule: f.get('schedule'),
            current_status_note: f.get('current_status_note'),
            year: parseInt(f.get('year')) || new Date().getFullYear(),
            status: f.get('status')
        };
        if (!data.name) { showToast('El nombre es obligatorio'); return; }
        const res = subj ? await api(eel.update_subject, subj.id, data) : await api(eel.create_subject, data);
        if (res && res.ok) { showToast(subj ? 'Actualizada' : 'Creada'); closeModal(); navigate('university'); }
        else showToast('Error al guardar');
    };
}

async function deleteSubject(id) {
    if (!confirm('¿Eliminar esta materia y todo su contenido?')) return;
    await api(eel.delete_subject, id);
    showToast('Eliminada');
    navigate('university');
}

function showExamForm(subjectId) {
    showExamModal(null, subjectId);
}

function showExamModal(exam, subjectId) {
    const subjects = window.__uniSubjects || [];
    const activeSubjId = exam ? exam.subject_id : (subjectId || (subjects[0] ? subjects[0].id : null));

    const subjOptions = subjects.map(s =>
        `<option value="${s.id}" ${s.id == activeSubjId ? 'selected' : ''}>${esc(s.name)}</option>`
    ).join('');

    const standardTypes = [
        '1° Parcial',
        '2° Parcial',
        'Parcial',
        'Recuperatorio',
        '1° Recup.',
        '2° Recup.',
        'Final',
        'Final Libre',
        'Laboratorio',
        'Entrega TP',
        'Coloquio',
        'Repaso',
        'Revisión',
        'Otro'
    ];
    let typeOptions = standardTypes.map(t =>
        `<option value="${esc(t)}" ${exam && exam.type === t ? 'selected' : ''}>${esc(t)}</option>`
    ).join('');

    if (exam && exam.type && !standardTypes.includes(exam.type)) {
        typeOptions = `<option value="${esc(exam.type)}" selected>${esc(exam.type)}</option>` + typeOptions;
    }

    const dateVal = exam && exam.date ? exam.date.split('T')[0].split(' ')[0] : '';
    const timeVal = exam && exam.time ? exam.time : '';
    const gradeVal = exam && exam.grade !== null && exam.grade !== undefined && exam.grade !== '' ? exam.grade : '';

    const html = `<form id="modalForm" onsubmit="event.preventDefault(); document.getElementById('modalSave').click();">
        <div class="form-row">
            <div class="form-group" style="flex:1"><label>Materia *</label><select class="form-control" name="subject_id" required>
                ${subjOptions}
            </select></div>
            <div class="form-group" style="flex:1"><label>Tipo de Evaluación</label><select class="form-control" name="type">
                ${typeOptions}
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Fecha *</label><input type="date" class="form-control" name="date" value="${dateVal}" required></div>
            <div class="form-group"><label>Hora</label><input type="time" class="form-control" name="time" value="${timeVal}"></div>
        </div>
        <div class="form-group"><label>Temario / Observaciones</label><input class="form-control" name="topic" value="${esc(exam ? (exam.topic || '') : '')}" placeholder="Temas, bloques, unidades..."></div>
        <div class="form-row">
            <div class="form-group"><label>Nota (0 a 10)</label><input type="number" step="0.5" min="0" max="10" class="form-control" name="grade" value="${gradeVal}" placeholder="ej. 8"></div>
            <div class="form-group"><label>Estado</label><select class="form-control" name="status">
                <option value="pending" ${!exam || exam.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                <option value="passed" ${exam && exam.status === 'passed' ? 'selected' : ''}>Aprobado</option>
                <option value="failed" ${exam && exam.status === 'failed' ? 'selected' : ''}>Desaprobado</option>
            </select></div>
        </div>
        ${exam ? `
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center">
            <button type="button" class="btn btn-ghost" style="color:var(--rose,#ef4444);border:1px solid rgba(239,68,68,0.25)" onclick="deleteExam(${exam.id})">🗑️ Eliminar Examen</button>
            <span style="font-size:0.75rem;color:var(--text-muted)">ID #${exam.id}</span>
        </div>` : ''}
    </form>`;

    openModal(exam ? 'Editar examen' : 'Nuevo examen', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const subjId = parseInt(f.get('subject_id')) || (exam ? exam.subject_id : activeSubjId);
        const dateInput = f.get('date');
        if (!dateInput) { showToast('La fecha es obligatoria'); return; }

        const rawGrade = f.get('grade');
        const parsedGrade = (rawGrade !== null && rawGrade !== '' && !isNaN(parseFloat(rawGrade))) ? parseFloat(rawGrade) : null;

        const data = {
            subject_id: subjId,
            type: f.get('type') || 'Parcial',
            date: dateInput,
            time: f.get('time') || null,
            topic: f.get('topic') || null,
            grade: parsedGrade,
            status: f.get('status') || 'pending'
        };

        const res = exam ? await api(eel.update_exam, exam.id, data) : await api(eel.create_exam, data);
        if (res && res.ok) {
            showToast(exam ? 'Examen actualizado' : 'Examen creado');
            closeModal();
            navigate('university');
        } else {
            showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
        }
    };
}

function showAssignmentForm(subjectId) {
    showAssignmentModal(null, subjectId);
}

function showAssignmentModal(assign, subjectId) {
    const subjects = window.__uniSubjects || [];
    const activeSubjId = assign ? assign.subject_id : (subjectId || (subjects[0] ? subjects[0].id : null));

    const subjOptions = subjects.map(s =>
        `<option value="${s.id}" ${s.id == activeSubjId ? 'selected' : ''}>${esc(s.name)}</option>`
    ).join('');

    const dateVal = assign && assign.due_date ? assign.due_date.split('T')[0].split(' ')[0] : '';
    const gradeVal = assign && assign.grade !== null && assign.grade !== undefined && assign.grade !== '' ? assign.grade : '';

    const html = `<form id="modalForm" onsubmit="event.preventDefault(); document.getElementById('modalSave').click();">
        <div class="form-group"><label>Materia *</label><select class="form-control" name="subject_id" required>
            ${subjOptions}
        </select></div>
        <div class="form-group"><label>Título del TP *</label><input class="form-control" name="title" value="${esc(assign ? assign.title : '')}" placeholder="ej. TP 5: Péndulo Balístico" required></div>
        <div class="form-group"><label>Descripción / Consigna</label><textarea class="form-control" name="description" placeholder="Detalles de entrega, formato...">${esc(assign ? (assign.description || '') : '')}</textarea></div>
        <div class="form-row">
            <div class="form-group"><label>Fecha de Entrega</label><input type="date" class="form-control" name="due_date" value="${dateVal}"></div>
            <div class="form-group"><label>Grupo / Modalidad</label><input class="form-control" name="group_name" value="${esc(assign ? (assign.group_name || '') : '')}" placeholder="ej. Grupo 6 / Individual"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Nota (0 a 10)</label><input type="number" step="0.5" min="0" max="10" class="form-control" name="grade" value="${gradeVal}" placeholder="ej. 9"></div>
            <div class="form-group"><label>Estado</label><select class="form-control" name="status">
                <option value="pending" ${!assign || assign.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                <option value="submitted" ${assign && assign.status === 'submitted' ? 'selected' : ''}>Entregado</option>
                <option value="graded" ${assign && assign.status === 'graded' ? 'selected' : ''}>Corregido</option>
            </select></div>
        </div>
        ${assign ? `
        <div style="margin-top:20px;padding-top:14px;border-top:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center">
            <button type="button" class="btn btn-ghost" style="color:var(--rose,#ef4444);border:1px solid rgba(239,68,68,0.25)" onclick="deleteAssignment(${assign.id})">🗑️ Eliminar TP</button>
            <span style="font-size:0.75rem;color:var(--text-muted)">ID #${assign.id}</span>
        </div>` : ''}
    </form>`;

    openModal(assign ? 'Editar TP' : 'Nuevo TP', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const subjId = parseInt(f.get('subject_id')) || (assign ? assign.subject_id : activeSubjId);
        const titleVal = f.get('title');
        if (!titleVal) { showToast('El título es obligatorio'); return; }

        const rawGrade = f.get('grade');
        const parsedGrade = (rawGrade !== null && rawGrade !== '' && !isNaN(parseFloat(rawGrade))) ? parseFloat(rawGrade) : null;

        const data = {
            subject_id: subjId,
            title: titleVal,
            description: f.get('description') || null,
            due_date: f.get('due_date') || null,
            group_name: f.get('group_name') || null,
            grade: parsedGrade,
            status: f.get('status') || 'pending'
        };

        const res = assign ? await api(eel.update_assignment, assign.id, data) : await api(eel.create_assignment, data);
        if (res && res.ok) {
            showToast(assign ? 'TP actualizado' : 'TP creado');
            closeModal();
            navigate('university');
        } else {
            showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
        }
    };
}

// ===================== PERSONAL (UNIFICADO CON SALUD) =====================
async function renderPersonal(el) {
    let tab = state.personalTab || 'routine';
    if (tab === 'tasks') tab = 'progress';
    const tabs = [
        { id: 'routine', label: '🏋️‍♀️ Mi Rutina' },
        { id: 'progress', label: '📈 Progreso y Hábitos' },
        { id: 'injections', label: '💉 Inyecciones (TRH)' },
        { id: 'measurements', label: '📏 Medidas Corporales' },
    ];

    let actionBtn = '';
    let subtitle = 'Entrenamiento y hábitos';
    if (tab === 'routine') {
        actionBtn = '<button class="btn btn-primary" onclick="showWorkoutDayForm()">+ Nuevo día</button>';
        subtitle = 'Entrenamiento y rutina semanal';
    } else if (tab === 'progress') {
        actionBtn = '<button class="btn btn-primary" onclick="showPersonalTaskForm()">+ Tarea</button><button class="btn btn-secondary" onclick="showHabitForm()">+ Hábito</button>';
        subtitle = 'Hábitos, tareas y evolución en el gimnasio';
    } else if (tab === 'injections') {
        actionBtn = '<button class="btn btn-primary" onclick="showInjectionForm()">+ Registrar dosis</button>';
        subtitle = 'Terapia de Reemplazo Hormonal (E₂)';
    } else if (tab === 'measurements') {
        actionBtn = '<button class="btn btn-secondary" onclick="showMeasurementGoalsModal()">🎯 Metas</button><button class="btn btn-primary" onclick="showMeasurementForm()">+ Medida</button>';
        subtitle = 'Registro antropométrico y evolución corporal';
    }

    let html = `<div class="page-header">
        <div><h1>Personal</h1><div class="subtitle">${subtitle}</div></div>
        <div class="page-actions">${actionBtn}</div>
    </div>
    <div class="subnav">
        ${tabs.map(t => `<button class="subnav-item${tab === t.id ? ' active' : ''}" onclick="switchPersonalTab('${t.id}')">${t.label}</button>`).join('')}
    </div>
    <div id="personalContent"></div>`;

    el.innerHTML = html;
    const content = el.querySelector('#personalContent');

    if (tab === 'routine') {
        await renderPersonalRoutine(content);
    } else if (tab === 'progress') {
        await renderPersonalProgress(content);
    } else if (tab === 'injections' || tab === 'measurements') {
        const [injections, measurements, proj, goals, e2StockRaw, nextLabRaw] = await Promise.all([
            api(eel.get_injections),
            api(eel.get_body_measurements),
            api(eel.get_estradiol_projection),
            api(eel.get_measurement_goals),
            api(eel.get_config, 'estradiol_stock'),
            api(eel.get_config, 'next_lab_date')
        ]);
        state.measurementGoals = goals || {};
        state.lastMeasurementsList = measurements || [];
        state.estradiolStock = (e2StockRaw !== null && e2StockRaw !== undefined && e2StockRaw !== '') ? parseInt(e2StockRaw) : null;
        state.nextLabDate = nextLabRaw || '';

        if (tab === 'injections') {
            renderHealthInjections(content, injections || [], proj || {});
        } else {
            renderHealthMeasurements(content, measurements || [], state.measurementGoals);
        }
    }
}

function switchPersonalTab(tab) {
    state.personalTab = tab;
    if (tab === 'injections' || tab === 'measurements') {
        state.healthTab = tab;
    }
    navigate('personal');
}

// --- WORKOUT: ROUTINE & LIVE PLAYER ---
function fmtSec(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

// --- AUDIO, HAPTICS & NOTIFICATIONS (iPhone / PWA / Desktop) ---
let __sharedAudioCtx = null;
let __audioUnlocked = false;
let __swRegistration = null;

function initAudioAndNotifications() {
    try {
        // 'ambient' mixes our chime on top of Spotify / Apple Music / YouTube without ever pausing your music!
        if (navigator.audioSession) {
            navigator.audioSession.type = 'ambient';
        }
    } catch (_) {}

    // Create hidden iOS 17.4+ / iOS 18 Taptic Engine switch element
    if (!document.getElementById('iosHapticLabel')) {
        const lbl = document.createElement('label');
        lbl.id = 'iosHapticLabel';
        lbl.setAttribute('aria-hidden', 'true');
        lbl.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
        const inp = document.createElement('input');
        inp.type = 'checkbox';
        inp.setAttribute('switch', '');
        lbl.appendChild(inp);
        document.body.appendChild(lbl);
    }

    // Unlock WebAudio on first touch/click anywhere in the app (does NOT pause background music)
    const onceUnlock = () => {
        unlockAudioOnUserTap();
    };
    document.addEventListener('touchstart', onceUnlock, { passive: true, once: true });
    document.addEventListener('click', onceUnlock, { passive: true, once: true });

    // Register Service Worker for native iOS / Android / Desktop notifications
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
            __swRegistration = reg;
        }).catch(() => {});
    }

    // Keep workout timer & rest countdown synced when returning from background/lockscreen, and check morning notification
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (state.activeWorkout) syncActiveWorkoutTimers();
            checkSmartDailyNotifications();
        }
    });

    scheduleDailyNotificationTimer();
    setInterval(() => checkSmartDailyNotifications(), 60000);
}

function scheduleDailyNotificationTimer() {
    if (window.__dailyNotifTimer) {
        clearTimeout(window.__dailyNotifTimer);
        window.__dailyNotifTimer = null;
    }
    const notifTime = localStorage.getItem('nicole_daily_notif_time') || '09:00';
    const parts = notifTime.split(':').map(Number);
    const targetH = isNaN(parts[0]) ? 9 : parts[0];
    const targetM = isNaN(parts[1]) ? 0 : parts[1];
    const now = new Date();
    const todayTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetH, targetM, 0, 0);

    let nextTarget = todayTarget;
    const lastCheck = localStorage.getItem('nicole_last_notif_date');
    const today = todayStr();

    if (now.getTime() >= todayTarget.getTime() || lastCheck === today) {
        nextTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, targetH, targetM, 0, 0);
    }

    const msUntil = Math.max(1000, nextTarget.getTime() - now.getTime());
    window.__dailyNotifTimer = setTimeout(() => {
        checkSmartDailyNotifications();
    }, msUntil);
}

function unlockAudioOnUserTap() {
    try {
        if (navigator.audioSession) {
            navigator.audioSession.type = 'ambient';
        }
    } catch (_) {}
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            if (!__sharedAudioCtx) __sharedAudioCtx = new AudioCtx();
            if (__sharedAudioCtx.state === 'suspended') {
                __sharedAudioCtx.resume();
            }
            if (!__audioUnlocked) {
                const buf = __sharedAudioCtx.createBuffer(1, 1, 22050);
                const src = __sharedAudioCtx.createBufferSource();
                src.buffer = buf;
                src.connect(__sharedAudioCtx.destination);
                src.start(0);
                __audioUnlocked = true;
            }
        }
    } catch (_) {}
}

function triggerHaptic(strongBurst = false) {
    // 1. Standard Vibration API (Android)
    try {
        if (navigator.vibrate) {
            navigator.vibrate(strongBurst ? [250, 100, 250, 100, 350] : [70]);
        }
    } catch (_) {}
    // 2. iOS 17.4+ / iOS 18 Taptic Engine Switch Haptic (iPhone)
    try {
        const lbl = document.getElementById('iosHapticLabel');
        if (lbl) {
            lbl.click();
            if (strongBurst) {
                [80, 160, 260, 360, 460].forEach(ms => {
                    setTimeout(() => { try { lbl.click(); } catch (_) {} }, ms);
                });
            }
        }
    } catch (_) {}
}

function playBeep(withRestNotification = false) {
    triggerHaptic(true);

    try {
        // Keep 'ambient' so Spotify / Apple Music / YouTube never pauses
        if (navigator.audioSession) {
            navigator.audioSession.type = 'ambient';
        }
    } catch (_) {}

    // Play pure WebAudio chime + low sub-bass thump (mixes over music without pausing it)
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            if (!__sharedAudioCtx) __sharedAudioCtx = new AudioCtx();
            if (__sharedAudioCtx.state === 'suspended') __sharedAudioCtx.resume();
            const playTone = (freq, startOffset, duration, peakGain = 0.42, type = 'triangle') => {
                const osc = __sharedAudioCtx.createOscillator();
                const gain = __sharedAudioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, __sharedAudioCtx.currentTime + startOffset);
                gain.gain.setValueAtTime(peakGain, __sharedAudioCtx.currentTime + startOffset);
                gain.gain.exponentialRampToValueAtTime(0.008, __sharedAudioCtx.currentTime + startOffset + duration);
                osc.connect(gain);
                gain.connect(__sharedAudioCtx.destination);
                osc.start(__sharedAudioCtx.currentTime + startOffset);
                osc.stop(__sharedAudioCtx.currentTime + startOffset + duration);
            };
            // 3-note ascending chime that cuts clearly over music without pausing it
            playTone(880, 0.00, 0.18, 0.40, 'triangle');
            playTone(1174.66, 0.19, 0.20, 0.42, 'triangle');
            playTone(1479.98, 0.39, 0.32, 0.48, 'triangle');
            // Subtle tactile sub-bass thump (70Hz) for headphones/speakers
            playTone(72, 0.00, 0.15, 0.50, 'sine');
            playTone(72, 0.19, 0.15, 0.50, 'sine');
            playTone(85, 0.39, 0.25, 0.55, 'sine');
        }
    } catch (_) {}

    // La notificación de fin de descanso la dispara únicamente el Service Worker
    // (programada en startRestTimer), así no se duplica.
}

async function sendLocalNotification(title, body, tag = 'nicole-general', url = '/') {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    try {
        const reg = __swRegistration || (navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null);
        if (reg && reg.active) {
            reg.active.postMessage({ type: 'SHOW_NOTIFICATION', title, body, tag, url });
            return true;
        }
        if (reg && typeof reg.showNotification === 'function') {
            await reg.showNotification(title, {
                body,
                icon: '/apple-touch-icon.png',
                badge: '/apple-touch-icon.png',
                tag,
                renotify: true,
                vibrate: [250, 100, 250],
                silent: false,
                data: { url }
            });
            return true;
        }
        new Notification(title, { body, icon: '/apple-touch-icon.png', tag });
        return true;
    } catch (_) {
        return false;
    }
}

async function scheduleRestNotificationInSW(seconds, exerciseName = '') {
    if (localStorage.getItem('nicole_notif_rest') === '0') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        const reg = __swRegistration || (navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null);
        if (reg && reg.active) {
            reg.active.postMessage({
                type: 'SCHEDULE_REST_NOTIFICATION',
                delayMs: Math.max(1000, seconds * 1000),
                title: '⏰ ¡Descanso terminado!',
                body: exerciseName ? `Sigue con ${exerciseName} 💪` : '¡Tiempo cumplido! A por la siguiente serie 💪'
            });
        }
    } catch (_) {}
}

async function cancelRestNotificationInSW() {
    try {
        const reg = __swRegistration || (navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null);
        if (reg && reg.active) {
            reg.active.postMessage({ type: 'CANCEL_REST_NOTIFICATION' });
        }
    } catch (_) {}
}

async function requestNotificationPermission() {
    unlockAudioOnUserTap();
    triggerHaptic(false);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (!('Notification' in window)) {
        if (isIOS && !isStandalone) {
            showToast('📲 En iPhone: abre la app desde el ícono de "Pantalla de inicio" para activar notificaciones');
        } else {
            showToast('Tu navegador no permite notificaciones web en esta vista');
        }
        return;
    }

    try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            playBeep(false);
            await sendLocalNotification(
                '✨ Notificaciones activadas',
                'Te avisaré cuando termine tu descanso de serie y en tus recordatorios importantes 💖',
                'nicole-welcome'
            );
            showToast('🔔 ¡Notificaciones activadas!');
            checkSmartDailyNotifications(true);
        } else if (perm === 'denied') {
            showToast('Permiso denegado. Actívalo en Ajustes > Notificaciones de tu teléfono.');
        }
        if (state.view === 'settings') navigate('settings');
        else if (state.view === 'personal') navigate('personal');
    } catch (e) {
        showToast('No se pudo solicitar permiso: ' + e.message);
    }
}
window.requestNotificationPermission = requestNotificationPermission;

async function testSoundAndNotification() {
    unlockAudioOnUserTap();
    playBeep(false);
    if ('Notification' in window && Notification.permission === 'granted') {
        await sendLocalNotification(
            '🔔 Prueba de alerta · Nicole',
            '¡El sonido, la vibración y las notificaciones están funcionando perfecto! 💪✨',
            'nicole-test'
        );
        showToast('🔊 Sonido, vibración y notificación enviados');
    } else {
        showToast('🔊 Sonido y vibración probados (activa notificaciones para recibir alertas)');
    }
}
window.testSoundAndNotification = testSoundAndNotification;

function toggleNotifPref(key, checked) {
    localStorage.setItem(key, checked ? '1' : '0');
    showToast('Preferencia guardada');
}
window.toggleNotifPref = toggleNotifPref;

function changeDailyNotifTime(val) {
    if (!val) return;
    localStorage.setItem('nicole_daily_notif_time', val);
    if (typeof eel !== 'undefined' && eel.set_config) {
        api(eel.set_config, 'daily_notif_time', val).catch(() => {});
    }
    scheduleDailyNotificationTimer();
    showToast(`⏰ Resumen diario programado para las ${val}`);
}
window.changeDailyNotifTime = changeDailyNotifTime;

async function checkSmartDailyNotifications(force = false) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const today = todayStr();
    const lastCheck = localStorage.getItem('nicole_last_notif_date');
    if (!force && lastCheck === today) {
        scheduleDailyNotificationTimer();
        return;
    }

    const notifTime = localStorage.getItem('nicole_daily_notif_time') || '09:00';
    const parts = notifTime.split(':').map(Number);
    const targetH = isNaN(parts[0]) ? 9 : parts[0];
    const targetM = isNaN(parts[1]) ? 0 : parts[1];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const targetMinutes = targetH * 60 + targetM;

    if (!force && currentMinutes < targetMinutes) {
        // Aún no es la hora fijada (09:00 AM). Programar timer.
        scheduleDailyNotificationTimer();
        return;
    }

    try {
        const [proj, deadlines, stockRaw, labDate, cosplays, weatherSummary] = await Promise.all([
            api(eel.get_estradiol_projection).catch(() => null),
            api(eel.get_soon_deadlines).catch(() => []),
            api(eel.get_config, 'estradiol_stock').catch(() => null),
            api(eel.get_config, 'next_lab_date').catch(() => null),
            api(eel.get_cosplay_projects).catch(() => []),
            (localStorage.getItem('nicole_notif_weather') !== '0') ? getQuickWeatherNotificationText().catch(() => null) : Promise.resolve(null),
        ]);

        const alerts = [];

        // 0. Clima de la mañana
        if (weatherSummary) {
            alerts.push(weatherSummary);
        }

        // 1. Health alerts (Estradiol injection, lab, stock)
        if (localStorage.getItem('nicole_notif_health') !== '0') {
            if (proj && (proj.next_dose_date || proj.next_injection_date)) {
                const d = daysUntil(proj.next_dose_date || proj.next_injection_date);
                if (d !== null && d <= 0) alerts.push(d < 0 ? '💉 Tu inyección de Estradiol está atrasada' : '💉 Hoy toca tu inyección de Estradiol');
                else if (d === 1) alerts.push('💉 Mañana te toca inyección de Estradiol');
            }
            if (labDate) {
                const dl = daysUntil(labDate);
                if (dl !== null && dl >= 0 && dl <= 3) {
                    alerts.push(dl === 0 ? '🧪 ¡Hoy tenés control de laboratorio!' : `🧪 Control de laboratorio en ${dl} día${dl === 1 ? '' : 's'}`);
                }
            }
            const stock = (stockRaw !== null && stockRaw !== undefined && stockRaw !== '') ? parseInt(stockRaw) : null;
            if (stock !== null && stock <= 1) {
                alerts.push(`📦 Queda${stock === 1 ? ' 1 ampolla' : 'n 0 ampollas'} de Estradiol en stock`);
            }
        }

        // 2. Tareas y entregas de cosplay para hoy / mañana
        if (localStorage.getItem('nicole_notif_tasks') !== '0') {
            const dayDiff = (dateStr) => {
                if (!dateStr) return null;
                const p = String(dateStr).slice(0, 10).split('-').map(Number);
                if (p.length !== 3 || p.some(isNaN)) return null;
                const t = new Date();
                const a = new Date(t.getFullYear(), t.getMonth(), t.getDate());
                const b = new Date(p[0], p[1] - 1, p[2]);
                return Math.round((b - a) / 86400000);
            };
            const urgentTasks = (Array.isArray(deadlines) ? deadlines : []).filter(item => {
                const d = dayDiff(item.due_date || item.date);
                return d !== null && d >= 0 && d <= 1;
            });
            if (urgentTasks.length > 0) {
                const names = urgentTasks.slice(0, 2).map(u => u.title).join(', ');
                alerts.push(`📌 Tareas para hoy/mañana: ${names}${urgentTasks.length > 2 ? ` (+${urgentTasks.length - 2} más)` : ''}`);
            }
            const urgentCosplays = (Array.isArray(cosplays) ? cosplays : []).filter(p => {
                if (p.status === 'entregado') return false;
                const d = dayDiff(p.due_date);
                return d !== null && d >= 0 && d <= 2;
            });
            if (urgentCosplays.length > 0) {
                const names = urgentCosplays.slice(0, 2).map(p => p.character_name).join(', ');
                alerts.push(`🧵 Entrega de cosplay próxima: ${names}${urgentCosplays.length > 2 ? ` (+${urgentCosplays.length - 2} más)` : ''}`);
            }
        }

        if (alerts.length === 0) {
            alerts.push('✨ ¡Buen día Nicole! Todo al día y en orden por acá');
        }

        await sendLocalNotification(
            '🌸 Resumen de hoy · Nicole',
            alerts.join(' · '),
            'nicole-daily-' + today
        );
        localStorage.setItem('nicole_last_notif_date', today);
        scheduleDailyNotificationTimer();
        if (force) {
            showToast('🔔 Resumen diario enviado');
        }
    } catch (_) {}
}

async function renderPersonalRoutine(el) {
    const [routine, history] = await Promise.all([
        api(eel.get_workout_routine),
        api(eel.get_workout_history)
    ]);
    const days = routine || [];
    const hist = history || [];
    window.__workoutRoutine = days;

    // Suggested next workout day based on last completed session
    let suggestedDayId = days.length > 0 ? days[0].id : null;
    if (hist.length > 0 && days.length > 0) {
        const lastDayId = hist[0].day_id;
        const idx = days.findIndex(d => d.id === lastDayId);
        if (idx >= 0) {
            suggestedDayId = days[(idx + 1) % days.length].id;
        }
    }
    window.__suggestedDayId = suggestedDayId;

    if (!state.selectedRoutineDayId || !days.some(d => d.id === state.selectedRoutineDayId)) {
        state.selectedRoutineDayId = suggestedDayId;
    }

    let html = `<div id="liveWorkoutMount">${state.activeWorkout ? buildActiveWorkoutPlayer(state.activeWorkout) : ''}</div>`;

    // Weekly consistency strip (Mon - Sun)
    const trainedDates = new Set(hist.map(h => h.date));
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    let weekTrainedCount = 0;
    let weekCellsHtml = '';
    for (let i = 0; i < 7; i++) {
        const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
        const ds = localDateStr(d);
        const isTrained = trainedDates.has(ds);
        const isToday = ds === todayStr();
        if (isTrained) weekTrainedCount++;
        weekCellsHtml += `<div style="flex:1;min-width:38px;text-align:center;padding:6px 4px;border-radius:10px;background:${isTrained ? 'var(--primary-light)' : 'var(--bg)'};border:1px solid ${isToday ? 'var(--primary)' : 'var(--border-light)'}">
            <div style="font-size:0.68rem;color:var(--text-muted);font-weight:600">${dayLabels[i]}</div>
            <div style="font-size:0.95rem;margin-top:2px">${isTrained ? '🔥' : (isToday ? '✨' : '·')}</div>
        </div>`;
    }

    const notifGranted = ('Notification' in window) && Notification.permission === 'granted';
    html += `<div class="card" style="margin-bottom:14px;padding:12px 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
            <span style="font-size:0.8rem;font-weight:700;color:var(--text-secondary)">🔥 Constancia de esta semana</span>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                ${!notifGranted ? `<button class="btn btn-ghost btn-sm" style="font-size:0.72rem;padding:3px 9px;border:1px solid var(--border)" onclick="requestNotificationPermission()">🔔 Activar avisos</button>` : ''}
                <button class="btn btn-ghost btn-sm" style="font-size:0.72rem;padding:3px 9px" title="Probar sonido y vibración" onclick="testSoundAndNotification()">🔊</button>
                <span class="tag ${weekTrainedCount >= 4 ? 'tag-sage' : 'tag-primary'}" style="font-size:0.72rem">${weekTrainedCount} / 6 días entrenados</span>
            </div>
        </div>
        <div style="display:flex;gap:6px;overflow-x:auto">${weekCellsHtml}</div>
    </div>`;

    if (days.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">🏋️‍♀️</div><h3>Sin días de rutina</h3><p>Crea tu primer día de entrenamiento</p></div>';
        el.innerHTML = html;
        return;
    }

    html += `<div id="routineDayViewMount">${buildRoutineDayViewHTML(days, state.selectedRoutineDayId, suggestedDayId)}</div>`;
    el.innerHTML = html;
}

function summarizeStretchNames(rawText, type) {
    if (!rawText) return '';
    const lines = String(rawText).split('\n').map(l => l.trim()).filter(Boolean);
    // Extract lines that are movement titles (not bullets starting with • or - and not timing footer starting with ⏱)
    const titles = [];
    for (const line of lines) {
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('⏱') || line.toLowerCase().startsWith('realiza estos')) continue;
        if (line.toLowerCase().startsWith('estiramientos post-entrenamiento')) continue;
        const cleanTitle = line.replace(/\s*\(.*?\)\s*$/, '').replace(/:$/, '').trim();
        if (cleanTitle && cleanTitle.length < 65) {
            titles.push(cleanTitle);
        }
    }
    if (titles.length > 0) {
        const suffix = type === 'warmup' ? ' (5 - 10 min)' : '';
        return titles.join(' · ') + suffix;
    }
    // Fallback if custom single-line note
    return lines[0];
}

function formatStretchGuideHTML(rawText, accentColor = 'var(--primary)') {
    if (!rawText) return '';
    const blocks = String(rawText).trim().split(/\n\s*\n/);
    let out = '<div style="display:flex;flex-direction:column;gap:12px">';
    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;
        if (lines.length === 1 && (lines[0].startsWith('⏱') || lines[0].toLowerCase().startsWith('realiza estos'))) {
            out += `<div style="padding:10px 14px;border-radius:10px;background:var(--primary-light);color:var(--text);font-size:0.88rem;font-weight:600">${esc(lines[0])}</div>`;
            continue;
        }
        const title = lines[0];
        const steps = lines.slice(1);
        out += `<div style="padding:14px 16px;border-radius:12px;background:var(--card);border:1px solid var(--border-light);border-left:4px solid ${accentColor}">
            <div style="font-weight:700;font-size:0.98rem;margin-bottom:${steps.length ? '8px' : '0'};color:var(--text)">${esc(title)}</div>`;
        if (steps.length > 0) {
            out += `<div style="display:flex;flex-direction:column;gap:6px;font-size:0.88rem;color:var(--text-secondary);line-height:1.45">`;
            for (const s of steps) {
                const cleanStep = s.replace(/^[•\-]\s*/, '');
                out += `<div style="display:flex;gap:8px;align-items:flex-start"><span style="color:${accentColor};font-weight:700">•</span><span>${esc(cleanStep)}</span></div>`;
            }
            out += `</div>`;
        }
        out += `</div>`;
    }
    out += '</div>';
    return out;
}

const EXERCISE_HOWTO_GUIDES = {
    'clamshells (almejas)': [
        'Acuéstate de lado con las rodillas flexionadas (unos 45°), los pies juntos y la banda justo encima de las rodillas.',
        'Apoya la cabeza en tu brazo y mantén la cadera apilada, sin rodar hacia atrás.',
        'Manteniendo los pies pegados, abre la rodilla de arriba como una almeja, sin mover la pelvis.',
        'Sostén 1 segundo arriba apretando el glúteo y baja lento (3 segundos). Haz todas las repeticiones y luego cambia de lado.'
    ],
    'abducción tumbada': [
        'Acuéstate de lado con el cuerpo en línea recta y el disco apoyado sobre el muslo de arriba (sujétalo con la mano).',
        'Flexiona levemente la pierna de abajo para estabilizarte.',
        'Sube la pierna de arriba estirada, con la punta mirando al frente (no hacia el techo), hasta unos 45°.',
        'Baja lento sin apoyar del todo y repite. Haz todas las repeticiones y cambia de lado.'
    ],
    'zancadas': [
        'Párate con las mancuernas a los costados y los pies a la altura de la cadera.',
        'Da un paso largo hacia adelante y baja hasta que ambas rodillas formen 90°.',
        'Mantén el torso derecho y la rodilla delantera alineada con el pie, sin pasar mucho la punta.',
        'Empuja con el talón de adelante para volver al inicio. Alterna las piernas o completa una y luego la otra.'
    ],
    'abducción sentada': [
        'Siéntate en una silla o banco con la espalda derecha y la banda fuerte justo encima de las rodillas.',
        'Mantén los pies apoyados y las rodillas juntas al inicio.',
        'Abre las rodillas hacia afuera contra la resistencia de la banda, apretando el glúteo.',
        'Sostén 1 segundo abierta y vuelve lento sin soltar la tensión de la banda.'
    ],
    'levantamiento de piernas': [
        'Acuéstate boca arriba con las piernas estiradas y las manos bajo la cadera o a los lados.',
        'Pega la zona lumbar al piso contrayendo el abdomen.',
        'Sube ambas piernas juntas hasta formar 90° con el torso.',
        'Baja lento sin tocar el piso y sin despegar la espalda baja. Si se arquea, flexiona un poco las rodillas.'
    ],
    'stomach vacuums': [
        'Puedes hacerlo de pie, en cuatro apoyos o acostada. En cuatro apoyos es lo más fácil para empezar.',
        'Exhala todo el aire por la boca hasta vaciar los pulmones.',
        'Sin inhalar, mete el ombligo hacia la columna lo más que puedas, como si quisieras tocar la espalda con él.',
        'Sostén el tiempo indicado respirando superficialmente por el pecho. Relaja y repite.'
    ],
    'plancha frontal (plank)': [
        'Apoya los antebrazos en el piso con los codos justo debajo de los hombros y las piernas estiradas.',
        'Forma una línea recta de cabeza a talones: aprieta abdomen y glúteos.',
        'No dejes caer la cadera ni la subas. Mira un punto del piso entre tus manos.',
        'Respira con calma y sostén hasta el fallo técnico (cuando la cadera empiece a caer, termina).'
    ],
    'plancha lateral': [
        'Acuéstate de lado y apoya el antebrazo con el codo justo debajo del hombro.',
        'Apila los pies (o pon el de arriba adelante para más equilibrio).',
        'Levanta la cadera hasta que el cuerpo quede en línea recta, apretando el abdomen.',
        'Sostén el tiempo indicado y cambia de lado.'
    ],
    'real hip thrust': [
        'Apoya la parte alta de la espalda (debajo de los omóplatos) en un banco o sillón estable, con la barra sobre la cadera (usa una almohadilla).',
        'Pies al ancho de la cadera, rodillas flexionadas a unos 90° arriba.',
        'Mete el mentón, mira hacia adelante y empuja con los talones hasta que el cuerpo quede recto de hombros a rodillas.',
        'Aprieta fuerte el glúteo 1-2 segundos arriba y baja controlado sin apoyar del todo.'
    ],
    'split squat (sentadilla dividida)': [
        'Párate en posición de zancada con un pie adelante y el otro atrás, pies fijos en el piso, mancuernas a los costados.',
        'Baja recto hacia el piso, doblando ambas rodillas hasta unos 90°, con el torso derecho.',
        'La rodilla de adelante sigue la línea del pie y el peso va sobre el talón delantero.',
        'Sube empujando con la pierna de adelante. Haz todas las repeticiones de un lado y luego cambia.'
    ],
    'peso muerto rumano (normal)': [
        'Párate con los pies al ancho de la cadera y una mancuerna en cada mano frente a los muslos.',
        'Rodillas apenas flexionadas y fijas; empuja la cadera hacia atrás como si cerraras una puerta con la cola.',
        'Baja las mancuernas pegadas a las piernas manteniendo la espalda recta hasta sentir el estirón en la parte trasera de los muslos.',
        'Sube empujando la cadera hacia adelante y apretando el glúteo arriba.'
    ],
    'caminata lateral (monster walks)': [
        'Coloca la banda fuerte sobre las rodillas (o los tobillos para más intensidad) y baja a un cuarto de sentadilla.',
        'Pies al ancho de la cadera, torso levemente inclinado y pecho arriba.',
        'Da pasos laterales amplios manteniendo la tensión de la banda en todo momento, sin juntar los pies.',
        'Camina 10 pasos hacia un lado y 10 de vuelta (20 en total) sin subir ni bajar la cadera.'
    ],
    'donkey kicks (patadas de burro)': [
        'Ponte en cuatro apoyos con manos bajo los hombros, rodillas bajo la cadera y la banda sobre los muslos o en el pie.',
        'Mantén la espalda neutra y el abdomen apretado.',
        'Empuja un talón hacia el techo manteniendo la rodilla a 90°, sin arquear la espalda baja.',
        'Aprieta el glúteo arriba 1 segundo y baja lento. Haz todas las repeticiones y cambia de pierna.'
    ],
    'patada lateral de pie': [
        'Párate derecha con la banda fuerte sobre las rodillas o los tobillos, apoyándote en una pared o silla si lo necesitas.',
        'Mantén el torso recto y el abdomen firme.',
        'Lleva la pierna libre hacia el costado con la punta al frente, sin inclinar el cuerpo.',
        'Vuelve lento y repite. Haz todas las repeticiones y cambia de lado.'
    ],
    'hip thrust acostada (puente)': [
        'Acuéstate boca arriba con las rodillas flexionadas y los pies apoyados al ancho de la cadera.',
        'Coloca la mancuerna pesada sobre la cadera sujetándola con ambas manos.',
        'Empuja con los talones y sube la cadera hasta formar una línea recta de hombros a rodillas.',
        'Aprieta el glúteo arriba 1-2 segundos y baja controlado sin descansar del todo en el piso.'
    ],
    'sentadilla copa (goblet squat)': [
        'Sostén la mancuerna verticalmente contra el pecho con ambas manos, pies un poco más abiertos que los hombros y puntas levemente hacia afuera.',
        'Pecho arriba y espalda recta.',
        'Baja llevando la cadera hacia atrás y abajo hasta que los muslos queden paralelos al piso o un poco más.',
        'Empuja con todo el pie para subir y aprieta glúteos arriba.'
    ],
    'zancadas inversas': [
        'Párate derecha con las mancuernas ligeras a los costados.',
        'Da un paso largo hacia atrás y baja hasta que ambas rodillas formen 90°.',
        'Mantén el torso recto y el peso en el talón de la pierna de adelante.',
        'Empuja con la pierna delantera para volver al inicio. Alterna las piernas.'
    ],
    'alcance de pies sentada': [
        'Siéntate en el piso con las piernas estiradas al frente y la espalda larga.',
        'Inhala alargando la columna y al exhalar inclínate desde la cadera hacia los pies.',
        'Lleva las manos hacia las piernas o los pies sin encorvar la espalda ni forzar.',
        'Mantén la posición respirando profundo y vuelve lento.'
    ],
    'apertura de pecho en marco de puerta': [
        'Párate en un marco de puerta con los antebrazos apoyados en los costados, codos a la altura de los hombros.',
        'Da un pequeño paso hacia adelante con un pie.',
        'Deja que el pecho avance suavemente por el marco hasta sentir el estiramiento en el pecho y los hombros.',
        'Mantén 30 segundos con el abdomen firme, sin arquear la espalda baja.'
    ],
    'flow de isquiotibiales': [
        'Párate con los pies separados al ancho de tus hombros.',
        'Agáchate en una sentadilla profunda y sujeta las puntas de tus pies (o tus tobillos si no llegas).',
        'Manteniendo las manos en tus pies, levanta la cadera hacia el techo e intenta estirar las rodillas lo máximo posible. Mantén la cabeza hacia abajo.',
        'Sostén esa posición estirada por 2 segundos.',
        'Vuelve a bajar la cadera hacia la posición de sentadilla profunda, levanta el pecho y mira hacia adelante.'
    ],
    'lunges para el psoas': [
        'Apoya una rodilla en el piso y pisa con el otro pie hacia adelante (ambas rodillas a 90 grados).',
        'Mantén la espalda completamente recta y contrae el abdomen.',
        'Empuja tu cadera suavemente hacia adelante, sin arquear la espalda baja ni inclinar el torso.',
        'Sostén la máxima tensión por 2 segundos y retrocede suavemente a la posición inicial.'
    ],
    'estiramiento 90-90': [
        'Siéntate en el piso con la pierna delantera flexionada a 90° frente a ti y la trasera a 90° hacia el costado.',
        'Mantén la espalda larga e inclina suavemente el torso hacia la pierna delantera (30 seg por lado).'
    ]
};

function buildRoutineDayViewHTML(days, selectedDayId, suggestedDayId) {
    const activeDay = days.find(d => d.id === selectedDayId) || days[0];
    if (!activeDay) return '';
    const activeIdx = days.findIndex(d => d.id === activeDay.id);
    const prevDay = days[(activeIdx - 1 + days.length) % days.length];
    const nextDay = days[(activeIdx + 1) % days.length];
    const isSuggested = activeDay.id === suggestedDayId;
    const exs = activeDay.exercises || [];

    // Selector bar with Day tabs + Prev/Next navigation
    let html = `<div class="routine-day-selector">
        <button type="button" class="btn btn-secondary btn-sm" style="height:52px;padding:0 14px;border-radius:var(--radius)" onclick="selectRoutineDay(${prevDay.id})" title="Día anterior">◀</button>`;

    for (const d of days) {
        const isCurrent = d.id === activeDay.id;
        const isToday = d.id === suggestedDayId;
        // Extract short title without "Día X:" prefix
        const shortName = (d.name || '').replace(/^D[íi]a\s*\d+\s*:\s*/i, '').trim() || d.name;
        html += `<button type="button" class="routine-day-tab${isCurrent ? ' active' : ''}" onclick="selectRoutineDay(${d.id})">
            <div class="day-tab-num">
                <span>Día ${d.day_number}</span>
                ${isToday ? `<span style="font-size:0.68rem;background:${isCurrent ? 'rgba(0,0,0,0.2)' : 'var(--primary-light)'};color:${isCurrent ? 'inherit' : 'var(--primary)'};padding:1px 6px;border-radius:99px">✨ Hoy</span>` : ''}
            </div>
            <div class="day-tab-title">${esc(shortName)}</div>
        </button>`;
    }

    html += `<button type="button" class="btn btn-secondary btn-sm" style="height:52px;padding:0 14px;border-radius:var(--radius)" onclick="selectRoutineDay(${nextDay.id})" title="Día siguiente">▶</button>
    </div>`;

    // Focused single-day card
    html += `<div class="routine-focus-card" style="${isSuggested ? 'border-color:var(--primary)' : ''}">
        <div class="routine-focus-header">
            <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                    <span class="tag tag-lavender">DÍA ${activeDay.day_number} DE ${days.length}</span>
                    ${isSuggested ? '<span class="tag tag-primary">✨ Toca entrenar hoy</span>' : ''}
                    <span style="font-size:0.8rem;color:var(--text-muted)">${exs.length} ejercicios principales</span>
                </div>
                <h2 style="font-size:1.45rem;font-weight:700;letter-spacing:-0.01em">${esc(activeDay.name)}</h2>
                ${activeDay.subtitle ? `<p style="font-size:0.95rem;color:var(--text-muted);margin-top:4px">${esc(activeDay.subtitle)}</p>` : ''}
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button type="button" class="btn btn-primary" style="padding:11px 22px;font-size:0.95rem" onclick="startLiveWorkout(${activeDay.id})">▶ Iniciar rutina del día</button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="showWorkoutExerciseForm(${activeDay.id})">+ Ejercicio</button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="showWorkoutDayForm(${activeDay.id})" title="Editar título y estiramientos de este día">✎ Editar día</button>
                <button type="button" class="btn btn-ghost btn-sm" onclick="deleteWorkoutDay(${activeDay.id})" title="Eliminar día">🗑️</button>
            </div>
        </div>`;

    if (activeDay.warmup_notes) {
        const shortWarmup = summarizeStretchNames(activeDay.warmup_notes, 'warmup');
        html += `<div class="stretch-banner" style="padding:10px 14px;white-space:normal"><strong>🔥 Calentamiento:</strong> ${esc(shortWarmup)}</div>`;
    }

    if (exs.length === 0) {
        html += `<div class="empty-state" style="padding:32px"><p>No hay ejercicios en este día.</p><button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="showWorkoutExerciseForm(${activeDay.id})">+ Agregar ejercicio</button></div>`;
    } else {
        html += `<div class="routine-ex-list">`;
        exs.forEach((ex, idx) => {
            html += `<div class="routine-ex-item">
                <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:0">
                    <div class="routine-ex-num">${idx + 1}</div>
                    <div class="routine-ex-info">
                        <div class="routine-ex-name">${esc(ex.name)}</div>
                        <div class="routine-ex-meta">
                            <span class="tag" style="background:var(--border-light);font-size:0.74rem">${esc(ex.phase || 'Principal')}</span>
                            <span style="font-size:0.84rem;color:var(--text-muted)">🏋️ ${esc(ex.equipment || 'Peso corporal')}</span>
                            <span style="font-size:0.82rem;color:var(--text-light)">· ⏱ ${ex.rest_seconds || 60}s</span>
                            ${ex.last_weight_kg > 0 ? `<span class="tag tag-primary" style="font-size:0.74rem">Último: ${ex.last_weight_kg} kg</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                    <div class="routine-ex-target">${ex.sets} × ${esc(ex.reps_text || '')}</div>
                    <div style="display:flex;gap:2px">
                        <button type="button" class="btn btn-ghost btn-sm" onclick="showWorkoutExerciseForm(${activeDay.id}, ${ex.id})" title="Editar">✎</button>
                        <button type="button" class="btn btn-ghost btn-sm" onclick="deleteWorkoutExercise(${activeDay.id ? ex.id : ex.id})" title="Quitar">✕</button>
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (activeDay.cooldown_notes) {
        const shortCooldown = summarizeStretchNames(activeDay.cooldown_notes, 'cooldown');
        html += `<div class="stretch-banner" style="background:var(--lavender-light);border-left-color:#C9B3F9;padding:10px 14px;white-space:normal"><strong>🧘‍♀️ Estiramientos:</strong> ${esc(shortCooldown)}</div>`;
    }

    html += `</div>`;
    return html;
}

function selectRoutineDay(dayId) {
    state.selectedRoutineDayId = dayId;
    const mount = document.getElementById('routineDayViewMount');
    const days = window.__workoutRoutine || [];
    if (mount && days.length > 0) {
        mount.innerHTML = buildRoutineDayViewHTML(days, dayId, window.__suggestedDayId);
    } else {
        navigate('personal');
    }
}

function refreshLiveWorkoutDOM() {
    const mount = document.getElementById('liveWorkoutMount');
    if (mount) {
        mount.innerHTML = state.activeWorkout ? buildActiveWorkoutPlayer(state.activeWorkout) : '';
    } else {
        const player = document.getElementById('liveWorkoutPlayer');
        if (player && state.activeWorkout) {
            player.outerHTML = buildActiveWorkoutPlayer(state.activeWorkout);
        } else {
            navigate('personal');
        }
    }
}

function buildActiveWorkoutPlayer(aw) {
    let totalSets = 0, doneSets = 0;
    aw.exercises.forEach(ex => {
        ex.setRows.forEach(sr => {
            totalSets++;
            if (sr.done) doneSets++;
        });
    });
    const pct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

    // Build ordered steps: optional 'warmup', exercise indices 0..N-1, optional 'cooldown'
    const steps = [];
    if (aw.warmup) steps.push({ key: 'warmup', label: '🔥 Calentamiento' });
    aw.exercises.forEach((ex, idx) => {
        const allDone = ex.setRows.length > 0 && ex.setRows.every(sr => sr.done);
        const shortEx = ex.name.length > 20 ? ex.name.slice(0, 18) + '…' : ex.name;
        steps.push({
            key: idx,
            label: `${allDone ? '✓ ' : ''}${idx + 1}. ${shortEx}`,
            done: allDone,
        });
    });
    if (aw.cooldown) steps.push({ key: 'cooldown', label: '🧘‍♀️ Estiramiento' });

    if (aw.currentStep === undefined || !steps.some(s => String(s.key) === String(aw.currentStep))) {
        aw.currentStep = aw.warmup ? 'warmup' : (aw.exercises.length > 0 ? 0 : (steps[0]?.key ?? 0));
    }

    const curStepPos = steps.findIndex(s => String(s.key) === String(aw.currentStep));
    const prevStep = curStepPos > 0 ? steps[curStepPos - 1] : null;
    const nextStep = curStepPos >= 0 && curStepPos < steps.length - 1 ? steps[curStepPos + 1] : null;

    let html = `<div class="workout-player" id="liveWorkoutPlayer">
        <div class="workout-sticky-header">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
                <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        <span class="tag tag-primary" style="font-size:0.72rem">🔥 EN CURSO</span>
                        <span style="font-size:0.8rem;color:var(--text-muted);font-weight:600">${doneSets}/${totalSets} series (${pct}%)</span>
                    </div>
                    <h2 style="font-size:1.1rem;margin-top:2px">${esc(aw.dayName)}</h2>
                </div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <div class="timer-pill" title="Tiempo total de entrenamiento">⏱ <span id="awElapsedTimer">${fmtSec(aw.elapsedSec)}</span></div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="cancelLiveWorkout()">✕</button>
                    <button type="button" class="btn btn-primary btn-sm" onclick="finishLiveWorkout()">✓ Finalizar</button>
                </div>
            </div>

            <div style="height:5px;background:var(--border-light);border-radius:99px;overflow:hidden;margin-top:10px">
                <div style="height:100%;width:${pct}%;background:var(--primary);transition:width 0.3s ease"></div>
            </div>`;

    if (aw.restSec > 0) {
        html += `<div class="rest-overlay-bar" id="awRestBar">
            <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted)">⏳ Descanso:</span>
                <span style="font-size:1.35rem;font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums" id="awRestCountdown">${fmtSec(aw.restSec)}</span>
            </div>
            <div style="display:flex;gap:6px">
                <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 10px" onclick="adjustRestTimer(15)">+15s</button>
                <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 10px" onclick="adjustRestTimer(-15)">-15s</button>
                <button type="button" class="btn btn-primary btn-sm" style="padding:4px 12px" onclick="skipRestTimer()">Saltar ⏭</button>
            </div>
        </div>`;
    } else {
        html += `<div id="awRestBar" style="display:none"></div>`;
    }

    html += `</div>`; // end .workout-sticky-header

    // Stepper bar to switch between Warmup, Exercise 1..N, and Cooldown
    html += `<div class="workout-step-bar">`;
    steps.forEach(s => {
        const isActive = String(s.key) === String(aw.currentStep);
        html += `<button type="button" class="workout-step-pill${isActive ? ' active' : ''}${s.done ? ' done' : ''}" onclick="selectLiveWorkoutStep('${s.key}')">${esc(s.label)}</button>`;
    });
    html += `</div>`;

    // Render ONLY the currently selected step
    if (String(aw.currentStep) === 'warmup') {
        html += `<div class="card" style="background:var(--bg);padding:18px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
                <h3 style="font-size:1.15rem;margin:0">🔥 Calentamiento Pre-Ejercicio</h3>
                <div style="display:flex;gap:6px">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="startRestTimer(300, 'Calentamiento')">⏱ 5 min</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="startRestTimer(480, 'Calentamiento')">⏱ 8 min</button>
                </div>
            </div>
            ${formatStretchGuideHTML(aw.warmup, 'var(--primary)')}
        </div>`;
    } else if (String(aw.currentStep) === 'cooldown') {
        html += `<div class="card" style="background:var(--bg);padding:18px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
                <h3 style="font-size:1.15rem;margin:0">🧘‍♀️ Estiramientos Post-Ejercicio</h3>
                <div style="display:flex;gap:6px">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="startRestTimer(30, 'Estiramiento')">⏱ 30s</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="startRestTimer(45, 'Estiramiento')">⏱ 45s</button>
                </div>
            </div>
            ${formatStretchGuideHTML(aw.cooldown, '#C9B3F9')}
        </div>`;
    } else {
        const exIdx = parseInt(aw.currentStep) || 0;
        const ex = aw.exercises[exIdx];
        if (ex) {
            const isTimed = (ex.reps_text || '').toLowerCase().includes('seg');
            const exDoneCount = ex.setRows.filter(sr => sr.done).length;
            const exAllDone = exDoneCount === ex.setRows.length && ex.setRows.length > 0;
            const howToSteps = EXERCISE_HOWTO_GUIDES[(ex.name || '').toLowerCase().trim()] || null;

            html += `<div class="card" style="margin-bottom:10px;padding:18px;background:var(--bg);border:1.5px solid ${exAllDone ? 'var(--sage)' : 'var(--border)'}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;flex-wrap:wrap;gap:10px">
                    <div>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                            <span class="tag tag-primary">EJERCICIO ${exIdx + 1} DE ${aw.exercises.length}</span>
                            <span class="tag" style="background:var(--border-light)">${esc(ex.phase)}</span>
                            ${exAllDone ? '<span class="tag tag-sage">✓ Completado</span>' : ''}
                        </div>
                        <h3 style="font-size:1.25rem;font-weight:700;margin-top:4px">${esc(ex.name)}</h3>
                        <div style="font-size:0.88rem;color:var(--text-muted);margin-top:4px">
                            🎯 ${ex.sets} × ${esc(ex.reps_text)} · 🏋️ ${esc(ex.equipment || 'Peso corporal')} · ⏱ ${ex.rest_seconds || 60}s
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center">
                        ${isTimed ? `<button type="button" class="btn btn-secondary btn-sm" onclick="startRestTimer(${parseInt(ex.reps_text)||15})">⏱ ${parseInt(ex.reps_text)||15}s</button>` : ''}
                    </div>
                </div>
                ${howToSteps ? `<div style="margin-bottom:14px;padding:12px 14px;border-radius:10px;background:var(--card);border-left:3px solid var(--primary);font-size:0.85rem;color:var(--text-secondary)">
                    <div style="font-weight:700;color:var(--text);margin-bottom:4px">💡 Cómo hacerlo:</div>
                    ${howToSteps.map(st => `<div style="margin-top:3px">• ${esc(st)}</div>`).join('')}
                </div>` : ''}
                <div style="display:grid;grid-template-columns:44px 1fr 1fr 1fr 48px;gap:10px;padding:0 10px 6px;font-size:0.74rem;font-weight:600;color:var(--text-muted);text-transform:uppercase">
                    <div>Serie</div>
                    <div>Peso (kg)</div>
                    <div>Reps / Seg</div>
                    <div>Meta</div>
                    <div style="text-align:center">Listo</div>
                </div>`;

            ex.setRows.forEach((sr, sIdx) => {
                html += `<div class="set-row ${sr.done ? 'completed' : ''}">
                    <div style="font-weight:700">#${sr.setNumber}</div>
                    <div><input type="number" step="0.5" class="form-control" style="padding:7px 10px;font-size:0.9rem" value="${sr.weight_kg}" onchange="updateLiveSet(${exIdx},${sIdx},'weight_kg',this.value)"></div>
                    <div><input type="number" step="1" class="form-control" style="padding:7px 10px;font-size:0.9rem" value="${sr.reps}" onchange="updateLiveSet(${exIdx},${sIdx},'reps',this.value)"></div>
                    <div style="font-size:0.8rem;color:var(--text-muted)">${esc(ex.reps_text)}</div>
                    <div style="text-align:center">
                        <button type="button" class="btn ${sr.done ? 'btn-primary' : 'btn-secondary'} btn-sm" style="width:38px;height:36px;padding:0" onclick="toggleLiveSetDone(${exIdx},${sIdx})">✓</button>
                    </div>
                </div>`;
            });

            html += `<div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:0.8rem;color:var(--text-muted)">${exDoneCount} de ${ex.setRows.length} series</span>
                <button type="button" class="btn btn-ghost btn-sm" style="font-size:0.78rem" onclick="addLiveSetRow(${exIdx})">+ Serie extra</button>
            </div></div>`;
        }
    }

    // Bottom navigation between exercises (Prev / Next / Finish)
    html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-light)">
        ${prevStep ? `<button type="button" class="btn btn-secondary" onclick="selectLiveWorkoutStep('${prevStep.key}')">◀ Anterior</button>` : `<div></div>`}
        ${nextStep
            ? `<button type="button" class="btn btn-primary" onclick="selectLiveWorkoutStep('${nextStep.key}')">Siguiente: ${esc(nextStep.label)} ▶</button>`
            : `<button type="button" class="btn btn-primary" onclick="finishLiveWorkout()">🎉 Finalizar y Guardar</button>`}
    </div>`;

    html += `</div>`;
    return html;
}

function selectLiveWorkoutStep(stepKey) {
    if (!state.activeWorkout) return;
    state.activeWorkout.currentStep = (stepKey === 'warmup' || stepKey === 'cooldown') ? stepKey : parseInt(stepKey);
    refreshLiveWorkoutDOM();
}

function startLiveWorkout(dayId) {
    unlockAudioOnUserTap();
    triggerHaptic(false);

    const routine = window.__workoutRoutine || [];
    const day = routine.find(d => d.id === dayId);
    if (!day) return;

    state.selectedRoutineDayId = day.id;

    if (state.activeWorkout && state.activeWorkout.timerId) {
        clearInterval(state.activeWorkout.timerId);
    }
    if (state.activeWorkout && state.activeWorkout.restTimerId) {
        clearInterval(state.activeWorkout.restTimerId);
    }
    cancelRestNotificationInSW();

    const exList = (day.exercises || []).map(ex => {
        const numSets = Math.max(1, parseInt(ex.sets) || 3);
        const defaultReps = parseInt(ex.reps_text) || 12;
        const defaultWeight = parseFloat(ex.last_weight_kg ?? ex.default_weight_kg) || 0;
        const setRows = [];
        for (let i = 1; i <= numSets; i++) {
            setRows.push({
                setNumber: i,
                weight_kg: defaultWeight,
                reps: defaultReps,
                done: false,
            });
        }
        return { ...ex, setRows };
    });

    const startMs = Date.now();
    state.activeWorkout = {
        dayId: day.id,
        dayName: day.name,
        warmup: day.warmup_notes,
        cooldown: day.cooldown_notes,
        currentStep: day.warmup_notes ? 'warmup' : 0,
        startedAtMs: startMs,
        elapsedSec: 0,
        restSec: 0,
        restEndTime: 0,
        exercises: exList,
        timerId: setInterval(() => {
            if (!state.activeWorkout) return;
            state.activeWorkout.elapsedSec = Math.max(0, Math.floor((Date.now() - state.activeWorkout.startedAtMs) / 1000));
            const el = document.getElementById('awElapsedTimer');
            if (el) el.textContent = fmtSec(state.activeWorkout.elapsedSec);
        }, 1000),
        restTimerId: null,
    };

    refreshLiveWorkoutDOM();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function syncActiveWorkoutTimers() {
    if (!state.activeWorkout) return;
    if (state.activeWorkout.startedAtMs) {
        state.activeWorkout.elapsedSec = Math.max(0, Math.floor((Date.now() - state.activeWorkout.startedAtMs) / 1000));
        const el = document.getElementById('awElapsedTimer');
        if (el) el.textContent = fmtSec(state.activeWorkout.elapsedSec);
    }
    if (state.activeWorkout.restEndTime > 0) {
        const rem = Math.ceil((state.activeWorkout.restEndTime - Date.now()) / 1000);
        if (rem <= 0) {
            if (state.activeWorkout.restTimerId) clearInterval(state.activeWorkout.restTimerId);
            state.activeWorkout.restTimerId = null;
            state.activeWorkout.restSec = 0;
            state.activeWorkout.restEndTime = 0;
            playBeep(false);
            showToast('⏰ ¡Descanso terminado!');
            const bar = document.getElementById('awRestBar');
            if (bar) bar.style.display = 'none';
        } else {
            state.activeWorkout.restSec = rem;
            const cd = document.getElementById('awRestCountdown');
            if (cd) cd.textContent = fmtSec(rem);
        }
    }
}

function updateLiveSet(exIdx, sIdx, field, val) {
    if (!state.activeWorkout) return;
    const sr = state.activeWorkout.exercises[exIdx]?.setRows[sIdx];
    if (!sr) return;
    sr[field] = parseFloat(val) || 0;
}

function addLiveSetRow(exIdx) {
    if (!state.activeWorkout) return;
    const ex = state.activeWorkout.exercises[exIdx];
    if (!ex) return;
    const last = ex.setRows[ex.setRows.length - 1] || { weight_kg: 0, reps: 12 };
    ex.setRows.push({
        setNumber: ex.setRows.length + 1,
        weight_kg: last.weight_kg,
        reps: last.reps,
        done: false,
    });
    refreshLiveWorkoutDOM();
}

function toggleLiveSetDone(exIdx, sIdx) {
    unlockAudioOnUserTap();
    triggerHaptic(false);
    if (!state.activeWorkout) return;
    const ex = state.activeWorkout.exercises[exIdx];
    const sr = ex?.setRows[sIdx];
    if (!sr) return;
    sr.done = !sr.done;
    if (sr.done) {
        startRestTimer(ex.rest_seconds || 60, ex.name || '');
    } else {
        refreshLiveWorkoutDOM();
    }
}

function startRestTimer(seconds, exName = '') {
    unlockAudioOnUserTap();
    if (!state.activeWorkout) return;
    if (state.activeWorkout.restTimerId) clearInterval(state.activeWorkout.restTimerId);
    const sec = Math.max(5, parseInt(seconds) || 60);
    state.activeWorkout.restSec = sec;
    state.activeWorkout.restEndTime = Date.now() + sec * 1000;
    state.activeWorkout.restExName = exName;

    scheduleRestNotificationInSW(sec, exName);

    state.activeWorkout.restTimerId = setInterval(() => {
        if (!state.activeWorkout) return;
        const remaining = Math.ceil((state.activeWorkout.restEndTime - Date.now()) / 1000);
        state.activeWorkout.restSec = Math.max(0, remaining);
        const cd = document.getElementById('awRestCountdown');
        if (cd) cd.textContent = fmtSec(state.activeWorkout.restSec);
        if (state.activeWorkout.restSec <= 0) {
            clearInterval(state.activeWorkout.restTimerId);
            state.activeWorkout.restTimerId = null;
            state.activeWorkout.restEndTime = 0;
            playBeep(true);
            showToast('⏰ ¡Descanso terminado!');
            const bar = document.getElementById('awRestBar');
            if (bar) bar.style.display = 'none';
        }
    }, 500);
    refreshLiveWorkoutDOM();
}

function adjustRestTimer(delta) {
    unlockAudioOnUserTap();
    triggerHaptic(false);
    if (!state.activeWorkout) return;
    const nextSec = Math.max(0, (state.activeWorkout.restSec || 0) + delta);
    state.activeWorkout.restSec = nextSec;
    if (nextSec > 0) {
        state.activeWorkout.restEndTime = Date.now() + nextSec * 1000;
        scheduleRestNotificationInSW(nextSec, state.activeWorkout.restExName || '');
    } else {
        skipRestTimer();
        return;
    }
    const cd = document.getElementById('awRestCountdown');
    if (cd) cd.textContent = fmtSec(state.activeWorkout.restSec);
}

function skipRestTimer() {
    triggerHaptic(false);
    if (!state.activeWorkout) return;
    if (state.activeWorkout.restTimerId) clearInterval(state.activeWorkout.restTimerId);
    state.activeWorkout.restTimerId = null;
    state.activeWorkout.restSec = 0;
    state.activeWorkout.restEndTime = 0;
    cancelRestNotificationInSW();
    refreshLiveWorkoutDOM();
}

function cancelLiveWorkout() {
    if (!confirm('¿Cancelar el entrenamiento en curso sin guardar?')) return;
    if (state.activeWorkout?.timerId) clearInterval(state.activeWorkout.timerId);
    if (state.activeWorkout?.restTimerId) clearInterval(state.activeWorkout.restTimerId);
    cancelRestNotificationInSW();
    state.activeWorkout = null;
    navigate('personal');
}

async function finishLiveWorkout() {
    if (!state.activeWorkout) return;
    const aw = state.activeWorkout;
    const completedSets = [];
    aw.exercises.forEach(ex => {
        ex.setRows.forEach(sr => {
            if (sr.done) {
                completedSets.push({
                    exercise_name: ex.name,
                    set_number: sr.setNumber,
                    weight_kg: parseFloat(sr.weight_kg) || 0,
                    reps: parseInt(sr.reps) || 0,
                });
            }
        });
    });

    if (completedSets.length === 0) {
        if (!confirm('No marcaste ninguna serie con ✓. ¿Quieres marcar todas las series como completadas y guardar?')) return;
        aw.exercises.forEach(ex => {
            ex.setRows.forEach(sr => {
                completedSets.push({
                    exercise_name: ex.name,
                    set_number: sr.setNumber,
                    weight_kg: parseFloat(sr.weight_kg) || 0,
                    reps: parseInt(sr.reps) || 0,
                });
            });
        });
    }

    const durMin = Math.max(1, Math.round(aw.elapsedSec / 60));
    const res = await api(eel.log_workout_session, {
        day_id: aw.dayId,
        day_name: aw.dayName,
        date: todayStr(),
        duration_minutes: durMin,
        sets: completedSets,
    });

    if (aw.timerId) clearInterval(aw.timerId);
    if (aw.restTimerId) clearInterval(aw.restTimerId);
    state.activeWorkout = null;

    if (res && res.ok) {
        showToast('🎉 ¡Entrenamiento guardado y hábito marcado!');
        state.personalTab = 'progress';
        navigate('personal');
    } else {
        showToast('Error al guardar entrenamiento');
    }
}

// --- MODALS TO EDIT ROUTINE DAYS & EXERCISES ---
function showWorkoutDayForm(dayId) {
    const routine = window.__workoutRoutine || [];
    const day = dayId ? routine.find(d => d.id === dayId) : null;
    const html = `<form id="modalForm">
        <div class="form-row">
            <div class="form-group"><label>N° Día</label><input type="number" class="form-control" name="day_number" value="${day ? day.day_number : routine.length + 1}"></div>
            <div class="form-group"><label>Título del día *</label><input class="form-control" name="name" value="${esc(day ? day.name : '')}"></div>
        </div>
        <div class="form-group"><label>Subtítulo</label><input class="form-control" name="subtitle" value="${esc(day ? day.subtitle : '')}"></div>
        <div class="form-group"><label>🔥 Calentamiento</label><textarea class="form-control" name="warmup_notes" rows="2">${esc(day ? day.warmup_notes : '')}</textarea></div>
        <div class="form-group"><label>🧘‍♀️ Estiramientos</label><textarea class="form-control" name="cooldown_notes" rows="4">${esc(day ? day.cooldown_notes : '')}</textarea></div>
    </form>`;
    openModal(day ? 'Editar día' : 'Nuevo día', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = {
            id: day ? day.id : null,
            day_number: parseInt(f.get('day_number')) || 1,
            name: f.get('name'),
            subtitle: f.get('subtitle'),
            warmup_notes: f.get('warmup_notes'),
            cooldown_notes: f.get('cooldown_notes'),
        };
        if (!data.name) { showToast('El título es obligatorio'); return; }
        const res = await api(eel.save_workout_day, data);
        if (res && res.ok) { showToast('Día guardado'); closeModal(); navigate('personal'); }
    };
}

async function deleteWorkoutDay(dayId) {
    if (!confirm('¿Eliminar este día de rutina y sus ejercicios?')) return;
    await api(eel.delete_workout_day, dayId);
    showToast('Día eliminado');
    navigate('personal');
}

function showWorkoutExerciseForm(dayId, exId) {
    const routine = window.__workoutRoutine || [];
    const day = routine.find(d => d.id === dayId);
    const ex = (day && exId) ? (day.exercises || []).find(x => x.id === exId) : null;
    const html = `<form id="modalForm">
        <div class="form-row">
            <div class="form-group"><label>Fase</label><input class="form-control" name="phase" value="${esc(ex ? ex.phase : 'Principal')}"></div>
            <div class="form-group"><label>Descanso (seg)</label><input type="number" step="5" class="form-control" name="rest_seconds" value="${ex ? ex.rest_seconds : 60}"></div>
        </div>
        <div class="form-group"><label>Ejercicio *</label><input class="form-control" name="name" value="${esc(ex ? ex.name : '')}"></div>
        <div class="form-row">
            <div class="form-group"><label>Series</label><input type="number" class="form-control" name="sets" value="${ex ? ex.sets : 3}"></div>
            <div class="form-group"><label>Repeticiones / Tiempo</label><input class="form-control" name="reps_text" value="${esc(ex ? ex.reps_text : '12')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Equipo</label><input class="form-control" name="equipment" value="${esc(ex ? ex.equipment : '')}"></div>
            <div class="form-group"><label>Peso actual (kg)</label><input type="number" step="0.5" class="form-control" name="default_weight_kg" value="${ex ? ex.default_weight_kg : 0}"></div>
        </div>
    </form>`;
    openModal(ex ? 'Editar ejercicio' : 'Agregar ejercicio', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = {
            id: ex ? ex.id : null,
            day_id: dayId,
            phase: f.get('phase') || 'Principal',
            name: f.get('name'),
            sets: parseInt(f.get('sets')) || 3,
            reps_text: f.get('reps_text') || '12',
            equipment: f.get('equipment') || '',
            default_weight_kg: parseFloat(f.get('default_weight_kg')) || 0,
            rest_seconds: parseInt(f.get('rest_seconds')) || 60,
        };
        if (!data.name) { showToast('El nombre es obligatorio'); return; }
        const res = await api(eel.save_workout_exercise, data);
        if (res && res.ok) { showToast('Ejercicio guardado'); closeModal(); navigate('personal'); }
    };
}

async function deleteWorkoutExercise(exId) {
    if (!confirm('¿Quitar este ejercicio de la rutina?')) return;
    await api(eel.delete_workout_exercise, exId);
    showToast('Ejercicio eliminado');
    navigate('personal');
}

// --- UNIFIED TAB: PROGRESO, HISTORIAL, TAREAS Y HÁBITOS ---
async function renderPersonalProgress(el) {
    const now = new Date();
    const [progRes, historyRes, allTasks, habitsRes, logsRes] = await Promise.all([
        api(eel.get_workout_progress),
        api(eel.get_workout_history),
        api(eel.get_tasks, 3),
        api(eel.get_habits),
        api(eel.get_habit_logs, now.getFullYear())
    ]);
    const prog = progRes || { exercises: [], series: {} };
    const history = historyRes || [];
    const tasks = (allTasks || []).filter(t => t.status !== 'completed');
    const habitList = habitsRes || [];
    const logs = logsRes || [];

    const exercisesWithLogs = Object.keys(prog.series);
    if (!state.progressExercise || !prog.exercises.includes(state.progressExercise)) {
        state.progressExercise = exercisesWithLogs[0] || prog.exercises[0] || '';
    }

    const exOpts = prog.exercises.map(name =>
        `<option value="${esc(name)}" ${state.progressExercise === name ? 'selected' : ''}>${esc(name)}${prog.series[name] ? ` (${prog.series[name].length})` : ''}</option>`
    ).join('');

    const metric = state.progressMetric || 'max_weight';
    const nowMonth = todayStr().slice(0, 7);
    const monthSessions = history.filter(h => (h.date || '').startsWith(nowMonth)).length;

    let html = `<div class="two-col" style="margin-bottom:18px">
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px">
                <div class="card-title" style="margin:0">📌 Tareas personales</div>
                <button class="btn btn-ghost btn-sm" onclick="showPersonalTaskForm()">+ Tarea</button>
            </div>`;
    if (tasks.length === 0) {
        html += '<div class="empty-state" style="padding:18px"><p>Sin tareas pendientes</p></div>';
    } else {
        for (const t of tasks) {
            html += `<div class="task-item">
                <div class="task-check" onclick="completeTask(${t.id})"></div>
                <div class="task-info"><div class="task-title">${esc(t.title)}</div>
                <div class="task-meta">${fmtDate(t.due_date) || 'Sin fecha'}</div></div>
                <button class="btn btn-ghost btn-sm" onclick="deleteTask(${t.id})">✕</button>
            </div>`;
        }
    }
    html += `</div>
        <div style="min-width:0;max-width:100%">
            <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px">
                    <div class="card-title" style="margin:0">✨ Hábitos</div>
                    <button class="btn btn-ghost btn-sm" onclick="showHabitForm()">+ Hábito</button>
                </div>`;
    if (habitList.length === 0) {
        html += '<div class="empty-state" style="padding:18px"><p>Sin hábitos</p></div>';
    } else {
        for (const h of habitList) {
            const done = Boolean(h.done_today);
            html += `<div class="habit-item">
                <div class="habit-check${done ? ' done' : ''}" onclick="toggleHabit(${h.id})"></div>
                <div class="habit-name">${esc(h.name)}</div>
                <div class="habit-streak">🔥 ${h.streak || 0}d</div>
                <button class="btn btn-ghost btn-sm" onclick="deleteHabit(${h.id})">✕</button>
            </div>`;
        }
        html += buildHabitGraph(logs, habitList.length);
    }
    html += `</div></div></div>`;

    // Workout Progress & History below
    html += `<div class="stats-row">
        <div class="stat-card coral">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${history.length}</div>
            <div class="stat-label">Entrenamientos</div>
        </div>
        <div class="stat-card lavender">
            <div class="stat-icon">📅</div>
            <div class="stat-value">${monthSessions}</div>
            <div class="stat-label">Este mes</div>
        </div>
        <div class="stat-card sage">
            <div class="stat-icon">💪</div>
            <div class="stat-value">${exercisesWithLogs.length}</div>
            <div class="stat-label">Ejercicios registrados</div>
        </div>
    </div>

    <div class="card" style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
            <div class="card-title" style="margin:0">📈 Evolución por Ejercicio</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;width:100%;max-width:540px">
                <select class="form-control" style="flex:1;min-width:150px;padding:6px 10px;font-size:0.85rem" onchange="changeWorkoutProgressEx(this.value)">${exOpts}</select>
                <select class="form-control" style="flex:1;min-width:130px;padding:6px 10px;font-size:0.85rem" onchange="changeWorkoutProgressMetric(this.value)">
                    <option value="max_weight" ${metric === 'max_weight' ? 'selected' : ''}>Peso máx (kg)</option>
                    <option value="volume" ${metric === 'volume' ? 'selected' : ''}>Volumen (kg × reps)</option>
                    <option value="max_reps" ${metric === 'max_reps' ? 'selected' : ''}>Reps / Seg máx</option>
                </select>
                <button class="btn btn-secondary btn-sm" onclick="showQuickExerciseLogModal()">+ Marca rápida</button>
            </div>
        </div>
        <canvas id="workoutProgressChart" style="width:100%;height:230px"></canvas>
    </div>

    <div class="card">
        <div class="card-title">Historial de Entrenamientos</div>`;

    if (history.length === 0) {
        html += `<div class="empty-state" style="padding:20px"><p>Sin sesiones registradas aún</p></div>`;
    } else {
        html += `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Rutina</th><th>Duración</th><th>Series</th><th></th></tr></thead><tbody>`;
        for (const sess of history) {
            const sets = sess.sets || [];
            const byEx = {};
            sets.forEach(s => {
                if (!byEx[s.exercise_name]) byEx[s.exercise_name] = [];
                byEx[s.exercise_name].push(`${s.weight_kg > 0 ? s.weight_kg + 'kg×' : ''}${s.reps}`);
            });
            const summary = Object.entries(byEx).map(([k, v]) => `<strong>${esc(k)}:</strong> ${v.join(', ')}`).join(' · ');
            html += `<tr>
                <td style="white-space:nowrap">
                    <span style="cursor:pointer;border-bottom:1px dashed var(--border)" title="Cambiar fecha" onclick="editWorkoutSessionDate(${Number(sess.id)}, ${esc(JSON.stringify(String(sess.date || '')))})">
                        <strong>${fmtDate(sess.date)}</strong> <span style="font-size:0.72rem;opacity:0.7">✏️</span>
                    </span>
                </td>
                <td>${esc(sess.day_name || 'Sesión')}</td>
                <td>${sess.duration_minutes ? sess.duration_minutes + ' min' : '-'}</td>
                <td style="font-size:0.8rem;color:var(--text-muted)">${summary || '-'}</td>
                <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="deleteWorkoutSession(${sess.id})">✕</button></td>
            </tr>`;
        }
        html += `</tbody></table></div>`;
    }
    html += `</div>`;
    el.innerHTML = html;

    drawWorkoutProgressChart(prog.series[state.progressExercise] || [], metric, state.progressExercise);
}

function editWorkoutSessionDate(sessionId, currentDate) {
    const html = `<form id="modalForm">
        <div class="form-group">
            <label>Fecha del entrenamiento *</label>
            <input type="date" class="form-control" name="date" value="${esc(currentDate || todayStr())}">
        </div>
    </form>`;
    openModal('Cambiar fecha de entrenamiento', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const newDate = f.get('date');
        if (!newDate) { showToast('Selecciona una fecha'); return; }
        const res = await api(eel.update_workout_session_date, sessionId, newDate);
        if (res && res.ok) {
            showToast('Fecha actualizada');
            closeModal();
            navigate('personal');
        }
    };
}

function changeWorkoutProgressEx(exName) {
    state.progressExercise = exName;
    navigate('personal');
}

function changeWorkoutProgressMetric(m) {
    state.progressMetric = m;
    navigate('personal');
}

async function deleteWorkoutSession(id) {
    if (!confirm('¿Eliminar este registro de entrenamiento?')) return;
    await api(eel.delete_workout_session, id);
    showToast('Sesión eliminada');
    navigate('personal');
}

function showQuickExerciseLogModal() {
    api(eel.get_workout_routine).then(routine => {
        const allEx = [];
        (routine || []).forEach(d => (d.exercises || []).forEach(e => {
            if (!allEx.includes(e.name)) allEx.push(e.name);
        }));
        const opts = allEx.map(name => `<option value="${esc(name)}" ${state.progressExercise === name ? 'selected' : ''}>${esc(name)}</option>`).join('');
        const html = `<form id="modalForm">
            <div class="form-group"><label>Ejercicio *</label><select class="form-control" name="exercise_name">${opts}</select></div>
            <div class="form-row">
                <div class="form-group"><label>Fecha *</label><input type="date" class="form-control" name="date" value="${todayStr()}"></div>
                <div class="form-group"><label>Series realizadas</label><input type="number" class="form-control" name="sets" value="3"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Peso utilizado (kg)</label><input type="number" step="0.5" class="form-control" name="weight_kg" value="10"></div>
                <div class="form-group"><label>Repeticiones por serie</label><input type="number" class="form-control" name="reps" value="12"></div>
            </div>
        </form>`;
        openModal('Registrar marca / progreso rápido', html);
        document.getElementById('modalSave').onclick = async () => {
            const f = new FormData(document.getElementById('modalForm'));
            const exName = f.get('exercise_name');
            const nSets = Math.max(1, parseInt(f.get('sets')) || 1);
            const w = parseFloat(f.get('weight_kg')) || 0;
            const r = parseInt(f.get('reps')) || 0;
            const sets = [];
            for (let i = 1; i <= nSets; i++) {
                sets.push({ exercise_name: exName, set_number: i, weight_kg: w, reps: r });
            }
            const res = await api(eel.log_workout_session, {
                day_id: null,
                day_name: 'Registro: ' + exName,
                date: f.get('date') || todayStr(),
                duration_minutes: 0,
                sets,
            });
            if (res && res.ok) {
                state.progressExercise = exName;
                showToast('Progreso registrado');
                closeModal();
                navigate('personal');
            }
        };
    });
}

function drawWorkoutProgressChart(points, metric, exName) {
    setTimeout(() => {
        const canvas = document.getElementById('workoutProgressChart');
        if (!canvas) return;
        const setup = setupCanvas(canvas);
        const ctx = setup.ctx;
        const W = setup.W, H = setup.H;
        const PAD = { top: 24, bottom: 32, left: 48, right: 24 };
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;

        ctx.clearRect(0, 0, W, H);

        if (!points || points.length === 0) {
            ctx.fillStyle = '#B89CA8';
            ctx.font = '14px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(`Sin registros aún para "${exName}". ¡Completa una rutina o agrega una marca rápida!`, W / 2, H / 2);
            return;
        }

        const vals = points.map(p => parseFloat(p[metric]) || 0);
        let min = Math.min(...vals);
        let max = Math.max(...vals);
        if (min === max) {
            min = Math.max(0, min - 2);
            max = max + 2;
        } else {
            const span = max - min;
            min = Math.max(0, min - span * 0.15);
            max = max + span * 0.15;
        }

        const unit = metric === 'max_weight' ? 'kg' : metric === 'volume' ? 'kg' : 'reps';

        // Grid
        ctx.strokeStyle = 'rgba(184, 156, 168, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = PAD.top + plotH * (1 - i / 4);
            ctx.beginPath();
            ctx.moveTo(PAD.left, y);
            ctx.lineTo(W - PAD.right, y);
            ctx.stroke();
            const val = min + (max - min) * (i / 4);
            ctx.fillStyle = '#B89CA8';
            ctx.font = '10px Outfit';
            ctx.textAlign = 'right';
            ctx.fillText(val.toFixed(1) + ' ' + unit, PAD.left - 6, y + 3);
        }

        // Coordinates
        const count = points.length;
        const coords = points.map((p, i) => {
            const x = count === 1 ? PAD.left + plotW / 2 : PAD.left + plotW * (i / (count - 1));
            const y = PAD.top + plotH * (1 - ((vals[i] - min) / (max - min || 1)));
            return { x, y, val: vals[i], date: p.date };
        });

        // Line & area
        if (coords.length > 1) {
            ctx.strokeStyle = '#F28BA8';
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            coords.forEach((c, i) => {
                if (i === 0) ctx.moveTo(c.x, c.y);
                else ctx.lineTo(c.x, c.y);
            });
            ctx.stroke();

            ctx.lineTo(coords[coords.length - 1].x, PAD.top + plotH);
            ctx.lineTo(coords[0].x, PAD.top + plotH);
            ctx.closePath();
            ctx.fillStyle = 'rgba(242, 139, 168, 0.15)';
            ctx.fill();
        }

        // Points & value labels
        coords.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#F28BA8';
            ctx.fill();
            ctx.strokeStyle = '#151014';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#F28BA8';
            ctx.font = 'bold 11px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(`${c.val} ${unit}`, c.x, c.y - 10);

            ctx.fillStyle = '#B89CA8';
            ctx.font = '10px Outfit';
            ctx.fillText(c.date.slice(5), c.x, H - 8);
        });
    }, 50);
}

// ===================== HEALTH =====================
async function renderHealth(el) {
    state.personalTab = state.healthTab || 'injections';
    await renderPersonal(el);
}

function switchHealthTab(t) {
    state.healthTab = t;
    state.personalTab = t;
    navigate('personal');
}

// --- HEALTH: INJECTIONS ---
function renderHealthInjections(el, injections, proj) {
    let html = '';

    // Reminder card
    if (injections.length > 0) {
        const ds = proj.days_since_last;
        const nd = proj.next_dose_days;
        let statusIcon, statusText, statusColor;
        if (ds <= 7) {
            statusIcon = '✅';
            statusText = `Al día · próxima en ${nd > 0 ? nd + ' días' : 'hoy'}`;
            statusColor = 'var(--sage)';
        } else if (ds <= 10) {
            statusIcon = '⚠️';
            statusText = `Hace ${ds} días · atrasada ${ds - 7} días`;
            statusColor = 'var(--gold)';
        } else {
            statusIcon = '🔴';
            statusText = `Hace ${ds} días · muy atrasada`;
            statusColor = 'var(--rose)';
        }
        html += `<div class="card" style="margin-bottom:14px;padding:14px 18px;border-left:4px solid ${statusColor}">
            <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:1.5rem">${statusIcon}</span>
                <div>
                    <div style="font-size:0.85rem;font-weight:500">${statusText}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted)">Enantato de estradiol · 4 mg/semana · IM</div>
                </div>
                <div style="margin-left:auto;text-align:right">
                    <div style="font-size:0.8rem;color:var(--text-muted)">Última: ${fmtDate(injections[0].date)}</div>
                </div>
            </div>
        </div>`;

        // Estradiol chart
        if (proj.days && proj.levels && proj.levels.length > 0) {
            html += `<div class="card" style="margin-bottom:14px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
                    <div class="card-title" style="margin:0">Estradiol estimado (E₂)</div>
                    ${proj.next_dose_date ? `<div style="font-size:0.78rem;color:var(--text-muted)">Próxima: ${fmtDate(proj.next_dose_date)}</div>` : ''}
                </div>
                <div id="estradiolRangeBtns" style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap"></div>
                <canvas id="estradiolChart" style="width:100%;height:220px"></canvas>
            </div>`;
        }
    }

    // Stock of ampoules & Next Blood Lab reminder bar
    const stockVal = (state.estradiolStock !== null && !isNaN(state.estradiolStock)) ? state.estradiolStock : null;
    const lowStock = stockVal !== null && stockVal <= 2;
    const labDays = state.nextLabDate ? daysUntil(state.nextLabDate) : null;
    const labBadge = labDays !== null
        ? (labDays < 0 ? `<span class="tag tag-rose" style="font-size:0.7rem">Vencido</span>`
           : labDays === 0 ? `<span class="tag tag-primary" style="font-size:0.7rem">¡Hoy!</span>`
           : `<span class="tag ${labDays <= 7 ? 'tag-gold' : 'tag-lavender'}" style="font-size:0.7rem">En ${labDays}d</span>`)
        : '';

    html += `<div class="card" style="margin-bottom:14px;padding:12px 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <span style="font-size:0.84rem;font-weight:700">📦 Stock de dosis / ampollas:</span>
                <div style="display:flex;align-items:center;gap:6px">
                    <button class="btn btn-secondary btn-sm" style="padding:2px 9px" onclick="adjustEstradiolStock(-1)">-</button>
                    <strong style="min-width:26px;text-align:center;font-size:0.95rem;color:${lowStock ? 'var(--rose)' : 'var(--text)'}">${stockVal !== null ? stockVal : '--'}</strong>
                    <button class="btn btn-secondary btn-sm" style="padding:2px 9px" onclick="adjustEstradiolStock(1)">+</button>
                </div>
                ${lowStock ? `<span class="tag tag-rose" style="font-size:0.72rem">⚠️ Comprar pronto</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:0.84rem;font-weight:700">🩸 Próximo laboratorio:</span>
                <input type="date" class="form-control" style="width:auto;padding:4px 8px;font-size:0.82rem;height:30px" value="${esc(state.nextLabDate || '')}" onchange="saveNextLabDate(this.value)">
                ${labBadge}
            </div>
            <button class="btn btn-primary" onclick="showInjectionForm()" style="margin-left:auto">+ Registrar inyección</button>
        </div>
    </div>`;

    if (injections.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">💉</div><h3>Sin registros</h3><p>Registra tu primera inyección</p></div>';
        el.innerHTML = html;
        return;
    }

    html += '<div class="table-wrap" style="max-height:300px;overflow-y:auto"><table><thead><tr><th>Fecha</th><th>Dosis</th><th>Zona</th><th>Notas</th><th></th></tr></thead><tbody>';
    for (const inj of injections) {
        const daysAgo = daysUntil(inj.date);
        const badge = daysAgo !== null && daysAgo > -7 ? '<span class="tag tag-sage" style="margin-left:6px">Reciente</span>' :
                     daysAgo !== null && daysAgo <= -7 && daysAgo > -14 ? '' :
                     daysAgo !== null && daysAgo <= -14 ? '<span class="tag tag-rose" style="margin-left:6px">Hace +14d</span>' : '';
        html += `<tr><td><strong>${fmtDate(inj.date)}</strong>${badge}</td>
            <td>${inj.dose_mg} mg</td>
            <td style="color:var(--text-muted);font-size:0.85rem">${esc(inj.injection_site || '-')}</td>
            <td style="color:var(--text-muted);font-size:0.85rem">${esc(inj.notes || '-')}</td>
            <td style="text-align:right"><button class="btn btn-ghost btn-sm" onclick="deleteInjection(${inj.id})">✕</button></td></tr>`;
    }
    html += '</tbody></table></div>';
    el.innerHTML = html;

    // Build range selector buttons
    const rangeBtns = document.getElementById('estradiolRangeBtns');
    if (rangeBtns) {
        const ranges = [
            {days:30,label:'1 mes'}, {days:90,label:'3 meses'},
            {days:180,label:'6 meses'}, {days:365,label:'1 a\u00f1o'}, {days:0,label:'Todo'}
        ];
        rangeBtns.innerHTML = ranges.map(r =>
            '<button class="btn btn-ghost btn-sm chart-range-btn'+(state.estradiolRange===r.days?' active':'')+'" onclick="setEstradiolRange('+r.days+')">'+r.label+'</button>'
        ).join('');
    }

    // Draw estradiol chart after render
    if (proj.days && proj.levels && proj.levels.length > 0) {
        drawEstradiolChart(proj);
    }
}

function setupCanvas(canvas, customHeight) {
    const rect = canvas.parentElement.getBoundingClientRect();
    const w = rect.width || 700;
    const h = customHeight || 220;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, W: w, H: h, dpr };
}

function drawEstradiolChart(proj) {
    setTimeout(() => {
        const canvas = document.getElementById('estradiolChart');
        if (!canvas) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        // Filter by selected range
        let range = state.estradiolRange || 365;
        const todayStr = localDateStr(new Date());
        let filteredDays = proj.days;
        let filteredLevels = proj.levels;
        if (range > 0 && proj.days && proj.days.length > 0) {
            const cutDate = new Date();
            cutDate.setDate(cutDate.getDate() - range);
            const cutStr = localDateStr(cutDate);
            const idx = proj.days.findIndex(d => d >= cutStr);
            if (idx > 0) {
                filteredDays = proj.days.slice(idx);
                filteredLevels = proj.levels.slice(idx);
            }
        }
        const tooltip = document.getElementById('chartTooltip') || (() => {
            const el = document.createElement('div');
            el.id = 'chartTooltip';
            canvas.parentElement.style.position = 'relative';
            canvas.parentElement.appendChild(el);
            return el;
        })();
        tooltip.style.cssText = isDark
            ? 'position:absolute;background:#211920;color:#F7EAF0;border:1px solid #F28BA8;border-radius:8px;padding:5px 10px;font-size:0.8rem;font-weight:500;pointer-events:none;display:none;z-index:100;box-shadow:0 4px 14px rgba(0,0,0,0.5)'
            : 'position:absolute;background:#FFFFFF;color:#2D2327;border:1px solid #F0E6E2;border-radius:8px;padding:5px 10px;font-size:0.8rem;font-weight:500;pointer-events:none;display:none;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,0.1)';

        const setupSc = setupCanvas(canvas);
        const ctx = setupSc.ctx;
        const dpr = setupSc.dpr;
        const W = setupSc.W, H = setupSc.H;
        const PAD = { top: 18, bottom: 24, left: 42, right: 30 };
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;

        const data = filteredLevels;
        const count = data.length;
        if (count < 2) return;

        const todayIdx = filteredDays.findIndex(d => d >= todayStr);
        const futureIdx = filteredDays.findIndex(d => d >= todayStr);

        let min = 0, max = Math.max(...data) * 1.15;
        if (max < 10) max = 200;

        drawEstradiolChartFull(ctx, dpr, filteredDays, data, max, min, count, futureIdx, todayIdx, PAD, W, H, plotW, plotH, proj);

        const handlePointer = function(clientX) {
            const r = canvas.getBoundingClientRect();
            const mx = clientX - r.left;
            if (mx < PAD.left || mx > W - PAD.right) {
                tooltip.style.display = 'none';
                drawEstradiolChartFull(ctx, dpr, filteredDays, data, max, min, count, futureIdx, todayIdx, PAD, W, H, plotW, plotH, proj);
                return;
            }
            const i = Math.round((mx - PAD.left) / plotW * (count - 1));
            if (i < 0 || i >= count) {
                tooltip.style.display = 'none';
                drawEstradiolChartFull(ctx, dpr, filteredDays, data, max, min, count, futureIdx, todayIdx, PAD, W, H, plotW, plotH, proj);
                return;
            }
            const x = PAD.left + plotW * (i / (count - 1));
            const y = PAD.top + plotH * (1 - (data[i] / max));
            drawEstradiolChartFull(ctx, dpr, filteredDays, data, max, min, count, futureIdx, todayIdx, PAD, W, H, plotW, plotH, proj);
            ctx.beginPath();
            ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
            ctx.fillStyle = isDark ? '#F28BA8' : '#E85D75';
            ctx.fill();
            ctx.strokeStyle = isDark ? '#151014' : '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            tooltip.style.display = 'block';
            tooltip.style.left = Math.max(8, Math.min(x + 12, W - 150)) + 'px';
            tooltip.style.top = Math.max(4, y - 28) + 'px';
            tooltip.textContent = data[i].toFixed(1) + ' pg/mL — ' + filteredDays[i];
        };

        canvas.onmousemove = function(e) { handlePointer(e.clientX); };
        canvas.ontouchmove = function(e) {
            if (e.touches && e.touches[0]) handlePointer(e.touches[0].clientX);
        };
        canvas.onmouseleave = function() {
            tooltip.style.display = 'none';
            drawEstradiolChartFull(ctx, dpr, filteredDays, data, max, min, count, futureIdx, todayIdx, PAD, W, H, plotW, plotH, proj);
        };
    }, 50);
}

function drawEstradiolChartFull(ctx, dpr, filteredDays, data, max, min, count, futureIdx, todayIdx, PAD, W, H, plotW, plotH, proj) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#362832' : '#F0E6E2';
    const labelColor = isDark ? '#B89CA8' : '#9C8B8D';
    const lineColor = isDark ? '#F28BA8' : '#E8998F';
    const fillColor = isDark ? 'rgba(242, 139, 168, 0.16)' : 'rgba(255, 183, 178, 0.18)';

    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = PAD.top + plotH * (1 - i/4);
        ctx.beginPath();
        ctx.moveTo(PAD.left, y);
        ctx.lineTo(W - PAD.right, y);
        ctx.stroke();
        const val = min + max * (i/4);
        ctx.fillStyle = labelColor;
        ctx.font = '10px Outfit';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(val) + '', PAD.left - 6, y + 3);
    }
    const rangeLow = Math.max(0, Math.min(1, (100 - min) / max));
    const rangeHigh = Math.max(0, Math.min(1, (250 - min) / max));
    ctx.fillStyle = isDark ? 'rgba(143, 224, 179, 0.10)' : 'rgba(212, 224, 212, 0.22)';
    const yLow = PAD.top + plotH * (1 - rangeLow);
    const yHigh = PAD.top + plotH * (1 - rangeHigh);
    ctx.fillRect(PAD.left, yHigh, plotW, yLow - yHigh);
    if (futureIdx > 0 && futureIdx < count) {
        ctx.fillStyle = isDark ? 'rgba(242, 139, 168, 0.05)' : 'rgba(240, 230, 226, 0.4)';
        const xFuture = PAD.left + plotW * (futureIdx / (count - 1));
        ctx.fillRect(xFuture, PAD.top, W - PAD.right - xFuture, plotH);
        ctx.fillStyle = labelColor;
        ctx.font = '9px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('\u2b05 pasado · proyección \u27a1', xFuture, H - 5);
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((v, i) => {
        const x = PAD.left + plotW * (i / (count - 1));
        const y = PAD.top + plotH * (1 - (v / max));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
    ctx.lineTo(PAD.left, PAD.top + plotH);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    const lastDoseIdx = filteredDays.indexOf(proj.last_dose_date);
    if (lastDoseIdx >= 0 && lastDoseIdx < count) {
        const x = PAD.left + plotW * (lastDoseIdx / (count - 1));
        const y = PAD.top + plotH * (1 - (data[lastDoseIdx] / max));
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = lineColor;
        ctx.fill();
        ctx.font = '10px Outfit';
        ctx.textAlign = 'center';
        ctx.fillText('\ud83d\udc89', x, y - 8);
    }
    if (todayIdx >= 0 && todayIdx < count) {
        const x = PAD.left + plotW * (todayIdx / (count - 1));
        ctx.beginPath();
        ctx.moveTo(x, PAD.top);
        ctx.lineTo(x, PAD.top + plotH);
        ctx.strokeStyle = isDark ? 'rgba(247, 234, 240, 0.35)' : 'rgba(45, 35, 39, 0.22)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.fillStyle = labelColor;
    ctx.font = '9px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('pg/mL', 18, 12);
    ctx.fillStyle = isDark ? '#8FE0B3' : 'rgba(70, 120, 70, 0.8)';
    ctx.font = '9px Outfit';
    ctx.textAlign = 'left';
    ctx.fillText('Rango terapéutico 100-250 pg/mL', PAD.left + 6, 12);
}

function setEstradiolRange(days) {
    state.estradiolRange = days;
    navigate('health');
}

async function adjustEstradiolStock(delta) {
    const cur = (state.estradiolStock !== null && !isNaN(state.estradiolStock)) ? state.estradiolStock : 0;
    const next = Math.max(0, cur + delta);
    state.estradiolStock = next;
    await api(eel.set_config, 'estradiol_stock', String(next));
    navigate('health');
}

async function saveNextLabDate(val) {
    state.nextLabDate = val || '';
    await api(eel.set_config, 'next_lab_date', state.nextLabDate);
    showToast('Fecha de laboratorio guardada');
    navigate('health');
}

// --- HEALTH: MEASUREMENTS WITH QUICK-ADD, GOALS & CHART ---
function getMeasurementMetricsConfig(isDark) {
    return [
        { key: 'weight',         short: 'Peso',          label: 'Peso (kg)',                  unit: 'kg', step: '0.1', color: isDark ? '#F28BA8' : '#E85D75' },
        { key: 'bideltoid_cm',   short: 'Bideltoideo',   label: 'Ancho bideltoideo (cm)',     unit: 'cm', step: '0.5', color: isDark ? '#FFB870' : '#E07A2A' },
        { key: 'bust_cm',        short: 'Busto',         label: 'Busto (cm)',                 unit: 'cm', step: '0.5', color: isDark ? '#C9B3F9' : '#9B5DE5' },
        { key: 'underbust_cm',   short: 'Bajo busto',    label: 'Bajo busto (cm)',            unit: 'cm', step: '0.5', color: isDark ? '#F7A8D8' : '#D65DB1' },
        { key: 'waist_cm',       short: 'Cintura',       label: 'Cintura (cm)',               unit: 'cm', step: '0.5', color: isDark ? '#8FE0B3' : '#3B9E66' },
        { key: 'iliac_crest_cm', short: 'Cresta ilíaca', label: 'Crestas ilíacas / Hip dip (cm)', unit: 'cm', step: '0.5', color: isDark ? '#FFD166' : '#C98A00' },
        { key: 'hips_cm',        short: 'Cadera',        label: 'Cadera (cm)',                unit: 'cm', step: '0.5', color: isDark ? '#7CC6FE' : '#2D82D8' },
        { key: 'thigh_cm',       short: 'Muslo',         label: 'Muslo (cm)',                 unit: 'cm', step: '0.5', color: isDark ? '#80ED99' : '#2A9D8F' },
        { key: 'arm_cm',         short: 'Brazo',         label: 'Brazo (cm)',                 unit: 'cm', step: '0.5', color: isDark ? '#A5B4FC' : '#5E60CE' },
    ];
}

function getLatestMetricValues(measurements) {
    const latest = {};
    for (let i = measurements.length - 1; i >= 0; i--) {
        const row = measurements[i];
        ['weight', 'bideltoid_cm', 'bust_cm', 'underbust_cm', 'waist_cm', 'iliac_crest_cm', 'hips_cm', 'thigh_cm', 'arm_cm'].forEach(k => {
            if (latest[k] === undefined && row[k] !== null && row[k] !== undefined && row[k] !== '') {
                latest[k] = { val: parseFloat(row[k]), date: row.date };
            }
        });
    }
    return latest;
}

function renderHealthMeasurements(el, measurements, goals = {}) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const metrics = getMeasurementMetricsConfig(isDark);
    const latest = getLatestMetricValues(measurements);

    if (!state.selectedMeasurementKeys || !Array.isArray(state.selectedMeasurementKeys)) {
        const withData = metrics.filter(m => latest[m.key] !== undefined || goals[m.key]).map(m => m.key);
        state.selectedMeasurementKeys = withData.length > 0 ? withData : ['weight', 'bust_cm', 'waist_cm', 'hips_cm'];
    }
    if (state.showMeasurementGoals === undefined) state.showMeasurementGoals = true;
    if (state.measurementRange === undefined) state.measurementRange = 0;

    // 1. QUICK-ADD BAR
    let html = `<div class="card" style="margin-bottom:14px;padding:16px 18px;border:1px solid var(--rose-light)">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap">
            <div style="font-weight:700;font-size:0.95rem">⚡ Registro rápido</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <input type="date" id="quickMeasDate" class="form-control" value="${todayStr()}" style="width:auto;padding:5px 10px;font-size:0.82rem">
                <button class="btn btn-ghost btn-sm" onclick="showMeasurementGoalsModal()">🎯 Metas</button>
                <button class="btn btn-ghost btn-sm" onclick="showMeasurementForm()">+ Con notas</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:12px">`;

    metrics.forEach(m => {
        const lastInfo = latest[m.key];
        const goalVal = goals[m.key];
        const ph = lastInfo ? `Últ: ${lastInfo.val} ${m.unit}` : `Ej: -- ${m.unit}`;
        html += `<div style="background:var(--bg);padding:7px 9px;border-radius:10px;border:1px solid var(--border)">
            <label style="font-size:0.72rem;font-weight:600;color:var(--text-muted);display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                <span style="display:flex;align-items:center;gap:4px">
                    <span style="width:7px;height:7px;border-radius:50%;background:${m.color};display:inline-block"></span>
                    ${esc(m.short)}
                </span>
                ${goalVal ? `<span title="Meta: ${goalVal} ${m.unit}" style="color:var(--rose);font-size:0.68rem">🎯${goalVal}</span>` : `<span style="font-size:0.68rem">${m.unit}</span>`}
            </label>
            <input type="number" step="${m.step}" id="qm_${m.key}" class="form-control quick-meas-input"
                placeholder="${ph}" onkeydown="if(event.key==='Enter')saveQuickMeasurement()"
                style="padding:5px 8px;font-size:0.86rem;height:32px;background:var(--bg-card)">
        </div>`;
    });

    html += `</div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <input type="text" id="qm_notes" class="form-control" placeholder="Nota opcional (ej. en ayunas, post-entreno...)"
                onkeydown="if(event.key==='Enter')saveQuickMeasurement()"
                style="flex:1;min-width:180px;padding:6px 10px;font-size:0.82rem;height:34px">
            <button class="btn btn-primary" onclick="saveQuickMeasurement()" style="padding:7px 18px">💾 Guardar medidas</button>
        </div>
    </div>`;

    // 1.5 AUTOMATIC BODY PROPORTIONS STRIP
    const wVal = latest.waist_cm?.val;
    const hVal = latest.hips_cm?.val;
    const bVal = latest.bust_cm?.val;
    const ubVal = latest.underbust_cm?.val;
    const biVal = latest.bideltoid_cm?.val;
    const propCards = [];
    if (wVal && hVal) {
        const whr = (wVal / hVal).toFixed(2);
        const diffHW = (hVal - wVal).toFixed(1);
        propCards.push({ title: 'Cintura / Cadera (WHR)', val: whr, sub: `Dif: +${diffHW} cm cadera · Ideal ~0.70` });
    }
    if (bVal && ubVal) {
        const diffCup = (bVal - ubVal).toFixed(1);
        propCards.push({ title: 'Busto - Bajo busto', val: `+${diffCup} cm`, sub: `Busto ${bVal} / Bajo ${ubVal} cm` });
    }
    if (bVal && wVal) {
        const wbr = (wVal / bVal).toFixed(2);
        propCards.push({ title: 'Cintura / Busto', val: wbr, sub: `Dif: +${(bVal - wVal).toFixed(1)} cm busto` });
    }
    if (biVal && hVal) {
        propCards.push({ title: 'Bideltoideo / Cadera', val: `${biVal} / ${hVal} cm`, sub: `Índice: ${(biVal / hVal).toFixed(2)}` });
    }
    if (propCards.length > 0) {
        html += `<div class="card" style="margin-bottom:14px;padding:12px 16px">
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">✨ Proporciones actuales</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:8px">
                ${propCards.map(c => `<div style="padding:8px 10px;border-radius:10px;background:var(--bg);border-left:3px solid var(--primary)">
                    <div style="font-size:0.73rem;color:var(--text-muted);font-weight:600">${c.title}</div>
                    <div style="font-size:1rem;font-weight:700;margin:2px 0;color:var(--primary)">${c.val}</div>
                    <div style="font-size:0.72rem;color:var(--text-muted)">${c.sub}</div>
                </div>`).join('')}
            </div>
        </div>`;
    }

    // 2. GOALS PROGRESS STRIP (if any goals configured)
    const goalKeys = metrics.filter(m => goals[m.key] !== undefined && goals[m.key] !== null && goals[m.key] !== '');
    if (goalKeys.length > 0) {
        html += `<div class="card" style="margin-bottom:14px;padding:12px 16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text-secondary)">🎯 Progreso hacia tus metas</div>
                <button class="btn btn-ghost btn-sm" style="font-size:0.74rem;padding:2px 8px" onclick="showMeasurementGoalsModal()">Editar metas</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:8px">`;
        goalKeys.forEach(m => {
            const target = parseFloat(goals[m.key]);
            const currObj = latest[m.key];
            const curr = currObj ? currObj.val : null;
            let diffHtml = '<span style="color:var(--text-muted);font-size:0.74rem">Sin datos aún</span>';
            if (curr !== null && !isNaN(target)) {
                const diff = +(target - curr).toFixed(1);
                const absDiff = Math.abs(diff);
                if (absDiff <= 0.2) {
                    diffHtml = `<span class="tag tag-sage" style="font-size:0.7rem">✨ ¡Meta lograda!</span>`;
                } else {
                    const sign = diff > 0 ? `+${diff}` : `${diff}`;
                    diffHtml = `<span style="font-size:0.75rem;color:var(--text-muted)">Faltan <strong>${absDiff} ${m.unit}</strong> (${sign})</span>`;
                }
            }
            html += `<div style="padding:8px 10px;border-radius:10px;background:var(--bg);border-left:3px solid ${m.color}">
                <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600">${esc(m.short)}</div>
                <div style="font-size:0.92rem;font-weight:700;margin:2px 0">
                    ${curr !== null ? curr : '--'} <span style="color:var(--text-muted);font-weight:400">→</span> <span style="color:var(--rose)">🎯 ${target} ${m.unit}</span>
                </div>
                <div>${diffHtml}</div>
            </div>`;
        });
        html += `</div></div>`;
    }

    if (measurements.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">📏</div><h3>Sin medidas</h3><p>Usa el registro rápido de arriba para anotar tus primeras medidas</p></div>';
        el.innerHTML = html;
        return;
    }

    // 3. EVOLUTION CHART CARD
    const ranges = [
        { days: 90, label: '3 meses' },
        { days: 180, label: '6 meses' },
        { days: 365, label: '1 año' },
        { days: 0, label: 'Todo' }
    ];
    html += `<div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            <div class="card-title" style="margin-bottom:0">Evolución y Metas</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">
                <button class="btn btn-ghost btn-sm" style="font-size:0.73rem;padding:3px 8px" onclick="setMeasurementMetricPreset('weight')">Solo Peso</button>
                <button class="btn btn-ghost btn-sm" style="font-size:0.73rem;padding:3px 8px" onclick="setMeasurementMetricPreset('cm')">Solo Medidas (cm)</button>
                <button class="btn btn-ghost btn-sm" style="font-size:0.73rem;padding:3px 8px" onclick="setMeasurementMetricPreset('all')">Todas</button>
                <span style="color:var(--border);margin:0 2px">|</span>
                ${ranges.map(r => `<button class="btn btn-ghost btn-sm chart-range-btn${state.measurementRange === r.days ? ' active' : ''}" style="font-size:0.73rem;padding:3px 8px" onclick="setMeasurementRange(${r.days})">${r.label}</button>`).join('')}
            </div>
        </div>
        <div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap;align-items:center">`;

    metrics.forEach(m => {
        const isChecked = state.selectedMeasurementKeys.includes(m.key);
        const hasGoal = goals[m.key] !== undefined && goals[m.key] !== null && goals[m.key] !== '';
        html += `<label style="font-size:0.78rem;display:flex;align-items:center;gap:5px;cursor:pointer;padding:3px 8px;border-radius:16px;background:var(--bg);border:1px solid var(--border)">
            <input type="checkbox" class="metric-toggle" data-key="${m.key}" data-color="${m.color}" data-label="${esc(m.label)}" data-short="${esc(m.short)}" data-unit="${m.unit}" ${isChecked ? 'checked' : ''}>
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${m.color}"></span>
            <span>${esc(m.short)}</span>
            ${hasGoal ? `<span style="font-size:0.68rem;color:var(--rose)" title="Meta: ${goals[m.key]} ${m.unit}">🎯</span>` : ''}
        </label>`;
    });

    html += `<label style="font-size:0.78rem;display:flex;align-items:center;gap:5px;cursor:pointer;margin-left:auto;color:var(--rose);font-weight:600">
            <input type="checkbox" id="toggleShowGoalsLine" ${state.showMeasurementGoals ? 'checked' : ''}>
            🎯 Ver líneas de meta
        </label>
        </div>
        <div style="position:relative">
            <canvas id="measurementChart" style="width:100%;height:260px"></canvas>
        </div>
    </div>`;

    // 4. HISTORY TABLE OF MEASUREMENTS
    html += `<div class="table-wrap" style="max-height:360px;overflow-y:auto"><table><thead><tr>
        <th>Fecha</th>
        <th>Peso</th>
        <th>Bideltoideo</th>
        <th>Busto</th>
        <th>Bajo busto</th>
        <th>Cintura</th>
        <th>Cresta ilíaca</th>
        <th>Cadera</th>
        <th>Muslo / Brazo</th>
        <th></th>
    </tr></thead><tbody>`;
    const reversed = [...measurements].reverse();
    const fmtVal = (v, u) => (v !== null && v !== undefined && v !== '') ? `${v} <span style="font-size:0.72rem;color:var(--text-muted)">${u}</span>` : '<span style="color:var(--text-muted)">-</span>';
    for (const m of reversed) {
        const tb = (m.thigh_cm || m.arm_cm)
            ? `${m.thigh_cm ? m.thigh_cm + ' / ' : '- / '}${m.arm_cm ? m.arm_cm + ' cm' : '-'}`
            : '<span style="color:var(--text-muted)">-</span>';
        html += `<tr>
            <td><strong>${fmtDate(m.date)}</strong>${m.notes ? `<div style="font-size:0.7rem;color:var(--text-muted)">${esc(m.notes)}</div>` : ''}</td>
            <td>${fmtVal(m.weight, 'kg')}</td>
            <td>${fmtVal(m.bideltoid_cm, 'cm')}</td>
            <td>${fmtVal(m.bust_cm, 'cm')}</td>
            <td>${fmtVal(m.underbust_cm, 'cm')}</td>
            <td>${fmtVal(m.waist_cm, 'cm')}</td>
            <td>${fmtVal(m.iliac_crest_cm, 'cm')}</td>
            <td>${fmtVal(m.hips_cm, 'cm')}</td>
            <td>${tb}</td>
            <td style="text-align:right;white-space:nowrap">
                <button class="btn btn-ghost btn-sm" title="Editar" onclick="showMeasurementForm(${m.id})">✎</button>
                <button class="btn btn-ghost btn-sm" title="Eliminar" onclick="deleteMeasurement(${m.id})">✕</button>
            </td>
        </tr>`;
    }
    html += '</tbody></table></div>';
    el.innerHTML = html;

    drawMeasurementChart(measurements, metrics, goals);
}

function setMeasurementRange(days) {
    state.measurementRange = days;
    const content = document.getElementById('healthContent');
    if (content && state.lastMeasurementsList) {
        renderHealthMeasurements(content, state.lastMeasurementsList, state.measurementGoals || {});
    } else {
        navigate('health');
    }
}

function setMeasurementMetricPreset(mode) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const metrics = getMeasurementMetricsConfig(isDark);
    if (mode === 'weight') {
        state.selectedMeasurementKeys = ['weight'];
    } else if (mode === 'cm') {
        state.selectedMeasurementKeys = metrics.filter(m => m.key !== 'weight').map(m => m.key);
    } else {
        state.selectedMeasurementKeys = metrics.map(m => m.key);
    }
    document.querySelectorAll('.metric-toggle').forEach(t => {
        t.checked = state.selectedMeasurementKeys.includes(t.dataset.key);
    });
    drawMeasurementChart(state.lastMeasurementsList || [], metrics, state.measurementGoals || {});
}

async function saveQuickMeasurement() {
    const dateEl = document.getElementById('quickMeasDate');
    const date = dateEl ? dateEl.value : todayStr();
    if (!date) { showToast('Selecciona una fecha'); return; }

    const keys = ['weight', 'bideltoid_cm', 'bust_cm', 'underbust_cm', 'waist_cm', 'iliac_crest_cm', 'hips_cm', 'thigh_cm', 'arm_cm'];
    const data = { date };
    let hasAny = false;
    keys.forEach(k => {
        const inp = document.getElementById('qm_' + k);
        if (inp && inp.value !== '' && !isNaN(parseFloat(inp.value))) {
            data[k] = parseFloat(inp.value);
            hasAny = true;
        } else {
            data[k] = null;
        }
    });
    const notesEl = document.getElementById('qm_notes');
    if (notesEl && notesEl.value.trim()) {
        data.notes = notesEl.value.trim();
        hasAny = true;
    }
    if (!hasAny) {
        showToast('Ingresa al menos una medida para guardar');
        return;
    }
    const res = await api(eel.create_body_measurement, data);
    if (res && res.ok) {
        showToast('✨ Medidas guardadas');
        navigate('health');
    } else {
        showToast('Error al guardar');
    }
}

function showMeasurementGoalsModal() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const metrics = getMeasurementMetricsConfig(isDark);
    const goals = state.measurementGoals || {};
    const latest = getLatestMetricValues(state.lastMeasurementsList || []);

    let html = `<form id="modalGoalsForm">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">`;
    metrics.forEach(m => {
        const cur = latest[m.key] ? `Actual: ${latest[m.key].val} ${m.unit}` : `Sin registro previo`;
        const val = goals[m.key] !== undefined && goals[m.key] !== null ? goals[m.key] : '';
        html += `<div class="form-group" style="margin-bottom:4px">
            <label style="display:flex;justify-content:space-between;align-items:center">
                <span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${m.color};margin-right:4px"></span>${esc(m.label)}</span>
            </label>
            <input type="number" step="${m.step}" class="form-control" name="${m.key}" value="${val}" placeholder="${cur}">
        </div>`;
    });
    html += `</div></form>`;
    openModal('🎯 Configurar Metas Corporales', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalGoalsForm'));
        const newGoals = {};
        metrics.forEach(m => {
            const v = parseFloat(f.get(m.key));
            if (!isNaN(v) && v > 0) newGoals[m.key] = v;
        });
        const res = await api(eel.save_measurement_goals, newGoals);
        if (res && res.ok) {
            state.measurementGoals = res.goals || newGoals;
            showToast('🎯 Metas actualizadas');
            closeModal();
            navigate('health');
        } else {
            showToast('Error al guardar metas');
        }
    };
}

function drawMeasurementChart(rawData, metrics, goals = {}) {
    setTimeout(() => {
        const canvas = document.getElementById('measurementChart');
        if (!canvas) return;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? '#362832' : '#F0E6E2';
        const labelColor = isDark ? '#B89CA8' : '#9C8B8D';

        // Filter data by range
        let data = rawData || [];
        const rangeDays = state.measurementRange || 0;
        if (rangeDays > 0 && data.length > 0) {
            const cut = new Date();
            cut.setDate(cut.getDate() - rangeDays);
            const cutStr = localDateStr(cut);
            const filtered = data.filter(d => d.date >= cutStr);
            if (filtered.length > 0) data = filtered;
        }

        const setup = setupCanvas(canvas, 260);
        const ctx = setup.ctx;
        const W = setup.W, H = setup.H;
        const PAD = { top: 22, bottom: 32, left: 46, right: 105 };
        const plotW = W - PAD.left - PAD.right;
        const plotH = H - PAD.top - PAD.bottom;

        ctx.clearRect(0, 0, W, H);

        // Find selected metrics
        const toggles = document.querySelectorAll('.metric-toggle:checked');
        const active = Array.from(toggles).map(t => ({
            key: t.dataset.key,
            color: t.dataset.color,
            short: t.dataset.short || t.dataset.key,
            unit: t.dataset.unit || '',
            label: t.dataset.label || (metrics.find(x => x.key === t.dataset.key)?.label || t.dataset.key),
        }));
        state.selectedMeasurementKeys = active.map(a => a.key);

        const showGoalsToggle = document.getElementById('toggleShowGoalsLine');
        const showGoals = showGoalsToggle ? showGoalsToggle.checked : true;
        state.showMeasurementGoals = showGoals;

        // Bind events
        document.querySelectorAll('.metric-toggle').forEach(t => {
            t.onchange = () => drawMeasurementChart(rawData, metrics, goals);
        });
        if (showGoalsToggle) {
            showGoalsToggle.onchange = () => drawMeasurementChart(rawData, metrics, goals);
        }

        if (active.length === 0 || data.length === 0) {
            ctx.fillStyle = labelColor;
            ctx.font = '14px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(active.length === 0 ? 'Selecciona al menos una métrica arriba' : 'Sin registros en este período', W/2, H/2);
            return;
        }

        // Find value range including goals of active metrics
        let min = Infinity, max = -Infinity;
        for (const m of active) {
            for (const d of data) {
                const v = parseFloat(d[m.key]);
                if (!isNaN(v)) { min = Math.min(min, v); max = Math.max(max, v); }
            }
            if (showGoals && goals && goals[m.key] !== undefined && goals[m.key] !== null) {
                const gv = parseFloat(goals[m.key]);
                if (!isNaN(gv)) { min = Math.min(min, gv); max = Math.max(max, gv); }
            }
        }
        if (min === Infinity) {
            ctx.fillStyle = labelColor;
            ctx.font = '13px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText('Aún no hay valores registrados para las métricas seleccionadas', W/2, H/2);
            return;
        }

        const valSpan = (max - min) || 4;
        const pad = valSpan * 0.14;
        const yMin = min - pad;
        const yMax = max + pad;
        const yRange = yMax - yMin || 1;
        const count = data.length;

        const xForIndex = (i) => count <= 1 ? (PAD.left + plotW / 2) : (PAD.left + plotW * (i / (count - 1)));
        const yForVal = (v) => PAD.top + plotH * (1 - (v - yMin) / yRange);

        const renderScene = () => {
            ctx.clearRect(0, 0, W, H);
            // Draw grid lines
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = PAD.top + plotH * (1 - i/4);
                ctx.beginPath();
                ctx.moveTo(PAD.left, y);
                ctx.lineTo(W - PAD.right, y);
                ctx.stroke();
                const val = yMin + yRange * (i/4);
                ctx.fillStyle = labelColor;
                ctx.font = '10px Outfit';
                ctx.textAlign = 'right';
                ctx.fillText(val.toFixed(1), PAD.left - 6, y + 3);
            }

            // Draw Goal lines (dashed)
            if (showGoals && goals) {
                active.forEach(m => {
                    const gv = parseFloat(goals[m.key]);
                    if (isNaN(gv)) return;
                    const gy = yForVal(gv);
                    ctx.save();
                    ctx.beginPath();
                    ctx.setLineDash([6, 4]);
                    ctx.strokeStyle = m.color;
                    ctx.globalAlpha = 0.75;
                    ctx.lineWidth = 1.6;
                    ctx.moveTo(PAD.left, gy);
                    ctx.lineTo(W - PAD.right, gy);
                    ctx.stroke();
                    ctx.restore();

                    ctx.fillStyle = m.color;
                    ctx.font = '600 9.5px Outfit';
                    ctx.textAlign = 'left';
                    ctx.fillText(`🎯 ${m.short}: ${gv}`, W - PAD.right + 5, gy + 3);
                });
            }

            // Draw lines & points for each metric
            const allRenderedPts = [];
            active.forEach((m) => {
                const pts = [];
                for (let i = 0; i < count; i++) {
                    const v = parseFloat(data[i][m.key]);
                    if (isNaN(v)) continue;
                    const x = xForIndex(i);
                    const y = yForVal(v);
                    pts.push({ x, y, val: v, date: data[i].date, metric: m });
                    allRenderedPts.push({ x, y, val: v, date: data[i].date, metric: m });
                }
                if (pts.length === 0) return;

                if (pts.length >= 2) {
                    ctx.strokeStyle = m.color;
                    ctx.lineWidth = 2.4;
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    pts.forEach((p, pi) => {
                        if (pi === 0) ctx.moveTo(p.x, p.y);
                        else ctx.lineTo(p.x, p.y);
                    });
                    ctx.stroke();
                }

                // Dots (compact if many points, larger if few)
                const dotRadius = pts.length > 25 ? 2.8 : 4;
                pts.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2);
                    ctx.fillStyle = m.color;
                    ctx.fill();
                    ctx.strokeStyle = isDark ? '#211920' : '#FFFFFF';
                    ctx.lineWidth = 1.3;
                    ctx.stroke();
                });

                // Label at last point
                const last = pts[pts.length - 1];
                ctx.fillStyle = m.color;
                ctx.font = '600 10px Outfit';
                ctx.textAlign = 'left';
                ctx.fillText(`${m.short} (${last.val})`, Math.min(last.x + 6, W - PAD.right + 5), last.y - 5);
            });

            // X labels
            ctx.fillStyle = labelColor;
            ctx.font = '10px Outfit';
            ctx.textAlign = 'center';
            const step = Math.max(1, Math.ceil(count / 7));
            for (let i = 0; i < count; i += step) {
                const x = xForIndex(i);
                const dStr = data[i].date || '';
                const label = dStr.length >= 10 ? dStr.slice(2, 10) : dStr;
                ctx.fillText(label, x, H - 8);
            }
            if (count > 1 && (count - 1) % step !== 0) {
                const dStr = data[count - 1].date || '';
                ctx.fillText(dStr.slice(2, 10), xForIndex(count - 1), H - 8);
            }
            return allRenderedPts;
        };

        const allPts = renderScene();

        // Tooltip on hover / touch
        const tooltip = document.getElementById('measChartTooltip') || (() => {
            const el = document.createElement('div');
            el.id = 'measChartTooltip';
            canvas.parentElement.style.position = 'relative';
            canvas.parentElement.appendChild(el);
            return el;
        })();
        tooltip.style.cssText = isDark
            ? 'position:absolute;background:#211920;color:#F7EAF0;border:1px solid #F28BA8;border-radius:8px;padding:6px 10px;font-size:0.78rem;font-weight:500;pointer-events:none;display:none;z-index:100;box-shadow:0 4px 14px rgba(0,0,0,0.5)'
            : 'position:absolute;background:#FFFFFF;color:#2D2327;border:1px solid #F0E6E2;border-radius:8px;padding:6px 10px;font-size:0.78rem;font-weight:500;pointer-events:none;display:none;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,0.1)';

        const handlePointer = (clientX, clientY) => {
            if (!allPts || allPts.length === 0) return;
            const r = canvas.getBoundingClientRect();
            const mx = clientX - r.left;
            const my = clientY - r.top;
            if (mx < PAD.left - 10 || mx > W - PAD.right + 10) {
                tooltip.style.display = 'none';
                renderScene();
                return;
            }
            let best = null, bestDist = Infinity;
            for (const p of allPts) {
                const dx = p.x - mx;
                const dy = (p.y - my) * 0.5;
                const dist = Math.hypot(dx, dy);
                if (dist < bestDist) { bestDist = dist; best = p; }
            }
            if (!best || bestDist > 45) {
                tooltip.style.display = 'none';
                renderScene();
                return;
            }
            renderScene();
            ctx.beginPath();
            ctx.arc(best.x, best.y, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = best.metric.color;
            ctx.fill();
            ctx.strokeStyle = isDark ? '#FFFFFF' : '#2D2327';
            ctx.lineWidth = 2;
            ctx.stroke();

            const gv = goals ? parseFloat(goals[best.metric.key]) : NaN;
            const goalDiff = !isNaN(gv) ? ` · 🎯 Meta: ${gv} (${(gv - best.val) > 0 ? '+' : ''}${(gv - best.val).toFixed(1)})` : '';
            tooltip.style.display = 'block';
            tooltip.style.left = Math.max(8, Math.min(best.x - 40, W - 210)) + 'px';
            tooltip.style.top = Math.max(4, best.y - 36) + 'px';
            tooltip.innerHTML = `<strong>${esc(best.metric.short)}: ${best.val} ${best.metric.unit}</strong> · ${fmtDate(best.date)}${goalDiff}`;
        };

        canvas.onmousemove = (e) => handlePointer(e.clientX, e.clientY);
        canvas.ontouchmove = (e) => {
            if (e.touches && e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY);
        };
        canvas.onmouseleave = () => {
            tooltip.style.display = 'none';
            renderScene();
        };
    }, 50);
}

function showMeasurementForm(editId = null) {
    const existing = editId ? (state.lastMeasurementsList || []).find(x => x.id === editId) : null;
    const v = (k) => (existing && existing[k] !== null && existing[k] !== undefined) ? existing[k] : '';
    const html = `<form id="modalForm">
        <div class="form-group"><label>Fecha *</label><input type="date" class="form-control" name="date" value="${existing ? existing.date : todayStr()}"></div>
        <div class="form-row">
            <div class="form-group"><label>Peso (kg)</label><input type="number" step="0.1" class="form-control" name="weight" value="${v('weight')}"></div>
            <div class="form-group"><label>Ancho bideltoideo (cm)</label><input type="number" step="0.5" class="form-control" name="bideltoid_cm" value="${v('bideltoid_cm')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Busto (cm)</label><input type="number" step="0.5" class="form-control" name="bust_cm" value="${v('bust_cm')}"></div>
            <div class="form-group"><label>Bajo busto (cm)</label><input type="number" step="0.5" class="form-control" name="underbust_cm" value="${v('underbust_cm')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Cintura (cm)</label><input type="number" step="0.5" class="form-control" name="waist_cm" value="${v('waist_cm')}"></div>
            <div class="form-group"><label>Crestas ilíacas / Hip dip (cm)</label><input type="number" step="0.5" class="form-control" name="iliac_crest_cm" value="${v('iliac_crest_cm')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Cadera (cm)</label><input type="number" step="0.5" class="form-control" name="hips_cm" value="${v('hips_cm')}"></div>
            <div class="form-group"><label>Muslo (cm)</label><input type="number" step="0.5" class="form-control" name="thigh_cm" value="${v('thigh_cm')}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Brazo (cm)</label><input type="number" step="0.5" class="form-control" name="arm_cm" value="${v('arm_cm')}"></div>
            <div class="form-group"></div>
        </div>
        <div class="form-group"><label>Notas</label><textarea class="form-control" name="notes" placeholder="Ej: en ayunas, post entrenamiento...">${esc(v('notes'))}</textarea></div>
    </form>`;
    openModal(existing ? 'Editar medidas' : 'Registrar medidas', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const parseNum = (name) => {
            const raw = f.get(name);
            return (raw !== null && raw !== '' && !isNaN(parseFloat(raw))) ? parseFloat(raw) : null;
        };
        const data = {
            id: existing ? existing.id : null,
            date: f.get('date'),
            weight: parseNum('weight'),
            bideltoid_cm: parseNum('bideltoid_cm'),
            bust_cm: parseNum('bust_cm'),
            underbust_cm: parseNum('underbust_cm'),
            waist_cm: parseNum('waist_cm'),
            iliac_crest_cm: parseNum('iliac_crest_cm'),
            hips_cm: parseNum('hips_cm'),
            thigh_cm: parseNum('thigh_cm'),
            arm_cm: parseNum('arm_cm'),
            notes: f.get('notes')
        };
        if (!data.date) { showToast('La fecha es obligatoria'); return; }
        const res = await api(eel.create_body_measurement, data);
        if (res && res.ok) { showToast('Guardado'); closeModal(); navigate('health'); }
        else showToast('Error');
    };
}

async function deleteMeasurement(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    await api(eel.delete_body_measurement, id);
    showToast('Eliminado');
    navigate('health');
}

function buildHabitGraph(logs, habitCount) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    const dayCount = Math.ceil((end - start) / 86400000) + 1;

    const logMap = {};
    for (const l of logs) {
        if (!logMap[l.date]) logMap[l.date] = 0;
        logMap[l.date]++;
    }

    const weeks = [];
    let currentWeek = [];
    // Pad before Jan 1
    const firstDow = start.getDay();
    for (let i = 0; i < firstDow; i++) currentWeek.push(null);

    for (let d = 0; d < dayCount; d++) {
        const dt = new Date(now.getFullYear(), 0, 1 + d);
        const key = localDateStr(dt);
        const count = logMap[key] || 0;
        const level = habitCount > 0 ? Math.min(Math.floor(count / habitCount * 4), 4) : 0;
        currentWeek.push(level);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Set','Oct','Nov','Dic'];
    const monthLabels = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
        const firstDay = week.findIndex(d => d !== null);
        if (firstDay >= 0) {
            const m = new Date(start.getTime() + wi * 7 * 86400000 + firstDay * 86400000).getMonth();
            if (m !== lastMonth) {
                monthLabels.push({ month: months[m], col: wi });
                lastMonth = m;
            }
        }
    });

    const colors = isDark
        ? ['var(--border-light)', '#4A2533', '#7A354E', '#B85478', '#F28BA8']
        : ['var(--border-light)', '#FFE4E1', '#F7C2BE', '#EE9E97', '#E07A72'];
    let html = `<div class="habit-graph" style="margin-top:16px;max-width:100%;overflow:hidden">
        <div style="font-size:0.75rem;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Registro anual</div>
        <div style="overflow-x:auto;max-width:100%;padding-bottom:6px;-webkit-overflow-scrolling:touch">
            <div style="position:relative;height:14px;min-width:${weeks.length * 12}px">`;
    monthLabels.forEach(ml => {
        html += `<span style="font-size:0.6rem;color:var(--text-light);position:absolute;left:${ml.col * 12}px;top:0">${ml.month}</span>`;
    });
    html += `</div><div style="display:flex;gap:2px;min-width:${weeks.length * 12}px">`;
    for (const week of weeks) {
        html += '<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">';
        for (const day of week) {
            const color = day === null ? 'transparent' : colors[day];
            html += `<div style="width:10px;height:10px;border-radius:2px;background:${color}"></div>`;
        }
        html += '</div>';
    }
    html += '</div></div></div>';
    return html;
}

function showInjectionForm() {
    const sites = ['Glúteo derecho', 'Glúteo izquierdo', 'Muslo derecho', 'Muslo izquierdo', 'Abdomen', 'Otro'];
    const siteOpts = sites.map(s => `<option value="${s}">${s}</option>`).join('');
    const html = `<form id="modalForm">
        <div class="form-group"><label>Fecha *</label><input type="date" class="form-control" name="date" value="${todayStr()}"></div>
        <div class="form-row"><div class="form-group"><label>Dosis (mg) *</label><input type="number" step="0.5" class="form-control" name="dose_mg" value="4.0"></div>
        <div class="form-group"><label>Zona</label><select class="form-control" name="injection_site">${siteOpts}</select></div></div>
        <div class="form-group"><label>Notas</label><textarea class="form-control" name="notes" placeholder="Ej: 1/2 aguja, sin dolor..."></textarea></div>
    </form>`;
    openModal('Registrar inyección', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = { date: f.get('date'), dose_mg: parseFloat(f.get('dose_mg')) || 4.0, injection_site: f.get('injection_site') || null, notes: f.get('notes') };
        if (!data.date) { showToast('La fecha es obligatoria'); return; }
        const res = await api(eel.create_injection, data);
        if (res && res.ok) { showToast('Registrada'); closeModal(); navigate('health'); }
        else showToast('Error');
    };
}

async function deleteInjection(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    const res = await api(eel.delete_injection, id);
    if (res && res.ok) { showToast('Eliminado'); navigate('health'); }
}

function showPersonalTaskForm() {
    const html = `<form id="modalForm">
        <div class="form-group"><label>Título *</label><input class="form-control" name="title"></div>
        <div class="form-group"><label>Fecha</label><input type="date" class="form-control" name="due_date" value="${todayStr()}"></div>
        <div class="form-group"><label>Descripción</label><textarea class="form-control" name="description"></textarea></div>
    </form>`;
    openModal('Nueva tarea personal', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = { area_id: 3, title: f.get('title'), due_date: f.get('due_date'), description: f.get('description') };
        if (!data.title) { showToast('El título es obligatorio'); return; }
        const res = await api(eel.create_task, data);
        if (res && res.ok) { showToast('Creada'); closeModal(); navigate('personal'); }
        else showToast('Error');
    };
}

function showHabitForm() {
    const html = `<form id="modalForm">
        <div class="form-group"><label>Nombre del hábito *</label><input class="form-control" name="name"></div>
    </form>`;
    openModal('Nuevo hábito', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const name = f.get('name');
        if (!name) { showToast('El nombre es obligatorio'); return; }
        const res = await api(eel.create_habit, { name });
        if (res && res.ok) { showToast('Creado'); closeModal(); navigate('personal'); }
        else showToast('Error');
    };
}

async function toggleHabit(id) {
    await api(eel.toggle_habit_today, id);
    navigate('personal');
}

async function deleteHabit(id) {
    if (!confirm('¿Eliminar este hábito?')) return;
    await api(eel.delete_habit, id);
    showToast('Eliminado');
    navigate('personal');
}

// ===================== COSPLAYS ENTREPRENEURSHIP =====================
const COSPLAY_STATUS_CYCLE = ['cotizado', 'con_sena', 'en_proceso', 'listo', 'entregado'];
const COSPLAY_STATUS_LABELS = {
    cotizado: 'Cotizado',
    con_sena: 'Con seña',
    en_proceso: 'En confección',
    listo: 'Listo',
    entregado: 'Entregado'
};
const COSPLAY_STATUS_CLASSES = {
    cotizado: 'tag-gold',
    con_sena: 'tag-lavender',
    en_proceso: 'tag-primary',
    listo: 'tag-sage',
    entregado: 'tag-sage'
};

async function renderCosplays(el) {
    const [projectsRes, clientsRes] = await Promise.all([
        api(eel.get_cosplay_projects),
        api(eel.get_cosplay_clients)
    ]);
    const projects = projectsRes || [];
    const clients = clientsRes || [];
    state.cosplayProjects = projects;
    state.cosplayClients = clients;
    if (!state.cosplayFilter) state.cosplayFilter = 'all';
    if (state.cosplaySearch === undefined) state.cosplaySearch = '';

    const activeList = projects.filter(p => p.status !== 'entregado');
    const totalPendingBalance = activeList.reduce((acc, p) => acc + (parseFloat(p.balance_due) || 0), 0);
    const totalProfit = projects.reduce((acc, p) => acc + (parseFloat(p.profit) || 0), 0);
    const totalCost = projects.reduce((acc, p) => acc + (parseFloat(p.total_cost) || 0), 0);

    let html = `<div class="page-header">
        <div><h1>Cosplays</h1><div class="subtitle">Taller · Comisiones y proyectos</div></div>
        <div class="page-actions" style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-secondary" onclick="showCosplayQuoteCalculator()">🧮 Cotizador</button>
            <button class="btn btn-secondary" onclick="showCosplayClientsModal()">👥 Clientes (${clients.length})</button>
            <button class="btn btn-primary" onclick="showCosplayProjectForm()">+ Nuevo cosplay</button>
        </div>
    </div>

    <div class="stats-row" style="margin-bottom:16px">
        <div class="stat-card coral">
            <div class="stat-icon">🎭</div>
            <div class="stat-value">${activeList.length}</div>
            <div class="stat-label">Activos</div>
        </div>
        <div class="stat-card lavender">
            <div class="stat-icon">💳</div>
            <div class="stat-value">$ ${totalPendingBalance.toFixed(0)}</div>
            <div class="stat-label">Saldo por cobrar</div>
        </div>
        <div class="stat-card rose">
            <div class="stat-icon">🧵</div>
            <div class="stat-value">$ ${totalCost.toFixed(0)}</div>
            <div class="stat-label">Materiales</div>
        </div>
        <div class="stat-card sage">
            <div class="stat-icon">✨</div>
            <div class="stat-value">$ ${totalProfit.toFixed(0)}</div>
            <div class="stat-label">Ganancia neta</div>
        </div>
    </div>`;

    if (projects.length === 0) {
        html += `<div class="empty-state">
            <div class="empty-icon">🎭</div>
            <h3>Sin proyectos de cosplay</h3>
            <p>Registra comisiones, trajes en venta, pelucas o props con sus materiales, medidas y señas.</p>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap">
                <button class="btn btn-secondary" onclick="showCosplayQuoteCalculator()">🧮 Calcular presupuesto</button>
                <button class="btn btn-primary" onclick="showCosplayProjectForm()">+ Crear primer cosplay</button>
            </div>
        </div>`;
        el.innerHTML = html;
        return;
    }

    const filters = [
        { id: 'all', label: `Todos (${projects.length})` },
        { id: 'active', label: `Activos (${activeList.length})` },
        { id: 'unpaid', label: `Por cobrar (${projects.filter(p => (p.balance_due || 0) > 0 && p.status !== 'entregado').length})` },
        { id: 'stock', label: `Stock / Propio (${projects.filter(p => p.project_type === 'Stock / Venta' || p.project_type === 'Propio').length})` },
        { id: 'done', label: `Entregados (${projects.filter(p => p.status === 'entregado').length})` },
    ];

    html += `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <div class="subnav" style="margin-bottom:0">
            ${filters.map(f => `<button class="subnav-item${state.cosplayFilter === f.id ? ' active' : ''}" onclick="setCosplayFilter('${f.id}')">${f.label}</button>`).join('')}
        </div>
        <input type="text" id="cosplaySearchInput" class="form-control" placeholder="🔍 Buscar personaje, serie o cliente..." value="${esc(state.cosplaySearch)}" oninput="onCosplaySearchInput(this.value)" style="max-width:260px;padding:6px 12px;font-size:0.84rem">
    </div>
    <div id="cosplaysGridMount">${buildCosplaysGridHTML(projects)}</div>`;

    el.innerHTML = html;
}

function setCosplayFilter(filterId) {
    state.cosplayFilter = filterId;
    const mount = document.getElementById('cosplaysGridMount');
    if (mount) {
        mount.innerHTML = buildCosplaysGridHTML(state.cosplayProjects || []);
        document.querySelectorAll('#view-cosplays .subnav-item').forEach((btn, idx) => {
            const ids = ['all', 'active', 'unpaid', 'stock', 'done'];
            btn.classList.toggle('active', ids[idx] === filterId);
        });
    } else {
        navigate('cosplays');
    }
}

function onCosplaySearchInput(val) {
    state.cosplaySearch = val || '';
    const mount = document.getElementById('cosplaysGridMount');
    if (mount) {
        mount.innerHTML = buildCosplaysGridHTML(state.cosplayProjects || []);
    }
}

function buildCosplaysGridHTML(projects) {
    const f = state.cosplayFilter || 'all';
    const q = (state.cosplaySearch || '').trim().toLowerCase();
    const filtered = projects.filter(p => {
        if (f === 'active' && p.status === 'entregado') return false;
        if (f === 'unpaid' && (!p.balance_due || p.balance_due <= 0 || p.status === 'entregado')) return false;
        if (f === 'stock' && p.project_type !== 'Stock / Venta' && p.project_type !== 'Propio') return false;
        if (f === 'done' && p.status !== 'entregado') return false;
        if (q) {
            const hay = `${p.character_name || ''} ${p.series_name || ''} ${p.client_name || ''} ${p.category || ''}`.toLowerCase();
            if (!hay.includes(q)) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        return `<div class="empty-state" style="padding:30px"><p>No hay cosplays en este filtro</p></div>`;
    }

    let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">`;
    for (const p of filtered) {
        const sLabel = COSPLAY_STATUS_LABELS[p.status] || p.status;
        const sCls = COSPLAY_STATUS_CLASSES[p.status] || 'tag-primary';
        const items = p.items || [];
        const doneItems = items.filter(i => i.done).length;
        const pct = items.length > 0 ? Math.round((doneItems / items.length) * 100) : 0;
        const du = daysUntil(p.due_date);
        const dueBadge = du !== null && p.status !== 'entregado'
            ? (du < 0 ? `<span class="tag tag-rose" style="font-size:0.7rem">Atrasado ${Math.abs(du)}d</span>`
               : du <= 7 ? `<span class="tag tag-gold" style="font-size:0.7rem">En ${du}d</span>` : '')
            : '';

        html += `<div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px">
            <div>
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">
                    <div>
                        <span class="tag" style="background:var(--border-light);font-size:0.7rem;margin-right:4px">${esc(p.project_type || 'Comisión')}</span>
                        <span class="tag" style="background:var(--border-light);font-size:0.7rem">${esc(p.category || 'Traje completo')}</span>
                    </div>
                    <span class="tag ${sCls}" style="cursor:pointer" onclick="cycleCosplayStatus(${p.id})" title="Cambiar estado">${sLabel}</span>
                </div>
                <h3 style="font-size:1.12rem;font-weight:700;margin:2px 0">${esc(p.character_name)}</h3>
                ${p.series_name ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:6px">${esc(p.series_name)}</div>` : ''}

                <div style="font-size:0.82rem;display:flex;flex-direction:column;gap:3px;margin:8px 0;padding:8px 10px;background:var(--bg);border-radius:10px">
                    <div>👤 <strong>Cliente:</strong> ${esc(p.client_name || 'Propio / Stock')} ${p.client_contact ? `<span style="color:var(--text-muted)">(${esc(p.client_contact)})</span>` : ''}</div>
                    ${p.size_measurements ? `<div>📏 <strong>Medidas:</strong> <span style="color:var(--text-muted)">${esc(p.size_measurements)}</span></div>` : ''}
                    ${p.due_date ? `<div>📅 <strong>Entrega:</strong> ${fmtDate(p.due_date)} ${dueBadge}</div>` : ''}
                </div>

                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center;font-size:0.78rem;margin-bottom:8px">
                    <div style="background:var(--bg);padding:6px;border-radius:8px">
                        <div style="color:var(--text-muted);font-size:0.7rem">Precio / Seña</div>
                        <div style="font-weight:700">$ ${(p.price || 0).toFixed(0)} <span style="font-weight:400;color:var(--text-muted)">(${(p.deposit || 0).toFixed(0)})</span></div>
                    </div>
                    <div style="background:var(--bg);padding:6px;border-radius:8px">
                        <div style="color:var(--text-muted);font-size:0.7rem">Falta cobrar</div>
                        <div style="font-weight:700;color:${p.balance_due > 0 ? 'var(--rose)' : 'var(--sage)'}">$ ${(p.balance_due || 0).toFixed(0)}</div>
                    </div>
                    <div style="background:var(--bg);padding:6px;border-radius:8px">
                        <div style="color:var(--text-muted);font-size:0.7rem">Ganancia</div>
                        <div style="font-weight:700;color:var(--sage)">$ ${(p.profit || 0).toFixed(0)}</div>
                    </div>
                </div>

                ${items.length > 0 ? `
                <div style="margin-top:4px">
                    <div style="display:flex;justify-content:space-between;font-size:0.74rem;color:var(--text-muted);margin-bottom:3px">
                        <span>Avance de piezas / materiales</span>
                        <span>${doneItems}/${items.length} (${pct}%)</span>
                    </div>
                    <div style="height:5px;background:var(--border-light);border-radius:99px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:var(--primary)"></div>
                    </div>
                </div>` : ''}
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--border-light)">
                <button class="btn btn-secondary btn-sm" onclick="showCosplayItemsModal(${p.id})">🧵 Piezas / Materiales (${items.length})</button>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm" onclick="showCosplayProjectForm(${p.id})">✎</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteCosplayProject(${p.id})">✕</button>
                </div>
            </div>
        </div>`;
    }
    html += `</div>`;
    return html;
}

async function cycleCosplayStatus(id) {
    const projects = state.cosplayProjects || await api(eel.get_cosplay_projects) || [];
    const p = projects.find(x => x.id === id);
    if (!p) return;
    const idx = COSPLAY_STATUS_CYCLE.indexOf(p.status);
    const nextStatus = idx >= 0 ? COSPLAY_STATUS_CYCLE[(idx + 1) % COSPLAY_STATUS_CYCLE.length] : 'cotizado';
    const res = await api(eel.save_cosplay_project, { ...p, status: nextStatus });
    if (res && res.ok) {
        showToast('Estado: ' + COSPLAY_STATUS_LABELS[nextStatus]);
        navigate('cosplays');
    }
}

function showCosplayProjectForm(id = null, prefill = null) {
    const p = id ? (state.cosplayProjects || []).find(x => x.id === id) : prefill;
    const clients = state.cosplayClients || [];
    const types = ['Comisión', 'Stock / Venta', 'Propio', 'Alquiler'];
    const cats = ['Traje completo', 'Costura / Traje', 'Props / Armadura', 'Peluca', 'Accesorios'];
    const clientSelectHtml = clients.length > 0 ? `
        <div class="form-group" style="margin-bottom:8px">
            <label>⚡ Autocompletar cliente guardado</label>
            <select class="form-control" onchange="applySavedCosplayClient(this.value)">
                <option value="">— Seleccionar cliente anterior —</option>
                ${clients.map((c, idx) => `<option value="${idx}">${esc(c.name)}${c.contact ? ' (' + esc(c.contact) + ')' : ''}</option>`).join('')}
            </select>
        </div>` : '';

    const html = `<form id="modalForm">
        <div class="form-row">
            <div class="form-group"><label>Personaje *</label><input class="form-control" name="character_name" value="${esc(p && p.character_name ? p.character_name : '')}" placeholder="Ej: Asa Mitaka, 2B, Makima..."></div>
            <div class="form-group"><label>Anime / Juego / Serie</label><input class="form-control" name="series_name" value="${esc(p && p.series_name ? p.series_name : '')}" placeholder="Ej: Chainsaw Man"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Tipo</label><select class="form-control" name="project_type">
                ${types.map(t => `<option value="${t}" ${p && p.project_type === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Categoría</label><select class="form-control" name="category">
                ${cats.map(c => `<option value="${c}" ${p && p.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select></div>
        </div>
        ${clientSelectHtml}
        <div class="form-row">
            <div class="form-group"><label>Cliente</label><input class="form-control" id="cp_client_name" name="client_name" value="${esc(p && p.client_name ? p.client_name : '')}"></div>
            <div class="form-group"><label>Contacto (IG / WhatsApp)</label><input class="form-control" id="cp_client_contact" name="client_contact" value="${esc(p && p.client_contact ? p.client_contact : '')}" placeholder="@usuario o celular"></div>
        </div>
        <div class="form-group"><label>Talla / Medidas del cliente</label><input class="form-control" id="cp_size_meas" name="size_measurements" value="${esc(p && p.size_measurements ? p.size_measurements : '')}" placeholder="Ej: Talla S · Busto 86, Cintura 65, Cadera 92, Alt 1.62"></div>
        <div class="form-row">
            <div class="form-group"><label>Precio total ($)</label><input type="number" step="1" class="form-control" name="price" value="${p && p.price !== undefined ? p.price : ''}"></div>
            <div class="form-group"><label>Seña / Adelanto recibido ($)</label><input type="number" step="1" class="form-control" name="deposit" value="${p && p.deposit !== undefined ? p.deposit : ''}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Costo base materiales ($)</label><input type="number" step="1" class="form-control" name="materials_cost" value="${p && p.materials_cost !== undefined ? p.materials_cost : ''}"></div>
            <div class="form-group"><label>Fecha de entrega / Evento</label><input type="date" class="form-control" name="due_date" value="${p && p.due_date ? p.due_date : ''}"></div>
        </div>
        <div class="form-group"><label>Estado</label><select class="form-control" name="status">
            ${COSPLAY_STATUS_CYCLE.map(s => `<option value="${s}" ${(p && p.status ? p.status : 'cotizado') === s ? 'selected' : ''}>${COSPLAY_STATUS_LABELS[s]}</option>`).join('')}
        </select></div>
        <div class="form-group"><label>Notas / Referencias</label><textarea class="form-control" name="notes">${esc(p && p.notes ? p.notes : '')}</textarea></div>
    </form>`;
    openModal(id ? 'Editar cosplay' : 'Nuevo cosplay', html);
    document.getElementById('modalSave').onclick = async () => {
        const f = new FormData(document.getElementById('modalForm'));
        const data = {
            id: id || null,
            character_name: f.get('character_name'),
            series_name: f.get('series_name'),
            project_type: f.get('project_type'),
            category: f.get('category'),
            client_name: f.get('client_name'),
            client_contact: f.get('client_contact'),
            size_measurements: f.get('size_measurements'),
            price: parseFloat(f.get('price')) || 0,
            deposit: parseFloat(f.get('deposit')) || 0,
            materials_cost: parseFloat(f.get('materials_cost')) || 0,
            due_date: f.get('due_date'),
            status: f.get('status'),
            notes: f.get('notes'),
        };
        if (!data.character_name) { showToast('El personaje es obligatorio'); return; }
        const res = await api(eel.save_cosplay_project, data);
        if (res && res.ok) { showToast('Guardado'); closeModal(); navigate('cosplays'); }
        else showToast('Error');
    };
}

function applySavedCosplayClient(idxStr) {
    if (idxStr === '' || idxStr === null) return;
    const c = (state.cosplayClients || [])[parseInt(idxStr)];
    if (!c) return;
    const nEl = document.getElementById('cp_client_name');
    const cEl = document.getElementById('cp_client_contact');
    const mEl = document.getElementById('cp_size_meas');
    if (nEl) nEl.value = c.name || '';
    if (cEl) cEl.value = c.contact || '';
    if (mEl) mEl.value = c.size_measurements || '';
}

function showCosplayQuoteCalculator() {
    const savedRate = localStorage.getItem('nicole_cosplay_hourly_rate') || '4000';
    const html = `<div>
        <div class="form-row">
            <div class="form-group">
                <label>Costo estimado de telas y materiales ($)</label>
                <input type="number" id="cq_mat" class="form-control" value="25000" oninput="recalcCosplayQuote()">
            </div>
            <div class="form-group">
                <label>Horas de confección / trabajo</label>
                <input type="number" id="cq_hours" class="form-control" value="10" oninput="recalcCosplayQuote()">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Tu valor por hora ($)</label>
                <input type="number" id="cq_rate" class="form-control" value="${esc(savedRate)}" oninput="recalcCosplayQuote()">
            </div>
            <div class="form-group">
                <label>Insumos extra / complejidad (%)</label>
                <input type="number" id="cq_margin" class="form-control" value="15" oninput="recalcCosplayQuote()">
            </div>
        </div>
        <div class="card" style="background:var(--bg);padding:14px 16px;margin-top:8px">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
                <div>
                    <div style="font-size:0.74rem;color:var(--text-muted)">Precio Sugerido</div>
                    <div id="cq_total" style="font-size:1.25rem;font-weight:700;color:var(--primary)">$ 0</div>
                </div>
                <div>
                    <div style="font-size:0.74rem;color:var(--text-muted)">Seña (50%)</div>
                    <div id="cq_deposit" style="font-size:1.15rem;font-weight:700">$ 0</div>
                </div>
                <div>
                    <div style="font-size:0.74rem;color:var(--text-muted)">Ganancia Neta</div>
                    <div id="cq_profit" style="font-size:1.15rem;font-weight:700;color:var(--sage)">$ 0</div>
                </div>
            </div>
        </div>
    </div>`;
    openModal('🧮 Calculadora de Comisión', html);
    const saveBtn = document.getElementById('modalSave');
    saveBtn.textContent = '✨ Crear cosplay con este precio';
    saveBtn.onclick = () => {
        const { mat, total, deposit } = recalcCosplayQuote();
        saveBtn.textContent = 'Guardar';
        showCosplayProjectForm(null, {
            price: total,
            deposit: deposit,
            materials_cost: mat,
            status: 'cotizado'
        });
    };
    recalcCosplayQuote();
}

function recalcCosplayQuote() {
    const mat = parseFloat(document.getElementById('cq_mat')?.value) || 0;
    const hours = parseFloat(document.getElementById('cq_hours')?.value) || 0;
    const rate = parseFloat(document.getElementById('cq_rate')?.value) || 0;
    const marginPct = parseFloat(document.getElementById('cq_margin')?.value) || 0;
    if (rate > 0) localStorage.setItem('nicole_cosplay_hourly_rate', String(rate));

    const labor = hours * rate;
    const subtotal = mat + labor;
    const total = Math.round(subtotal * (1 + marginPct / 100));
    const deposit = Math.round(total * 0.5);
    const profit = Math.max(0, total - mat);

    const tEl = document.getElementById('cq_total');
    const dEl = document.getElementById('cq_deposit');
    const pEl = document.getElementById('cq_profit');
    if (tEl) tEl.textContent = '$ ' + total.toLocaleString('es-AR');
    if (dEl) dEl.textContent = '$ ' + deposit.toLocaleString('es-AR');
    if (pEl) pEl.textContent = '$ ' + profit.toLocaleString('es-AR');
    return { mat, total, deposit, profit };
}

async function showCosplayClientsModal() {
    const clients = await api(eel.get_cosplay_clients) || [];
    state.cosplayClients = clients;

    let html = `<div>
        <div style="background:var(--bg);padding:10px 12px;border-radius:10px;margin-bottom:12px">
            <div style="font-size:0.78rem;font-weight:700;margin-bottom:6px">+ Guardar / Actualizar ficha de cliente</div>
            <div class="form-row">
                <div class="form-group" style="margin-bottom:6px"><input id="cc_name" class="form-control" placeholder="Nombre del cliente *"></div>
                <div class="form-group" style="margin-bottom:6px"><input id="cc_contact" class="form-control" placeholder="@instagram o WhatsApp"></div>
            </div>
            <div style="display:flex;gap:6px">
                <input id="cc_meas" class="form-control" placeholder="Medidas (Ej: Talla S · Busto 86, Cintura 65, Cadera 92, Alt 1.62)" style="flex:1">
                <button type="button" class="btn btn-primary btn-sm" onclick="saveCosplayClientFromModal()">Guardar</button>
            </div>
        </div>`;

    if (clients.length === 0) {
        html += `<div class="empty-state" style="padding:18px"><p>Aún no hay fichas de clientes guardadas</p></div>`;
    } else {
        html += `<div style="max-height:280px;overflow-y:auto">`;
        clients.forEach((c, idx) => {
            html += `<div class="card" style="padding:10px 12px;margin-bottom:8px;background:var(--bg);display:flex;justify-content:space-between;align-items:center;gap:8px">
                <div style="flex:1;cursor:pointer" onclick="fillCosplayClientForm(${idx})" title="Clic para editar arriba">
                    <div style="font-weight:700;font-size:0.9rem">👤 ${esc(c.name)} ${c.contact ? `<span style="font-weight:400;color:var(--text-muted)">(${esc(c.contact)})</span>` : ''}</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">📏 ${esc(c.size_measurements || 'Sin medidas registradas')}</div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-secondary btn-sm" onclick="closeModal();showCosplayProjectForm(null,${esc(JSON.stringify({client_name: c.name || '', client_contact: c.contact || '', size_measurements: c.size_measurements || ''}))})">+ Cosplay</button>
                    ${c.id ? `<button class="btn btn-ghost btn-sm" onclick="deleteCosplayClientFromModal(${c.id})">✕</button>` : ''}
                </div>
            </div>`;
        });
        html += `</div>`;
    }
    html += `</div>`;

    openModal('👥 Fichas de Clientes y Medidas', html);
    document.getElementById('modalSave').style.display = 'none';
    document.getElementById('modalCancel').textContent = 'Cerrar';
    document.getElementById('modalCancel').onclick = () => { closeModal(); navigate('cosplays'); };
}

function fillCosplayClientForm(idx) {
    const c = (state.cosplayClients || [])[idx];
    if (!c) return;
    document.getElementById('cc_name').value = c.name || '';
    document.getElementById('cc_contact').value = c.contact || '';
    document.getElementById('cc_meas').value = c.size_measurements || '';
}

async function saveCosplayClientFromModal() {
    const name = document.getElementById('cc_name')?.value.trim();
    const contact = document.getElementById('cc_contact')?.value.trim();
    const size_measurements = document.getElementById('cc_meas')?.value.trim();
    if (!name) { showToast('Ingresa el nombre del cliente'); return; }
    await api(eel.save_cosplay_client, { name, contact, size_measurements });
    showToast('Ficha guardada');
    showCosplayClientsModal();
}

async function deleteCosplayClientFromModal(id) {
    if (!confirm('¿Eliminar esta ficha de cliente?')) return;
    await api(eel.delete_cosplay_client, id);
    showCosplayClientsModal();
}

async function deleteCosplayProject(id) {
    if (!confirm('¿Eliminar este proyecto de cosplay?')) return;
    await api(eel.delete_cosplay_project, id);
    showToast('Eliminado');
    navigate('cosplays');
}

async function showCosplayItemsModal(projectId) {
    const projects = await api(eel.get_cosplay_projects) || [];
    state.cosplayProjects = projects;
    const p = projects.find(x => x.id === projectId);
    if (!p) return;
    const items = p.items || [];

    let html = `<div>
        <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">
            <input id="ci_name" class="form-control" placeholder="Ej: Tela gabardina 2m, Peluca base, Espada EVA..." style="flex:2;min-width:160px" onkeydown="if(event.key==='Enter')addCosplayItemFromModal(${p.id})">
            <select id="ci_type" class="form-control" style="width:120px">
                <option value="Material">🛒 Material</option>
                <option value="Pieza">✂️ Pieza</option>
                <option value="Prop">⚔️ Prop</option>
                <option value="Peluca">💇‍♀️ Peluca</option>
            </select>
            <input id="ci_cost" type="number" step="0.5" class="form-control" placeholder="Costo $" style="width:95px" onkeydown="if(event.key==='Enter')addCosplayItemFromModal(${p.id})">
            <button type="button" class="btn btn-primary btn-sm" onclick="addCosplayItemFromModal(${p.id})">+ Añadir</button>
        </div>`;

    if (items.length === 0) {
        html += `<div class="empty-state" style="padding:18px"><p>Sin piezas ni materiales anotados</p></div>`;
    } else {
        html += `<div style="max-height:280px;overflow-y:auto">`;
        for (const it of items) {
            html += `<div class="habit-item" style="padding:7px 4px">
                <div class="habit-check${it.done ? ' done' : ''}" onclick="toggleCosplayItemFromModal(${p.id}, ${it.id})"></div>
                <div style="flex:1;${it.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">
                    <span class="tag" style="background:var(--border-light);font-size:0.68rem;margin-right:4px">${esc(it.item_type || 'Material')}</span>
                    <strong>${esc(it.name)}</strong>
                </div>
                ${it.cost > 0 ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-right:8px">$ ${parseFloat(it.cost).toFixed(1)}</div>` : ''}
                <button class="btn btn-ghost btn-sm" onclick="deleteCosplayItemFromModal(${p.id}, ${it.id})">✕</button>
            </div>`;
        }
        html += `</div>`;
    }
    html += `</div>`;

    openModal(`🧵 ${p.character_name} · Piezas y Materiales`, html);
    document.getElementById('modalSave').style.display = 'none';
    document.getElementById('modalCancel').textContent = 'Cerrar';
    document.getElementById('modalCancel').onclick = () => { closeModal(); navigate('cosplays'); };
}

async function addCosplayItemFromModal(projectId) {
    const name = document.getElementById('ci_name').value.trim();
    const item_type = document.getElementById('ci_type').value;
    const cost = parseFloat(document.getElementById('ci_cost').value) || 0;
    if (!name) return;
    await api(eel.add_cosplay_item, { project_id: projectId, name, item_type, cost });
    showCosplayItemsModal(projectId);
}

async function toggleCosplayItemFromModal(projectId, itemId) {
    await api(eel.toggle_cosplay_item, itemId);
    showCosplayItemsModal(projectId);
}

async function deleteCosplayItemFromModal(projectId, itemId) {
    await api(eel.delete_cosplay_item, itemId);
    showCosplayItemsModal(projectId);
}

// ===================== SETTINGS =====================
async function renderSettings(el) {
    const cloudUrl = 'https://nicolecarp.pythonanywhere.com';
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(cloudUrl)}`;
    const sInfo = await api(eel.get_shortcut_info) || { token: '', shortcut_endpoint: `${cloudUrl}/api/shortcut` };

    const hasNotifApi = ('Notification' in window);
    const perm = hasNotifApi ? Notification.permission : 'unsupported';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    const prefRest = localStorage.getItem('nicole_notif_rest') !== '0';
    const prefHealth = localStorage.getItem('nicole_notif_health') !== '0';
    const prefTasks = localStorage.getItem('nicole_notif_tasks') !== '0';
    const prefWeather = localStorage.getItem('nicole_notif_weather') !== '0';
    const dailyNotifTime = localStorage.getItem('nicole_daily_notif_time') || '09:00';

    let statusBadge = '';
    if (perm === 'granted') {
        statusBadge = `<span class="tag tag-sage">Activas ✅</span>`;
    } else if (perm === 'denied') {
        statusBadge = `<span class="tag" style="background:var(--rose);color:#fff">Bloqueadas en navegador</span>`;
    } else if (isIOS && !isStandalone) {
        statusBadge = `<span class="tag tag-gold">Abrir desde Pantalla de Inicio</span>`;
    } else {
        statusBadge = `<span class="tag tag-primary">Sin activar</span>`;
    }

    el.innerHTML = `<div class="page-header">
        <div><h1>Ajustes</h1><div class="subtitle">Notificaciones, nube y acceso móvil</div></div>
    </div>
    <div class="settings-section">
        <div class="card" style="margin-bottom:18px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
                <div>
                    <div style="font-size:1rem;font-weight:700">🔔 Notificaciones, Sonido y Vibración</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">Avisos de descanso de rutina, inyección de Estradiol y entregas</div>
                </div>
                ${statusBadge}
            </div>
            ${(isIOS && !isStandalone) ? `
                <div style="padding:10px 14px;border-radius:10px;background:var(--primary-light);font-size:0.82rem;margin-bottom:12px">
                    📲 <strong>Tip para iPhone:</strong> Para que iOS permita notificaciones y vibración nativa, tocá <strong>Compartir ⬆️ → Agregar a pantalla de inicio</strong> en Safari y abrí la app desde ese ícono.
                </div>
            ` : ''}
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
                ${perm !== 'granted' ? `<button type="button" class="btn btn-primary btn-sm" onclick="requestNotificationPermission()">🔔 Activar notificaciones</button>` : ''}
                <button type="button" class="btn btn-secondary btn-sm" onclick="testSoundAndNotification()">🔊 Probar sonido, vibración y alerta</button>
                ${perm === 'granted' ? `<button type="button" class="btn btn-ghost btn-sm" onclick="checkSmartDailyNotifications(true)">🌸 Enviar resumen de hoy</button>` : ''}
            </div>
            <div style="display:flex;flex-direction:column;gap:12px;padding-top:14px;border-top:1px solid var(--border-light);font-size:0.86rem">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--border-light)">
                    <div>
                        <div style="font-weight:600">⏰ Horario del resumen diario</div>
                        <div style="font-size:0.78rem;color:var(--text-muted)">Configurado a las 09:00 AM. Nicole enviará el resumen del día a esta hora.</div>
                    </div>
                    <div>
                        <input type="time" value="${dailyNotifTime}" onchange="changeDailyNotifTime(this.value)" class="form-control" style="width:115px;padding:4px 8px;font-size:0.9rem;border-radius:8px">
                    </div>
                </div>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                    <input type="checkbox" ${prefWeather ? 'checked' : ''} onchange="toggleNotifPref('nicole_notif_weather', this.checked)">
                    <span>🌤️ Incluir resumen del clima en la notificación matutina</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                    <input type="checkbox" ${prefRest ? 'checked' : ''} onchange="toggleNotifPref('nicole_notif_rest', this.checked)">
                    <span>⏰ Avisar al terminar el descanso entre series (Mi Rutina)</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                    <input type="checkbox" ${prefHealth ? 'checked' : ''} onchange="toggleNotifPref('nicole_notif_health', this.checked)">
                    <span>💉 Recordatorios de inyección de Estradiol, stock y laboratorio</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
                    <input type="checkbox" ${prefTasks ? 'checked' : ''} onchange="toggleNotifPref('nicole_notif_tasks', this.checked)">
                    <span>📌 Recordatorios de tareas, parciales de la facu y entregas de cosplay</span>
                </label>
            </div>
        </div>

        <div class="card">
            <div style="display:flex;gap:22px;align-items:center;flex-wrap:wrap">
                <div style="background:#fff;padding:10px;border-radius:14px;border:1px solid var(--border);flex-shrink:0">
                    <img src="${qrSrc}" alt="QR Acceso iPhone" style="width:130px;height:130px;display:block" onerror="this.style.display='none'">
                </div>
                <div style="flex:1;min-width:240px">
                    <div style="font-size:1rem;font-weight:700;margin-bottom:6px">📱 Tu link en la nube (iPhone / PC)</div>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
                        <code style="padding:8px 14px;border-radius:10px;background:var(--primary-light);color:var(--primary);font-size:0.95rem;font-weight:700;user-select:all">${cloudUrl}</code>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="copyLanUrl('${cloudUrl}')">📋 Copiar link</button>
                    </div>
                    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                        <button class="btn btn-primary btn-sm" onclick="syncCloudFromGithub()">🔄 Actualizar app desde GitHub</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top:18px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
                <div>
                    <div style="font-size:1rem;font-weight:700">🍏 Atajos de Siri & Apple Shortcuts</div>
                    <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">Comandos de voz con Siri, Botón de Acción o widgets en iPhone y Apple Watch</div>
                </div>
                <span class="tag tag-sage">Listo para usar ⚡</span>
            </div>

            <div style="padding:12px 14px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border-light);margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
                    <span style="font-size:0.84rem;font-weight:600">🔑 Token Secreto de Atajos:</span>
                    <div style="display:flex;gap:8px">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="copyShortcutToken('${esc(sInfo.token)}')">📋 Copiar Token</button>
                        <button type="button" class="btn btn-ghost btn-sm" onclick="regenerateSiriToken()">🔄 Regenerar</button>
                    </div>
                </div>
                <code style="display:block;padding:8px 12px;border-radius:8px;background:var(--bg-card);font-size:0.85rem;font-family:monospace;word-break:break-all;color:var(--primary);user-select:all">${esc(sInfo.token)}</code>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">
                    URL Base: <code>${esc(sInfo.shortcut_endpoint)}</code>
                </div>
            </div>

            <div style="font-size:0.88rem;font-weight:600;margin-bottom:10px">🎙️ Atajos configurados y listos:</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:10px">
                <div style="padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-light)">
                    <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px">💉 Registrar Inyección TRH</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">"Oye Siri, registrar inyección"</div>
                    <div style="font-size:0.75rem">Acción: <code>log_injection</code></div>
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="showShortcutSetupModal('log_injection')">ℹ️ Cómo configurar en iPhone</button>
                </div>
                <div style="padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-light)">
                    <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px">🏋️ Registrar Serie de Gym</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">"Oye Siri, serie de Sentadilla"</div>
                    <div style="font-size:0.75rem">Acción: <code>log_workout_set</code></div>
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="showShortcutSetupModal('log_workout_set')">ℹ️ Cómo configurar en iPhone</button>
                </div>
                <div style="padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-light)">
                    <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px">☀️ Resumen del Día (Briefing)</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">"Oye Siri, ¿qué tengo hoy en Nicole?"</div>
                    <div style="font-size:0.75rem">Acción: <code>daily_summary</code></div>
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="showShortcutSetupModal('daily_summary')">ℹ️ Cómo configurar en iPhone</button>
                </div>
                <div style="padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-light)">
                    <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px">⚖️ Registrar Peso Corporal</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">"Oye Siri, registrar peso"</div>
                    <div style="font-size:0.75rem">Acción: <code>log_weight</code></div>
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="showShortcutSetupModal('log_weight')">ℹ️ Cómo configurar en iPhone</button>
                </div>
                <div style="padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-light)">
                    <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px">📌 Nueva Tarea Rápida</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">"Oye Siri, nueva tarea: Comprar..."</div>
                    <div style="font-size:0.75rem">Acción: <code>create_task</code></div>
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="showShortcutSetupModal('create_task')">ℹ️ Cómo configurar en iPhone</button>
                </div>
                <div style="padding:12px;border-radius:10px;background:var(--bg-card);border:1px solid var(--border-light)">
                    <div style="font-weight:700;font-size:0.88rem;margin-bottom:4px">💵 Registrar Viático de Campo</div>
                    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">"Oye Siri, viático taxi 20 soles"</div>
                    <div style="font-size:0.75rem">Acción: <code>create_reimbursement</code></div>
                    <button class="btn btn-ghost btn-sm" style="margin-top:8px;width:100%" onclick="showShortcutSetupModal('create_reimbursement')">ℹ️ Cómo configurar en iPhone</button>
                </div>
            </div>
        </div>
    </div>`;
}

function copyShortcutToken(token) {
    if (!token) { showToast('Token no disponible'); return; }
    navigator.clipboard.writeText(token).then(() => {
        showToast('🔑 Token copiado al portapapeles');
    }).catch(() => {
        copyLanUrl(token);
    });
}

async function regenerateSiriToken() {
    if (!confirm('¿Regenerar el token de Atajos de Siri? Deberás actualizar el token en tus Atajos de iPhone configurados.')) return;
    const res = await api(eel.regenerate_shortcut_token);
    if (res && res.ok) {
        showToast('✨ Nuevo token generado');
        navigate('settings');
    } else {
        showToast('Error al regenerar token');
    }
}

async function showShortcutSetupModal(actionId) {
    const sInfo = await api(eel.get_shortcut_info) || {};
    const token = sInfo.token || '';
    const cloudUrl = sInfo.cloud_url || 'https://nicolecarp.pythonanywhere.com';

    const guides = {
        'daily_summary': {
            title: '☀️ Atajo: Resumen del Día',
            phrase: '¿Qué tengo hoy en Nicole?',
            method: 'GET',
            url: `${cloudUrl}/api/shortcut/daily_summary?token=${token}`,
            steps: [
                'Abre la app <strong>Atajos</strong> en tu iPhone y toca el <strong>+</strong>.',
                'Nombra el atajo: <em>¿Qué tengo hoy en Nicole?</em>',
                'Agrega la acción: <strong>Obtener contenido de URL</strong>.',
                `Configura la URL: <code style="word-break:break-all">${cloudUrl}/api/shortcut/daily_summary?token=${token}</code> (Método: GET).`,
                'Agrega la acción: <strong>Obtener valor de diccionario</strong> con clave: <code>message</code>.',
                'Agrega la acción: <strong>Leer texto con voz</strong> pasando el valor anterior.',
                '¡Listo! Ahora di <em>"Oye Siri, ¿qué tengo hoy en Nicole?"</em> y Siri te hablará con tu agenda.'
            ]
        },
        'log_injection': {
            title: '💉 Atajo: Registrar Inyección TRH',
            phrase: 'Registrar inyección',
            method: 'POST',
            url: `${cloudUrl}/api/shortcut/log_injection?token=${token}`,
            steps: [
                'Abre la app <strong>Atajos</strong> en tu iPhone y toca <strong>+</strong>.',
                'Nombra el atajo: <em>Registrar inyección</em>.',
                'Agrega la acción: <strong>Obtener contenido de URL</strong> con método <strong>POST</strong>.',
                `URL: <code style="word-break:break-all">${cloudUrl}/api/shortcut/log_injection?token=${token}</code>.`,
                'En el cuerpo JSON, puedes incluir (opcional): <code>dose_mg</code>: 4.0.',
                'Agrega: <strong>Obtener valor de diccionario</strong> (clave: <code>message</code>) → <strong>Leer texto con voz</strong>.',
                '¡Listo! También puedes asignarlo al <strong>Botón de Acción</strong> del iPhone.'
            ]
        },
        'log_weight': {
            title: '⚖️ Atajo: Registrar Peso',
            phrase: 'Registrar peso',
            method: 'POST',
            url: `${cloudUrl}/api/shortcut/log_weight?token=${token}`,
            steps: [
                'Abre <strong>Atajos</strong> y toca <strong>+</strong>.',
                'Agrega la acción: <strong>Solicitar entrada</strong> (Tipo: Número, Pregunta: "¿Cuánto pesas hoy?").',
                'Agrega: <strong>Obtener contenido de URL</strong> con método <strong>POST</strong>.',
                `URL: <code style="word-break:break-all">${cloudUrl}/api/shortcut/log_weight?token=${token}</code>.`,
                'En el cuerpo JSON agrega: clave <code>weight</code> con el valor de la <strong>Entrada provista</strong>.',
                'Agrega: <strong>Obtener valor de diccionario</strong> (clave: <code>message</code>) → <strong>Leer con voz</strong>.'
            ]
        },
        'log_workout_set': {
            title: '🏋️ Atajo: Registrar Serie de Gimnasio',
            phrase: 'Anotar serie',
            method: 'POST',
            url: `${cloudUrl}/api/shortcut/log_workout_set?token=${token}`,
            steps: [
                'Abre <strong>Atajos</strong> y toca <strong>+</strong>.',
                'Agrega: <strong>Solicitar entrada</strong> (Texto: "¿Qué ejercicio?").',
                'Agrega: <strong>Solicitar entrada</strong> (Número: "¿Kilos?").',
                'Agrega: <strong>Solicitar entrada</strong> (Número: "¿Repeticiones?").',
                'Agrega: <strong>Obtener contenido de URL</strong> (POST).',
                `URL: <code style="word-break:break-all">${cloudUrl}/api/shortcut/log_workout_set?token=${token}</code>.`,
                'En el cuerpo JSON agrega los campos: <code>exercise_name</code>, <code>weight</code> y <code>reps</code>.',
                'Agrega: <strong>Leer texto con voz</strong> con el valor de la clave <code>message</code>.'
            ]
        },
        'create_task': {
            title: '📌 Atajo: Nueva Tarea',
            phrase: 'Nueva tarea en Nicole',
            method: 'POST',
            url: `${cloudUrl}/api/shortcut/create_task?token=${token}`,
            steps: [
                'Abre <strong>Atajos</strong> y toca <strong>+</strong>.',
                'Agrega: <strong>Solicitar entrada</strong> (Texto: "¿Qué tarea quieres anotar?").',
                'Agrega: <strong>Obtener contenido de URL</strong> (POST).',
                `URL: <code style="word-break:break-all">${cloudUrl}/api/shortcut/create_task?token=${token}</code>.`,
                'En el cuerpo JSON agrega: <code>title</code> con la entrada provista y <code>area</code>: personal.',
                'Agrega: <strong>Leer texto con voz</strong> con <code>message</code>.'
            ]
        },
        'create_reimbursement': {
            title: '💵 Atajo: Registrar Viático',
            phrase: 'Registrar viático',
            method: 'POST',
            url: `${cloudUrl}/api/shortcut/create_reimbursement?token=${token}`,
            steps: [
                'Abre <strong>Atajos</strong> y toca <strong>+</strong>.',
                'Agrega: <strong>Solicitar entrada</strong> (Número: "¿Monto en soles?").',
                'Agrega: <strong>Solicitar entrada</strong> (Texto: "¿Concepto o motivo?").',
                'Agrega: <strong>Obtener contenido de URL</strong> (POST).',
                `URL: <code style="word-break:break-all">${cloudUrl}/api/shortcut/create_reimbursement?token=${token}</code>.`,
                'En el cuerpo JSON agrega: <code>amount</code> y <code>concept</code>.',
                'Agrega: <strong>Leer texto con voz</strong> con <code>message</code>.'
            ]
        }
    };

    const g = guides[actionId] || guides['daily_summary'];
    const stepsHtml = g.steps.map((st, i) => `<li style="margin-bottom:8px">${st}</li>`).join('');

    const html = `<div style="font-size:0.88rem;line-height:1.5">
        <div style="padding:10px 14px;border-radius:10px;background:var(--primary-light);color:var(--primary);margin-bottom:14px">
            🗣️ <strong>Frase de activación con Siri:</strong> <em>"${g.phrase}"</em>
        </div>
        <div style="font-weight:600;margin-bottom:6px">📋 Pasos en la app Atajos de iOS:</div>
        <ol style="padding-left:20px;margin-bottom:16px">${stepsHtml}</ol>
        <div style="margin-top:14px">
            <button class="btn btn-secondary btn-sm" onclick="copyLanUrl('${esc(g.url)}')">📋 Copiar URL del Atajo</button>
        </div>
    </div>`;

    openModal(g.title, html);
}

async function syncCloudFromGithub() {
    showToast('Descargando cambios desde GitHub...');
    try {
        const res = await fetch('/webhook/github', { method: 'POST' });
        const data = await res.json();
        if (data && data.ok) {
            showToast('✨ Actualizado! Recargando...');
            setTimeout(() => window.location.reload(), 2500);
        } else {
            showToast('Resultado: ' + (data.output || 'Usa git pull en local'));
        }
    } catch (e) {
        showToast('Solo disponible en la versión nube');
    }
}
window.syncCloudFromGithub = syncCloudFromGithub;

function copyLanUrl(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => showToast('Link copiado ✨'));
    } else {
        showToast(url);
    }
}

// ===== GLOBAL: expose functions to HTML onclick =====
window.navigate = navigate;
window.copyShortcutToken = copyShortcutToken;
window.regenerateSiriToken = regenerateSiriToken;
window.showShortcutSetupModal = showShortcutSetupModal;
window.switchWorkTab = switchWorkTab;
window.calMove = calMove;
window.showTaskForm = showTaskForm;
window.completeTask = completeTask;
window.deleteTask = deleteTask;
window.showEmpresaForm = showEmpresaForm;
window.showClientSiteForm = showClientSiteForm;
window.deleteClientSite = deleteClientSite;
window.showInvoiceForm = showInvoiceForm;
window.deleteInvoice = deleteInvoice;
window.toggleInvoiceSort = toggleInvoiceSort;
window.showQuickBillOcModal = showQuickBillOcModal;
window.calcDueDateInfo = calcDueDateInfo;
window.updateQuickBillDueDate = updateQuickBillDueDate;
window.showEditSiteModal = showEditSiteModal;
window.copySunatField = copySunatField;
window.saveQuickBillOc = saveQuickBillOc;
window.copyExtCalcSummary = copyExtCalcSummary;
window.saveExtCalculatorInvoice = saveExtCalculatorInvoice;
window.resetExtCalculator = resetExtCalculator;
window.onExtCalcCustomDueDateChange = onExtCalcCustomDueDateChange;
window.onExtCalcIssueDateChange = onExtCalcIssueDateChange;
window.onExtCalcDueTermChange = onExtCalcDueTermChange;
window.onExtCalcSiteChange = onExtCalcSiteChange;
window.onExtCalcClientChange = onExtCalcClientChange;
window.onExtCalcRucInput = onExtCalcRucInput;
window.copySunatRaw = copySunatField;
window.showQuoteForm = showQuoteForm;
window.deleteQuote = deleteQuote;
window.downloadQuoteWord = downloadQuoteWord;
window.addQuoteLine = addQuoteLine;
window.removeQuoteLine = removeQuoteLine;
window.generateIALine = generateIALine;
window.recalcQuoteLine = recalcQuoteLine;
window.recalcQuoteTotals = recalcQuoteTotals;
window.onQuoteTypeChange = onQuoteTypeChange;
window.onQuoteDescChange = onQuoteDescChange;
window.showEmployeeForm = showEmployeeForm;
window.toggleEmployee = toggleEmployee;
window.deleteEmployee = deleteEmployee;
window.showDocForm = showDocForm;
window.deleteDoc = deleteDoc;
window.showReimbForm = showReimbForm;
window.deleteReimb = deleteReimb;
window.showOvertimeForm = showOvertimeForm;
window.deleteOvertime = deleteOvertime;
window.showContactForm = showContactForm;
window.deleteContact = deleteContact;
window.completeForm = completeForm;
window.showSubjectForm = showSubjectForm;
window.deleteSubject = deleteSubject;
window.showExamForm = showExamForm;
window.showExamModal = showExamModal;
window.editExamById = editExamById;
window.deleteExam = deleteExam;
window.showAssignmentForm = showAssignmentForm;
window.showAssignmentModal = showAssignmentModal;
window.editAssignmentById = editAssignmentById;
window.deleteAssignment = deleteAssignment;
window.showPersonalTaskForm = showPersonalTaskForm;
window.showHabitForm = showHabitForm;
window.toggleHabit = toggleHabit;
window.deleteHabit = deleteHabit;
window.showCosplayProjectForm = showCosplayProjectForm;
window.deleteCosplayProject = deleteCosplayProject;
window.cycleCosplayStatus = cycleCosplayStatus;
window.showCosplayItemsModal = showCosplayItemsModal;
window.addCosplayItemFromModal = addCosplayItemFromModal;
window.toggleCosplayItemFromModal = toggleCosplayItemFromModal;
window.deleteCosplayItemFromModal = deleteCosplayItemFromModal;
window.showDayEvents = showDayEvents;
window.toggleCompletedTasks = toggleCompletedTasks;
window.showInjectionForm = showInjectionForm;
window.deleteInjection = deleteInjection;
window.switchHealthTab = switchHealthTab;
window.showMeasurementForm = showMeasurementForm;
window.deleteMeasurement = deleteMeasurement;
window.saveQuickMeasurement = saveQuickMeasurement;
window.showMeasurementGoalsModal = showMeasurementGoalsModal;
window.setMeasurementRange = setMeasurementRange;
window.setMeasurementMetricPreset = setMeasurementMetricPreset;
window.buscarRucSunat = buscarRucSunat;
window.convertQuoteToInvoice = convertQuoteToInvoice;
window.changeLindleyValPeriod = changeLindleyValPeriod;
window.toggleTheme = toggleTheme;
window.switchPersonalTab = switchPersonalTab;
window.selectRoutineDay = selectRoutineDay;
window.selectLiveWorkoutStep = selectLiveWorkoutStep;
window.copyLanUrl = copyLanUrl;
window.showWorkoutDayForm = showWorkoutDayForm;
window.deleteWorkoutDay = deleteWorkoutDay;
window.showWorkoutExerciseForm = showWorkoutExerciseForm;
window.deleteWorkoutExercise = deleteWorkoutExercise;
window.startLiveWorkout = startLiveWorkout;
window.updateLiveSet = updateLiveSet;
window.addLiveSetRow = addLiveSetRow;
window.toggleLiveSetDone = toggleLiveSetDone;
window.startRestTimer = startRestTimer;
window.adjustRestTimer = adjustRestTimer;
window.skipRestTimer = skipRestTimer;
window.cancelLiveWorkout = cancelLiveWorkout;
window.finishLiveWorkout = finishLiveWorkout;
window.changeWorkoutProgressEx = changeWorkoutProgressEx;
window.changeWorkoutProgressMetric = changeWorkoutProgressMetric;
window.deleteWorkoutSession = deleteWorkoutSession;
window.showQuickExerciseLogModal = showQuickExerciseLogModal;

window.toggleEmpresaExpand = toggleEmpresaExpand;
window.expandAllEmpresas = expandAllEmpresas;
window.onSearchMatrixMain = onSearchMatrixMain;
window.clearMatrixSearch = clearMatrixSearch;
window.filterMatrixPeriodicity = filterMatrixPeriodicity;
window.filterMatrixOcStatus = filterMatrixOcStatus;
window.filterMatrixOcPeriodicity = filterMatrixOcPeriodicity;
window.filterMatrixOcMonth = filterMatrixOcMonth;
window.onSearchMatrixOc = onSearchMatrixOc;
window.showOcItemsModal = showOcItemsModal;
window.renderWorkMatrix = renderWorkMatrix;
window.changeMatrixYear = changeMatrixYear;
window.changeMatrixMonth = changeMatrixMonth;
window.filterMatrixOc = filterMatrixOc;
window.handleMatrixCellOc = handleMatrixCellOc;
window.emitInvoiceFromOc = emitInvoiceFromOc;
window.showPurchaseOrderModal = showPurchaseOrderModal;
window.onPoClientChanged = onPoClientChanged;
window.savePurchaseOrderForm = savePurchaseOrderForm;
window.deletePurchaseOrder = deletePurchaseOrder;

// ===================== FINANZAS =====================

function fmtARS(n) {
    if (isNaN(n) || n === null || n === undefined) return '$ 0';
    return '$ ' + Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtUSD(n) {
    if (isNaN(n) || n === null || n === undefined) return 'US$ 0';
    return 'US$ ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

async function renderFinance(el) {
    const tab = state.financeTab || 'resumen';
    const month = state.financeMonth || (new Date().getMonth() + 1);
    const year = state.financeYear || new Date().getFullYear();

    const summaryRes = await api(eel.get_finance_summary, month, year);
    const summary = (summaryRes && summaryRes.ok) ? summaryRes : {
        total_income: 0, total_expense: 0, net_balance: 0,
        expenses_by_category: [], incomes_by_category: [],
        accounts: [], goal: null, transactions: [],
        debts_summary: { total_original: 0, total_paid: 0, total_remaining: 0, progress_percent: 0, active_count: 0, paid_count: 0 },
        recurring_summary: { total_expected: 0, total_paid: 0, total_pending: 0, total_items: 0, paid_count: 0, pending_count: 0 },
        salary_summary: { has_record: false, expected_amount: 0, received_amount: 0, difference: 0, status: 'pending' }
    };

    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const tabs = [
        { id: 'resumen', label: '📊 Resumen' },
        { id: 'movimientos', label: '💸 Gastos y Movimientos' },
        { id: 'fijos', label: '📅 Gastos Fijos' },
        { id: 'deudas', label: '💳 Deudas & Avance' },
        { id: 'sueldos', label: '💼 Sueldos (Esperado vs Cobrado)' },
        { id: 'meta', label: '🗽 Meta Operación USD' },
        { id: 'cuentas', label: '🏦 Cuentas & Billeteras' },
    ];

    let monthOptions = '';
    for (let i = 1; i <= 12; i++) {
        monthOptions += `<option value="${i}" ${i === month ? 'selected' : ''}>${months[i - 1]}</option>`;
    }
    let yearOptions = '';
    [2025, 2026, 2027].forEach(y => {
        yearOptions += `<option value="${y}" ${y === year ? 'selected' : ''}>${y}</option>`;
    });

    let actionButtons = '';
    if (tab === 'resumen' || tab === 'movimientos') {
        actionButtons = `
            <button class="btn btn-secondary" onclick="showGoalContributionModal()">🗽 Sumar a Operación</button>
            <button class="btn btn-primary" onclick="showNewFinanceTransactionModal()">+ Nuevo movimiento</button>
        `;
    } else if (tab === 'fijos') {
        actionButtons = `<button class="btn btn-primary" onclick="showFinanceRecurringModal()">+ Nuevo Gasto Fijo</button>`;
    } else if (tab === 'deudas') {
        actionButtons = `<button class="btn btn-primary" onclick="showFinanceDebtModal()">+ Nueva Deuda</button>`;
    } else if (tab === 'sueldos') {
        actionButtons = `<button class="btn btn-primary" onclick="showFinanceSalaryModal(${month}, ${year})">+ Cargar Sueldo</button>`;
    } else if (tab === 'meta') {
        actionButtons = `
            <button class="btn btn-secondary" onclick="showGoalConfigModal()">⚙️ Configurar Meta</button>
            <button class="btn btn-primary" onclick="showGoalContributionModal()">+ Sumar Aporte</button>
        `;
    } else if (tab === 'cuentas') {
        actionButtons = `
            <button class="btn btn-secondary" onclick="showFinanceTransferModal()">⇆ Transferir</button>
            <button class="btn btn-primary" onclick="showFinanceAccountModal()">+ Nueva Cuenta</button>
        `;
    }

    let html = `
    <div class="page-header" style="margin-bottom:14px">
        <div>
            <h1>Finanzas</h1>
            <div class="subtitle">Control de gastos, ingresos, deudas, sueldos y ahorro</div>
        </div>
        <div class="page-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <div style="display:flex;gap:4px;align-items:center">
                <select class="form-control" style="width:auto;padding:6px 10px;font-size:0.82rem" onchange="changeFinancePeriod(this.value, null)">${monthOptions}</select>
                <select class="form-control" style="width:auto;padding:6px 10px;font-size:0.82rem" onchange="changeFinancePeriod(null, this.value)">${yearOptions}</select>
            </div>
            ${actionButtons}
        </div>
    </div>
    <div class="subnav">
        ${tabs.map(t => `<button class="subnav-item${tab === t.id ? ' active' : ''}" onclick="switchFinanceTab('${t.id}')">${t.label}</button>`).join('')}
    </div>
    <div id="financeContent"></div>`;

    el.innerHTML = html;
    const content = el.querySelector('#financeContent');

    if (tab === 'resumen') renderFinanceResumen(content, summary);
    else if (tab === 'movimientos') renderFinanceMovimientos(content, summary);
    else if (tab === 'fijos') await renderFinanceFijos(content, summary);
    else if (tab === 'deudas') await renderFinanceDeudas(content, summary);
    else if (tab === 'sueldos') await renderFinanceSueldos(content, summary);
    else if (tab === 'meta') renderFinanceMeta(content, summary);
    else if (tab === 'cuentas') renderFinanceCuentas(content, summary);
}

function switchFinanceTab(tab) {
    state.financeTab = tab;
    navigate('finance');
}

function changeFinancePeriod(month, year) {
    if (month !== null) state.financeMonth = parseInt(month);
    if (year !== null) state.financeYear = parseInt(year);
    navigate('finance');
}

function filterFinanceTxType(type) {
    state.financeFilterType = type;
    navigate('finance');
}

function filterFinanceTxAccount(accId) {
    state.financeFilterAccount = accId;
    navigate('finance');
}

function onSearchFinanceTx(query) {
    state.financeSearch = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.finance-tx-row');
    rows.forEach(r => {
        const text = (r.getAttribute('data-search') || '').toLowerCase();
        if (!state.financeSearch || text.includes(state.financeSearch)) {
            r.style.display = '';
        } else {
            r.style.display = 'none';
        }
    });
}

function renderFinanceResumen(el, data) {
    const goal = data.goal;
    let goalHtml = '';
    if (goal) {
        const pct = goal.progress_percent || 0;
        goalHtml = `
        <div class="finance-hero-card">
            <div class="finance-goal-header">
                <div class="finance-goal-title-group">
                    <div class="finance-goal-icon">🗽</div>
                    <div>
                        <div class="finance-goal-title">${esc(goal.title)}</div>
                        <div class="finance-goal-subtitle">Meta quirúrgica · TC Ref: $ ${goal.usd_exchange_rate || 1200} ARS/USD</div>
                    </div>
                </div>
                <div class="finance-goal-amount-badge">
                    <div class="finance-goal-val-main">${fmtUSD(goal.total_saved_usd)}</div>
                    <div class="finance-goal-val-target">Objetivo: ${fmtUSD(goal.target_amount)}</div>
                </div>
            </div>
            <div class="finance-progress-bar-wrap">
                <div class="finance-progress-bar-fill" style="width:${Math.max(2, Math.min(100, pct))}%"></div>
            </div>
            <div class="finance-goal-footer">
                <div>
                    <strong>${pct}%</strong> completado · Faltan <strong>${fmtUSD(goal.remaining_usd)}</strong>
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <span>Equiv. ARS: <strong>${fmtARS(goal.saved_ars_equiv)}</strong> / ${fmtARS(goal.target_ars_equiv)}</span>
                    <button class="btn btn-primary btn-sm" onclick="showGoalContributionModal()" style="padding:4px 10px;font-size:0.78rem">+ Aporte</button>
                    <button class="btn btn-ghost btn-sm" onclick="switchFinanceTab('meta')" style="padding:4px 10px;font-size:0.78rem">Detalle →</button>
                </div>
            </div>
        </div>`;
    }

    // KPIs
    const net = data.net_balance;
    const netColor = net >= 0 ? 'var(--sage-dark, #2D6A4F)' : 'var(--rose-dark, #C9184A)';
    const netBg = net >= 0 ? 'rgba(82, 183, 136, 0.12)' : 'rgba(242, 139, 168, 0.12)';

    const recSum = data.recurring_summary || { total_expected: 0, total_paid: 0, total_pending: 0, total_items: 0, paid_count: 0 };
    const debtSum = data.debts_summary || { total_original: 0, total_paid: 0, total_remaining: 0, progress_percent: 0, active_count: 0 };
    const salSum = data.salary_summary || { has_record: false, expected_amount: 0, received_amount: 0, difference: 0 };

    const kpiHtml = `
    <div class="finance-kpi-grid">
        <div class="finance-kpi-card">
            <div class="finance-kpi-icon" style="background:rgba(82,183,136,0.15);color:#2D6A4F">💼</div>
            <div class="finance-kpi-info">
                <div class="finance-kpi-label">Ingresos del mes</div>
                <div class="finance-kpi-value" style="color:#2D6A4F">+${fmtARS(data.total_income)}</div>
                <div class="finance-kpi-sub">${data.incomes_by_category ? data.incomes_by_category.length : 0} categorías</div>
            </div>
        </div>
        <div class="finance-kpi-card">
            <div class="finance-kpi-icon" style="background:rgba(242,139,168,0.15);color:#C9184A">🛍️</div>
            <div class="finance-kpi-info">
                <div class="finance-kpi-label">Gastos del mes</div>
                <div class="finance-kpi-value" style="color:#C9184A">-${fmtARS(data.total_expense)}</div>
                <div class="finance-kpi-sub">${data.expenses_by_category ? data.expenses_by_category.length : 0} categorías</div>
            </div>
        </div>
        <div class="finance-kpi-card">
            <div class="finance-kpi-icon" style="background:${netBg};color:${netColor}">⚖️</div>
            <div class="finance-kpi-info">
                <div class="finance-kpi-label">Balance neto</div>
                <div class="finance-kpi-value" style="color:${netColor}">${net >= 0 ? '+' : ''}${fmtARS(net)}</div>
                <div class="finance-kpi-sub">${net >= 0 ? 'Superávit mensual' : 'Déficit mensual'}</div>
            </div>
        </div>
        <div class="finance-kpi-card" style="cursor:pointer" onclick="switchFinanceTab('fijos')">
            <div class="finance-kpi-icon" style="background:rgba(245,158,11,0.15);color:#D97706">📅</div>
            <div class="finance-kpi-info">
                <div class="finance-kpi-label">Gastos Fijos del Mes</div>
                <div class="finance-kpi-value" style="font-size:1.15rem">${recSum.paid_count}/${recSum.total_items} pagados</div>
                <div class="finance-kpi-sub">Pendiente: ${fmtARS(recSum.total_pending)}</div>
            </div>
        </div>
    </div>`;

    // Mini cards for Sueldos & Deudas
    let sueldoCard = '';
    if (salSum.has_record || salSum.expected_amount > 0) {
        const diff = salSum.difference;
        const diffText = diff < 0
            ? `<span style="color:#E11D48;font-weight:700">Falta cobrar: ${fmtARS(Math.abs(diff))}</span>`
            : `<span style="color:#10B981;font-weight:700">✓ Cobrado completo</span>`;

        sueldoCard = `
        <div class="card" style="margin-bottom:20px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-left:4px solid ${diff < 0 ? '#E11D48' : '#10B981'}">
            <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:1.8rem">💼</span>
                <div>
                    <div style="font-weight:700;font-size:0.95rem">Sueldo del Mes (${state.financeMonth}/${state.financeYear})</div>
                    <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">
                        Pactado: <strong>${fmtARS(salSum.expected_amount)}</strong> · Cobrado real: <strong>${fmtARS(salSum.received_amount)}</strong>
                    </div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
                <div style="font-size:0.85rem">${diffText}</div>
                <button class="btn btn-secondary btn-sm" onclick="showFinanceSalaryModal(${state.financeMonth}, ${state.financeYear})">Editar Sueldo</button>
                <button class="btn btn-ghost btn-sm" onclick="switchFinanceTab('sueldos')">Ver año →</button>
            </div>
        </div>`;
    }

    let deudasCard = '';
    if (debtSum.has_debts || debtSum.total_original > 0) {
        deudasCard = `
        <div class="card" style="margin-bottom:20px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-left:4px solid #6366F1">
            <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:240px">
                <span style="font-size:1.8rem">💳</span>
                <div style="flex:1">
                    <div style="display:flex;justify-content:space-between;align-items:baseline">
                        <div style="font-weight:700;font-size:0.95rem">Deudas & Avance de Pagos</div>
                        <div style="font-size:0.8rem;font-weight:600;color:#6366F1">${debtSum.progress_percent}% amortizado</div>
                    </div>
                    <div class="finance-progress-bar-wrap" style="height:8px;margin:6px 0">
                        <div class="finance-progress-bar-fill" style="width:${debtSum.progress_percent}%;background:linear-gradient(90deg, #6366F1, #10B981)"></div>
                    </div>
                    <div style="font-size:0.78rem;color:var(--text-muted)">
                        Saldo restante: <strong>${fmtARS(debtSum.total_remaining)}</strong> (de ${fmtARS(debtSum.total_original)} originales)
                    </div>
                </div>
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-ghost btn-sm" onclick="switchFinanceTab('deudas')">Ver deudas y pagar →</button>
            </div>
        </div>`;
    }

    // Account chips strip
    let accountsStrip = '<div class="finance-accounts-strip">';
    (data.accounts || []).forEach(acc => {
        const currFmt = acc.currency === 'USD' ? fmtUSD(acc.current_balance) : fmtARS(acc.current_balance);
        accountsStrip += `
        <div class="finance-account-chip" onclick="filterFinanceTxAccount('${acc.id}');switchFinanceTab('movimientos')">
            <div class="finance-acc-icon">${acc.icon || '💳'}</div>
            <div style="min-width:0;flex:1">
                <div class="finance-acc-name">${esc(acc.name)}</div>
                <div class="finance-acc-balance">${currFmt}</div>
            </div>
        </div>`;
    });
    accountsStrip += `
        <div class="finance-account-chip" onclick="showFinanceTransferModal()" style="border-style:dashed;justify-content:center;color:var(--text-muted)">
            <span>⇆ Transferir</span>
        </div>
    </div>`;

    // Category breakdown
    let catsHtml = '';
    if (data.expenses_by_category && data.expenses_by_category.length > 0) {
        catsHtml = `
        <div class="finance-cats-card">
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:14px;display:flex;justify-content:space-between">
                <span>Desglose de Gastos por Categoría</span>
                <span style="font-size:0.8rem;color:var(--text-muted);font-weight:normal">${data.expenses_by_category.length} rubros</span>
            </div>
            <div>`;
        data.expenses_by_category.forEach(c => {
            catsHtml += `
            <div class="finance-cat-item">
                <div class="finance-cat-header">
                    <span>${c.icon || '🏷️'} <strong>${esc(c.name)}</strong></span>
                    <span style="font-variant-numeric:tabular-nums">${fmtARS(c.total)} <span style="color:var(--text-muted);font-size:0.75rem">(${c.percent}%)</span></span>
                </div>
                <div class="finance-cat-bar-bg">
                    <div class="finance-cat-bar-fill" style="width:${Math.max(1, c.percent)}%;background:${c.color || '#F28BA8'}"></div>
                </div>
            </div>`;
        });
        catsHtml += `</div></div>`;
    }

    // Recent transactions (up to 8)
    const txs = data.transactions || [];
    let recentTxHtml = `
    <div class="card" style="padding:18px 20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-weight:700;font-size:0.95rem">Últimos Movimientos del Mes</div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-primary btn-sm" onclick="showNewFinanceTransactionModal()">+ Nuevo Movimiento</button>
                <button class="btn btn-ghost btn-sm" onclick="switchFinanceTab('movimientos')">Ver todos (${txs.length}) →</button>
            </div>
        </div>`;

    if (txs.length === 0) {
        recentTxHtml += `
        <div class="empty-state" style="padding:24px 10px">
            <p>No hay movimientos registrados este mes.</p>
        </div></div>`;
    } else {
        recentTxHtml += '<div class="finance-tx-list">';
        txs.slice(0, 8).forEach(t => {
            recentTxHtml += buildTransactionRowHtml(t);
        });
        recentTxHtml += '</div></div>';
    }

    el.innerHTML = goalHtml + kpiHtml + sueldoCard + deudasCard + accountsStrip + catsHtml + recentTxHtml;
}

function buildTransactionRowHtml(t) {
    const isGoal = (t.type === 'goal_contribution');
    const isInc = (t.type === 'income');
    const isTrf = (t.type === 'transfer');

    let icon = t.category_icon || '🏷️';
    let color = t.category_color || '#8b5cf6';
    if (isGoal) { icon = '🗽'; color = '#B388EB'; }
    if (isTrf) { icon = '⇆'; color = '#6366F1'; }

    let sign = '-';
    let amtClass = 'expense';
    if (isInc) { sign = '+'; amtClass = 'income'; }
    else if (isGoal) { sign = '🗽'; amtClass = 'goal_contribution'; }
    else if (isTrf) { sign = '⇆'; amtClass = 'transfer'; }

    let accountText = esc(t.account_name || 'Cuenta');
    if (isTrf && t.dest_account_name) {
        accountText = `${esc(t.account_name)} → ${esc(t.dest_account_name)}`;
    }

    const searchKey = `${t.description || ''} ${t.category_name || ''} ${t.account_name || ''} ${t.date || ''}`;

    return `
    <div class="finance-tx-row" data-search="${esc(searchKey)}">
        <div class="finance-tx-left">
            <div class="finance-tx-icon-bubble" style="background:${color}22;color:${color}">
                ${icon}
            </div>
            <div class="finance-tx-details">
                <div class="finance-tx-desc">${esc(t.description || t.category_name || (isTrf ? 'Transferencia' : (isGoal ? 'Aporte Operación' : 'Movimiento')))}</div>
                <div class="finance-tx-meta">
                    <span>${fmtDate(t.date)}</span>
                    <span>·</span>
                    <span style="font-weight:600">${accountText}</span>
                    ${t.category_name && !isGoal && !isTrf ? `<span>·</span><span>${esc(t.category_name)}</span>` : ''}
                </div>
            </div>
        </div>
        <div class="finance-tx-right">
            <div style="text-align:right">
                <div class="finance-tx-amount ${amtClass}">
                    ${sign} ${fmtARS(t.amount)}
                </div>
                ${isGoal && t.goal_amount_usd ? `<span class="finance-tx-usd-badge">+${fmtUSD(t.goal_amount_usd)} a la meta</span>` : ''}
            </div>
            <div style="display:flex;gap:4px">
                <button class="btn btn-ghost btn-sm" onclick="showNewFinanceTransactionModal(${t.id})" title="Editar" style="padding:4px 8px">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteFinanceTransactionPrompt(${t.id})" title="Eliminar" style="padding:4px 8px;color:var(--rose)">🗑️</button>
            </div>
        </div>
    </div>`;
}

function renderFinanceMovimientos(el, data) {
    const txs = data.transactions || [];
    const filterType = state.financeFilterType || 'all';
    const filterAcc = state.financeFilterAccount ? parseInt(state.financeFilterAccount) : null;

    let filteredTxs = txs.filter(t => {
        if (filterType === 'expense' && t.type !== 'expense') return false;
        if (filterType === 'income' && t.type !== 'income') return false;
        if (filterType === 'goal_contribution' && t.type !== 'goal_contribution') return false;
        if (filterType === 'transfer' && t.type !== 'transfer') return false;
        if (filterAcc && t.account_id !== filterAcc && t.destination_account_id !== filterAcc) return false;
        return true;
    });

    const filterPills = [
        { id: 'all', label: 'Todos' },
        { id: 'expense', label: 'Gastos' },
        { id: 'income', label: 'Ingresos' },
        { id: 'goal_contribution', label: '🗽 Meta Operación' },
        { id: 'transfer', label: 'Transferencias' },
    ];

    let headerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div style="display:flex;gap:4px;flex-wrap:wrap">
            ${filterPills.map(p => `
                <button class="subnav-item${filterType === p.id ? ' active' : ''}" style="padding:5px 12px;font-size:0.78rem" onclick="filterFinanceTxType('${p.id}')">
                    ${p.label}
                </button>
            `).join('')}
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" class="form-control" placeholder="🔍 Buscar concepto..." style="width:200px;padding:6px 10px;font-size:0.82rem" oninput="onSearchFinanceTx(this.value)">
            ${state.financeFilterAccount ? `<button class="btn btn-ghost btn-sm" onclick="filterFinanceTxAccount('')" style="font-size:0.75rem">Limpiar filtro cuenta ✕</button>` : ''}
            <button class="btn btn-primary btn-sm" onclick="showNewFinanceTransactionModal()">+ Registrar Gasto / Ingreso</button>
        </div>
    </div>`;

    let listHtml = '';
    if (filteredTxs.length === 0) {
        listHtml = `
        <div class="empty-state" style="padding:50px 20px">
            <div class="empty-icon">💸</div>
            <h3>Sin movimientos con los filtros actuales</h3>
            <p>Registra un gasto del día a día, ingreso o aporte a la meta.</p>
            <button class="btn btn-primary" onclick="showNewFinanceTransactionModal()" style="margin-top:10px">+ Registrar Movimiento</button>
        </div>`;
    } else {
        listHtml = '<div class="finance-tx-list">';
        filteredTxs.forEach(t => {
            listHtml += buildTransactionRowHtml(t);
        });
        listHtml += '</div>';
    }

    el.innerHTML = headerHtml + listHtml;
}

async function renderFinanceFijos(el, summaryData) {
    const month = state.financeMonth || (new Date().getMonth() + 1);
    const year = state.financeYear || new Date().getFullYear();

    const recRes = await api(eel.get_finance_recurring, month, year);
    const recData = (recRes && recRes.ok) ? recRes : { recurring: [], summary: { total_expected: 0, total_paid: 0, total_pending: 0, total_count: 0, paid_count: 0 } };

    const items = recData.recurring || [];
    const sum = recData.summary || {};
    const pct = sum.total_expected > 0 ? Math.min(100, Math.round((sum.total_paid / sum.total_expected) * 100)) : 0;

    let progressCard = `
    <div class="card" style="padding:20px;margin-bottom:20px;background:var(--card)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;flex-wrap:wrap;gap:8px">
            <div>
                <div style="font-weight:700;font-size:1.1rem">Gastos Fijos Mensuales · ${month}/${year}</div>
                <div style="font-size:0.82rem;color:var(--text-muted)">Alquiler, servicios, internet, gimnasio y suscripciones</div>
            </div>
            <div style="text-align:right">
                <span style="font-size:1.4rem;font-weight:800;color:var(--text)">${fmtARS(sum.total_paid)}</span>
                <span style="font-size:0.85rem;color:var(--text-muted)"> de ${fmtARS(sum.total_expected)}</span>
                <span class="task-badge ${pct === 100 ? 'completed' : 'due-soon'}" style="margin-left:6px">${pct}% pagado</span>
            </div>
        </div>
        <div class="finance-progress-bar-wrap" style="height:10px;margin:10px 0 12px 0">
            <div class="finance-progress-bar-fill" style="width:${Math.max(2, pct)}%;background:linear-gradient(90deg, #F59E0B, #10B981)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted)">
            <span>${sum.paid_count} de ${sum.total_count} gastos saldados</span>
            <span>Resta pagar este mes: <strong style="color:#C9184A">${fmtARS(sum.total_pending)}</strong></span>
        </div>
    </div>`;

    let itemsHtml = '';
    if (items.length === 0) {
        itemsHtml = `
        <div class="empty-state" style="padding:40px 10px">
            <div class="empty-icon">📅</div>
            <h3>No tienes gastos fijos configurados</h3>
            <p>Agrega los servicios, alquiler y suscripciones que pagas todos los meses.</p>
            <button class="btn btn-primary" onclick="showFinanceRecurringModal()" style="margin-top:10px">+ Nuevo Gasto Fijo</button>
        </div>`;
    } else {
        itemsHtml = '<div style="display:flex;flex-direction:column;gap:10px">';
        items.forEach(r => {
            const isPaid = r.is_paid;
            const isOverdue = r.is_overdue;

            let rowClass = isPaid ? 'is-paid' : (isOverdue ? 'is-overdue' : 'is-pending');
            let statusBadge = isPaid
                ? `<span class="task-badge completed" style="font-size:0.75rem">✓ Pagado el ${fmtDate(r.paid_date)} (${fmtARS(r.paid_amount)})</span>`
                : (isOverdue
                    ? `<span class="task-badge overdue" style="font-size:0.75rem">⚠️ Vencido (Día ${r.due_day})</span>`
                    : `<span class="task-badge due-soon" style="font-size:0.75rem">Vence día ${r.due_day}</span>`);

            let actionBtn = isPaid
                ? `<button class="btn btn-ghost btn-sm" onclick="unmarkRecurringPaidPrompt(${r.log_id})" title="Desmarcar pago" style="font-size:0.75rem;color:var(--text-muted)">Desmarcar ✕</button>`
                : `<button class="btn btn-primary btn-sm" onclick="showQuickPayRecurringModal(${r.id}, ${month}, ${year}, ${r.amount}, ${r.account_id || ''}, '${esc(r.name)}')" style="font-size:0.78rem;padding:4px 10px">✓ Marcar como pagado</button>`;

            itemsHtml += `
            <div class="finance-rec-row ${rowClass}">
                <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">
                    <div style="font-size:1.4rem;width:38px;height:38px;border-radius:10px;background:rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:center">
                        ${r.category_icon || '📅'}
                    </div>
                    <div style="min-width:0">
                        <div style="font-weight:700;font-size:0.95rem;color:var(--text)">${esc(r.name)}</div>
                        <div style="font-size:0.76rem;color:var(--text-muted);margin-top:2px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                            ${statusBadge}
                            <span>·</span>
                            <span>Vence día ${r.due_day} de cada mes</span>
                            ${r.default_account_name ? `<span>·</span><span>${esc(r.default_account_name)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:14px;flex-shrink:0">
                    <div style="text-align:right">
                        <div style="font-size:1.1rem;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums">${fmtARS(r.amount)}</div>
                        <div style="font-size:0.72rem;color:var(--text-muted)">mensual estimado</div>
                    </div>
                    <div>${actionBtn}</div>
                    <div style="display:flex;gap:4px">
                        <button class="btn btn-ghost btn-sm" onclick="showFinanceRecurringModal(${r.id})" style="padding:4px 6px">✏️</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteFinanceRecurringPrompt(${r.id})" style="padding:4px 6px;color:var(--rose)">🗑️</button>
                    </div>
                </div>
            </div>`;
        });
        itemsHtml += '</div>';
    }

    el.innerHTML = progressCard + itemsHtml;
}

async function renderFinanceDeudas(el, summaryData) {
    const debtsRes = await api(eel.get_finance_debts);
    const debtsData = (debtsRes && debtsRes.ok) ? debtsRes : { debts: [], summary: { total_original: 0, total_paid: 0, total_remaining: 0, progress_percent: 0, active_count: 0, paid_count: 0 } };

    const debts = debtsData.debts || [];
    const sum = debtsData.summary || {};
    const pct = sum.progress_percent || 0;

    let heroHtml = `
    <div class="finance-hero-card" style="padding:22px 24px;border-top:4px solid #6366F1">
        <div class="finance-goal-header">
            <div class="finance-goal-title-group">
                <div class="finance-goal-icon" style="background:rgba(99,102,241,0.15);color:#6366F1">💳</div>
                <div>
                    <div class="finance-goal-title">Plan de Desendeudamiento & Avance</div>
                    <div class="finance-goal-subtitle">Control de amortización de préstamos, tarjetas y saldos pendientes</div>
                </div>
            </div>
            <div style="display:flex;gap:8px">
                <button class="btn btn-primary" onclick="showFinanceDebtModal()">+ Nueva Deuda</button>
            </div>
        </div>
        <div style="display:flex;align-items:baseline;gap:12px;margin:12px 0 6px 0">
            <span style="font-size:2rem;font-weight:800;color:#6366F1;font-variant-numeric:tabular-nums">${fmtARS(sum.total_paid)}</span>
            <span style="font-size:1rem;color:var(--text-muted)">pagados de ${fmtARS(sum.total_original)}</span>
            <span class="task-badge" style="background:rgba(99,102,241,0.15);color:#6366F1;font-size:0.85rem">${pct}% completado</span>
        </div>
        <div class="finance-progress-bar-wrap" style="height:12px">
            <div class="finance-progress-bar-fill" style="width:${Math.max(2, pct)}%;background:linear-gradient(90deg, #6366F1, #10B981)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;color:var(--text-muted);margin-top:8px">
            <span>Deuda restante por pagar: <strong style="color:#E11D48">${fmtARS(sum.total_remaining)}</strong></span>
            <span>${sum.active_count} deudas activas · ${sum.paid_count} saldadas</span>
        </div>
    </div>`;

    let debtsHtml = '';
    if (debts.length === 0) {
        debtsHtml = `
        <div class="empty-state" style="padding:40px 10px">
            <div class="empty-icon">🎉</div>
            <h3>Sin deudas registradas</h3>
            <p>¡Felicitaciones! O puedes cargar un préstamo, tarjeta o compromiso para trackear su amortización.</p>
            <button class="btn btn-primary" onclick="showFinanceDebtModal()" style="margin-top:10px">+ Registrar Deuda</button>
        </div>`;
    } else {
        debts.forEach(d => {
            const isPaid = d.is_paid;
            const payments = d.payments || [];

            let paymentsListHtml = '';
            if (payments.length > 0) {
                paymentsListHtml = `
                <div style="margin-top:12px;border-top:1px solid var(--border-light);padding-top:10px">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Historial de Pagos / Cuotas</div>
                    <div style="display:flex;flex-direction:column;gap:6px">
                        ${payments.map(p => `
                            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.8rem;padding:4px 8px;background:var(--bg);border-radius:6px">
                                <span><strong>${fmtDate(p.date)}</strong> ${p.installment_number ? `· Cuota ${p.installment_number}` : ''} ${p.notes ? `(${esc(p.notes)})` : ''}</span>
                                <div style="display:flex;align-items:center;gap:8px">
                                    <span style="font-weight:700;color:#10B981">${fmtARS(p.amount)}</span>
                                    <button class="btn btn-ghost btn-sm" onclick="deleteDebtPaymentPrompt(${p.id})" style="padding:1px 4px;color:var(--rose)">✕</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }

            debtsHtml += `
            <div class="finance-debt-card ${isPaid ? 'paid' : ''}">
                <div class="finance-debt-header">
                    <div>
                        <div class="finance-debt-title">${esc(d.title)}</div>
                        <div class="finance-debt-creditor">Acreedor / Entidad: <strong>${esc(d.creditor || 'Particular')}</strong> ${d.due_date ? `· Vence: ${fmtDate(d.due_date)}` : ''}</div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center">
                        <span class="task-badge ${isPaid ? 'completed' : 'due-soon'}">${isPaid ? 'Saldada ✓' : 'Activa'}</span>
                        ${!isPaid ? `<button class="btn btn-primary btn-sm" onclick="showFinanceDebtPaymentModal(${d.id})">+ Pagar Cuota</button>` : ''}
                        <button class="btn btn-ghost btn-sm" onclick="showFinanceDebtModal(${d.id})" style="padding:4px 6px">✏️</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteFinanceDebtPrompt(${d.id})" style="padding:4px 6px;color:var(--rose)">🗑️</button>
                    </div>
                </div>

                <div class="finance-debt-stat-row">
                    <div>
                        <div class="finance-debt-stat-label">Total Original</div>
                        <div class="finance-debt-stat-val">${fmtARS(d.total_amount)}</div>
                    </div>
                    <div>
                        <div class="finance-debt-stat-label">Amortizado</div>
                        <div class="finance-debt-stat-val" style="color:#10B981">${fmtARS(d.total_paid)}</div>
                    </div>
                    <div>
                        <div class="finance-debt-stat-label">Resta Pagar</div>
                        <div class="finance-debt-stat-val" style="color:#E11D48">${fmtARS(d.remaining_amount)}</div>
                    </div>
                    <div>
                        <div class="finance-debt-stat-label">Cuotas</div>
                        <div class="finance-debt-stat-val">${d.installments_paid || 0} / ${d.installments_total || 1}</div>
                    </div>
                </div>

                <div class="finance-progress-bar-wrap" style="height:8px;margin:8px 0">
                    <div class="finance-progress-bar-fill" style="width:${d.progress_percent}%;background:linear-gradient(90deg, #6366F1, #10B981)"></div>
                </div>

                ${paymentsListHtml}
            </div>`;
        });
    }

    el.innerHTML = heroHtml + debtsHtml;
}

async function renderFinanceSueldos(el, summaryData) {
    const year = state.financeYear || new Date().getFullYear();
    const salRes = await api(eel.get_finance_salaries, year);
    const salData = (salRes && salRes.ok) ? salRes : { months: [], summary: { total_expected: 0, total_received: 0, total_difference: 0, pending_months_count: 0 } };

    const months = salData.months || [];
    const sum = salData.summary || {};
    const hasDiff = sum.total_difference !== 0;

    let heroHtml = `
    <div class="card" style="padding:22px 24px;margin-bottom:20px;border-top:4px solid #10B981">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
            <div>
                <div style="font-weight:700;font-size:1.1rem">Comparativa Salarial ${year} · Sueldo Esperado vs Cobrado</div>
                <div style="font-size:0.82rem;color:var(--text-muted)">Registro de haberes pactados vs efectivamente depositados</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center">
                <select class="form-control" style="width:auto;padding:5px 10px;font-size:0.82rem" onchange="changeFinancePeriod(null, this.value)">
                    <option value="2025" ${year === 2025 ? 'selected' : ''}>2025</option>
                    <option value="2026" ${year === 2026 ? 'selected' : ''}>2026</option>
                    <option value="2027" ${year === 2027 ? 'selected' : ''}>2027</option>
                </select>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:10px;padding:12px 14px;background:var(--bg);border-radius:var(--radius-sm)">
            <div>
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">Total Esperado Anual</div>
                <div style="font-size:1.3rem;font-weight:800;color:var(--text)">${fmtARS(sum.total_expected)}</div>
            </div>
            <div>
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">Total Cobrado Real</div>
                <div style="font-size:1.3rem;font-weight:800;color:#10B981">${fmtARS(sum.total_received)}</div>
            </div>
            <div>
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">Brecha / Diferencia</div>
                <div style="font-size:1.3rem;font-weight:800;color:${sum.total_difference < 0 ? '#E11D48' : '#10B981'}">
                    ${sum.total_difference >= 0 ? '+' : ''}${fmtARS(sum.total_difference)}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted)">
                    ${sum.total_difference < 0 ? `⚠️ Faltante acumulado` : `Al día con los haberes`}
                </div>
            </div>
        </div>
    </div>`;

    let tableHtml = `
    <div class="card" style="padding:0;overflow:hidden">
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Mes</th>
                        <th>Sueldo Esperado</th>
                        <th>Sueldo Cobrado</th>
                        <th>Diferencia / Faltante</th>
                        <th>Fecha & Cuenta</th>
                        <th>Estado</th>
                        <th style="text-align:right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${months.map(m => {
                        let diffText = '-';
                        if (m.expected_amount > 0 || m.received_amount > 0) {
                            if (m.difference < 0) {
                                diffText = `<span style="color:#E11D48;font-weight:700">-${fmtARS(m.difference_abs)} (Pendiente)</span>`;
                            } else if (m.difference === 0 && m.received_amount > 0) {
                                diffText = `<span style="color:#10B981;font-weight:700">✓ Exacto</span>`;
                            } else if (m.difference > 0) {
                                diffText = `<span style="color:#10B981;font-weight:700">+${fmtARS(m.difference)} (Extra)</span>`;
                            }
                        }

                        let statusBadge = '<span class="salary-status-badge pending">Sin registrar</span>';
                        if (m.is_fully_paid) {
                            statusBadge = '<span class="salary-status-badge paid_full">✓ Cobrado completo</span>';
                        } else if (m.is_underpaid && m.received_amount > 0) {
                            statusBadge = '<span class="salary-status-badge paid_partial">⚠️ Cobro parcial</span>';
                        } else if (m.expected_amount > 0 && m.received_amount === 0) {
                            statusBadge = '<span class="salary-status-badge pending">⏳ Pendiente de cobro</span>';
                        }

                        return `
                        <tr>
                            <td><strong>${esc(m.month_name)}</strong></td>
                            <td style="font-variant-numeric:tabular-nums">${m.expected_amount > 0 ? fmtARS(m.expected_amount) : '<span style="color:var(--text-muted)">$ 0</span>'}</td>
                            <td style="font-variant-numeric:tabular-nums;font-weight:700;color:#10B981">${m.received_amount > 0 ? fmtARS(m.received_amount) : '<span style="color:var(--text-muted)">$ 0</span>'}</td>
                            <td style="font-variant-numeric:tabular-nums">${diffText}</td>
                            <td style="font-size:0.8rem">${m.payment_date ? fmtDate(m.payment_date) : '-'} ${m.account_name ? `· ${esc(m.account_name)}` : ''}</td>
                            <td>${statusBadge}</td>
                            <td style="text-align:right">
                                <button class="btn btn-secondary btn-sm" onclick="showFinanceSalaryModal(${m.month}, ${year})">Cargar / Editar</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;

    el.innerHTML = heroHtml + tableHtml;
}

// Modales para Deudas, Fijos y Sueldos

async function showFinanceDebtModal(debtId = null) {
    let d = null;
    if (debtId) {
        const debtsRes = await api(eel.get_finance_debts);
        d = (debtsRes && debtsRes.debts ? debtsRes.debts.find(x => x.id === debtId) : null);
    }

    const defaultTitle = d ? d.title : '';
    const defaultCreditor = d ? d.creditor : '';
    const defaultTotal = d ? d.total_amount : '';
    const defaultInitPaid = d ? d.initial_paid : 0;
    const defaultDue = d ? (d.due_date || '') : '';
    const defaultInstTot = d ? (d.installments_total || 1) : 1;
    const defaultInstPaid = d ? (d.installments_paid || 0) : 0;
    const defaultNotes = d ? (d.notes || '') : '';

    const bodyHtml = `
    <input type="hidden" id="debtId" value="${debtId || ''}">
    <div class="form-group">
        <label class="form-label">Concepto o Título de la Deuda *</label>
        <input type="text" id="debtTitle" class="form-control" placeholder="Ej: Tarjeta Visa, Préstamo Banco, Deuda con Juan..." value="${esc(defaultTitle)}" required>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Acreedor / Entidad</label>
            <input type="text" id="debtCreditor" class="form-control" placeholder="Ej: Banco Santander, Mercado Pago..." value="${esc(defaultCreditor)}">
        </div>
        <div class="form-group">
            <label class="form-label">Monto Total Original ($ ARS) *</label>
            <input type="number" step="any" id="debtTotal" class="form-control" placeholder="0.00" value="${defaultTotal}" required>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Pagos Previos Iniciales ($ ARS)</label>
            <input type="number" step="any" id="debtInitPaid" class="form-control" value="${defaultInitPaid}">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Lo que ya habías pagado antes de registrarla</div>
        </div>
        <div class="form-group">
            <label class="form-label">Fecha Límite / Vencimiento</label>
            <input type="date" id="debtDueDate" class="form-control" value="${defaultDue}">
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Cantidad de Cuotas Totales</label>
            <input type="number" id="debtInstTot" class="form-control" value="${defaultInstTot}">
        </div>
        <div class="form-group">
            <label class="form-label">Cuotas Pagadas hasta ahora</label>
            <input type="number" id="debtInstPaid" class="form-control" value="${defaultInstPaid}">
        </div>
    </div>
    <div class="form-group">
        <label class="form-label">Notas / Observaciones</label>
        <input type="text" id="debtNotes" class="form-control" placeholder="Ej: Tasa fija, cuotas sin interés..." value="${esc(defaultNotes)}">
    </div>`;

    openModal(debtId ? 'Editar Deuda' : 'Nueva Deuda', bodyHtml);
    document.getElementById('modalSave').onclick = saveFinanceDebtForm;
}

async function saveFinanceDebtForm() {
    const id = document.getElementById('debtId').value;
    const title = document.getElementById('debtTitle').value.trim();
    const creditor = document.getElementById('debtCreditor').value.trim();
    const total_amount = parseFloat(document.getElementById('debtTotal').value);
    const initial_paid = parseFloat(document.getElementById('debtInitPaid').value) || 0;
    const due_date = document.getElementById('debtDueDate').value || null;
    const installments_total = parseInt(document.getElementById('debtInstTot').value) || 1;
    const installments_paid = parseInt(document.getElementById('debtInstPaid').value) || 0;
    const notes = document.getElementById('debtNotes').value.trim();

    if (!title || isNaN(total_amount) || total_amount <= 0) {
        showToast('Ingresa un título y un monto total válido');
        return;
    }

    const payload = {
        title, creditor, total_amount, initial_paid, due_date,
        installments_total, installments_paid, notes, currency: 'ARS'
    };

    let res;
    if (id) {
        res = await api(eel.update_finance_debt, parseInt(id), payload);
    } else {
        res = await api(eel.create_finance_debt, payload);
    }

    if (res && res.ok) {
        showToast(id ? 'Deuda actualizada' : 'Deuda creada');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
    }
}

async function showFinanceDebtPaymentModal(debtId) {
    const [debtsRes, accounts] = await Promise.all([
        api(eel.get_finance_debts),
        api(eel.get_finance_accounts)
    ]);

    const debt = (debtsRes && debtsRes.debts) ? debtsRes.debts.find(d => d.id === debtId) : null;
    if (!debt) return;

    let accOptions = accounts.map(a => `<option value="${a.id}">${a.icon || '💳'} ${esc(a.name)} (${fmtARS(a.current_balance)})</option>`).join('');

    const bodyHtml = `
    <input type="hidden" id="payDebtId" value="${debtId}">
    <div style="background:rgba(99,102,241,0.1);padding:14px;border-radius:var(--radius-sm);margin-bottom:14px;border:1px solid rgba(99,102,241,0.25)">
        <div style="font-weight:700;font-size:1rem;color:#6366F1">${esc(debt.title)}</div>
        <div style="font-size:0.8rem;color:var(--text-muted);margin-top:2px">
            Saldo Restante: <strong>${fmtARS(debt.remaining_amount)}</strong> · Cuotas pagadas: ${debt.installments_paid || 0}/${debt.installments_total || 1}
        </div>
    </div>
    <div class="form-group">
        <label class="form-label">Monto del Pago / Cuota ($ ARS) *</label>
        <input type="number" step="any" id="payDebtAmount" class="form-control" placeholder="0.00" value="${debt.remaining_amount > 0 ? (debt.installments_total > 1 ? Math.round(debt.total_amount / debt.installments_total) : debt.remaining_amount) : ''}" style="font-size:1.15rem;font-weight:700" required>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Cuenta de débito (¿de dónde sale la plata?)</label>
            <select id="payDebtAccount" class="form-control">${accOptions}</select>
        </div>
        <div class="form-group">
            <label class="form-label">Número de Cuota (opcional)</label>
            <input type="number" id="payDebtInstNum" class="form-control" value="${(debt.installments_paid || 0) + 1}">
        </div>
    </div>
    <div class="form-group">
        <label class="form-label">Fecha del Pago</label>
        <input type="date" id="payDebtDate" class="form-control" value="${todayStr()}">
    </div>
    <div class="form-group">
        <label class="form-label">Detalle / Comprobante</label>
        <input type="text" id="payDebtNotes" class="form-control" placeholder="Ej: Pago mínimo, Cuota 3 de 12..." value="Pago cuota">
    </div>`;

    openModal('Registrar Pago de Deuda', bodyHtml);
    document.getElementById('modalSave').onclick = saveFinanceDebtPaymentForm;
}

async function saveFinanceDebtPaymentForm() {
    const debt_id = parseInt(document.getElementById('payDebtId').value);
    const amount = parseFloat(document.getElementById('payDebtAmount').value);
    const account_id = document.getElementById('payDebtAccount').value;
    const installment_number = document.getElementById('payDebtInstNum').value;
    const date = document.getElementById('payDebtDate').value;
    const notes = document.getElementById('payDebtNotes').value;

    if (isNaN(amount) || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0');
        return;
    }

    const res = await api(eel.pay_finance_debt, {
        debt_id,
        amount,
        account_id: account_id ? parseInt(account_id) : null,
        installment_number: installment_number ? parseInt(installment_number) : null,
        date,
        notes
    });

    if (res && res.ok) {
        showToast('Pago registrado exitosamente');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo guardar el pago'));
    }
}

async function deleteFinanceDebtPrompt(id) {
    if (!confirm('¿Deseas eliminar esta deuda y todo su historial de pagos?')) return;
    const res = await api(eel.delete_finance_debt, id);
    if (res && res.ok) {
        showToast('Deuda eliminada');
        navigate('finance');
    } else {
        showToast('Error al eliminar');
    }
}

async function deleteDebtPaymentPrompt(id) {
    if (!confirm('¿Deseas anular este pago de deuda?')) return;
    const res = await api(eel.delete_debt_payment, id);
    if (res && res.ok) {
        showToast('Pago anulado');
        navigate('finance');
    } else {
        showToast('Error al anular');
    }
}

async function showFinanceRecurringModal(recId = null) {
    const [categories, accounts] = await Promise.all([
        api(eel.get_finance_categories),
        api(eel.get_finance_accounts)
    ]);

    let rec = null;
    if (recId) {
        const res = await api(eel.get_finance_recurring);
        rec = (res && res.recurring) ? res.recurring.find(r => r.id === recId) : null;
    }

    const defaultName = rec ? rec.name : '';
    const defaultAmt = rec ? rec.amount : '';
    const defaultDay = rec ? (rec.due_day || 10) : 10;
    const defaultCat = rec ? rec.category_id : '';
    const defaultAcc = rec ? rec.account_id : '';
    const defaultAuto = rec ? rec.auto_debit : 0;
    const defaultNotes = rec ? (rec.notes || '') : '';

    let catOptions = `<option value="">-- Sin categoría --</option>` +
        (categories || []).map(c => `<option value="${c.id}" ${c.id === defaultCat ? 'selected' : ''}>${c.icon || '🏷️'} ${esc(c.name)}</option>`).join('');

    let accOptions = `<option value="">-- Sin cuenta predeterminada --</option>` +
        (accounts || []).map(a => `<option value="${a.id}" ${a.id === defaultAcc ? 'selected' : ''}>${a.icon || '💳'} ${esc(a.name)}</option>`).join('');

    const bodyHtml = `
    <input type="hidden" id="recId" value="${recId || ''}">
    <div class="form-group">
        <label class="form-label">Nombre del Gasto Fijo *</label>
        <input type="text" id="recName" class="form-control" placeholder="Ej: Alquiler, Edenor, Movistar, Gimnasio..." value="${esc(defaultName)}" required>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Monto Mensual Estimado ($ ARS) *</label>
            <input type="number" step="any" id="recAmount" class="form-control" placeholder="0.00" value="${defaultAmt}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Día de Vencimiento (1 al 31) *</label>
            <input type="number" min="1" max="31" id="recDueDay" class="form-control" value="${defaultDay}" required>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Categoría</label>
            <select id="recCategory" class="form-control">${catOptions}</select>
        </div>
        <div class="form-group">
            <label class="form-label">Cuenta Predeterminada</label>
            <select id="recAccount" class="form-control">${accOptions}</select>
        </div>
    </div>
    <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="recAutoDebit" ${defaultAuto ? 'checked' : ''}>
            <span>Débito automático en cuenta / tarjeta</span>
        </label>
    </div>
    <div class="form-group">
        <label class="form-label">Notas</label>
        <input type="text" id="recNotes" class="form-control" placeholder="Ej: Número de cliente, código de pago electrónico..." value="${esc(defaultNotes)}">
    </div>`;

    openModal(recId ? 'Editar Gasto Fijo' : 'Nuevo Gasto Fijo', bodyHtml);
    document.getElementById('modalSave').onclick = saveFinanceRecurringForm;
}

async function saveFinanceRecurringForm() {
    const id = document.getElementById('recId').value;
    const name = document.getElementById('recName').value.trim();
    const amount = parseFloat(document.getElementById('recAmount').value);
    const due_day = parseInt(document.getElementById('recDueDay').value) || 10;
    const category_id = document.getElementById('recCategory').value;
    const account_id = document.getElementById('recAccount').value;
    const auto_debit = document.getElementById('recAutoDebit').checked ? 1 : 0;
    const notes = document.getElementById('recNotes').value.trim();

    if (!name || isNaN(amount) || amount < 0) {
        showToast('Ingresa un nombre y un monto válido');
        return;
    }

    const payload = {
        name, amount, due_day,
        category_id: category_id ? parseInt(category_id) : null,
        account_id: account_id ? parseInt(account_id) : null,
        auto_debit, notes, currency: 'ARS'
    };

    let res;
    if (id) {
        res = await api(eel.update_finance_recurring, parseInt(id), payload);
    } else {
        res = await api(eel.create_finance_recurring, payload);
    }

    if (res && res.ok) {
        showToast(id ? 'Gasto fijo actualizado' : 'Gasto fijo creado');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
    }
}

async function showQuickPayRecurringModal(recId, month, year, amount, defaultAccountId, name) {
    const accounts = await api(eel.get_finance_accounts);
    let accOptions = (accounts || []).map(a => `<option value="${a.id}" ${a.id == defaultAccountId ? 'selected' : ''}>${a.icon || '💳'} ${esc(a.name)} (${fmtARS(a.current_balance)})</option>`).join('');

    const bodyHtml = `
    <input type="hidden" id="qpRecId" value="${recId}">
    <input type="hidden" id="qpMonth" value="${month}">
    <input type="hidden" id="qpYear" value="${year}">
    <div style="font-weight:700;font-size:1.05rem;margin-bottom:8px">${esc(name)}</div>
    <div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:14px">Registrar pago correspondiente a <strong>${month}/${year}</strong></div>

    <div class="form-group">
        <label class="form-label">Monto Pagado ($ ARS) *</label>
        <input type="number" step="any" id="qpAmount" class="form-control" value="${amount}" style="font-size:1.15rem;font-weight:700" required>
    </div>
    <div class="form-group">
        <label class="form-label">Cuenta de débito *</label>
        <select id="qpAccount" class="form-control">${accOptions}</select>
    </div>
    <div class="form-group">
        <label class="form-label">Fecha de pago</label>
        <input type="date" id="qpDate" class="form-control" value="${todayStr()}">
    </div>
    <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="qpCreateTx" checked>
            <span>Crear movimiento de gasto en la cuenta seleccionada</span>
        </label>
    </div>`;

    openModal('Pagar Gasto Fijo', bodyHtml);
    document.getElementById('modalSave').onclick = saveQuickPayRecurringForm;
}

async function saveQuickPayRecurringForm() {
    const recurring_id = parseInt(document.getElementById('qpRecId').value);
    const month = parseInt(document.getElementById('qpMonth').value);
    const year = parseInt(document.getElementById('qpYear').value);
    const paid_amount = parseFloat(document.getElementById('qpAmount').value);
    const account_id = document.getElementById('qpAccount').value;
    const paid_date = document.getElementById('qpDate').value;
    const create_transaction = document.getElementById('qpCreateTx').checked;

    if (isNaN(paid_amount) || paid_amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0');
        return;
    }

    const res = await api(eel.mark_recurring_paid, {
        recurring_id, month, year, paid_amount, paid_date,
        account_id: account_id ? parseInt(account_id) : null,
        create_transaction
    });

    if (res && res.ok) {
        showToast('Gasto fijo marcado como pagado');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo registrar'));
    }
}

async function unmarkRecurringPaidPrompt(logId) {
    if (!confirm('¿Deseas desmarcar este gasto fijo como pagado? Se anulará el registro.')) return;
    const res = await api(eel.unmark_recurring_paid, logId);
    if (res && res.ok) {
        showToast('Gasto fijo desmarcado');
        navigate('finance');
    } else {
        showToast('Error');
    }
}

async function deleteFinanceRecurringPrompt(id) {
    if (!confirm('¿Deseas eliminar este gasto fijo mensual?')) return;
    const res = await api(eel.delete_finance_recurring, id);
    if (res && res.ok) {
        showToast('Gasto fijo eliminado');
        navigate('finance');
    } else {
        showToast('Error al eliminar');
    }
}

async function showFinanceSalaryModal(month, year) {
    const [salRes, accounts] = await Promise.all([
        api(eel.get_finance_salaries, year),
        api(eel.get_finance_accounts)
    ]);

    const item = (salRes && salRes.months) ? salRes.months.find(m => m.month === month) : null;

    const defaultExp = item ? item.expected_amount : '';
    const defaultRec = item ? item.received_amount : '';
    const defaultDate = item && item.payment_date ? item.payment_date : todayStr();
    const defaultAcc = item ? item.account_id : '';
    const defaultNotes = item ? item.notes : '';

    let accOptions = (accounts || []).map(a => `<option value="${a.id}" ${a.id == defaultAcc ? 'selected' : ''}>${a.icon || '💳'} ${esc(a.name)} (${fmtARS(a.current_balance)})</option>`).join('');

    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    const bodyHtml = `
    <input type="hidden" id="salMonth" value="${month}">
    <input type="hidden" id="salYear" value="${year}">
    <div style="font-weight:700;font-size:1.05rem;margin-bottom:14px">Liquidación de Sueldo · ${monthNames[month - 1]} ${year}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Sueldo que debería haber cobrado ($ ARS) *</label>
            <input type="number" step="any" id="salExpected" class="form-control" placeholder="Pactado" value="${defaultExp}" style="font-size:1.1rem;font-weight:700" required>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Monto acordado / liquidado en blanco</div>
        </div>
        <div class="form-group">
            <label class="form-label">Sueldo efectivamente cobrado ($ ARS)</label>
            <input type="number" step="any" id="salReceived" class="form-control" placeholder="Depositado" value="${defaultRec}" style="font-size:1.1rem;font-weight:700;color:#10B981">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Lo que realmente entró a tu cuenta</div>
        </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Cuenta donde se cobró</label>
            <select id="salAccount" class="form-control">${accOptions}</select>
        </div>
        <div class="form-group">
            <label class="form-label">Fecha de cobro</label>
            <input type="date" id="salDate" class="form-control" value="${defaultDate}">
        </div>
    </div>

    <div class="form-group">
        <label class="form-label">Notas / Descuentos / Conceptos</label>
        <input type="text" id="salNotes" class="form-control" placeholder="Ej: Faltan horas extras, retención sindicato, bono..." value="${esc(defaultNotes)}">
    </div>

    <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="salSyncTx" checked>
            <span>Impactar el sueldo cobrado como ingreso en la cuenta seleccionada</span>
        </label>
    </div>`;

    openModal(`Cargar Sueldo · ${monthNames[month - 1]} ${year}`, bodyHtml);
    document.getElementById('modalSave').onclick = saveFinanceSalaryForm;
}

async function saveFinanceSalaryForm() {
    const month = parseInt(document.getElementById('salMonth').value);
    const year = parseInt(document.getElementById('salYear').value);
    const expected_amount = parseFloat(document.getElementById('salExpected').value) || 0;
    const received_amount = parseFloat(document.getElementById('salReceived').value) || 0;
    const account_id = document.getElementById('salAccount').value;
    const payment_date = document.getElementById('salDate').value;
    const notes = document.getElementById('salNotes').value;
    const sync_transaction = document.getElementById('salSyncTx').checked;

    if (expected_amount <= 0 && received_amount <= 0) {
        showToast('Ingresa al menos el sueldo esperado o el recibido');
        return;
    }

    const res = await api(eel.save_finance_salary, {
        month, year, expected_amount, received_amount,
        account_id: account_id ? parseInt(account_id) : null,
        payment_date, notes, sync_transaction
    });

    if (res && res.ok) {
        showToast('Sueldo guardado correctamente');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
    }
}

// Global window bindings for Finance
window.fmtARS = fmtARS;
window.fmtUSD = fmtUSD;
window.renderFinance = renderFinance;
window.switchFinanceTab = switchFinanceTab;
window.changeFinancePeriod = changeFinancePeriod;
window.filterFinanceTxType = filterFinanceTxType;
window.filterFinanceTxAccount = filterFinanceTxAccount;
window.onSearchFinanceTx = onSearchFinanceTx;
window.showNewFinanceTransactionModal = showNewFinanceTransactionModal;
window.setTxModalType = setTxModalType;
window.onTxAmountChanged = onTxAmountChanged;
window.onTxGoalUsdChanged = onTxGoalUsdChanged;
window.saveFinanceTransactionForm = saveFinanceTransactionForm;
window.showGoalContributionModal = showGoalContributionModal;
window.onGoalUsdType = onGoalUsdType;
window.onGoalArsType = onGoalArsType;
window.saveGoalContributionForm = saveGoalContributionForm;
window.showGoalConfigModal = showGoalConfigModal;
window.saveGoalConfigForm = saveGoalConfigForm;
window.showFinanceAccountModal = showFinanceAccountModal;
window.saveFinanceAccountForm = saveFinanceAccountForm;
window.showFinanceTransferModal = showFinanceTransferModal;
window.saveFinanceTransferForm = saveFinanceTransferForm;
window.deleteFinanceTransactionPrompt = deleteFinanceTransactionPrompt;
window.deleteFinanceAccountPrompt = deleteFinanceAccountPrompt;

// Bindings para Deudas, Gastos Fijos y Sueldos
window.showFinanceDebtModal = showFinanceDebtModal;
window.saveFinanceDebtForm = saveFinanceDebtForm;
window.showFinanceDebtPaymentModal = showFinanceDebtPaymentModal;
window.saveFinanceDebtPaymentForm = saveFinanceDebtPaymentForm;
window.deleteFinanceDebtPrompt = deleteFinanceDebtPrompt;
window.deleteDebtPaymentPrompt = deleteDebtPaymentPrompt;

window.showFinanceRecurringModal = showFinanceRecurringModal;
window.saveFinanceRecurringForm = saveFinanceRecurringForm;
window.showQuickPayRecurringModal = showQuickPayRecurringModal;
window.saveQuickPayRecurringForm = saveQuickPayRecurringForm;
window.unmarkRecurringPaidPrompt = unmarkRecurringPaidPrompt;
window.deleteFinanceRecurringPrompt = deleteFinanceRecurringPrompt;

window.showFinanceSalaryModal = showFinanceSalaryModal;
window.saveFinanceSalaryForm = saveFinanceSalaryForm;
window.renderFinanceMovimientos = renderFinanceMovimientos;
window.renderFinanceFijos = renderFinanceFijos;
window.renderFinanceDeudas = renderFinanceDeudas;
window.renderFinanceSueldos = renderFinanceSueldos;


// New bindings for Deudas, Fijos y Sueldos
window.showFinanceDebtModal = showFinanceDebtModal;
window.saveFinanceDebtForm = saveFinanceDebtForm;
window.showFinanceDebtPaymentModal = showFinanceDebtPaymentModal;
window.saveFinanceDebtPaymentForm = saveFinanceDebtPaymentForm;
window.deleteFinanceDebtPrompt = deleteFinanceDebtPrompt;
window.deleteDebtPaymentPrompt = deleteDebtPaymentPrompt;

window.showFinanceRecurringModal = showFinanceRecurringModal;
window.saveFinanceRecurringForm = saveFinanceRecurringForm;
window.showQuickPayRecurringModal = showQuickPayRecurringModal;
window.saveQuickPayRecurringForm = saveQuickPayRecurringForm;
window.unmarkRecurringPaidPrompt = unmarkRecurringPaidPrompt;
window.deleteFinanceRecurringPrompt = deleteFinanceRecurringPrompt;

window.showFinanceSalaryModal = showFinanceSalaryModal;
window.saveFinanceSalaryForm = saveFinanceSalaryForm;


async function renderFinanceMeta(el, data) {
    const goalRes = await api(eel.get_finance_goals);
    const goal = goalRes || data.goal;

    if (!goal) {
        el.innerHTML = '<div class="empty-state"><h3>No se encontró la meta</h3></div>';
        return;
    }

    const pct = goal.progress_percent || 0;
    const rate = goal.usd_exchange_rate || 1200;

    // Monthly saving calculation
    let targetDateNote = '';
    let monthlyRec = '';
    if (goal.target_date) {
        const tDate = new Date(goal.target_date);
        const now = new Date();
        const diffMonths = Math.max(1, (tDate.getFullYear() - now.getFullYear()) * 12 + (tDate.getMonth() - now.getMonth()));
        const reqMonthlyUSD = Math.round(goal.remaining_usd / diffMonths);
        targetDateNote = `Objetivo fijado para: <strong>${fmtDate(goal.target_date)}</strong> (${diffMonths} meses restantes)`;
        monthlyRec = `Para alcanzar la meta a tiempo, necesitas ahorrar aproximadamente <strong>${fmtUSD(reqMonthlyUSD)}/mes</strong> (unos <strong>${fmtARS(reqMonthlyUSD * rate)}/mes</strong>).`;
    } else {
        targetDateNote = 'Sin fecha límite definida (puedes fijar una en configuración).';
        const sample6 = Math.round(goal.remaining_usd / 6);
        const sample12 = Math.round(goal.remaining_usd / 12);
        monthlyRec = `Ejemplos de ritmo: Ahorrando <strong>${fmtUSD(sample6)}/mes</strong> llegás en 6 meses · Con <strong>${fmtUSD(sample12)}/mes</strong> llegás en 12 meses.`;
    }

    let contribsHtml = '';
    const contribs = goal.contributions || [];
    if (contribs.length === 0) {
        contribsHtml = `
        <div class="empty-state" style="padding:24px 10px">
            <p>Todavía no hay aportes registrados directamente. ¡Haz tu primer aporte!</p>
            <button class="btn btn-primary" onclick="showGoalContributionModal()" style="margin-top:8px">+ Sumar Aporte</button>
        </div>`;
    } else {
        contribsHtml = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Aporte USD</th>
                        <th>Monto ARS</th>
                        <th>Cuenta</th>
                        <th>Detalle</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${contribs.map(c => `
                        <tr>
                            <td>${fmtDate(c.date)}</td>
                            <td><strong style="color:#B388EB">${fmtUSD(c.goal_amount_usd || (c.amount / rate))}</strong></td>
                            <td>${fmtARS(c.amount)}</td>
                            <td>${c.account_icon || '💳'} ${esc(c.account_name || 'Cuenta')}</td>
                            <td>${esc(c.description || '-')}</td>
                            <td style="text-align:right">
                                <button class="btn btn-ghost btn-sm" onclick="deleteFinanceTransactionPrompt(${c.id})" style="color:var(--rose);padding:2px 6px">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    }

    el.innerHTML = `
    <div class="finance-hero-card" style="padding:28px">
        <div class="finance-goal-header">
            <div class="finance-goal-title-group">
                <div class="finance-goal-icon" style="width:54px;height:54px;font-size:2rem">🗽</div>
                <div>
                    <h2 style="margin:0 0 4px 0">${esc(goal.title)}</h2>
                    <div style="font-size:0.85rem;color:var(--text-muted)">${esc(goal.notes || 'Fondo de ahorro para la intervención quirúrgica')}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button class="btn btn-secondary" onclick="showGoalConfigModal()">⚙️ Configurar Meta</button>
                <button class="btn btn-primary" onclick="showGoalContributionModal()">+ Sumar Aporte</button>
            </div>
        </div>

        <div style="display:flex;align-items:baseline;gap:12px;margin:18px 0 10px 0">
            <span style="font-size:2.4rem;font-weight:800;color:#E87A9A;font-variant-numeric:tabular-nums">${fmtUSD(goal.total_saved_usd)}</span>
            <span style="font-size:1.1rem;color:var(--text-muted)">de ${fmtUSD(goal.target_amount)}</span>
            <span class="task-badge" style="background:rgba(179,136,235,0.2);color:#B388EB;font-size:0.9rem;padding:4px 10px">${pct}%</span>
        </div>

        <div class="finance-progress-bar-wrap" style="height:18px">
            <div class="finance-progress-bar-fill" style="width:${Math.max(2, Math.min(100, pct))}%"></div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-light)">
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">Monto Restante</div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--text)">${fmtUSD(goal.remaining_usd)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">≈ ${fmtARS(goal.remaining_ars_equiv)}</div>
            </div>
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">Ahorro Actual en ARS</div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--text)">${fmtARS(goal.saved_ars_equiv)}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">Base USD: ${fmtUSD(goal.base_usd)}</div>
            </div>
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">Cotización Dólar Ref.</div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--text)">$ ${rate} ARS</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">Editable en ajustes</div>
            </div>
            <div>
                <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">Aportes Realizados</div>
                <div style="font-size:1.15rem;font-weight:700;color:var(--text)">${goal.contributions_count || 0} registros</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">${fmtUSD(goal.contributed_usd)} sumados</div>
            </div>
        </div>
    </div>

    <div class="card" style="margin-bottom:20px;padding:18px 20px">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:8px">💡 Proyección & Ritmo de Ahorro</div>
        <div style="font-size:0.85rem;color:var(--text);line-height:1.5;margin-bottom:6px">${targetDateNote}</div>
        <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.5">${monthlyRec}</div>
    </div>

    <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-weight:700;font-size:0.95rem">Historial de Aportes a la Operación</div>
            <button class="btn btn-primary btn-sm" onclick="showGoalContributionModal()">+ Nuevo Aporte</button>
        </div>
        ${contribsHtml}
    </div>`;
}

async function renderFinanceCuentas(el, data) {
    const accounts = data.accounts || [];

    let gridHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div>
            <div style="font-weight:700;font-size:1.05rem">Cuentas y Billeteras</div>
            <div style="font-size:0.8rem;color:var(--text-muted)">Saldos calculados en tiempo real según movimientos</div>
        </div>
        <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" onclick="showFinanceTransferModal()">⇆ Transferencia entre cuentas</button>
            <button class="btn btn-primary" onclick="showFinanceAccountModal()">+ Nueva cuenta</button>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">`;

    accounts.forEach(acc => {
        const currFmt = acc.currency === 'USD' ? fmtUSD(acc.current_balance) : fmtARS(acc.current_balance);
        const initFmt = acc.currency === 'USD' ? fmtUSD(acc.initial_balance) : fmtARS(acc.initial_balance);
        gridHtml += `
        <div class="card" style="padding:18px 20px;border-top:4px solid ${acc.color || '#8b5cf6'}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:1.6rem">${acc.icon || '💳'}</span>
                    <div>
                        <div style="font-weight:700;font-size:1rem">${esc(acc.name)}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase">${acc.currency} · ${esc(acc.account_type)}</div>
                    </div>
                </div>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm" onclick="showFinanceAccountModal(${acc.id})" style="padding:3px 6px">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteFinanceAccountPrompt(${acc.id})" style="padding:3px 6px;color:var(--rose)">🗑️</button>
                </div>
            </div>
            <div style="margin:12px 0 8px 0">
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">Saldo Actual</div>
                <div style="font-size:1.6rem;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums">${currFmt}</div>
            </div>
            <div style="font-size:0.78rem;color:var(--text-muted);border-top:1px solid var(--border-light);padding-top:8px;display:flex;justify-content:space-between">
                <span>Saldo inicial: ${initFmt}</span>
                <span onclick="filterFinanceTxAccount(${acc.id});switchFinanceTab('resumen')" style="cursor:pointer;color:var(--accent);font-weight:600">Ver movs →</span>
            </div>
        </div>`;
    });
    gridHtml += '</div>';

    el.innerHTML = gridHtml;
}

// ===================== MODALES FINANZAS =====================

async function showNewFinanceTransactionModal(txId = null) {
    const [accounts, categories, goals] = await Promise.all([
        api(eel.get_finance_accounts),
        api(eel.get_finance_categories),
        api(eel.get_finance_goals)
    ]);

    let tx = null;
    if (txId) {
        const txs = await api(eel.get_finance_transactions, {});
        tx = (txs || []).find(t => t.id === txId);
    }

    const defaultType = tx ? tx.type : (state.financeFilterType !== 'all' ? state.financeFilterType : 'expense');
    const defaultDate = tx ? tx.date : todayStr();
    const defaultAcc = tx ? tx.account_id : (accounts[0] ? accounts[0].id : 1);
    const defaultCat = tx ? tx.category_id : '';
    const defaultAmt = tx ? tx.amount : '';
    const defaultDesc = tx ? tx.description : '';
    const defaultDestAcc = tx ? tx.destination_account_id : '';
    const defaultGoalUsd = tx ? tx.goal_amount_usd : '';

    const rate = (goals && goals.usd_exchange_rate) ? goals.usd_exchange_rate : 1200;

    let accOptions = accounts.map(a => `<option value="${a.id}" ${a.id === defaultAcc ? 'selected' : ''}>${a.icon || '💳'} ${esc(a.name)} (${a.currency})</option>`).join('');
    let destAccOptions = accounts.map(a => `<option value="${a.id}" ${a.id === defaultDestAcc ? 'selected' : ''}>${a.icon || '💳'} ${esc(a.name)} (${a.currency})</option>`).join('');

    let expCats = categories.filter(c => c.type === 'expense');
    let incCats = categories.filter(c => c.type === 'income');

    let catOptions = `<option value="">-- Sin categoría --</option>`;
    catOptions += `<optgroup label="Gastos">`;
    expCats.forEach(c => { catOptions += `<option value="${c.id}" ${c.id === defaultCat ? 'selected' : ''}>${c.icon || '🏷️'} ${esc(c.name)}</option>`; });
    catOptions += `</optgroup><optgroup label="Ingresos">`;
    incCats.forEach(c => { catOptions += `<option value="${c.id}" ${c.id === defaultCat ? 'selected' : ''}>${c.icon || '💼'} ${esc(c.name)}</option>`; });
    catOptions += `</optgroup>`;

    const bodyHtml = `
    <div style="display:flex;gap:6px;margin-bottom:14px;background:var(--border-light);padding:4px;border-radius:var(--radius-sm)">
        <button type="button" class="btn btn-sm ${defaultType === 'expense' ? 'btn-primary' : 'btn-ghost'}" id="txTypeExp" onclick="setTxModalType('expense')" style="flex:1">Gasto (-)</button>
        <button type="button" class="btn btn-sm ${defaultType === 'income' ? 'btn-primary' : 'btn-ghost'}" id="txTypeInc" onclick="setTxModalType('income')" style="flex:1">Ingreso (+)</button>
        <button type="button" class="btn btn-sm ${defaultType === 'goal_contribution' ? 'btn-primary' : 'btn-ghost'}" id="txTypeGoal" onclick="setTxModalType('goal_contribution')" style="flex:1">🗽 Operación</button>
        <button type="button" class="btn btn-sm ${defaultType === 'transfer' ? 'btn-primary' : 'btn-ghost'}" id="txTypeTrf" onclick="setTxModalType('transfer')" style="flex:1">⇆ Transfer</button>
    </div>
    <input type="hidden" id="txType" value="${defaultType}">
    <input type="hidden" id="txId" value="${txId || ''}">
    <input type="hidden" id="txRate" value="${rate}">

    <div class="form-group">
        <label class="form-label">Monto ($ ARS) *</label>
        <input type="number" step="any" id="txAmount" class="form-control" placeholder="0.00" value="${defaultAmt}" required style="font-size:1.1rem;font-weight:700" oninput="onTxAmountChanged()">
    </div>

    <div id="txGoalFields" style="display:${defaultType === 'goal_contribution' ? 'block' : 'none'};background:rgba(179,136,235,0.1);padding:12px;border-radius:var(--radius-sm);margin-bottom:14px;border:1px solid rgba(179,136,235,0.25)">
        <div style="font-size:0.8rem;font-weight:600;color:#B388EB;margin-bottom:6px">🗽 Aporte a Meta Operación</div>
        <div style="display:flex;gap:10px;align-items:center">
            <div style="flex:1">
                <label class="form-label" style="font-size:0.75rem">Equivalente USD</label>
                <input type="number" step="any" id="txGoalUsd" class="form-control" placeholder="USD" value="${defaultGoalUsd}" oninput="onTxGoalUsdChanged()">
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);padding-top:16px">
                TC: $ ${rate}
            </div>
        </div>
    </div>

    <div class="form-group">
        <label class="form-label" id="txAccLabel">Cuenta / Billetera *</label>
        <select id="txAccount" class="form-control">${accOptions}</select>
    </div>

    <div class="form-group" id="txDestAccGroup" style="display:${defaultType === 'transfer' ? 'block' : 'none'}">
        <label class="form-label">Cuenta Destino *</label>
        <select id="txDestAccount" class="form-control">${destAccOptions}</select>
    </div>

    <div class="form-group" id="txCatGroup" style="display:${defaultType === 'transfer' ? 'none' : 'block'}">
        <label class="form-label">Categoría</label>
        <select id="txCategory" class="form-control">${catOptions}</select>
    </div>

    <div class="form-group">
        <label class="form-label">Fecha *</label>
        <input type="date" id="txDate" class="form-control" value="${defaultDate}" required>
    </div>

    <div class="form-group">
        <label class="form-label">Descripción / Comercio / Detalle</label>
        <input type="text" id="txDescription" class="form-control" placeholder="Ej: Supermercado, Farmacia TRH, Sueldo..." value="${esc(defaultDesc)}">
    </div>`;

    openModal(txId ? 'Editar Movimiento' : 'Nuevo Movimiento', bodyHtml);
    document.getElementById('modalSave').onclick = saveFinanceTransactionForm;
}

function setTxModalType(type) {
    document.getElementById('txType').value = type;
    ['txTypeExp', 'txTypeInc', 'txTypeGoal', 'txTypeTrf'].forEach(btnId => {
        const b = document.getElementById(btnId);
        if (b) { b.classList.remove('btn-primary'); b.classList.add('btn-ghost'); }
    });
    if (type === 'expense') document.getElementById('txTypeExp').className = 'btn btn-sm btn-primary';
    else if (type === 'income') document.getElementById('txTypeInc').className = 'btn btn-sm btn-primary';
    else if (type === 'goal_contribution') document.getElementById('txTypeGoal').className = 'btn btn-sm btn-primary';
    else if (type === 'transfer') document.getElementById('txTypeTrf').className = 'btn btn-sm btn-primary';

    document.getElementById('txDestAccGroup').style.display = (type === 'transfer') ? 'block' : 'none';
    document.getElementById('txCatGroup').style.display = (type === 'transfer') ? 'none' : 'block';
    document.getElementById('txGoalFields').style.display = (type === 'goal_contribution') ? 'block' : 'none';
    document.getElementById('txAccLabel').textContent = (type === 'transfer') ? 'Cuenta Origen *' : 'Cuenta / Billetera *';

    if (type === 'goal_contribution') {
        onTxAmountChanged();
    }
}

function onTxAmountChanged() {
    const type = document.getElementById('txType').value;
    if (type === 'goal_contribution') {
        const amt = parseFloat(document.getElementById('txAmount').value) || 0;
        const rate = parseFloat(document.getElementById('txRate').value) || 1200;
        if (amt > 0 && rate > 0) {
            document.getElementById('txGoalUsd').value = (amt / rate).toFixed(2);
        }
    }
}

function onTxGoalUsdChanged() {
    const usd = parseFloat(document.getElementById('txGoalUsd').value) || 0;
    const rate = parseFloat(document.getElementById('txRate').value) || 1200;
    if (usd > 0 && rate > 0) {
        document.getElementById('txAmount').value = Math.round(usd * rate);
    }
}

async function saveFinanceTransactionForm() {
    const txId = document.getElementById('txId').value;
    const type = document.getElementById('txType').value;
    const amount = parseFloat(document.getElementById('txAmount').value);
    const account_id = document.getElementById('txAccount').value;
    const destination_account_id = document.getElementById('txDestAccount') ? document.getElementById('txDestAccount').value : null;
    const category_id = document.getElementById('txCategory') ? document.getElementById('txCategory').value : null;
    const date = document.getElementById('txDate').value;
    const description = document.getElementById('txDescription').value;
    const goal_amount_usd = document.getElementById('txGoalUsd') ? parseFloat(document.getElementById('txGoalUsd').value) : 0;

    if (isNaN(amount) || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0');
        return;
    }
    if (!account_id) {
        showToast('Selecciona una cuenta');
        return;
    }
    if (type === 'transfer' && (!destination_account_id || destination_account_id === account_id)) {
        showToast('Selecciona una cuenta destino distinta a la de origen');
        return;
    }

    const payload = {
        type, amount, account_id, destination_account_id, category_id,
        date, description, goal_amount_usd, currency: 'ARS'
    };

    let res;
    if (txId) {
        res = await api(eel.update_finance_transaction, parseInt(txId), payload);
    } else {
        res = await api(eel.create_finance_transaction, payload);
    }

    if (res && res.ok) {
        showToast(txId ? 'Movimiento actualizado' : 'Movimiento registrado');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
    }
}

async function showGoalContributionModal() {
    const [accounts, goal] = await Promise.all([
        api(eel.get_finance_accounts),
        api(eel.get_finance_goals)
    ]);

    const rate = (goal && goal.usd_exchange_rate) ? goal.usd_exchange_rate : 1200;
    let accOptions = accounts.map(a => `<option value="${a.id}">${a.icon || '💳'} ${esc(a.name)} (${a.currency})</option>`).join('');

    const bodyHtml = `
    <div style="background:rgba(179,136,235,0.12);padding:14px;border-radius:var(--radius);margin-bottom:16px;border:1px solid rgba(179,136,235,0.3)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
            <span style="font-size:1.6rem">🗽</span>
            <div>
                <strong style="color:#B388EB">${esc((goal && goal.title) || 'Meta Operación')}</strong>
                <div style="font-size:0.78rem;color:var(--text-muted)">Cotización ref: $ ${rate} ARS/USD</div>
            </div>
        </div>
    </div>
    <input type="hidden" id="goalRate" value="${rate}">

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="form-group" style="margin:0">
            <label class="form-label">Aporte en USD (Dólares)</label>
            <input type="number" step="any" id="goalUsdInput" class="form-control" placeholder="US$ 100" style="font-size:1.15rem;font-weight:700;color:#B388EB" oninput="onGoalUsdType()">
        </div>
        <div class="form-group" style="margin:0">
            <label class="form-label">Monto en ARS (Pesos)</label>
            <input type="number" step="any" id="goalArsInput" class="form-control" placeholder="$ 120.000" style="font-size:1.15rem;font-weight:700" oninput="onGoalArsType()">
        </div>
    </div>

    <div class="form-group">
        <label class="form-label">¿De qué cuenta sale el dinero? *</label>
        <select id="goalAccount" class="form-control">${accOptions}</select>
    </div>

    <div class="form-group">
        <label class="form-label">Fecha del aporte</label>
        <input type="date" id="goalDate" class="form-control" value="${todayStr()}">
    </div>

    <div class="form-group">
        <label class="form-label">Nota / Concepto</label>
        <input type="text" id="goalNotes" class="form-control" placeholder="Ej: Ahorro de mes, aguinaldo, freelance..." value="Aporte a Meta Operación">
    </div>`;

    openModal('🗽 Sumar Aporte a la Operación', bodyHtml);
    document.getElementById('modalSave').onclick = saveGoalContributionForm;
}

function onGoalUsdType() {
    const usd = parseFloat(document.getElementById('goalUsdInput').value) || 0;
    const rate = parseFloat(document.getElementById('goalRate').value) || 1200;
    if (usd > 0) {
        document.getElementById('goalArsInput').value = Math.round(usd * rate);
    }
}

function onGoalArsType() {
    const ars = parseFloat(document.getElementById('goalArsInput').value) || 0;
    const rate = parseFloat(document.getElementById('goalRate').value) || 1200;
    if (ars > 0 && rate > 0) {
        document.getElementById('goalUsdInput').value = (ars / rate).toFixed(2);
    }
}

async function saveGoalContributionForm() {
    const usd = parseFloat(document.getElementById('goalUsdInput').value) || 0;
    const ars = parseFloat(document.getElementById('goalArsInput').value) || 0;
    const account_id = document.getElementById('goalAccount').value;
    const date = document.getElementById('goalDate').value;
    const notes = document.getElementById('goalNotes').value;

    if (usd <= 0 && ars <= 0) {
        showToast('Ingresa un monto en USD o ARS mayor a 0');
        return;
    }
    if (!account_id) {
        showToast('Selecciona la cuenta de origen');
        return;
    }

    const res = await api(eel.add_goal_contribution, {
        amount_usd: usd,
        amount_ars: ars,
        account_id: parseInt(account_id),
        date: date,
        notes: notes
    });

    if (res && res.ok) {
        showToast('¡Aporte a la Operación guardado con éxito! ✨');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo registrar'));
    }
}

async function showGoalConfigModal() {
    const goal = await api(eel.get_finance_goals);
    if (!goal) return;

    const bodyHtml = `
    <input type="hidden" id="cfgGoalId" value="${goal.id}">
    <div class="form-group">
        <label class="form-label">Nombre de la Meta</label>
        <input type="text" id="cfgGoalTitle" class="form-control" value="${esc(goal.title || 'Mi Operación')}" required>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Monto Objetivo (USD) *</label>
            <input type="number" step="any" id="cfgGoalTarget" class="form-control" value="${goal.target_amount || 5000}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Ahorro Base Inicial (USD)</label>
            <input type="number" step="any" id="cfgGoalBase" class="form-control" value="${goal.base_usd || 0}">
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Dólares que ya tenías ahorrados previamente</div>
        </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Cotización Dólar Ref. (ARS/USD) *</label>
            <input type="number" step="any" id="cfgGoalRate" class="form-control" value="${goal.usd_exchange_rate || 1200}" required>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Para equivalencias en pesos</div>
        </div>
        <div class="form-group">
            <label class="form-label">Fecha Objetivo Estimada</label>
            <input type="date" id="cfgGoalDate" class="form-control" value="${goal.target_date || ''}">
        </div>
    </div>
    <div class="form-group">
        <label class="form-label">Notas / Objetivos</label>
        <textarea id="cfgGoalNotes" class="form-control" rows="3">${esc(goal.notes || '')}</textarea>
    </div>`;

    openModal('⚙️ Configurar Meta Operación', bodyHtml);
    document.getElementById('modalSave').onclick = saveGoalConfigForm;
}

async function saveGoalConfigForm() {
    const id = parseInt(document.getElementById('cfgGoalId').value);
    const title = document.getElementById('cfgGoalTitle').value;
    const target_amount = parseFloat(document.getElementById('cfgGoalTarget').value) || 5000;
    const current_amount = parseFloat(document.getElementById('cfgGoalBase').value) || 0;
    const usd_exchange_rate = parseFloat(document.getElementById('cfgGoalRate').value) || 1200;
    const target_date = document.getElementById('cfgGoalDate').value || null;
    const notes = document.getElementById('cfgGoalNotes').value;

    const res = await api(eel.update_finance_goal, id, {
        title, target_amount, current_amount, usd_exchange_rate, target_date, notes
    });

    if (res && res.ok) {
        showToast('Meta actualizada exitosamente');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
    }
}

async function showFinanceAccountModal(accId = null) {
    let acc = null;
    if (accId) {
        const accounts = await api(eel.get_finance_accounts);
        acc = (accounts || []).find(a => a.id === accId);
    }

    const defaultName = acc ? acc.name : '';
    const defaultType = acc ? acc.account_type : 'wallet';
    const defaultCurr = acc ? acc.currency : 'ARS';
    const defaultBal = acc ? acc.initial_balance : 0;
    const defaultColor = acc ? acc.color : '#8b5cf6';
    const defaultIcon = acc ? acc.icon : '💳';

    const bodyHtml = `
    <input type="hidden" id="accId" value="${accId || ''}">
    <div class="form-group">
        <label class="form-label">Nombre de la cuenta *</label>
        <input type="text" id="accName" class="form-control" placeholder="Ej: Mercado Pago, Galicia, Dólares..." value="${esc(defaultName)}" required>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Tipo de cuenta</label>
            <select id="accType" class="form-control">
                <option value="wallet" ${defaultType === 'wallet' ? 'selected' : ''}>Billetera digital</option>
                <option value="cash" ${defaultType === 'cash' ? 'selected' : ''}>Efectivo</option>
                <option value="bank" ${defaultType === 'bank' ? 'selected' : ''}>Cuenta bancaria</option>
                <option value="savings" ${defaultType === 'savings' ? 'selected' : ''}>Ahorros / Inversión</option>
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Moneda</label>
            <select id="accCurrency" class="form-control">
                <option value="ARS" ${defaultCurr === 'ARS' ? 'selected' : ''}>Pesos Argentinos (ARS)</option>
                <option value="USD" ${defaultCurr === 'USD' ? 'selected' : ''}>Dólares (USD)</option>
            </select>
        </div>
    </div>
    <div class="form-group">
        <label class="form-label">Saldo Inicial</label>
        <input type="number" step="any" id="accInitialBalance" class="form-control" value="${defaultBal}">
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px">Saldo con el que arranca esta cuenta antes de registrar movimientos</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Ícono (Emoji)</label>
            <input type="text" id="accIcon" class="form-control" value="${esc(defaultIcon)}" style="text-align:center;font-size:1.3rem">
        </div>
        <div class="form-group">
            <label class="form-label">Color de acento</label>
            <input type="color" id="accColor" class="form-control" value="${defaultColor}" style="height:42px;padding:2px">
        </div>
    </div>`;

    openModal(accId ? 'Editar Cuenta' : 'Nueva Cuenta', bodyHtml);
    document.getElementById('modalSave').onclick = saveFinanceAccountForm;
}

async function saveFinanceAccountForm() {
    const id = document.getElementById('accId').value;
    const name = document.getElementById('accName').value.trim();
    const account_type = document.getElementById('accType').value;
    const currency = document.getElementById('accCurrency').value;
    const initial_balance = parseFloat(document.getElementById('accInitialBalance').value) || 0;
    const icon = document.getElementById('accIcon').value.trim() || '💳';
    const color = document.getElementById('accColor').value;

    if (!name) {
        showToast('El nombre de la cuenta es obligatorio');
        return;
    }

    const payload = { name, account_type, currency, initial_balance, icon, color };
    let res;
    if (id) {
        res = await api(eel.update_finance_account, parseInt(id), payload);
    } else {
        res = await api(eel.create_finance_account, payload);
    }

    if (res && res.ok) {
        showToast(id ? 'Cuenta actualizada' : 'Cuenta creada');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo guardar'));
    }
}

async function showFinanceTransferModal() {
    const accounts = await api(eel.get_finance_accounts);
    if (!accounts || accounts.length < 2) {
        showToast('Necesitas al menos 2 cuentas para realizar una transferencia');
        return;
    }

    let srcOptions = accounts.map(a => `<option value="${a.id}">${a.icon || '💳'} ${esc(a.name)} (${fmtARS(a.current_balance)})</option>`).join('');
    let dstOptions = accounts.map((a, i) => `<option value="${a.id}" ${i === 1 ? 'selected' : ''}>${a.icon || '💳'} ${esc(a.name)} (${fmtARS(a.current_balance)})</option>`).join('');

    const bodyHtml = `
    <div class="form-group">
        <label class="form-label">Monto a Transferir ($ ARS) *</label>
        <input type="number" step="any" id="trfAmount" class="form-control" placeholder="0.00" style="font-size:1.15rem;font-weight:700" required>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
            <label class="form-label">Cuenta Origen (sale dinero) *</label>
            <select id="trfSource" class="form-control">${srcOptions}</select>
        </div>
        <div class="form-group">
            <label class="form-label">Cuenta Destino (entra dinero) *</label>
            <select id="trfDest" class="form-control">${dstOptions}</select>
        </div>
    </div>
    <div class="form-group">
        <label class="form-label">Fecha</label>
        <input type="date" id="trfDate" class="form-control" value="${todayStr()}">
    </div>
    <div class="form-group">
        <label class="form-label">Detalle / Motivo</label>
        <input type="text" id="trfDesc" class="form-control" placeholder="Ej: Retiro cajero, recarga tarjeta, transferencia..." value="Transferencia entre cuentas">
    </div>`;

    openModal('⇆ Transferir entre Cuentas', bodyHtml);
    document.getElementById('modalSave').onclick = saveFinanceTransferForm;
}

async function saveFinanceTransferForm() {
    const amount = parseFloat(document.getElementById('trfAmount').value);
    const account_id = document.getElementById('trfSource').value;
    const destination_account_id = document.getElementById('trfDest').value;
    const date = document.getElementById('trfDate').value;
    const description = document.getElementById('trfDesc').value;

    if (isNaN(amount) || amount <= 0) {
        showToast('Ingresa un monto válido mayor a 0');
        return;
    }
    if (account_id === destination_account_id) {
        showToast('La cuenta origen y destino deben ser distintas');
        return;
    }

    const res = await api(eel.create_finance_transaction, {
        type: 'transfer',
        amount: amount,
        account_id: parseInt(account_id),
        destination_account_id: parseInt(destination_account_id),
        date: date,
        description: description,
        currency: 'ARS'
    });

    if (res && res.ok) {
        showToast('Transferencia realizada exitosamente');
        closeModal();
        navigate('finance');
    } else {
        showToast('Error: ' + ((res && res.error) || 'No se pudo transferir'));
    }
}

async function deleteFinanceTransactionPrompt(id) {
    if (!confirm('¿Deseas eliminar este movimiento financiero?')) return;
    const res = await api(eel.delete_finance_transaction, id);
    if (res && res.ok) {
        showToast('Movimiento eliminado');
        navigate('finance');
    } else {
        showToast('Error al eliminar');
    }
}

async function deleteFinanceAccountPrompt(id) {
    if (!confirm('¿Deseas eliminar esta cuenta? Si tiene movimientos históricos, se desactivará manteniendo el historial.')) return;
    const res = await api(eel.delete_finance_account, id);
    if (res && res.ok) {
        showToast('Cuenta eliminada / archivada');
        navigate('finance');
    } else {
        showToast('Error al eliminar');
    }
}

// Global window bindings for Finance
window.fmtARS = fmtARS;
window.fmtUSD = fmtUSD;
window.renderFinance = renderFinance;
window.switchFinanceTab = switchFinanceTab;
window.changeFinancePeriod = changeFinancePeriod;
window.filterFinanceTxType = filterFinanceTxType;
window.filterFinanceTxAccount = filterFinanceTxAccount;
window.onSearchFinanceTx = onSearchFinanceTx;
window.showNewFinanceTransactionModal = showNewFinanceTransactionModal;
window.setTxModalType = setTxModalType;
window.onTxAmountChanged = onTxAmountChanged;
window.onTxGoalUsdChanged = onTxGoalUsdChanged;
window.saveFinanceTransactionForm = saveFinanceTransactionForm;
window.showGoalContributionModal = showGoalContributionModal;
window.onGoalUsdType = onGoalUsdType;
window.onGoalArsType = onGoalArsType;
window.saveGoalContributionForm = saveGoalContributionForm;
window.showGoalConfigModal = showGoalConfigModal;
window.saveGoalConfigForm = saveGoalConfigForm;
window.showFinanceAccountModal = showFinanceAccountModal;
window.saveFinanceAccountForm = saveFinanceAccountForm;
window.showFinanceTransferModal = showFinanceTransferModal;
window.saveFinanceTransferForm = saveFinanceTransferForm;
window.deleteFinanceTransactionPrompt = deleteFinanceTransactionPrompt;
window.deleteFinanceAccountPrompt = deleteFinanceAccountPrompt;

// Bindings para Deudas, Gastos Fijos y Sueldos
window.showFinanceDebtModal = showFinanceDebtModal;
window.saveFinanceDebtForm = saveFinanceDebtForm;
window.showFinanceDebtPaymentModal = showFinanceDebtPaymentModal;
window.saveFinanceDebtPaymentForm = saveFinanceDebtPaymentForm;
window.deleteFinanceDebtPrompt = deleteFinanceDebtPrompt;
window.deleteDebtPaymentPrompt = deleteDebtPaymentPrompt;

window.showFinanceRecurringModal = showFinanceRecurringModal;
window.saveFinanceRecurringForm = saveFinanceRecurringForm;
window.showQuickPayRecurringModal = showQuickPayRecurringModal;
window.saveQuickPayRecurringForm = saveQuickPayRecurringForm;
window.unmarkRecurringPaidPrompt = unmarkRecurringPaidPrompt;
window.deleteFinanceRecurringPrompt = deleteFinanceRecurringPrompt;

window.showFinanceSalaryModal = showFinanceSalaryModal;
window.saveFinanceSalaryForm = saveFinanceSalaryForm;
window.renderFinanceMovimientos = renderFinanceMovimientos;
window.renderFinanceFijos = renderFinanceFijos;
window.renderFinanceDeudas = renderFinanceDeudas;
window.renderFinanceSueldos = renderFinanceSueldos;





