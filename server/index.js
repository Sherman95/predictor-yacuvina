import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import SunCalc from 'suncalc';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3001;
app.use(cors());

// --- CONFIGURACIÓN ---
const DATA_DIR = './data';
const CACHE_FILE_PATH = path.join(DATA_DIR, 'cache.json');
let cache;
let cacheTimestamp;
const CACHE_DURATION_MS = 3600 * 1000; // 1 hora
const LATITUD = -3.572854;
const LONGITUD = -79.689287;

// --- VALIDACIÓN DE API KEYS ---
if (!process.env.OPENWEATHER_API_KEY || !process.env.WEATHERAPI_KEY) {
    console.error("FATAL ERROR: Las claves de API no están definidas en el archivo .env");
    process.exit(1);
}

// --- FUNCIONES HELPER ---
const guardarCache = (data) => {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (error) {
        console.error("Error al guardar caché:", error.message);
    }
};

const cargarCache = () => {
    try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
            const { data, timestamp } = JSON.parse(fs.readFileSync(CACHE_FILE_PATH));
            cache = data;
            cacheTimestamp = timestamp;
            console.info("Caché persistente cargado.");
        }
    } catch (error) {
        console.error("Error al cargar caché:", error.message);
    }
};

// --- LÓGICA DE PUNTUACIÓN PARA "MAR DE NUBES" ---
const calcularPronosticoDia = (datosDia, fecha) => {
    if (!datosDia?.openMeteo) return null; // Necesitamos Open-Meteo para esta lógica

    const sunTimes = SunCalc.getTimes(fecha, LATITUD, LONGITUD);
    const horaAtardecerLocal = new Date(sunTimes.sunset).getHours();
    
    // Buscamos el pronóstico horario más cercano a la puesta de sol
    const pronosticoTarde = datosDia.openMeteo.horas.reduce((prev, curr) => 
        Math.abs(curr.hora - horaAtardecerLocal) < Math.abs(prev.hora - horaAtardecerLocal) ? curr : prev
    );

    const { nubes_bajas, nubes_medias, nubes_altas, lluvia, visibilidad, temp } = pronosticoTarde;

    let puntaje = 50; // Empezamos con un puntaje base
    let razonPrincipal = "";

    // 1. Bonificación por mar de nubes
    if (nubes_bajas > 60) {
        puntaje += (nubes_bajas - 60) * 0.5; // Fuerte bonificación
        razonPrincipal = "Alta probabilidad de mar de nubes.";
    } else {
        puntaje -= (60 - nubes_bajas) * 0.5; // Penalización si no hay nubes bajas
        razonPrincipal = "Baja probabilidad de mar de nubes.";
    }

    // 2. Penalización por cielo superior cubierto
    const nubesSuperiores = (nubes_medias + nubes_altas) / 2;
    if (nubesSuperiores > 40) {
        puntaje -= (nubesSuperiores - 40) * 0.8; // Fuerte penalización
        if (!razonPrincipal || nubesSuperiores > 70) razonPrincipal = "Cielo superior muy nublado.";
    }

    // 3. Penalización por lluvia y baja visibilidad
    if (lluvia > 30) {
        puntaje -= lluvia * 0.3;
        if (!razonPrincipal) razonPrincipal = "Riesgo de lluvia.";
    }
    if (visibilidad < 10) {
        puntaje -= (10 - visibilidad) * 3; // Fuerte penalización por neblina
        if (!razonPrincipal) razonPrincipal = "Posible neblina en el sitio.";
    }

    puntaje = Math.max(0, Math.min(100, puntaje));

    let prediccionTexto;
    if (puntaje >= 85) { prediccionTexto = "Excelente ✨"; }
    else if (puntaje >= 70) { prediccionTexto = "Bueno 🌤️"; }
    else if (puntaje >= 50) { prediccionTexto = "Regular ☁️"; }
    else { prediccionTexto = "Malo 😞"; }

    return {
        diaSemana: fecha.toLocaleDateString('es-EC', { weekday: 'long', timeZone: 'America/Guayaquil' }),
        fecha: fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' }),
        prediccion: prediccionTexto,
        razon: razonPrincipal,
        confianza: Math.round(75 + (puntaje / 10)), // Confianza simple basada en el puntaje
        temperatura: Math.round(temp),
        icono: datosDia.openWeather?.find(p => p.hora === horaAtardecerLocal)?.icono || '03d',
        horaAtardecer: new Date(sunTimes.sunset).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' }),
    };
};

