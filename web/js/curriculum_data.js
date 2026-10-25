/**
 * Malla Curricular Interactiva — Plan 2023 UTN FRA (Facultad Regional Avellaneda)
 * Ingeniería Industrial (Ordenanzas CSU N° 1908, 1886 y 1909)
 * 42 Asignaturas Oficiales distribuidas en Niveles I a V + Título Intermedio + PPS + Electivas.
 */

const UTN_INDUSTRIAL_STATUS_CONFIG = {
    APROBADA: { label: 'Aprobada', badgeClass: 'tag-sage', bg: 'rgba(92, 179, 142, 0.18)', border: '#5cb38e', color: '#5cb38e', icon: '✅' },
    REGULAR: { label: 'Regular', badgeClass: 'tag-lavender', bg: 'rgba(164, 140, 224, 0.18)', border: '#a48ce0', color: '#a48ce0', icon: '📘' },
    CURSANDO: { label: 'Cursando', badgeClass: 'tag-primary', bg: 'rgba(242, 139, 168, 0.18)', border: '#f28ba8', color: '#f28ba8', icon: '⚡' },
    DISPONIBLE: { label: 'Disponible', badgeClass: 'tag-amber', bg: 'rgba(235, 178, 85, 0.18)', border: '#ebb255', color: '#ebb255', icon: '🔓' },
    LIBRE_DISPONIBLE: { label: 'Final Libre', badgeClass: 'tag-cyan', bg: 'rgba(78, 197, 219, 0.18)', border: '#4ec5db', color: '#4ec5db', icon: '🌐' },
    BLOQUEADA: { label: 'Bloqueada', badgeClass: 'tag-muted', bg: 'rgba(255, 255, 255, 0.04)', border: 'rgba(255, 255, 255, 0.12)', color: 'var(--text-muted)', icon: '🔒' },
};

