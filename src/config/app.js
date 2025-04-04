import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import adminRoutes from '../routes/admin.routes.js';

// Iniciando el servidor
const app = express();

// Middleware para convertir los req body para que el backend entienda con express los json
app.use(express.json());

// Configuración de CORS
app.use(
    cors({
        origin: [
            'http://localhost:5173', 
            'http://localhost:8081',
            'https://smartparking-ten.vercel.app',
            'https://smartparking-jonathans-projects-27d0782c.vercel.app',
            'https://smartparking-jonathancraxker-jonathans-projects-27d0782c.vercel.app'
        ],
        credentials: true,
    })
);

app.use(cookieParser()); // Manejo de cookies

// Ruta principal de las APIs
app.use('/parking', adminRoutes);

export default app;