import axios from 'axios';
import SunCalc from 'suncalc';
import fs from 'fs/promises';
import { config } from '../config/index.js';

// =================================================================
// SECCIÓN 1: ADAPTADORES DE API
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
            humedad: data.hourly.relativehumidity_2m[index],
            viento: data.hourly.windspeed_10m?.[index] || 0, // Velocidad del viento
            uv_index: data.hourly.uv_index?.[index] || 0, // Índice UV
            presion: data.hourly.surface_pressure?.[index] || 0, // Presión atmosférica
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
// SECCIÓN 2: ALGORITMO YACUVIÑA 3.0 - MAR DE NUBES ESPECÍFICO
// =================================================================

// ALGORITMO 1: MAR DE NUBES CLÁSICO (Mirador 2300-2600msnm viendo hacia abajo)
const calcularScoreMarDeNubes = (datos) => {
    const { nubes_bajas, nubes_medias, nubes_altas, visibilidad, viento, temp, humedad } = datos;
    
    let score = 0;
    let factores = [];
    
    // Factor 1: NUBES BAJAS DENSAS (50% del score) - Forman el "mar" abajo
    if (nubes_bajas >= 80) {
        score += 50;
        factores.push("Mar de nubes denso y espectacular");
    } else if (nubes_bajas >= 60) {
        score += 35;
        factores.push("Mar de nubes bueno");
    } else if (nubes_bajas >= 40) {
        score += 20;
        factores.push("Mar de nubes parcial");
    } else {
        score += 5;
        factores.push("Pocas nubes bajas para mar");
    }
    
    // Factor 2: VISIBILIDAD CLARA EN EL MIRADOR (30% del score) - Crítico
    if (visibilidad >= 10) {
        score += 30;
        factores.push("Visibilidad excelente desde el mirador");
    } else if (visibilidad >= 5) {
        score += 20;
        factores.push("Buena visibilidad");
    } else if (visibilidad >= 3) {
        score += 10;
        factores.push("Visibilidad reducida");
    } else {
        score -= 20; // Penalización fuerte
        factores.push("Neblina local impide la vista");
    }
    
    // Factor 3: POCAS NUBES ALTAS (10% del score) - No bloqueen el sol
    if (nubes_altas <= 30) {
        score += 10;
        factores.push("Cielo despejado arriba");
    } else if (nubes_altas <= 50) {
        score += 5;
    } else {
        score -= 5;
        factores.push("Nubes altas bloquean el sol");
    }
    
    // Factor 4: TEMPERATURA DE MONTAÑA (5% del score)
    if (temp >= 14 && temp <= 17) {
        score += 5;
        factores.push("Temperatura ideal de montaña");
    } else if (temp >= 12 && temp <= 19) {
        score += 3;
    }
    
    // Factor 5: VIENTO SUAVE (5% del score) - Mantiene el mar estable
    if (viento <= 10) {
        score += 5;
        factores.push("Viento suave mantiene el mar estable");
    } else if (viento <= 20) {
        score += 2;
    } else {
        score -= 5;
        factores.push("Viento fuerte dispersa las nubes");
    }
    
    return { score: Math.max(0, score), factores, tipo: "Mar de Nubes" };
};

