import { Router } from "express";
import { validateMid } from "../middlewares/validarMiddleware.js";
import { registrarUsuario, loginUsuario, logout, profile, status, registrarUsuarioCRUD, refreshToken } from "../controllers/usuarios.controller.js"; //Login y Registro
import { loginSchema, registroSchema, updatePasswordSchema, updateSchema } from "../schemas/usuarios.schemas.js"; //Validación de datos
import { getUsuarios, getUsersId, deleteUserById, updateUserByIdCRUD } from "../models/usuarios.model.js"; //CRUD usuarios
import { authToken } from "../middlewares/validarToken.js"; //verificación de token existente
import { deleteCitaById, getCitasId, getMisCitas, getRegistrosCitas, registrarCita, updateCitaById } from "../models/registro_citas.model.js"; //CRUD especialidades
import { updateImagePerfil, updateUserById, updateUserByPassword } from "../models/profile.model.js"; //Perfil de usuario
import { uploadImageProfile } from "../middlewares/uploadImagenProfile.js"; //Imagen de perfil
import { uploadUserDocuments } from "../middlewares/uploadDocuments.js"; //para validaciónes de archivos
import { deleteDocumento, getAllDocuments, updateDocumentoByAdmin, viewDocumentAsAdmin } from "../controllers/documentosAdmin.controller.js"; //CRUD documentos
import { isAdmin } from "../middlewares/isAdmin.js"; //validación de tipo de usuario
import { deleteInvitadoById, getInvitadosId, getInvitadosPorCita, getRegistrosInvitados, registrarInvitado, updateInvitadoById } from "../models/invitados.model.js";

const router = Router();

// Rutas para Registro y login (inicio de sesión)
router.post('/usuarios/registro', validateMid(registroSchema), registrarUsuario); //Registro de un nuevo usuario
router.post('/usuarios/login', validateMid(loginSchema), loginUsuario); //Inicio de sesión
router.post('/usuarios/refresh', refreshToken); //refreshToken
router.post('/logout', logout); // Cerrar sesión eliminando token de cookies

//obtener datos de usuario logeado (perfil de usuario)
router.get('/usuarios/perfil', authToken, profile); // Protección de ruta con authToken validando el token existente

// Ruta para verificar la sesión del usuario a través de la cookie, de la mano se usa context en el frontend para toda la aplicación, y en el main.jsx se agrega el context
router.get('/usuarios/status', authToken, status);

// CRUD de usuarios para admin
router.get('/usuarios/', getUsuarios); //Obtener todos los usuarios
router.get('/usuarios/:id', getUsersId); //Obtener información de un usuario por id
router.post('/usuarios/', authToken, registrarUsuarioCRUD); //Registrar un usuario desde administrador
router.patch('/usuarios/:id', authToken, validateMid(updateSchema), updateUserByIdCRUD); //Para modificar datos de usuario
router.delete('/usuarios/:id', authToken, deleteUserById); //Eliminar usuario

//Profile (para obtener info por usuario)
router.patch('/usuarios/update/:id', authToken, updateUserById); //para editar solo los campos en perfil (nombre, apellidos, correo, telefono, division)
router.put('/usuarios/update/:id', authToken, validateMid(updatePasswordSchema), updateUserByPassword); //para editar solo la contraseña, para profile y CRUD_users

router.put('/usuarios/update/imagen/:id', uploadImageProfile.fields([{ name: 'imagen', maxCount: 1 }]), updateImagePerfil); //Actualizar imagen de perfil

//Registros de citas
router.get('/citas/', authToken, isAdmin, getRegistrosCitas); //Obtener citas

router.get('/citas/mis-citas', authToken, getMisCitas); //para obtener citas de usuario logeado

router.get('/citas/:id', getCitasId); //Obtener información de una cita por id

router.post('/citas/', authToken, registrarCita); //Registrar nueva cita
router.patch('/citas/:id', updateCitaById); //actualizar cita
router.delete('/citas/:id', deleteCitaById); //eliminar cita

//Invitados
// router.get('/invitados/', getRegistrosInvitados); //Obtener todos los invitados
// router.get('/invitados/:id', getInvitadosId); //Obtener invitado por id
router.get('/citas/:id/invitados', getInvitadosPorCita); //Obtener invitados que corresponden a una cita
router.post('/invitados/', authToken, registrarInvitado); //Registrar nuevo invitado
router.patch('/invitados/:id', updateInvitadoById); //actualizar invitado
router.delete('/invitados/:id', deleteInvitadoById); //eliminar invitado




//Documentos
router.get('/documentos', authToken, isAdmin, getAllDocuments); //obtener documentos
router.get(
    '/documentos/admin/view/:userId/:docType', 
    authToken, 
    isAdmin,
    viewDocumentAsAdmin
); //obtener todos los documentos, solo para administrador

router.patch('/documentos/:id', // actualizar documento, :id_usuario es el ID del usuario al que pertenece el documento
    authToken, 
    isAdmin,
    uploadUserDocuments.fields([ // Los campos que son recibidos para los documentos
        { name: 'curp', maxCount: 1 }, { name: 'cv', maxCount: 1 }, { name: 'cedula', maxCount: 1 },
        { name: 'titulo', maxCount: 1 }, { name: 'comprobante_domicilio', maxCount: 1 }, { name: 'csf', maxCount: 1 },
        { name: 'ine', maxCount: 1 }, { name: 'credencial', maxCount: 1 }
    ]),
    updateDocumentoByAdmin
); 

router.delete('/documentos/:id_usuario/:docType', // eliminar documento
    authToken,
    isAdmin,
    deleteDocumento
); 

export default router;