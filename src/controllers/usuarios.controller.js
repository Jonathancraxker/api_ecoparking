import { accesoToken } from '../libs/jwt.js'
import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from '../config/config.js';
import bcrypt from 'bcryptjs'
import { createUsuarios, verificarId, verificarCorreo, createUsuariosCRUD } from '../models/usuarios.model.js'
import jwt from 'jsonwebtoken';
import { pool } from '../config/db.js';

// Registro completo con todos los campos
export const registrarUsuario = async (req, res) => {
    const {nombre, correo, contrasena, codigo, telefono, division} = req.body;

    try {
        const userCorreo = await verificarCorreo(correo);
        if (userCorreo) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }
        
        // Validación del código
        let tipo_usuario;
        if (codigo.startsWith('ADM')) {
            tipo_usuario = 'Administrativo';
        } else if (codigo.startsWith('PRO')) {
            tipo_usuario = 'Profesor';
        } else if (codigo.startsWith('JUC')) {
            tipo_usuario = 'Juca';
        } else {
            return res.status(400).json({ message: "El código no es válido" });
        }

        const userId = await createUsuarios({
            nombre, correo, contrasena, codigo, telefono, division, tipo_usuario
        });

        res.json({
            id: userId,
            nombre,
            correo,
            tipo_usuario
        });

    } catch (error) {
        console.error("Error en registro de usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

//login para entrar con cuenta previamente creada.
export const loginUsuario = async (req, res) => {
    const MAX_INTENTOS = 5; // Límite de intentos
    const { correo, contrasena, codigo } = req.body;
    try {
        const user = await verificarCorreo(correo);
        if (!user) {
            return res.status(400).json(['Error, usuario no existente']);
        }

        // --- 1. VERIFICACIÓN DE BLOQUEO ---
        // Revisa si el usuario ya está bloqueado permanentemente
        if (user.intentos >= MAX_INTENTOS) {
            return res.status(403).json([`Cuenta bloqueada, comuniquese con un administrador`]);
        }

        // --- 2. VERIFICACIÓN DE CREDENCIALES ---
        const contra = await bcrypt.compare(contrasena, user.contrasena);
        const codigoValido = (codigo === user.codigo); // Validamos el código también

        // Si la contraseña O el código son incorrectos
        if (!contra || !codigoValido) {
            
            // --- 3. LÓGICA DE INTENTOS FALLIDOS ---
            const connection = await pool.getConnection();
            // Incrementa el contador de 'intentos' en la BD
            await connection.execute(
                "UPDATE usuarios SET intentos = intentos + 1 WHERE id = ?",
                [user.id]
            );
            connection.release();

            const intentosActuales = user.intentos + 1;
            
            // Si este fue el último intento, avisa que la cuenta se bloqueó
            if (intentosActuales >= MAX_INTENTOS) {
                return res.status(403).json(['Credenciales incorrectas, su cuenta ha sido bloqueada, comuniquese con un administrador.']);
            } else {
                // Avisa cuántos intentos le quedan
                const intentosRestantes = MAX_INTENTOS - intentosActuales;
                return res.status(400).json([`Credenciales incorrectas. Le quedan ${intentosRestantes} intentos`]);
            }
        }

        // --- 4. LÓGICA DE LOGIN EXITOSO ---
        // Si el login fue exitoso, reseteamos el contador si es necesario
        if (user.intentos > 0) {
            const connection = await pool.getConnection();
            await connection.execute(
                "UPDATE usuarios SET intentos = 0 WHERE id = ?", 
                [user.id]
            );
            connection.release();
        }
        
        // 1. CREAR EL ACCESS TOKEN (15 minutos)
        const accessToken = await accesoToken(
            { id: user.id, tipo_usuario: user.tipo_usuario }, // Payload completo
            ACCESS_TOKEN_SECRET, // Secreto de Access
            '15m' // Expiración CORTA
        );

        // 2. CREAR EL REFRESH TOKEN (7 días)
        const refreshToken = await accesoToken(
            { id: user.id }, // Payload simple (solo el ID)
            REFRESH_TOKEN_SECRET, // Secreto de Refresh
            '30d'
        );
        
        // 3. ENVIAR EL REFRESH TOKEN EN UNA COOKIE httpOnly
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true, // El frontend no puede leerla con JS
            secure: true,
            // sameSite: 'lax',
            // para produccion: cambiar a none si estan en dominios separados
            // secure: process.env.NODE_ENV === 'production', // true en producción
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 días
        });

        res.json({
            user: {
                id: user.id,
                nombre: user.nombre,
                correo: user.correo,
                tipo_usuario: user.tipo_usuario
            },
            token: accessToken
        });
    } catch (error) {
        res.status(400).json({ message: error });
    }
};

