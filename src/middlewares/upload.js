import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/biblioteca/'); // carpeta donde se guardan los archivos
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname.replace(/\s+/g, '_'); 
    cb(null, originalName);
  }
});

export const upload = multer({ storage });