// (El endpoint /api/_stats/integridad se registra más abajo una vez creado 'app')
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// __dirname en ESM (compatible Windows/Linux)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Polyfill fetch (por si el runtime es < Node 18 en Render)
let fetchFn = globalThis.fetch;
if (!fetchFn) {
    try {
        const mod = await import('node-fetch');
        fetchFn = mod.default;
        globalThis.fetch = fetchFn;
    } catch (e) {
        console.warn('No se pudo cargar node-fetch, geolocalización deshabilitada:', e.message);
    }
}
import { config } from './config/index.js';
import { actualizarDatosClima } from './services/weatherService.js';
import predictionRoutes from './routes/predictionRoutes.js';
import validationRoutes from './routes/validationRoutes.js';
import currentWeatherRoutes from './routes/currentWeatherRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './controllers/authController.js';

// --- VALIDACIÓN DE APIS ---
if (!config.apiKeys.openWeather || !config.apiKeys.accuweather) {
    console.error("FATAL ERROR: Revisa tus claves de API en el archivo .env y en config/index.js");
    process.exit(1);
}

const app = express();

// Middleware para parsear JSON y formularios (requerido para /api/auth/login)
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas de salud tempranas para diagnóstico (deben responder 200 siempre si el proceso está vivo)
app.get('/ping', (req,res)=>{
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.type('text/plain').send('pong');
});
app.get('/', (req,res)=>{
    const origin = req.headers.origin;
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
    else { res.setHeader('Access-Control-Allow-Origin','*'); }
    res.json({ ok:true, root:true, time: new Date().toISOString() });
});

// Fallback global para cualquier preflight OPTIONS (si algo no lo capturó antes)
app.use((req,res,next)=>{
    if (req.method === 'OPTIONS') {
        const origin = req.headers.origin;
        if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
        else { res.setHeader('Access-Control-Allow-Origin','*'); }
        const reqHeaders = req.headers['access-control-request-headers'] || 'Content-Type, Authorization';
        res.setHeader('Access-Control-Allow-Headers', reqHeaders);
        res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Max-Age','600');
        return res.sendStatus(204);
    }
    next();
});

// --- DIAGNÓSTICO / BUILD ID ---
const APP_BUILD_ID = new Date().toISOString();
console.log('[BOOT] APP_BUILD_ID=%s', APP_BUILD_ID);

// CORS ultra simple (permitir todo) como capa base para eliminar dudas (se mantiene lógica específica más abajo)
app.use((req,res,next)=>{
    const origin = req.headers.origin;
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
    else { res.setHeader('Access-Control-Allow-Origin','*'); }
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
    next();
});

// Logger simple
app.use((req,res,next)=>{ console.log('[REQ]', req.method, req.path); next(); });

// ================= VISITAS SIMPLE (IN-MEMORIA) =================
// Cuenta total y "únicos" (IP+UA) por día. No persiste en disco para mantenerlo liviano.
// VERSIONADO para poder validar despliegues.
const STATS_VERSION = '2.3.0'; // 2.3.0 -> contadores acumulados (sin reset) + persistencia día en curso
// === PERSISTENCIA DE VISITAS ===
const HIST_PATH = path.join(__dirname, 'visitas-historico.json');
const CURRENT_PATH = path.join(__dirname, 'visitas-current.json');
function leerHistorico() {
    try {
        return JSON.parse(fs.readFileSync(HIST_PATH, 'utf8'));
    } catch { return { historico: {} }; }
}
function guardarHistorico(historico) {
    try {
        fs.writeFileSync(HIST_PATH, JSON.stringify(historico, null, 2));
    } catch {}
}

const visitas = { fecha: null, total: 0, unicos: 0, claves: new Set(), rutas: {} };
// Contadores globales (no se resetean) para "no quiero reset diario"
const acumulado = { total: 0, unicos: 0, claves: new Set() };
// Contador específico de visitantes del sitio (beacon) separado de las llamadas API técnicas
const beacon = { fecha: null, total: 0, unicos: 0, claves: new Set() };
// Geolocalización (por ciudad / país)
const geo = { fecha: null, porCiudad: {}, porPais: {}, uniqueCiudad: {}, uniquePais: {}, keysCiudad: {}, keysPais: {} };
const geoCache = new Map();
const GEO_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const GEO_PROVIDER = process.env.GEO_PROVIDER || 'ip-api'; // ip-api | ipapi | ipwhois

