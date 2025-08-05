import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';

// =================================================================
// 🌤️ SERVICIO DE CLIMA ACTUAL YACUVIÑA - SISTEMA INTELIGENTE
// =================================================================

const CACHE_FILE = './current-weather-cache.json';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos

// Datos de caché en memoria
let weatherCache = {
    data: null,
    timestamp: 0,
    lastUpdate: null
};

/**
 * 🎯 Adaptador para OpenWeatherMap Current Weather API
 */
const adaptarOpenWeatherCurrent = (data) => {
    const weather = data.weather[0];
    const main = data.main;
    const wind = data.wind;
    const clouds = data.clouds;
    const visibility = data.visibility;
    
    return {
        temperatura: Math.round(main.temp),
        sensacionTermica: Math.round(main.feels_like),
        humedad: main.humidity,
        presion: main.pressure,
        visibilidad: Math.round(visibility / 1000 * 10) / 10, // km con 1 decimal
        
        // Viento
        velocidadViento: Math.round(wind.speed * 3.6), // m/s a km/h
        direccionViento: wind.deg,
        direccionVientoTexto: obtenerDireccionViento(wind.deg),
        
        // Nubes y condiciones
        nubosidad: clouds.all,
        condicionPrincipal: weather.main,
        descripcion: traducirDescripcion(weather.description),
        icono: weather.icon,
        
        // Datos adicionales
        coordenadas: {
            lat: data.coord.lat,
            lon: data.coord.lon
        },
        nombreLugar: data.name,
        pais: data.sys.country,
        zonaHoraria: data.timezone,
        
        // Metadatos
        fuente: 'OpenWeatherMap',
        timestamp: data.dt * 1000,
        fechaLocal: new Date(data.dt * 1000).toLocaleString('es-EC', { 
            timeZone: 'America/Guayaquil',
            dateStyle: 'medium',
            timeStyle: 'short'
        })
    };
};

/**
 * 🎯 Adaptador para WeatherAPI Current Weather
 */
const adaptarWeatherAPICurrent = (data) => {
    const current = data.current;
    const location = data.location;
    
    return {
        temperatura: Math.round(current.temp_c),
        sensacionTermica: Math.round(current.feelslike_c),
        humedad: current.humidity,
        presion: current.pressure_mb,
        visibilidad: current.vis_km,
        
        // Viento
        velocidadViento: Math.round(current.wind_kph),
        direccionViento: current.wind_degree,
        direccionVientoTexto: current.wind_dir,
        
        // Nubes y condiciones
        nubosidad: current.cloud,
        condicionPrincipal: current.condition.text,
        descripcion: current.condition.text,
        icono: current.condition.icon,
        
        // Datos adicionales
        coordenadas: {
            lat: location.lat,
            lon: location.lon
        },
        nombreLugar: location.name,
        region: location.region,
        pais: location.country,
        
        // Índices
        uvIndex: current.uv,
        
        // Metadatos
        fuente: 'WeatherAPI',
        timestamp: new Date(location.localtime).getTime(),
        fechaLocal: new Date(location.localtime).toLocaleString('es-EC', { 
            timeZone: 'America/Guayaquil',
            dateStyle: 'medium',
            timeStyle: 'short'
        })
    };
};

/**
 * 🌟 Obtener dirección del viento en texto
 */
const obtenerDireccionViento = (grados) => {
    const direcciones = [
        'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'
    ];
    const index = Math.round(grados / 22.5) % 16;
    return direcciones[index];
};

/**
 * 🌟 Traducir descripciones del clima al español
 */
const traducirDescripcion = (descripcion) => {
    const traducciones = {
        'clear sky': 'Cielo despejado',
        'few clouds': 'Pocas nubes',
        'scattered clouds': 'Nubes dispersas',
        'broken clouds': 'Nubes fragmentadas',
        'overcast clouds': 'Cielo nublado',
        'light rain': 'Lluvia ligera',
        'moderate rain': 'Lluvia moderada',
        'heavy rain': 'Lluvia intensa',
        'thunderstorm': 'Tormenta eléctrica',
        'snow': 'Nieve',
        'mist': 'Neblina',
        'fog': 'Niebla',
        'haze': 'Bruma'
    };
    
    return traducciones[descripcion.toLowerCase()] || descripcion;
};

/**
 * 🔥 Evaluar condiciones actuales para atardecer en Yacuviña
 */
