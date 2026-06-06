// src/config/db.js
//
// Connection pool to PostgreSQL.
// SSL enabled for production (AWS RDS requires SSL).
// In local development SSL is disabled automatically.

const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // SSL required for AWS RDS — disabled for local development
  ssl: isProduction ? {
    require: true,
    rejectUnauthorized: false  // accepts RDS self-signed certificate
  } : false,
});

const initializeDatabase = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name    VARCHAR(100) NOT NULL,
      email        VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role         VARCHAR(20) DEFAULT 'user',
      is_active    BOOLEAN DEFAULT true,
      created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Database table "users" is ready');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    process.exit(1);
  }
};

module.exports = { pool, initializeDatabase };
