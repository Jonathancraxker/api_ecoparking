import { Router } from "express";
import { 
    getReportes, 
    crearReporte,
    generarReportePDF,
    getEstadisticas,
    getPrediccionSiguienteMes
} from "../controllers/reportes.controller.js";
import { authToken } from "../middlewares/validarToken.js";
import { isAdmin } from "../middlewares/isAdmin.js";

const router = Router();

// Ruta para VISUALIZAR la tabla de reportes
router.get(
    '/optener-reportes', // Tu endpoint
    authToken,
    isAdmin,
    getReportes
);

// Ruta para CREAR un nuevo reporte desde el formulario
router.post(
    '/dar-reportes', // Tu endpoint
    authToken,
    isAdmin,
    crearReporte
);

// Ruta para generar el PDF individual
router.get(
    '/reportes/generar-pdf/:id', // :id es un parámetro
    authToken,
    isAdmin,
    generarReportePDF // Llama a la nueva función
);

// Ruta para las Estadísticas (Dashboard principal)
router.get(
    '/reportes/estadisticas',
    authToken,
    isAdmin,
    getEstadisticas
);

// Ruta para la Predicción del Siguiente Mes
router.get(
    '/reportes/prediccion-siguiente-mes',
    authToken,
    isAdmin,
    getPrediccionSiguienteMes
);

export default router;