/**
 * @file database.js
 * @description Configuración de la conexión a PostgreSQL con soporte SSL para Render.
 */
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;

export const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});