const UTN_INDUSTRIAL_PLAN = [
    // ==========================================
    // NIVEL I (1° Año — 8 Asignaturas Obligatorias | 31 hs/sem)
    // ==========================================
    {
        id: 1,
        level: 1,
        code: "AMI",
        name: "Análisis Matemático I",
        weeklyHours: 5,
        regime: "Anual",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "CURSANDO",
        notes: "Comisión 1-1-S (Viernes Noche). Bloque AND (Regularidad) y AD"
    },
    {
        id: 2,
        level: 1,
        code: "QG",
        name: "Química General",
        weeklyHours: 5,
        regime: "Anual",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "CURSANDO",
        notes: "Comisión 1-1-S (Jueves Noche). Laboratorio hasta TP 8 Electroquímica"
    },
    {
        id: 3,
        level: 1,
        code: "SR",
        name: "Sistemas de Representación",
        weeklyHours: 3,
        regime: "Anual",
        area: "Ciencias Básicas / Diseño",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "CURSANDO",
        notes: "Comisión 1-32-O (Sábados Mañana). SolidWorks + Plano Final impreso A4/A3"
    },
    {
        id: 4,
        level: 1,
        code: "INFO1",
        name: "Informática I",
        weeklyHours: 3,
        regime: "Anual",
        area: "Ciencias Básicas / IT",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "APROBADA",
        defaultGrade: 9.0,
        notes: "Cursada en com. 1°54 en 2025. Promocionada con nota 9"
    },
    {
        id: 5,
        level: 1,
        code: "PSI",
        name: "Pensamiento Sistémico",
        subtitle: "Integradora I",
        weeklyHours: 3,
        regime: "Anual",
        area: "Integradora / Industrial",
        isIntegrator: true,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "APROBADA",
        defaultGrade: 8.0,
        notes: "Cursada en com. 1°54 en 2025. Promocionada con nota 8"
    },
    {
        id: 6,
        level: 1,
        code: "FIS1",
        name: "Física I",
        weeklyHours: 5,
        regime: "Anual",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "CURSANDO",
        notes: "Comisión 1-11-R (Martes Noche). Lab Grupo 6 (7/7 presentes)"
    },
    {
        id: 7,
        level: 1,
        code: "AGA",
        name: "Álgebra y Geometría Analítica",
        weeklyHours: 5,
        regime: "Anual",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "CURSANDO",
        notes: "Comisión 1-103 (Miércoles Mañana). Aula F102 / Zoom"
    },
    {
        id: 8,
        level: 1,
        code: "IYS",
        name: "Ingeniería y Sociedad",
        weeklyHours: 2,
        regime: "Anual",
        area: "Complementarias",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "APROBADA",
        defaultGrade: 8.0,
        notes: "Cursada en com. 1°103 en 2025. Aprobada con final nota 8"
    },

    // ==========================================
    // NIVEL II (2° Año — 8 Asignaturas Obligatorias | 30 hs/sem)
    // ==========================================
    {
        id: 9,
        level: 2,
        code: "AM2",
        name: "Análisis Matemático II",
        weeklyHours: 5,
        regime: "Anual",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [1, 7],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [1, 7],
        notes: "Requiere cursada de Análisis I y Álgebra"
    },
    {
        id: 10,
        level: 2,
        code: "ADMG",
        name: "Administración General",
        subtitle: "Integradora II",
        weeklyHours: 4,
        regime: "Anual",
        area: "Integradora / Gestión",
        isIntegrator: true,
        cursadasParaCursar: [4, 5, 7, 8],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [4, 5, 7, 8],
        notes: "Falta sólo firmar Álgebra (ya tiene Info I, Pensamiento Sistémico e IyS)"
    },
    {
        id: 11,
        level: 2,
        code: "PYE",
        name: "Probabilidad y Estadística",
        weeklyHours: 3,
        regime: "Anual/Cuatr",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [1, 7],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [1, 7],
        notes: "Requiere cursada de Análisis I y Álgebra"
    },
    {
        id: 12,
        level: 2,
        code: "CDM",
        name: "Ciencia de los Materiales",
        weeklyHours: 4,
        regime: "Anual",
        area: "Tecnologías Básicas",
        isIntegrator: false,
        cursadasParaCursar: [2, 6],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [2, 6],
        notes: "Requiere cursada de Química General y Física I"
    },
    {
        id: 13,
        level: 2,
        code: "FIS2",
        name: "Física II",
        weeklyHours: 5,
        regime: "Anual",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [1, 6],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [1, 6],
        notes: "Requiere cursada de Análisis I y Física I"
    },
    {
        id: 14,
        level: 2,
        code: "ECG",
        name: "Economía General",
        weeklyHours: 4,
        regime: "Anual",
        area: "Economía y Finanzas",
        isIntegrator: false,
        cursadasParaCursar: [1, 5, 8],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [1, 5, 8],
        notes: "Falta sólo firmar Análisis I (ya tiene Pensamiento Sistémico e IyS)"
    },
    {
        id: 15,
        level: 2,
        code: "INFO2",
        name: "Informática II",
        weeklyHours: 3,
        regime: "Anual/Cuatr",
        area: "Tecnologías Básicas / CAD-BD",
        isIntegrator: false,
        cursadasParaCursar: [4],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [4],
        defaultStatus: "CURSANDO",
        notes: "Comisión 2-51-N (Lunes Noche). Desbloqueada por Informática I"
    },
    {
        id: 16,
        level: 2,
        code: "ING1",
        name: "Inglés I",
        weeklyHours: 2,
        regime: "Anual/Libre",
        area: "Idiomas",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [],
        defaultStatus: "LIBRE_DISPONIBLE",
        notes: "Habilitada para Examen Final Libre / Suficiencia"
    },

    // ==========================================
    // NIVEL III (3° Año — 9 Asignaturas Obligatorias | 31 hs/sem)
    // ==========================================
    {
        id: 17,
        level: 3,
        code: "CYP",
        name: "Costos y Presupuestos",
        weeklyHours: 3,
        regime: "Anual",
        area: "Economía y Gestión",
        isIntegrator: false,
        cursadasParaCursar: [10, 14],
        aprobadasParaCursar: [1, 4, 5, 7, 8],
        aprobadasParaRendir: [1, 4, 5, 7, 8, 10, 14],
        notes: "Requiere cursada de Adm. General y Economía; aprobadas AMI, Info I, Pens. Sist., Álgebra, IyS"
    },
    {
        id: 18,
        level: 3,
        code: "EDT",
        name: "Estudio del Trabajo",
        subtitle: "Integradora III",
        weeklyHours: 4,
        regime: "Anual",
        area: "Integradora / Operaciones",
        isIntegrator: true,
        cursadasParaCursar: [3, 10, 11],
        aprobadasParaCursar: [1, 3, 4, 5, 7, 8],
        aprobadasParaRendir: [1, 3, 4, 5, 7, 8, 10, 11],
        notes: "Asignatura eje central de producción y tiempos"
    },
    {
        id: 19,
        level: 3,
        code: "COM",
        name: "Comercialización",
        weeklyHours: 3,
        regime: "Anual",
        area: "Gestión y Marketing",
        isIntegrator: false,
        cursadasParaCursar: [10, 11, 14],
        aprobadasParaCursar: [1, 4, 5, 7, 8],
        aprobadasParaRendir: [1, 4, 5, 7, 8, 10, 11, 14],
        notes: "Requiere cursada de Adm. General, Probabilidad y Economía"
    },
    {
        id: 20,
        level: 3,
        code: "TYM",
        name: "Termodinámica y Máquinas Térmicas",
        weeklyHours: 4,
        regime: "Anual",
        area: "Tecnologías Básicas",
        isIntegrator: false,
        cursadasParaCursar: [2, 13],
        aprobadasParaCursar: [1, 6],
        aprobadasParaRendir: [1, 2, 6, 13],
        notes: "Requiere cursada de Química y Física II; aprobadas Análisis I y Física I"
    },
    {
        id: 21,
        level: 3,
        code: "ERM",
        name: "Estática y Resistencia de Materiales",
        weeklyHours: 4,
        regime: "Anual",
        area: "Tecnologías Básicas",
        isIntegrator: false,
        cursadasParaCursar: [9, 12],
        aprobadasParaCursar: [1, 2, 6, 7],
        aprobadasParaRendir: [1, 2, 6, 7, 9, 12],
        notes: "Requiere cursada de Análisis II y Ciencia de Materiales"
    },
    {
        id: 22,
        level: 3,
        code: "MDF",
        name: "Mecánica de los Fluidos",
        weeklyHours: 3,
        regime: "Anual",
        area: "Tecnologías Básicas",
        isIntegrator: false,
        cursadasParaCursar: [9],
        aprobadasParaCursar: [1, 6, 7],
        aprobadasParaRendir: [1, 6, 7, 9],
        notes: "Requiere cursada de Análisis II; aprobadas Análisis I, Física I y Álgebra"
    },
    {
        id: 23,
        level: 3,
        code: "EDE",
        name: "Economía de la Empresa",
        weeklyHours: 3,
        regime: "Anual",
        area: "Economía y Gestión",
        isIntegrator: false,
        cursadasParaCursar: [10, 14],
        aprobadasParaCursar: [1, 4, 5, 7, 8],
        aprobadasParaRendir: [1, 4, 5, 7, 8, 10, 14],
        notes: "Finanzas de empresas, flujos de caja y análisis corporativo"
    },
    {
        id: 24,
        level: 3,
        code: "EME",
        name: "Electrotecnia y Máquinas Eléctricas",
        weeklyHours: 5,
        regime: "Anual",
        area: "Tecnologías Básicas",
        isIntegrator: false,
        cursadasParaCursar: [13],
        aprobadasParaCursar: [1, 6],
        aprobadasParaRendir: [1, 6, 13],
        notes: "Requiere cursada de Física II; aprobadas Análisis I y Física I"
    },
    {
        id: 25,
        level: 3,
        code: "ANCA",
        name: "Análisis Numérico y Cálculo Avanzado",
        weeklyHours: 2,
        regime: "Anual",
        area: "Ciencias Básicas",
        isIntegrator: false,
        cursadasParaCursar: [9],
        aprobadasParaCursar: [1, 7],
        aprobadasParaRendir: [1, 7, 9],
        notes: "Modelado numérico y aproximaciones en ingeniería"
    },

    // ==========================================
    // NIVEL IV (4° Año — 10 Asignaturas Obligatorias | 34 hs/sem)
    // ==========================================
    {
        id: 26,
        level: 4,
        code: "SHIA",
        name: "Seguridad, Higiene e Ing. Ambiental",
        weeklyHours: 3,
        regime: "Anual",
        area: "Tecnologías Aplicadas",
        isIntegrator: false,
        cursadasParaCursar: [18],
        aprobadasParaCursar: [10, 11],
        aprobadasParaRendir: [10, 11, 18],
        notes: "Requiere cursada de Estudio del Trabajo; aprobadas Adm. General y Probabilidad"
    },
    {
        id: 27,
        level: 4,
        code: "INVOP",
        name: "Investigación Operativa",
        weeklyHours: 4,
        regime: "Anual",
        area: "Operaciones y Optimización",
        isIntegrator: false,
        cursadasParaCursar: [9, 11, 25],
        aprobadasParaCursar: [1, 7, 25],
        aprobadasParaRendir: [1, 7, 9, 11, 25],
        notes: "Programación lineal, inventarios y simulación de colas"
    },
    {
        id: 28,
        level: 4,
        code: "PROIND",
        name: "Procesos Industriales",
        weeklyHours: 5,
        regime: "Anual",
        area: "Tecnologías Aplicadas",
        isIntegrator: false,
        cursadasParaCursar: [18, 20, 24],
        aprobadasParaCursar: [2, 10, 11, 13],
        aprobadasParaRendir: [2, 10, 11, 13, 18, 20, 24],
        notes: "Procesos de manufactura, metalurgia y transformación química"
    },
    {
        id: 29,
        level: 4,
        code: "MYM",
        name: "Mecánica y Mecanismos",
        weeklyHours: 3,
        regime: "Anual",
        area: "Tecnologías Básicas",
        isIntegrator: false,
        cursadasParaCursar: [9],
        aprobadasParaCursar: [1, 6, 7],
        aprobadasParaRendir: [1, 6, 7, 9],
        notes: "Cinemática y dinámica de mecanismos industriales"
    },
    {
        id: 30,
        level: 4,
        code: "EDP",
        name: "Evaluación de Proyectos",
        subtitle: "Integradora IV",
        weeklyHours: 5,
        regime: "Anual",
        area: "Integradora / Proyectos",
        isIntegrator: true,
        cursadasParaCursar: [17, 18, 19, 23],
        aprobadasParaCursar: [10, 11, 14, 16],
        aprobadasParaRendir: [10, 11, 14, 16, 17, 18, 19, 23],
        notes: "Estudio técnico-económico, VAN, TIR y formulación de proyectos"
    },
    {
        id: 31,
        level: 4,
        code: "PCP",
        name: "Planificación y Control de la Producción",
        weeklyHours: 4,
        regime: "Anual",
        area: "Operaciones y Logística",
        isIntegrator: false,
        cursadasParaCursar: [18],
        aprobadasParaCursar: [10, 11],
        aprobadasParaRendir: [10, 11, 18],
        notes: "MRP, MPS, lean manufacturing y programación de planta"
    },
    {
        id: 32,
        level: 4,
        code: "DDP",
        name: "Diseño del Producto",
        weeklyHours: 2,
        regime: "Anual",
        area: "Diseño e Innovación",
        isIntegrator: false,
        cursadasParaCursar: [15, 19],
        aprobadasParaCursar: [3, 4, 10, 11, 14],
        aprobadasParaRendir: [3, 4, 10, 11, 14, 15, 19],
        notes: "Ciclo de vida, prototipado CAD y diseño centrado en el usuario"
    },
    {
        id: 33,
        level: 4,
        code: "ING2",
        name: "Inglés II",
        weeklyHours: 2,
        regime: "Anual/Libre",
        area: "Idiomas",
        isIntegrator: false,
        cursadasParaCursar: [16],
        aprobadasParaCursar: [],
        aprobadasParaRendir: [16],
        defaultStatus: "LIBRE_DISPONIBLE",
        notes: "Habilitada para Examen Final Libre de comprensión técnica avanzada"
    },
    {
        id: 34,
        level: 4,
        code: "INSIND",
        name: "Instalaciones Industriales",
        weeklyHours: 3,
        regime: "Anual",
        area: "Tecnologías Aplicadas",
        isIntegrator: false,
        cursadasParaCursar: [20, 21, 22, 24],
        aprobadasParaCursar: [2, 9, 12, 13],
        aprobadasParaRendir: [2, 9, 12, 13, 20, 21, 22, 24],
        notes: "Vapor, aire comprimido, gas, energía y redes industriales"
    },
    {
        id: 35,
        level: 4,
        code: "LEG",
        name: "Legislación",
        weeklyHours: 2,
        regime: "Anual",
        area: "Complementarias / Legal",
        isIntegrator: false,
        cursadasParaCursar: [],
        aprobadasParaCursar: [10],
        aprobadasParaRendir: [10],
        notes: "Derecho laboral, societario y marco normativo de ingeniería"
    },

    // ==========================================
    // NIVEL V (5° Año — 7 Asignaturas Obligatorias | 33 hs/sem)
    // ==========================================
    {
        id: 36,
        level: 5,
        code: "MANT",
        name: "Mantenimiento",
        weeklyHours: 3,
        regime: "Cuatrimestral/Anual",
        area: "Tecnologías Aplicadas",
        isIntegrator: false,
        cursadasParaCursar: [34],
        aprobadasParaCursar: [20, 21, 24],
        aprobadasParaRendir: [20, 21, 24, 34],
        notes: "TPM, RCM, mantenimiento predictivo y confiabilidad"
    },
    {
        id: 37,
        level: 5,
        code: "MMDP",
        name: "Manejo de Materiales y Distr. de Plantas",
        weeklyHours: 3,
        regime: "Anual",
        area: "Operaciones y Logística",
        isIntegrator: false,
        cursadasParaCursar: [18, 29],
        aprobadasParaCursar: [9, 10, 21],
        aprobadasParaRendir: [9, 10, 18, 21, 29],
        notes: "Layout de planta, transportadores, AGVs y almacenes automáticos"
    },
    {
        id: 38,
        level: 5,
        code: "COMEX",
        name: "Comercio Exterior",
        weeklyHours: 3,
        regime: "Anual",
        area: "Gestión y Comercio",
        isIntegrator: false,
        cursadasParaCursar: [30],
        aprobadasParaCursar: [18, 19, 23],
        aprobadasParaRendir: [18, 19, 23, 30],
        notes: "Incoterms, regímenes aduaneros y logística global"
    },
    {
        id: 39,
        level: 5,
        code: "RELIND",
        name: "Relaciones Industriales",
        weeklyHours: 3,
        regime: "Anual",
        area: "Gestión y RRHH",
        isIntegrator: false,
        cursadasParaCursar: [18],
        aprobadasParaCursar: [10, 11],
        aprobadasParaRendir: [10, 11, 18],
        notes: "Gestión del talento humano, negociación colectiva y clima laboral"
    },
    {
        id: 40,
        level: 5,
        code: "INGCAL",
        name: "Ingeniería en Calidad",
        weeklyHours: 3,
        regime: "Anual",
        area: "Gestión y Calidad",
        isIntegrator: false,
        cursadasParaCursar: [18],
        aprobadasParaCursar: [10, 11],
        aprobadasParaRendir: [10, 11, 18],
        notes: "Normas ISO 9001, Seis Sigma, control estadístico y auditorías"
    },
    {
        id: 41,
        level: 5,
        code: "CDG",
        name: "Control de Gestión",
        weeklyHours: 3,
        regime: "Anual",
        area: "Economía y Gestión",
        isIntegrator: false,
        cursadasParaCursar: [17, 23],
        aprobadasParaCursar: [10, 14],
        aprobadasParaRendir: [10, 14, 17, 23],
        notes: "Balanced Scorecard, KPIs corporativos y tableros de control"
    },
    {
        id: 42,
        level: 5,
        code: "PF",
        name: "Proyecto Final",
        subtitle: "Integradora V",
        weeklyHours: 6,
        regime: "Anual",
        area: "Integradora Final",
        isIntegrator: true,
        cursadasParaCursar: [25, 26, 27, 28, 30, 31],
        aprobadasParaCursar: [18, 19, 20, 21, 22, 23, 24, 33],
        aprobadasParaRendir: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
        notes: "Proyecto Integrador de Graduación: requiere todas las asignaturas previas"
    }
];

