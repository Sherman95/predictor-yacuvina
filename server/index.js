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

// --- CONFIGURACIÓN DEL CACHÉ PERSISTENTE ---
const DATA_DIR = './data';
const CACHE_FILE_PATH = path.join(DATA_DIR, 'cache.json');
let cache;
let cacheTimestamp;
const CACHE_DURATION_MS = 3600 * 1000; // 1 hora

// --- VALIDACIÓN DE API KEYS AL INICIO ---
if (!process.env.OPENWEATHER_API_KEY || !process.env.WEATHERAPI_KEY) {
    console.error("FATAL ERROR: Las claves de API no están definidas en el archivo .env");
    process.exit(1);
}

// --- COORDENADAS EXACTAS ---
const LATITUD = -3.572854;
const LONGITUD = -79.689287;

// --- FUNCIONES HELPER ---
const promedio = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const guardarCache = (data) => {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR);
        }
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (error) {
        console.error("Error al guardar el caché en disco:", error.message);
    }
};

const cargarCache = () => {
    try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
            const { data, timestamp } = JSON.parse(fs.readFileSync(CACHE_FILE_PATH));
            cache = data;
            cacheTimestamp = timestamp;
            console.info("Caché persistente cargado exitosamente.");
        }
    } catch (error) {
        console.error("Error al cargar el caché del disco:", error.message);
    }
};

// --- LÓGICA DE PUNTUACIÓN PRINCIPAL ---
const calcularPronosticoDia = (datosDelDia, fecha) => {
    if (!datosDelDia) {
        console.warn(`No hay datos para la fecha: ${fecha.toISOString()}`);
        return null;
    }

    const sunTimes = SunCalc.getTimes(fecha, LATITUD, LONGITUD);
    
    let nubesFuentes = [], lluviaFuentes = [], tempFuentes = [], humedadFuentes = [], vientoFuentes = [];
    
    let owCercano = null;
    if (datosDelDia.openWeather) {
        const horaAtardecerLocal = new Date(sunTimes.sunset).getHours();
        owCercano = datosDelDia.openWeather.reduce((prev, curr) => 
            Math.abs(curr.hora - horaAtardecerLocal) < Math.abs(prev.hora - horaAtardecerLocal) ? curr : prev
        );
        nubesFuentes.push(owCercano.nubes);
        lluviaFuentes.push(owCercano.lluvia);
        tempFuentes.push(owCercano.temp);
        humedadFuentes.push(owCercano.humedad);
        vientoFuentes.push(owCercano.viento);
    }
    if (datosDelDia.weatherApi) {
        lluviaFuentes.push(datosDelDia.weatherApi.lluvia);
        tempFuentes.push(datosDelDia.weatherApi.temp);
        humedadFuentes.push(datosDelDia.weatherApi.humedad);
        vientoFuentes.push(datosDelDia.weatherApi.viento);
    }
    if (datosDelDia.openMeteo) {
        nubesFuentes.push(datosDelDia.openMeteo.nubes);
        tempFuentes.push(datosDelDia.openMeteo.temp);
    }

    if (nubesFuentes.length === 0) return null;

    const nubesPromedio = promedio(nubesFuentes);
    const lluviaPromedio = promedio(lluviaFuentes);
    const tempPromedio = promedio(tempFuentes);
    const humedadPromedio = promedio(humedadFuentes);
    const vientoPromedio = promedio(vientoFuentes);

    const desviacionNubes = Math.sqrt(promedio(nubesFuentes.map(x => Math.pow(x - nubesPromedio, 2))));
    let confianza = Math.max(50, 99 - desviacionNubes * 1.5);
    if (nubesFuentes.length >= 2) confianza = Math.min(99, confianza + 5);
    if (nubesFuentes.length === 1) confianza = 65;

    let puntajeFinal = 100;
    puntajeFinal -= (nubesPromedio * 0.6);
    puntajeFinal -= (lluviaPromedio * 0.2);
    puntajeFinal -= (humedadPromedio * 0.1);
    puntajeFinal -= (vientoPromedio * 0.5);

    if (datosDelDia.weatherApi && datosDelDia.weatherApi.visibilidad < 8) {
        puntajeFinal -= 20;
    }

    puntajeFinal = Math.max(0, Math.min(100, puntajeFinal));

    let prediccionTexto;
    if (puntajeFinal >= 82) { prediccionTexto = "Excelente ✨"; }
    else if (puntajeFinal >= 70) { prediccionTexto = "Bueno 🌤️"; }
    else if (puntajeFinal >= 55) { prediccionTexto = "Regular ☁️"; }
    else { prediccionTexto = "Malo 😞"; }

    let tendenciaCielo = "estable";
    if (datosDelDia.openWeather) {
        const ow18h = datosDelDia.openWeather.find(p => p.hora === 18);
        const ow21h = datosDelDia.openWeather.find(p => p.hora === 21);
        if (ow18h && ow21h) {
            const cambio = ow18h.nubes - ow21h.nubes;
            if (cambio > 20) tendenciaCielo = "despejando";
            else if (cambio < -20) tendenciaCielo = "empeorando";
        }
    }

    const icono = owCercano?.icono || '02d';

    return {
        diaSemana: fecha.toLocaleDateString('es-EC', { weekday: 'long', timeZone: 'America/Guayaquil' }),
        fecha: fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' }),
        prediccion: prediccionTexto + (tendenciaCielo !== 'estable' ? ` (${tendenciaCielo})` : ''),
        confianza: Math.round(confianza),
        temperatura: Math.round(tempPromedio),
        icono: icono,
        horaAtardecer: new Date(sunTimes.sunset).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' }),
        detalles: {
            nubes: Math.round(nubesPromedio), lluvia: Math.round(lluviaPromedio),
            humedad: Math.round(humedadPromedio), viento: Math.round(vientoPromedio),
            visibilidad: datosDelDia.weatherApi?.visibilidad ?? null,
            puntaje: Math.round(puntajeFinal), tendencia: tendenciaCielo,
            sourceCount: nubesFuentes.length
        }
    };
};

