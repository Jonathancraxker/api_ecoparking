import { Router } from 'express'
import * as controller from '../controllers/cajones.controller.js'


const router = Router()

router.get('/api/cajones', controller.listar)
router.post('/api/cajones', controller.crear)
router.get('/api/cajones/disponibles', controller.listarDisponibles)

export default router
