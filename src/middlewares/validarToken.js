// import jwt from 'jsonwebtoken';
// import { ACCESS_TOKEN_SECRET } from '../config/config.js';

// // Middlware para validar el Access Token del Header
// export const authToken = (req, res, next) => { 
    
//     // 1. Buscamos el token SÓLO en el header "Authorization"
//     const authHeader = req.headers['authorization'];
//     const token = authHeader && authHeader.split(' ')[1];

//     if (!token) {
//         return res.status(401).json({ message: "No autorizado (token no proporcionado)" });
//     }

//     jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
//         if (err) {
//             // 401 es la señal para que el frontend intente un /refresh
//             return res.status(401).json({ message: "Token expirado o inválido" });
//         }
//         req.user = decoded;
//         next();
//     });
// };

import jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_SECRET } from '../config/config.js';

//Middlware para validar que exista un token de jwt
export const authToken = (req, res, next) => { 
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1]; // Verifica el token en las cookies o localstorage

    if (!token) {
        return res.status(403).json({ message: "Token no proporcionado" });
    }

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Token inválido" });
        }
        req.user = decoded;  // Decodifica la información mandada en el jwt y coloca la información en req.user
        next();
    });
};