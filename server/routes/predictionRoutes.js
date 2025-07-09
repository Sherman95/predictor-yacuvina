import { Router } from 'express';
import { getPrediction } from '../controllers/predictionController.js';

const router = Router();

router.get('/', getPrediction);

export default router;