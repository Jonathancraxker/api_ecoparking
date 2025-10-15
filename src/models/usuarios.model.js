import { pool } from '../config/db.js'
import bcrypt from 'bcryptjs';

//Creacion de usuario en la base de datos
export async function createUsuarios({
    nombre, apellidos, correo, contrasena, tipo_sangre, rfc, telefono, curp, tipo = 'Usuario', estado = 'Activo'}) {
    const connection = await pool.getConnection();
    
    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);
        
        const [result] = await connection.execute(
            `INSERT INTO usuarios (
                nombre, apellidos, correo, contrasena, tipo_sangre, rfc, telefono, curp, tipo, estado) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre, apellidos, correo, passwordHash, tipo_sangre, rfc, telefono, curp, tipo, estado
            ]
        );
        
        return result.insertId;
    } finally {
        connection.release();
    }
}

//Creacion para el CRUD con validacion de tipo y estado diferente
export async function createUsuariosCRUD({
    nombre,
    apellidos,
    correo,
    contrasena,
    tipo_sangre,
    rfc,
    telefono,
    curp,
    tipo = 'Usuario',      // Valor por defecto
    estado = 'Activo', // Valor por defecto
    perito,
    folio,
    pago_anual,
    fecha_pago,
    status
}) {
    const connection = await pool.getConnection();

    try {
        const passwordHash = await bcrypt.hash(contrasena, 10);
        
        const [result] = await connection.execute(
            `INSERT INTO usuarios (
                nombre,
                apellidos,
                correo,
                contrasena,
                tipo_sangre,
                rfc,
                telefono,
                curp,
                tipo,
                estado,
                perito,
                folio,
                pago_anual,
                fecha_pago,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nombre,
                apellidos,
                correo,
                passwordHash,
                tipo_sangre,
                rfc,
                telefono,
                curp,
                tipo,
                estado,
                perito,
                folio,
                pago_anual,
                fecha_pago,
                status
            ]
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

        const [rows] = await connection.query("SELECT id, nombre, apellidos, correo, tipo_sangre, rfc, telefono, curp, tipo, estado, imagen, folio, pago_anual FROM usuarios WHERE id = ?",  [id]);
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

export const updateUserByI = async (req, res) => {
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

        const { id } = req.params; // Se obtiene el id desde la URL
        const { nombre, apellidos, correo, tipo_sangre, tipo, estado, perito, folio, pago_anual, fecha_pago, status } = req.body; // Se obtienen los datos a actualizar del cuerpo

        // Validar que los campos necesarios estén presentes
        if (!nombre || !apellidos || !correo || !tipo_sangre || !tipo || !estado || !perito) {
            return res.status(400).json({ message: "Por favor proporciona todos los campos necesarios" });
        }
        
        const [result] = await connection.query(
            "UPDATE usuarios SET nombre = ?, apellidos = ?, correo = ?, tipo_sangre = ?, tipo = ?, estado = ?, perito = ?, folio = ?, pago_anual = ?, fecha_pago = ?, status = ? WHERE id = ?",
            [nombre, apellidos, correo, tipo_sangre, tipo, estado, perito, folio, pago_anual, fecha_pago, status, id]
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
