import { pool } from '../config/db.js'

export async function getAllCajones() {
    const connection = await pool.getConnection()
    try {
        const query = "SELECT * FROM cajones ORDER BY numero_cajon"
        const [rows] = await connection.query(query)
        return rows
    } finally {
        connection.release()
    }
}

export async function createCajon(data) {
    const { numero_cajon, estado } = data
    const connection = await pool.getConnection()
    try {
        const query = `
            INSERT INTO cajones (numero_cajon, estado)
            VALUES (?, ?)
        `
        const [result] = await connection.execute(query, [
            numero_cajon,
            estado || 'Disponible'
        ])
        return result.insertId
    } finally {
        connection.release()
    }
    
}

// Editar un cajón
export async function updateCajon(id, data) {
    const { numero_cajon, estado } = data;
    const connection = await pool.getConnection();
    try {
        const query = "UPDATE cajones SET numero_cajon = ?, estado = ? WHERE id = ?";
        await connection.execute(query, [numero_cajon, estado, id]);
        return true;
    } finally {
        connection.release();
    }
}

// Eliminar un cajón
export async function deleteCajon(id) {
    const connection = await pool.getConnection();
    try {
        const query = "DELETE FROM cajones WHERE id = ?";
        await connection.execute(query, [id]);
        return true;
    } finally {
        connection.release();
    }
}

// cajones.model.js
export async function getCajonesDisponibles() {
    const connection = await pool.getConnection()
    try {
        // Verifica si tu tabla se llama 'cajones' o 'Cajones' (MySQL es sensible a mayúsculas en Linux)
        const query = "SELECT * FROM cajones WHERE estado = 'Disponible'" 
        const [rows] = await connection.query(query)
        return rows
    } finally {
        connection.release()
    }
}

// Función para cambiar el estado (se usará al registrar la cita)
export async function actualizarEstadoCajon(id, estado, connection) {
    const query = "UPDATE cajones SET estado = ? WHERE id = ?"
    // Usamos la conexión que viene por parámetro para mantener la transacción
    await connection.query(query, [estado, id])
}

export async function getCajonesDisponiblesPorFechaHora(fecha_inicio, fecha_fin, hora_inicio, hora_fin, id_cita_excluir = null) {
    const connection = await pool.getConnection();
    try {
        let subQuery = `
            SELECT id_cajon FROM registro_citas 
            WHERE id_cajon IS NOT NULL 
            AND estado_cita != 'Cancelada'
            AND CONCAT(fecha_fin, ' ', hora_fin) > CONCAT(?, ' ', ?)
            AND CONCAT(fecha_inicio, ' ', hora_inicio) < CONCAT(?, ' ', ?)
        `;
        
        const queryParams = [fecha_inicio, hora_inicio, fecha_fin, hora_fin];

        if (id_cita_excluir) {
            subQuery += ` AND id != ?`;
            queryParams.push(id_cita_excluir);
        }

        const query = `
            SELECT * FROM cajones 
            WHERE estado != 'Mantenimiento' 
            AND id NOT IN (${subQuery})
        `;
        
        const [rows] = await connection.query(query, queryParams);
        return rows;
    } finally {
        connection.release();
    }
}