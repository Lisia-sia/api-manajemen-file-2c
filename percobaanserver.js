// 1. Mengimpor modul Express yang sudah diinstal.
const express = require('express');
// 2. Membuat sebuah instance aplikasi Express. Variabel 'app' ini akan menjadi objek utama server kita.
const app = express();
// 3. Mendefinisikan port di mana server akan berjalan. Port 3000 umum digunakan untuk pengembangan lokal.
const PORT = 3000;

// Middleware untuk mem-parsing body dari request JSON.
// Ini harus ditempatkan SEBELUM definisi rute-rute yang akan menerima JSON.
app.use(express.json());

// Basis Data Dalam Memori (Array of Objects) untuk menyimpan data film.
// Gunakan 'let' agar array ini bisa dimodifikasi (ditambah/hapus) di kemudian hari.
let movies = [
  { id: 1, title: 'Parasite', director: 'Bong Joon-ho', year: 2019 },
  { id: 2, title: 'The Dark Knight', director: 'Christopher Nolan', year: 2008 },
  { id: 3, title: 'Spirited Away', director: 'Hayao Miyazaki', year: 2001 }
];

// 4. Mendefinisikan sebuah rute atau 'endpoint' dasar. Ketika ada permintaan GET ke URL root ('/'),
//    server akan mengirimkan respons berupa teks sederhana.
app.get('/', (req, res) => {
  res.send('Server API Manajemen Film berjalan!');
});

// GET /movies - Endpoint untuk mengambil daftar semua film.
// Ketika klien membuat permintaan GET ke '/movies', server akan merespons dengan seluruh array 'movies'.
app.get('/movies', (req, res) => {
  res.json(movies); // Mengirim data sebagai JSON.
});

// GET /movies/:id - Endpoint untuk mengambil satu film berdasarkan ID-nya.
// ':id' adalah parameter rute, yang berarti nilai setelah '/movies/' akan dianggap sebagai ID.
app.get('/movies/:id', (req, res) => {
  // Mengambil nilai ID dari parameter rute. req.params.id selalu berupa string,
  // jadi perlu diubah ke integer.
  const movieId = parseInt(req.params.id);
  const movie = movies.find(m => m.id === movieId);

  // Jika film tidak ditemukan (movie bernilai undefined), kirim status 404 Not Found.
  if (!movie) {
    return res.status(404).json({ message: 'Film tidak ditemukan' });
  }

  // Jika film ditemukan, kirim objek film tersebut sebagai respons JSON.
  res.json(movie);
});

// POST /movies - Endpoint untuk membuat film baru.
// Klien akan mengirimkan data film (title, director, year) di request body.
app.post('/movies', (req, res) => {
  // Mengambil data dari request body menggunakan destructuring.
  // Ini hanya mungkin karena 'app.use(express.json())' sudah diatur.
  const { title, director, year } = req.body;

  // Validasi input: Memastikan semua field yang diperlukan terisi.
  if (!title || !director || !year) {
    // Jika ada field yang kosong, kirim status 400 Bad Request.
    return res.status(400).json({ message: 'Semua field (title, director, year) harus diisi'});
  }

  // Membuat ID baru untuk film.
  const newId = movies.length > 0 ? movies[movies.length - 1].id + 1 : 1;
  // Membuat objek film baru.
  const newMovie = { id: newId, title, director, year };

  // Menambahkan film baru ke dalam array 'movies'.
  movies.push(newMovie);

  // Mengirim respons dengan status 201 Created (untuk pembuatan sumber daya yang sukses)
  // dan data film yang baru dibuat.
  res.status(201).json(newMovie);
});

// PUT /movies/:id - Endpoint untuk memperbarui data film berdasarkan ID.
// Klien mengirimkan ID film di URL dan data yang diperbarui di request body.
app.put('/movies/:id', (req, res) => {
  const movieId = parseInt(req.params.id);
  // Mencari indeks film dalam array berdasarkan ID.
  const movieIndex = movies.findIndex(m => m.id === movieId);

  // Jika film tidak ditemukan, kirim status 404 Not Found.
  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Film tidak ditemukan' });
  }

  // Mengambil data yang diperbarui dari request body.
  const { title, director, year } = req.body;

  // Melakukan validasi input untuk data yang diperbarui.
  if (!title || !director || !year) {
    return res.status(400).json({ message: 'Semua field (title, director, year) harus diisi untuk pembaruan' });
  }

  // Membuat objek film yang diperbarui. Memastikan ID tetap sama.
  const updatedMovie = { id: movieId, title, director, year };
  // Mengganti objek film lama dengan yang baru di dalam array.
  movies[movieIndex] = updatedMovie;

  // Mengirim respons dengan status 200 OK dan data film yang telah diperbarui.
  res.status(200).json(updatedMovie);
});

// DELETE /movies/:id - Endpoint untuk menghapus film berdasarkan ID.
app.delete('/movies/:id', (req, res) => {
  const movieId = parseInt(req.params.id);
  // Mencari indeks film dalam array berdasarkan ID.
  const movieIndex = movies.findIndex(m => m.id === movieId);

  // Jika film tidak ditemukan, kirim status 404 Not Found.
  if (movieIndex === -1) {
    return res.status(404).json({ message: 'Film tidak ditemukan' });
  }

  // Menghapus satu elemen dari array pada indeks yang ditemukan.
  movies.splice(movieIndex, 1);

  // Mengirim respons dengan status 204 No Content, yang menandakan sukses tanpa body respons.
  res.status(204).send(); // .send() diperlukan karena tidak ada body.
});

// 5. Menjalankan server dan membuatnya "mendengarkan" permintaan yang masuk pada port yang ditentukan.
//    Fungsi callback akan dieksekusi setelah server berhasil dihidupkan.
app.listen(PORT, () => {
    console.log(`Server aktif di http://localhost:${PORT}`);
});