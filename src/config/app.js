import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import adminRoutes from '../routes/admin.routes.js'; // Asegúrate de que este archivo incluya /slider



// Iniciando el servidor
const app = express();

// Middleware para convertir los req body para que el backend entienda con express los json
app.use(express.json());

// Configuración CORS para múltiples orígenes
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'https://admin-dashboard-one-sandy-38.vercel.app', 'https://cienqro.mx'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No autorizado por CORS'));
      }
    },
    credentials: true, // Para permitir cookies/sesiones
  })
);

// Manejo de cookies en los navegadores
app.use(cookieParser());

// Para archivos de la carpeta uploads
app.use('/uploads', express.static('uploads'));

// Ruta principal de las APIs
app.use('/cienqro', adminRoutes); 

export default app;

//By Jonathan Cruz