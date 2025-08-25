const puppeteer = require('puppeteer');

/**
 * Fungsi utama untuk menjalankan scraper.
 */
async function runScraper(industry, locationCountry, locationCity) {
    let browser;
    console.log(`🚀 Memulai scraping untuk: ${industry}, ${locationCity}, ${locationCountry}`);
    
    try {
        console.log('📱 Meluncurkan browser...');
        browser = await puppeteer.launch({ 
            headless: "new", // Ubah ke `false` untuk melihat prosesnya saat debugging
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('🌐 Navigasi ke saasquatchleads.com...');
        await page.goto('https://www.saasquatchleads.com/', { waitUntil: 'networkidle2', timeout: 25000 });
        
        // Selector yang benar & spesifik untuk saasquatchleads.com
        const industrySelector = '#industry-input';
        const countrySelector = '#country-input';
        const citySelector = '#city-input';
        const submitSelector = '#search-button';

        console.log('✍️ Menunggu dan mengisi form pencarian...');
        await page.waitForSelector(industrySelector, { visible: true, timeout: 15000 });
        
        await page.type(industrySelector, industry);
        await page.type(countrySelector, locationCountry);
        await page.type(citySelector, locationCity);

        console.log('🔍 Mensubmit form pencarian...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click(submitSelector)
        ]);
        
        console.log('✅ Form berhasil disubmit.');
        
        const companyCardSelector = '.company-card';
        await page.waitForSelector(companyCardSelector, { timeout: 15000 });
        
        console.log('📊 Mengambil daftar perusahaan...');
        const companies = await scrapeInitialCompanyList(page, companyCardSelector);
        console.log(`🏢 Berhasil menemukan ${companies.length} perusahaan.`);
        
        if (companies.length === 0) {
            console.log('⚠️ Tidak ada perusahaan ditemukan, menggunakan fallback data.');
            return generateFallbackData(industry, locationCountry, locationCity);
        }

        console.log('🔄 Memulai proses enrichment data...');
        const enrichedData = await enrichCompanies(browser, companies);

        console.log(`🎉 Scraping selesai! Total data yang diperkaya: ${enrichedData.length}`);
        return enrichedData;
        
    } catch (error) {
        console.error("❌ Error fatal selama scraping:", error);
        console.log('⚠️ Terjadi error, menggunakan fallback data sebagai alternatif.');
        return generateFallbackData(industry, locationCountry, locationCity);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser ditutup');
        }
    }
}

/**
 * Mengambil daftar perusahaan awal dari halaman hasil.
 */
async function scrapeInitialCompanyList(page, selector) {
    return page.$$eval(selector, cards => {
        return cards.map(card => {
            const name = card.querySelector('h3.company-name')?.innerText;
            const website = card.querySelector('a.company-website-link')?.href;
            return { name, website };
        }).filter(c => c.name && c.website);
    });
}

/**
 * Melakukan proses enrichment untuk setiap perusahaan.
 */
async function enrichCompanies(browser, companies) {
    const enrichedData = [];
    // Batasi 5 perusahaan untuk tes cepat. Hapus .slice(0, 5) untuk mengambil semua.
    for (const company of companies.slice(0, 5)) {
        console.log(`\n📋 Memproses: ${company.name}`);
        
        if (!company.website) {
            enrichedData.push({ ...company, location: 'N/A', social: {}, technologies: [] });
            continue;
        }

        const companyPage = await browser.newPage();
        try {
            await companyPage.goto(company.website, { waitUntil: 'domcontentloaded', timeout: 15000 });
            const enrichment = await getEnrichmentData(companyPage);
            enrichedData.push({ ...company, ...enrichment });
        } catch (enrichError) {
            console.log(`❌ Error enrichment untuk ${company.name}:`, enrichError.message.split('\n')[0]);
            enrichedData.push({ ...company, location: 'N/A', social: {}, technologies: [] });
        } finally {
            await companyPage.close();
        }
    }
    return enrichedData;
}

/**
 * Berjalan di konteks browser untuk mengambil data tambahan.
 */
async function getEnrichmentData(page) {
    return page.evaluate(() => {
        const data = { location: 'N/A', social: {}, technologies: [] };

        // 1. Cari Social Media
        const socialPlatforms = {
            linkedin: 'linkedin.com/company',
            twitter: 'twitter.com/',
            facebook: 'facebook.com/'
        };
        document.querySelectorAll('a[href]').forEach(link => {
            for (const [platform, domain] of Object.entries(socialPlatforms)) {
                if (link.href.includes(domain)) data.social[platform] = link.href;
            }
        });

        // 2. Cari Lokasi
        const pageText = document.body.innerText;
        const addressRegex = /\b\d{1,5}\s[\w\s.,-]{5,}\b,\s*([A-Z]{2}|[A-Za-z]+)\s*\d{5}(-\d{4})?\b/g;
        const match = pageText.match(addressRegex);
        if (match) data.location = match[0];

        // 3. Deteksi Teknologi
        const techChecks = {
            'WordPress': () => document.querySelector('meta[name="generator"][content*="WordPress"]'),
            'Shopify': () => window.Shopify,
            'React': () => window.React || document.querySelector('[data-reactroot]'),
            'Vue.js': () => window.Vue,
        };
        for (const [tech, checkFn] of Object.entries(techChecks)) {
            try { if (checkFn()) data.technologies.push(tech); } catch (e) {}
        }
        data.technologies = [...new Set(data.technologies)];

        return data;
    });
}

/**
 * Menghasilkan data demo jika scraper utama gagal.
 */
function generateFallbackData(industry, country, city) {
    return [
        {
            name: `Demo ${industry} Solutions`,
            website: 'https://example.com',
            location: `${city}, ${country}`,
            social: { linkedin: 'https://linkedin.com/company/example' },
            technologies: ['React'],
            enrichment_status: 'demo_fallback_data'
        }
    ];
}

module.exports = { runScraper };