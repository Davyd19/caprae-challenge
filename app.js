const express = require('express');
// Impor kelas IntelligentScraper, bukan fungsi
const { IntelligentScraper } = require('./services/scraperService.js'); 
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    // Gunakan 'null' agar kita bisa membedakan antara belum ada hasil dan hasil kosong
    res.render('index', { results: null }); 
});

app.post('/scrape', async (req, res) => {
    try {
        const { industry, country, city } = req.body;
        console.log(`Menerima permintaan untuk scrape: ${industry}, ${country}, ${city}`);

        // 1. Buat instance baru dari scraper Anda
        const scraper = new IntelligentScraper({ headless: true });

        // 2. Panggil metode runScraper dari instance tersebut
        const data = await scraper.runScraper(industry, country, city);

        // Render kembali halaman index DENGAN data hasil scraping
        res.render('index', { results: data });

    } catch (error) {
        console.error('Error di route /scrape:', error);
        // Jika ada error, render halaman dengan array kosong dan pesan di konsol
        res.render('index', { results: [] });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});