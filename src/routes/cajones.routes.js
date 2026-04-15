import { Router } from 'express'
import * as controller from '../controllers/cajones.controller.js'
import { authToken } from "../middlewares/validarToken.js";

const router = Router()

router.get('/api/cajones', controller.listar)
router.post('/api/cajones', controller.crear)
router.get('/api/cajones/disponibles', controller.listarDisponibles)
router.post('/api/cajones/filtrar-disponibles', controller.listarDisponiblesFiltrados);

export default router