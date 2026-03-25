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
