import axios from 'axios';
import SunCalc from 'suncalc';
import fs from 'fs/promises';
import { config } from '../config/index.js';

// =================================================================
// SECCIÓN 1: ADAPTADORES DE API (Sin cambios)
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
            lluvia_om: data.hourly.precipitation_probability[index],
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
            lluvia_ow: item.pop * 100,
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
            lluvia_aw: hourData.PrecipitationProbability,
            techo_nubes: hourData.Ceiling?.Metric?.Value,
        };
    });
    return datosAdaptados;
};

const combinarDatosAdaptados = (...fuentes) => {
    const datosCombinados = {};
    fuentes.forEach(fuente => {
        if (!fuente) return;
        for (const dateString in fuente) {
            if (!datosCombinados[dateString]) datosCombinados[dateString] = { horas: {} };
            for (const hora in fuente[dateString]) {
                if (!datosCombinados[dateString].horas[hora]) datosCombinados[dateString].horas[hora] = {};
                Object.assign(datosCombinados[dateString].horas[hora], fuente[dateString][hora]);
            }
        }
    });
    return datosCombinados;
};


// =================================================================
// SECCIÓN 2: LÓGICA DE PUNTUACIÓN (Sin cambios en su lógica interna)
// =================================================================

const calcularScoreMarDeNubes = (nubesBajas, nubesSuperiores) => {
    return (nubesBajas / 100) * 60 + ((100 - nubesSuperiores) / 100) * 40;
};

const calcularScoreCieloIncendiado = (nubesBajas, nubesMedias, nubesAltas) => {
    const puntajeColor = (nubesAltas * 0.7) + (nubesMedias * 0.3);
    const puntajeClaridad = (100 - nubesBajas);
    return (puntajeColor * 0.7) + (puntajeClaridad * 0.3);
};

function convertirPuntajeATexto(puntaje) {
    if (puntaje >= 88) return "Excelente";
    if (puntaje >= 75) return "Bueno";
    if (puntaje >= 60) return "Regular";
    return "Malo";
}

const calcularPronosticoDia = (datosDia, fecha) => {
    if (!datosDia?.horas || Object.keys(datosDia.horas).length === 0) return null;

    const sunTimes = SunCalc.getTimes(fecha, config.latitud, config.longitud);
    const horaAtardecerLocal = new Date(sunTimes.sunset).getHours();
    
    const horasDisponibles = Object.keys(datosDia.horas).map(Number);
    const horaCercana = horasDisponibles.reduce((prev, curr) => 
        Math.abs(curr - horaAtardecerLocal) < Math.abs(prev - horaAtardecerLocal) ? curr : prev
    );
    const pronosticoTarde = datosDia.horas[horaCercana];
    if (!pronosticoTarde) return null;

    const { visibilidad, temp, techo_nubes } = pronosticoTarde;
    
    const fuentesLluvia = [];
    if (pronosticoTarde.lluvia_om !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_om);
    if (pronosticoTarde.lluvia_ow !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_ow);
    if (pronosticoTarde.lluvia_aw !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_aw);
    const promedioLluvia = fuentesLluvia.length > 0 ? fuentesLluvia.reduce((a, b) => a + b, 0) / fuentesLluvia.length : 0;
    
    const nubes = {
        scoreNubesBajas: pronosticoTarde.nubes_bajas ?? 0,
        scoreNubesMedias: pronosticoTarde.nubes_medias ?? 0,
        scoreNubesAltas: pronosticoTarde.nubes_altas ?? 0,
    };
    
    let puntaje;
    let razonPrincipal = "";

    const nubesSuperiores = (nubes.scoreNubesMedias + nubes.scoreNubesAltas) / 2;
    if (nubes.scoreNubesBajas > 70 && nubesSuperiores > 50) {
        puntaje = 30;
        razonPrincipal = "Cielo completamente cubierto, sin visibilidad.";
    } else {
        const scoreMarDeNubes = calcularScoreMarDeNubes(nubes.scoreNubesBajas, nubesSuperiores);
        const scoreCieloIncendiado = calcularScoreCieloIncendiado(nubes.scoreNubesBajas, nubes.scoreNubesMedias, nubes.scoreNubesAltas);

        if (scoreMarDeNubes > scoreCieloIncendiado) {
            puntaje = scoreMarDeNubes;
            razonPrincipal = "Buenas condiciones para mar de nubes.";
        } else {
            puntaje = scoreCieloIncendiado;
            razonPrincipal = "Potencial de cielo muy colorido.";
        }
    }
    
    const altitudMirador = 2300;
    if (typeof techo_nubes === 'number' && techo_nubes < altitudMirador && techo_nubes > 0) {
        puntaje += 15;
        razonPrincipal = "Techo de nubes bajo, ideal para mar de nubes.";
    }

    if (visibilidad !== undefined && visibilidad < 10) {
        puntaje -= (10 - visibilidad) * 4;
        razonPrincipal = "Posible neblina en el sitio.";
    }
    
    const pronosticoHoraPrevia2 = datosDia.horas[horaCercana - 2];
    if(pronosticoHoraPrevia2) {
        const nubesAhoraTotal = nubes.scoreNubesBajas + nubes.scoreNubesMedias + nubes.scoreNubesAltas;
        const nubesAntesTotal = (pronosticoHoraPrevia2.nubes_bajas ?? 0) + (pronosticoHoraPrevia2.nubes_medias ?? 0) + (pronosticoHoraPrevia2.nubes_altas ?? 0);
        if (nubesAhoraTotal > nubesAntesTotal + 30) {
            puntaje -= 15;
            razonPrincipal = "El cielo se está nublando rápidamente.";
        }
    }

    puntaje = Math.max(0, Math.min(100, puntaje));

    if (promedioLluvia >= 30 && puntaje >= 75) {
        puntaje = 74;
        razonPrincipal = `Alto riesgo de lluvia (${Math.round(promedioLluvia)}%).`;
    } else if (promedioLluvia > 20) {
        puntaje -= promedioLluvia * 0.4;
    }
    
    puntaje = Math.max(0, Math.min(100, puntaje));

    return {
        diaSemana: fecha.toLocaleDateString('es-EC', { weekday: 'long', timeZone: 'America/Guayaquil' }),
        fecha: fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' }),
        prediccion: convertirPuntajeATexto(puntaje),
        razon: razonPrincipal,
        confianza: Math.round(75 + (puntaje / 4)),
        temperatura: Math.round(temp),
        icono: pronosticoTarde.icono || '03d',
        horaAtardecer: new Date(sunTimes.sunset).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' }),
    };
};

