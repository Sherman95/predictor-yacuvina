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