import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// Enable CORS and Large Payload
app.use(cors());
app.use(express.json({ limit: '50mb' }) as RequestHandler);
app.use(express.urlencoded({ limit: '50mb', extended: true }) as RequestHandler);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to safely read env vars
const getEnv = (key: string, def: string) => {
    const val = process.env[key];
    if (!val) return def;
    // Remove comments starting with #, //, or <--, and trim whitespace
    return val.split('#')[0].split('//')[0].trim();
};

// Ensure local data directory exists for file uploads
const DATA_DIR = path.resolve('data'); 
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`✅ [System] Created local data directory at ${DATA_DIR}`);
  } catch (e) {
    console.error(`❌ [System] Failed to create data directory:`, e);
  }
}

// --- Database Connection Pool (Optimized for Production) ---
const pool = mysql.createPool({
  host: getEnv('DB_HOST', '127.0.0.1'),
  port: Number(getEnv('DB_PORT', '3306')),
  user: getEnv('DB_USER', 'root'),
  password: getEnv('DB_PASSWORD', 'password'),
  database: getEnv('DB_NAME', 'slss_db'),
  waitForConnections: true,
  connectionLimit: 20, 
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
  charset: 'utf8mb4'
});

// Test DB Connection
pool.getConnection()
  .then(conn => {
    console.log(`✅ [Database] Successfully connected to MySQL at ${getEnv('DB_HOST', '127.0.0.1')}:${getEnv('DB_PORT', '3306')}`);
    conn.release();
  })
  .catch(err => {
    console.error(`❌ [Database] Connection Failed: ${err.message}`);
    // Non-blocking error logging...
  });

// --- Security / Rate Limiting State (In-Memory) ---
let securityConfig = {
    maxAttempts: 5,
    lockTimeMinutes: 15
};
const loginAttempts = new Map<string, { attempts: number, lockUntil: number }>();

// Security Settings API
app.get('/api/admin/security-settings', (req: Request, res: Response) => {
    res.json(securityConfig);
});

app.post('/api/admin/security-settings', (req: Request, res: Response) => {
    const { maxAttempts, lockTimeMinutes } = req.body;
    if(maxAttempts) securityConfig.maxAttempts = Number(maxAttempts);
    if(lockTimeMinutes) securityConfig.lockTimeMinutes = Number(lockTimeMinutes);
    res.json({ success: true, config: securityConfig });
});


// --- File Upload Route (Local Storage) ---
app.post('/api/upload', async (req: Request, res: Response) => {
  try {
    const { filename, content } = req.body; // Expects base64 content
    
    if (!filename || !content) {
      return res.status(400).json({ success: false, message: 'Missing filename or content' });
    }

    const base64Data = content.replace(/^data:([A-Za-z-+\/]+);base64,/, "");
    const timestamp = Date.now();
    const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(DATA_DIR, safeFilename);

    await fs.promises.writeFile(filePath, base64Data, 'base64');
    
    res.json({ success: true, url: `/data/${safeFilename}`, filename: safeFilename });
  } catch (e: any) {
    console.error("❌ [Upload] Error:", e);
    res.status(500).json({ success: false, message: 'File save failed' });
  }
});

app.use('/data', express.static(DATA_DIR));

