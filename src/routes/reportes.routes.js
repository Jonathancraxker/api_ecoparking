// Archivo: src/routes/reportes.routes.js
// (Añadida la nueva ruta de predicción)

import { Router } from "express";
// 1. Importamos todos los controladores
import { 
    getReportes, 
    crearReporte,
    generarReportePDF,
    getEstadisticas,
    getPrediccionSiguienteMes // <-- 1. IMPORTAMOS EL NUEVO
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

// --- ¡NUEVA RUTA AÑADIDA AL FINAL! ---
// Ruta para la Predicción del Siguiente Mes
router.get(
    '/reportes/prediccion-siguiente-mes',
    authToken,
    isAdmin,
    getPrediccionSiguienteMes
);

export default router;