// ALGORITMO 2: ATARDECER DESPEJADO (Vista panorámica del valle)
const calcularScoreDespejado = (datos) => {
    const { nubes_bajas, nubes_medias, nubes_altas, visibilidad, viento, temp, uv_index } = datos;
    
    let score = 0;
    let factores = [];
    
    // Factor 1: CIELO DESPEJADO (40% del score)
    const totalNubes = nubes_bajas + nubes_medias + nubes_altas;
    if (totalNubes <= 30) {
        score += 40;
        factores.push("Cielo completamente despejado");
    } else if (totalNubes <= 50) {
        score += 30;
        factores.push("Cielo mayormente despejado");
    } else if (totalNubes <= 70) {
        score += 20;
        factores.push("Cielo parcialmente despejado");
    } else {
        score += 10;
    }
    
    // Factor 2: VISIBILIDAD EXCELENTE (35% del score)
    if (visibilidad >= 15) {
        score += 35;
        factores.push("Vista panorámica excepcional del valle");
    } else if (visibilidad >= 10) {
        score += 25;
        factores.push("Excelente vista panorámica");
    } else if (visibilidad >= 5) {
        score += 15;
        factores.push("Buena vista del valle");
    } else {
        score -= 10;
        factores.push("Vista limitada por neblina");
    }
    
    // Factor 3: ÍNDICE UV PARA COLORES (15% del score)
    if (uv_index >= 4) {
        score += 15;
        factores.push("Colores intensos del atardecer");
    } else if (uv_index >= 2) {
        score += 10;
        factores.push("Buenos colores del atardecer");
    } else if (uv_index >= 1) {
        score += 5;
    }
    
    // Factor 4: TEMPERATURA IDEAL (5% del score)
    if (temp >= 14 && temp <= 17) {
        score += 5;
        factores.push("Temperatura perfecta");
    } else if (temp >= 12 && temp <= 19) {
        score += 3;
    }
    
    // Factor 5: VIENTO MODERADO (5% del score)
    if (viento >= 5 && viento <= 15) {
        score += 5;
        factores.push("Viento ideal para claridad");
    } else if (viento <= 20) {
        score += 3;
    }
    
    return { score: Math.max(0, score), factores, tipo: "Atardecer Despejado" };
};

// ALGORITMO 3: DETECTOR DE TIPO DE ATARDECER
const calcularScoreYacuvina = (datos) => {
    const { nubes_bajas, nubes_medias, nubes_altas, visibilidad } = datos;
    
    // LÓGICA DE DETECCIÓN: Determinar tipo de atardecer esperado
    
    // Escenario 1: MAR DE NUBES (nubes bajas densas)
    if (nubes_bajas >= 60) {
        return calcularScoreMarDeNubes(datos);
    }
    
    // Escenario 2: DESPEJADO (pocas nubes en general)
    const totalNubes = nubes_bajas + nubes_medias + nubes_altas;
    if (totalNubes <= 60 && nubes_bajas <= 30) {
        return calcularScoreDespejado(datos);
    }
    
    // Escenario 3: CONDICIONES MIXTAS (evaluar ambos y tomar el mejor)
    const scoreMarDeNubes = calcularScoreMarDeNubes(datos);
    const scoreDespejado = calcularScoreDespejado(datos);
    
    if (scoreMarDeNubes.score > scoreDespejado.score) {
        return scoreMarDeNubes;
    } else {
        return scoreDespejado;
    }
};

const convertirPuntajeATexto = (puntaje) => {
    if (puntaje >= 85) return "Excelente";
    if (puntaje >= 70) return "Bueno";
    if (puntaje >= 50) return "Regular";
    if (puntaje >= 30) return "Malo";
    return "Muy Malo";
};

