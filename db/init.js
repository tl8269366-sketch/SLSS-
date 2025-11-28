
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely read env vars even if they contain trailing comments/spaces
const getEnv = (key, def) => {
    const val = process.env[key];
    if (!val) return def;
    // Remove any potential trailing comments starting with # or //, and trim whitespace
    return val.split('#')[0].split('//')[0].trim();
};

const dbConfig = {
    host: getEnv('DB_HOST', '127.0.0.1'),
    port: Number(getEnv('DB_PORT', '3306')),
    user: getEnv('DB_USER', 'root'),
    password: getEnv('DB_PASSWORD', 'password'),
    multipleStatements: true,
    charset: 'utf8mb4'
};

async function initDatabase() {
    console.log(`🚀 Starting Database Initialization...`);
    console.log(`   Target: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}`);
    
    let connection;
    try {
        // 1. Try connecting to the specific database first
        try {
            connection = await mysql.createConnection({
                ...dbConfig,
                database: getEnv('DB_NAME', 'slss_db')
            });
            console.log(`✅ Connected to existing database '${getEnv('DB_NAME', 'slss_db')}'`);
        } catch (connErr) {
            // If database doesn't exist or connection fails, try connecting to root/server without DB selected
            if (connErr.code === 'ER_BAD_DB_ERROR' || connErr.code === 'BAD_DB_ERROR') {
                 console.log("   Database does not exist, attempting to create it...");
                 connection = await mysql.createConnection(dbConfig);
            } else {
                throw connErr;
            }
        }

        // 2. Read Schema File
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }
        
        let schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Remove Byte Order Mark (BOM)
        if (schemaSql.charCodeAt(0) === 0xFEFF) {
            schemaSql = schemaSql.slice(1);
        }

        // 3. Execute Schema
        const dbName = getEnv('DB_NAME', 'slss_db');
        if (!connection.config.database) {
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await connection.changeUser({ database: dbName });
        }
        
        console.log("   Applying schema.sql...");
        await connection.query(schemaSql);
        console.log("✅ Database schema applied successfully.");

        // 4. Seed Default Admin
        const [rows] = await connection.query('SELECT * FROM users WHERE username = ?', ['stars']);
        
        if (rows.length === 0) {
            const adminUser = {
                username: 'stars',
                password: 'Gyh@20210625', 
                role: 'ADMIN',
                status: 'active',
                permissions: JSON.stringify([
                    'VIEW_DASHBOARD', 'VIEW_ORDERS', 'MANAGE_ORDERS', 'DESIGN_PROCESS',
                    'PROD_ENTRY_ASSEMBLY', 'PROD_ENTRY_INSPECT_INIT', 'PROD_ENTRY_AGING', 
                    'PROD_ENTRY_INSPECT_FINAL', 'PROD_REPAIR', 'PROD_QUERY', 'MANAGE_SYSTEM'
                ])
            };

            await connection.query(
                'INSERT INTO users (username, password, role, status, permissions) VALUES (?, ?, ?, ?, ?)',
                [adminUser.username, adminUser.password, adminUser.role, adminUser.status, adminUser.permissions]
            );
            console.log("✅ Default Admin user 'stars' created.");
        } else {
            console.log("ℹ️ Admin user already exists.");
        }

    } catch (err) {
        console.error("\n❌ Initialization Failed!");
        console.error(`   Error Code: ${err.code}`);
        console.error(`   Message: ${err.message}`);
        
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            console.error("\n👉 Connection Fixes:");
            console.error("   1. Check if MySQL is running.");
            console.error("   2. Verify DB_HOST and DB_PORT in .env file.");
            console.error("   3. Ensure no trailing text/comments in .env values.");
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error("\n👉 Permission Fixes:");
            console.error("   1. Check DB_USER and DB_PASSWORD.");
            console.error(`   2. Ensure user '${dbConfig.user}' is allowed to connect from '${dbConfig.host}'.`);
        }
    } finally {
        if (connection) await connection.end();
        console.log("🏁 Script finished.");
        process.exit();
    }
}

initDatabase();
