const { IntelligentScraper } = require('./services/scraperService.js');

async function main() {
    console.log('--- MEMULAI PROSES PENGUJIAN ---');

    // Buat instance dari scraper
    const scraper = new IntelligentScraper({
        headless: true, // Set 'false' untuk melihat browser saat menguji
        deepAnalysis: false // Set 'false' untuk tes yang lebih cepat
    });

    try {
        const results = await scraper.runScraper('SaaS', 'United States', 'California');
        
        if (results && results.length > 0) {
            console.log('✅ Tes Berhasil! Hasilnya:');
            console.log(JSON.stringify(results, null, 2));
        } else {
            console.log('❌ Tes selesai tetapi tidak ada hasil yang dikembalikan.');
        }
    } catch (error) {
        console.error('❌ Tes Gagal dengan error:', error);
    }
}

main();