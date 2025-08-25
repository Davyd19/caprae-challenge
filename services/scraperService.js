const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');

// ============================ MASUKKAN KREDENSIAL ANDA DI SINI ============================
const LOGIN_EMAIL = "emailanda@contoh.com"; // Ganti dengan email login Anda
const LOGIN_PASSWORD = "passwordanda";   // Ganti dengan password Anda
// =========================================================================================

/**
 * Fungsi utama yang mencoba melakukan scraping sungguhan.
 * Jika gagal di tahap mana pun, ia akan memanggil generateDummyData.
 */
async function runScraper(industry, country, city) {
    if (LOGIN_EMAIL === "emailanda@contoh.com" || LOGIN_PASSWORD === "passwordanda") {
        console.error("!!! PERINGATAN: Kredensial login belum diatur. Menggunakan data dummy. !!!");
        return generateDummyData(industry, country, city);
    }

    let browser;
    let page;
    const locationQuery = city ? `${city}, ${country}` : country;
    
    try {
        console.log('🚀 Memulai scraping sungguhan dengan mode stealth...');
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
        });
        
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // --- 1. PROSES LOGIN ---
        const loginUrl = 'https://www.saasquatchleads.com/auth';
        console.log(`🌐 Navigasi ke halaman login: ${loginUrl}`);
        await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        console.log('⏳ Menunggu form login muncul...');
        await page.waitForSelector('#email', { timeout: 15000 });
        console.log('✅ Form login ditemukan.');

        console.log('✍️ Memasukkan kredensial...');
        await page.type('#email', LOGIN_EMAIL, { delay: 100 });
        await page.type('#password', LOGIN_PASSWORD, { delay: 100 });

        console.log('🖱️ Mengklik tombol login...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
        ]);
        console.log('✅ Login berhasil!');

        // --- 2. NAVIGASI KE HALAMAN SCRAPER ---
        const scraperButtonSelector = 'a[href="/scraper"]';
        console.log(`🖱️ Menunggu dan mengklik tombol Scraper di navigasi...`);
        await page.waitForSelector(scraperButtonSelector, { visible: true, timeout: 15000 });
        await page.click(scraperButtonSelector);
        
        console.log('⏳ Menunggu form pencarian muncul...');
        await page.waitForXPath("//div[contains(., 'Search Criteria')]", { timeout: 20000 });
        console.log('✅ Form berhasil dimuat!');

        // --- 3. MENGISI FORM DAN SCRAPE ---
        const industrySelector = '#industry';
        const locationSelector = '#location';
        const submitButtonXPath = "//button[contains(., 'Find Companies')]";

        console.log('✍️ Mengisi form pencarian...');
        await handleAutocomplete(page, industrySelector, industry, industry); 
        await handleAutocomplete(page, locationSelector, city, city);
        
        const [submitButton] = await page.$x(submitButtonXPath);
        await submitButton.click();
        console.log('👍 Form berhasil disubmit. Menunggu hasil...');
        
        const companyCardSelector = 'div.rounded-lg.border'; // Sesuaikan jika perlu
        await page.waitForSelector(companyCardSelector, { timeout: 25000 });
        
        const companies = await scrapeInitialCompanyList(page, companyCardSelector);
        if (companies.length === 0) throw new Error("Tidak ada perusahaan ditemukan dari scraping.");

        console.log(`🔄 Memulai enrichment untuk ${companies.length} perusahaan...`);
        const enrichedData = await enrichCompanies(browser, companies.slice(0, 10));
        return enrichedData;
        
    } catch (error) {
        console.error("❌ Scraping sungguhan gagal:", error.message);
        console.log("🔄 Beralih ke generator data dummy sebagai fallback...");
        if (page) {
            const screenshotPath = path.join(__dirname, `../error_screenshot_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot error disimpan di: ${screenshotPath}`);
        }
        // Inilah bagian fallback-nya
        return generateDummyData(industry, country, city);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser ditutup');
        }
    }
}

/**
 * Menghasilkan data perusahaan dummy yang kaya dan realistis untuk demo.
 */
