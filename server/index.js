import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import SunCalc from 'suncalc';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());

// --- CONFIGURACIÓN ---
const LATITUD = -3.572854;
const LONGITUD = -79.689287;
const PRONOSTICO_FILE_PATH = path.join('./', 'pronostico.json');
const ACCUWEATHER_LOCATION_KEY = '122468'; // Tu Location Key

// --- VALIDACIÓN DE API KEYS ---
if (!process.env.OPENWEATHER_API_KEY || !process.env.ACCUWEATHER_API_KEY) {
    console.error("FATAL ERROR: Una o más claves de API no están definidas en el archivo .env");
    process.exit(1);
}

// =================================================================
// PATRÓN ADAPTER: CORREGIDO
// Cada adaptador ahora usa un nombre de propiedad único para la lluvia.
// =================================================================

const adaptarOpenMeteo = (data) => {
    const datosAdaptados = {};
    const getLocalDateString = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    data.hourly.time.forEach((timestamp, index) => {
        const fecha = new Date(timestamp);
        const dateString = getLocalDateString(fecha);
        const hora = fecha.getHours();
        if (!datosAdaptados[dateString]) datosAdaptados[dateString] = {};
        if (!datosAdaptados[dateString][hora]) datosAdaptados[dateString][hora] = {};
        
        datosAdaptados[dateString][hora] = {
            nubes_bajas: data.hourly.cloudcover_low[index],
            nubes_medias: data.hourly.cloudcover_mid[index],
            nubes_altas: data.hourly.cloudcover_high[index],
            lluvia_om: data.hourly.precipitation_probability[index], // <-- Nombre único
            visibilidad: data.hourly.visibility[index] / 1000,
            temp: data.hourly.temperature_2m[index],
        };
    });
    return datosAdaptados;
};

const adaptarOpenWeather = (data) => {
    const datosAdaptados = {};
    const getLocalDateString = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    data.list.forEach(item => {
        const fecha = new Date(item.dt * 1000);
        const dateString = getLocalDateString(fecha);
        const hora = fecha.getHours();
        if (!datosAdaptados[dateString]) datosAdaptados[dateString] = {};
        if (!datosAdaptados[dateString][hora]) datosAdaptados[dateString][hora] = {};

        datosAdaptados[dateString][hora] = {
            lluvia_ow: item.pop * 100, // <-- Nombre único
            icono: item.weather[0].icon,
        };
    });
    return datosAdaptados;
};

const adaptarAccuweather = (data) => {
    const datosAdaptados = {};
    const getLocalDateString = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

    data.forEach(hourData => {
        const fecha = new Date(hourData.DateTime);
        const dateString = getLocalDateString(fecha);
        const hora = fecha.getHours();
        if (!datosAdaptados[dateString]) datosAdaptados[dateString] = {};
        if (!datosAdaptados[dateString][hora]) datosAdaptados[dateString][hora] = {};

        datosAdaptados[dateString][hora] = {
            lluvia_aw: hourData.PrecipitationProbability, // <-- Nombre único
            techo_nubes: hourData.Ceiling?.Metric?.Value,
        };
    });
    return datosAdaptados;
};


// =================================================================
// FUNCIÓN PARA COMBINAR LOS DATOS YA ADAPTADOS
// =================================================================
const combinarDatosAdaptados = (...fuentes) => {
    const datosCombinados = {};

    fuentes.forEach(fuente => {
        if (!fuente) return; // Si una fuente falló, la ignoramos

        for (const dateString in fuente) {
            if (!datosCombinados[dateString]) datosCombinados[dateString] = { horas: {} };
            for (const hora in fuente[dateString]) {
                if (!datosCombinados[dateString].horas[hora]) datosCombinados[dateString].horas[hora] = {};
                
                // Unimos las propiedades de la fuente actual en el objeto combinado
                Object.assign(datosCombinados[dateString].horas[hora], fuente[dateString][hora]);
            }
        }
    });
    return datosCombinados;
};


