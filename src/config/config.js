import { config } from 'dotenv';

config();

export const PORT = process.env.PORT || 4000


export const DB_USER = process.env.DB_USER || "avnadmin";
export const DB_PASSWORD = process.env.DB_PASSWORD || "AVNS_DkC-ZVwVzWQS7NzQ0U5";
export const DB_HOST = process.env.DB_HOST || "mysql-19c19e3e-ecoparking.l.aivencloud.com";
export const DB_DATABASE = process.env.DB_DATABASE || "defaultdb";
export const DB_PORT = process.env.DB_PORT || 25434;

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "d4ae3d57491eb9fd26db358f982200d4";
export const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "D5Md4ae3d57491eb9fd26db358f982200d4DSM";