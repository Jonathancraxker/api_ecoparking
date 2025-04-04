import { Router } from "express";
import { OAuth2Client } from "google-auth-library"; // Importar Google OAuth2Client
import jwt from "jsonwebtoken"; // Importar jsonwebtoken
import bwipjs from "bwip-js"; //Generción de código de barras para móvil
import { validateMid } from "../middlewares/validarMiddleware.js";
import { registarUsuario, loginUsuario, logout, profile, registarUsuarioCRUD } from "../controllers/usuarios.controller.js";
import { loginSchema, registroSchema, updateSchema } from "../schemas/usuarios.schemas.js";
import { getUsuarios, getUsersId, deleteUserById, updateUserById, crearUsuarioGoogle, updateUserByIdCRUD, verificarCorreo } from "../models/usuarios.model.js"; // Importar las nuevas funciones
import { authToken } from "../middlewares/validarToken.js";
import { getRegistros, getRegistroById, createRegistro, registrarSalida, deleteRegistro, getRegistrosActivos, getRegistrosPendientesByUsuario, getRegistrosById_Usuario, cancelarReservaId } from "../models/registros.model.js";


const router = Router();

// Rutas para login tradicional
router.post('/usuarios/registro', validateMid(registroSchema), registarUsuario);
router.post('/usuarios/login', validateMid(loginSchema), loginUsuario);
router.post('/logout', logout); // Cerrar sesión eliminando token de cookies
router.get('/usuarios/perfil', authToken, profile); // Protección de ruta con authToken validando el token existente

// CRUD de usuarios
router.get('/usuarios/', authToken, getUsuarios);
router.get('/usuarios/:id', authToken, getUsersId);
router.post('/usuarios/', registarUsuarioCRUD);
router.patch('/usuarios/update/:id', authToken, updateUserById); //para editar en móvil campo nombre y correo
router.patch('/usuarios/:id', authToken, validateMid(updateSchema), updateUserByIdCRUD); //para editar en web más campos
router.delete('/usuarios/:id', authToken, deleteUserById);

// Configurar el cliente de Google OAuth
const client = new OAuth2Client("502548877339-iau4hvt7nlhm3p9d31q33960q1c10524.apps.googleusercontent.com");

// Ruta para autenticación con Google
router.post("/auth/google", async (req, res) => {
    const { token } = req.body;

    try {
        // Verificar el token de Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: "502548877339-iau4hvt7nlhm3p9d31q33960q1c10524.apps.googleusercontent.com",
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        // Validar si el usuario ya existe en la base de datos
        let usuario = await verificarCorreo(email);

        // Si el usuario no existe, créalo
        if (!usuario) {
            const userId = await crearUsuarioGoogle({ email, name });
            usuario = await verificarCorreo(email); // Obtén el usuario recién creado
        }

        // Generar un token JWT para tu aplicación
        const userToken = jwt.sign({ id: usuario.id, email, name }, "tokenrandom", { expiresIn: "1d" });

        // Enviar el token JWT al frontend
        res.json({ token: userToken });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error en la autenticación con Google");
    }
});