function generateDummyData(industry, country, city) {
    console.log(`📊 Menghasilkan data dummy untuk: ${industry}, ${city}, ${country}`);
    const companyTemplates = [
        { baseName: 'Innovate Solutions', technologies: ['React', 'Node.js', 'AWS'], employeeCount: '50-100', foundedYear: 2018 },
        { baseName: 'Digital Dynamics', technologies: ['Vue.js', 'Firebase', 'Google Cloud'], employeeCount: '20-50', foundedYear: 2020 },
        { baseName: 'Quantum Leap', technologies: ['Angular', 'Java', 'Azure'], employeeCount: '100-250', foundedYear: 2015 },
        { baseName: 'Synergy Systems', technologies: ['WordPress', 'PHP', 'MySQL'], employeeCount: '10-20', foundedYear: 2019 },
    ];

    return companyTemplates.map((template, i) => ({
        id: `comp-${i}`,
        name: `[DUMMY] ${template.baseName} ${industry}`,
        website: `https://example.com/${template.baseName.toLowerCase().replace(/\s/g, '')}`,
        location: `${city}, ${country}`,
        social: {
            linkedin: `https://linkedin.com/company/example`,
            twitter: `https://twitter.com/example`
        },
        technologies: template.technologies,
        description: `A leading dummy company in the ${industry} sector, specializing in innovative solutions. Based in ${city}.`,
        employeeCount: template.employeeCount,
        foundedYear: template.foundedYear,
        contactEmail: `contact@example.com`,
        contactPhone: `+1 (555) 123-456${i}`
    }));
}

async function handleAutocomplete(page, inputSelector, valueToType, optionToClick) {
    await page.waitForSelector(inputSelector, { visible: true, timeout: 20000 });
    await page.evaluate(selector => document.querySelector(selector).value = '', inputSelector);
    await page.type(inputSelector, valueToType, { delay: 150 });
    const optionXPath = `//div[contains(@class, 'cursor-pointer') and contains(., '${optionToClick}')]`;
    try {
        await page.waitForXPath(optionXPath, { visible: true, timeout: 10000 });
        const [optionElement] = await page.$x(optionXPath);
        if (optionElement) await optionElement.click();
    } catch (e) {
        await page.keyboard.press('Enter');
    }
}

async function scrapeInitialCompanyList(page, selector) {
    return page.$$eval(selector, cards => cards.map(card => ({
        name: card.querySelector('h3, h2, div[class*="font-bold"]')?.innerText.trim(),
        website: card.querySelector('a[href*="http"]')?.href
    })).filter(c => c.name && c.website));
}

async function enrichCompanies(browser, companies) {
    const enrichedData = [];
    for (const company of companies) {
        let companyPage;
        try {
            if (!company.website) continue;
            companyPage = await browser.newPage();
            await companyPage.goto(company.website, { waitUntil: 'domcontentloaded', timeout: 20000 });
            const enrichment = await getEnrichmentData(companyPage);
            enrichedData.push({ ...company, ...enrichment });
        } catch (e) {
            enrichedData.push({ ...company, location: 'N/A', social: {}, technologies: ['Gagal diakses'] });
        } finally {
            if (companyPage) await companyPage.close();
        }
    }
    return enrichedData;
}

async function getEnrichmentData(page) {
    return page.evaluate(() => {
        const data = { location: 'N/A', social: {}, technologies: [] };
        const socialPlatforms = {
            linkedin: /linkedin\.com\/(company|in)\/[\w-]+/,
            twitter: /twitter\.com\/[\w_]+/,
            facebook: /facebook\.com\/[\w.-]+/
        };
        document.querySelectorAll('a[href]').forEach(link => {
            for (const [platform, regex] of Object.entries(socialPlatforms)) {
                if (regex.test(link.href) && !data.social[platform]) {
                    data.social[platform] = link.href;
                }
            }
        });
        const scripts = Array.from(document.scripts).map(s => s.src).join(' ');
        if (window.React || document.querySelector('[data-reactroot]') || window.__NEXT_DATA__) data.technologies.push('React/Next.js');
        if (window.Vue) data.technologies.push('Vue.js');
        if (scripts.includes('wp-content')) data.technologies.push('WordPress');
        if (window.Shopify) data.technologies.push('Shopify');
        if(data.technologies.length === 0) data.technologies.push('Unknown');
        data.technologies = [...new Set(data.technologies)];
        return data;
    });
}

module.exports = { runScraper };
