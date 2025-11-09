import { Router } from 'express';
import { validarTokenQR } from '../controllers/qr.controller.js';

const router = Router();

//Ruta para el vigilante cuando escanee el QR
router.get('/qr/validar/:token', validarTokenQR);

export default router;