// --- NORMALIZACIÓN DE DATOS ---
const normalizeData = (openMeteoData, openWeatherData) => {
    const combinedData = {};
    const getLocalDateString = (dateObj) => new Date(dateObj).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    if (openMeteoData?.hourly?.time) {
        openMeteoData.hourly.time.forEach((timestamp, index) => {
            const fecha = new Date(timestamp);
            const dateString = getLocalDateString(fecha);
            if (!combinedData[dateString]) combinedData[dateString] = { openMeteo: { horas: [] } };
            
            combinedData[dateString].openMeteo.horas.push({
                hora: fecha.getHours(),
                nubes_bajas: openMeteoData.hourly.cloudcover_low[index],
                nubes_medias: openMeteoData.hourly.cloudcover_mid[index],
                nubes_altas: openMeteoData.hourly.cloudcover_high[index],
                lluvia: openMeteoData.hourly.precipitation_probability[index],
                visibilidad: openMeteoData.hourly.visibility[index] / 1000, // a km
                temp: openMeteoData.hourly.temperature_2m[index],
            });
        });
    }

    // Añadimos datos de OpenWeather solo como fuente secundaria para el ícono
    if (Array.isArray(openWeatherData?.list)) {
        openWeatherData.list.forEach(item => {
            const date = getLocalDateString(new Date(item.dt * 1000));
            if (!combinedData[date]) return;
            if (!combinedData[date].openWeather) combinedData[date].openWeather = [];
            const horaLocal = parseInt(new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour12: false, hour: 'numeric', timeZone: 'America/Guayaquil' }));
            combinedData[date].openWeather.push({
                icono: item.weather[0].icon, hora: horaLocal,
            });
        });
    }

    return combinedData;
};

// --- ENDPOINT PRINCIPAL ---
app.get('/api/prediccion', async (req, res) => {
    if (cache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION_MS)) {
        console.info(`[${new Date().toISOString()}] Sirviendo desde caché.`);
        res.setHeader('Cache-Control', `public, max-age=${Math.round((CACHE_DURATION_MS - (Date.now() - cacheTimestamp)) / 1000)}`);
        return res.json(cache);
    }

    try {
        console.info(`[${new Date().toISOString()}] Actualizando datos desde APIs...`);
        const openWeatherKey = process.env.OPENWEATHER_API_KEY;

        const urlOpenMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}&hourly=temperature_2m,precipitation_probability,cloudcover_low,cloudcover_mid,cloudcover_high,visibility&timezone=America/Guayaquil`;
        const urlOpenWeather = `https://api.openweathermap.org/data/2.5/forecast?lat=${LATITUD}&lon=${LONGITUD}&appid=${openWeatherKey}&units=metric`;

        const [openMeteoResponse, openWeatherResponse] = await Promise.all([
            axios.get(urlOpenMeteo).catch(e => { console.error("Error en Open-Meteo API:", e.message); return { error: e }; }),
            axios.get(urlOpenWeather).catch(e => { console.error("Error en OpenWeather API:", e.message); return { error: e }; })
        ]);

        if (openMeteoResponse.error) {
            throw new Error("La fuente principal de datos (Open-Meteo) falló.");
        }

        const normalizedData = normalizeData(openMeteoResponse.data, openWeatherResponse.data);

        const resultadoFinal = Object.keys(normalizedData)
            .sort()
            .map(dateString => {
                const fecha = new Date(dateString + 'T12:00:00Z'); 
                return calcularPronosticoDia(normalizedData[dateString], fecha);
            })
            .filter(Boolean);

        const top7 = resultadoFinal.slice(0, 7); // Open-Meteo da 7 días
        cache = top7;
        cacheTimestamp = Date.now();
        guardarCache(cache);

        console.info(`[${new Date().toISOString()}] Caché actualizado exitosamente.`);
        res.setHeader('Cache-Control', `public, max-age=${CACHE_DURATION_MS / 1000}`);
        res.json(cache);

    } catch (error) {
        console.error("Error en el endpoint /api/prediccion:", error.message);
        res.status(500).json({ message: "Error al obtener y procesar los datos." });
    }
});

app.listen(PORT, () => {
    cargarCache();
    console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
