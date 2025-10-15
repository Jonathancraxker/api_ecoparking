export const isAdmin = (req, res, next) => {
    // El middleware authToken ya debe haber decodificado el token y puesto el usuario en req.user y el tipo
    const userRole = req.user?.tipo;

    if (userRole === 'Administrador') {
        return next();
    }

    return res.status(403).json({ message: "Acceso denegado" });
};