const evaluarCondicionesActuales = (datos) => {
    let evaluacion = {
        puntuacion: 0,
        categoria: '',
        factoresPositivos: [],
        factoresNegativos: [],
        recomendacion: '',
        colorIndicador: ''
    };
    
    const { temperatura, humedad, visibilidad, nubosidad, velocidadViento, descripcion } = datos;
    
    // ===== EVALUACIÓN PARA YACUVIÑA =====
    
    // 🌡️ Temperatura (10 puntos máx)
    if (temperatura >= 12 && temperatura <= 18) {
        evaluacion.puntuacion += 10;
        evaluacion.factoresPositivos.push(`Temperatura ideal (${temperatura}°C)`);
    } else if (temperatura >= 8 && temperatura <= 22) {
        evaluacion.puntuacion += 7;
        evaluacion.factoresPositivos.push(`Temperatura aceptable (${temperatura}°C)`);
    } else {
        evaluacion.factoresNegativos.push(`Temperatura no ideal (${temperatura}°C)`);
    }
    
    // 👁️ Visibilidad (25 puntos máx) - CRÍTICO EN YACUVIÑA
    if (visibilidad >= 10) {
        evaluacion.puntuacion += 25;
        evaluacion.factoresPositivos.push(`Excelente visibilidad (${visibilidad} km)`);
    } else if (visibilidad >= 5) {
        evaluacion.puntuacion += 20;
        evaluacion.factoresPositivos.push(`Buena visibilidad (${visibilidad} km)`);
    } else if (visibilidad >= 2) {
        evaluacion.puntuacion += 10;
        evaluacion.factoresNegativos.push(`Visibilidad limitada (${visibilidad} km)`);
    } else {
        evaluacion.factoresNegativos.push(`Visibilidad muy reducida (${visibilidad} km)`);
    }
    
    // ☁️ Nubosidad (30 puntos máx)
    if (nubosidad <= 20) {
        evaluacion.puntuacion += 30;
        evaluacion.factoresPositivos.push(`Cielo despejado (${nubosidad}% nubes)`);
    } else if (nubosidad <= 40) {
        evaluacion.puntuacion += 25;
        evaluacion.factoresPositivos.push(`Pocas nubes (${nubosidad}%)`);
    } else if (nubosidad <= 70) {
        evaluacion.puntuacion += 15;
        evaluacion.factoresPositivos.push(`Parcialmente nublado (${nubosidad}%)`);
    } else if (nubosidad <= 85) {
        evaluacion.puntuacion += 5;
        evaluacion.factoresNegativos.push(`Muy nublado (${nubosidad}%)`);
    } else {
        evaluacion.factoresNegativos.push(`Cielo cubierto (${nubosidad}%)`);
    }
    
    // 💨 Viento (15 puntos máx)
    if (velocidadViento <= 15) {
        evaluacion.puntuacion += 15;
        evaluacion.factoresPositivos.push(`Viento suave (${velocidadViento} km/h)`);
    } else if (velocidadViento <= 25) {
        evaluacion.puntuacion += 10;
        evaluacion.factoresPositivos.push(`Viento moderado (${velocidadViento} km/h)`);
    } else if (velocidadViento <= 35) {
        evaluacion.puntuacion += 5;
        evaluacion.factoresNegativos.push(`Viento fuerte (${velocidadViento} km/h)`);
    } else {
        evaluacion.factoresNegativos.push(`Viento muy fuerte (${velocidadViento} km/h)`);
    }
    
    // 💧 Humedad (10 puntos máx)
    if (humedad <= 70) {
        evaluacion.puntuacion += 10;
        evaluacion.factoresPositivos.push(`Humedad baja (${humedad}%)`);
    } else if (humedad <= 85) {
        evaluacion.puntuacion += 7;
        evaluacion.factoresPositivos.push(`Humedad moderada (${humedad}%)`);
    } else {
        evaluacion.factoresNegativos.push(`Humedad alta (${humedad}%)`);
    }
    
    // ☔ Penalizaciones por lluvia/tormenta
    if (descripcion.toLowerCase().includes('lluvia') || descripcion.toLowerCase().includes('tormenta') || descripcion.toLowerCase().includes('rain') || descripcion.toLowerCase().includes('storm')) {
        evaluacion.puntuacion -= 40;
        evaluacion.factoresNegativos.push(`Precipitación activa: ${descripcion}`);
    }
    
    // Penalización por niebla/neblina
    if (descripcion.toLowerCase().includes('niebla') || descripcion.toLowerCase().includes('neblina') || descripcion.toLowerCase().includes('fog') || descripcion.toLowerCase().includes('mist')) {
        evaluacion.puntuacion -= 20;
        evaluacion.factoresNegativos.push(`Niebla/neblina presente: ${descripcion}`);
    }
    
    // Limitar puntuación entre 0-100
    evaluacion.puntuacion = Math.max(0, Math.min(100, evaluacion.puntuacion));
    
    // ===== CATEGORIZACIÓN =====
    if (evaluacion.puntuacion >= 80) {
        evaluacion.categoria = 'Excelente';
        evaluacion.recomendacion = '¡Condiciones perfectas para ver el atardecer en Yacuviña!';
        evaluacion.colorIndicador = '#4CAF50'; // Verde
    } else if (evaluacion.puntuacion >= 65) {
        evaluacion.categoria = 'Bueno';
        evaluacion.recomendacion = 'Muy buenas condiciones para el atardecer.';
        evaluacion.colorIndicador = '#8BC34A'; // Verde claro
    } else if (evaluacion.puntuacion >= 45) {
        evaluacion.categoria = 'Regular';
        evaluacion.recomendacion = 'Condiciones aceptables, pero no ideales.';
        evaluacion.colorIndicador = '#FF9800'; // Naranja
    } else if (evaluacion.puntuacion >= 25) {
        evaluacion.categoria = 'Malo';
        evaluacion.recomendacion = 'Condiciones no favorables para el atardecer.';
        evaluacion.colorIndicador = '#FF5722'; // Rojo naranja
    } else {
        evaluacion.categoria = 'Muy Malo';
        evaluacion.recomendacion = 'Condiciones muy desfavorables. No se recomienda la visita.';
        evaluacion.colorIndicador = '#F44336'; // Rojo
    }
    
    return evaluacion;
};

