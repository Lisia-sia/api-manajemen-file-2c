require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('./middleware/auth.js');

const app = express();
const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === STATUS ===
app.get('/status', (req, res) => {
  res.json({ ok: true, service: 'film-api' });
});

// === AUTH ROUTES ===
app.post('/auth/register', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `;
    const result = await db.query(sql, [username.toLowerCase(), hashed, 'user']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    next(err);
  }
});

app.post('/auth/register-admin', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password harus diisi' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `;
    const result = await db.query(sql, [username.toLowerCase(), hashed, 'admin']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

app.post('/auth/login', async (req, res, next) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username.toLowerCase()]);
    const user = result.rows[0];

    if (!user) return res.status(401).json({ error: 'Kredensial tidak valid' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Kredensial tidak valid' });

    const payload = {
      user: { id: user.id, username: user.username, role: user.role }
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login berhasil', token });
  } catch (err) {
    next(err);
  }
});

// ===================== MOVIE ROUTES ===========================
app.get('/movies', async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m."year", d.id as director_id, d.name as director_name
    FROM movies m
    LEFT JOIN directors d ON m.director_id = d.id
    ORDER BY m.id ASC
  `;

  try {
    const result = await db.query(sql);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.post('/movies', authenticateToken, async (req, res, next) => {
  const { title, director_id, year } = req.body;

  if (!title || !director_id || !year) {
    return res.status(400).json({ error: 'title, director_id, year wajib diisi' });
  }

  const sql = `
    INSERT INTO movies (title, director_id, "year")
    VALUES ($1, $2, $3)
    RETURNING *
  `;

  try {
    const result = await db.query(sql, [title, director_id, year]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'director_id tidak ditemukan' });
    }
    next(err);
  }
});

// ===================== DIRECTOR ROUTES ===========================
app.get('/directors', async (req, res, next) => {
  try {
    const result = await db.query('SELECT id, name, "birthYear" FROM directors ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.post('/directors', authenticateToken, authorizeRole('admin'), async (req, res, next) => {
  const { name, birthYear } = req.body;

  if (!name) return res.status(400).json({ error: 'name wajib diisi' });

  const sql = `
    INSERT INTO directors (name, "birthYear")
    VALUES ($1, $2)
    RETURNING *
  `;

  try {
    const result = await db.query(sql, [name, birthYear || null]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ===================== ERROR HANDLER ============================
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif di http://localhost:${PORT}`);
});
