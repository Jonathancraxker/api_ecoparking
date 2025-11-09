import { config } from 'dotenv';

config();

export const PORT = process.env.PORT || 4000

export const DB_USER = process.env.DB_USER || "jonathan";
export const DB_PASSWORD = process.env.DB_PASSWORD || "admin";
export const DB_HOST = process.env.DB_HOST || "localhost";
export const DB_DATABASE = process.env.DB_DATABASE || "ecoparking";
export const DB_PORT = process.env.DB_PORT || 3307;
// export const TOKEN_SECRET = process.env.TOKEN_SECRET || "d4ae3d57491eb9fd26db358f982200d4";
export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "d4ae3d57491eb9fd26db358f982200d4";
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "D5Md4ae3d57491eb9fd26db358f982200d4DSM";