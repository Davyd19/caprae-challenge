const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

class IntelligentScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      timeout: options.timeout || 45000,
      maxConcurrent: options.maxConcurrent || 2,
      delay: options.delay || 3000,
      retries: options.retries || 3,
      outputDir: options.outputDir || "./company_intelligence",
      deepAnalysis: options.deepAnalysis !== false,
      ...options,
    };

    this.userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ];

    // Technology Detection Patterns
    this.techSignatures = {
      // CMS & E-commerce
      WordPress: [/wp-content/gi, /wp-includes/gi, /wordpress/gi, /"wp-/gi],
      Shopify: [
        /shopify/gi,
        /cdn\.shopify\.com/gi,
        /myshopify\.com/gi,
        /"Shopify"/gi,
      ],
      WooCommerce: [/woocommerce/gi, /wc-/gi, /"woocommerce"/gi],
      Magento: [/magento/gi, /mage\//gi, /"Magento"/gi],
      Drupal: [/drupal/gi, /sites\/all/gi, /"Drupal"/gi],

      // JavaScript Frameworks
      React: [
        /"react"/gi,
        /react\.js/gi,
        /__REACT_DEVTOOLS_GLOBAL_HOOK__/gi,
        /data-reactroot/gi,
      ],
      "Vue.js": [/"vue"/gi, /vue\.js/gi, /data-v-/gi, /__VUE__/gi],
      Angular: [/"angular"/gi, /angular\.js/gi, /ng-/gi, /_ngcontent/gi],
      "Next.js": [/"next"/gi, /next\.js/gi, /__NEXT_DATA__/gi, /_next\//gi],

      // Analytics & Tracking
      "Google Analytics": [
        /google-analytics/gi,
        /gtag\(/gi,
        /ga\('/gi,
        /googletagmanager/gi,
      ],
      "Facebook Pixel": [/facebook\.com\/tr/gi, /fbq\(/gi, /facebook\.net/gi],
      Hotjar: [/hotjar/gi, /hj\(/gi, /static\.hotjar\.com/gi],
      Mixpanel: [/mixpanel/gi, /cdn\.mxpnl\.com/gi],

      // Marketing & CRM
      HubSpot: [
        /hubspot/gi,
        /#hubspot-messages-iframe-container/gi,
        /hs-scripts/gi,
        /hubspot\.com/gi,
      ],
      Salesforce: [/salesforce/gi, /force\.com/gi, /sfdcstatic/gi],
      Mailchimp: [/mailchimp/gi, /mc\.us/gi, /chimpstatic/gi],
      Intercom: [/intercom/gi, /intercomcdn/gi, /widget\.intercom\.io/gi],
      Zendesk: [/zendesk/gi, /zdassets/gi, /zdchat/gi],
      Drift: [/drift/gi, /driftt/gi, /js\.driftt\.com/gi],

      // Payment & E-commerce Tools
      Stripe: [/stripe/gi, /js\.stripe\.com/gi, /"stripe"/gi],
      PayPal: [/paypal/gi, /paypalobjects/gi, /"paypal"/gi],
      Square: [/squareup/gi, /square\.com/gi, /"square"/gi],

      // CDN & Hosting
      Cloudflare: [/cloudflare/gi, /cf-ray/gi, /cdnjs\.cloudflare\.com/gi],
      AWS: [/amazonaws\.com/gi, /aws/gi, /cloudfront/gi],
      Vercel: [/vercel/gi, /now\.sh/gi, /_vercel/gi],

      // Other Popular Tools
      jQuery: [/jquery/gi, /\$\(/gi, /jquery\.js/gi],
      Bootstrap: [/bootstrap/gi, /btn-/gi, /col-/gi],
      "Font Awesome": [/font-awesome/gi, /fa-/gi, /fontawesome/gi],
    };

    // Social Media Patterns
    this.socialPatterns = {
      linkedin: [
        /linkedin\.com\/company\//gi,
        /linkedin\.com\/in\//gi,
        /linkedin\.com\/school\//gi,
      ],
      twitter: [/twitter\.com\//gi, /x\.com\//gi],
      facebook: [/facebook\.com\//gi, /fb\.com\//gi],
      instagram: [/instagram\.com\//gi],
      youtube: [
        /youtube\.com\/channel\//gi,
        /youtube\.com\/c\//gi,
        /youtube\.com\/user\//gi,
        /youtu\.be\//gi,
      ],
      tiktok: [/tiktok\.com\//gi],
      github: [/github\.com\//gi],
    };
  }

  async runScraper(industry, locationCountry, locationCity) {
    let browser;
    try {
      console.log(
        `🚀 Starting Intelligent Company Scraper for ${industry} in ${locationCity}, ${locationCountry}`
      );

      browser = await puppeteer.launch({
        headless: this.options.headless ? "new" : false,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-features=VizDisplayCompositor",
          "--disable-web-security",
          "--disable-features=site-per-process",
        ],
      });

      const page = await browser.newPage();
      await this.setupPage(page);

      // Search companies
      const companies = await this.searchCompanies(
        page,
        industry,
        locationCountry,
        locationCity
      );

      if (!companies || companies.length === 0) {
        console.log("❌ No companies found");
        return [];
      }

      console.log(
        `📊 Found ${companies.length} companies. Starting intelligence gathering...`
      );

      // Process companies with intelligence gathering
      const intelligentProfiles = await this.processCompaniesWithIntelligence(
        browser,
        companies
      );

      // Save comprehensive results
      await this.saveIntelligentResults(
        intelligentProfiles,
        industry,
        locationCity
      );

      console.log(
        `✅ Intelligence gathering completed! Processed ${intelligentProfiles.length} company profiles`
      );
      return intelligentProfiles;
    } catch (error) {
      console.error("❌ Error during intelligent scraping:", error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async setupPage(page) {
    const userAgent =
      this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1920, height: 1080 });
    page.setDefaultTimeout(this.options.timeout);

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "media", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    page.on("dialog", async (dialog) => await dialog.dismiss());
  }

  async searchCompanies(page, industry, locationCountry, locationCity) {
    try {
      console.log("🔍 Navigating to SaaSquatch Leads...");
      await page.goto("https://www.saasquatchleads.com/", {
        waitUntil: "networkidle2",
      });

      console.log("✍️ Interacting with dropdown forms...");

      // Helper function untuk memilih opsi dari dropdown
      const selectOption = async (inputId, optionText) => {
        await page.click(inputId); // 1. Klik untuk membuka dropdown
        await page.waitForSelector(".option-list .option", { visible: true }); // 2. Tunggu opsi muncul
        // 3. Cari dan klik opsi yang sesuai
        const clicked = await page.evaluate((text) => {
          const options = Array.from(
            document.querySelectorAll(".option-list .option")
          );
          const target = options.find(
            (option) =>
              option.innerText.trim().toLowerCase() === text.toLowerCase()
          );
          if (target) {
            target.click();
            return true;
          }
          return false;
        }, optionText);

        if (!clicked) {
          throw new Error(`Option "${optionText}" not found for ${inputId}`);
        }
        await this.delay(500); // Beri waktu UI untuk update
      };

      // Gunakan helper function untuk setiap field
      await selectOption("#industry-input", industry);
      await selectOption("#country-input", locationCountry);
      await selectOption("#city-input", locationCity);

      console.log("📤 Submitting search...");
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2" }),
        page.click("#search-button"),
      ]);

      return await this.extractCompanies(page);
    } catch (error) {
      console.error("Error in searchCompanies:", error);
      throw error;
    }
  }

  async fillSearchForm(page, industry, locationCountry, locationCity) {
    console.log("Filling form with specific selectors...");

    // Selector yang sudah diverifikasi benar
    const industrySelector = 'input[name="industry"]';
    const countrySelector = 'input[name="country"]';
    const citySelector = 'input[name="city"]';

    await page.waitForSelector(industrySelector, { timeout: 10000 });
    await page.type(industrySelector, industry);

    await page.waitForSelector(countrySelector, { timeout: 10000 });
    await page.type(countrySelector, locationCountry);

    await page.waitForSelector(citySelector, { timeout: 10000 });
    await page.type(citySelector, locationCity);
  }

  async clickSubmitButton(page) {
    const submitSelector = 'button[type="submit"]'; // Selector yang lebih spesifik
    await page.waitForSelector(submitSelector, { timeout: 10000 });
    await page.click(submitSelector);
  }

  async extractCompanies(page) {
    console.log("📋 Extracting company data...");
    const companySelector = ".company-card";
    await page.waitForSelector(companySelector, { timeout: 15000 });

    return await page.$$eval(companySelector, (cards) => {
      return cards
        .map((card, index) => {
          const name = card.querySelector("h3.company-name")?.innerText.trim();
          const website = card.querySelector("a.company-website-link")?.href;
          const description =
            card.querySelector("p.company-description")?.innerText.trim() || "";

          return {
            id: index + 1,
            name: name,
            website: website,
            description: description,
            extractedAt: new Date().toISOString(),
          };
        })
        .filter((company) => company.name && company.website);
    });
  }

  async processCompaniesWithIntelligence(browser, companies) {
    const results = [];
    const batchSize = this.options.maxConcurrent;

    console.log(
      `🧠 Starting intelligence gathering for ${companies.length} companies...`
    );

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      console.log(
        `🔄 Processing intelligence batch ${
          Math.floor(i / batchSize) + 1
        }/${Math.ceil(companies.length / batchSize)}`
      );

      const batchPromises = batch.map((company) =>
        this.gatherCompanyIntelligence(browser, company)
      );
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          console.error(
            `❌ Intelligence gathering failed for ${batch[index].name}:`,
            result.reason?.message
          );
          results.push({
            ...batch[index],
            intelligence: { error: result.reason?.message },
            status: "error",
          });
        }
      });

      if (i + batchSize < companies.length) {
        await this.delay(this.options.delay);
      }
    }

    return results;
  }

  async gatherCompanyIntelligence(browser, company) {
    let companyPage;
    try {
      console.log(`🕵️ Gathering intelligence for: ${company.name}`);

      companyPage = await browser.newPage();
      await this.setupPage(companyPage);

      // Navigate to company website
      await companyPage.goto(company.website, {
        waitUntil: "networkidle2",
        timeout: this.options.timeout,
      });

      // Wait for page to fully load
      await this.delay(2000);

      // Gather comprehensive intelligence
      const intelligence = await this.extractCompanyIntelligence(companyPage);

      // Additional pages analysis if enabled
      if (this.options.deepAnalysis) {
        const additionalIntel = await this.performDeepAnalysis(
          companyPage,
          company.website
        );
        intelligence.deepAnalysis = additionalIntel;
      }

      return {
        ...company,
        intelligence: intelligence,
        processedAt: new Date().toISOString(),
        status: "success",
      };
    } catch (error) {
      console.error(
        `❌ Error gathering intelligence for ${company.name}:`,
        error.message
      );
      return {
        ...company,
        intelligence: { error: error.message },
        status: "error",
        processedAt: new Date().toISOString(),
      };
    } finally {
      if (companyPage) {
        await companyPage.close();
      }
    }
  }

  async extractCompanyIntelligence(page) {
    return await page.evaluate(
      (techSignatures, socialPatterns) => {
        const intelligence = {
          title: document.title || "",
          metaDescription:
            document.querySelector('meta[name="description"]')?.content || "",
          language: document.documentElement.lang || "unknown",
          contactInfo: { emails: [], phones: [], addresses: [] },
          socialMedia: {},
          technologies: [],
          techCategories: {
            cms: [],
            analytics: [],
            marketing: [],
            ecommerce: [],
            frontend: [],
            payment: [],
            hosting: [],
          },
          businessInfo: {
            industry: "",
            companySize: "",
            founded: "",
            headquarters: "",
          },
          seoData: {
            hasGoogleAnalytics: false,
            hasFacebookPixel: false,
            hasStructuredData: false,
            metaKeywords:
              document.querySelector('meta[name="keywords"]')?.content || "",
          },
        };

        const pageSource = document.documentElement.outerHTML;
        const bodyText = document.body.innerText || "";

        // Extract social media links
        const links = Array.from(document.querySelectorAll("a[href]"));
        links.forEach((link) => {
          const href = link.href.toLowerCase();
          for (const [platform, patterns] of Object.entries(socialPatterns)) {
            for (const pattern of patterns) {
              if (pattern.test(href) && !intelligence.socialMedia[platform]) {
                intelligence.socialMedia[platform] = link.href;
                break;
              }
            }
          }
        });

        // Technology Stack Detection
        for (const [tech, patterns] of Object.entries(techSignatures)) {
          if (patterns.some((pattern) => pattern.test(pageSource))) {
            intelligence.technologies.push(tech);
          }
        }

        // Contact Information Extraction
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        intelligence.contactInfo.emails = [
          ...new Set(bodyText.match(emailRegex) || []),
        ].slice(0, 5);

        const phoneRegex =
          /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        intelligence.contactInfo.phones = [
          ...new Set(bodyText.match(phoneRegex) || []),
        ].slice(0, 3);

        // SEO Data
        intelligence.seoData.hasGoogleAnalytics =
          /google-analytics|gtag|ga\(/.test(pageSource);
        intelligence.seoData.hasFacebookPixel = /facebook\.com\/tr|fbq\(/.test(
          pageSource
        );
        intelligence.seoData.hasStructuredData = /"@type"|"@context"/.test(
          pageSource
        );

        return intelligence;
      },
      this.techSignatures,
      this.socialPatterns
    );
  }

  async performDeepAnalysis(page, baseUrl) {
    try {
      const deepIntel = {
        additionalPages: [],
        companyTeam: [],
        products: [],
        pricing: [],
      };

      const pagesToCheck = [
        "/about",
        "/about-us",
        "/team",
        "/contact",
        "/pricing",
        "/products",
        "/services",
      ];

      for (const pagePath of pagesToCheck.slice(0, 3)) {
        // Limit to 3 pages
        try {
          const fullUrl = new URL(pagePath, baseUrl).href;
          await page.goto(fullUrl, {
            waitUntil: "networkidle2",
            timeout: 15000,
          });

          const pageInfo = await page.evaluate((path) => {
            const title = document.title;
            const text = document.body.innerText.substring(0, 500);

            const teamNames = [];
            if (path.includes("team") || path.includes("about")) {
              const namePattern =
                /([A-Z][a-z]+\s+[A-Z][a-z]+)(?=\s+(?:CEO|CTO|COO|Founder|Director|Manager|Lead))/g;
              const matches = text.match(namePattern);
              if (matches) teamNames.push(...matches.slice(0, 5));
            }

            return {
              path: path,
              title: title,
              preview: text,
              teamNames: teamNames,
            };
          }, pagePath);

          deepIntel.additionalPages.push(pageInfo);
          if (pageInfo.teamNames.length > 0) {
            deepIntel.companyTeam.push(...pageInfo.teamNames);
          }
        } catch (error) {
          continue;
        }
      }

      return deepIntel;
    } catch (error) {
      return { error: error.message };
    }
  }

  async saveIntelligentResults(data, industry, location) {
    try {
      await fs.mkdir(this.options.outputDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const baseFilename = `intelligent_${industry}_${location}_${timestamp}`;

      // Save comprehensive JSON
      const jsonPath = path.join(
        this.options.outputDir,
        `${baseFilename}.json`
      );
      await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
      console.log(`💾 Intelligence data saved: ${jsonPath}`);

      // Save enhanced CSV
      const csvPath = path.join(this.options.outputDir, `${baseFilename}.csv`);
      const enhancedCSV = this.createEnhancedCSV(data);
      await fs.writeFile(csvPath, enhancedCSV);
      console.log(`📊 Enhanced CSV saved: ${csvPath}`);

      // Save technology summary
      const techSummary = this.createTechnologySummary(data);
      const techPath = path.join(
        this.options.outputDir,
        `${baseFilename}_tech_summary.json`
      );
      await fs.writeFile(techPath, JSON.stringify(techSummary, null, 2));
      console.log(`🔧 Technology summary saved: ${techPath}`);
    } catch (error) {
      console.error("❌ Error saving results:", error);
    }
  }

  createEnhancedCSV(data) {
    if (!data || data.length === 0) return "";

    const headers = [
      "Company Name",
      "Website",
      "Description",
      "Industry",
      "Company Size",
      "Founded",
      "Email",
      "Phone",
      "Address",
      "LinkedIn",
      "Twitter",
      "Facebook",
      "Instagram",
      "YouTube",
      "GitHub",
      "Technologies",
      "CMS",
      "Analytics Tools",
      "Marketing Tools",
      "E-commerce Tools",
      "Has Google Analytics",
      "Has Facebook Pixel",
      "Meta Description",
      "Status",
    ];

    const csvRows = [headers.join(",")];

    data.forEach((company) => {
      const intel = company.intelligence || {};
      const social = intel.socialMedia || {};
      const contact = intel.contactInfo || {};
      const business = intel.businessInfo || {};
      const techCat = intel.techCategories || {};
      const seo = intel.seoData || {};

      const row = [
        `"${company.name || ""}"`,
        `"${company.website || ""}"`,
        `"${(company.description || "").replace(/"/g, '""')}"`,
        `"${business.industry || ""}"`,
        `"${business.companySize || ""}"`,
        `"${business.founded || ""}"`,
        `"${contact.emails?.join("; ") || ""}"`,
        `"${contact.phones?.join("; ") || ""}"`,
        `"${contact.addresses?.join("; ") || ""}"`,
        `"${social.linkedin || ""}"`,
        `"${social.twitter || ""}"`,
        `"${social.facebook || ""}"`,
        `"${social.instagram || ""}"`,
        `"${social.youtube || ""}"`,
        `"${social.github || ""}"`,
        `"${intel.technologies?.join("; ") || ""}"`,
        `"${techCat.cms?.join("; ") || ""}"`,
        `"${techCat.analytics?.join("; ") || ""}"`,
        `"${techCat.marketing?.join("; ") || ""}"`,
        `"${techCat.ecommerce?.join("; ") || ""}"`,
        `"${seo.hasGoogleAnalytics ? "Yes" : "No"}"`,
        `"${seo.hasFacebookPixel ? "Yes" : "No"}"`,
        `"${(intel.metaDescription || "")
          .substring(0, 100)
          .replace(/"/g, '""')}"`,
        `"${company.status || ""}"`,
      ];

      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }

  createTechnologySummary(data) {
    const summary = {
      totalCompanies: data.length,
      technologyStats: {},
      industryBreakdown: {},
      companySizeStats: {},
      socialMediaPresence: {},
      topTechnologies: [],
    };

    const techCount = {};
    const industryCount = {};
    const sizeCount = {};
    const socialCount = {
      linkedin: 0,
      twitter: 0,
      facebook: 0,
      instagram: 0,
      youtube: 0,
      github: 0,
    };

    data.forEach((company) => {
      const intel = company.intelligence || {};

      // Count technologies
      if (intel.technologies) {
        intel.technologies.forEach((tech) => {
          techCount[tech] = (techCount[tech] || 0) + 1;
        });
      }

      // Count industries
      if (intel.businessInfo?.industry) {
        const industry = intel.businessInfo.industry;
        industryCount[industry] = (industryCount[industry] || 0) + 1;
      }

      // Count company sizes
      if (intel.businessInfo?.companySize) {
        const size = intel.businessInfo.companySize;
        sizeCount[size] = (sizeCount[size] || 0) + 1;
      }

      // Count social media presence
      if (intel.socialMedia) {
        for (const platform in socialCount) {
          if (intel.socialMedia[platform]) {
            socialCount[platform]++;
          }
        }
      }
    });

    summary.technologyStats = techCount;
    summary.industryBreakdown = industryCount;
    summary.companySizeStats = sizeCount;
    summary.socialMediaPresence = socialCount;

    summary.topTechnologies = Object.entries(techCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tech, count]) => ({ technology: tech, count: count }));

    return summary;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = { IntelligentScraper };