// Requisitos y nodos especiales
const UTN_SPECIAL_NODES = [
    {
        key: "TI",
        title: "Título Intermedio",
        name: "Técnico Universitario en Adm., Producción y Gestión Industrial",
        description: "Título intermedio oficial otorgado tras completar todas las asignaturas de 1° a 3° Nivel.",
        cursadasParaCursar: [10, 11, 14, 15],
        aprobadasParaCursar: [1, 3, 4, 5, 7, 8],
        requiredLevels: [1, 2, 3]
    },
    {
        key: "PPS",
        title: "Práctica Profesional Supervisada (PPS)",
        name: "200 Horas Reloj de Práctica en Empresa o Centro Tecnológico",
        description: "Requisito de graduación previo a la defensa del Proyecto Final.",
        cursadasParaCursar: [25, 26, 27, 28, 30, 31],
        aprobadasParaCursar: [18, 19, 20, 21, 22, 23, 24, 33]
    },
    {
        key: "ELEC",
        title: "Materias Electivas",
        name: "10 hs/sem Anuales (o 20 hs/sem Cuatrimestrales)",
        description: "Asignaturas optativas de especialización (ej. Ciencia de Datos, Logística Avanzada, Finanzas).",
        cursadasParaCursar: [],
        aprobadasParaCursar: []
    }
];