// =================================================================
// FUNCIÓN PRINCIPAL PARA ACTUALIZAR EL CLIMA (Refactorizada)
// =================================================================
const actualizarDatosClima = async () => {
    console.info(`[${new Date().toISOString()}] ==> Ejecutando tarea: Actualizando datos...`);
    
    const openWeatherKey = process.env.OPENWEATHER_API_KEY;
    const accuweatherKey = process.env.ACCUWEATHER_API_KEY;

    const urls = [
        `https://api.open-meteo.com/v1/forecast?latitude=${LATITUD}&longitude=${LONGITUD}&hourly=temperature_2m,precipitation_probability,cloudcover_low,cloudcover_mid,cloudcover_high,visibility&timezone=America/Guayaquil`,
        `https://api.openweathermap.org/data/2.5/forecast?lat=${LATITUD}&lon=${LONGITUD}&appid=${openWeatherKey}&units=metric`,
        `http://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${ACCUWEATHER_LOCATION_KEY}?apikey=${accuweatherKey}&details=true&metric=true`
    ];

    const resultados = await Promise.allSettled(urls.map(url => axios.get(url)));

    const datosOpenMeteo = resultados[0].status === 'fulfilled' ? adaptarOpenMeteo(resultados[0].value.data) : null;
    const datosOpenWeather = resultados[1].status === 'fulfilled' ? adaptarOpenWeather(resultados[1].value.data) : null;
    const datosAccuweather = resultados[2].status === 'fulfilled' ? adaptarAccuweather(resultados[2].value.data) : null;

    if (!datosOpenMeteo) {
        console.error(`[${new Date().toISOString()}] ==> ERROR CRÍTICO: La fuente principal (Open-Meteo) falló. Abortando actualización.`);
        return;
    }

    const normalizedData = combinarDatosAdaptados(datosOpenMeteo, datosOpenWeather, datosAccuweather);
    
    const hoyString = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    
    const resultadoFinal = Object.keys(normalizedData)
        .sort()
        .filter(dateString => dateString >= hoyString)
        .map(dateString => {
            const fecha = new Date(dateString + 'T12:00:00Z');
            return calcularPronosticoDia(normalizedData[dateString], fecha);
        })
        .filter(Boolean);

    const pronosticoCompleto = {
        lastUpdated: new Date().toISOString(),
        forecast: resultadoFinal.slice(0, 7)
    };

    try {
        await fs.writeFile(PRONOSTICO_FILE_PATH, JSON.stringify(pronosticoCompleto, null, 2));
        console.info(`[${new Date().toISOString()}] ==> Tarea finalizada: Archivo pronostico.json actualizado.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ==> ERROR al escribir el archivo de pronóstico: ${error.message}`);
    }
};


 // =================================================================
