import multer from "multer";
import path from "path";
import fs from "fs";

const documentsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userId = req.params.id; 
        
        if (!userId) {
            console.error("Error: ID de usuario no disponible para Multer destination.");
            // Lanza un error para que Multer lo maneje
            return cb(new Error("ID de usuario no proporcionado para la carpeta de destino."), false);
        }

        // Ruta de la carpeta del usuario para documentos: uploads/profile/[userId]/
        const userDocumentsDir = path.join(process.cwd(), "uploads_privates", String(userId));

        fs.mkdir(userDocumentsDir, { recursive: true }, (err) => {
            if (err) {
                console.error("Error al crear la carpeta de documentos del usuario:", err);
                return cb(err);
            }
            cb(null, userDocumentsDir);
        });
    },
    filename: (req, file, cb) => {
        const fileExtension = path.extname(file.originalname);
        cb(null, `${file.fieldname}${fileExtension}`);
    },
});

export const uploadUserDocuments = multer({
    storage: documentsStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Límite de 5 MB por archivo
    },
    fileFilter: (req, file, cb) => {
        // Tipos de archivo permitidos: PDF, Word (docx, doc).
        const allowedMimeTypes = [
            'application/pdf',
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            return cb(null, true); // Aceptar el archivo
        } else {
            // Rechazar el archivo con un mensaje de error específico
            cb(new Error("Tipo de archivo no permitido. Solo se aceptan archivos PDF y Word."), false);
        }
    }
});