// --- FUNCIÓN PARA NORMALIZAR DATOS ---
const normalizeData = (openWeatherData, weatherApiData, openMeteoData) => {
    const combinedData = {};
    const getLocalDateString = (dateObj) => new Date(dateObj).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    if (Array.isArray(openWeatherData?.list)) {
        openWeatherData.list.forEach(item => {
            const date = getLocalDateString(new Date(item.dt * 1000));
            if (!combinedData[date]) combinedData[date] = { openWeather: [] };
            const horaLocal = parseInt(new Date(item.dt * 1000).toLocaleTimeString('en-US', { hour12: false, hour: 'numeric', timeZone: 'America/Guayaquil' }));
            combinedData[date].openWeather.push({
                nubes: item.clouds.all, lluvia: item.pop * 100, temp: item.main.temp,
                icono: item.weather[0].icon, hora: horaLocal,
                humedad: item.main.humidity, viento: item.wind.speed * 3.6
            });
        });
    }
    if (Array.isArray(weatherApiData?.forecast?.forecastday)) {
        weatherApiData.forecast.forecastday.forEach(day => {
            const date = day.date;
            if (!combinedData[date]) combinedData[date] = {};
            combinedData[date].weatherApi = {
                lluvia: day.day.daily_chance_of_rain, temp: day.day.avgtemp_c,
                visibilidad: day.day.avgvis_km, humedad: day.day.avghumidity, viento: day.day.maxwind_kph
            };
        });
    }
    if (Array.isArray(openMeteoData?.daily?.time)) {
        openMeteoData.daily.time.forEach((date, index) => {
            if (!combinedData[date]) combinedData[date] = {};
            combinedData[date].openMeteo = {
                nubes: openMeteoData.daily.cloudcover_mean[index],
                temp: openMeteoData.daily.temperature_2m_max[index],
            };
        });
    }
    return combinedData;
};

