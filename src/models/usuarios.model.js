import { pool } from '../config/db.js'
import bcrypt from 'bcryptjs';

// Crear un nuevo usuario con datos de Google
export const crearUsuarioGoogle = async (usuario) => {
    const { email, name } = usuario; // email y name vienen de Google
    const connection = await pool.getConnection();

    try {
        // Genera una contraseña temporal para el usuario de Google
        const contrasenaTemporal = Math.random().toString(36).slice(-8); // Contraseña temporal de 8 caracteres
        const passwordHash = await bcrypt.hash(contrasenaTemporal, 10);

        // Inserta el usuario en la BD
        const [result] = await connection.execute(
            "INSERT INTO usuarios (nombre, correo, contrasena, tipo, estado) VALUES(?,?,?,?,?)",
            [name, email, passwordHash, 3, 'Activo']
        );
        return result.insertId; // Devuelve el ID del usuario creado
    } finally {
        connection.release();
    }
};

//Creacion de usuario en la bd
export async function createUsuarios(nombre, correo, contrasena) {
    const connection = await pool.getConnection();

    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);
        const [result] = await connection.execute(
            "INSERT INTO usuarios (nombre, correo, contrasena, tipo, estado) VALUES(?,?,?,?,?)",
            [nombre, correo, passwordHash, 1, 'Activo']
        );
        return result.insertId;
    } finally {
        connection.release();
    }
}

//Creacion para el CRUD con validacion de tipo y estado diferente
export async function createUsuariosCRUD(nombre, correo, contrasena, tipo, estado) {
    const connection = await pool.getConnection();

    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);
        const [result] = await connection.execute(
            "INSERT INTO usuarios (nombre, correo, contrasena, tipo, estado) VALUES(?,?,?,?,?)",
            [nombre, correo, passwordHash, tipo, estado]
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

//funcion usada para login normal y para google, se valida que el correo si exista en la bd
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
        const [rows] = await connection.query("SELECT * FROM usuarios");
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
        console.log("Parametros recibidos:", req.params);  // Esto imprimirá los params completos

        const { id } = req.params; // se obtiene el id desde la URL
        console.log("ID recibido:", id);  // Esto imprimirá solo el id

        const [rows] = await connection.query("SELECT * FROM usuarios WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" }); // Quiere decir que no se encontró en la bd
        }
        res.status(200).json(rows[0]); // Si se encontró, se envía un status 200 de que sí lo encontró
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
        // Verifica los parámetros que llegan en la solicitud
        console.log("Parámetros recibidos:", req.params);  // Esto imprimirá los params completos

        const { id } = req.params; // Se obtiene el id desde la URL
        console.log("ID recibido:", id);  // Esto imprimirá solo el id

        const [result] = await connection.query("DELETE FROM usuarios WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" }); // No se encontró y por lo tanto no se eliminó
        }

        res.status(200).json({ message: "Usuario eliminado exitosamente" }); // Si se eliminó, se confirma
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const updateUserById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Verifica los parámetros y el cuerpo de la solicitud
        console.log("Parámetros recibidos:", req.params); // Imprime los params completos
        console.log("Datos recibidos:", req.body); // Imprime el cuerpo de la solicitud

        const { id } = req.params; // Se obtiene el id desde la URL
        const { nombre, correo } = req.body; // Se obtienen los datos a actualizar del cuerpo

        // Validar que los campos necesarios estén presentes
        if (!nombre || !correo) {
            return res.status(400).json({ message: "Por favor proporciona nombre y correo." });
        }

        const [result] = await connection.query(
            "UPDATE usuarios SET nombre = ?, correo = ? WHERE id = ?",
            [nombre, correo, id]
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

export const updateUserByIdCRUD = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Verifica los parámetros y el cuerpo de la solicitud
        console.log("Parámetros recibidos:", req.params); // Imprime los params completos
        console.log("Datos recibidos:", req.body); // Imprime el cuerpo de la solicitud

        const { id } = req.params; // Se obtiene el id desde la URL
        const { nombre, correo, tipo, estado } = req.body; // Se obtienen los datos a actualizar del cuerpo

        // Validar que los campos necesarios estén presentes
        if (!nombre || !correo || !tipo || !estado) {
            return res.status(400).json({ message: "Por favor proporciona todos los campos necesarios" });
        }
//            "INSERT INTO usuarios (nombre, correo, contrasena, tipo, estado) VALUES(?,?,?,?,?)",
        const [result] = await connection.query(
            "UPDATE usuarios SET nombre = ?, correo = ?, tipo = ?, estado = ? WHERE id = ?",
            [nombre, correo, tipo, estado, id]
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
