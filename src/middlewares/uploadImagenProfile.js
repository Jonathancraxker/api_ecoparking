import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.params.id;
    const userUploadDir = path.join("uploads", "profile", userId); // Ruta de la carpeta del usuario

    // Crear la carpeta del usuario si no existe
    fs.mkdir(userUploadDir, { recursive: true }, (err) => {
      if (err) {
        console.error("Error al crear la carpeta del usuario:", err);
        return cb(err);
      }
      cb(null, userUploadDir); // Indicar a Multer la carpeta de destino
    });
  },
  filename: (req, file, cb) => {
    // El nombre del archivo dentro de la carpeta del usuario será fijo, por ejemplo 'profile.ext'
    const fileExtension = path.extname(file.originalname);
    cb(null, `profile${fileExtension}`); // Siempre se llamará 'profile.extensiónOriginal'
  },
});

export const uploadImageProfile = multer({
  storage,
  limits: {
    fileSize: 1024 * 1024, // 1 MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/; //extensiones de archivos aceptadas
    const mimeType = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeType && extname) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten archivos de imagen (jpeg, jpg, png, gif)"));
  }
});