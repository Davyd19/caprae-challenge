# Proyek Tantangan Developer Intern - Caprae Capital

## Deskripsi Proyek
Proyek ini adalah pengembangan dan penyempurnaan dari alat lead generation saasquatchleads.com, yang merupakan bagian dari tantangan Developer Intern di Caprae Capital. Tujuan utamanya adalah untuk mengubah alat yang ada menjadi solusi yang lebih canggih dengan mengotomatiskan proses scraping, memperkaya data yang diperoleh, dan menyajikannya dalam antarmuka pengguna yang profesional dan modern.

Aplikasi ini dibangun untuk menunjukkan kemampuan dalam rekayasa terbalik (reverse engineering) alur kerja situs web, mengatasi tantangan teknis seperti anti-bot, dan pada akhirnya, memberikan solusi yang andal dan fungsional untuk demo.

## Fitur Utama
Aplikasi ini memiliki beberapa fitur utama yang dirancang untuk meningkatkan proses lead generation:

1. Antarmuka Pengguna Profesional: UI didesain ulang sepenuhnya dengan tema gelap yang modern dan bersih, terinspirasi dari situs referensi, untuk memberikan pengalaman pengguna yang lebih baik.

2. Scraper Canggih dengan Mode Stealth: Menggunakan puppeteer-extra dengan plugin stealth untuk meniru perilaku pengguna manusia, dirancang untuk melewati mekanisme anti-scraping dasar.

3. Logika Login Otomatis: Skrip secara otomatis menavigasi ke halaman login, memasukkan kredensial, dan mengelola sesi untuk mengakses halaman internal yang dilindungi.

4. Interaksi Halaman Dinamis: Mampu menangani input autocomplete yang dinamis, di mana skrip mengetik, menunggu saran muncul, dan memilih opsi yang relevan.

5. Fitur Fallback Data Dummy Cerdas: Jika proses scraping sungguhan gagal karena alasan apa pun (misalnya, CAPTCHA, perubahan UI, atau pemblokiran IP), aplikasi akan secara otomatis beralih untuk menyajikan data dummy yang relevan dan berkualitas tinggi. Ini memastikan aplikasi selalu berfungsi selama demo.

6. Pop-up Detail Perusahaan: Pengguna dapat mengklik baris mana pun di tabel hasil untuk membuka jendela pop-up (modal) yang menampilkan informasi perusahaan yang lebih mendetail, seperti deskripsi, jumlah karyawan, tahun berdiri, dan kontak.

## Perjalanan Teknis & Solusi
Proses pengembangan menghadapi tantangan utama dalam melakukan scraping terhadap saasquatchleads.com, yang merupakan Single Page Application (SPA) modern yang dilindungi dengan baik.

1. Tantangan Login: Ditemukan bahwa halaman scraper hanya dapat diakses setelah pengguna melakukan login. Solusinya adalah mengimplementasikan alur login otomatis.

2. Masalah Anti-Scraping: Meskipun berhasil login, skrip masih gagal menemukan elemen form. Ini mengindikasikan adanya mekanisme anti-bot yang mendeteksi Puppeteer. Solusinya adalah beralih dari Puppeteer standar ke puppeteer-extra dengan puppeteer-extra-plugin-stealth.

3. Keputusan Strategis (Fallback System): Mengingat situs target sangat terlindungi dan bisa saja mengimplementasikan CAPTCHA atau pemblokiran IP yang tidak dapat diatasi dalam waktu singkat, keputusan strategis dibuat untuk membangun sistem fallback. Logika scraper sungguhan tetap ada, tetapi jika gagal, aplikasi akan menyajikan data dummy yang kaya. Ini menjamin demo aplikasi selalu berjalan mulus sambil tetap menunjukkan kemampuan untuk membangun logika scraping yang kompleks.

## Tumpukan Teknologi (Technology Stack)
Backend: Node.js, Express.js

Frontend: EJS (Embedded JavaScript templates), Tailwind CSS

Web Scraping: Puppeteer, Puppeteer-Extra, Puppeteer-Extra-Plugin-Stealth

Development Environment: Node.js, NPM

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
