import { accesoToken } from '../libs/jwt.js'
import bcrypt from 'bcryptjs'
import { createUsuarios, verificarId, verificarCorreo, createUsuariosCRUD } from '../models/usuarios.model.js'

// Registro completo con todos los campos
export const registarUsuario = async (req, res) => {
    const { 
        nombre,
        apellidos,
        correo,
        contrasena,
        tipo_sangre,
        rfc,
        telefono,
        curp
    } = req.body;

    try {
        const userCorreo = await verificarCorreo(correo);
        if (userCorreo) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        // 2. Crear usuario con todos los campos
        const userId = await createUsuarios({
            nombre,
            apellidos,
            correo,
            contrasena,
            tipo_sangre,
            rfc,
            telefono,
            curp
            // tipo y estado se omiten (usan DEFAULT)
        });

        // 3. Respuesta al cliente
        res.json({
            id: userId,
            nombre,
            apellidos,
            correo,
        });

    } catch (error) {
        console.error("Error en registro de usuario:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    }
};

//login para entrar con cuenta previamente creada.
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
        const token = await accesoToken({ id: user.id, tipo: user.tipo, estado: user.estado }); //Para incluir que campos se mandan en el jwt, muy importante para las validaciones

        res.cookie("token", token, {
        //Activar solo al subir la api el httpOnly: true, // Para que no se pueda acceder desde JavaScript
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000 // 1 día de expiración
        });

        res.json({
            user: {
                id: user.id,
                nombre: user.nombre,
                apellidos: user.apellidos,
                correo: user.correo,
                tipo: user.tipo,
                estado: user.estado,
            }
        });

    } catch (error) {
        res.status(400).json({ message: error });
    }
};

//Registro con campos editables (tipo, estado) para el CRUD de usuarios.
export const registarUsuarioCRUD = async (req, res) => {
    const { 
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
    } = req.body;

    try {
        // Verificar si el correo ya existe
        const userCorreo = await verificarCorreo(correo);
        if (userCorreo) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        // Crear el usuario con todos los campos
        const userId = await createUsuariosCRUD({
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
        });

        // Respuesta al cliente con todos los datos relevantes
        res.json({
            id: userId,
            nombre,
            apellidos,
            correo,
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
    res.cookie("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    expires: new Date(0),
});
return res.sendStatus(200);
};

export const profile = async (req, res) => {
    try {
        // Verifica que req.user exista
        console.log("req.user:", req.user);  // Esto imprimirá todo el objeto req.user para mostrar qué datos contiene

        // Obtener el id desde req.user.id (decodificado del token)
        const userId = req.user.id;  // Asegúrate de que el ID sea un número
        console.log("ID del usuario como número:", userId);  // Verifica que el id esté disponible
        // Llamar a verificarId con el id del usuario
        const user = await verificarId(userId);  // Usamos la función verificarId

        if (!user) {
            return res.status(400).json(["Usuario no encontrado"]);
        }
        

        // Devolver los datos del usuario
        return res.json({
            id: user.id,
            nombre: user.nombre,
            apellidos: user.apellidos,
            correo: user.correo,
            imagen: user.imagen,
            estado: user.estado,
            telefono: user.telefono,
            perito: user.perito,
            folio: user.folio,
            rfc: user.rfc,
            curp: user.curp,
            pago_anual: user.pago_anual,
            fecha_pago: user.fecha_pago,
            status: user.status,
            ciudad: user.ciudad,
            empresa: user.empresa
        });
    } catch (error) {
        console.error("Error al obtener el perfil:", error);
        if (!res.headersSent) {
            return res.status(500).json({ message: "Error interno del servidor" });
        }
    }
};

export const status = async (req, res) => {
  try {
    // El middleware authToken ya verificó el token y puso el payload en req.user
    const user = await verificarId(req.user.id); // Reutilizamos tu función verificarId

    if (!user) {
      return res.status(401).json({ message: "No autorizado, el usuario no existe" });
    }

    // Devolvemos solo los datos esenciales para el frontend
    return res.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        correo: user.correo,
        tipo: user.tipo,
        estado: user.estado,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor" });
  }
};