import { Router } from 'express'
import { getDashboardStats} from "../controllers/estadisticas.controller.js";
// Importa tu middleware de verificación de token si quieres proteger la ruta

const router = Router();

// Ruta para obtener las estadísticas de los estados de los cajones
router.get("/estadisticas/dashboard", getDashboardStats);

export default router;