import express from 'express';
import { config } from '../config/index.js';
import fs from 'fs';

const router = express.Router();

/**
 * 🔍 GET /api/debug/environment
 * Endpoint para debugging de diferencias entre entornos
 */
router.get('/environment', (req, res) => {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            environment: config.environment,
            port: config.port
        },
        config: {
            latitud: config.latitud,
            longitud: config.longitud,
            timezone: config.timezone,
            accuweatherLocationKey: config.accuweatherLocationKey
        },
        apiKeys: {
            openWeather: config.apiKeys.openWeather ? '✅ Configurada' : '❌ Falta',
            accuweather: config.apiKeys.accuweather ? '✅ Configurada' : '❌ Falta',
            weatherAPI: config.apiKeys.weatherAPI ? '✅ Configurada' : '❌ Falta'
        },
        filesystem: {
            pronosticoExists: fs.existsSync(config.pronosticoFilePath),
            cacheExists: fs.existsSync('./current-weather-cache.json')
        },
        serverTime: {
            local: new Date().toLocaleString(),
            utc: new Date().toISOString(),
            ecuador: new Date().toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
        }
    };
    
    res.json({
        success: true,
        debug: debugInfo,
        message: "Información de debugging para comparar entornos"
    });
});

/**
 * 🔄 GET /api/debug/fresh-data
 * Obtener datos frescos sin caché para comparación
 */
router.get('/fresh-data', async (req, res) => {
    try {
        // Importar dinámicamente para evitar problemas de módulos
        const { actualizarDatosClima } = await import('../services/weatherService.js');
        const { obtenerClimaActual } = await import('../services/currentWeatherService.js');
        
        // Forzar actualización
        await actualizarDatosClima();
        
        // Leer datos recién generados
        const fs = await import('fs/promises');
        const pronosticoData = JSON.parse(await fs.readFile(config.pronosticoFilePath, 'utf8'));
        const climaActual = await obtenerClimaActual();
        
        res.json({
            success: true,
            freshData: {
                generatedAt: new Date().toISOString(),
                forecast: pronosticoData,
                currentWeather: climaActual
            },
            message: "Datos generados en tiempo real para comparación"
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: "Error al generar datos frescos"
        });
    }
});

/**
 * 🌐 GET /api/debug/api-test
 * Probar conectividad con APIs externas
 */
router.get('/api-test', async (req, res) => {
    const axios = (await import('axios')).default;
    const { latitud, longitud, apiKeys } = config;
    
    const tests = [
        {
            name: 'OpenWeather',
            url: `https://api.openweathermap.org/data/2.5/weather?lat=${latitud}&lon=${longitud}&appid=${apiKeys.openWeather}&units=metric`,
            key: apiKeys.openWeather
        },
        {
            name: 'AccuWeather',
            url: `http://dataservice.accuweather.com/currentconditions/v1/${config.accuweatherLocationKey}?apikey=${apiKeys.accuweather}&details=true`,
            key: apiKeys.accuweather
        },
        {
            name: 'OpenMeteo',
            url: `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&current_weather=true`,
            key: 'No requiere API key'
        }
    ];
    
    const results = await Promise.allSettled(
        tests.map(async (test) => {
            if (!test.key && test.name !== 'OpenMeteo') {
                return { name: test.name, status: 'error', error: 'API key no configurada' };
            }
            
            try {
                const response = await axios.get(test.url, { timeout: 5000 });
                return { 
                    name: test.name, 
                    status: 'success', 
                    responseTime: response.headers['x-response-time'] || 'N/A',
                    dataReceived: Object.keys(response.data).length > 0
                };
            } catch (error) {
                return { 
                    name: test.name, 
                    status: 'error', 
                    error: error.message 
                };
            }
        })
    );
    
    res.json({
        success: true,
        apiTests: results.map(r => r.value || r.reason),
        timestamp: new Date().toISOString()
    });
});

export default router;