// Rutas para registros de estacionamiento
router.get('/registros/', async (req, res) => {
    try {
        const registros = await getRegistros();
        res.status(200).json(registros);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//obtener registro por cb (codigo de barras), se puede cambiar por id
router.get('/registros/:cb', async (req, res) => {
    try {
        const { cb } = req.params;
        const registro = await getRegistroById(cb);
        res.status(200).json(registro);
    } catch (error) {
        if (error.message === "Registro no encontrado") {
            res.status(404).json({ message: error.message });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

//para registrar la entrada de un vehiculo
router.post('/registros/', async (req, res) => {
    try {
        const { matricula, cajon_id, fecha, entrada, tipo, usuario_id } = req.body;

        if (!fecha || !entrada) {
            throw new Error('Fecha y hora de entrada son requeridas');
        }

        const registroId = await createRegistro({
            matricula,
            cajon_id,
            fecha,
            entrada,
            tipo,
            usuario_id
        });

        res.status(201).json({
            id: registroId,
            message: "Registro creado exitosamente",
            usuario_id
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


//proceso de salida, se actualiza el campo salida (hora), pago (MXN) y status (pagado) por medio
//de la busqueda del cb y actualizando estos datos para desocupar el cajon y la fecha
router.put('/registros/:cb', async (req, res) => {
    try {
        const { cb } = req.params;
        const { salida, pago, status, cajon_id } = req.body;

        if (!salida) {
            throw new Error('Hora de salida es requerida');
        }

        const registro = await registrarSalida(cb, salida, pago, status, cajon_id);
        res.status(200).json(registro);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Obtener registros por usuario y estado "Pendiente" para móvil
// Validación para que si se tiene una(s) reserva(s) pendiente(s) no deje reservar hasta que cambie 
// status a Pagado o Cancelado
router.get('/registros/usuario/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'Se requiere el ID de usuario'
            });
        }

        const registros = await getRegistrosPendientesByUsuario(id);

        res.json({
            count: registros.length,
            data: registros
        });
    } catch (error) {
        console.error('Error al obtener registros pendientes por usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener TODOS los registros de un usuario en base a su usuario_id de la tabla registros
//Obtiene el registro más actual y que esté pendiente
//Ya esta validado que no pueda hacer 2 registros/reservas un usuario en móvil, así que no hay problema
router.get('/registros/userbyid/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                error: 'Se requiere el ID de usuario'
            });
        }

        const registro = await getRegistrosById_Usuario(id);

        if (!registro) {
            return res.status(404).json({
                success: true,
                message: 'No se encontraron registros pendientes para este usuario',
                data: null
            });
        }

        res.json({
            success: true,
            data: registro
        });
    } catch (error) {
        console.error('Error al obtener registro reciente pendiente:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

/**
 * @route PATCH /parking/registros/userbyid/:id
 * @description Actualiza el estado de la reserva a Cancelado
 * @access Private
 */
router.patch('/registros/userbyid/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const cancelado = await cancelarReservaId(id);

        if (!cancelado) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró reserva pendiente para este usuario'
            });
        }

        res.json({
            success: true,
            message: 'Reserva cancelada exitosamente'
        });
    } catch (error) {
        console.error('Error en endpoint de cancelación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// NO BORRAR !!! ES PARA GENERAR LOD CÓDIGOS DE BARRAS EN MÓVIL, esta api se consume en móvil (QRCODESCREEN.Tsx).
router.get('/barcode', async (req, res) => {
    try {
        const { value } = req.query;

        bwipjs.toBuffer({
            bcid: 'code128',       // Tipo de código de barras
            text: value,           // Texto a codificar
            scale: 3,              // Escala 3x
            height: 10,            // Altura en mm
            includetext: true,     // Mostrar texto debajo
            textxalign: 'center',  // Centrar texto
        }, (err, png) => {
            if (err) {
                return res.status(500).send('Error generando código de barras');
            }
            res.type('image/png');
            res.send(png);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error interno');
    }
});


// Mantén el endpoint existente para registros pendientes
router.get('/usuario/:id', async (req, res) => {
    // ... (tu código existente para registros pendientes)
});

//elimminar registro a través del id
router.delete('/registros/:id', authToken, async (req, res) => {
    try {
        const { id } = req.params;
        const success = await deleteRegistro(id);
        if (success) {
            res.status(200).json({ message: "Registro eliminado exitosamente" });
        } else {
            res.status(404).json({ message: "Registro no encontrado" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

//para obtener los registros que no han salido del estacionamiento
//aún no esta en uso este endpoint, podría emplearse a futuro
router.get('/registros/activos', async (req, res) => {
    try {
        const registros = await getRegistrosActivos();
        res.status(200).json(registros);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;