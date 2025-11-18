// Archivo: src/controllers/reportes.controller.js
// (PRUEBA: Con la lógica del logo comentada)

import { 
    getAllReportes, 
    createReporte, 
    findReporteByCitaToday,
    getReporteById,
    getTodasFechasDeCitas,
    getHorasInicioCitas,
    getDatosHistoricosMensuales,
    getTopDivisiones,
    getTopEmpresas,
    getTopTipoVisitante
} from '../models/reportes.model.js';

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import * as ss from 'simple-statistics';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const getReportes = async (req, res) => {
  // ... (Esta función no cambia)
  try {
    const reportes = await getAllReportes();
    if (!reportes || reportes.length === 0) {
      return res.status(404).json({ message: 'No se encontraron reportes' });
    }
    res.status(200).json(reportes);
  } catch (error) {
    console.error("Error en controlador (getReportes):", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const crearReporte = async (req, res) => {
  // ... (Esta función no cambia)
  const { id_cita } = req.body;
  if (!id_cita) {
    return res.status(400).json({ message: "El ID de la cita es obligatorio" });
  }
  try {
    const reporteExistente = await findReporteByCitaToday(id_cita);
    if (reporteExistente) {
      return res.status(400).json({ message: "Esta cita ya fue reportada el día de hoy" });
    }
    const nuevoReporteId = await createReporte(id_cita);
    res.status(201).json({ 
      id: nuevoReporteId, 
      message: "Reporte creado exitosamente" 
    });
  } catch (error) {
    console.error("Error en controlador (crearReporte):", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

/**
 * Genera un PDF si no existe, lo GUARDA, y luego lo DESCARGA.
 */
export const generarReportePDF = async (req, res) => {
  try {
    const { id } = req.params; 
    const idUsuarioLogueado = req.user.id; 

    if (!idUsuarioLogueado) {
        return res.status(401).json({ message: "No se pudo identificar al usuario desde el token." });
    }

    const nombreArchivo = `reporte_${id}.pdf`;
    const rutaBase = path.join(__dirname, '..', '..', 'uploads_privates');
    const rutaCarpetaUsuario = path.join(rutaBase, String(idUsuarioLogueado));
    const rutaCompleta = path.join(rutaCarpetaUsuario, nombreArchivo);

    if (fs.existsSync(rutaCompleta)) {
      console.log(`Sirviendo archivo existente: ${rutaCompleta}`);
      return res.download(rutaCompleta, nombreArchivo);
    }

    console.log(`Creando nuevo archivo: ${rutaCompleta}`);

    const reporte = await getReporteById(id);
    if (!reporte) {
      return res.status(404).json({ message: "Reporte no encontrado" });
    }

    if (!fs.existsSync(rutaCarpetaUsuario)) {
      fs.mkdirSync(rutaCarpetaUsuario, { recursive: true });
    }

    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(rutaCompleta);
    doc.pipe(stream);

    const rutaLogo = path.join(rutaBase, 'ecoparking.jpg'); 

    if (fs.existsSync(rutaLogo)) {
        doc.image(rutaLogo, {
            fit: [80, 80],
            align: 'right',
            valign: 'top',
            x: doc.page.width - 130, 
            y: 30 
        });
        doc.moveDown(3); 
    } else {
        console.warn("ADVERTENCIA: No se encontró el logo.jpg en la carpeta uploads_privates.");
    }

    // Añadimos el contenido (ahora alineado al centro de nuevo)
    doc.fontSize(18).text("Reporte Individual de Acceso - Ecoparking", { 
        align: 'center'
    });
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`ID Reporte: ${reporte.reporte_id}`);
    doc.text(`Fecha de Acceso: ${reporte.fecha_reporte}`);
    doc.moveDown();

    doc.text('Detalle de la Cita:', { underline: true });
    doc.text(`ID Cita: ${reporte.cita_id}`);
    doc.text(`Motivo: ${reporte.motivo_cita}`);
    doc.moveDown();
    
    doc.text('Detalle del Usuario (Creador):', { underline: true });
    doc.text(`Nombre: ${reporte.nombre_usuario}`);
    doc.text(`Correo: ${reporte.correo_usuario}`);
    doc.text(`Tipo: ${reporte.tipo_usuario}`);
    doc.end();

    // Esperamos a que se guarde Y LUEGO lo descargamos
    stream.on('finish', () => {
      console.log(`Archivo nuevo guardado. Enviando: ${rutaCompleta}`);
      res.download(
        rutaCompleta,
        nombreArchivo,
        (err) => {
          if (err) {
            console.error("Error al enviar el PDF al cliente:", err);
            if (!res.headersSent) {
              res.status(500).json({ message: "Error al descargar el archivo." });
            }
          }
        }
      );
    });

    stream.on('error', (err) => {
      throw err;
    });

  } catch (error) {
    console.error("Error al generar PDF en servidor:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error interno al generar el PDF" });
    }
  }
};

// --- (Funciones de cálculo no cambian) ---
function calcularMedia(datos) {
    if (datos.length === 0) return 0;
    const suma = datos.reduce((acc, val) => acc + val, 0);
    return (suma / datos.length).toFixed(2);
}
function calcularMediana(datos) {
    if (datos.length === 0) return 0;
    const sorted = [...datos].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2);
    } else {
        return sorted[mid];
    }
}

// --- (Funciones Helper de Estadísticas de Afluencia no cambian) ---
const getDayName = (date) => new Date(date).toLocaleString('es-MX', { weekday: 'long' });
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
  return weekNo;
};
const getMonthYear = (date) => `${date.getFullYear()}-${date.getMonth() + 1}`;
const findMostFrequent = (arr) => {
    if (arr.length === 0) return "N/A";
    const counts = arr.reduce((acc, value) => {
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
};


// --- CONTROLADOR 1: Estadísticas del Dashboard Principal (NO CAMBIA) ---
export const getEstadisticas = async (req, res) => {
    try {
        const [
            fechasDeCitas,
            horasInicioCitas,
            topDivisiones,
            topEmpresas,
            topTipoVisitante
        ] = await Promise.all([
            getTodasFechasDeCitas(),
            getHorasInicioCitas(),
            getTopDivisiones(),
            getTopEmpresas(),
            getTopTipoVisitante()
        ]);

        let estadisticasVisitas = {};
        if (fechasDeCitas.length > 0) {
            const visitasPorDia = {};
            const visitasPorSemana = {};
            const visitasPorMes = {};
            const diasDeSemana = [];
            fechasDeCitas.forEach(fecha => {
                const dia = fecha.toISOString().split('T')[0];
                const semana = `${fecha.getFullYear()}-${getWeekNumber(fecha)}`;
                const mes = getMonthYear(fecha);
                const diaSemana = getDayName(fecha);
                visitasPorDia[dia] = (visitasPorDia[dia] || 0) + 1;
                visitasPorSemana[semana] = (visitasPorSemana[semana] || 0) + 1;
                visitasPorMes[mes] = (visitasPorMes[mes] || 0) + 1;
                diasDeSemana.push(diaSemana);
            });
            const conteoVisitasPorDia = Object.values(visitasPorDia);
            const conteoVisitasPorSemana = Object.values(visitasPorSemana);
            const conteoVisitasPorMes = Object.values(visitasPorMes);
            estadisticasVisitas = {
                totalVisitas: fechasDeCitas.length,
                mediaPorDia: calcularMedia(conteoVisitasPorDia),
                mediaPorSemana: calcularMedia(conteoVisitasPorSemana),
                mediaPorMes: calcularMedia(conteoVisitasPorMes),
                medianaVisitas: calcularMediana(conteoVisitasPorDia),
                modaDiaSemana: findMostFrequent(diasDeSemana),
                modaHora: findMostFrequent(horasInicioCitas)
            };
        }
        
        res.status(200).json({
            estadisticasVisitas,
            topDivisiones,
            topEmpresas,
            topTipoVisitante
        });

    } catch (error) {
        console.error("Error en controlador (getEstadisticas):", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

// --- CONTROLADOR 2: Predicción del Siguiente Mes (NO CAMBIA) ---
export const getPrediccionSiguienteMes = async (req, res) => {
    try {
        
        // --- ¡AQUÍ ESTÁ LA SIMULACIÓN! ---
        const hoy = new Date(); // <-- Versión de producción (fecha real)
        // const hoy = new Date('2026-02-15T12:00:00'); // <-- Versión de prueba
        // --- FIN DEL CAMBIO ---

        const datosHistoricos = await getDatosHistoricosMensuales(hoy);

        if (!datosHistoricos || datosHistoricos.length < 2) {
            return res.status(200).json({
                mes_predicho: "Datos insuficientes",
                visitas_predichas: "N/A"
            });
        }

        const data = datosHistoricos.map((d, index) => [index, d.total_citas]);
        const { m, b } = ss.linearRegression(data);
        const proximo_x = data.length;
        const prediccion = (m * proximo_x) + b;
        const proximoMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
        const nombreMes = proximoMes.toLocaleString('es-MX', { 
            month: 'long', 
            year: 'numeric' 
        });

        res.status(200).json({
            mes_predicho: `Predicción para ${nombreMes}`,
            visitas_predichas: Math.round(prediccion) 
        });

    } catch (error) {
        console.error("Error en controlador (getPrediccionSiguienteMes):", error);
        res.status(500).json({ message: "Error interno al calcular la predicción" });
    }
};