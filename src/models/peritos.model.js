import { pool } from '../config/db.js'

export const getEspecialidades = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query("SELECT * FROM tipos_especialidades");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const registrarEspecialidad = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { especialidad, descripcion } = req.body;

        const [result] = await connection.query(
            "INSERT INTO tipos_especialidades (especialidad, descripcion) VALUES (?, ?)",
            [especialidad, descripcion]
        );

            res.status(201).json({
            message: "Especialidad registrada exitosamente",
            id: result.insertId,
            // Pos si se quiere mostrar al cliente: especialidad: especialidad,
            // Pos si se quiere mostrar al cliente: descripcion: descripcion
        }); 
    } catch (error) {
        console.error("Error al registrar especialidad:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const updateEspecialidadById = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params; // Se obtiene el id desde la URL
        const { especialidad, descripcion } = req.body; // Se obtienen los datos a actualizar del cuerpo

        if (!especialidad || !descripcion) {
            return res.status(400).json({ message: "Por favor, proporciona todos los campos" });
        }

        const [result] = await connection.query(
            "UPDATE tipos_especialidades SET especialidad = ?, descripcion = ? WHERE id = ?",
            [especialidad, descripcion, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Especialidad no encontrada" });
        }

        res.status(200).json({ message: "Especialidad actualizada exitosamente" });
    } catch (error) {
        console.error("Error al actualizar especialidad:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const deleteEspecialidadById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // Se obtiene el id desde la URL
        const [result] = await connection.query("DELETE FROM tipos_especialidades WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Especialidad no encontrada" });
        }
        res.status(200).json({ message: "Especialidad eliminada exitosamente" });
    } catch (error) {
        console.error("Error al eliminar especialidad:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};