/**
 * Reglas de Correlatividades UTN:
 * Para cursar materia M:
 * - Cursadas requeridas: deben estar REGULAR o APROBADA.
 * - Aprobadas requeridas: deben estar APROBADA.
 *
 * Para rendir examen final:
 * - Todas las correlativas de cursada y aprobadas deben estar APROBADA.
 */
function evaluateSubjectUnlock(subject, statusMap) {
    const isSubjectDone = (id) => {
        const s = (statusMap && statusMap[id]) ? (statusMap[id].status || statusMap[id]) : null;
        return s === 'APROBADA';
    };

    const isSubjectSignedOrDone = (id) => {
        const s = (statusMap && statusMap[id]) ? (statusMap[id].status || statusMap[id]) : null;
        return s === 'REGULAR' || s === 'APROBADA';
    };

    const missingCursadas = (subject.cursadasParaCursar || []).filter(id => !isSubjectSignedOrDone(id));
    const missingAprobadasCursar = (subject.aprobadasParaCursar || []).filter(id => !isSubjectDone(id));
    const missingAprobadasRendir = (subject.aprobadasParaRendir || []).filter(id => !isSubjectDone(id));

    const canEnroll = missingCursadas.length === 0 && missingAprobadasCursar.length === 0;
    const canTakeFinal = canEnroll && missingAprobadasRendir.length === 0;

    return {
        canEnroll,
        canTakeFinal,
        missingCursadas,
        missingAprobadasCursar,
        missingAprobadasRendir
    };
}

