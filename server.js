require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js'); // Modul pg
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRole } = require('./middleware/auth.js');

const app = express();
const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;

// === MIDDLEWARE ===
app.use(cors());
app.use(express.json());

// === STATUS ROUTE ===
app.get('/status', (req, res) => {
  res.json({ ok: true, service: 'film-api' });
});

// =AUTH

// REGISTER USER
app.post('/auth/register', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `;

    const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'user']);
    res.status(201).json(result.rows[0]);

  } catch (err) {
    if (err.code === '23505') { 
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    next(err);
  }
});

// REGISTER ADMIN
app.post('/auth/register-admin', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password || password.length < 6) {
    return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const sql = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `;

    const result = await db.query(sql, [username.toLowerCase(), hashedPassword, 'admin']);
    res.status(201).json(result.rows[0]);

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    next(err);
  }
});

// LOGIN
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

    const payload = {
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({
      message: 'Login berhasil',
      token: token
    });

  } catch (err) {
    next(err);
  }
});

// GET ALL MOVIES
app.get('/movies', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        m.id, m.title, m.year,
        d.id AS director_id, d.name AS director_name
      FROM movies m
      LEFT JOIN directors d ON m.director_id = d.id
      ORDER BY m.id ASC
    `);

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
});

// CREATE MOVIE
app.post('/movies', authenticateToken, async (req, res, next) => {
  try {
    const { title, director_id, year } = req.body;

    if (!title || !director_id || !year) {
      return res.status(400).json({ error: "title, director_id, year wajib diisi" });
    }

    const result = await db.query(
      `INSERT INTO movies (title, director_id, year)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, director_id, year]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({ error: "director_id tidak ditemukan" });
    }
    next(err);
  }
});

// =============================
// DIRECTORS CRUD
// =============================

// GET ALL DIRECTORS
app.get('/directors', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM directors ORDER BY id ASC`);
    res.json(result.rows);

  } catch (err) {
    console.error("[GET DIRECTORS ERROR]", err.stack);
    res.status(500).json({ error: "Server error mengambil directors" });
  }
});

// CREATE DIRECTOR (ADMIN ONLY)
app.post('/directors', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, birthyear } = req.body;

    const result = await db.query(
      `INSERT INTO directors (name, birthyear)
       VALUES ($1, $2)
       RETURNING *`,
      [name, birthyear]
    );

    res.json({
      message: "Director berhasil ditambahkan",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("[POST DIRECTOR ERROR]", err.stack);
    res.status(500).json({ error: "Server error menambah directors" });
  }
});

// GET DIRECTOR BY ID
app.get('/directors/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM directors WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Director tidak ditemukan" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("[GET DIRECTOR ID ERROR]", err.stack);
    res.status(500).json({ error: "Server error" });
  }
});

// UPDATE DIRECTOR
app.put('/directors/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, birthyear } = req.body;

    const result = await db.query(
      `UPDATE directors 
       SET name = $1, birthyear = $2
       WHERE id = $3
       RETURNING *`,
      [name, birthyear, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Director tidak ditemukan" });
    }

    res.json({
      message: "Director berhasil diupdate",
      data: result.rows[0]
    });

  } catch (err) {
    console.error("[UPDATE DIRECTOR ERROR]", err.stack);
    res.status(500).json({ error: "Server error update directors" });
  }
});

// DELETE DIRECTOR
app.delete('/directors/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM directors WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Director tidak ditemukan" });
    }

    res.json({ message: "Director berhasil dihapus" });

  } catch (err) {
    console.error("[DELETE DIRECTOR ERROR]", err.stack);
    res.status(500).json({ error: "Server error delete directors" });
  }
});


// ERROR HANDLING 

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
