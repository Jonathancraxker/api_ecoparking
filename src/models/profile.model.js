import { pool } from '../config/db.js'
import bcrypt from 'bcryptjs';

export const updateUserById = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { id } = req.params; // Se obtiene el id desde la URL
        const {nombre, correo, telefono, division} = req.body; // Se obtienen los datos a actualizar del cuerpo

        // Validar que los campos necesarios estén presentes
        if (!nombre || !correo || !telefono || !division) {
            return res.status(400).json({ message: "Por favor proporciona todos los campos necesarios" });
        }
        
        const [result] = await connection.query(
            "UPDATE usuarios SET nombre = ?, correo = ?, telefono = ?, division = ? WHERE id = ?",
            [nombre, correo, telefono, division, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.status(200).json({ message: "Usuario actualizado exitosamente" });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const updateUserByPassword = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // Se obtiene el id desde la URL
        const { contrasena } = req.body; // Se obtienen los datos a actualizar del cuerpo
        const passwordHash = await bcrypt.hash(contrasena, 10);
        // Validar que los campos necesarios estén presentes
        if (!contrasena) {
            return res.status(400).json({ message: "Por favor proporciona la contraseña" });
        }
        const [result] = await connection.query(
            "UPDATE usuarios SET contrasena = ? WHERE id = ?",
            [passwordHash, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

//Actualizar la imagen de perfil
export const updateImagePerfil = async (req, res) => {
  const connection = await pool.getConnection();
  try {

    const { id } = req.params; // Obtiene el ID del usuario desde la URL
    const imagen = req.files?.imagen?.[0]?.filename || null; // Obtiene el nombre del archivo subido

    // Validar que se haya subido una imagen
    if (!imagen) {
    return res.status(400).json({ message: "No se proporcionó una imagen válida" });
    }
    const [result] = await connection.query(
    "UPDATE usuarios SET imagen = ? WHERE id = ?",
    [imagen, id]
    );

    if (result.affectedRows === 0) {
    return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ 
    message: "Imagen de perfil actualizada exitosamente",
    imagen: imagen
    });
} catch (error) {
    console.error("Error al actualizar la imagen:", error);
    res.status(500).json({ message: "Error interno del servidor" });
} finally {
    connection.release();
}
};