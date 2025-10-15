import {TOKEN_SECRET} from '../config/config.js'
import jwt from 'jsonwebtoken';

//Creación del token al entrar con login y datos que se mandan al token codificados
export function accesoToken(payload) {
    return new Promise((resolve, reject) => {
        jwt.sign(
            { id: payload.id, tipo: payload.tipo, estado: payload.estado },
            TOKEN_SECRET,
            {
                expiresIn: "1d", //tiempo de expiración, se puede poner min, hora o días.
            },
            (err, token) => {
                if (err) reject(err);
                resolve(token);
            }
        );
    });
}
