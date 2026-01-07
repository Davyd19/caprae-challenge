const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

/**
 * Helper untuk membersihkan string
 */
function cleanText(text) {
    return text ? text.replace(/\s+/g, ' ').trim() : '';
}

/**
 * Parsing data Penerbitan menjadi Tempat, Penerbit, dan Tahun
 * Format umum: "Kota : Penerbit, Tahun"
 */
function parsePenerbitan(rawText) {
    let tempat = '';
    let penerbit = rawText;
    let tahun = '';

    if (rawText) {
        // Coba regex format baku: "Tempat : Penerbit, Tahun"
        const match = rawText.match(/^(.*?)\s*:\s*(.*?),\s*(\d{4})/);
        
        if (match) {
            tempat = cleanText(match[1]);
            penerbit = cleanText(match[2]);
            tahun = cleanText(match[3]);
        } else {
            // Fallback parsing manual
            const yearMatch = rawText.match(/(\d{4})/);
            if (yearMatch) {
                tahun = yearMatch[0];
            }

            const splitByColon = rawText.split(':');
            if (splitByColon.length > 1) {
                tempat = cleanText(splitByColon[0]);
                let sisa = splitByColon.slice(1).join(':');
                penerbit = sisa.replace(tahun, '').replace(/[,;]+$/, '').trim();
            } else {
                penerbit = rawText.replace(tahun, '').replace(/[,;]+$/, '').trim();
            }
        }
    }

    return { tempat, penerbit, tahun };
}

