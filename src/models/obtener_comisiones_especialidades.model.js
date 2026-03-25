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
