const express = require('express');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const { runScraper } = require('./services/scraperService.js'); 

const app = express();
const PORT = 3000;

// Setup Multer untuk upload file sementara
const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); 

app.get('/', (req, res) => {
    res.render('index', { results: undefined }); 
});

app.post('/scrape-csv', upload.single('csvFile'), (req, res) => {
    if (!req.file) {
        return res.send('Mohon upload file CSV.');
    }

    const keywords = [];

    // Baca file CSV
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
            // Asumsi kolom pertama adalah judul, atau cari kolom bernama 'Judul'
            // Jika CSV tidak punya header, 'row' mungkin array atau object dengan key index
            const judul = row['Judul'] || Object.values(row)[0];
            if (judul) keywords.push(judul);
        })
        .on('end', async () => {
            // Hapus file temp setelah dibaca
            fs.unlinkSync(req.file.path);

            console.log(`📥 Menerima ${keywords.length} judul buku dari CSV.`);
            
            if (keywords.length > 0) {
                try {
                    const data = await runScraper(keywords);
                    res.render('index', { results: data });
                } catch (error) {
                    console.error(error);
                    res.render('index', { results: [] });
                }
            } else {
                res.send("File CSV kosong atau format kolom 'Judul' tidak ditemukan.");
            }
        });
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});