import fs from 'fs/promises';
import { config } from '../config/index.js';

// =================================================================
// SERVICIO DE VALIDACIÓN Y FEEDBACK PARA MEJORAR PRECISIÓN
// =================================================================

/**
 * Sistema de validación que permite guardar observaciones reales
 * para comparar con las predicciones y mejorar el algoritmo
 */

const VALIDATION_FILE = './validacion_historica.json';

// Estructura de datos para validación
const crearRegistroValidacion = (fecha, prediccionOriginal, observacionReal, fotos = []) => ({
    fecha: fecha,
    timestamp: new Date().toISOString(),
    prediccion: {
        puntaje: prediccionOriginal.puntajeNumerico,
        categoria: prediccionOriginal.prediccion,
        razon: prediccionOriginal.razon,
        confianza: prediccionOriginal.confianza,
        condicionesMeteorologicas: {
            humedad: prediccionOriginal.humedad,
            viento: prediccionOriginal.viento,
            uvIndex: prediccionOriginal.uvIndex,
            visibilidad: prediccionOriginal.visibilidad,
            temperatura: prediccionOriginal.temperatura
        }
    },
    observacion: {
        calidadAtardecer: observacionReal.calidadAtardecer, // 1-10
        tipoFenomeno: observacionReal.tipoFenomeno, // 'mar_nubes', 'cielo_incendiado', 'normal', 'nublado_total'
        coloresIntensidad: observacionReal.coloresIntensidad, // 1-10
        visibilidadReal: observacionReal.visibilidadReal, // 1-10
        duracionFenomeno: observacionReal.duracionFenomeno, // en minutos
        comentarios: observacionReal.comentarios || "",
        fotos: fotos // URLs o paths de fotos
    },
    precision: null // Se calculará después
});

// Función para guardar una validación
export const guardarValidacion = async (fecha, prediccionOriginal, observacionReal, fotos = []) => {
    try {
        let datosExistentes = [];
        
        try {
            const contenido = await fs.readFile(VALIDATION_FILE, 'utf8');
            datosExistentes = JSON.parse(contenido);
        } catch (error) {
            // Archivo no existe, empezar con array vacío
            console.log('Creando nuevo archivo de validación...');
        }

        const nuevoRegistro = crearRegistroValidacion(fecha, prediccionOriginal, observacionReal, fotos);
        
        // Calcular precisión basada en la observación
        nuevoRegistro.precision = calcularPrecision(prediccionOriginal, observacionReal);
        
        datosExistentes.push(nuevoRegistro);
        
        await fs.writeFile(VALIDATION_FILE, JSON.stringify(datosExistentes, null, 2));
        console.log(`✅ Validación guardada para fecha: ${fecha}`);
        
        return nuevoRegistro;
    } catch (error) {
        console.error('❌ Error al guardar validación:', error);
        throw error;
    }
};

// Función para calcular la precisión de una predicción
const calcularPrecision = (prediccion, observacion) => {
    let precision = 0;
    let factores = [];

    // Factor 1: Precisión de categoría (40% del peso)
    const categoriasPuntaje = {
        'Excelente': 95,
        'Bueno': 80,
        'Regular': 65,
        'Malo': 40,
        'Muy Malo': 20
    };
    
    const puntajePredicho = categoriasPuntaje[prediccion.categoria] || 50;
    const puntajeReal = observacion.calidadAtardecer * 10; // Convertir 1-10 a 0-100
    
    const diferenciaPuntaje = Math.abs(puntajePredicho - puntajeReal);
    const precisionCategoria = Math.max(0, 100 - (diferenciaPuntaje * 2));
    precision += precisionCategoria * 0.4;
    
    if (diferenciaPuntaje <= 15) {
        factores.push("Categoría muy precisa");
    } else if (diferenciaPuntaje <= 30) {
        factores.push("Categoría moderadamente precisa");
    } else {
        factores.push("Categoría imprecisa");
    }

    // Factor 2: Detección de fenómenos específicos (30% del peso)
    if (observacion.tipoFenomeno === 'mar_nubes' || observacion.tipoFenomeno === 'cielo_incendiado') {
        if (prediccion.categoria === 'Excelente' || prediccion.categoria === 'Bueno') {
            precision += 30;
            factores.push("Fenómeno espectacular detectado correctamente");
        } else {
            precision += 5;
            factores.push("Fenómeno espectacular no detectado");
        }
    } else if (observacion.tipoFenomeno === 'nublado_total') {
        if (prediccion.categoria === 'Malo' || prediccion.categoria === 'Muy Malo') {
            precision += 30;
            factores.push("Condiciones malas detectadas correctamente");
        } else {
            precision += 5;
            factores.push("Condiciones malas no detectadas");
        }
    } else {
        precision += 15; // Condiciones normales
        factores.push("Condiciones normales");
    }

    // Factor 3: Intensidad de colores (20% del peso)
    if (observacion.coloresIntensidad >= 8 && (prediccion.categoria === 'Excelente' || prediccion.categoria === 'Bueno')) {
        precision += 20;
        factores.push("Colores intensos predichos correctamente");
    } else if (observacion.coloresIntensidad <= 4 && (prediccion.categoria === 'Malo' || prediccion.categoria === 'Muy Malo')) {
        precision += 20;
        factores.push("Colores pobres predichos correctamente");
    } else {
        precision += 10;
    }

    // Factor 4: Duración del fenómeno (10% del peso)
    if (observacion.duracionFenomeno >= 20 && prediccion.categoria === 'Excelente') {
        precision += 10;
        factores.push("Duración larga predicha correctamente");
    } else if (observacion.duracionFenomeno <= 5 && prediccion.categoria === 'Malo') {
        precision += 10;
        factores.push("Duración corta predicha correctamente");
    } else {
        precision += 5;
    }

    return {
        porcentaje: Math.min(100, Math.max(0, precision)),
        factores: factores,
        detalles: {
            diferenciaPuntaje,
            precisionCategoria,
            fenomenoDetectado: observacion.tipoFenomeno
        }
    };
};

