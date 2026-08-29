# RESPONKU KRS

RESPONKU KRS adalah aplikasi berbasis web cerdas (*AI Smart Schedule Builder*) yang dirancang khusus untuk membantu mahasiswa menyusun jadwal perkuliahan secara otomatis, mendeteksi bentrok waktu (*conflict detection*), memfilter berdasarkan dosen favorit (*goldlist*), serta membatasi total SKS maksimal 24 SKS. Aplikasi ini terintegrasi langsung dengan Google OAuth dan membaca data jadwal perkuliahan dari Google Sheets prodi.

Domain Resmi: `krs.responku.id`

---

## **Fitur Utama**
* **Google Authentication:** Integrasi login aman menggunakan akun Google institusi/kampus untuk mengakses spreadsheet privat.
* **Live Google Sheets Sync:** Mengambil data jadwal perkuliahan secara langsung dari tautan Google Sheets.
* **Interactive Course Checklist:** Daftar mata kuliah beserta SKS dan dosen pengajar yang diekstrak secara otomatis dari spreadsheet.
* **Smart SKS Tracker & Limit:** Perhitungan total SKS secara *real-time* dengan batas maksimal 24 SKS untuk mencegah kelebihan mengambil SKS.
* **Goldlist Dosen Favorit:** Memprioritaskan pilihan kelas berdasarkan dosen pengajar pilihan mahasiswa.
* **Automatic Conflict Detection:** Algoritma *backtracking* untuk menyusun kombinasi jadwal optimal tanpa ada waktu kuliah yang bertabrakan.

---

## **Cara Kerja & Alur Aplikasi**
1. **Autentikasi Pengguna:** Pengguna melakukan *Sign in with Google* menggunakan akun berizin agar aplikasi mendapatkan akses token untuk membaca spreadsheet prodi.
2. **Sinkronisasi Data:** Pengguna memasukkan tautan Google Sheets jadwal kuliah, lalu sistem akan mengunduh dan memparsing data baris perkuliahan menggunakan pustaka `xlsx`.
3. **Ekstraksi Mata Kuliah:** Sistem membaca kolom mata kuliah, kode, SKS, dan dosen, lalu menyajikannya dalam bentuk daftar pilihan interaktif (*checklist*).
4. **Validasi SKS & Susun Jadwal:** Saat pengguna mencentang mata kuliah, sistem menghitung total SKS secara instan (maksimal 24 SKS). Ketika tombol *Generate* diklik, algoritma menyaring kelas terbaik yang tidak bentrok dan sesuai preferensi dosen.

---

## **Cara Penggunaan**
1. Buka aplikasi di browser melalui domain **`krs.responku.id`** (atau `http://localhost:3000` untuk mode pengembangan lokal).
2. Klik tombol **Login Akun Google** di sudut kanan atas dan pilih akun Google yang memiliki akses ke spreadsheet prodi.
3. Salin dan tempel tautan **Google Sheets Jadwal Kuliah** ke kolom input yang tersedia, lalu klik **Sinkronkan Link**.
4. Pilih mata kuliah yang diinginkan dengan mencentang kotak pilihan (*checklist*). Perhatikan indikator **Total SKS** agar tidak melebihi batas 24 SKS.
5. *(Opsional)* Masukkan nama dosen favorit pada kolom **Goldlist Dosen Favorit** (pisahkan dengan koma) jika ingin memprioritaskan kelas dari dosen tertentu.
6. Klik tombol **Generate Jadwal Optimal & Cek Bentrok** untuk melihat hasil susunan jadwal kuliah terbaikmu.

---

## **Instalasi & Pengembangan Lokal**
Jika ingin menjalankan proyek ini di komputer lokal untuk keperluan pengembangan:

1. Clone repositori ini dan masuk ke direktori proyek.
2. Install *dependencies* yang dibutuhkan:
   ```bash
   npm install