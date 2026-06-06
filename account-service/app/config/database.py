# app/config/database.py
# Production version using asyncpg with SSL for AWS RDS

import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

db_pool = None

async def connect_db():
    global db_pool
    db_pool = await asyncpg.create_pool(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        database=os.getenv("DB_NAME", "vjcloudbank_accounts"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        ssl="require",
        min_size=2,
        max_size=10,
    )
    await init_tables()
    print("✅ VjCloudBank Account Service connected to PostgreSQL")

async def disconnect_db():
    global db_pool
    if db_pool:
        await db_pool.close()
        print("🔌 Database connection closed")

async def init_tables():
    async with db_pool.acquire() as conn:
        await conn.execute("""
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
    print("✅ Accounts table is ready")

def get_db():
    return db_pool
