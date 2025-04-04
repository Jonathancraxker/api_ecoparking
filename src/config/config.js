import { config } from 'dotenv';

config();

export const PORT = process.env.PORT || 4000

export const DB_USER = process.env.DB_USER || "root"
export const DB_PASSWORD = process.env.DB_PASSWORD || "zrkIkFRVFLdmDkJlkateIbLYQivFUnZh"
export const DB_HOST = process.env.DB_HOST || "yamanote.proxy.rlwy.net"
export const DB_DATABASE = process.env.DB_DATABASE || "railway"
export const DB_PORT = process.env.DB_PORT || 43697
export const TOKEN_SECRET = process.env.TOKEN_SECRET || "tokenrandom"; // Asegúrate de tener un valor en .env

// export const PORT = process.env.PORT || 4000;
// export const DB_USER = process.env.DB_USER || "root";
// export const DB_PASSWORD = process.env.DB_PASSWORD || "gieByyRJPXaixNZkKRjeEXNScSgRMtsx";
// export const DB_HOST = process.env.DB_HOST || "yamabiko.proxy.rlwy.net";
// export const DB_DATABASE = process.env.DB_DATABASE || "railway";
// export const DB_PORT = process.env.DB_PORT || 31888;
// export const TOKEN_SECRET = process.env.TOKEN_SECRET || "algún token";
