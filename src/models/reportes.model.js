import { pool } from '../config/db.js';

export async function getAllReportes() {
    const connection = await pool.getConnection();
    try {
        const query = `
          SELECT 
            r.id AS reporte_id,
            r.fecha AS fecha_reporte,
            c.id AS cita_id,
            c.motivo AS motivo_cita,
            u.nombre AS nombre_usuario,
            u.correo AS correo_usuario,
            u.tipo_usuario
          FROM reportes r
          JOIN registro_citas c ON r.id_cita = c.id
          JOIN usuarios u ON c.id_usuario = u.id
          ORDER BY r.fecha DESC, r.id DESC
        `;
        const [rows] = await connection.query(query);
        return rows;
    } catch (error) {
        console.error("Error en el modelo al obtener reportes:", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function createReporte(idCita) {
    const connection = await pool.getConnection();
    try {
        const query = "INSERT INTO reportes (id_cita) VALUES (?)";
        const [result] = await connection.execute(query, [idCita]);
        return result.insertId;
    } catch (error) {
        console.error("Error en el modelo al crear reporte:", error);
        throw error;
    } finally {
        connection.release();
    }
}


export async function findReporteByCitaToday(idCita) {
    const connection = await pool.getConnection();
    try {
        const query = "SELECT * FROM reportes WHERE id_cita = ? AND DATE(fecha) = CURDATE()";
        const [rows] = await connection.execute(query, [idCita]);
        return rows[0];
    } catch (error) {
        console.error("Error en el modelo al buscar reporte:", error);
        throw error;
    } finally {
        connection.release();
    }
}


export async function getReporteById(idReporte) {
    const connection = await pool.getConnection();
    try {
        const query = `
          SELECT 
            r.id AS reporte_id,
            r.fecha AS fecha_reporte,
            c.id AS cita_id,
            c.motivo AS motivo_cita,
            u.nombre AS nombre_usuario,
            u.correo AS correo_usuario,
            u.tipo_usuario
          FROM reportes r
          JOIN registro_citas c ON r.id_cita = c.id
          JOIN usuarios u ON c.id_usuario = u.id
          WHERE r.id = ?
        `;
        const [rows] = await connection.query(query, [idReporte]);
        return rows[0];
    } catch (error) {
        console.error("Error en el modelo (getReporteById):", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function getTodasFechasDeCitas() {
    const connection = await pool.getConnection();
    try {
        const query = "SELECT fecha_inicio FROM registro_citas WHERE estado_cita = 'Confirmada'";
        const [rows] = await connection.query(query);
        return rows.map(r => new Date(r.fecha_inicio));
    } catch (error) {
        console.error("Error en el modelo (getTodasFechasDeCitas):", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function getHorasInicioCitas() {
    const connection = await pool.getConnection();
    try {
        const query = "SELECT hora_inicio FROM registro_citas WHERE estado_cita = 'Confirmada' AND hora_inicio IS NOT NULL AND hora_inicio != ''";
        const [rows] = await connection.query(query);
        return rows.map(r => r.hora_inicio);
    } catch (error) {
        console.error("Error en el modelo (getHorasInicioCitas):", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function getTopDivisiones() {
    const connection = await pool.getConnection();
    try {
        const query = `
            SELECT u.division, COUNT(rc.id) AS cantidad
            FROM registro_citas rc
            JOIN usuarios u ON rc.id_usuario = u.id
            WHERE rc.estado_cita = 'Confirmada'
              AND u.division IS NOT NULL AND u.division != ''
            GROUP BY u.division
            ORDER BY cantidad DESC
            LIMIT 5
        `;
        const [rows] = await connection.query(query);
        return rows;
    } catch (error) {
        console.error("Error en el modelo (getTopDivisiones):", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function getTopEmpresas() {
    const connection = await pool.getConnection();
    try {
        const query = `
            SELECT i.empresa, COUNT(i.id) AS cantidad
            FROM invitados i
            JOIN registro_citas rc ON i.id_cita = rc.id
            WHERE rc.estado_cita = 'Confirmada'
              AND i.empresa IS NOT NULL AND i.empresa != ''
            GROUP BY i.empresa
            ORDER BY cantidad DESC
            LIMIT 5
        `;
        const [rows] = await connection.query(query);
        return rows;
    } catch (error) {
        console.error("Error en el modelo (getTopEmpresas):", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function getTopTipoVisitante() {
    const connection = await pool.getConnection();
    try {
        const query = `
            SELECT i.tipo_visitante, COUNT(i.id) AS cantidad
            FROM invitados i
            JOIN registro_citas rc ON i.id_cita = rc.id
            WHERE rc.estado_cita = 'Confirmada'
              AND i.tipo_visitante IS NOT NULL AND i.tipo_visitante != ''
            GROUP BY i.tipo_visitante
            ORDER BY cantidad DESC
            LIMIT 5
        `;
        const [rows] = await connection.query(query);
        return rows;
    } catch (error) {
        console.error("Error en el modelo (getTopTipoVisitante):", error);
        throw error;
    } finally {
        connection.release();
    }
}

export async function getDatosHistoricosMensuales(fechaHoy) {
    const connection = await pool.getConnection(); 
    try {
        const query = `
            SELECT 
                YEAR(STR_TO_DATE(fecha_inicio, '%Y-%m-%d')) AS anio,
                MONTH(STR_TO_DATE(fecha_inicio, '%Y-%m-%d')) AS mes,
                COUNT(id) AS total_citas
            FROM registro_citas
            WHERE 
                estado_cita = 'Confirmada' 
                AND STR_TO_DATE(fecha_inicio, '%Y-%m-%d') < DATE_FORMAT(?, '%Y-%m-01') 
            GROUP BY 
                anio, mes
            ORDER BY 
                anio ASC, mes ASC;
        `;
        const [rows] = await connection.query(query, [fechaHoy]); 
        return rows;
    } catch (error) {
        console.error("Error en el modelo (getDatosHistoricosMensuales):", error);
        throw error;
    } finally {
        connection.release(); 
    }
}