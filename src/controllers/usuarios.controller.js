import { accesoToken } from '../libs/jwt.js'
import bcrypt from 'bcryptjs'
import { createUsuarios, verificarId, verificarCorreo, createUsuariosCRUD } from '../models/usuarios.model.js'

//Registro normal en el login
export const registarUsuario = async (req, res) => {
    const { nombre, correo, contrasena } = req.body;

    try {
        const userCorreo = await verificarCorreo(correo);
        if (userCorreo) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        const userId = await createUsuarios(nombre, correo, contrasena);

        const token = await accesoToken({ id: userId });

        res.cookie("token", token);

        //respuesta al cliente
        res.json({
            id: userId,
            correo,
            nombre,
            token
        });

    } catch (error) {
        console.error("Error en registro de usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export const loginUsuario = async (req, res) => {
    const { correo, contrasena } = req.body;
    try {
        const user = await verificarCorreo(correo);
        if (!user) {
            return res.status(400).json(['Usuario no encontrado']);
        }

        const contra = await bcrypt.compare(contrasena, user.contrasena);
        if (!contra) {
            return res.status(400).json(['Contraseña incorrecta']);
        }

        // Aquí pasamos el id del usuario para generar el token
        const token = await accesoToken({ id: user.id });

        res.cookie("token", token);

        res.json({
            id: user.id,
            correo: user.correo,
            nombre: user.nombre,
            token,
            tipo: user.tipo,
            estado: user.estado
        });

    } catch (error) {
        res.status(400).json({ message: error });
    }
};

//Registro con campos editables (tipo, estado) en el CRUD.
export const registarUsuarioCRUD = async (req, res) => {
    const { nombre, correo, contrasena, tipo, estado } = req.body;

    try {
        const userCorreo = await verificarCorreo(correo);
        if (userCorreo) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        const userId = await createUsuariosCRUD(nombre, correo, contrasena, tipo, estado);

        const token = await accesoToken({ id: userId });

        res.cookie("token", token);

        //respuesta al cliente
        res.json({
            id: userId,
            correo,
            nombre,
            token,
            tipo,
            estado
        });

    } catch (error) {
        console.error("Error en registro de usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

export const logout = (req, res) => {
    res.cookie("token", "", {
        expires: new Date(0),
    });
    return res.sendStatus(200)
}

export const profile = async (req, res) => {
    try {
        // Verifica que req.user exista
        console.log("req.user:", req.user);  // Esto imprimirá todo el objeto req.user para que puedas ver qué datos contiene

        // Obtener el id desde req.user.id (decodificado del token)
        const userId = parseInt(req.user.id, 10);  // Asegúrate de que el ID sea un número
        console.log("ID del usuario como número:", userId);  // Verifica que el id esté disponible

        // Llamar a verificarId con el id del usuario
        const user = await verificarId(userId);  // Usamos la función verificarId

        if (!user) {
            return res.status(400).json(["Usuario no encontrado"]);
        }

        // Devolver los datos del usuario
        return res.json({
            id: user.id,  // Asegúrate de que este campo sea el correcto según tu base de datos
            nombre: user.nombre,
            correo: user.correo,
            tipo: user.tipo,
        });
    } catch (error) {
        console.error("Error al obtener el perfil:", error);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Error interno del servidor" });
        }
    }
};


