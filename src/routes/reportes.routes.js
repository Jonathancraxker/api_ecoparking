import { Router } from 'express';
import { validarTokenQR } from '../controllers/qr.controller.js';
import { getUsuarios } from '../models/usuarios.model.js';

const router = Router();

//Ruta para el vigilante cuando escanee el QR
router.get('/qr/validar/:token', validarTokenQR);

//reportes
router.get('/reportes/', getUsuarios); //Obtener todos los usuarios

export default router;