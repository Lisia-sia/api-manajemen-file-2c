const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

// Muat variabel lingkungan
dotenv.config(); 

const DB_SOURCE = process.env.DB_SOURCE || "movies.db";

// Buka koneksi database
const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
        // Gagal koneksi
        console.error(err.message);
        throw err;
    } else {
        console.log('Terhubung ke database SQLite.');
        
        // --- SKEMA DATABASE SESUAI MODUL 5 ---
        // Tambahkan pembuatan tabel 'users' di sini, setelah tabel 'movies'
        db.run('CREATE TABLE IF NOT EXISTS movies (...)', (err) => {
             // ...
        });
        
        db.run('CREATE TABLE IF NOT EXISTS users ( \
            id INTEGER PRIMARY KEY AUTOINCREMENT, \
            username TEXT NOT NULL UNIQUE, \
            password TEXT NOT NULL \
        )', (err) => { 
            if (err) {
                console.error("Gagal membuat tabel users:", err.message); 
            }
        });
    }
});

module.exports = db;