// Función para obtener estadísticas de precisión
export const obtenerEstadisticasPrecision = async () => {
    try {
        const contenido = await fs.readFile(VALIDATION_FILE, 'utf8');
        const validaciones = JSON.parse(contenido);
        
        if (validaciones.length === 0) {
            return { mensaje: "No hay validaciones disponibles" };
        }

        const precisiones = validaciones.map(v => v.precision.porcentaje);
        const promedio = precisiones.reduce((a, b) => a + b, 0) / precisiones.length;
        
        const porCategoria = validaciones.reduce((acc, v) => {
            const cat = v.prediccion.categoria;
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(v.precision.porcentaje);
            return acc;
        }, {});

        const estadisticasPorCategoria = Object.entries(porCategoria).map(([categoria, precisiones]) => ({
            categoria,
            promedio: precisiones.reduce((a, b) => a + b, 0) / precisiones.length,
            total: precisiones.length
        }));

        return {
            totalValidaciones: validaciones.length,
            precisionPromedio: Math.round(promedio * 100) / 100,
            mejorPrecision: Math.max(...precisiones),
            peorPrecision: Math.min(...precisiones),
            porCategoria: estadisticasPorCategoria,
            ultimasValidaciones: validaciones.slice(-5)
        };
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return { error: "No se pudieron obtener las estadísticas" };
    }
};

// Función para obtener recomendaciones basadas en validaciones históricas
export const obtenerRecomendacionesMejora = async () => {
    try {
        const estadisticas = await obtenerEstadisticasPrecision();
        const recomendaciones = [];

        if (estadisticas.precisionPromedio < 70) {
            recomendaciones.push({
                prioridad: "ALTA",
                area: "Algoritmo general",
                problema: "Precisión general baja",
                sugerencia: "Revisar y ajustar los pesos de los factores en el algoritmo de puntuación"
            });
        }

        // Analizar precisión por categoría
        estadisticas.porCategoria?.forEach(cat => {
            if (cat.promedio < 60) {
                recomendaciones.push({
                    prioridad: "MEDIA",
                    area: `Categoría ${cat.categoria}`,
                    problema: `Baja precisión en predicciones "${cat.categoria}"`,
                    sugerencia: `Ajustar umbrales o criterios para la categoría ${cat.categoria}`
                });
            }
        });

        return recomendaciones;
    } catch (error) {
        console.error('Error al generar recomendaciones:', error);
        return [];
    }
};

// Ejemplo de uso para probar el sistema
export const ejemploValidacion = async () => {
    const prediccionEjemplo = {
        puntajeNumerico: 85,
        prediccion: "Bueno",
        razon: "Configuración de nubes ideal, Índice UV óptimo para colores intensos",
        confianza: 90,
        humedad: 78,
        viento: 12,
        uvIndex: 6,
        visibilidad: 8.5,
        temperatura: 18
    };

    const observacionEjemplo = {
        calidadAtardecer: 9, // Excelente atardecer
        tipoFenomeno: 'cielo_incendiado',
        coloresIntensidad: 9,
        visibilidadReal: 8,
        duracionFenomeno: 25,
        comentarios: "Atardecer espectacular con colores rojos y naranjas intensos"
    };

    return await guardarValidacion("2025-08-04", prediccionEjemplo, observacionEjemplo);
};