const calcularPronosticoDia = (datosDia, fecha) => {
    if (!datosDia?.horas || Object.keys(datosDia.horas).length === 0) return null;

    const sunTimes = SunCalc.getTimes(fecha, config.latitud, config.longitud);
    const horaAtardecerLocal = new Date(sunTimes.sunset).getHours();
    
    const horasDisponibles = Object.keys(datosDia.horas).map(Number);
    const horaCercana = horasDisponibles.reduce((prev, curr) => Math.abs(curr - horaAtardecerLocal) < Math.abs(prev - horaAtardecerLocal) ? curr : prev);
    const pronosticoTarde = datosDia.horas[horaCercana];
    if (!pronosticoTarde) return null;

    const { visibilidad, temp, humedad, icono, viento, uv_index } = pronosticoTarde;
    
    // Calcular promedio de lluvia de todas las fuentes
    const fuentesLluvia = [];
    if (pronosticoTarde.lluvia_om !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_om);
    if (pronosticoTarde.lluvia_ow !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_ow);
    if (pronosticoTarde.lluvia_aw !== undefined) fuentesLluvia.push(pronosticoTarde.lluvia_aw);
    const promedioLluvia = fuentesLluvia.length > 0 ? fuentesLluvia.reduce((a, b) => a + b, 0) / fuentesLluvia.length : 0;
    
    // Usar ALGORITMO YACUVIÑA 3.0 - Detecta automáticamente el tipo de atardecer
    const resultadoYacuvina = calcularScoreYacuvina(pronosticoTarde);
    let puntaje = resultadoYacuvina.score;
    let razonPositiva = `${resultadoYacuvina.tipo}: ${resultadoYacuvina.factores.join(', ')}`;
    let razonesPenalizacion = [];

    // ===== PENALIZACIONES ESPECÍFICAS PARA YACUVIÑA =====
    
    // Penalización por NEBLINA LOCAL (crítico para Yacuviña)
    if (visibilidad !== undefined && visibilidad < 1) {
        puntaje -= 40; // Penalización severa
        razonesPenalizacion.push("Neblina densa local impide toda visibilidad");
    } else if (visibilidad !== undefined && visibilidad < 3) {
        puntaje -= 25;
        razonesPenalizacion.push("Neblina local reduce visibilidad significativamente");
    }

    // Penalización por LLUVIA (incompatible con cualquier atardecer)
    const lluviaIcon = icono || '';
    if (lluviaIcon.startsWith('09') || lluviaIcon.startsWith('10')) {
        puntaje -= 30;
        razonesPenalizacion.push("Lluvia activa");
    }
    
    if (promedioLluvia >= 30) {
        puntaje -= 20;
        razonesPenalizacion.push(`Alta probabilidad de lluvia (${Math.round(promedioLluvia)}%)`);
    } else if (promedioLluvia >= 15) {
        puntaje -= 10;
        razonesPenalizacion.push(`Probabilidad moderada de lluvia (${Math.round(promedioLluvia)}%)`);
    }

    // Penalización por HUMEDAD EXTREMA (solo en casos extremos)
    if (humedad !== undefined && humedad >= 98) {
        puntaje -= 15;
        razonesPenalizacion.push("Humedad extrema puede generar neblina");
    }

    // Penalización por VIENTO EXTREMO (dispersa nubes del valle)
    if (viento !== undefined && viento > 30) {
        puntaje -= 15;
        razonesPenalizacion.push("Viento muy fuerte dispersa formaciones de nubes");
    }
    
    // ===== FIN DE PENALIZACIONES =====
    
    puntaje = Math.max(0, Math.min(100, puntaje));

    // Determinar razón final
    const razonFinal = razonesPenalizacion.length > 0 ? 
        `${razonesPenalizacion.join('. ')}` : razonPositiva;

    return {
        diaSemana: fecha.toLocaleDateString('es-EC', { weekday: 'long', timeZone: 'America/Guayaquil' }),
        fecha: fecha.toLocaleDateString('es-EC', { day: 'numeric', month: 'long', timeZone: 'America/Guayaquil' }),
        prediccion: convertirPuntajeATexto(puntaje),
        razon: razonFinal,
        confianza: Math.round(80 + (puntaje / 5)), // Mayor confianza en el nuevo algoritmo
        temperatura: Math.round(temp),
        icono: pronosticoTarde.icono || '03d',
        horaAtardecer: new Date(sunTimes.sunset).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' }),
        // Datos adicionales para análisis
        puntajeNumerico: Math.round(puntaje),
        tipoAtardecer: resultadoYacuvina.tipo,
        humedad: Math.round(humedad || 0),
        viento: Math.round(viento || 0),
        uvIndex: Math.round(uv_index || 0),
        visibilidad: visibilidad ? Math.round(visibilidad * 10) / 10 : null,
        nubesBajas: Math.round(pronosticoTarde.nubes_bajas || 0),
        nubesMedias: Math.round(pronosticoTarde.nubes_medias || 0),
        nubesAltas: Math.round(pronosticoTarde.nubes_altas || 0)
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
    // URL DE OPEN-METEO ACTUALIZADA PARA INCLUIR HUMEDAD Y MÁS VARIABLES CRÍTICAS
    const urls = [
        `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,cloudcover_low,cloudcover_mid,cloudcover_high,visibility,windspeed_10m,uv_index,surface_pressure&timezone=America/Guayaquil`,
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
