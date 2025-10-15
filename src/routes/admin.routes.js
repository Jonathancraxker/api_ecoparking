import { Router } from "express";
import { validateMid } from "../middlewares/validarMiddleware.js";
import { registarUsuario, loginUsuario, logout, profile, status, registarUsuarioCRUD } from "../controllers/usuarios.controller.js"; //Login y Registro
import { loginSchema, registroSchema, updatePasswordSchema, updateSchema } from "../schemas/usuarios.schemas.js"; //Validación de datos
import { getUsuarios, getUsersId, deleteUserById, updateUserByIdCRUD } from "../models/usuarios.model.js"; //CRUD usuarios
import { authToken } from "../middlewares/validarToken.js"; //verificación de token existente
import { deleteEspecialidadById, getEspecialidades, registrarEspecialidad, updateEspecialidadById } from "../models/peritos.model.js"; //CRUD especialidades
import { deleteEventoById, getAllEventos, getEventos, registrarEvento, updateEventoById } from "../models/eventos.model.js"; //CRUD eventos
import { deleteLibro, getBiblioteca, registrarLibro, updateLibro } from "../models/biblioteca.model.js"; //CRUD biblioteca
import { upload } from "../middlewares/upload.js"; // middleware de multer para actualizar imagen
import { updateCiudad, updateEmpresa, updateImagePerfil, updateUserById, updateUserByPassword } from "../models/profile.model.js"; //Perfil de usuario
import { uploadImageProfile } from "../middlewares/uploadImagenProfile.js"; //Imagen de perfil
import { getSliderImages, uploadSliderImage, updateSliderImage, deleteSliderImage} from '../models/slider.model.js'; //CRUD Slider
import { uploadImageSlider } from "../middlewares/uploadImageSlider.js"; //Subir imagen al slider
import { uploadUserDocuments } from "../middlewares/uploadDocuments.js"; //para validaciónes de archivos
import { deleteDocumento, getAllDocuments, updateDocumentoByAdmin, viewDocumentAsAdmin } from "../controllers/documentosAdmin.controller.js"; //CRUD documentos
import { getDocumentosByUserId, updateDocumentosByUser } from "../controllers/documentosUser.controller.js";
import { viewUserDocument } from "../controllers/documentos.view.controller.js";
import { isAdmin } from "../middlewares/isAdmin.js"; //validación de tipo de usuario
import { getUsuariosConEspecialidades, setEspecialidadesUsuario, deleteEspecialidadDeUsuario } from '../models/especialidades.model.js'; //Asignación de especialidades
import { getComisiones, createComision, updateComision, deleteComision } from '../models/comisiones.js'; //CRUD comisiones
import { getUsuariosConComisiones, setComisionesUsuario } from '../models/comisiones_usuario.js'; //Asignación de comisiones por usuario
import { getComisionesPerfil, getEspecialidadesPerfil } from "../models/obtener_comisiones_especialidades.model.js"; //Para obtener especialidades y comisiones por usuario autenticado

const router = Router();

// Rutas para Registro y login (inicio de sesión)
router.post('/usuarios/registro', validateMid(registroSchema), registarUsuario); //Registro de un nuevo usuario
router.post('/usuarios/login', validateMid(loginSchema), loginUsuario); //Inicio de sesión
router.post('/logout', logout); // Cerrar sesión eliminando token de cookies

//obtener datos de usuario logeado (perfil de usuario)
router.get('/usuarios/perfil', authToken, profile); // Protección de ruta con authToken validando el token existente

router.get('/usuarios/perfil/especialidades', authToken, getEspecialidadesPerfil); //Obtención de especialidades por usuario
router.get('/usuarios/perfil/comisiones', authToken, getComisionesPerfil); //Obtención de comisiones por usuario

// Ruta para verificar la sesión del usuario a través de la cookie
router.get('/usuarios/status', authToken, status); 

// CRUD de usuarios
router.get('/usuarios/', getUsuarios); //Obtener todos los usuarios
router.get('/usuarios/:id', getUsersId); //Obtener información de un usuario por id
router.post('/usuarios/', authToken, registarUsuarioCRUD); //Registrar un usuario desde administrador
router.patch('/usuarios/:id', authToken, validateMid(updateSchema), updateUserByIdCRUD); //Para modificar datos de usuario
router.delete('/usuarios/:id', authToken, deleteUserById); //Eliminar usuario