// LÓGICA DE PUNTUACIÓN (VERSIÓN FINAL CON RAZONES POSITIVAS)
// =================================================================
const calcularPronosticoDia = (datosDia, fecha) => {
    if (!datosDia?.horas) return null;

    const sunTimes = SunCalc.getTimes(fecha, LATITUD, LONGITUD);
    const horaAtardecerLocal = new Date(sunTimes.sunset).getHours();
    
    const pronosticoTarde = datosDia.horas[horaAtardecerLocal];
    if(!pronosticoTarde) return null;

    const { nubes_bajas, nubes_medias, nubes_altas, visibilidad, temp, techo_nubes } = pronosticoTarde;
    
    const fuentesLluvia = [];
    if (pronosticoTarde.lluvia_om !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_om);
    if (pronosticoTarde.lluvia_ow !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_ow);
    if (pronosticoTarde.lluvia_aw !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_aw);
    
    const promedioLluvia = fuentesLluvia.length > 0
        ? fuentesLluvia.reduce((a, b) => a + b, 0) / fuentesLluvia.length
        : 0;
    
    const scoreNubesBajas = nubes_bajas ?? 0;
    const scoreNubesMedias = nubes_medias ?? 0;
    const scoreNubesAltas = nubes_altas ?? 0;
    const nubesSuperiores = (scoreNubesMedias + scoreNubesAltas) / 2;

    // --- CÁLCULO DE PUNTAJES PARA AMBOS ESCENARIOS ---
    let scoreMarDeNubes = (scoreNubesBajas / 100) * 60 + ((100 - nubesSuperiores) / 100) * 40;
    const puntajeColor = (scoreNubesAltas * 0.7) + (scoreNubesMedias * 0.3);
    const puntajeClaridad = (100 - scoreNubesBajas);
    let scoreCieloIncendiado = (puntajeColor * 0.7) + (puntajeClaridad * 0.3);

    // --- SELECCIÓN DEL MEJOR ESCENARIO ---
    let puntaje;
    let razonPrincipal = ""; // Empezamos con la razón vacía

    if (scoreMarDeNubes > scoreCieloIncendiado) {
        puntaje = scoreMarDeNubes;
        // Asignamos una razón positiva
        razonPrincipal = "Buenas condiciones para mar de nubes.";
    } else {
        puntaje = scoreCieloIncendiado;
        // Asignamos una razón positiva
        razonPrincipal = "Potencial de cielo muy colorido.";
    }

    // --- APLICACIÓN DE BONUS Y PENALIZACIONES (QUE PUEDEN SOBREESCRIBIR LA RAZÓN) ---
    const altitudMirador = 2300;
    if (techo_nubes < altitudMirador && techo_nubes > 0) {
        puntaje += 15;
        razonPrincipal = "Techo de nubes bajo, ideal para mar de nubes."; // Razón más específica
    }

    if (visibilidad < 10) {
        puntaje -= (10 - visibilidad) * 4;
        razonPrincipal = "Posible neblina en el sitio."; // Razón de penalización
    }

    puntaje = Math.max(0, Math.min(100, puntaje));

    if (promedioLluvia >= 35 && puntaje >= 75) {
        puntaje = 74; 
        razonPrincipal = `Alto riesgo de lluvia (${Math.round(promedioLluvia)}%).`; // Razón de penalización
    } else if (promedioLluvia > 25) {
        puntaje -= promedioLluvia * 0.4;
        // Aquí no sobreescribimos la razón, para que se mantenga la razón de las nubes
    }
    
    puntaje = Math.max(0, Math.min(100, puntaje));

    // --- ASIGNACIÓN DE TEXTO FINAL ---
    let prediccionTexto;
    if (puntaje >= 88) prediccionTexto = "Excelente";
    else if (puntaje >= 75) prediccionTexto = "Bueno";
    else if (puntaje >= 60) prediccionTexto = "Regular";
    else prediccionTexto = "Malo";

    return {
        diaSemana: fecha.toLocaleDateString('es-EC', { weekday: 'long', timeZone: 'America/Guayaquil' }),
        fecha: fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' }),
        prediccion: prediccionTexto,
        razon: razonPrincipal, // Ahora siempre tendrá un valor (a menos que el pronóstico falle)
        confianza: Math.round(75 + (puntaje / 4)),
        temperatura: Math.round(temp),
        icono: pronosticoTarde.icono || '03d',
        horaAtardecer: new Date(sunTimes.sunset).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' }),
    };
};

// =================================================================
// ENDPOINT Y TAREAS PROGRAMADAS
// =================================================================
app.get('/api/prediccion', async (req, res) => {
    try {
        const pronosticoGuardado = await fs.readFile(PRONOSTICO_FILE_PATH, 'utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(JSON.parse(pronosticoGuardado));
    } catch (error) {
        console.error("Error al leer el archivo de pronóstico:", error.message);
        res.status(503).json({ message: "El servicio de pronóstico está inicializándose. Inténtalo de nuevo en un minuto." });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
    actualizarDatosClima();
    cron.schedule('0 * * * *', actualizarDatosClima);
    console.log("🕒 Tarea de actualización de clima programada para ejecutarse cada hora.");
});