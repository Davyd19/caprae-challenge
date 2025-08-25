const express = require('express');
const { runScraper } = require('./services/scraperService.js');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Rute GET untuk menampilkan halaman awal
app.get('/', (req, res) => {
    res.render('index', { results: null, loading: false }); 
});

// Rute POST untuk memulai proses scraping
app.post('/scrape', async (req, res) => {
    const { industry, country, city } = req.body;
    console.log(`Menerima permintaan untuk scrape: ${industry}, ${country}, ${city}`);

    // Segera render halaman dengan status loading
    res.render('index', { results: null, loading: true });

    // Jalankan proses scraping di background
    try {
        const data = await runScraper(industry, country, city);
        // Setelah selesai, data bisa disimpan atau diproses lebih lanjut.
        // Untuk tantangan ini, kita hanya log di konsol server.
        console.log("Scraping Selesai di server, data siap.");
        // Dalam aplikasi nyata, Anda akan menggunakan WebSockets atau teknik lain 
        // untuk mengirim data ini kembali ke klien tanpa me-refresh halaman.
    } catch (error) {
        console.error('Error selama proses scraping di background:', error);
    }
});


app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});