import { pool } from '../config/db.js';

/**
 * Obtiene todos los registros de estacionamiento
 * @returns {Promise<Array>} Lista de registros
 */
export const getRegistros = async () => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT r.*, 
                   u.nombre as usuario_nombre,
                   c.numero as cajon_numero
            FROM registros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            JOIN cajones c ON r.cajon_id = c.id
            ORDER BY r.fecha DESC, r.entrada DESC
        `);
        return rows;
    } catch (error) {
        console.error("Error al obtener registros:", error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Obtiene un registro específico por ID
 * @param {number} cb - cb (codigo de barras) del registro.
 * @returns {Promise<Object>} Datos del registro
 */
export const getRegistroById = async (cb) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT r.*, 
                   u.nombre as usuario_nombre,
                   c.numero as cajon_numero
            FROM registros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            JOIN cajones c ON r.cajon_id = c.id
            WHERE r.cb = ?
        `, [cb]);

        if (rows.length === 0) {
            throw new Error("Registro no encontrado");
        }

        return rows[0];
    } catch (error) {
        console.error("Error al obtener registro:", error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Crea un nuevo registro de estacionamiento
 * @param {Object} registroData - Datos del registro
 * @param {string} registroData.matricula - Matrícula del vehículo
 * @param {number} registroData.cajon_id - ID del cajón asignado
 * @param {string} registroData.fecha - Fecha en formato YYYY-MM-DD
 * @param {string} registroData.entrada - Hora de entrada en formato HH:MM:SS
 * @param {string} registroData.tipo - Matrícula del vehículo
 * @param {number} [registroData.usuario_id] - ID del usuario (opcional)
 * @returns {Promise<number>} ID del registro creado
 */
export const createRegistro = async ({
    matricula,
    cajon_id,
    fecha,
    entrada,
    tipo,
    usuario_id = null
}) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction(); // Iniciamos transacción

        // 1. Verificar disponibilidad del cajón en la fecha específica
        const [registrosActivos] = await connection.query(
            `SELECT id FROM registros 
             WHERE cajon_id = ? AND fecha = ? AND salida IS NULL`,
            [cajon_id, fecha]
        );

        if (registrosActivos.length > 0) {
            throw new Error('El cajón ya está ocupado en esta fecha');
        }

        // 2. Verificar existencia del cajón
        const [cajon] = await connection.query(
            'SELECT estado FROM cajones WHERE id = ?',
            [cajon_id]
        );

        if (cajon.length === 0) {
            throw new Error('Cajón no encontrado');
        }

        // 3. Obtener el último código de barras generado
        const [ultimoCb] = await connection.query(
            'SELECT cb FROM registros WHERE cb IS NOT NULL ORDER BY LENGTH(cb) DESC, cb DESC LIMIT 1'
        );

        // 4. Generar nuevo código de barras secuencial
        let nuevoCb;
        if (ultimoCb.length > 0) {
            const ultimoNumero = parseInt(ultimoCb[0].cb);
            if (isNaN(ultimoNumero)) {
                throw new Error('Formato de código de barras inválido en registros existentes');
            }
            nuevoCb = (ultimoNumero + 1).toString().padStart(3, '0');
        } else {
            nuevoCb = '001'; // Primer registro
        }

        // 5. Validar que el nuevo código no exista (por si acaso)
        const [existeCb] = await connection.query(
            'SELECT id FROM registros WHERE cb = ?',
            [nuevoCb]
        );

        if (existeCb.length > 0) {
            throw new Error('El código de barras generado ya existe');
        }

        // 6. Insertar el nuevo registro
        const [result] = await connection.query(
            `INSERT INTO registros 
            (cb, matricula, fecha, entrada, cajon_id, usuario_id, status, tipo) 
            VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', ?)`,
            [nuevoCb, matricula, fecha, entrada, cajon_id, usuario_id, tipo]
        );

        // 7. Actualizar estado del cajón si no estaba ocupado
        if (cajon[0].estado !== 'Ocupado') {
            await connection.query(
                'UPDATE cajones SET estado = "Ocupado" WHERE id = ?',
                [cajon_id]
            );
        }

        await connection.commit(); // Confirmamos la transacción

        return {
            id: result.insertId,
            cb: nuevoCb,
            usuario_id,
            tipo,
            message: 'Registro creado exitosamente'
        };

    } catch (error) {
        await connection.rollback(); // Revertimos en caso de error
        console.error('Error en createRegistro:', error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Registra la salida de un vehículo
 * @param {number} id - ID del registro
 * @param {string} salida - Hora de salida en formato HH:MM:SS
 * @param {number} pago - Monto del pago
 * @param {string} status - Estado del pago ('Pagado' o 'Pendiente')
 * @returns {Promise<Object>} Registro actualizado
 */
export const registrarSalida = async (cb, salida, pago, status = 'Pagado') => {
    const connection = await pool.getConnection();
    try {
        // Verificar si el registro existe
        const [registro] = await connection.query(
            'SELECT * FROM registros WHERE cb = ?',
            [cb]
        );

        if (registro.length === 0) {
            throw new Error('Registro no encontrado');
        }

        // Validar estado de pago
        if (!['Pagado', 'Pendiente', 'Cancelado'].includes(status)) {
            throw new Error('Estado de pago inválido. Use "Pagado", "Pendiente" o "Cancelado');
        }

        // Actualizar registro con salida, pago y estado
        await connection.query(
            `UPDATE registros 
            SET salida = ?, pago = ?, status = ?
            WHERE cb = ?`,
            [salida, pago, status, cb]
        );

        // Liberar el cajón
        await connection.query(
            'UPDATE cajones SET estado = "Disponible" WHERE id = ?',
            [registro[0].cajon_id]
        );

        // Obtener el registro actualizado
        const [registroActualizado] = await connection.query(
            'SELECT * FROM registros WHERE cb = ?',
            [cb]
        );

        return registroActualizado[0];
    } catch (error) {
        console.error("Error al registrar salida:", error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Actualiza el estado de pago de un registro
 * @param {number} id - ID del registro
 * @param {string} status - Estado del pago ('Pagado' o 'Pendiente')
 * @returns {Promise<Object>} Registro actualizado
 */

/**
 * Elimina un registro de estacionamiento
 * @param {number} id - ID del registro
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
export const deleteRegistro = async (id) => {
    const connection = await pool.getConnection();
    try {
        // Verificar si el registro existe
        const [registro] = await connection.query(
            'SELECT * FROM registros WHERE id = ?',
            [id]
        );

        if (registro.length === 0) {
            throw new Error('Registro no encontrado');
        }

        // Si el registro no tiene salida, liberar el cajón
        if (!registro[0].salida) {
            await connection.query(
                'UPDATE cajones SET estado = "Disponible" WHERE id = ?',
                [registro[0].cajon_id]
            );
        }

        // Eliminar registro
        const [result] = await connection.query(
            'DELETE FROM registros WHERE id = ?',
            [id]
        );

        return result.affectedRows > 0;
    } catch (error) {
        console.error("Error al eliminar registro:", error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Obtiene los registros PENDIENTES de un usuario por su ID
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Array>} Lista de registros pendientes del usuario
 */
export const getRegistrosPendientesByUsuario = async (usuarioId) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT r.*, 
                   u.nombre as usuario_nombre,
                   c.numero as cajon_numero
            FROM registros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            JOIN cajones c ON r.cajon_id = c.id
            WHERE r.usuario_id = ? AND r.status = 'Pendiente' AND r.salida IS NULL
            ORDER BY r.fecha DESC, r.entrada DESC
        `, [usuarioId]);
        return rows;
    } catch (error) {
        console.error("Error al obtener registros pendientes por usuario:", error);
        throw error;
    } finally {
        connection.release();
    }
};



/**
 * Obtiene los registros activos (sin salida registrada)
 * @returns {Promise<Array>} Lista de registros activos
 */
export const getRegistrosActivos = async () => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT r.*, 
                   u.nombre as usuario_nombre,
                   c.numero as cajon_numero
            FROM registros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            JOIN cajones c ON r.cajon_id = c.id
            WHERE r.salida IS NULL
            ORDER BY r.fecha DESC, r.entrada DESC
        `);
        return rows;
    } catch (error) {
        console.error("Error al obtener registros activos:", error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Obtiene el registro MÁS RECIENTE y PENDIENTE de un usuario por su ID
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<Object>} Registro más reciente pendiente del usuario
 */
export const getRegistrosById_Usuario = async (usuarioId) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT r.*, 
                   u.nombre as usuario_nombre,
                   c.numero as cajon_numero
            FROM registros r
            LEFT JOIN usuarios u ON r.usuario_id = u.id
            JOIN cajones c ON r.cajon_id = c.id
            WHERE r.usuario_id = ? 
            AND r.status = 'Pendiente'
            AND r.salida IS NULL
            ORDER BY r.fecha DESC, r.entrada DESC
            LIMIT 1
        `, [usuarioId]);

        return rows[0] || null; // Devuelve el primer registro o null si no hay
    } catch (error) {
        console.error("Error al obtener registro reciente pendiente:", error);
        throw error;
    } finally {
        connection.release();
    }
};

/**
 * Cancela la reserva más reciente pendiente de un usuario
 * @param {number} usuarioId - ID del usuario
 * @returns {Promise<boolean>} True si se canceló correctamente
 */
export const cancelarReservaId = async (usuarioId) => {
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.query(
            `UPDATE registros 
             SET status = 'Cancelado'
             WHERE usuario_id = ? AND status = 'Pendiente'
             ORDER BY fecha DESC, entrada DESC
             LIMIT 1`,
            [usuarioId]
        );

        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error en cancelarReservaByUsuarioId:', error);
        throw error;
    } finally {
        connection.release();
    }
};