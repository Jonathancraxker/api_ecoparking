import { pool } from '../config/db.js';
import path from 'path';
import fs from 'fs';

// 2. Asegúrate de que esta lista de columnas esté disponible para la nueva función
const DOCUMENT_COLUMN_NAMES = [
    'curp', 'cv', 'cedula', 'titulo', 'comprobante_domicilio', 'csf', 'ine', 'credencial'
];

export const viewUserDocument = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Obtenemos el ID del usuario del token que ya fue verificado por 'authToken'
        const { id: userId } = req.user; 
        const { docType } = req.params;

        // Validamos que el tipo de documento solicitado sea uno de los permitidos
        if (!DOCUMENT_COLUMN_NAMES.includes(docType)) {
            return res.status(400).json({ message: "Tipo de documento no válido." });
        }

        // Consultamos la BD para obtener la ruta del archivo que le pertenece
        // ÚNICAMENTE al usuario autenticado.
        const [rows] = await connection.query(
            // Usamos '??' para el nombre de la columna para que la librería lo escape
            // y '?' para el valor, previniendo inyección SQL.
            `SELECT ?? FROM documentos WHERE id_usuario = ?`,
            [docType, userId] 
        );
        
        const documentRecord = rows[0];

        // Si no hay registro o la columna para ese documento es NULL, no existe.
        if (!documentRecord || !documentRecord[docType]) {
            return res.status(404).json({ message: "Documento no encontrado para este usuario." });
        }

        const relativePath = documentRecord[docType];

        // Construimos la ruta absoluta al archivo, apuntando a tu carpeta privada.
        // ¡Asegúrate de que 'uploads_privados' coincida con el nombre de tu carpeta!
        const absolutePath = path.join(process.cwd(), 'uploads_privates', relativePath);

        // Verificamos que el archivo realmente exista físicamente en el disco.
        if (!fs.existsSync(absolutePath)) {
            console.error(`Error de Inconsistencia: El archivo no se encuentra en la ruta: ${absolutePath}`);
            return res.status(404).json({ message: "El archivo no se encuentra físicamente en el servidor." });
        }

        // Si todas las verificaciones pasan, enviamos el archivo.
        // Express se encargará de los 'Content-Type' correctos (ej. 'application/pdf').
        res.sendFile(absolutePath);

    } catch (error) {
        console.error("Error al servir el documento de forma segura:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    } finally {
        if (connection) connection.release();
    }
};