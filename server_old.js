require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { authenticateToken, authorizeRole } = require('./middleware/auth');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3300;
const JWT_SECRET = process.env.JWT_SECRET;


//registrasi user 
app.post('/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: 'Username dan password wajib diisi' });

        const hashed = await bcrypt.hash(password, 10);

        const sql = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
        const params = [username.toLowerCase(), hashed, 'user'];

        db.run(sql, params, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE'))
                    return res.status(400).json({ error: 'Username sudah digunakan' });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Registrasi berhasil', userId: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

//registrasi admin (khusus pengujian / development)
app.post('/auth/register-admin', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            return res.status(400).json({ error: 'Username dan password wajib diisi' });

        const hashed = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`;
        const params = [username.toLowerCase(), hashed, 'admin'];

        db.run(sql, params, function (err) {
            if (err) {
                if (err.message.includes('UNIQUE'))
                    return res.status(409).json({ error: 'Username admin sudah ada' });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Admin berhasil dibuat', userId: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

//login user
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Username dan password wajib diisi' });

    db.get(`SELECT * FROM users WHERE username = ?`, [username.toLowerCase()], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Password salah' });

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        };

        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) return res.status(500).json({ error: 'Gagal membuat token' });
            res.json({ message: 'Login berhasil', token });
        });
    });
});

//movies GET semua film (publik)
app.get('/movies', (req, res) => {
    db.all(`SELECT * FROM movies`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// movies tambah film (hanya perlu login)
app.post('/movies', authenticateToken, (req, res) => {
    const { title, director, year } = req.body;
    db.run(
        `INSERT INTO movies (title, director, year) VALUES (?, ?, ?)`,
        [title, director, year],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`Film ditambahkan oleh user: ${req.user.username}`);
            res.status(201).json({ id: this.lastID, title, director, year });
        }
    );
});

// movies update film (perlu admin)
app.put('/movies/:id', [authenticateToken, authorizeRole('admin')], (req, res) => {
    const { title, director, year } = req.body;
    db.run(
        `UPDATE movies SET title=?, director=?, year=? WHERE id=?`,
        [title, director, year, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`Film diperbarui oleh admin: ${req.user.username}`);
            res.json({ message: 'Film berhasil diperbarui' });
        }
    );
});

// movies hapus film (perlu admin)
app.delete('/movies/:id', [authenticateToken, authorizeRole('admin')], (req, res) => {
    db.run(`DELETE FROM movies WHERE id=?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        console.log(`Film dihapus oleh admin: ${req.user.username}`);
        res.json({ message: 'Film berhasil dihapus' });
    });
});

//directors GET semua sutradara (publik)
app.get('/directors', (req, res) => {
    db.all(`SELECT * FROM directors`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// directors tambah sutradara (perlu login)
app.post('/directors', authenticateToken, (req, res) => {
    const { name, birthYear } = req.body;
    db.run(
        `INSERT INTO directors (name, birthYear) VALUES (?, ?)`,
        [name, birthYear],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`Sutradara ditambahkan oleh user: ${req.user.username}`);
            res.status(201).json({ id: this.lastID, name, birthYear });
        }
    );
});

// directors update sutradara (perlu admin)
app.put('/directors/:id', [authenticateToken, authorizeRole('admin')], (req, res) => {
    const { name, birthYear } = req.body;
    db.run(
        `UPDATE directors SET name=?, birthYear=? WHERE id=?`,
        [name, birthYear, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            console.log(`Sutradara diperbarui oleh admin: ${req.user.username}`);
            res.json({ message: 'Data sutradara berhasil diperbarui' });
        }
    );
});

// directors hapus sutradara (perlu admin)
app.delete('/directors/:id', [authenticateToken, authorizeRole('admin')], (req, res) => {
    db.run(`DELETE FROM directors WHERE id=?`, [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        console.log(`Sutradara dihapus oleh admin: ${req.user.username}`);
        res.json({ message: 'Data sutradara berhasil dihapus' });
    });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});