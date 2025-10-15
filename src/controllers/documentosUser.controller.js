// /controllers/userDocuments.controller.js

import { pool } from '../config/db.js';
import path from 'path';
import fs from 'fs';

// 1. **Controlador `getDocumentsByUserId` (GET /documentos/user)**
// Para el usuario normal: Obtiene todos los documentos del usuario logueado.
export const getDocumentosByUserId = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userId = req.user.id; // ID del usuario del token autenticado

        if (!userId) {
            return res.status(401).json({ message: "Usuario no autenticado para obtener documentos." });
        }

        const [rows] = await connection.query(
            `SELECT 
                id, id_usuario,
                curp, cv, cedula, titulo,
                comprobante_domicilio, csf, ine, credencial
            FROM documentos WHERE id_usuario = ?`,
            [userId]
        );

        // Si no hay fila de documentos para el usuario, devuelve un objeto vacío
        const userDocuments = rows[0] || {}; 

        res.status(200).json(userDocuments); 
    } catch (error) {
        console.error("Error al obtener documentos por usuario:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener documentos." });
    } finally {
        connection.release();
    }
};

// 2. **Controlador `updateDocumento` (PATCH /documentos/:docType)**
// Para el usuario normal: Sube/actualiza SU propio documento de un tipo específico.
// También maneja la creación de la fila inicial de documentos para el usuario (UPSERT).
export const updateDocumentosByUser = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { docType } = req.params; // Viene de la URL (ej. 'curp')
        const userId = req.user.id;    // Viene del token autenticado (ID del usuario que sube)

        const DOCUMENT_COLUMN_NAMES = [ // Definir aquí para validación
            'curp', 'cv', 'cedula', 'titulo', 'comprobante_domicilio', 'csf', 'ine', 'credencial'
        ];

        // Validaciones
        if (!userId) return res.status(401).json({ message: "Usuario no autenticado." });
        if (!docType || !DOCUMENT_COLUMN_NAMES.includes(docType)) { 
            return res.status(400).json({ message: `Tipo de documento '${docType}' no válido o no especificado.` });
        }

        const uploadedFileKeys = Object.keys(req.files || {}); 
        if (uploadedFileKeys.length === 0) {
            return res.status(400).json({ message: "No se proporcionó ningún archivo para la actualización." });
        }
        const uploadedFile = req.files[docType] ? req.files[docType][0] : null;

        if (!uploadedFile) { 
            return res.status(400).json({ message: `No se proporcionó archivo para el tipo de documento '${docType}'.` });
        }
        
        const ruta_archivo_relativa = path.join('profile', String(userId), uploadedFile.filename); 
        const columnName = docType; 

        await connection.beginTransaction();

        // Insertar o Actualizar la ruta del documento en la tabla 'documentos'
        // Esto inserta una nueva fila para el usuario si no existe (id_usuario es UNIQUE KEY)
        // O actualiza la columna específica si la fila del usuario ya existe.
        const [result] = await connection.query(
            `INSERT INTO documentos (id_usuario, ${columnName})
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE ${columnName} = VALUES(${columnName})`, 
            [userId, ruta_archivo_relativa]
        );

        await connection.commit();

        res.status(200).json({
            message: `Documento '${docType}' subido/actualizado exitosamente.`,
            ruta_archivo: ruta_archivo_relativa 
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error al actualizar documento:", error);
        res.status(500).json({ message: "Error interno del servidor al actualizar el documento." });
    } finally {
        connection.release();
    }
};