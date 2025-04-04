import {TOKEN_SECRET} from '../config/config.js'
import jwt from 'jsonwebtoken';

export function accesoToken(payload) {
    return new Promise((resolve, reject) => {
        jwt.sign(
            { id: payload.id },  // Asegúrate de pasar el id del usuario aquí
            TOKEN_SECRET,
            {
                expiresIn: "1d",
            },
            (err, token) => {
                if (err) reject(err);
                resolve(token);
            }
        );
    });
}
