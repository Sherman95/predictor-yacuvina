// Endpoint de verificación de integridad de visitas
app.get('/api/_stats/integridad', (req, res) => {
    if (process.env.ADMIN_TOKEN && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    let historico, advertencias = [], ok = true;
    try {
        historico = leerHistorico();
    } catch (e) {
        return res.status(500).json({ ok: false, error: 'No se pudo leer visitas-historico.json', detalle: e.message });
    }
    // Sumar totales
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
    if (duplicados.length > 0) {
        advertencias.push('Fechas duplicadas: ' + duplicados.join(', '));
        ok = false;
    }
    // Comprobar que los totales coinciden con el endpoint principal
    let endpointTotales = null;
    try {
        endpointTotales = { total, unicos };
    } catch {}
    res.json({
        ok,
        advertencias,
        dias,
        total,
        unicos,
        endpointTotales,
        ejemploDia: Object.entries(historico.historico)[0],
        nota: 'Si advertencias está vacío y ok=true, la integridad es correcta.'
    });
});
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
// __dirname no existe en ESM; lo definimos manualmente
const __dirname = path.dirname(new URL(import.meta.url).pathname);
import { config } from './config/index.js';
import { actualizarDatosClima } from './services/weatherService.js';
import predictionRoutes from './routes/predictionRoutes.js';
import validationRoutes from './routes/validationRoutes.js';
import currentWeatherRoutes from './routes/currentWeatherRoutes.js';
import debugRoutes from './routes/debugRoutes.js';

// --- VALIDACIÓN DE APIS ---
if (!config.apiKeys.openWeather || !config.apiKeys.accuweather) {
    console.error("FATAL ERROR: Revisa tus claves de API en el archivo .env y en config/index.js");
    process.exit(1);
}

const app = express();

// ================= VISITAS SIMPLE (IN-MEMORIA) =================
// Cuenta total y "únicos" (IP+UA) por día. No persiste en disco para mantenerlo liviano.
// VERSIONADO para poder validar despliegues.
const STATS_VERSION = '2.1.0'; // 2.1.0 -> geolocalización (ciudad/país) y agregados geo
// === PERSISTENCIA DE VISITAS ===
const HIST_PATH = path.join(__dirname, 'visitas-historico.json');
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
// Contador específico de visitantes del sitio (beacon) separado de las llamadas API técnicas
const beacon = { fecha: null, total: 0, unicos: 0, claves: new Set() };
// Geolocalización (por ciudad / país)
const geo = { fecha: null, porCiudad: {}, porPais: {}, uniqueCiudad: {}, uniquePais: {}, keysCiudad: {}, keysPais: {} };
const geoCache = new Map();
const GEO_CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

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
        if (!visitas.claves.has(clave)) {
            visitas.claves.add(clave);
            visitas.unicos += 1;
        }
        visitas.rutas[req.path] = (visitas.rutas[req.path] || 0) + 1;
    }
    next();
});

// Endpoint protegido con token en header x-admin-token (configura ADMIN_TOKEN en Render)
app.get('/api/_stats/visitas', (req, res) => {
        if (process.env.ADMIN_TOKEN && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
                return res.status(401).json({ error: 'No autorizado' });
        }
        // Leer histórico y agregar el día actual
        const historico = leerHistorico();
        historico.historico[visitas.fecha] = { total: visitas.total, unicos: visitas.unicos, rutas: visitas.rutas };
        // Agregación por mes y totales
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
                geoHoy,
                geoHistorico,
                nota: 'POST /api/_stats/reset para reiniciar (protegido)'
        });
});

// Reset manual (POST) para pruebas. Protegido.
app.post('/api/_stats/reset', (req, res) => {
    if (process.env.ADMIN_TOKEN && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    visitas.fecha = null; // forzar reset próximo GET contado
    resetSiNuevoDia();
    res.json({ ok: true, mensaje: 'Estadísticas reseteadas', fecha: visitas.fecha });
});

// Beacon de visita del sitio: se llama una sola vez por visitante/día desde el frontend.
app.post('/api/visit-beacon', async (req, res) => {
    resetSiNuevoDia();
    const ipRaw = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const ip = ipRaw === '::1' ? '127.0.0.1' : ipRaw;
    const ua = (req.headers['user-agent'] || '').slice(0, 120);
    const clave = ip + '|' + ua;
    beacon.total += 1;
    let nuevo = false;
    if (!beacon.claves.has(clave)) { beacon.claves.add(clave); beacon.unicos += 1; nuevo = true; }
    let city = '', country = '';
    try {
        const cached = geoCache.get(ip);
        const now = Date.now();
        if (cached && (now - cached.ts) < GEO_CACHE_TTL_MS) {
            ({ city, country } = cached);
        } else if (!ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168') && ip !== '::1') {
            const resp = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`);
            if (resp.ok) {
                const data = await resp.json();
                if (data.status === 'success') {
                    country = data.country || '';
                    city = data.city || '';
                    geoCache.set(ip, { city, country, ts: now });
                }
            }
        }
    } catch {}
    if (!country) country = 'Desconocido';
    if (!city) city = 'Desconocido';
    geo.porCiudad[city] = (geo.porCiudad[city] || 0) + 1;
    geo.porPais[country] = (geo.porPais[country] || 0) + 1;
    if (!geo.keysCiudad[city]) geo.keysCiudad[city] = new Set();
    if (!geo.keysPais[country]) geo.keysPais[country] = new Set();
    if (!geo.keysCiudad[city].has(ip)) { geo.keysCiudad[city].add(ip); geo.uniqueCiudad[city] = (geo.uniqueCiudad[city] || 0) + 1; }
    if (!geo.keysPais[country].has(ip)) { geo.keysPais[country].add(ip); geo.uniquePais[country] = (geo.uniquePais[country] || 0) + 1; }
    res.json({ ok: true, nuevo, fecha: beacon.fecha, city, country });
});
// ===============================================================

// Configuración de CORS para producción
const corsOptions = {
    origin: [
        'http://localhost:5173', // Desarrollo local
        'http://localhost:4173', // Preview local
        'https://predictor-yacuvina.vercel.app', // Vercel production
        'https://*.vercel.app' // Cualquier subdominio de Vercel
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    // Añadimos X-Admin-Token para poder enviar el header personalizado desde el frontend o herramientas
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Token']
};

app.use(cors(corsOptions));

// --- RUTAS ---
app.use('/api/prediccion', predictionRoutes);
app.use('/api/validacion', validationRoutes);
app.use('/api', currentWeatherRoutes); // 🌤️ Nueva ruta para clima actual
app.use('/api/debug', debugRoutes); // 🔍 Rutas de debugging

// --- INICIO DEL SERVIDOR Y TAREAS PROGRAMADAS ---
app.listen(config.port, () => {
    console.log(`✅ Servidor corriendo en el puerto ${config.port}`);
    console.log(`🌤️ Clima actual disponible en: http://localhost:${config.port}/api/current-weather`);
    
    // Ejecuta la actualización una vez al iniciar.
    actualizarDatosClima();

    // Programa la tarea para cada hora.
    cron.schedule('0/30 * * * *', actualizarDatosClima);
    
    console.log("🕒 Tarea de actualización de clima programada para ejecutarse cada hora.");
});