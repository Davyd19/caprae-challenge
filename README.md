# Proyek Tantangan Developer Intern - Caprae Capital

## Deskripsi Proyek
Aplikasi ini adalah versi yang disempurnakan dari alat *lead generation* saasquatchleads.com. Tujuannya adalah untuk tidak hanya mengambil daftar perusahaan, tetapi juga memperkaya data tersebut dengan informasi tambahan yang berharga bagi tim sales, seperti lokasi, tautan media sosial, dan teknologi yang digunakan.

### Fitur Utama yang Ditambahkan
* **Data Enrichment:** Secara otomatis mengunjungi website setiap perusahaan untuk mengambil data lokasi dan profil media sosial (LinkedIn, Twitter, dll.).
* **Deteksi Teknologi:** Melakukan analisis sederhana untuk mengidentifikasi teknologi kunci yang digunakan oleh website perusahaan (misalnya WordPress, Shopify, React).
* **Antarmuka Web Sederhana:** Memungkinkan pengguna untuk memasukkan kriteria pencarian dan melihat hasilnya langsung di browser.
* **Fallback System:** Jika website target tidak dapat diakses atau terjadi error, aplikasi akan memberikan data demo sebagai hasil alternatif, memastikan aplikasi tidak pernah gagal total.

## Cara Menjalankan Proyek
1.  **Clone repositori ini.**
2.  **Buka terminal di folder proyek.**
3.  **Install semua paket yang dibutuhkan:**
    ```bash
    npm install
    ```
4.  **Jalankan server aplikasi:**
    ```bash
    node app.js
    ```
5.  **Buka browser Anda** dan kunjungi `http://localhost:3000`.
