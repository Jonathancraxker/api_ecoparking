import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import adminRoutes from '../routes/admin.routes.js';
import codigoQr from '../routes/codigo_qr.routes.js';
import reportes from '../routes/reportes.routes.js';

const app = express();
app.use(express.json());

// Configuración CORS para múltiples orígenes
const allowedOrigins = ['http://localhost:3000', 'http://localhost:8081', 'https://blue-trout-427332.hostingersite.com', 'https://ecoparking-web.vercel.app', 'http://localhost:5173', 'http://localhost:5174'];

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
    exposeHeaders: ['Content-Disposition'] 
  })
);

app.use(cookieParser());
// Para archivos de la carpeta uploads
app.use('/uploads', express.static('uploads'));
// Ruta principal de las APIs
app.use('/ecoparking', adminRoutes);
app.use('/ecoparking', codigoQr);
app.use('/ecoparking', reportes);

export default app;