import { pool } from '../config/db.js'

export const getRegistrosInvitados = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query("SELECT * FROM invitados");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener los invitados:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const getInvitadosId = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Verifica los parámetros que llegan en la solicitud
        console.log("Parametros recibidos:", req.params);

        const { id } = req.params; // se obtiene el id desde la URL
        console.log("ID recibido:", id);  // Esto imprimirá solo el id

        const [rows] = await connection.query("SELECT id, nombre, correo, empresa, tipo_visitante, id_cita FROM invitados WHERE id = ?",  [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error al obtener invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

// Obtiene todos los invitados de una cita específica
export const getInvitadosPorCita = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // ID de la CITA

        // Buscamos solo los invitados de esa cita
        const [rows] = await connection.query(
            "SELECT * FROM invitados WHERE id_cita = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.json([]); // Devuelve array vacío si no tiene
        }
        res.status(200).json(rows);

    } catch (error) {
        console.error("Error al obtener invitados por cita:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

//Registrar un invitado y sumarlo en el numero de invitados +1 en la tabla registro_citas
export const registrarInvitado = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { nombre, correo, empresa, tipo_visitante, id_cita } = req.body;
        
        if (!nombre || !correo || !id_cita) {return res.status(400).json({ message: "Todos los campos son requeridos" });}
        await connection.beginTransaction();
        const sqlInvitado = "INSERT INTO Invitados (nombre, correo, empresa, tipo_visitante, id_cita) VALUES (?, ?, ?, ?, ?)";
        const [result] = await connection.query(sqlInvitado, [nombre, correo, empresa, tipo_visitante, id_cita]);
        
        // 2. Actualizamos el contador en la tabla de citas
        const sqlCita = "UPDATE registro_citas SET numero_invitados = numero_invitados + 1 WHERE id = ?";
        await connection.query(sqlCita, [id_cita]);
        // 3. Confirmamos la transacción
        await connection.commit();
        res.status(201).json({
            message: "Invitado agregado exitosamente",
            id_invitado: result.insertId,
            correo
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error al registrar invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const updateInvitadoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { nombre, correo, empresa, tipo_visitante } = req.body;

        const [result] = await connection.query(
            "UPDATE Invitados SET nombre = ?, correo = ?, empresa = ?, tipo_visitante = ? WHERE id = ?",
            [nombre, correo, empresa, tipo_visitante, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        res.status(200).json({ message: "Invitado actualizado exitosamente" });
    } catch (error) {
        console.error("Error al actualizar invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

//Eliminar un invitado y restar -1 en el numero de invitados de la tabla registro_citas
export const deleteInvitadoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();

        // 1. (Opcional pero recomendado) Necesitamos saber a qué cita pertenecía para restar el conteo
        const [rows] = await connection.query("SELECT id_cita FROM Invitados WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        const id_cita = rows[0].id_cita;

        // 2. Eliminamos al invitado
        await connection.query("DELETE FROM Invitados WHERE id = ?", [id]);
        
        // 3. Actualizamos el contador en la tabla de citas
        const sqlCita = "UPDATE registro_citas SET numero_invitados = numero_invitados - 1 WHERE id = ?";
        await connection.query(sqlCita, [id_cita]);

        await connection.commit();
        res.status(200).json({ message: "Invitado eliminado exitosamente" });
    } catch (error) {
        await connection.rollback();
        console.error("Error al eliminar invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};