async function runScraper(dataRows) {
    let browser;
    const finalResults = [];
    const scrapedCache = new Map();

    // Mapping key output sesuai Header CSV User
    const targetKeys = [
        'Judul Buku*', 
        'Edisi', 
        'Tahun Terbit', 
        'Tempat Terbit', 
        'Deskripsi Fisik', 
        'ISBN', 
        'no.panggil', 
        'Bahasa', 
        'Kategori', 
        'Pengarang', 
        'Penerbit', 
        'Subjek ', 
        'Nomor Induk', 
        'Nomor Barcode', 
        'Catatan', 
        'Abstrak',
        'url gambar buku'
    ];

    try {
        console.log(`🚀 Memulai Smart Scraping (Safe Update: Tidak menghapus data lama) untuk ${dataRows.length} baris.`);
        
        browser = await puppeteer.launch({ 
            headless: false, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        const targetUrl = 'http://192.168.35.252/opac/'; // URL OPAC

        page.setDefaultNavigationTimeout(120000); 

        for (const [index, row] of dataRows.entries()) {
            let processedRow = { ...row };
            
            const excelTitleKey = Object.keys(row).find(k => k.toLowerCase().includes('judul'));
            const judulBuku = excelTitleKey ? row[excelTitleKey] : '';
            const cacheKey = judulBuku ? judulBuku.toString().toLowerCase().trim() : '';

            // Pastikan semua kolom target ada di object (default string kosong jika belum ada)
            targetKeys.forEach(key => {
                if (!processedRow.hasOwnProperty(key)) processedRow[key] = '';
            });

            // Helper untuk update data tanpa menghapus data lama yang sudah ada
            const safeUpdateRow = (sourceData) => {
                Object.keys(sourceData).forEach(key => {
                    const newValue = sourceData[key];
                    // HANYA update jika data baru TIDAK KOSONG
                    if (newValue && newValue.toString().trim() !== '') {
                        processedRow[key] = newValue;
                    }
                });
            };

            // 1. CEK CACHE
            if (cacheKey && scrapedCache.has(cacheKey)) {
                const cachedData = scrapedCache.get(cacheKey);
                if (cachedData.notFound) {
                    console.log(`♻️  [${index + 1}/${dataRows.length}] Skip (Cache Not Found): "${judulBuku}"`);
                    processedRow['Status'] = 'Tidak Ditemukan (Cache)';
                } else {
                    console.log(`♻️  [${index + 1}/${dataRows.length}] Hit Cache: "${judulBuku}"`);
                    safeUpdateRow(cachedData); // Gunakan safe update
                    processedRow['Status'] = 'Diperbarui (Cache)';
                }
                finalResults.push(processedRow);
                continue;
            }

            // 2. VALIDASI JUDUL
            if (!judulBuku || judulBuku.toString().trim() === '') {
                console.log(`⚠️  [${index + 1}/${dataRows.length}] Judul Kosong. Skip.`);
                processedRow['Status'] = 'Judul Kosong';
                finalResults.push(processedRow);
                continue;
            }

            // 3. SCRAPING
            console.log(`\n🔍 [${index + 1}/${dataRows.length}] Searching: "${judulBuku}"`);
            processedRow['Status'] = 'Proses Scraping...';

            try {
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

                const searchInputSelector = '#KataKunci'; 
                const searchButtonSelector = 'input[type="submit"].btn-success';

                await page.waitForSelector(searchInputSelector, { timeout: 10000 });
                await page.evaluate((sel) => { document.querySelector(sel).value = '' }, searchInputSelector);
                await page.type(searchInputSelector, judulBuku);
                
                await Promise.all([
                    page.click(searchButtonSelector),
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }) 
                ]);

                // Ambil link detail
                const detailLink = await page.evaluate(() => {
                    const anchors = Array.from(document.querySelectorAll('a'));
                    const target = anchors.find(a => 
                        (a.href.includes('detail-opac') || a.href.includes('?id=')) && 
                        !a.href.includes('download') && 
                        !a.href.includes('javascript') &&
                        !a.href.includes('booking')
                    );
                    return target ? target.href : null;
                });

                if (!detailLink) {
                    console.log(`❌ Tidak ditemukan.`);
                    processedRow['Status'] = 'Tidak Ditemukan';
                    if (cacheKey) scrapedCache.set(cacheKey, { notFound: true });
                    finalResults.push(processedRow);
                    continue;
                }

                await page.goto(detailLink, { waitUntil: 'domcontentloaded', timeout: 60000 });

                // Scrape Data
                const rawData = await page.evaluate(() => {
                    const result = {};

                    const getTableValue = (labelKey) => {
                        const rows = document.querySelectorAll('.table-striped tbody tr');
                        for (const row of rows) {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 2) {
                                const label = cells[0].innerText.trim().toLowerCase();
                                if (label.includes(labelKey.toLowerCase())) {
                                    return cells[1].innerText.trim();
                                }
                            }
                        }
                        return '';
                    };

                    const getCoverUrl = () => {
                        const img = document.querySelector('img[src*="sampul_koleksi"]');
                        if (img) return img.src;
                        const backup = document.querySelector('.image img, .s-cover img');
                        return backup ? backup.src : '';
                    };

                    const getEksemplarData = () => {
                        const table = document.getElementById('detail');
                        if (!table) return { callNumber: '', barcode: '' };
                        const firstRow = table.querySelector('tbody tr');
                        if (!firstRow) return { callNumber: '', barcode: '' };

                        const cols = firstRow.querySelectorAll('td');
                        return {
                            barcode: cols[0] ? cols[0].innerText.trim() : '',
                            callNumber: cols[1] ? cols[1].innerText.trim() : ''
                        };
                    };

                    result.pengarang = getTableValue('Pengarang') || getTableValue('Penulis');
                    result.penerbitan = getTableValue('Penerbitan');
                    result.deskripsi = getTableValue('Deskripsi Fisik');
                    result.isbn = getTableValue('ISBN');
                    result.subjek = getTableValue('Subjek') || getTableValue('Subyek');
                    result.bahasa = getTableValue('Bahasa');
                    result.edisi = getTableValue('EDISI') || getTableValue('Edisi');
                    result.targetPembaca = getTableValue('Target Pembaca');
                    result.catatan = getTableValue('Catatan');
                    result.abstrak = getTableValue('Abstrak');
                    
                    const eks = getEksemplarData();
                    result.noPanggil = eks.callNumber;
                    result.barcode = eks.barcode; 
                    result.imageUrl = getCoverUrl();

                    return result;
                });

                const { tempat, penerbit, tahun } = parsePenerbitan(rawData.penerbitan);

                // Mapping ke Kolom Excel
                const newData = {
                    'Judul Buku*': judulBuku,
                    'Edisi': rawData.edisi,
                    'Tahun Terbit': tahun,
                    'Tempat Terbit': tempat,
                    'Deskripsi Fisik': rawData.deskripsi,
                    'ISBN': rawData.isbn,
                    'no.panggil': rawData.noPanggil,
                    'Bahasa': rawData.bahasa,
                    'Kategori': rawData.targetPembaca,
                    'Pengarang': rawData.pengarang,
                    'Penerbit': penerbit,
                    'Subjek ': rawData.subjek,
                    // 'Nomor Induk': ... (TIDAK ADA DISINI, AMAN)
                    'Nomor Barcode': rawData.barcode, 
                    'Catatan': rawData.catatan,
                    'Abstrak': rawData.abstrak,
                    'url gambar buku': rawData.imageUrl,
                    'Status': 'Sukses Scrape'
                };

                // Gunakan safe update untuk processedRow
                safeUpdateRow(newData);

                // Simpan ke cache (tetap simpan hasil scrape apa adanya)
                if (cacheKey) scrapedCache.set(cacheKey, newData);

                console.log(`✅ Sukses: ${judulBuku}`);

            } catch (err) {
                console.error(`❌ Error scraping "${judulBuku}": ${err.message}`);
                processedRow['Status'] = 'Error Scrape';
            }

            finalResults.push(processedRow);
        }

        return finalResults;

    } catch (error) {
        console.error("❌ Fatal Service Error:", error);
        return dataRows;
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { runScraper };