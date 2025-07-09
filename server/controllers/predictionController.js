import fs from 'fs/promises';
import { config } from '../config/index.js';

export const getPrediction = async (req, res) => {
    try {
        const pronosticoGuardado = await fs.readFile(config.pronosticoFilePath, 'utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.json(JSON.parse(pronosticoGuardado));
    } catch (error) {
        console.error("Error al leer el archivo de pronóstico:", error.message);
        res.status(503).json({ message: "El servicio de pronóstico está inicializándose. Inténtalo de nuevo en un minuto." });
    }
};