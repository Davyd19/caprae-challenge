const express = require('express');
const { runScraper } = require('./services/scraperService.js'); 
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.render('index', { results: undefined }); 
});

app.post('/scrape', async (req, res) => {
    try {
        const industry = req.body.industry.trim();
        const country = req.body.country.trim();
        const city = req.body.city.trim();
        
        console.log(`Menerima permintaan untuk scrape: ${industry}, ${country}, ${city}`);

        // Panggil fungsi scraper. Jeda tidak lagi diperlukan karena proses scraping asli memakan waktu.
        const data = await runScraper(industry, country, city);
        res.render('index', { results: data });

    } catch (error) {
        console.error('Error di route /scrape:', error);
        res.render('index', { results: [] });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