function cargarDiaActualPersistido() {
    try {
        if (!fs.existsSync(CURRENT_PATH)) return;
        const snap = JSON.parse(fs.readFileSync(CURRENT_PATH,'utf8'));
        const hoy = new Date().toISOString().slice(0,10);
        if (snap.fecha === hoy) {
            visitas.fecha = snap.fecha; visitas.total = snap.total||0; visitas.unicos = snap.unicos||0; visitas.claves = new Set(snap.claves||[]); visitas.rutas = snap.rutas||{};
            beacon.fecha = snap.beacon?.fecha || hoy; beacon.total = snap.beacon?.total||0; beacon.unicos = snap.beacon?.unicos||0; beacon.claves = new Set(snap.beacon?.claves||[]);
            geo.fecha = snap.geo?.fecha || hoy; geo.porCiudad = snap.geo?.porCiudad||{}; geo.porPais = snap.geo?.porPais||{}; geo.uniqueCiudad = snap.geo?.uniqueCiudad||{}; geo.uniquePais = snap.geo?.uniquePais||{};
            acumulado.total = snap.acumulado?.total || acumulado.total;
            acumulado.unicos = snap.acumulado?.unicos || acumulado.unicos;
            if (snap.acumulado?.claves) acumulado.claves = new Set(snap.acumulado.claves);
            console.log('[STATS] Día restaurado desde visitas-current.json (incluye acumulado)');
        }
    } catch(e){ console.warn('[STATS] No se pudo restaurar día actual:', e.message); }
}

let persistTimer = null;
function persistirDiaActualDebounce() {
    if (persistTimer) return;
    persistTimer = setTimeout(()=>{
        persistTimer = null;
        try {
            if (!visitas.fecha) return;
            const snap = {
                fecha: visitas.fecha,
                total: visitas.total,
                unicos: visitas.unicos,
                claves: [...visitas.claves],
                rutas: visitas.rutas,
                beacon: { fecha: beacon.fecha, total: beacon.total, unicos: beacon.unicos, claves: [...beacon.claves] },
                geo: { fecha: geo.fecha, porCiudad: geo.porCiudad, porPais: geo.porPais, uniqueCiudad: geo.uniqueCiudad, uniquePais: geo.uniquePais },
                acumulado: { total: acumulado.total, unicos: acumulado.unicos, claves: [...acumulado.claves] }
            };
            fs.writeFileSync(CURRENT_PATH, JSON.stringify(snap,null,2));
        } catch(e){ console.warn('[STATS] Persistencia falló:', e.message); }
    }, 3000);
}

async function procesarGeo(ipRaw) {
    try {
        const ip = ipRaw === '::1' ? '127.0.0.1' : ipRaw;
        if (!ip) return;
        let city = '', country = '';
        const now = Date.now();
        const cached = geoCache.get(ip);
        if (cached && (now - cached.ts) < GEO_CACHE_TTL_MS) ({ city, country } = cached);
        else if (!ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168') && ip !== '::1') {
            let url;
            if (GEO_PROVIDER === 'ipapi') url = `https://ipapi.co/${ip}/json/`;
            else if (GEO_PROVIDER === 'ipwhois') url = `https://ipwho.is/${ip}`;
            else url = `http://ip-api.com/json/${ip}?fields=status,country,city`;
            const resp = fetchFn ? await fetchFn(url) : null;
            if (resp && resp.ok) {
                const data = await resp.json();
                if (GEO_PROVIDER === 'ipapi') { country = data.country_name || data.country || ''; city = data.city || ''; }
                else if (GEO_PROVIDER === 'ipwhois') { if (data.success !== false) { country = data.country || ''; city = data.city || ''; } }
                else if (data.status === 'success') { country = data.country || ''; city = data.city || ''; }
                geoCache.set(ip, { city, country, ts: now });
            }
        }
        if (!country) country = 'Desconocido'; if (!city) city = 'Desconocido';
        geo.porCiudad[city] = (geo.porCiudad[city] || 0) + 1;
        geo.porPais[country] = (geo.porPais[country] || 0) + 1;
        if (!geo.keysCiudad[city]) geo.keysCiudad[city] = new Set();
        if (!geo.keysPais[country]) geo.keysPais[country] = new Set();
        if (!geo.keysCiudad[city].has(ip)) { geo.keysCiudad[city].add(ip); geo.uniqueCiudad[city] = (geo.uniqueCiudad[city] || 0) + 1; }
        if (!geo.keysPais[country].has(ip)) { geo.keysPais[country].add(ip); geo.uniquePais[country] = (geo.uniquePais[country] || 0) + 1; }
        persistirDiaActualDebounce();
    } catch {}
}

