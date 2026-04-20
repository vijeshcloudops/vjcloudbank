// src/config/db.js
//
// This file creates a "connection pool" to PostgreSQL.
// A pool means we keep several connections open and reuse them,
// instead of opening a new connection for every single request.
// Think of it like having 10 phone lines open instead of calling
// and hanging up every single time.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Maximum number of connections in the pool
  max: 10,
  // Close idle connections after 30 seconds
  idleTimeoutMillis: 30000,
  // Fail fast if a connection takes more than 2 seconds
  connectionTimeoutMillis: 2000,
});

// This runs the first time we connect to make sure the table exists.
// In a real production setup, you'd use a proper migration tool (like Flyway),
// but this works great for our portfolio project.
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

    -- Index on email so login lookups are fast
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  try {
    await pool.query(createTableQuery);
    console.log('✅ Database table "users" is ready');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    // Exit the process if we cannot connect to the database on startup
    process.exit(1);
  }
};

module.exports = { pool, initializeDatabase };