/**
 * 💾 Cargar caché desde archivo
 */
const cargarCache = async () => {
    try {
        const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
        const parsedCache = JSON.parse(cacheData);
        
        if (parsedCache && parsedCache.timestamp && parsedCache.data) {
            weatherCache = parsedCache;
            console.log(`✅ Caché de clima actual cargado desde archivo`);
            return true;
        }
    } catch (error) {
        console.log(`ℹ️ No se pudo cargar el caché: ${error.message}`);
    }
    return false;
};

/**
 * 💾 Guardar caché en archivo
 */
const guardarCache = async (data) => {
    try {
        const cacheToSave = {
            data,
            timestamp: Date.now(),
            lastUpdate: new Date().toISOString()
        };
        
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheToSave, null, 2));
        weatherCache = cacheToSave;
        console.log(`✅ Caché de clima actual guardado`);
    } catch (error) {
        console.error(`❌ Error al guardar caché: ${error.message}`);
    }
};

/**
 * 🌟 Verificar si el caché es válido
 */
const esCacheValido = () => {
    if (!weatherCache.data || !weatherCache.timestamp) {
        return false;
    }
    
    const ahora = Date.now();
    const tiempoTranscurrido = ahora - weatherCache.timestamp;
    
    return tiempoTranscurrido < CACHE_DURATION;
};

/**
 * 🌐 Obtener datos del clima actual de múltiples APIs
 */
const obtenerClimaActualAPIs = async () => {
    const { latitud, longitud, apiKeys } = config;
    
    // URLs de las APIs
    const urls = [
        {
            url: `https://api.openweathermap.org/data/2.5/weather?lat=${latitud}&lon=${longitud}&appid=${apiKeys.openWeather}&units=metric&lang=es`,
            adaptador: adaptarOpenWeatherCurrent,
            nombre: 'OpenWeatherMap'
        },
        {
            url: `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHERAPI_KEY}&q=${latitud},${longitud}&lang=es`,
            adaptador: adaptarWeatherAPICurrent,
            nombre: 'WeatherAPI'
        }
    ];
    
    console.log(`🌤️ Obteniendo clima actual de Yacuviña...`);
    
    // Intentar obtener datos de todas las APIs
    const resultados = await Promise.allSettled(
        urls.map(async ({ url, adaptador, nombre }) => {
            try {
                console.log(`📡 Consultando ${nombre}...`);
                const response = await axios.get(url, { timeout: 10000 });
                const datosAdaptados = adaptador(response.data);
                console.log(`✅ ${nombre}: Datos obtenidos correctamente`);
                return { ...datosAdaptados, api: nombre };
            } catch (error) {
                console.log(`❌ ${nombre}: ${error.message}`);
                throw error;
            }
        })
    );
    
    // Filtrar resultados exitosos
    const datosExitosos = resultados
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);
    
    if (datosExitosos.length === 0) {
        throw new Error('No se pudieron obtener datos de ninguna API');
    }
    
    // Usar el primer resultado exitoso como principal
    const datosPrincipales = datosExitosos[0];
    
    // Si hay múltiples fuentes, crear un promedio o usar la más confiable
    if (datosExitosos.length > 1) {
        console.log(`✅ Datos obtenidos de ${datosExitosos.length} fuentes`);
        // Podrías implementar lógica de promediado aquí si quisieras
    }
    
    return datosPrincipales;
};

