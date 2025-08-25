const express = require('express');
const { runScraper } = require('./services/scraperService.js'); // <-- Impor scraper Anda
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

// Middleware untuk membaca data dari form
app.use(express.urlencoded({ extended: true }));

// Rute GET untuk menampilkan halaman awal
app.get('/', (req, res) => {
    // Kirim variabel 'results' sebagai array kosong agar tidak error saat pertama kali render
    res.render('index', { results: [] }); 
});

// Rute POST untuk memulai proses scraping
app.post('/scrape', async (req, res) => {
    try {
        // Ambil data dari body form
        const { industry, country, city } = req.body;
        
        console.log(`Menerima permintaan untuk scrape: ${industry}, ${country}, ${city}`);

        // Panggil fungsi scraper Anda
        const data = await runScraper(industry, country, city);

        // Render kembali halaman index DENGAN data hasil scraping
        res.render('index', { results: data });

    } catch (error) {
        console.error('Error di route /scrape:', error);
        // Jika ada error, render halaman dengan pesan error
        res.render('index', { results: null });
    }
});


app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});