//Refresh token
export const refreshToken = async (req, res) => {
    try {
        // 1. Obtenemos el refresh token de la cookie httpOnly
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(401).json({ message: "No autorizado (no hay token)" });

        // 2. Verificamos el refresh token con su secreto
        const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        
        //  3.  Buscamos al usuario por ID, no por correo
        const user = await verificarId(payload.id); // <-- ¡Arreglado!
        if (!user) return res.status(401).json({ message: "Usuario no encontrado" });

        // 4. Si es válido, creamos un NUEVO Access Token (corta duración)
        const newAccessToken = await accesoToken(
            { id: user.id, tipo_usuario: user.tipo_usuario },
            ACCESS_TOKEN_SECRET,
            '15m' // 15 minutos
        );

        // 5. Enviamos el nuevo access token en el JSON
        res.json({ token: newAccessToken });

    } catch (error) {
        // Si el refresh token es inválido o expiró
        return res.status(403).json({ message: "No autorizado refreshToken inválido o expirado" });
    }
};

//Registro con campos editables (tipo, estado) para el CRUD de usuarios.
export const registrarUsuarioCRUD = async (req, res) => {
    const {nombre, correo, contrasena, codigo, tipo_usuario = 'Administrativo', telefono, division
    } = req.body;

    try {
        // Verificar si el correo ya existe
        const userCorreo = await verificarCorreo(correo);
        if (userCorreo) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        // Crear el usuario con todos los campos
        const userId = await createUsuariosCRUD({
            nombre, correo, contrasena, codigo, tipo_usuario, telefono, division
        });

        // Respuesta al cliente con los datos relevantes
        res.json({
            id: userId,
            nombre,
            correo,
            codigo,
            tipo_usuario,
            telefono,
            division
        });

    } catch (error) {
        console.error("Error en registro de usuario:", error);
        res.status(500).json({ 
            message: "Error interno del servidor",
            error: error.message 
        });
    }
};

export const logout = (req, res) => { 
    res.cookie("refreshToken", "", {
    httpOnly: true, // El frontend no puede leerla con JS
    secure: true,
    sameSite: 'none',
    // para produccion: cambiar a none si estan en dominios separados
    // secure: process.env.NODE_ENV === 'production', // true en producción
    // sameSite: 'none',
    expires: new Date(0),
});
    return res.sendStatus(200).json({message: "Sesión cerrada"});
};

export const profile = async (req, res) => {
    try {
        // Verifica que req.user exista
        console.log("req.user:", req.user);  // Esto imprimirá todo el objeto req.user para mostrar qué datos contiene

        // Obtener el id desde req.user.id (decodificado del token)
        const userId = req.user.id;  // Asegúrate de que el ID sea un número
        console.log("ID del usuario como número:", userId);  // Verifica que el id esté disponible
        // Llamar a verificarId con el id del usuario
        const user = await verificarId(userId);
        
        if (!user) {
            return res.status(400).json(["Usuario no encontrado"]);
        }
        
        return res.json({
            id: user.id,
            nombre: user.nombre,
            correo: user.correo,
            codigo: user.codigo,
            telefono: user.telefono,
            division: user.division,
            tipo_usuario: user.tipo_usuario
        });
    } catch (error) {
        console.error("Error al obtener el perfil:", error);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Error interno del servidor" });
        }
    }
};

//Para verificar que exista token en las cookies y poner esto en context en react en frontend
export const status = async (req, res) => {
try {
    // El middleware authToken ya verificó el token y puso el payload en req.user
    const user = await verificarId(req.user.id);

    if (!user) {
    return res.status(401).json({ message: "No autorizado, el usuario no existe" });
    }

    return res.json({
    user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        tipo_usuario: user.tipo_usuario,
        codigo,
        telefono,
        division
    },
    });
} catch (error) {
    return res.status(500).json({ message: "Error interno del servidor" });
}
};