/**
 * 🎯 FUNCIÓN PRINCIPAL: Obtener clima actual con caché inteligente
 */
export const obtenerClimaActual = async () => {
    const ahora = Date.now();
    const ahoraISO = new Date().toISOString();
    
    console.log(`\n🌟 [${ahoraISO}] Solicitud de clima actual de Yacuviña`);
    
    // Cargar caché si no está en memoria
    if (!weatherCache.data) {
        await cargarCache();
    }
    
    // Verificar si el caché es válido
    if (esCacheValido()) {
        const tiempoRestante = Math.round((CACHE_DURATION - (ahora - weatherCache.timestamp)) / 1000 / 60);
        console.log(`⚡ Usando datos del caché (actualiza en ${tiempoRestante} minutos)`);
        
        return {
            ...weatherCache.data,
            esCache: true,
            proximaActualizacion: new Date(weatherCache.timestamp + CACHE_DURATION).toLocaleTimeString('es-EC', { 
                timeZone: 'America/Guayaquil',
                timeStyle: 'short'
            })
        };
    }
    
    try {
        // Obtener datos frescos de las APIs
        console.log(`🔄 Caché expirado. Obteniendo datos frescos...`);
        const datosClima = await obtenerClimaActualAPIs();
        
        // Evaluar condiciones para atardecer en Yacuviña
        const evaluacion = evaluarCondicionesActuales(datosClima);
        
        // Combinar datos del clima con evaluación
        const resultado = {
            ...datosClima,
            evaluacionYacuvina: evaluacion,
            esCache: false,
            ultimaActualizacion: ahoraISO,
            proximaActualizacion: new Date(ahora + CACHE_DURATION).toLocaleTimeString('es-EC', { 
                timeZone: 'America/Guayaquil',
                timeStyle: 'short'
            })
        };
        
        // Guardar en caché
        await guardarCache(resultado);
        
        console.log(`✅ Clima actual obtenido y guardado en caché`);
        console.log(`🎯 Evaluación: ${evaluacion.categoria} (${evaluacion.puntuacion}/100)`);
        
        return resultado;
        
    } catch (error) {
        console.error(`❌ Error al obtener clima actual: ${error.message}`);
        
        // Si tenemos datos en caché (aunque expired), usarlos como fallback
        if (weatherCache.data) {
            console.log(`🔄 Usando caché expirado como fallback`);
            return {
                ...weatherCache.data,
                esCache: true,
                error: 'Datos del caché (APIs no disponibles)',
                proximaActualizacion: 'Reintentando...'
            };
        }
        
        // Si no hay caché, lanzar error
        throw new Error(`No se pudo obtener el clima actual: ${error.message}`);
    }
};

/**
 * 🧹 Limpiar caché manualmente
 */
export const limpiarCacheClima = async () => {
    try {
        await fs.unlink(CACHE_FILE);
        weatherCache = { data: null, timestamp: 0, lastUpdate: null };
        console.log(`🗑️ Caché de clima limpiado`);
        return true;
    } catch (error) {
        console.log(`ℹ️ No había caché para limpiar: ${error.message}`);
        return false;
    }
};

/**
 * 📊 Obtener estadísticas del caché
 */
export const obtenerEstadisticasCache = () => {
    const ahora = Date.now();
    
    if (!weatherCache.data) {
        return {
            estado: 'vacío',
            ultimaActualizacion: null,
            tiempoRestante: 0
        };
    }
    
    const tiempoTranscurrido = ahora - weatherCache.timestamp;
    const tiempoRestante = Math.max(0, CACHE_DURATION - tiempoTranscurrido);
    
    return {
        estado: esCacheValido() ? 'válido' : 'expirado',
        ultimaActualizacion: weatherCache.lastUpdate,
        tiempoRestante: Math.round(tiempoRestante / 1000 / 60), // en minutos
        tamaño: JSON.stringify(weatherCache.data).length
    };
};

// Inicializar caché al importar el módulo
(async () => {
    await cargarCache();
})();
