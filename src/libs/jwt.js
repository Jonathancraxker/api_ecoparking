import jwt from 'jsonwebtoken';

export function accesoToken(payload, secret, expiresIn) {
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,  // El payload (ej. { id, tipo_usuario })
            secret,   // El secreto que le pasemos (ACCESS_TOKEN_SECRET o REFRESH_TOKEN_SECRET)
            {
                expiresIn: expiresIn // El tiempo (ej. "15m" o "7d")
            },
            (err, token) => {
                if (err) reject(err);
                resolve(token);
            }
        );
    });
}