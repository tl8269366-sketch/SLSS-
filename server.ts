import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'slss_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- API Routes ---

// GET /api/orders
app.get('/api/orders', async (req, res) => {
  try {
    // Check if table exists first to avoid crash on fresh install if DB not ready
    const [rows] = await pool.query('SELECT * FROM repair_orders ORDER BY created_at DESC');
    res.json(rows);
  } catch (err: any) {
    console.error("Database Error:", err);
    res.status(500).json({ error: err.message || 'Database Error' });
  }
});

// GET /api/lifecycle/:sn
app.get('/api/lifecycle/:sn', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM asset_lifecycle_log WHERE machine_sn = ? ORDER BY timestamp DESC', [req.params.sn]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// --- Static Files (Production) ---
// ESM fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React app build directory (dist)
// This assumes 'dist' is generated in the project root
app.use(express.static(path.join(__dirname, 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// This allows React Router to handle client-side routing.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SLSS Server running on port ${PORT}`);
  console.log(`Database Host: ${process.env.DB_HOST || 'localhost'}`);
});