//Profile (para obtener info como: imagenes, especialidades, comisiones por usuario)
router.patch('/usuarios/update/:id', authToken, updateUserById); //para editar solo los campos en perfil (nombre, apellidos, correo, contraseña, curp, rfc)
router.put('/usuarios/update/:id', authToken, validateMid(updatePasswordSchema), updateUserByPassword); //para editar solo la contraseña, para profile y CRUD
router.put(
  '/usuarios/update/imagen/:id',
  uploadImageProfile.fields([
    { name: 'imagen', maxCount: 1 }
  ]),
  updateImagePerfil
); //Actualizar imagen de perfil
router.put('/usuarios/update/ciudad/:id', authToken, updateCiudad); //Actualizar ciudad
router.put('/usuarios/update/empresa/:id', authToken, updateEmpresa); //Actualizar empresa

//Peritos
router.get('/peritos/', getEspecialidades); //Obtener especialidades
router.post('/peritos/', registrarEspecialidad); //Registrar especialidades
router.patch('/peritos/:id', updateEspecialidadById); //actualizar especialidad
router.delete('/peritos/:id', deleteEspecialidadById); //eliminar especialidad

//Biblioteca
router.get('/biblioteca/', getBiblioteca); //obtener libro
router.post(
  '/biblioteca/',
  upload.fields([
    { name: 'archivo_pdf', maxCount: 1 },
    { name: 'imagen', maxCount: 1 }
  ]),
  registrarLibro
); //registrar libro

router.patch(
  '/biblioteca/:id',
  upload.fields([
    { name: 'archivo_pdf', maxCount: 1 },
    { name: 'imagen', maxCount: 1 }
  ]),
  updateLibro
); //actualizar libro

router.delete('/biblioteca/:id', deleteLibro); //eliminar libro

//Eventos
router.get('/eventos/user', authToken, getEventos); //obtener eventos por filtro de tipo usuario al iniciar sesión y obtener el tipo a través del jwt decodeado
router.get('/eventos/', getAllEventos) //Para obtener todos los eventos
router.post('/eventos/', authToken, registrarEvento); //registrar evento
router.patch('/eventos/:id', authToken, updateEventoById); //actualizar evento
router.delete('/eventos/:id', authToken, deleteEventoById); //eliminar evento

//Slider
router.get('/slider/', getSliderImages); //obtener imagen del slider (carrusel)
router.post('/slider/upload', uploadImageSlider.single('image'), uploadSliderImage); //subir imagen del slider (carrusel)
router.put('/slider/update', uploadImageSlider.single('newImage'), updateSliderImage); //actualizar imagen del slider (carrusel)
router.delete('/slider/delete', deleteSliderImage); //eliminar imagen del slider (carrusel)

// Especialidades por usuario 
router.get('/usuarios-especialidades', getUsuariosConEspecialidades); //obtener especialidades
router.put('/usuarios/:idUsuario/especialidades', setEspecialidadesUsuario); //actualizar especialidades de un usuario
router.delete('/usuarios/:idUsuario/especialidades/:idEspecialidad', deleteEspecialidadDeUsuario); //eliminar especialidad de un usuario

// Comisiones (CRUD para admin)
router.get('/comisiones', getComisiones); //obtener comisiones
router.post('/comisiones', createComision); //registrar comisión
router.put('/comisiones/:id_comision', updateComision); //actualizar comisión
router.delete('/comisiones/:id_comision', deleteComision); //eliminar comisión

// Comisiones por usuario 
router.get('/usuarios-comisiones', getUsuariosConComisiones); //obtener comisiones de un usuario
router.put('/usuarios/:idUsuario/comisiones', setComisionesUsuario); //Actualizar comisión de algún usuario

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


//Para documentos por usuario (con sesión iniciada tomando su ID y obteniendo sus datos)
router.get('/documentos/user', authToken, getDocumentosByUserId);
router.get('/documentos/view/:docType', authToken, viewUserDocument);

router.patch(
    '/documentos/:docType', 
    authToken,              
    uploadUserDocuments.fields([
        { name: 'curp', maxCount: 1 }, { name: 'cv', maxCount: 1 }, { name: 'cedula', maxCount: 1 },
        { name: 'titulo', maxCount: 1 }, { name: 'comprobante_domicilio', maxCount: 1 }, { name: 'csf', maxCount: 1 },
        { name: 'ine', maxCount: 1 }, { name: 'credencial', maxCount: 1 } 
    ]),
    updateDocumentosByUser
); //Solo se utiliza si se implementa el subir documentos por usuario, ademas del administrador.


export default router;