// --- Auth Routes ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const ip = req.ip || 'unknown';
  const lockKey = `${username}_${ip}`; 

  const now = Date.now();
  const record = loginAttempts.get(lockKey);

  if (record) {
      if (record.lockUntil > now) {
           const remainingMinutes = Math.ceil((record.lockUntil - now) / 60000);
           return res.status(429).json({ success: false, message: `尝试次数过多，账号锁定。请 ${remainingMinutes} 分钟后再试。` });
      }
      if (record.lockUntil <= now && record.attempts >= securityConfig.maxAttempts) {
           loginAttempts.delete(lockKey);
      }
  }

  try {
    const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length > 0) {
      const user = rows[0];
      if (user.password === password) {
        if (user.status !== 'active') {
          return res.status(403).json({ success: false, message: 'Account pending approval' });
        }
        loginAttempts.delete(lockKey);
        if (typeof user.permissions === 'string') user.permissions = JSON.parse(user.permissions);
        const { password, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
      } else {
        const current = loginAttempts.get(lockKey) || { attempts: 0, lockUntil: 0 };
        current.attempts += 1;
        let msg = 'Invalid credentials';
        if (current.attempts >= securityConfig.maxAttempts) {
            current.lockUntil = now + securityConfig.lockTimeMinutes * 60 * 1000;
            msg = `密码错误，账号已锁定 ${securityConfig.lockTimeMinutes} 分钟`;
        } else {
            const attemptsLeft = securityConfig.maxAttempts - current.attempts;
            msg = `用户名或密码错误 (剩余 ${attemptsLeft} 次机会)`;
        }
        loginAttempts.set(lockKey, current);
        res.status(401).json({ success: false, message: msg });
      }
    } else {
      res.status(401).json({ success: false, message: 'User not found' });
    }
  } catch (e: any) {
    console.error("❌ [Auth] DB Error:", e);
    res.status(500).json({ success: false, message: "Database Error" });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { username, password, role, phone } = req.body;
  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    const permissions: string[] = []; 
    await pool.query(
      'INSERT INTO users (username, password, role, status, phone, permissions) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, role, 'pending', phone, JSON.stringify(permissions)]
    );
    res.json({ success: true, message: 'Registration successful' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const [users]: any = await pool.query('SELECT id, username, role, status, phone, permissions FROM users');
    const safeUsers = users.map((u: any) => ({
      ...u,
      permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : u.permissions
    }));
    res.json(safeUsers);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  const { username, password, role, permissions, status } = req.body;
  try {
    await pool.query(
      'INSERT INTO users (username, password, role, status, permissions) VALUES (?, ?, ?, ?, ?)',
      [username, password, role, status || 'active', JSON.stringify(permissions || [])]
    );
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updates = req.body;
  try {
    const fields = [];
    const values = [];
    for (const key in updates) {
      if (key === 'id') continue;
      fields.push(`${key} = ?`);
      if (key === 'permissions') values.push(JSON.stringify(updates[key]));
      else values.push(updates[key]);
    }
    values.push(id);
    if (fields.length > 0) {
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Order Routes ---
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const [orders]: any = await pool.query('SELECT * FROM repair_orders ORDER BY updated_at DESC');
    const parsedOrders = orders.map((o: any) => ({
      ...o,
      dynamic_data: typeof o.dynamic_data === 'string' ? JSON.parse(o.dynamic_data) : o.dynamic_data
    }));
    res.json(parsedOrders);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/orders/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const [rows]: any = await pool.query('SELECT * FROM repair_orders WHERE id = ?', [id]);
    if (rows.length > 0) {
      const order = rows[0];
      order.dynamic_data = typeof order.dynamic_data === 'string' ? JSON.parse(order.dynamic_data) : order.dynamic_data;
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/orders', async (req: Request, res: Response) => {
  const o = req.body;
  try {
    const [result]: any = await pool.query(
      `INSERT INTO repair_orders 
      (order_number, machine_sn, customer_name, fault_description, discovery_phase, status, assigned_to, template_id, module, current_node_id, dynamic_data, shipment_config_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [o.order_number, o.machine_sn, o.customer_name, o.fault_description, o.discovery_phase, o.status, o.assigned_to, o.template_id, o.module, o.current_node_id, JSON.stringify(o.dynamic_data), o.shipment_config_json]
    );
    res.json({ success: true, order: { ...o, id: result.insertId } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/orders/:id', async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const updates = req.body;
  try {
    const fields = [];
    const values = [];
    for (const key in updates) {
      if (['id', 'created_at', 'updated_at'].includes(key)) continue;
      fields.push(`${key} = ?`);
      if (typeof updates[key] === 'object' && updates[key] !== null) {
         values.push(JSON.stringify(updates[key]));
      } else {
         values.push(updates[key]);
      }
    }
    fields.push('updated_at = NOW()');
    values.push(id);
    if (fields.length > 0) {
      await pool.query(`UPDATE repair_orders SET ${fields.join(', ')} WHERE id = ?`, values);
    }
    const [rows]: any = await pool.query('SELECT * FROM repair_orders WHERE id = ?', [id]);
    const order = rows[0];
    if(order) order.dynamic_data = typeof order.dynamic_data === 'string' ? JSON.parse(order.dynamic_data) : order.dynamic_data;
    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// --- Lifecycle & Events Routes ---
app.get('/api/lifecycle', async (req: Request, res: Response) => {
  try {
    const [events]: any = await pool.query('SELECT * FROM lifecycle_events ORDER BY timestamp DESC');
    res.json(events);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lifecycle', async (req: Request, res: Response) => {
  const e = req.body;
  try {
    const [result]: any = await pool.query(
      `INSERT INTO lifecycle_events (machine_sn, event_type, part_name, old_sn, new_sn, bad_part_reason, operator, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
       [e.machine_sn, e.event_type, e.part_name, e.old_sn, e.new_sn, e.bad_part_reason, e.operator, e.details]
    );
    res.json({ success: true, event: { ...e, id: result.insertId } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Production Assets APIs ---
app.get('/api/asset/:sn', async (req: Request, res: Response) => {
  try {
    const { sn } = req.params;
    const [rows]: any = await pool.query('SELECT * FROM production_assets WHERE machine_sn = ?', [sn]);
    if (rows.length > 0) {
      const asset = rows[0];
      res.json({
        machine_sn: asset.machine_sn,
        customer_name: asset.customer_name,
        model: asset.model
      });
    } else {
      res.status(404).json({ message: 'Asset not found' });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/production/save', async (req: Request, res: Response) => {
  const conn = await pool.getConnection();
  try {
    const { contractNo, data, columnConfig } = req.body; 
    if (!contractNo) throw new Error('Contract No is required');

    await conn.beginTransaction();

    const [batchExists]: any = await conn.query('SELECT contract_no FROM production_batches WHERE contract_no = ?', [contractNo]);
    if (batchExists.length === 0) {
       await conn.query(
          'INSERT INTO production_batches (contract_no, model, customer_name, column_config) VALUES (?, ?, ?, ?)',
          [contractNo, data[0]?.model || '', data[0]?.customer_name || '', JSON.stringify(columnConfig)]
       );
    } else {
       await conn.query(
          'UPDATE production_batches SET model = ?, customer_name = ?, column_config = ?, last_updated = NOW() WHERE contract_no = ?',
          [data[0]?.model || '', data[0]?.customer_name || '', JSON.stringify(columnConfig), contractNo]
       );
    }

    for (const row of data) {
       const { _id, contract_no, machine_sn, model, customer_name, ...specs } = row;
       const jsonData = JSON.stringify(specs);
       await conn.query(
          `INSERT INTO production_assets (_id, contract_no, machine_sn, model, customer_name, data_json)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE machine_sn = VALUES(machine_sn), model = VALUES(model), customer_name = VALUES(customer_name), data_json = VALUES(data_json), updated_at = NOW()`,
           [_id, contractNo, machine_sn || '', model || '', customer_name || '', jsonData]
       );
    }

    if (data.length > 0) {
        const ids = data.map((d: any) => d._id);
        const placeholders = ids.map(() => '?').join(',');
        await conn.query(`DELETE FROM production_assets WHERE contract_no = ? AND _id NOT IN (${placeholders})`, [contractNo, ...ids]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Batch saved successfully' });

  } catch (err: any) {
    await conn.rollback();
    console.error("❌ [Production] Save Error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

app.get('/api/production/list', async (req: Request, res: Response) => {
  try {
    const [batches]: any = await pool.query(`
      SELECT b.contract_no as contractNo, b.model, b.customer_name as customerName, b.last_updated as lastUpdated,
      (SELECT COUNT(*) FROM production_assets a WHERE a.contract_no = b.contract_no) as totalRows,
      (SELECT COUNT(*) FROM production_assets a WHERE a.contract_no = b.contract_no AND a.machine_sn IS NOT NULL AND a.machine_sn != '') as count
      FROM production_batches b
      ORDER BY b.last_updated DESC
    `);
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/production/load/:contractNo', async (req: Request, res: Response) => {
  try {
    const { contractNo } = req.params;
    const [batches]: any = await pool.query('SELECT * FROM production_batches WHERE contract_no = ?', [contractNo]);
    if (batches.length === 0) return res.status(404).json({ error: 'Batch not found' });
    const batch = batches[0];
    const [assets]: any = await pool.query('SELECT * FROM production_assets WHERE contract_no = ?', [contractNo]);
    const data = assets.map((a: any) => {
       const specs = typeof a.data_json === 'string' ? JSON.parse(a.data_json) : a.data_json;
       return {
          _id: a._id,
          contract_no: a.contract_no,
          machine_sn: a.machine_sn,
          model: a.model,
          customer_name: a.customer_name,
          ...specs
       };
    });
    res.json({
       contractNo: batch.contract_no,
       lastUpdated: batch.last_updated,
       columnConfig: typeof batch.column_config === 'string' ? JSON.parse(batch.column_config) : batch.column_config,
       data: data
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/production/all-assets', async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query("SELECT * FROM production_assets WHERE machine_sn IS NOT NULL AND machine_sn != ''");
    const allAssets = rows.map((a: any) => {
        const specs = typeof a.data_json === 'string' ? JSON.parse(a.data_json) : a.data_json;
        return {
           _id: a._id,
           contract_no: a.contract_no,
           machine_sn: a.machine_sn,
           model: a.model,
           customer_name: a.customer_name,
           created_at: a.updated_at, 
           ...specs
        };
    });
    res.json(allAssets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/templates', async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query('SELECT * FROM process_templates');
    const templates = rows.map((t: any) => ({
      ...t,
      formSchema: typeof t.form_schema === 'string' ? JSON.parse(t.form_schema) : t.form_schema,
      workflow: typeof t.workflow === 'string' ? JSON.parse(t.workflow) : t.workflow
    }));
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/templates', async (req: Request, res: Response) => {
  const t = req.body;
  try {
    await pool.query(
      `INSERT INTO process_templates (id, name, description, target_module, form_schema, workflow)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), target_module=VALUES(target_module), form_schema=VALUES(form_schema), workflow=VALUES(workflow)`,
       [t.id, t.name, t.description, t.targetModule, JSON.stringify(t.formSchema), JSON.stringify(t.workflow)]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date(), storage: 'mysql' });
});

app.use(express.static(path.join(__dirname, 'dist')) as RequestHandler);
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

const PORT = Number(getEnv('PORT', '3000'));
app.listen(PORT, () => {
  console.log(`🚀 [Server] SLSS System running on port ${PORT}`);
  console.log(`📁 [Storage] ${DATA_DIR}`);
});