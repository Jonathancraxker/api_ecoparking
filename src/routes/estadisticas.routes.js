import { Router } from 'express'
import { getDashboardStats} from "../controllers/estadisticas.controller.js";

const router = Router();

// Ruta para obtener las estadísticas de los estados de los cajones
router.get("/estadisticas/dashboard", getDashboardStats);

export default router;