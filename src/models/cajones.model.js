import { pool } from '../config/db.js'

export async function getAllCajones() {
    const connection = await pool.getConnection()
    try {
        const query = `
            SELECT c.*, u.nombre AS nombre_profesor, u.correo AS correo_profesor 
            FROM cajones c 
            LEFT JOIN usuarios u ON c.id_usuario = u.id 
            ORDER BY c.numero_cajon
        `;
        const [rows] = await connection.query(query)
        return rows
    } finally {
        connection.release()
    }
}

export async function createCajon(data) {
    let { numero_cajon, estado, zona, id_usuario } = data;
    
    if (zona !== 'Profesores' || !id_usuario) {
        id_usuario = null;
    }

    const connection = await pool.getConnection()
    try {
        const query = `
            INSERT INTO cajones (numero_cajon, estado, zona, id_usuario)
            VALUES (?, ?, ?, ?)
        `
        const [result] = await connection.execute(query, [
            numero_cajon,
            estado || 'Disponible',
            zona || 'Invitados',
            id_usuario
        ])
        return result.insertId
    } finally {
        connection.release()
    }
}

export async function updateCajon(id, data) {
    let { numero_cajon, estado, zona, id_usuario } = data;
    
    if (zona !== 'Profesores' || !id_usuario) {
        id_usuario = null;
    }

    const connection = await pool.getConnection();
    try {
        const query = "UPDATE cajones SET numero_cajon = ?, estado = ?, zona = ?, id_usuario = ? WHERE id = ?";
        await connection.execute(query, [numero_cajon, estado, zona, id_usuario, id]);
        return true;
    } finally {
        connection.release();
    }
}

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

export async function getCajonesDisponibles() {
    const connection = await pool.getConnection()
    try {
        const query = "SELECT * FROM cajones WHERE estado = 'Disponible'" 
        const [rows] = await connection.query(query)
        return rows
    } finally {
        connection.release()
    }
}

export async function actualizarEstadoCajon(id, estado, connection) {
    const query = "UPDATE cajones SET estado = ? WHERE id = ?"
    await connection.query(query, [estado, id])
}

export async function getCajonesDisponiblesPorFechaHora(fecha_inicio, fecha_fin, hora_inicio, hora_fin, id_cita_excluir = null) {
    const connection = await pool.getConnection();
    try {
        let subQuery = `
            SELECT i.id_cajon 
            FROM invitados i
            INNER JOIN registro_citas r ON i.id_cita = r.id
            WHERE i.id_cajon IS NOT NULL 
            AND r.estado_cita != 'Cancelada'
            AND r.fecha_inicio = ?   
            AND r.hora_inicio < ?    
            AND r.hora_fin > ?       
        `;
        
        const queryParams = [fecha_inicio, hora_fin, hora_inicio];

        if (id_cita_excluir) {
            subQuery += ` AND r.id != ?`;
            queryParams.push(id_cita_excluir);
        }

        const query = `
            SELECT * FROM cajones 
            WHERE estado != 'Mantenimiento' 
            AND id NOT IN (${subQuery})
            ORDER BY zona, numero_cajon
        `;
        
        const [rows] = await connection.query(query, queryParams);
        return rows;
    } finally {
        connection.release();
    }
}