function resetSiNuevoDia() {
        const hoy = new Date().toISOString().slice(0,10);
        if (visitas.fecha !== hoy) {
                // Persistir el día anterior si hay datos
                if (visitas.fecha && visitas.total > 0) {
                    const historico = leerHistorico();
                    historico.historico[visitas.fecha] = {
                        total: visitas.total,
                        unicos: visitas.unicos,
                        rutas: visitas.rutas,
                        site: { hits: beacon.total, visitors: beacon.unicos },
                        geo: {
                            porCiudad: geo.porCiudad,
                            porPais: geo.porPais,
                            uniqueCiudad: geo.uniqueCiudad,
                            uniquePais: geo.uniquePais
                        }
                    };
                    guardarHistorico(historico);
                }
                visitas.fecha = hoy; visitas.total = 0; visitas.unicos = 0; visitas.claves = new Set(); visitas.rutas = {};
                try { if (fs.existsSync(CURRENT_PATH)) fs.unlinkSync(CURRENT_PATH); } catch{}
        }
        if (beacon.fecha !== hoy) { beacon.fecha = hoy; beacon.total = 0; beacon.unicos = 0; beacon.claves = new Set(); }
        if (geo.fecha !== hoy) { geo.fecha = hoy; geo.porCiudad = {}; geo.porPais = {}; geo.uniqueCiudad = {}; geo.uniquePais = {}; geo.keysCiudad = {}; geo.keysPais = {}; }
}
app.use((req, _res, next) => {
    // No contar endpoints internos / beacon para no inflar
    if (['/api/_stats/visitas', '/api/_stats/reset', '/api/visit-beacon'].includes(req.path)) return next();

    // Solo contar peticiones GET (evita dobles por CORS preflight OPTIONS)
    if (req.method === 'GET') {
        resetSiNuevoDia();
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const ua = (req.headers['user-agent'] || '').slice(0, 80); // ampliar un poco para distinguir navegadores
        const clave = ip + '|' + ua;
    visitas.total += 1;
    acumulado.total += 1;
        let nuevoUnico = false;
    if (!visitas.claves.has(clave)) { visitas.claves.add(clave); visitas.unicos += 1; nuevoUnico = true; }
    if (!acumulado.claves.has(clave)) { acumulado.claves.add(clave); acumulado.unicos += 1; }
        visitas.rutas[req.path] = (visitas.rutas[req.path] || 0) + 1;
    if (nuevoUnico) { setImmediate(()=>procesarGeo(ip)); }
    persistirDiaActualDebounce();
    }
    next();
});

// Endpoint protegido con token en header x-admin-token (configura ADMIN_TOKEN en Render)
// Preflight específico (antes del GET) para asegurar cabeceras aun si el middleware global está después
app.options('/api/_stats/visitas', (req,res)=>{
    console.log('[STATS][PRELIGHT] OPTIONS from origin=%s headers=%s', req.headers.origin, req.headers['access-control-request-headers']);
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Admin-Token');
    res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
    res.setHeader('Access-Control-Max-Age','600');
    return res.sendStatus(204);
});