/**
 * Calcula el estado dinámico resultante de un nodo
 */
function getEffectiveSubjectStatus(subject, statusMap) {
    const userEntry = statusMap && statusMap[subject.id];
    const explicitStatus = userEntry ? (typeof userEntry === 'string' ? userEntry : userEntry.status) : null;

    if (explicitStatus && ['APROBADA', 'REGULAR', 'CURSANDO', 'LIBRE_DISPONIBLE'].includes(explicitStatus)) {
        return explicitStatus;
    }

    if (subject.id === 16 || subject.id === 33) {
        return 'LIBRE_DISPONIBLE';
    }

    const { canEnroll } = evaluateSubjectUnlock(subject, statusMap);
    return canEnroll ? 'DISPONIBLE' : 'BLOQUEADA';
}

/**
 * Devuelve todos los IDs que son requisitos directos de una materia
 */
function getSubjectPrerequisiteIds(subjectId) {
    const subj = UTN_INDUSTRIAL_PLAN.find(s => s.id === subjectId);
    if (!subj) return [];
    const set = new Set([
        ...(subj.cursadasParaCursar || []),
        ...(subj.aprobadasParaCursar || []),
        ...(subj.aprobadasParaRendir || [])
    ]);
    return Array.from(set);
}

/**
 * Devuelve todos los IDs de materias que requieren a esta materia como correlativa
 */
function getSubjectDependentIds(subjectId) {
    return UTN_INDUSTRIAL_PLAN
        .filter(s => {
            const reqs = [
                ...(s.cursadasParaCursar || []),
                ...(s.aprobadasParaCursar || []),
                ...(s.aprobadasParaRendir || [])
            ];
            return reqs.includes(subjectId);
        })
        .map(s => s.id);
}
