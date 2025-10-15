import { pool } from '../config/db.js';
import path from 'path';
import fs from 'fs';

// Validar Nombres de Columnas de Documentos
const DOCUMENT_COLUMN_NAMES = [
    'curp', 'cv', 'cedula', 'titulo', 'comprobante_domicilio', 'csf', 'ine', 'credencial'
];

export const getAllDocuments = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT
                u.id AS id_usuario,
                u.nombre AS nombre_usuario,
                u.correo AS correo_usuario,
                d.id,
                d.curp,
                d.cv,
                d.cedula,
                d.titulo,
                d.comprobante_domicilio,
                d.csf,
                d.ine,
                d.credencial
            FROM
                usuarios u
            LEFT JOIN
                documentos d ON u.id = d.id_usuario
            ORDER BY
                u.id
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener los documentos:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener los documentos." });
    } finally {
        connection.release();
    }
};

export const viewDocumentAsAdmin = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // --- DIFERENCIA CLAVE: Obtenemos el ID del usuario desde la URL ---
        const { userId, docType } = req.params;

        // Validamos el tipo de documento
        if (!DOCUMENT_COLUMN_NAMES.includes(docType)) { // Asumiendo que tienes esta lista
            return res.status(400).json({ message: "Tipo de documento no válido." });
        }

        // Buscamos la ruta del documento para el usuario especificado
        const [rows] = await connection.query(
            `SELECT ?? FROM documentos WHERE id_usuario = ?`,
            [docType, userId]
        );
        
        const documentRecord = rows[0];

        if (!documentRecord || !documentRecord[docType]) {
            return res.status(404).json({ message: "Documento no encontrado para el usuario especificado." });
        }

        const relativePath = documentRecord[docType];
        const absolutePath = path.join(process.cwd(), 'uploads_privates', relativePath);

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: "El archivo no se encuentra físicamente." });
        }

        res.sendFile(absolutePath);

    } catch (error) {
        console.error("Error al servir documento como admin:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    } finally {
        if (connection) connection.release();
    }
};

// Controlador para actualizar/subir un documento por un administrador
export const updateDocumentoByAdmin = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // --- CORRECCIÓN AQUÍ ---
        // La ruta es '/documentos/:id', por lo tanto, leemos `req.params.id`.
        // Usamos la desestructuración con renombrado para asignar req.params.id a la variable id_usuario
        // y así no tener que cambiar el resto del código de la función.
        const { id: id_usuario } = req.params;

        if (!id_usuario) {
            // Esta validación es importante por si el parámetro no viene en la URL
            return res.status(400).json({ message: "No se proporcionó el ID de usuario en la ruta." });
        }
        
        // Obtener el tipo de documento del fieldname del archivo subido
        const uploadedFileKeys = Object.keys(req.files || {}); 
        if (uploadedFileKeys.length === 0) {
            return res.status(400).json({ message: "No se proporcionó ningún archivo para la actualización." });
        }
        const docType = uploadedFileKeys[0]; // Tomamos el primer (y único) tipo de documento subido
        const uploadedFile = req.files[docType][0]; // El objeto de archivo de Multer

        if (!uploadedFile || !docType || !DOCUMENT_COLUMN_NAMES.includes(docType)) {
            return res.status(400).json({ message: `Archivo o tipo de documento '${docType}' no válido.` });
        }
        
        const ruta_archivo_relativa = path.join( String(id_usuario), uploadedFile.filename); 
        const columnName = docType; 

        await connection.beginTransaction();

        // Usar INSERT ... ON DUPLICATE KEY UPDATE para insertar/actualizar la fila de documentos del usuario
        // Basado en el id_usuario
        const [result] = await connection.query(
            `INSERT INTO documentos (id_usuario, ${columnName})
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE ${columnName} = VALUES(${columnName})`, 
            [id_usuario, ruta_archivo_relativa]
        );

        await connection.commit();

        res.status(200).json({
            message: `Documento '${docType}' para usuario ${id_usuario} actualizado exitosamente.`,
            ruta_archivo: ruta_archivo_relativa 
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error al actualizar documento por Admin (ID Usuario):", error);
        res.status(500).json({ message: "Error interno del servidor al actualizar el documento por Admin." });
    } finally {
        connection.release();
    }
};


// Controlador para eliminar un documento específico para un usuario dado.
export const deleteDocumento = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id_usuario, docType } = req.params; // Obtenemos el id_usuario y el tipo de documento de la URL

        if (!id_usuario || !docType || !DOCUMENT_COLUMN_NAMES.includes(docType)) {
            return res.status(400).json({ message: "ID de usuario o tipo de documento no válido/especificado." });
        }

        const columnName = docType; // La columna a poner a NULL (ej. 'curp')

        // 1. Obtener la ruta del archivo antes de ponerla a NULL para poder eliminar el archivo físico
        const [docResult] = await connection.query(
            `SELECT ${columnName} FROM documentos WHERE id_usuario = ?`, 
            [id_usuario]
        );
        const documentRow = docResult[0]; // La única fila de documentos para este usuario

        if (!documentRow || !documentRow[columnName]) {
            // Si no hay fila de documentos para el usuario, o la columna ya es NULL, no hay nada que eliminar.
            return res.status(404).json({ message: `Documento '${docType}' no encontrado o ya eliminado para el usuario ${id_usuario}.` });
        }

        const oldFilePathRelative = documentRow[columnName]; 

        // --- CORRECCIÓN AQUÍ ---
        // Se elimina la consulta duplicada y se asegura de que se use la variable correcta (id_usuario).
        // 2. Actualizar la columna del documento a NULL en la base de datos
        const [result] = await connection.query(
            `UPDATE documentos SET ${columnName} = NULL WHERE id_usuario = ?`,
            [id_usuario]
        );

        if (result.affectedRows === 0) {
            // Esto no debería pasar si documentRow existía, pero es una buena salvaguarda.
            return res.status(404).json({ message: "Registro de documento no encontrado para actualizar (a NULL)." });
        }

        // 3. Eliminar el archivo físico del disco (opcional pero recomendado)
        if (oldFilePathRelative) {
            const fullPath = path.join(process.cwd(), 'uploads', oldFilePathRelative);
            fs.unlink(fullPath, (err) => {
                if (err) console.error(`Error al eliminar archivo físico ${fullPath}:`, err);
            });
        }

        res.status(200).json({ message: `Documento '${docType}' eliminado exitosamente para el usuario ${id_usuario}.` });

    } catch (error) {
        console.error("Error al eliminar documento por Admin (ID Usuario):", error);
        res.status(500).json({ message: "Error interno del servidor al eliminar el documento por Admin." });
    } finally {
        connection.release();
    }
};