import jwt from 'jsonwebtoken';
import { TOKEN_SECRET } from '../config/config.js';

export const authToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1]; // Verifica el token

    if (!token) {
        return res.status(403).json({ message: "Token no proporcionado" });
    }

    jwt.verify(token, TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Token inválido" });
        }

        req.user = decoded;  // Decodifica y coloca la información en req.user
        next();
    });
};
