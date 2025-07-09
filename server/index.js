import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { config } from './config/index.js';
import { actualizarDatosClima } from './services/weatherService.js';
import predictionRoutes from './routes/predictionRoutes.js';

// --- VALIDACIÓN DE APIS ---
if (!config.apiKeys.openWeather || !config.apiKeys.accuweather) {
    console.error("FATAL ERROR: Revisa tus claves de API en el archivo .env y en config/index.js");
    process.exit(1);
}

const app = express();
app.use(cors());

// --- RUTAS ---
app.use('/api/prediccion', predictionRoutes);

// --- INICIO DEL SERVIDOR Y TAREAS PROGRAMADAS ---
app.listen(config.port, () => {
    console.log(`✅ Servidor corriendo en el puerto ${config.port}`);
    
    // Ejecuta la actualización una vez al iniciar.
    actualizarDatosClima();

    // Programa la tarea para cada hora.
    cron.schedule('0 * * * *', actualizarDatosClima);
    
    console.log("🕒 Tarea de actualización de clima programada para ejecutarse cada hora.");
});