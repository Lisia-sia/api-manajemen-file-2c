require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const DB_SOURCE = process.env.DB_SOURCE || 'movies.db';

const db = new sqlite3.Database(DB_SOURCE, (err) => {
  if (err) {
    console.error("Gagal terhubung ke basis data:", err.message);
    throw err;
  } else {
    console.log('Terhubung ke basis data SQLite.');

    //tabel user
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      )
    `, (err) => {
      if (err) {
        console.error("Gagal membuat tabel users:", err.message);
      } else {
        console.log("Tabel users siap digunakan (dengan kolom role).");
      }
    });

    //tabel movies
    db.run(`
      CREATE TABLE IF NOT EXISTS movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        director TEXT NOT NULL,
        year INTEGER NOT NULL
      )
    `, (err) => {
      if (!err) {
        db.get("SELECT COUNT(*) as count FROM movies", (err, row) => {
          if (row && row.count === 0) {
            const insert = 'INSERT INTO movies (title, director, year) VALUES (?, ?, ?)';
            db.run(insert, ["Parasite", "Bong Joon-ho", 2019]);
            db.run(insert, ["The Dark Knight", "Christopher Nolan", 2008]);
            db.run(insert, ["Interstellar", "Christopher Nolan", 2014]);
            db.run(insert, ["Spirited Away", "Hayao Miyazaki", 2001]);
            db.run(insert, ["Oppenheimer", "Christopher Nolan", 2023]);
            console.log("Data awal untuk tabel movies berhasil ditambahkan.");
          }
        });
      }
    });

    //tabel directors
    db.run(`
      CREATE TABLE IF NOT EXISTS directors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        birthYear INTEGER NOT NULL
      )
    `, (err) => {
      if (!err) {
        db.get("SELECT COUNT(*) as count FROM directors", (err, row) => {
          if (row && row.count === 0) {
            const insert = 'INSERT INTO directors (name, birthYear) VALUES (?, ?)';
            db.run(insert, ["Christopher Nolan", 1970]);
            db.run(insert, ["Hayao Miyazaki", 1941]);
            db.run(insert, ["Bong Joon-ho", 1969]);
            db.run(insert, ["Greta Gerwig", 1983]);
            db.run(insert, ["Denis Villeneuve", 1967]);
            console.log("Data awal untuk tabel directors berhasil ditambahkan.");
          }
        });
      }
    });
  }
});

module.exports = db;