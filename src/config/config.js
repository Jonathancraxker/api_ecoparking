import { config } from 'dotenv';

config();

export const PORT = process.env.PORT || 4000

<<<<<<< HEAD
export const DB_USER = process.env.DB_USER || "root"; //usuario
export const DB_PASSWORD = process.env.DB_PASSWORD || "admin"; //contraseña
export const DB_HOST = process.env.DB_HOST || "localhost"; //host
export const DB_DATABASE = process.env.DB_DATABASE || "ecopaeking"; //db
=======
export const DB_USER = process.env.DB_USER || "jonathan"; //usuario
export const DB_PASSWORD = process.env.DB_PASSWORD || "admin"; //contraseña
export const DB_HOST = process.env.DB_HOST || "localhost"; //host
export const DB_DATABASE = process.env.DB_DATABASE || "ecoparking"; //db
>>>>>>> 04bd35cfe7544b75be39c3613c56fbf020fb21b1
export const DB_PORT = process.env.DB_PORT || 3307; //puerto

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "d4ae3d57491eb9fd26db358f982200d4";
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "D5Md4ae3d57491eb9fd26db358f982200d4DSM";