// =================================================================
// SECCIÓN 3: ORQUESTADOR PRINCIPAL
// =================================================================

export const actualizarDatosClima = async () => {
    const ahora = new Date();
    const ahoraISO = ahora.toISOString();
    
    console.info(`[${ahoraISO}] ==> Ejecutando tarea: Actualizando datos...`);
    
    const { latitud, longitud, accuweatherLocationKey, apiKeys } = config;
    const urls = [
        `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&hourly=temperature_2m,precipitation_probability,cloudcover_low,cloudcover_mid,cloudcover_high,visibility&timezone=America/Guayaquil`,
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitud}&lon=${longitud}&appid=${apiKeys.openWeather}&units=metric`,
        `http://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${accuweatherLocationKey}?apikey=${apiKeys.accuweather}&details=true&metric=true`
    ];

    const resultados = await Promise.allSettled(urls.map(url => axios.get(url)));
    
    const datosOpenMeteo = resultados[0].status === 'fulfilled' ? adaptarOpenMeteo(resultados[0].value.data) : null;
    const datosOpenWeather = resultados[1].status === 'fulfilled' ? adaptarOpenWeather(resultados[1].value.data) : null;
    const datosAccuweather = resultados[2].status === 'fulfilled' ? adaptarAccuweather(resultados[2].value.data) : null;

    if (!datosOpenMeteo) {
        console.error(`[${ahoraISO}] ==> ERROR CRÍTICO: La fuente principal (Open-Meteo) falló.`);
        return;
    }

    const normalizedData = combinarDatosAdaptados(datosOpenMeteo, datosOpenWeather, datosAccuweather);
    const hoyString = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    
    const resultadoFinal = Object.keys(normalizedData)
        .sort()
        .filter(dateString => dateString >= hoyString)
        .map(dateString => {
            // ===== AQUÍ ESTÁ LA CORRECCIÓN CLAVE =====
            // Creamos la fecha de forma explícita para la zona horaria de Ecuador,
            // asegurando que SunCalc siempre reciba el día correcto.
            const fecha = new Date(`${dateString}T18:00:00-05:00`);
            return calcularPronosticoDia(normalizedData[dateString], fecha);
        })
        .filter(Boolean);

    const pronosticoCompleto = {
        lastUpdated: ahoraISO,
        forecast: resultadoFinal.slice(0, 7)
    };

    try {
        await fs.writeFile(config.pronosticoFilePath, JSON.stringify(pronosticoCompleto, null, 2));
        console.info(`[${ahoraISO}] ==> Tarea finalizada: Archivo pronostico.json actualizado.`);
    } catch (error) {
        console.error(`[${ahoraISO}] ==> ERROR al escribir el archivo: ${error.message}`);
    }
};
