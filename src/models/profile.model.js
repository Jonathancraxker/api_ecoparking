import { pool } from '../config/db.js'
import bcrypt from 'bcryptjs';

export const updateUserById = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { id } = req.params; // Se obtiene el id desde la URL
        const { nombre, apellidos, correo, telefono, curp, rfc } = req.body; // Se obtienen los datos a actualizar del cuerpo

        // Validar que los campos necesarios estén presentes
        if (!nombre || !apellidos || !correo || !telefono|| !curp || !rfc) {
            return res.status(400).json({ message: "Por favor proporciona todos los campos necesarios" });
        }
        
        const [result] = await connection.query(
            "UPDATE usuarios SET nombre = ?, apellidos = ?, correo = ?, telefono = ?, curp = ?, rfc = ? WHERE id = ?",
            [nombre, apellidos, correo, telefono, curp, rfc, id]
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

        res.status(200).json({ message: "Usuario actualizado exitosamente" });
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

export const updateCiudad = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const { ciudad } = req.body;

        const [result] = await connection.query(
            "UPDATE usuarios SET ciudad = ? WHERE id = ?",
            [ciudad, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.status(200).json({
            message: "Ciudad actualizada correctamente.",
        });

    } catch (error) {
        console.error("Error al actualizar la ciudad:", error);
        res.status(500).json({ message: "Error interno del servidor al actualizar la ciudad." });
    } finally {
        connection.release();
    }
};

export const updateEmpresa = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const { empresa } = req.body;

        const [result] = await connection.query(
            "UPDATE usuarios SET empresa = ? WHERE id = ?",
            [empresa, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        res.status(200).json({
            message: "Empresa actualizada correctamente.",
        });

    } catch (error) {
        console.error("Error al actualizar la empresa:", error);
        res.status(500).json({ message: "Solo puedes ingresar menos de 80 caracteres" });
    } finally {
        connection.release();
    }
};