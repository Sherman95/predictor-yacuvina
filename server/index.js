import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
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
const visitas = { fecha: null, total: 0, unicos: 0, claves: new Set(), rutas: {} };
function resetSiNuevoDia() {
    const hoy = new Date().toISOString().slice(0,10);
    if (visitas.fecha !== hoy) {
        visitas.fecha = hoy; visitas.total = 0; visitas.unicos = 0; visitas.claves = new Set(); visitas.rutas = {}; }
}
app.use((req, _res, next) => {
    // Solo contar peticiones GET (evita dobles por CORS preflight)
    if (req.method === 'GET') {
        resetSiNuevoDia();
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const ua = (req.headers['user-agent'] || '').slice(0,40);
        const clave = ip + '|' + ua;
        visitas.total += 1;
        if (!visitas.claves.has(clave)) { visitas.claves.add(clave); visitas.unicos += 1; }
        visitas.rutas[req.path] = (visitas.rutas[req.path] || 0) + 1;
    }
    next();
});

// Endpoint protegido con token en header x-admin-token (configura ADMIN_TOKEN en Render)
app.get('/api/_stats/visitas', (req, res) => {
    if (process.env.ADMIN_TOKEN && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    res.json({ fecha: visitas.fecha, total: visitas.total, unicos: visitas.unicos, rutas: visitas.rutas });
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
    allowedHeaders: ['Content-Type', 'Authorization']
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