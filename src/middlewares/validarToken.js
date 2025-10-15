import jwt from 'jsonwebtoken';
import { TOKEN_SECRET } from '../config/config.js';

//Middlware para validar que exista un token de jwt
export const authToken = (req, res, next) => { 
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1]; // Verifica el token en las cookies o localstorage

    if (!token) {
        return res.status(403).json({ message: "Token no proporcionado" });
    }

    jwt.verify(token, TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Token inválido" });
        }
        req.user = decoded;  // Decodifica la información mandada en el jwt y coloca la información en req.user
        next();
    });
};