require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js'); // Menggunakan modul pg baru
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('./middleware/auth.js');

const app = express();
const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === ROUTES ===
app.get('/status', (req, res) => {
  res.json({ ok: true, service: 'film-api' });
});

// === AUTH ROUTES (Refactored for pg) ===
app.post('/auth/register', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const sql = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username';
    const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'user']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // Kode error unik PostgreSQL
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    next(err);
  }
});

app.post('/auth/register-admin', async (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const sql = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username';
    const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'admin']);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    next(err);
  }
});

app.post('/auth/login', async (req, res, next) => {
  const { username, password } = req.body;
  try {
    const sql = "SELECT * FROM users WHERE username = $1";
    const result = await db.query(sql, [username.toLowerCase()]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Kredensial tidak valid' });
    }
    const payload = { user: { id: user.id, username: user.username, role: user.role } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login berhasil', token: token });
  } catch (err) {
    next(err);
  }
});

// === MOVIE ROUTES (Refactored for pg) ===
app.get('/movies', async (req, res, next) => {
  const sql = `
    SELECT m.id, m.title, m.year,
           d.id AS director_id, d.name AS director_name
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

  try {
    const result = await db.query(
      `INSERT INTO movies (title, director_id, year)
       VALUES ($1, $2, $3) RETURNING *`,
      [title, director_id, year]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'director_id tidak ditemukan' });
    }
    next(err);
  }
});

//DIRECTOR ROUTES
app.get('/directors', async (req, res, next) => {
  try {
    const result = await db.query("SELECT * FROM directors ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

app.post('/directors', authenticateToken, async (req, res, next) => {
  const { name, birthYear } = req.body;

  if (!name || !birthYear) {
    return res.status(400).json({ error: 'name dan birthYear wajib diisi' });
  }

  try {
    const result = await db.query(
      `INSERT INTO directors (name, birth_year)
       VALUES ($1, $2) RETURNING *`,
      [name, birthYear]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});


// === FALLBACK & ERROR HANDLING ===
app.use((req, res) => {
  res.status(404).json({ error: 'Rute tidak ditemukan' });
});

app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan pada server' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server aktif di http://localhost:${PORT}`);
});
