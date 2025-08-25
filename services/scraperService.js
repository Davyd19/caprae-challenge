const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const path = require('path');

const LOGIN_EMAIL = "emailanda@contoh.com";
const LOGIN_PASSWORD = "passwordanda"; 

async function handleAutocomplete(page, inputSelector, valueToType, optionToClick) {
    console.log(`  -> Mengisi autocomplete [${inputSelector}] dengan mengetik "${valueToType}"`);
    await page.waitForSelector(inputSelector, { visible: true, timeout: 20000 });
    await page.evaluate(selector => document.querySelector(selector).value = '', inputSelector);
    await page.type(inputSelector, valueToType, { delay: 150 });

    const optionXPath = `//div[contains(@class, 'cursor-pointer') and contains(., '${optionToClick}')]`;
    
    try {
        console.log(`  -> Menunggu opsi "${optionToClick}" muncul...`);
        await page.waitForXPath(optionXPath, { visible: true, timeout: 10000 });
        const [optionElement] = await page.$x(optionXPath);
        if (optionElement) {
            await optionElement.click();
            console.log(`  -> Opsi "${optionToClick}" berhasil diklik.`);
        } else {
            throw new Error(`Opsi autocomplete untuk "${optionToClick}" tidak ditemukan.`);
        }
    } catch (e) {
        console.warn(`  -> Peringatan: Tidak bisa mengklik opsi "${optionToClick}". Menekan Enter sebagai alternatif.`);
        await page.keyboard.press('Enter');
    }
}

async function runScraper(industry, country, city) {
    if (LOGIN_EMAIL === "emailanda@contoh.com" || LOGIN_PASSWORD === "passwordanda") {
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.error("!!! HARAP UBAH LOGIN_EMAIL DAN LOGIN_PASSWORD DI scraperService.js !!!");
        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        return generateFallbackData(industry, country, city);
    }

    let browser;
    let page;
    const locationQuery = city ? `${city}, ${country}` : country;
    
    try {
        console.log('🚀 Memulai scraper dengan mode stealth...');
        browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
        });
        
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        const loginUrl = 'https://www.saasquatchleads.com/auth';
        console.log(`🌐 Navigasi ke halaman login: ${loginUrl}`);
        await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 45000 });

        console.log('⏳ Menunggu form login muncul...');
        const loginHeaderXPath = "//button[contains(., 'Sign In')]";
        await page.waitForXPath(loginHeaderXPath, { timeout: 15000 });
        console.log('✅ Form login ditemukan.');

        console.log('✍️ Memasukkan email dan password...');

        const emailSelector = '#email';      
        const passwordSelector = '#password'; 
        const loginButtonSelector = 'button[type="submit"]';

        await page.waitForSelector(emailSelector);
        await page.type(emailSelector, LOGIN_EMAIL, { delay: 100 });
        await page.type(passwordSelector, LOGIN_PASSWORD, { delay: 100 });

        console.log('🖱️ Mengklik tombol login...');
        await Promise.all([
            page.click(loginButtonSelector),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
        ]);
        console.log('✅ Login berhasil!');
        
        const scraperUrl = 'https://www.saasquatchleads.com/scraper';
        console.log(`🌐 Navigasi ke halaman scraper: ${scraperUrl}`);
        await page.goto(scraperUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        console.log('⏳ Menunggu form pencarian muncul...');
        await page.waitForXPath("//div[contains(., 'Search Criteria')]", { timeout: 20000 });
        console.log('✅ Form berhasil dimuat!');

        const industrySelector = '#industry';
        const locationSelector = '#location';
        const submitButtonXPath = "//button[contains(., 'Find Companies')]";

        console.log('✍️ Memulai pengisian form dinamis...');
        await handleAutocomplete(page, industrySelector, industry, industry); 
        await handleAutocomplete(page, locationSelector, city, city);
        
        console.log('✅ Form berhasil diisi.');

        const [submitButton] = await page.$x(submitButtonXPath);
        if (!submitButton) throw new Error('Tombol "Find Companies" tidak ditemukan.');

        console.log('🔍 Mensubmit form pencarian...');
        await submitButton.click();
        
        console.log('👍 Form berhasil disubmit. Menunggu hasil muncul...');
        
        const companyCardSelector = 'div.rounded-lg.border'; 
        await page.waitForSelector(companyCardSelector, { timeout: 25000 });
        
        const companies = await scrapeInitialCompanyList(page, companyCardSelector);
        console.log(`🏢 Berhasil menemukan ${companies.length} perusahaan.`);
        
        if (companies.length === 0) return generateFallbackData(industry, country, city);

        const enrichedData = await enrichCompanies(browser, companies.slice(0, 10));
        return enrichedData;
        
    } catch (error) {
        console.error("❌ Error fatal selama scraping:", error.message);
        if (page) {
            const screenshotPath = path.join(__dirname, `../error_screenshot_${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`📸 Screenshot error disimpan di: ${screenshotPath}`);
        }
        return generateFallbackData(industry, country, city);
    } finally {
        if (browser) await browser.close();
        console.log('🔒 Browser ditutup');
    }
}
async function scrapeInitialCompanyList(page, selector) {
    return page.$$eval(selector, cards => {
        return cards.map(card => {
            const name = card.querySelector('h3, h2, div[class*="font-bold"]')?.innerText.trim(); 
            const websiteElement = card.querySelector('a[href*="http"]');
            const website = websiteElement ? websiteElement.href : null;
            return { name, website };
        }).filter(c => c.name && c.website);
    });
}
async function enrichCompanies(browser, companies) {
    const enrichedData = [];
    for (const company of companies) {
        if (!company.website) {
            enrichedData.push({ ...company, location: 'N/A', social: {}, technologies: ['N/A'] });
            continue;
        }
        let companyPage;
        try {
            companyPage = await browser.newPage();
            await companyPage.goto(company.website, { waitUntil: 'domcontentloaded', timeout: 20000 });
            const enrichment = await getEnrichmentData(companyPage);
            enrichedData.push({ ...company, ...enrichment });
        } catch (enrichError) {
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
function generateFallbackData(industry, country, city) {
    return [{
        name: `[FALLBACK] Demo ${industry} Corp`,
        website: 'https://example.com',
        location: `${city}, ${country}`,
        social: { linkedin: 'https://linkedin.com/company/example' },
        technologies: ['React', 'Node.js'],
    }];
}

module.exports = { runScraper };
