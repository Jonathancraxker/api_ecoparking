import { pool } from '../config/db.js';

export const _getComisionesByUserId = async (userId) => {
    const [rows] = await pool.execute(
        `SELECT c.comision 
         FROM comisiones_usuarios cu
         JOIN comisiones c ON cu.id_comision = c.id_comision
         WHERE cu.id_usuario = ?`,
        [userId]
    );
    return rows.map(row => row.comision);
};

export const _getEspecialidadesByUserId = async (userId) => {
    const [rows] = await pool.execute(
        `SELECT te.especialidad
         FROM especialidades_usuario eu
         JOIN tipos_especialidades te ON eu.id_tipo_especialidad = te.id
         WHERE eu.id_usuario = ?`,
        [userId]
    );
    return rows.map(row => row.especialidad);
};

export const getComisionesPerfil = async (req, res) => {
    try {
        const userId = req.user.id; 
        const comisiones = await _getComisionesByUserId(userId);
        return res.json(comisiones);
    } catch (error) {
        console.error("Error al obtener las comisiones del usuario:", error);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Error interno del servidor al obtener comisiones" });
        }
    }
};

export const getEspecialidadesPerfil = async (req, res) => {
    try {
        const userId = req.user.id;
        const especialidades = await _getEspecialidadesByUserId(userId);
        return res.json(especialidades);
    } catch (error) {
        console.error("Error al obtener las especialidades del usuario:", error);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Error interno del servidor al obtener especialidades" });
        }
    }
};