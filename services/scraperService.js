const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Menerima array judul buku, misal: ["Laskar Pelangi", "Bumi Manusia"]
 */
async function runScraper(keywords) {
    let browser;
    const allScrapedData = [];

    try {
        console.log(`🚀 Memulai Batch Scraping untuk ${keywords.length} kata kunci.`);
        
        browser = await puppeteer.launch({ 
            headless: false, // Set ke 'new' untuk background process
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        const targetUrl = 'http://192.168.35.252/opac/';

        // Loop untuk setiap kata kunci dari CSV
        for (const [index, keyword] of keywords.entries()) {
            // Trim whitespace dan lewati jika kosong
            const cleanKeyword = keyword ? keyword.trim() : '';
            if (!cleanKeyword) continue;

            console.log(`\n[${index + 1}/${keywords.length}] 🔍 Memproses: "${cleanKeyword}"`);

            try {
                // 1. KE HALAMAN UTAMA & CARI
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                const searchInputSelector = '#KataKunci'; 
                const searchButtonSelector = 'input[type="submit"].btn-success';

                await page.waitForSelector(searchInputSelector, { timeout: 5000 });
                // Reset value input
                await page.evaluate((sel) => { document.querySelector(sel).value = '' }, searchInputSelector);
                
                await page.type(searchInputSelector, cleanKeyword);
                
                await Promise.all([
                    page.click(searchButtonSelector),
                    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
                ]);

                // 2. AMBIL HASIL PENCARIAN (LINK BUKU)
                const detailLinks = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a'))
                        .filter(a => a.href.includes('detail-opac') || a.href.includes('?id='))
                        .filter(a => !a.href.includes('download') && !a.href.includes('javascript'))
                        .map(a => a.href);
                });

                const uniqueLinks = [...new Set(detailLinks)].slice(0, 3); // Ambil max 3 buku per judul agar cepat
                
                if (uniqueLinks.length === 0) {
                    console.log(`⚠️ Tidak ditemukan buku untuk: "${cleanKeyword}"`);
                    // Push data kosong sebagai tanda
                    allScrapedData.push({
                        JudulPencarian: cleanKeyword,
                        Status: 'Tidak Ditemukan',
                        Judul: '-', NoPanggil: '-'
                    });
                    continue;
                }

                // 3. BUKA DETAIL & SCRAPE
                for (const link of uniqueLinks) {
                    // Buka tab baru untuk detail agar halaman pencarian utama tidak hilang/refresh
                    const detailPage = await browser.newPage();
                    try {
                        await detailPage.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });

                        const bookData = await detailPage.evaluate((currentKeyword) => {
                            const result = { JudulPencarian: currentKeyword, Status: 'Ditemukan' };

                            const getTableValue = (labelSearch) => {
                                const rows = document.querySelectorAll('.table-striped tbody tr');
                                for (const row of rows) {
                                    const cells = row.querySelectorAll('td');
                                    if (cells.length >= 2) {
                                        const labelText = cells[0].innerText.trim().toLowerCase();
                                        if (labelText.includes(labelSearch.toLowerCase())) return cells[1].innerText.trim();
                                    }
                                }
                                return '-';
                            };

                            result.Judul = getTableValue('Judul');
                            result.Pengarang = getTableValue('Pengarang');
                            result.Penerbitan = getTableValue('Penerbitan');
                            result.DeskripsiFisik = getTableValue('Deskripsi Fisik');
                            result.Konten = getTableValue('Konten');
                            result.Media = getTableValue('Media');
                            result.PenyimpanMedia = getTableValue('Penyimpan Media');
                            result.ISBN = getTableValue('ISBN');
                            result.Subjek = getTableValue('Subjek');
                            result.Bahasa = getTableValue('Bahasa');
                            result.TargetPembaca = getTableValue('Target Pembaca');

                            const callNumberCell = document.querySelector('#detail tbody tr td:nth-child(2)');
                            result.NoPanggil = callNumberCell ? callNumberCell.innerText.trim() : '-';

                            return result;
                        }, cleanKeyword);

                        if (bookData.Judul !== '-') {
                            allScrapedData.push(bookData);
                            console.log(`✅ Scraped: ${bookData.Judul.substring(0, 30)}...`);
                        }

                    } catch (e) {
                        console.error(`❌ Error detail page: ${e.message}`);
                    } finally {
                        await detailPage.close();
                    }
                }

            } catch (err) {
                console.error(`❌ Error processing keyword "${cleanKeyword}": ${err.message}`);
            }
        }

        return allScrapedData;

    } catch (error) {
        console.error("❌ Fatal Error:", error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { runScraper };