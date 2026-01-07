const express = require('express');
const multer = require('multer');
const fs = require('fs');
const xlsx = require('xlsx'); // Library untuk Excel
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

// Route baru untuk menangani file Excel
app.post('/scrape-excel', upload.single('excelFile'), async (req, res) => {
    if (!req.file) {
        return res.send('Mohon upload file Excel (.xlsx / .xls).');
    }

    try {
        // 1. Baca File Excel
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; // Ambil sheet pertama
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log(`📥 Menerima ${rawData.length} baris data dari Excel.`);

        if (rawData.length > 0) {
            // 2. Jalankan Scraper dengan data mentah (objek)
            // Sistem akan mengecek kolom di dalam service
            const finalData = await runScraper(rawData);
            
            // Hapus file temp setelah proses selesai
            fs.unlinkSync(req.file.path);

            res.render('index', { results: finalData });
        } else {
            fs.unlinkSync(req.file.path);
            res.send("File Excel kosong atau tidak terbaca.");
        }

    } catch (error) {
        console.error("Error processing file:", error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.render('index', { results: [] });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});