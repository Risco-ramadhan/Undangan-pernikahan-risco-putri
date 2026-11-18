# Undangan Digital Minang Gonjong — Risco & Putri (Frontend Statis)

Replika tampilan dan interaktivitas 1:1 berbasis frontend statis (**HTML + CSS + Vanilla JS + Three.js WebGL**) tanpa backend.

## Fitur Utama
- **Sampul Ruangan 3D (`room3d.js`)**: lorong berlengkung bergaya merah-emas dengan animasi kamera berjalan masuk dan pintu ganda terbuka saat tombol **Buka Undangan** diklik (dengan *fallback* pintu CSS 3D jika WebGL tidak tersedia).
- **Partikel 3D Sparkle (`fx3d.js`)**: partikel cahaya emas WebGL dengan *parallax* mouse/giroskop dan efek percepatan (*burst*) saat undangan dibuka atau ucapan dikirim.
- **Nama Tamu Dinamis (`?to=...`)**: membaca parameter URL `?to=Nama+Tamu` via `URLSearchParams` (default `Tamu Undangan`).
- **Musik Latar MP3 (`assets/music.mp3`)**: otomatis diputar saat undangan dibuka, tombol putar/jeda berputar di pojok kanan bawah, dan otomatis dijeda saat tab disembunyikan. Anda dapat mengganti file `assets/music.mp3` dengan lagu pilihan sendiri.
- **Efek Interaktif**: *scroll reveal*, navigasi bawah aktif (`IntersectionObserver`), efek *tilt 3D* pada kartu (mouse & giroskop), *countdown* real-time, tombol salin rekening (*clipboard* + notifikasi *toast*), serta form RSVP & Ucapan lokal (`localStorage`).

## Cara Menjalankan Secara Lokal
Karena `room3d.js` dan `fx3d.js` menggunakan ES Modules (`<script type="module">`), jalankan melalui server HTTP lokal (bukan `file://`):

```bash
npx serve .
```

Lalu buka di browser, misalnya:
- `http://localhost:3000/?to=Budi%20Santoso`
