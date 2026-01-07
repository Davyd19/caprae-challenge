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
 * Parsing data Penerbitan menjadi Penerbit dan Tahun
 * Format umum: "Kota : Penerbit, Tahun"
 */
function parsePenerbitan(rawText) {
    let penerbit = rawText;
    let tahun = '';

    if (rawText) {
        // Coba ambil tahun (4 digit di akhir atau di antara tanda baca)
        const yearMatch = rawText.match(/(\d{4})/);
        if (yearMatch) {
            tahun = yearMatch[0];
        }

        // Coba ambil penerbit (biasanya setelah " : " dan sebelum ",")
        // Contoh: "Jakarta : Gramedia Pustaka Utama, 2018"
        const splitByColon = rawText.split(':');
        if (splitByColon.length > 1) {
            let tempPub = splitByColon[1];
            // Hapus tahun dan koma
            tempPub = tempPub.replace(/,\s*\d{4}.*$/, '').replace(/\d{4}/, '');
            // Hapus tanda baca sisa
            penerbit = cleanText(tempPub.replace(/[,;]/g, ''));
        } else {
            // Jika tidak ada titik dua, ambil sebelum tahun
            penerbit = rawText.replace(tahun, '').replace(/[,;]/g, '').trim();
        }
    }

    return { penerbit, tahun };
}