// --- ENDPOINT PRINCIPAL DE LA API ---
app.get('/api/prediccion', async (req, res) => {
    if (cache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION_MS)) {
        console.info(`[${new Date().toISOString()}] Sirviendo desde caché.`);
        res.setHeader('Cache-Control', `public, max-age=${Math.round((CACHE_DURATION_MS - (Date.now() - cacheTimestamp)) / 1000)}`);
        return res.json(cache);
    }

    try {
        console.info(`[${new Date().toISOString()}] Actualizando datos desde APIs...`);
        const openWeatherKey = process.env.OPENWEATHER_API_KEY;
        const weatherApiKey = process.env.WEATHERAPI_KEY;

        const urlOpenWeather = `https://api.openweathermap.org/data/2.5/forecast?lat=${LATITUD}&lon=${LONGITUD}&appid=${openWeatherKey}&units=metric`;
        const urlWeatherApi = `https://api.weatherapi.com/v1/forecast.json?key=${weatherApiKey}&q=${LATITUD},${LONGITUD}&days=10&aqi=no&alerts=no`;
        const urlOpenMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}&daily=temperature_2m_max,cloudcover_mean&timezone=America/Guayaquil`;

        const responses = await Promise.all([
            axios.get(urlOpenWeather).catch(e => { console.error("Error en OpenWeather API:", e.message); return { error: e }; }),
            axios.get(urlWeatherApi).catch(e => { console.error("Error en WeatherAPI:", e.message); return { error: e }; }),
            axios.get(urlOpenMeteo).catch(e => { console.error("Error en Open-Meteo API:", e.message); return { error: e }; })
        ]);

        const [openWeatherResponse, weatherApiResponse, openMeteoResponse] = responses;
        if (openWeatherResponse.error || weatherApiResponse.error || openMeteoResponse.error) {
            console.error("Fallo una o más llamadas a las APIs externas.");
            if (cache) {
                console.warn("Sirviendo caché antiguo debido a fallo de API.");
                res.setHeader('Cache-Control', `public, max-age=60`);
                return res.json(cache);
            }
            throw new Error("No se pudo obtener datos de todas las fuentes y no hay caché disponible.");
        }

        const normalizedData = normalizeData(
            openWeatherResponse.data, 
            weatherApiResponse.data, 
            openMeteoResponse.data
        );

        const resultadoFinal = Object.keys(normalizedData)
            .sort()
            .map(dateString => {
                console.log(`[DEBUG] Procesando fecha: ${dateString}`); // Log de depuración
                const fecha = new Date(dateString + 'T12:00:00Z'); 
                return calcularPronosticoDia(normalizedData[dateString], fecha);
            })
            .filter(Boolean);

        const top10 = [...resultadoFinal].slice(0, 10);
        cache = top10;
        cacheTimestamp = Date.now();
        guardarCache(cache);

        console.info(`[${new Date().toISOString()}] Caché actualizado exitosamente.`);
        res.setHeader('Cache-Control', `public, max-age=${CACHE_DURATION_MS / 1000}`);
        res.json(cache);

    } catch (error) {
        console.error("Error en el endpoint /api/prediccion:", error.message);
        res.status(500).json({ message: "Error al obtener y procesar los datos de múltiples fuentes." });
    }
});

// --- ENDPOINT DE SALUD ---
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        cache: {
            hasCache: !!cache,
            isExpired: cacheTimestamp ? (Date.now() - cacheTimestamp > CACHE_DURATION_MS) : null,
            lastUpdate: cacheTimestamp ? new Date(cacheTimestamp).toISOString() : null
        }
    });
});

app.listen(PORT, () => {
    cargarCache();
    console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
