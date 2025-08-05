import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3001,
    latitud: -3.572854,
    longitud: -79.689287,
    pronosticoFilePath: './pronostico.json',
    accuweatherLocationKey: '122468',
    
    // 🌍 Configuración para entorno
    environment: process.env.NODE_ENV || 'development',
    
    apiKeys: {
        openWeather: process.env.OPENWEATHER_API_KEY,
        accuweather: process.env.ACCUWEATHER_API_KEY,
        weatherAPI: process.env.WEATHERAPI_KEY,
    },
    
    // ⏰ Configuración de zona horaria
    timezone: 'America/Guayaquil',
    
    // 📊 Configuración de logging
    logLevel: process.env.LOG_LEVEL || 'info'
};