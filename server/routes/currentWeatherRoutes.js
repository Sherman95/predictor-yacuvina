import express from 'express';
import { 
    obtenerClimaActual, 
    limpiarCacheClima, 
    obtenerEstadisticasCache 
} from '../services/currentWeatherService.js';

const router = express.Router();

/**
 * 🌤️ GET /api/current-weather
 * Obtener clima actual de Yacuviña con sistema de caché inteligente
 */
router.get('/current-weather', async (req, res) => {
    try {
        const startTime = Date.now();
        const climaActual = await obtenerClimaActual();
        const responseTime = Date.now() - startTime;
        
        res.json({
            success: true,
            data: climaActual,
            meta: {
                responseTime: `${responseTime}ms`,
                timestamp: new Date().toISOString(),
                location: 'Yacuviña, Ecuador',
                coordinates: {
                    lat: -3.572854,
                    lon: -79.689287
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Error en /current-weather:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al obtener el clima actual',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 🔄 POST /api/current-weather/refresh
 * Forzar actualización del clima actual (limpiar caché)
 */
router.post('/current-weather/refresh', async (req, res) => {
    try {
        const cacheCleared = await limpiarCacheClima();
        const climaActual = await obtenerClimaActual();
        
        res.json({
            success: true,
            message: 'Clima actualizado forzosamente',
            cacheCleared,
            data: climaActual,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en /current-weather/refresh:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el clima',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 📊 GET /api/current-weather/cache-stats
 * Obtener estadísticas del sistema de caché
 */
router.get('/current-weather/cache-stats', (req, res) => {
    try {
        const estadisticas = obtenerEstadisticasCache();
        
        res.json({
            success: true,
            data: {
                cache: estadisticas,
                info: {
                    cacheEsDe: '1 hora',
                    ubicacion: 'Yacuviña, Ecuador',
                    coordenadas: {
                        lat: -3.572854,
                        lon: -79.689287
                    }
                }
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en /current-weather/cache-stats:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas del caché',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * 🌡️ GET /api/current-weather/simple
 * Versión simplificada del clima actual (solo datos básicos)
 */
router.get('/current-weather/simple', async (req, res) => {
    try {
        const climaCompleto = await obtenerClimaActual();
        
        // Extraer solo los datos más importantes
        const climaSimple = {
            temperatura: climaCompleto.temperatura,
            descripcion: climaCompleto.descripcion,
            humedad: climaCompleto.humedad,
            viento: climaCompleto.velocidadViento,
            visibilidad: climaCompleto.visibilidad,
            nubosidad: climaCompleto.nubosidad,
            evaluacion: {
                categoria: climaCompleto.evaluacionYacuvina.categoria,
                puntuacion: climaCompleto.evaluacionYacuvina.puntuacion,
                recomendacion: climaCompleto.evaluacionYacuvina.recomendacion
            },
            ultimaActualizacion: climaCompleto.fechaLocal,
            proximaActualizacion: climaCompleto.proximaActualizacion
        };
        
        res.json({
            success: true,
            data: climaSimple,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error en /current-weather/simple:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Error al obtener el clima actual simplificado',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