app.get('/api/_stats/visitas', requireAuth, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Admin-Token');
    res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
    console.log('[STATS] hit /api/_stats/visitas origin=%s ua=%s', req.headers.origin, (req.headers['user-agent']||'').slice(0,40));
    const historico = leerHistorico();
    historico.historico[visitas.fecha] = {
        total: visitas.total,
        unicos: visitas.unicos,
        rutas: visitas.rutas,
        site: { hits: beacon.total, visitors: beacon.unicos },
        geo: {
            porCiudad: geo.porCiudad,
            porPais: geo.porPais,
            uniqueCiudad: geo.uniqueCiudad,
            uniquePais: geo.uniquePais
        }
    };
    const porMes = {};
    let totalVisitas = 0, totalUnicos = 0;
    for (const [fecha, datos] of Object.entries(historico.historico)) {
        const mes = fecha.slice(0,7);
        if (!porMes[mes]) porMes[mes] = { total: 0, unicos: 0 };
        porMes[mes].total += datos.total || 0;
        porMes[mes].unicos += datos.unicos || 0;
        totalVisitas += datos.total || 0;
        totalUnicos += datos.unicos || 0;
    }
    const geoHoy = { porCiudad: geo.porCiudad, porPais: geo.porPais, uniqueCiudad: geo.uniqueCiudad, uniquePais: geo.uniquePais };
    const geoHistorico = { porCiudad: {}, porPais: {}, uniqueCiudad: {}, uniquePais: {} };
    for (const datosDia of Object.values(historico.historico)) {
        if (datosDia.geo) {
            for (const [c, v] of Object.entries(datosDia.geo.porCiudad || {})) geoHistorico.porCiudad[c] = (geoHistorico.porCiudad[c] || 0) + v;
            for (const [p, v] of Object.entries(datosDia.geo.porPais || {})) geoHistorico.porPais[p] = (geoHistorico.porPais[p] || 0) + v;
            for (const [c, v] of Object.entries(datosDia.geo.uniqueCiudad || {})) geoHistorico.uniqueCiudad[c] = (geoHistorico.uniqueCiudad[c] || 0) + v;
            for (const [p, v] of Object.entries(datosDia.geo.uniquePais || {})) geoHistorico.uniquePais[p] = (geoHistorico.uniquePais[p] || 0) + v;
        }
    }
    res.json({
        version: STATS_VERSION,
        fecha: visitas.fecha,
        total: visitas.total,
        unicos: visitas.unicos,
        rutas: visitas.rutas,
        siteVisitorsHoy: beacon.unicos,
        siteHitsHoy: beacon.total,
        excluyeSelf: true,
        historico: historico.historico,
        porMes,
        totales: { total: totalVisitas, unicos: totalUnicos },
        acumulado: { total: acumulado.total, unicos: acumulado.unicos },
        geoHoy,
        geoHistorico,
        nota: 'POST /api/_stats/reset para reiniciar (protegido)'
    });
});

// Reset manual (POST) para pruebas. Protegido.
app.post('/api/_stats/reset', requireAuth, (req, res) => {
    visitas.fecha = null; // forzar reset próximo GET contado
    resetSiNuevoDia();
    res.json({ ok: true, mensaje: 'Estadísticas reseteadas', fecha: visitas.fecha });
});

// Beacon de visita del sitio: se llama una sola vez por visitante/día desde el frontend.
app.post('/api/visit-beacon', async (req, res) => {
    resetSiNuevoDia();
    const ipRaw = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const ua = (req.headers['user-agent'] || '').slice(0, 120);
    const clave = ipRaw + '|' + ua;
    beacon.total += 1;
    let nuevo = false;
    if (!beacon.claves.has(clave)) { beacon.claves.add(clave); beacon.unicos += 1; nuevo = true; }
    await procesarGeo(ipRaw);
    // Buscar último city/country del cache para devolver
    const ipCanon = ipRaw === '::1' ? '127.0.0.1' : ipRaw;
    const cached = geoCache.get(ipCanon) || {};
    res.json({ ok: true, nuevo, fecha: beacon.fecha, city: cached.city || 'Desconocido', country: cached.country || 'Desconocido' });
});
// ===============================================================

// Configuración de CORS para producción
const allowedStaticOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:5500',
    'https://predictor-yacuvina.vercel.app',
    'https://sherman95.github.io' // GitHub Pages dashboard externo
];
const corsOptions = {
    origin: function(origin, callback) {
        if (!origin) { return callback(null, true); }
        // Permitir cualquier puerto localhost / 127.0.0.1 para desarrollo
        if (
            allowedStaticOrigins.includes(origin) ||
            /https:\/\/.*\.vercel\.app$/.test(origin) ||
            /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)
        ) {
            return callback(null, true);
        }
        return callback(new Error('Origen no permitido por CORS: ' + origin));
    },
    credentials: true
};

// CORS estándar para la mayoría de rutas
app.use(cors(corsOptions));

