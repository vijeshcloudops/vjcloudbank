# app/config/database.py
# Windows-compatible version using psycopg2-binary (no asyncpg needed)

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

db_pool = None

def connect_db():
    global db_pool
    db_pool = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "vjcloudbank_accounts"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
    )
    db_pool.autocommit = True
    init_tables()
    print("✅ VjCloudBank Account Service connected to PostgreSQL")

def disconnect_db():
    global db_pool
    if db_pool:
        db_pool.close()
        print("🔌 Database connection closed")

def init_tables():
    cursor = db_pool.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id        UUID NOT NULL,
            account_number VARCHAR(20) UNIQUE NOT NULL,
            account_type   VARCHAR(20) NOT NULL DEFAULT 'savings',
            balance        NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
            currency       VARCHAR(10) NOT NULL DEFAULT 'INR',
            status         VARCHAR(20) NOT NULL DEFAULT 'active',
            description    TEXT,
            created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);
    """)
    cursor.close()
    print("✅ Accounts table is ready")

def get_db():
    return db_pool
