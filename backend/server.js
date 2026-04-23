const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');

if (fs.existsSync('.env')) {
  process.loadEnvFile();
}

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'tasks',
});

async function waitForDb(retries = 15, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('Connected to Postgres');
      return;
    } catch (err) {
      console.log(`DB not ready (${i}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Database unreachable after retries');
}

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      done BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/tasks', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, title, done, created_at FROM tasks ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

app.post('/api/tasks', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const { rows } = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, done, created_at',
      [title.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'UPDATE tasks SET done = NOT done WHERE id = $1 RETURNING id, title, done, created_at',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/tasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

const port = Number(process.env.PORT) || 3000;

waitForDb()
  .then(initSchema)
  .then(() => {
    app.listen(port, () => console.log(`Backend listening on port ${port}`));
  })
  .catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