// Respuesta genérica a cualquier preflight OPTIONS (evita 404 en rutas nuevas)
app.options('*', cors(corsOptions));

// CORS abierto específicamente para endpoint público de estadísticas (solo lectura)
app.use((req,res,next)=>{
    if (req.path === '/api/_stats/visitas') {
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Vary','Origin');
        } else {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Admin-Token');
        res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
    }
    next();
});

// --- RUTAS ---
// CORS abierto específico para autenticación (simplifica preflight desde cualquier localhost y dashboard externo)
app.use('/api/auth', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
    else { res.setHeader('Access-Control-Allow-Origin','*'); }
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// Handler explícito OPTIONS para /api/auth/login (debug)
app.options('/api/auth/login', (req,res)=>{
    const origin = req.headers.origin;
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
    else { res.setHeader('Access-Control-Allow-Origin','*'); }
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
    res.setHeader('Access-Control-Max-Age','600');
    console.log('[CORS][AUTH] Preflight /api/auth/login origin=%s headers=%s', origin, req.headers['access-control-request-headers']);
    return res.sendStatus(204);
});

app.use('/api/prediccion', predictionRoutes);
app.use('/api/validacion', validationRoutes);
app.use('/api', currentWeatherRoutes); // 🌤️ Nueva ruta para clima actual
app.use('/api/debug', debugRoutes); // 🔍 Rutas de debugging
app.use('/api/auth', authRoutes); // 🔐 JWT Auth

// Endpoint de verificación de integridad de visitas (registrado tras crear 'app')
app.get('/api/_stats/integridad', requireAuth, (req, res) => {
    if (process.env.ADMIN_TOKEN && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    let historico, advertencias = [], ok = true;
    try {
        historico = leerHistorico();
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'No se pudo leer visitas-historico.json', detalle: e.message });
    }
    let total = 0, unicos = 0, dias = 0, duplicados = [];
    const diasVistos = new Set();
    for (const [fecha, datos] of Object.entries(historico.historico)) {
        if (diasVistos.has(fecha)) { duplicados.push(fecha); }
        diasVistos.add(fecha);
        if (!datos || typeof datos.total !== 'number' || typeof datos.unicos !== 'number') {
            advertencias.push(`Día ${fecha} tiene datos corruptos o incompletos.`);
            ok = false;
            continue;
        }
        total += datos.total;
        unicos += datos.unicos;
        dias++;
    }
    if (duplicados.length > 0) { advertencias.push('Fechas duplicadas: ' + duplicados.join(', ')); ok = false; }
    const endpointTotales = { total, unicos };
    res.json({ ok, advertencias, dias, total, unicos, endpointTotales, ejemploDia: Object.entries(historico.historico)[0], nota: 'Si advertencias está vacío y ok=true, la integridad es correcta.' });
});

// --- INICIO DEL SERVIDOR Y TAREAS PROGRAMADAS ---
// Endpoint raíz de salud (antes de listen)
app.get('/', (req, res) => {
    const origin = req.headers.origin;
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
    else { res.setHeader('Access-Control-Allow-Origin','*'); }
    res.json({ ok:true, service:'predictor-yacuvina-api', time: new Date().toISOString() });
});

app.get('/__info', (req,res)=>{
    res.json({ ok:true, build: APP_BUILD_ID, env:{ node: process.version, port: config.port, mode: config.environment }, routes: Object.keys(app._router.stack).length });
});

app.listen(config.port, () => {
    console.log(`✅ Servidor corriendo en el puerto ${config.port}`);
    console.log(`🌤️ Clima actual disponible en: http://localhost:${config.port}/api/current-weather`);
    // Restaurar día actual si existe
    cargarDiaActualPersistido();

    // Ejecuta la actualización una vez al iniciar.
    actualizarDatosClima();

    // Programa la tarea para cada hora (cada 30 min real: 0/30).
    cron.schedule('0/30 * * * *', actualizarDatosClima);

    console.log("🕒 Tarea de actualización de clima programada para ejecutarse cada hora.");
});

// Middleware de error final
app.use((err, req, res, _next) => {
    console.error('[ERROR]', err.stack || err.message);
    const origin = req.headers.origin;
    if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary','Origin'); }
    else { res.setHeader('Access-Control-Allow-Origin','*'); }
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.status(500).json({ ok:false, error:'internal', detail: err.message });
});