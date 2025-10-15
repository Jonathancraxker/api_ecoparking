import { pool } from '../config/db.js';

export const getAllEventos = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query(`
            SELECT
                e.id,
                e.titulo,
                e.descripcion,
                e.fecha,
                e.hora,
                GROUP_CONCAT(ve.tipo_usuario SEPARATOR ',') AS tipos_visibles_evento_actual
            FROM
                eventos e
            LEFT JOIN -- Usamos LEFT JOIN para incluir eventos que quizás no tengan un tipo de visibilidad asignado aún
                visibilidad_eventos_rol ve ON e.id = ve.id_evento
            GROUP BY
                e.id
        `);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener todos los eventos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

// Función para obtener eventos (se obtiene según el tipo de usuario logueado)
export const getEventos = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const userType = req.user.tipo; // Tipo del usuario autenticado (Administrador, Usuario)

        if (!userType) {
            return res.status(401).json({ message: "Información de tipo de usuario no disponible para obtener eventos." });
        }

        // Consulta para obtener eventos visibles para el tipo de usuario actual
        const [rows] = await connection.query(
            `SELECT
                e.id,
                e.titulo,
                e.descripcion,
                e.fecha,
                e.hora,
                GROUP_CONCAT(ve.tipo_usuario) AS tipos_visibles_evento_actual
            FROM
                eventos e
            JOIN
                visibilidad_eventos_rol ve ON e.id = ve.id_evento
            WHERE
                ve.tipo_usuario = ?
            GROUP BY
                e.id`,
            [userType]
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener eventos:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

// Función para registrar un nuevo evento
export const registrarEvento = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { titulo, descripcion, fecha, hora, tipos_visibles } = req.body; // 'tipos_visibles' será un array (ej. ['Administrador', 'Usuario'])

        // Validaciones básicas
        if (!titulo || !fecha || !hora || !Array.isArray(tipos_visibles) || tipos_visibles.length === 0) {
            return res.status(400).json({ message: "Por favor, proporciona todos los campos" });
        }

        // Iniciar transacción
        await connection.beginTransaction();

        // 1. Insertar el evento en la tabla 'eventos'
        const [eventResult] = await connection.query(
            "INSERT INTO eventos (titulo, descripcion, fecha, hora) VALUES (?, ?, ?, ?)",
            [titulo, descripcion, fecha, hora]
        );
        const newEventId = eventResult.insertId;

        // 2. Insertar los tipos de usuario para la visibilidad del evento
        if (tipos_visibles.length > 0) {
            const visibilidadValues = tipos_visibles.map(tipo => [newEventId, tipo]);
            await connection.query(
                "INSERT INTO visibilidad_eventos_rol (id_evento, tipo_usuario) VALUES ?",
                [visibilidadValues]
            );
        }

        // Confirmar transacción
        await connection.commit();

        res.status(201).json({
            message: "Evento registrado exitosamente con visibilidad definida",
            id: newEventId,
            titulo,
            descripcion,
            fecha,
            hora,
            tipos_visibles
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error al registrar evento:", error);
        res.status(500).json({ message: "Error interno del servidor al registrar evento." });
    } finally {
        connection.release();
    }
};

// Función para actualizar un evento existente
export const updateEventoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // ID del evento a actualizar
        const { titulo, descripcion, fecha, hora, tipos_visibles } = req.body; // Nuevos datos y tipos de visibilidad

        // Validaciones
        if (!titulo || !fecha || !hora || !Array.isArray(tipos_visibles)) {
            return res.status(400).json({ message: "Por favor, proporciona título, fecha, hora y tipos de visibilidad." });
        }

        // Iniciar transacción
        await connection.beginTransaction();

        // 1. Actualizar el evento en la tabla 'eventos'
        const [eventUpdateResult] = await connection.query(
            "UPDATE eventos SET titulo = ?, descripcion = ?, fecha = ?, hora = ? WHERE id = ?",
            [titulo, descripcion, fecha, hora, id]
        );

        if (eventUpdateResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Evento no encontrado." });
        }

        // 2. Eliminar todas las asociaciones de visibilidad existentes para este evento
        await connection.query("DELETE FROM visibilidad_eventos_rol WHERE id_evento = ?", [id]);

        // 3. Insertar las nuevas asociaciones de visibilidad
        if (tipos_visibles.length > 0) {
            const visibilidadValues = tipos_visibles.map(tipo => [id, tipo]);
            await connection.query(
                "INSERT INTO visibilidad_eventos_rol (id_evento, tipo_usuario) VALUES ?",
                [visibilidadValues]
            );
        }

        // Confirmar transacción
        await connection.commit();

        res.status(200).json({ message: "Evento actualizado exitosamente." });
    } catch (error) {
        await connection.rollback();
        console.error("Error al actualizar evento:", error);
        res.status(500).json({ message: "Error interno del servidor al actualizar evento." });
    } finally {
        connection.release();
    }
};

// Función para eliminar un evento
export const deleteEventoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;


        const [result] = await connection.query("DELETE FROM eventos WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Evento no encontrado." });
        }

        res.status(200).json({ message: "Evento eliminado exitosamente." });
    } catch (error) {
        await connection.rollback();
        console.error("Error al eliminar evento:", error);
        res.status(500).json({ message: "Error interno del servidor al eliminar evento." });
    } finally {
        connection.release();
    }
};