async function runScraper(dataRows) {
    let browser;
    const finalResults = [];
    const scrapedCache = new Map(); // Cache untuk menyimpan data hasil scraping ATAU status tidak ditemukan

    // Definisikan urutan kolom sesuai permintaan, ditambah 'url gambar buku'
    const targetKeys = [
        'JUDUL', 'PENULIS', 'PENERBIT', 'TAHUN TERBIT', 
        'Deskripsi Fisik', 'Konten', 'Media', 'Penyimpan Media', 
        'ISBN', 'Subjek', 'Bahasa', 'Target Pembaca', 
        'no.panggil', 'no.induk', 'url gambar buku'
    ];

    try {
        console.log(`🚀 Memulai Smart Scraping (Format Khusus + Gambar Sampul Koleksi + Cache) untuk ${dataRows.length} baris.`);
        
        browser = await puppeteer.launch({ 
            headless: false, // Ubah ke "new" untuk production
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
            defaultViewport: null
        });
        
        const page = await browser.newPage();
        const targetUrl = 'http://192.168.35.252/opac/';

        // Set default timeout global untuk semua navigasi menjadi 2 menit
        page.setDefaultNavigationTimeout(120000); 

        for (const [index, row] of dataRows.entries()) {
            // 1. Normalisasi Input ke Format Output
            let processedRow = {};
            
            // Cari key judul dari excel (case insensitive)
            const excelTitleKey = Object.keys(row).find(k => k.toLowerCase().includes('judul'));
            const judulBuku = excelTitleKey ? row[excelTitleKey] : '';
            const cacheKey = judulBuku ? judulBuku.toString().toLowerCase().trim() : '';

            // Set nilai awal processedRow berdasarkan targetKeys
            targetKeys.forEach(key => {
                const sourceKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
                processedRow[key] = sourceKey ? row[sourceKey] : '';
            });

            // Pastikan JUDUL terisi
            processedRow['JUDUL'] = judulBuku;
            processedRow['Status'] = 'Data Lama';

            // Helper untuk mengisi data ke processedRow
            const applyDataToRow = (data) => {
                Object.keys(data).forEach(key => {
                    // Hanya isi jika di row kosong dan data baru tersedia
                    if ((!processedRow[key] || processedRow[key].toString().trim() === '') && data[key]) {
                        processedRow[key] = data[key];
                    }
                });
            };

            // 2. CEK CACHE TERLEBIH DAHULU (Optimasi Duplikat)
            if (cacheKey && scrapedCache.has(cacheKey)) {
                const cachedData = scrapedCache.get(cacheKey);

                // Jika cache menyimpan info bahwa buku ini TIDAK DITEMUKAN
                if (cachedData.notFound) {
                    console.log(`♻️  [${index + 1}/${dataRows.length}] Skip Cache (Tidak Ditemukan sebelumnya): "${judulBuku}"`);
                    processedRow['Status'] = 'Tidak Ditemukan (Cache)';
                } 
                // Jika cache menyimpan DATA BUKU
                else {
                    console.log(`♻️  [${index + 1}/${dataRows.length}] Menggunakan Cache untuk: "${judulBuku}"`);
                    applyDataToRow(cachedData); 
                    processedRow['Status'] = 'Diperbarui (Cache)';
                }
                
                finalResults.push(processedRow);
                continue; // Skip proses scraping, lanjut ke baris berikutnya
            }

            // 3. CEK APAKAH PERLU SCRAPE?
            // Jika Judul kosong, skip
            if (!judulBuku || judulBuku.toString().trim() === '') {
                processedRow['Status'] = 'Judul Kosong';
                finalResults.push(processedRow);
                continue;
            }

            // Logic Override: Cek SEMUA kolom target. 
            // Jika ada SATU saja yang kosong (termasuk url gambar), kita lakukan scrape.
            const isDataIncomplete = targetKeys.some(key => {
                const val = processedRow[key];
                return !val || val.toString().trim() === '';
            });

            if (!isDataIncomplete) {
                console.log(`⏭️  [${index + 1}/${dataRows.length}] Skip "${judulBuku}" (Data sudah lengkap semua kolom).`);
                finalResults.push(processedRow);
                continue;
            }

            // --- MULAI SCRAPING ---
            console.log(`\n🔍 [${index + 1}/${dataRows.length}] Scraping data untuk: "${judulBuku}"`);
            processedRow['Status'] = 'Proses Scraping...';

            try {
                // Gunakan domcontentloaded agar lebih cepat (tidak menunggu semua gambar loading)
                await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

                const searchInputSelector = '#KataKunci'; 
                const searchButtonSelector = 'input[type="submit"].btn-success';

                await page.waitForSelector(searchInputSelector, { timeout: 10000 });
                
                await page.evaluate((sel) => { document.querySelector(sel).value = '' }, searchInputSelector);
                
                // Jika judul sangat panjang, puppeteer type mungkin lambat, bisa dipertimbangkan paste value langsung jika masih error
                await page.type(searchInputSelector, judulBuku);
                
                await Promise.all([
                    page.click(searchButtonSelector),
                    // UBAH: waitUntil 'domcontentloaded' dan timeout 120s
                    // networkidle2 sering timeout jika server lambat merespon assets
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120000 }) 
                ]);

                // Ambil link detail pertama
                const detailLinks = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a'))
                        .filter(a => a.href.includes('detail-opac') || a.href.includes('?id='))
                        .filter(a => !a.href.includes('download') && !a.href.includes('javascript'))
                        .map(a => a.href);
                });

                if (!detailLinks || detailLinks.length === 0) {
                    console.log(`⚠️ Tidak ditemukan: "${judulBuku}"`);
                    processedRow['Status'] = 'Tidak Ditemukan';
                    
                    // Simpan status 'Tidak Ditemukan' ke cache agar duplikat selanjutnya tidak perlu mencari lagi
                    if (cacheKey) scrapedCache.set(cacheKey, { notFound: true });

                    finalResults.push(processedRow);
                    continue;
                }

                // BUKA DETAIL PAGE
                const detailPage = await browser.newPage();
                try {
                    // Gunakan domcontentloaded juga untuk detail page
                    await detailPage.goto(detailLinks[0], { waitUntil: 'domcontentloaded', timeout: 60000 });

                    // Scrape Data Mentah dari Halaman
                    const rawScrapedData = await detailPage.evaluate(() => {
                        // Helper untuk ambil teks tabel
                        const getTableValue = (labelSearch) => {
                            const rows = document.querySelectorAll('.table-striped tbody tr');
                            for (const r of rows) {
                                const cells = r.querySelectorAll('td');
                                if (cells.length >= 2) {
                                    const labelText = cells[0].innerText.trim().toLowerCase();
                                    if (labelText.includes(labelSearch.toLowerCase())) {
                                        return cells[1].innerText.replace(/\s+/g, ' ').trim();
                                    }
                                }
                            }
                            return null;
                        };

                        const getNoInduk = () => {
                            const tables = document.querySelectorAll('table');
                            const indukList = [];
                            for (const tbl of tables) {
                                const headers = Array.from(tbl.querySelectorAll('th')).map(th => th.innerText.toLowerCase());
                                const isItemTable = headers.some(h => h.includes('kode eksemplar') || h.includes('nomor induk') || h.includes('no. induk'));
                                if (isItemTable) {
                                    const rows = tbl.querySelectorAll('tbody tr');
                                    rows.forEach(r => {
                                        const cols = r.querySelectorAll('td');
                                        if (cols.length > 0) {
                                            const text = cols[0].innerText.trim();
                                            if (text) indukList.push(text);
                                        }
                                    });
                                }
                            }
                            return indukList.join(', ');
                        };

                        // Helper Scrape Gambar (DIPERBAIKI KHUSUS SAMPUL KOLEKSI)
                        const getImageUrl = () => {
                            // 1. PRIORITAS UTAMA: Cari gambar yang src-nya mengandung 'sampul_koleksi'
                            // Contoh: ../uploaded_files/sampul_koleksi/original/Monograf/39683.jpg
                            const sampulKoleksiImg = document.querySelector('img[src*="sampul_koleksi"]');
                            if (sampulKoleksiImg) {
                                return sampulKoleksiImg.src;
                            }

                            // 2. Daftar selector cadangan (Fallback)
                            const possibleSelectors = [
                                '.s-cover img',        // SLiMS 9 Bulian
                                '.cover img',          // Umum
                                '.image img',          // Umum
                                '#detail img.img-thumbnail', // Bootstrap style
                                '#detail .col-md-3 img',     // Layout kolom kiri
                                '#detail .col-sm-3 img',
                                'img[alt*="cover" i]',       // Alt text mengandung 'cover'
                                'img[title*="cover" i]',     // Title mengandung 'cover'
                                'img[src*="upload"]',        // Gambar dari folder upload umum
                                'div[class*="cover"] img'    // Gambar dalam div berkelas 'cover'
                            ];
                            
                            for (const sel of possibleSelectors) {
                                const img = document.querySelector(sel);
                                if (img) {
                                    // Ambil src atau data-src (untuk lazy load)
                                    const src = img.src || img.getAttribute('data-src') || img.getAttribute('src');
                                    
                                    // Pastikan URL valid dan bukan icon sistem
                                    if (src && 
                                        !src.includes('template') && 
                                        !src.includes('logo.png') && 
                                        !src.includes('favicon') &&
                                        !src.includes('html5')
                                    ) {
                                        return src;
                                    }
                                }
                            }
                            return '';
                        };

                        let noPanggil = getTableValue('No. Panggil');
                        if (!noPanggil) {
                            const callNumberEl = document.querySelector('#detail tbody tr td:nth-child(2)');
                            if (callNumberEl) noPanggil = callNumberEl.innerText.trim();
                        }

                        return {
                            pengarang: getTableValue('Pengarang') || getTableValue('Penulis'),
                            penerbitan: getTableValue('Penerbitan'),
                            deskripsi: getTableValue('Deskripsi Fisik'),
                            konten: getTableValue('Konten'),
                            media: getTableValue('Media'),
                            penyimpan: getTableValue('Penyimpan Media'),
                            isbn: getTableValue('ISBN'),
                            subjek: getTableValue('Subjek'),
                            bahasa: getTableValue('Bahasa'),
                            target: getTableValue('Target Pembaca'),
                            noPanggil: noPanggil,
                            noInduk: getNoInduk(),
                            imageUrl: getImageUrl() // Ambil URL Gambar dengan logika prioritas sampul_koleksi
                        };
                    });

                    // PROSES DATA
                    const { penerbit, tahun } = parsePenerbitan(rawScrapedData.penerbitan);

                    // Siapkan object data bersih untuk disimpan ke cache dan row
                    const newData = {
                        'PENULIS': rawScrapedData.pengarang,
                        'PENERBIT': penerbit,
                        'TAHUN TERBIT': tahun,
                        'Deskripsi Fisik': rawScrapedData.deskripsi,
                        'Konten': rawScrapedData.konten,
                        'Media': rawScrapedData.media,
                        'Penyimpan Media': rawScrapedData.penyimpan,
                        'ISBN': rawScrapedData.isbn,
                        'Subjek': rawScrapedData.subjek,
                        'Bahasa': rawScrapedData.bahasa,
                        'Target Pembaca': rawScrapedData.target,
                        'no.panggil': rawScrapedData.noPanggil,
                        'no.induk': rawScrapedData.noInduk,
                        'url gambar buku': rawScrapedData.imageUrl
                    };

                    // Simpan ke Cache
                    if (cacheKey) {
                        scrapedCache.set(cacheKey, newData);
                    }

                    // Terapkan ke baris saat ini
                    applyDataToRow(newData);

                    processedRow['Status'] = 'Diperbarui';
                    console.log(`✅ Sukses melengkapi data: ${judulBuku}`);

                } catch (e) {
                    console.error(`❌ Error detail page: ${e.message}`);
                    processedRow['Status'] = 'Error Detail';
                } finally {
                    await detailPage.close();
                }

            } catch (err) {
                console.error(`❌ Error searching "${judulBuku}": ${err.message}`);
                processedRow['Status'] = 'Error Search';
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