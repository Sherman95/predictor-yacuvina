import express from 'express';
import { guardarValidacion, obtenerEstadisticasPrecision, obtenerRecomendacionesMejora, ejemploValidacion } from '../services/validationService.js';

const router = express.Router();

// Middleware para parsear JSON
router.use(express.json());

// POST: Guardar una nueva validación
router.post('/validar', async (req, res) => {
    try {
        const { fecha, prediccionOriginal, observacionReal, fotos } = req.body;
        
        if (!fecha || !prediccionOriginal || !observacionReal) {
            return res.status(400).json({
                error: "Faltan datos requeridos: fecha, prediccionOriginal, observacionReal"
            });
        }

        const resultado = await guardarValidacion(fecha, prediccionOriginal, observacionReal, fotos);
        
        res.json({
            mensaje: "Validación guardada exitosamente",
            validacion: resultado
        });
    } catch (error) {
        console.error('Error en /validar:', error);
        res.status(500).json({
            error: "Error interno del servidor al guardar validación"
        });
    }
});

// GET: Obtener estadísticas de precisión
router.get('/estadisticas', async (req, res) => {
    try {
        const estadisticas = await obtenerEstadisticasPrecision();
        res.json(estadisticas);
    } catch (error) {
        console.error('Error en /estadisticas:', error);
        res.status(500).json({
            error: "Error al obtener estadísticas"
        });
    }
});

// GET: Obtener recomendaciones de mejora
router.get('/recomendaciones', async (req, res) => {
    try {
        const recomendaciones = await obtenerRecomendacionesMejora();
        res.json({
            recomendaciones,
            total: recomendaciones.length
        });
    } catch (error) {
        console.error('Error en /recomendaciones:', error);
        res.status(500).json({
            error: "Error al obtener recomendaciones"
        });
    }
});

// POST: Crear validación de ejemplo (para testing)
router.post('/ejemplo', async (req, res) => {
    try {
        const resultado = await ejemploValidacion();
        res.json({
            mensaje: "Validación de ejemplo creada",
            validacion: resultado
        });
    } catch (error) {
        console.error('Error en /ejemplo:', error);
        res.status(500).json({
            error: "Error al crear validación de ejemplo"
        });
    }
});

export default router;
