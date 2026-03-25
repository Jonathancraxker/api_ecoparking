import { pool } from '../config/db.js'
import bcrypt from 'bcryptjs';

//Creacion de usuario en la base de datos
export async function createUsuarios({
    nombre, correo, contrasena, codigo, tipo_usuario, telefono, division}) {
    const connection = await pool.getConnection();
    
    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);

        const [result] = await connection.execute(
            `INSERT INTO usuarios (nombre, correo, contrasena, codigo, tipo_usuario, telefono, division)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nombre, correo, passwordHash, codigo, tipo_usuario, telefono, division]
        );
        return result.insertId;
    } finally {
        connection.release();
    }
}

//Creacion para el CRUD con validacion de tipo_usuario diferente
export async function createUsuariosCRUD({
    nombre, correo, contrasena, codigo, tipo_usuario, telefono, division }) {
    const connection = await pool.getConnection();
    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);
        
        const [result] = await connection.execute(
            `INSERT INTO usuarios (nombre, correo, contrasena, codigo, tipo_usuario, telefono, division)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ nombre, correo, passwordHash, codigo, tipo_usuario, telefono, division ]
        );

        return result.insertId;
    } finally {
        connection.release();
    }
}

export async function verificarId(userId) {
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.execute(
            "SELECT * FROM usuarios WHERE id = ?", [userId]);
        return result[0];
    } finally {
        connection.release();
    }
}

//funcion usada para login normal, se valida que el correo si exista en la bd
export async function verificarCorreo(correo) {
    const connection = await pool.getConnection();
    try {
        const [result] = await connection.execute(
            "SELECT * FROM usuarios WHERE correo = ?", [correo]);
        return result[0];
    } finally {
        connection.release();
    }
}

export const getUsuarios = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query("SELECT * FROM usuarios ORDER BY id DESC");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const getUsersId = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Verifica los parámetros que llegan en la solicitud
        console.log("Parametros recibidos:", req.params);

        const { id } = req.params; // se obtiene el id desde la URL
        console.log("ID recibido:", id);  // Esto imprimirá solo el id

        const [rows] = await connection.query("SELECT id, nombre, correo, codigo, tipo_usuario, telefono, division FROM usuarios WHERE id = ?",  [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error al obtener usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const deleteUserById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // Se obtiene el id desde la URL
        console.log("ID recibido:", id);
        const [result] = await connection.query("DELETE FROM usuarios WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.status(200).json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const updateUserByIdCRUD = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { nombre, correo, codigo, tipo_usuario, telefono, division, intentos } = req.body; // Se obtienen los datos a actualizar del cuerpo que manda el cliente

        if (!nombre || !correo || !codigo || !tipo_usuario || !telefono || !division || !intentos) {
            return res.status(400).json({ message: "Por favor proporciona todos los campos necesarios" });
        }
        
        const [result] = await connection.query(
            "UPDATE usuarios SET nombre = ?, correo = ?, codigo = ?, tipo_usuario = ?, telefono = ?, division = ?, intentos = ? WHERE id = ?",
            [nombre, correo, codigo, tipo_usuario, telefono, division, intentos, id]
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